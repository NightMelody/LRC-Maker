import { app, BrowserWindow, ipcMain, dialog } from "electron";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "fs/promises";
createRequire(import.meta.url);
const __dirname$1 = path.dirname(fileURLToPath(import.meta.url));
process.env.APP_ROOT = path.join(__dirname$1, "..");
const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
const MAIN_DIST = path.join(process.env.APP_ROOT, "dist-electron");
const RENDERER_DIST = path.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, "public") : RENDERER_DIST;
let win;
function createWindow() {
  win = new BrowserWindow({
    icon: path.join(process.env.VITE_PUBLIC, "electron-vite.svg"),
    webPreferences: {
      preload: path.join(__dirname$1, "preload.mjs")
    }
  });
  win.webContents.on("did-finish-load", () => {
    win == null ? void 0 : win.webContents.send("main-process-message", (/* @__PURE__ */ new Date()).toLocaleString());
  });
  if (VITE_DEV_SERVER_URL) {
    win.loadURL(`${VITE_DEV_SERVER_URL}#/`);
  } else {
    win.loadFile(path.join(RENDERER_DIST, "index.html"), { hash: "/" });
  }
}
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
    win = null;
  }
});
app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
app.whenReady().then(createWindow);
ipcMain.handle("open-file-dialog", async (event, filters) => {
  const dedaultFilters = [
    { name: "All Files", extensions: ["*"] }
  ];
  const result = await dialog.showOpenDialog(BrowserWindow.getFocusedWindow(), {
    properties: ["openFile"],
    filters: Array.isArray(filters) && filters.length > 0 ? filters : dedaultFilters
  });
  return result.filePaths;
});
ipcMain.handle("save-file-dialog", async (event, defaultName, filters) => {
  const result = await dialog.showSaveDialog(BrowserWindow.getFocusedWindow(), {
    defaultPath: defaultName || "lyrics.lrc",
    filters: filters || [
      { name: "Lyrics File", extensions: ["lrc"] }
    ]
  });
  return result.filePath;
});
ipcMain.handle("read-audio-buffer", async (event, filePath) => {
  try {
    const buffer = await fs.readFile(filePath);
    const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
    console.log("13weqdsa");
    return { success: true, buffer: arrayBuffer };
  } catch (error) {
    console.error("Error at audio read", error);
    return { success: false, error: error.message };
  }
});
ipcMain.handle("read-lyrics-file", async (event, filePath) => {
  try {
    const content = await fs.readFile(filePath, { encoding: "utf8" });
    return { success: true, content };
  } catch (error) {
    console.error(":c l", error);
    return { success: false, error: error.message };
  }
});
ipcMain.handle("save-lyrics-file", async (event, filePath, contect) => {
  try {
    await fs.writeFile(filePath, contect, "utf-8");
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});
export {
  MAIN_DIST,
  RENDERER_DIST,
  VITE_DEV_SERVER_URL
};
