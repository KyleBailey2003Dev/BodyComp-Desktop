const path = require("node:path");
const { pathToFileURL, fileURLToPath } = require("node:url");
const { app, BrowserWindow, dialog, ipcMain } = require("electron");
const { registerIpcHandlers } = require("./ipc");
const { createService } = require("./service");
const { createProfileManager } = require("./profiles");

const appRoot = path.resolve(__dirname, "..");
let profileManager;

app.setPath("userData", path.join(app.getPath("appData"), "bodycomp-desktop"));

function isAppFile(url) {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "file:") return false;
    const target = path.resolve(fileURLToPath(parsed));
    return (
      path.dirname(target) === appRoot &&
      path.extname(target).toLowerCase() === ".html"
    );
  } catch {
    return false;
  }
}

async function createWindow() {
  const window = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 720,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  window.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  window.webContents.on("will-navigate", (event, url) => {
    if (!isAppFile(url)) event.preventDefault();
  });

  await window.loadURL(pathToFileURL(path.join(appRoot, "auth.html")).href);
}

registerIpcHandlers({
  ipcMain,
  getService: () => profileManager?.getActiveService(),
  getProfileManager: () => profileManager,
  isAppFile,
});

app.whenReady().then(async () => {
  profileManager = createProfileManager({
    userDataPath: app.getPath("userData"),
    dialog,
    createService,
  });
  await createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) void createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("before-quit", () => {
  profileManager?.close();
});
