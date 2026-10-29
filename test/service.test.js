const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const {
  getDatabasePath,
  openDatabase,
  openRawDatabase,
} = require("../electron/database");
const { decodeBackup, encodeBackup } = require("../electron/backup");
const { createService } = require("../electron/service");
const { createProfileManager } = require("../electron/profiles");

function createTestService(dialog = {}) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "bodycomp-test-"));
  const databasePath = path.join(directory, "bodycomp.sqlite");
  const database = openDatabase(databasePath);
  const service = createService({ database, databasePath, dialog });
  return {
    directory,
    database,
    service,
    close() {
      service.close();
      fs.rmSync(directory, { recursive: true, force: true });
    },
  };
}

test("profiles persist data independently and validate stored operations", (t) => {
  const context = createTestService();
  t.after(() => context.close());
  const { service } = context;

  assert.equal(service.invoke("auth:current-user", []), null);
  const firstProfile = service.invoke("auth:register", [
    {
      email: "first@example.test",
      displayName: "First Profile",
      password: "local-password-1",
    },
  ]);
  assert.equal(firstProfile.email, "first@example.test");
  assert.equal(
    context.database
      .prepare(
        `SELECT em.load_factor AS loadFactor
         FROM exercise_muscles em JOIN exercises e ON e.id = em.exercise_id
         WHERE e.profile_id = ? LIMIT 1`,
      )
      .get(firstProfile.id).loadFactor,
    1,
  );

  const exercise = service.invoke("exercises:create", [
    {
      name: "Goblet squat",
      muscles: [{ muscleGroupId: 9, role: "primary" }],
    },
  ]);
  const catalog = service.invoke("exercises:list", []);
  assert.ok(
    catalog.some((item) => item.name === "Back squat" && !item.isCustom),
  );
  assert.deepEqual(service.invoke("custom-exercises:list", []), [exercise]);
  const recordedAt = new Date().toISOString();
  const measurement = service.invoke("bodyweight:create", [
    {
      recordedAt,
      weightKg: 80,
      bodyFatPercent: 20,
    },
  ]);
  assert.equal(measurement.leanMassKg, 64);

  const workout = service.invoke("workouts:create", [
    {
      startedAt: recordedAt,
      finishedAt: recordedAt,
      notes: "Local test",
      exercises: [
        {
          exerciseId: exercise.id,
          sets: [{ weightKg: 20, reps: 8, rir: 2, completedAt: recordedAt }],
        },
      ],
    },
  ]);
  assert.equal(
    service.invoke("workouts:list", [])[0].exercises[0].sets[0].reps,
    8,
  );
  assert.ok(
    service
      .invoke("recovery:get", [])
      .find((item) => item.slug === "quadriceps").recoveryDemand > 0,
  );

  service.invoke("auth:logout", []);
  const secondProfile = service.invoke("auth:register", [
    {
      email: "second@example.test",
      displayName: "Second Profile",
      password: "local-password-2",
    },
  ]);
  assert.notEqual(firstProfile.id, secondProfile.id);
  assert.deepEqual(service.invoke("bodyweight:list", []), []);
  assert.deepEqual(service.invoke("workouts:list", []), []);
  assert.throws(
    () =>
      service.invoke("workouts:update", [
        workout.id,
        {
          startedAt: recordedAt,
          exercises: [{ exerciseId: exercise.id, sets: [{ reps: 8 }] }],
        },
      ]),
    /Workout was not found/,
  );

  service.invoke("auth:logout", []);
  service.invoke("auth:login", [
    { email: firstProfile.email, password: "local-password-1" },
  ]);
  assert.equal(service.invoke("bodyweight:list", [])[0].id, measurement.id);
  assert.equal(service.invoke("workouts:list", [])[0].id, workout.id);
  assert.throws(
    () =>
      service.invoke("bodyweight:create", [
        {
          recordedAt,
          weightKg: -1,
          bodyFatPercent: 20,
        },
      ]),
    /Weight is invalid/,
  );
});

test("migrations are idempotent when reopening the user database", (t) => {
  const directory = fs.mkdtempSync(
    path.join(os.tmpdir(), "bodycomp-migration-test-"),
  );
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const databasePath = path.join(directory, "bodycomp.sqlite");
  const first = openDatabase(databasePath);
  first.close();
  const reopened = openDatabase(databasePath);
  assert.equal(reopened.pragma("user_version", { simple: true }), 3);
  assert.ok(
    reopened
      .pragma("table_info(exercise_muscles)")
      .some((column) => column.name === "load_factor"),
  );
  assert.equal(
    reopened.prepare("SELECT count(*) AS count FROM muscle_groups").get().count,
    18,
  );
  reopened.close();
});

