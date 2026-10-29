const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { getProfileDatabasePath, openDatabase, openRawDatabase } = require("./database");

const profileIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function fail(message) { throw new Error(message); }

function validName(value) {
  if (typeof value !== "string" || !value.trim() || value.trim().length > 80) {
    fail("Profile name must be between 1 and 80 characters.");
  }
  return value.trim();
}

function registryPath(userDataPath) {
  return path.join(userDataPath, "profile-registry.sqlite");
}

function openRegistry(userDataPath) {
  fs.mkdirSync(userDataPath, { recursive: true });
  const database = openRawDatabase(registryPath(userDataPath));
  database.pragma("foreign_keys = ON");
  database.exec(`CREATE TABLE IF NOT EXISTS local_profiles (
    id TEXT PRIMARY KEY,
    display_name TEXT NOT NULL COLLATE NOCASE UNIQUE,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS registry_state (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    active_profile_id TEXT REFERENCES local_profiles(id) ON DELETE SET NULL
  );
  INSERT OR IGNORE INTO registry_state (id, active_profile_id) VALUES (1, NULL);`);
  return database;
}

function createProfileManager({ userDataPath, dialog, createService }) {
  const registry = openRegistry(userDataPath);
  let active = null;

  function list() {
    return registry.prepare(
      `SELECT id, display_name AS displayName, created_at AS createdAt,
       id = (SELECT active_profile_id FROM registry_state WHERE id = 1) AS isActive
       FROM local_profiles ORDER BY display_name COLLATE NOCASE`,
    ).all().map((profile) => ({ ...profile, isActive: Boolean(profile.isActive) }));
  }

  function ensureId(id) {
    if (typeof id !== "string" || !profileIdPattern.test(id)) fail("Choose a valid local profile.");
    return id;
  }

  function open(id) {
    const profile = registry.prepare("SELECT id, display_name AS displayName FROM local_profiles WHERE id = ?").get(ensureId(id));
    if (!profile) fail("Local profile was not found.");
    active?.service.close();
    const databasePath = getProfileDatabasePath(userDataPath, profile.id);
    const database = openDatabase(databasePath);
    const service = createService({ database, dialog, databasePath });
    active = { ...profile, service };
    registry.prepare("UPDATE registry_state SET active_profile_id = ? WHERE id = 1").run(profile.id);
    return profile;
  }

  function create(name) {
    const displayName = validName(name);
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    try {
      registry.transaction(() => {
        registry.prepare("INSERT INTO local_profiles (id, display_name, created_at, updated_at) VALUES (?, ?, ?, ?)").run(id, displayName, now, now);
      })();
      const profile = open(id);
      active.service.invoke("local:bootstrap-profile", [profile]);
      return profile;
    } catch (error) {
      if (String(error.message).includes("UNIQUE constraint failed")) fail("A local profile with that name already exists.");
      throw error;
    }
  }

  function rename(id, name) {
    const displayName = validName(name);
    const result = registry.prepare("UPDATE local_profiles SET display_name = ?, updated_at = ? WHERE id = ?").run(displayName, new Date().toISOString(), ensureId(id));
    if (!result.changes) fail("Local profile was not found.");
    if (active?.id === id) {
      active.service.invoke("local:rename-profile", [displayName]);
      active.displayName = displayName;
    }
    return { id, displayName };
  }

  function remove(id) {
    const profileId = ensureId(id);
    if (!registry.prepare("SELECT 1 FROM local_profiles WHERE id = ?").get(profileId)) fail("Local profile was not found.");
    if (active?.id === profileId) {
      active.service.close();
      active = null;
    }
    registry.prepare("DELETE FROM local_profiles WHERE id = ?").run(profileId);
    const target = getProfileDatabasePath(userDataPath, profileId);
    if (fs.existsSync(target)) fs.rmSync(target, { force: true });
    for (const suffix of ["-wal", "-shm"]) fs.rmSync(`${target}${suffix}`, { force: true });
    return null;
  }

  function getActiveService() { return active?.service || null; }
  function getActiveProfile() { return active ? { id: active.id, displayName: active.displayName } : null; }
  function restoreActive() {
    const row = registry.prepare("SELECT active_profile_id AS id FROM registry_state WHERE id = 1").get();
    if (row?.id) {
      try { open(row.id); } catch { registry.prepare("UPDATE registry_state SET active_profile_id = NULL WHERE id = 1").run(); }
    }
  }
  function close() { active?.service.close(); registry.close(); }

  restoreActive();
  return { list, create, open, rename, remove, getActiveService, getActiveProfile, close };
}

module.exports = { createProfileManager, openRegistry, registryPath };
