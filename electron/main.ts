import { app, BrowserWindow, dialog, ipcMain } from 'electron'
//import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import fs from 'fs/promises'

//const require = createRequire(import.meta.url)
const __dirname = path.dirname(fileURLToPath(import.meta.url))

// The built directory structure
//
// ├─┬─┬ dist
// │ │ └── index.html
// │ │
// │ ├─┬ dist-electron
// │ │ ├── main.js
// │ │ └── preload.mjs
// │
process.env.APP_ROOT = path.join(__dirname, '..')

// 🚧 Use ['ENV_NAME'] avoid vite:define plugin - Vite@2.x
export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, 'public') : RENDERER_DIST

let win: BrowserWindow | null

function createWindow() {
  win = new BrowserWindow({
    icon: path.join(process.env.VITE_PUBLIC, 'electron-vite.svg'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
    },
  })

  // Test active push message to Renderer-process.
  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', (new Date).toLocaleString())
  })

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(`${VITE_DEV_SERVER_URL}#/`)
  } else {
    // win.loadFile('dist/index.html')
    win.loadFile(path.join(RENDERER_DIST, 'index.html'), {hash: '/'})
  }
}


// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
    win = null
  }
})

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

app.whenReady().then(createWindow)

ipcMain.handle('open-file-dialog', async (_event, filters) => {
  const win = BrowserWindow.getFocusedWindow()
  const defaultFilters = [
    {name: "All Files", extensions: ['*']}
  ]

  const dialogOptions: Electron.OpenDialogOptions = {
    properties: ['openFile'],
    filters: Array.isArray(filters) && filters.length > 0 ? filters : defaultFilters
  }

  const result = win
    ? await dialog.showOpenDialog(win, dialogOptions)
    : await dialog.showOpenDialog(dialogOptions)

  return result.filePaths
})

ipcMain.handle('save-file-dialog', async (_event, defaultName, filters) => {
  const win = BrowserWindow.getFocusedWindow()
  const dialogOptions = {
    defaultPath: defaultName || 'lyrics.lrc',
    filters: filters || [
      {name: "Lyrics File", extensions: ['lrc']}
    ]
  }


  const result = win
    ? await dialog.showSaveDialog(win, dialogOptions)
    : await dialog.showSaveDialog(dialogOptions)
  return result.filePath
})


ipcMain.handle('read-audio-buffer', async (_event, filePath) => {
  try {
    const buffer = await fs.readFile(filePath)

    const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength)



    return {success: true, buffer: arrayBuffer}
  } catch (error) {
    return {success: false, error: error instanceof Error ? error.message: String(error)}
  }
})


ipcMain.handle('read-lyrics-file', async (_event, filePath) => {
  try {
    const content = await fs.readFile(filePath, {encoding: 'utf8'})
    return {success: true, content: content}

  } catch (error) {
    console.error(':c l', error)
    return {success: false, error: error instanceof Error ? error.message: String(error)}
  }
})

ipcMain.handle('save-lyrics-file', async (_event, filePath, contect) => {
  try {
    await fs.writeFile(filePath,contect, 'utf-8')
    return {success: true}
  } catch (error) {
    return {success: false, error: error instanceof Error ? error.message: String(error)}
  }
})