test("local profile registry isolates databases and restores the selected profile", (t) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "bodycomp-profiles-test-"));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const makeManager = () => createProfileManager({
    userDataPath: directory,
    dialog: {},
    createService,
  });
  let manager = makeManager();
  const first = manager.create("Alex");
  const firstService = manager.getActiveService();
  const firstExercise = firstService.invoke("exercises:list", []).find((item) => item.name === "Barbell bench press");
  firstService.invoke("workouts:create", [{
    startedAt: "2025-01-10T10:00:00.000Z",
    exercises: [{ exerciseId: firstExercise.id, sets: [{ weightKg: 60, reps: 8 }] }],
  }]);
  const second = manager.create("Blair");
  assert.notEqual(first.id, second.id);
  assert.deepEqual(manager.getActiveService().invoke("workouts:list", []), []);
  manager.open(first.id);
  assert.equal(manager.getActiveService().invoke("workouts:list", []).length, 1);
  assert.throws(() => manager.open("../not-a-profile"), /valid local profile/);
  manager.close();
  manager = makeManager();
  assert.equal(manager.getActiveProfile().id, first.id);
  assert.equal(manager.getActiveService().invoke("workouts:list", []).length, 1);
  manager.remove(first.id);
  assert.equal(manager.getActiveProfile(), null);
  assert.equal(manager.list().length, 1);
  manager.close();
});

test("recovery service learns muscle duration after three repeat transitions", (t) => {
  const context = createTestService();
  t.after(() => context.close());
  const { service, database } = context;
  service.invoke("auth:register", [
    {
      email: "recovery@example.test",
      displayName: "Recovery Profile",
      password: "recovery-password-1",
    },
  ]);
  const exercise = database
    .prepare("SELECT id FROM exercises WHERE name = ?")
    .get("Barbell bench press");
  const now = Date.now();

  for (const ageHours of [120, 84, 48, 24]) {
    const startedAt = new Date(now - ageHours * 3_600_000).toISOString();
    service.invoke("workouts:create", [
      {
        startedAt,
        finishedAt: startedAt,
        exercises: [
          {
            exerciseId: exercise.id,
            sets: [
              {
                weightKg: 60,
                reps: 8,
                rir: 2,
                completedAt: startedAt,
              },
            ],
          },
        ],
      },
    ]);
  }

  const pectorals = service
    .invoke("recovery:get", [])
    .find((muscle) => muscle.slug === "pectorals");
  assert.equal(pectorals.recoveryEstimateLearned, true);
  assert.equal(pectorals.recoveryHistorySamples, 3);
  assert.equal(pectorals.recoveryHours, 36);
  assert.equal(pectorals.status, "ready");
  assert.equal(pectorals.totalSets, 3);
  assert.deepEqual(pectorals.contributingExercises, ["Barbell bench press"]);
  assert.equal(pectorals.averageRir, 2);
  assert.equal(typeof pectorals.estimatedReadyAt, "string");
});

test("timestamp-only workout updates preserve sets and move their recovery instant", (t) => {
  const context = createTestService();
  t.after(() => context.close());
  const { service } = context;
  service.invoke("auth:register", [{
    email: "timestamp@example.test", displayName: "Timestamp", password: "timestamp-password-1",
  }]);
  const exercise = service.invoke("exercises:list", []).find((item) => item.name === "Barbell bench press");
  const startedAt = "2025-01-10T10:00:00.000Z";
  const completedAt = "2025-01-10T10:30:00.000Z";
  const workout = service.invoke("workouts:create", [{
    startedAt, finishedAt: completedAt,
    exercises: [{ exerciseId: exercise.id, sets: [{ weightKg: 50, reps: 8, completedAt }] }],
  }]);
  const changed = service.invoke("workouts:update-timestamp", [workout.id, {
    startedAt: "2025-01-12T10:00:00.000Z", finishedAt: "2025-01-12T10:30:00.000Z",
  }]);
  assert.equal(changed.exercises[0].sets[0].completedAt, "2025-01-12T10:30:00.000Z");
  assert.equal(changed.exercises[0].sets[0].reps, 8);
  assert.equal(changed.exercises[0].sets[0].weightKg, 50);
});

test("new app database path leaves the legacy database untouched", (t) => {
  const directory = fs.mkdtempSync(
    path.join(os.tmpdir(), "bodycomp-legacy-data-test-"),
  );
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));

  const legacyPath = path.join(directory, "bodycomp.sqlite");
  const legacy = openRawDatabase(legacyPath);
  legacy.exec("CREATE TABLE legacy_exercises (name TEXT NOT NULL)");
  legacy
    .prepare("INSERT INTO legacy_exercises (name) VALUES (?)")
    .run("Saved exercise");
  legacy.pragma("user_version = 0");
  legacy.close();

  const currentPath = getDatabasePath(directory);
  assert.equal(path.basename(currentPath), "bodycomp-v2.sqlite");
  const current = openDatabase(currentPath);
  assert.equal(current.pragma("user_version", { simple: true }), 3);
  current.close();

  const preservedLegacy = openRawDatabase(legacyPath, { readonly: true });
  assert.equal(preservedLegacy.pragma("user_version", { simple: true }), 0);
  assert.equal(
    preservedLegacy.prepare("SELECT name FROM legacy_exercises").get().name,
    "Saved exercise",
  );
  preservedLegacy.close();
});

