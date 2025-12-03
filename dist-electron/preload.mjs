"use strict";
const electron = require("electron");
electron.contextBridge.exposeInMainWorld("ipcRenderer", {
  on(...args) {
    const [channel, listener] = args;
    return electron.ipcRenderer.on(channel, (event, ...args2) => listener(event, ...args2));
  },
  off(...args) {
    const [channel, ...omit] = args;
    return electron.ipcRenderer.off(channel, ...omit);
  },
  send(...args) {
    const [channel, ...omit] = args;
    return electron.ipcRenderer.send(channel, ...omit);
  },
  invoke(...args) {
    const [channel, ...omit] = args;
    return electron.ipcRenderer.invoke(channel, ...omit);
  }
  // You can expose other APTs you need here.
  // ...''
});
electron.contextBridge.exposeInMainWorld("electronAPI", {
  openFile: (filtersArray) => electron.ipcRenderer.invoke("open-file-dialog", filtersArray),
  saveFile: (defautlName, filters) => electron.ipcRenderer.invoke("save-file-dialog", defautlName, filters),
  readAudioBuffer: (path) => electron.ipcRenderer.invoke("read-audio-buffer", path),
  readLyricsFile: (path) => electron.ipcRenderer.invoke("read-lyrics-file", path),
  saveLyricsFile: (filePath, content) => electron.ipcRenderer.invoke("save-lyrics-file", filePath, content)
});
