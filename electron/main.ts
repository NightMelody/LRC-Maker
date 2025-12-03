import { app, BrowserWindow, dialog, ipcMain } from 'electron'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { Extension } from 'typescript'
import fs from 'fs/promises'
import { crash } from 'node:process'

const require = createRequire(import.meta.url)
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

function createPropertiesWindow() {
  const propertieWin = new BrowserWindow({
    width: 700,
    height: 500,
    icon: path.join(process.env.VITE_PUBLIC, 'electron-vite.svg'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
    },
  })

  if (VITE_DEV_SERVER_URL) {
    propertieWin.loadURL(`${VITE_DEV_SERVER_URL}#/properties`)
  } else {
    propertieWin.loadFile(path.join(RENDERER_DIST, 'index.html'), {hash: null})
  }

  return propertieWin
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

ipcMain.handle('open-file-dialog', async (event, filters) => {
  const dedaultFilters = [
    {name: "All Files", extensions: ['*']}
  ]
  const result = await dialog.showOpenDialog(BrowserWindow.getFocusedWindow(), {
    properties: ['openFile'],
    filters: Array.isArray(filters) && filters.length > 0 ? filters : dedaultFilters
  })

  return result.filePaths
})

ipcMain.handle('save-file-dialog', async (event, defaultName, filters) => {
  const result = await dialog.showSaveDialog(BrowserWindow.getFocusedWindow(), {
    defaultPath: defaultName || 'lyrics.lrc',
    filters: filters || [
      {name: "Lyrics File", extensions: ['lrc']}
    ]
  })

  return result.filePath
})


ipcMain.handle('read-audio-buffer', async (event, filePath) => {
  try {
    const buffer = await fs.readFile(filePath)

    const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength)

    console.log('13weqdsa')

    return {success: true, buffer: arrayBuffer}
  } catch (error) {
    console.error('Error at audio read', error)
    return {success: false, error: error.message}
  }
})


ipcMain.handle('read-lyrics-file', async (event, filePath) => {
  try {
    const content = await fs.readFile(filePath, {encoding: 'utf8'})
    return {success: true, content: content}

  } catch (error) {
    console.error(':c l', error)
    return {success: false, error: error.message}
  }
})

ipcMain.handle('save-lyrics-file', async (event, filePath, contect) => {
  try {
    await fs.writeFile(filePath,contect, 'utf-8')
    return {success: true}
  } catch (error) {
    return {success: false, error: error.message}
  }
})