const allowedMethods = new Set([
  "profiles:list",
  "profiles:create",
  "profiles:select",
  "profiles:rename",
  "profiles:delete",
  "profiles:current",
  "profile:update",
  "profile:update-avatar",
  "recovery:get",
  "bodyweight:list",
  "bodyweight:create",
  "bodyweight:update",
  "bodyweight:delete",
  "exercises:list",
  "exercises:create",
  "custom-exercises:list",
  "custom-exercises:update",
  "custom-exercises:delete",
  "muscle-groups:list",
  "workouts:create",
  "workouts:list",
  "workouts:update",
  "workouts:update-timestamp",
  "workouts:delete",
  "settings:get",
  "settings:update",
  "backup:export",
  "backup:restore",
]);

const profileMethods = new Set(["profiles:list", "profiles:create", "profiles:select", "profiles:rename", "profiles:delete", "profiles:current"]);

function registerIpcHandlers({ ipcMain, getService, getProfileManager, isAppFile }) {
  ipcMain.handle("bodycomp:invoke", async (event, method, args) => {
    if (!event.senderFrame || event.senderFrame !== event.sender.mainFrame) {
      throw new Error("IPC requests are only accepted from the main frame.");
    }
    if (!isAppFile(event.senderFrame.url)) {
      throw new Error("IPC requests are only accepted from the local app.");
    }
    if (!allowedMethods.has(method)) {
      throw new Error("Unsupported application operation.");
    }

    if (profileMethods.has(method)) {
      const manager = getProfileManager?.();
      if (!manager) throw new Error("Local profile storage is not ready.");
      const actions = {
        "profiles:list": () => manager.list(),
        "profiles:create": () => manager.create(args?.[0]),
        "profiles:select": () => manager.open(args?.[0]),
        "profiles:rename": () => manager.rename(args?.[0], args?.[1]),
        "profiles:delete": () => manager.remove(args?.[0]),
        "profiles:current": () => manager.getActiveProfile(),
      };
      return actions[method]();
    }
    const service = getService();
    if (!service) throw new Error("The local data service is not ready.");
    return service.invoke(method, Array.isArray(args) ? args : []);
  });
}

module.exports = { allowedMethods, registerIpcHandlers };
