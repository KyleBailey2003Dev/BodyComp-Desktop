const { contextBridge, ipcRenderer } = require("electron");

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

contextBridge.exposeInMainWorld("bodyCompDesktop", {
  invoke(method, ...args) {
    if (!allowedMethods.has(method)) {
      return Promise.reject(new Error("Unsupported application operation."));
    }
    return ipcRenderer.invoke("bodycomp:invoke", method, args);
  },
});
