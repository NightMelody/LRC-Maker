import { app as c, BrowserWindow as f, ipcMain as i, dialog as l } from "electron";
import { fileURLToPath as m } from "node:url";
import t from "node:path";
import u from "fs/promises";
const p = t.dirname(m(import.meta.url));
process.env.APP_ROOT = t.join(p, "..");
const d = process.env.VITE_DEV_SERVER_URL, R = t.join(process.env.APP_ROOT, "dist-electron"), w = t.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = d ? t.join(process.env.APP_ROOT, "public") : w;
let s;
function h() {
  s = new f({
    icon: t.join(process.env.VITE_PUBLIC, "electron-vite.svg"),
    webPreferences: {
      preload: t.join(p, "preload.mjs")
    }
  }), s.webContents.on("did-finish-load", () => {
    s == null || s.webContents.send("main-process-message", (/* @__PURE__ */ new Date()).toLocaleString());
  }), d ? s.loadURL(`${d}#/`) : s.loadFile(t.join(w, "index.html"), { hash: "/" });
}
c.on("window-all-closed", () => {
  process.platform !== "darwin" && (c.quit(), s = null);
});
c.on("activate", () => {
  f.getAllWindows().length === 0 && h();
});
c.whenReady().then(h);
i.handle("open-file-dialog", async (a, r) => {
  const e = f.getFocusedWindow(), n = [
    { name: "All Files", extensions: ["*"] }
  ], o = {
    properties: ["openFile"],
    filters: Array.isArray(r) && r.length > 0 ? r : n
  };
  return (e ? await l.showOpenDialog(e, o) : await l.showOpenDialog(o)).filePaths;
});
i.handle("save-file-dialog", async (a, r, e) => {
  const n = f.getFocusedWindow(), o = {
    defaultPath: r || "lyrics.lrc",
    filters: e || [
      { name: "Lyrics File", extensions: ["lrc"] }
    ]
  };
  return (n ? await l.showSaveDialog(n, o) : await l.showSaveDialog(o)).filePath;
});
i.handle("read-audio-buffer", async (a, r) => {
  try {
    const e = await u.readFile(r);
    return { success: !0, buffer: e.buffer.slice(e.byteOffset, e.byteOffset + e.byteLength) };
  } catch (e) {
    return { success: !1, error: e instanceof Error ? e.message : String(e) };
  }
});
i.handle("read-lyrics-file", async (a, r) => {
  try {
    return { success: !0, content: await u.readFile(r, { encoding: "utf8" }) };
  } catch (e) {
    return console.error(":c l", e), { success: !1, error: e instanceof Error ? e.message : String(e) };
  }
});
i.handle("save-lyrics-file", async (a, r, e) => {
  try {
    return await u.writeFile(r, e, "utf-8"), { success: !0 };
  } catch (n) {
    return { success: !1, error: n instanceof Error ? n.message : String(n) };
  }
});
export {
  R as MAIN_DIST,
  w as RENDERER_DIST,
  d as VITE_DEV_SERVER_URL
};