test("encrypted backups validate before replacing profiles and records", async (t) => {
  const directory = fs.mkdtempSync(
    path.join(os.tmpdir(), "bodycomp-backup-test-"),
  );
  const backupPath = path.join(directory, "test.bodycomp");
  const dialog = {
    showSaveDialog: async () => ({ canceled: false, filePath: backupPath }),
    showOpenDialog: async () => ({ canceled: false, filePaths: [backupPath] }),
    showMessageBox: async () => ({ response: 0 }),
  };
  const context = createTestService(dialog);
  t.after(() => {
    context.close();
    fs.rmSync(directory, { recursive: true, force: true });
  });
  const { service } = context;
  const recordedAt = new Date().toISOString();
  const first = service.invoke("auth:register", [
    {
      email: "backup@example.test",
      displayName: "Backup Profile",
      password: "backup-password-1",
    },
  ]);
  service.invoke("bodyweight:create", [
    { recordedAt, weightKg: 72, bodyFatPercent: 18 },
  ]);

  const exported = await service.invoke("backup:export", [
    { passphrase: "correct horse battery" },
  ]);
  assert.equal(exported.filePath, backupPath);
  const validBackup = fs.readFileSync(backupPath, "utf8");
  assert.match(validBackup, /aes-256-gcm/);

  service.invoke("bodyweight:create", [
    { recordedAt, weightKg: 73, bodyFatPercent: 19 },
  ]);
  await assert.rejects(
    service.invoke("backup:restore", [
      { passphrase: "incorrect horse battery" },
    ]),
    /Unable to decrypt this backup/,
  );
  assert.equal(service.invoke("bodyweight:list", []).length, 2);

  fs.writeFileSync(backupPath, "not a backup");
  await assert.rejects(
    service.invoke("backup:restore", [{ passphrase: "correct horse battery" }]),
    /not a valid BodyComp backup/,
  );
  assert.equal(service.invoke("bodyweight:list", []).length, 2);

  const futureDatabasePath = path.join(directory, "future.sqlite");
  fs.writeFileSync(
    futureDatabasePath,
    decodeBackup(validBackup, "correct horse battery"),
  );
  const futureDatabase = openRawDatabase(futureDatabasePath);
  futureDatabase.pragma("user_version = 99");
  futureDatabase.close();
  fs.writeFileSync(
    backupPath,
    JSON.stringify(
      encodeBackup(
        fs.readFileSync(futureDatabasePath),
        "correct horse battery",
      ),
    ),
  );
  await assert.rejects(
    service.invoke("backup:restore", [{ passphrase: "correct horse battery" }]),
    /database version that this app cannot restore/,
  );
  assert.equal(service.invoke("bodyweight:list", []).length, 2);

  fs.writeFileSync(backupPath, validBackup);
  const restored = await service.invoke("backup:restore", [
    { passphrase: "correct horse battery" },
  ]);
  assert.equal(restored.restored, true);
  assert.equal(service.invoke("auth:current-user", []), null);
  service.invoke("auth:login", [
    { email: first.email, password: "backup-password-1" },
  ]);
  assert.equal(service.invoke("bodyweight:list", []).length, 1);
  assert.equal(service.invoke("bodyweight:list", [])[0].weightKg, 72);
  assert.equal(
    fs.readdirSync(
      path.join(path.dirname(context.database.name), "restore-safety"),
    ).length,
    1,
  );
});

test("restore upgrades encrypted schema-v2 backups before replacing data", async (t) => {
  const directory = fs.mkdtempSync(
    path.join(os.tmpdir(), "bodycomp-v2-backup-test-"),
  );
  const backupPath = path.join(directory, "v2.bodycomp");
  const dialog = {
    showOpenDialog: async () => ({ canceled: false, filePaths: [backupPath] }),
    showMessageBox: async () => ({ response: 0 }),
  };
  const context = createTestService(dialog);
  t.after(() => {
    context.close();
    fs.rmSync(directory, { recursive: true, force: true });
  });

  const { service, database } = context;
  service.invoke("auth:register", [
    {
      email: "v2-restore@example.test",
      displayName: "V2 Restore",
      password: "v2-restore-password",
    },
  ]);
  const v2DatabasePath = path.join(directory, "v2.sqlite");
  await database.backup(v2DatabasePath);
  const v2Database = openRawDatabase(v2DatabasePath);
  v2Database.exec("ALTER TABLE exercise_muscles DROP COLUMN load_factor");
  v2Database.pragma("user_version = 2");
  v2Database.close();
  fs.writeFileSync(
    backupPath,
    JSON.stringify(
      encodeBackup(fs.readFileSync(v2DatabasePath), "correct horse battery"),
    ),
  );

  const restored = await service.invoke("backup:restore", [
    { passphrase: "correct horse battery" },
  ]);
  assert.equal(restored.restored, true);
  service.invoke("auth:login", [
    { email: "v2-restore@example.test", password: "v2-restore-password" },
  ]);
  assert.equal(database.pragma("user_version", { simple: true }), 3);
  assert.equal(
    database
      .prepare("SELECT min(load_factor) AS factor FROM exercise_muscles")
      .get().factor,
    1,
  );
});
