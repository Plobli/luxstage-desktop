const { app, BrowserWindow, Menu, ipcMain, shell } = require('electron')
const path = require('node:path')
const { load, save, normalizeServerUrl } = require('./config')

let win = null

function allowedOrigin() {
  try {
    return new URL(load().serverUrl).origin
  } catch {
    return null
  }
}

function showStart() {
  win.loadFile(path.join(__dirname, 'start.html'))
}

function showApp() {
  const url = load().serverUrl
  if (url) win.loadURL(url)
  else showStart()
}

function createWindow() {
  win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    title: 'LuxStage',
    icon: path.join(__dirname, '..', 'build', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })

  // Nur das eigene Team bleibt im Fenster, alles andere öffnet im Browser.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/i.test(url)) shell.openExternal(url)
    return { action: 'deny' }
  })
  win.webContents.on('will-navigate', (event, url) => {
    if (url.startsWith('file://')) return
    if (new URL(url).origin !== allowedOrigin()) {
      event.preventDefault()
      if (/^https?:/i.test(url)) shell.openExternal(url)
    }
  })
  win.webContents.on('did-fail-load', (_e, code, desc, _url, isMain) => {
    if (isMain && code !== -3) showStart()
  })
  win.on('closed', () => { win = null })

  showApp()
}

function buildMenu() {
  const template = [
    ...(process.platform === 'darwin' ? [{ role: 'appMenu' }] : []),
    {
      label: 'LuxStage',
      submenu: [
        { label: 'Team wechseln …', click: () => win && showStart() },
        { label: 'Neu laden', accelerator: 'CmdOrCtrl+R', click: () => win && showApp() },
        ...(process.platform === 'darwin' ? [] : [{ role: 'quit' }]),
      ],
    },
    { role: 'editMenu' },
    { role: 'viewMenu' },
    { role: 'windowMenu' },
  ]
  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}

ipcMain.handle('app:info', () => ({
  version: app.getVersion(),
  platform: process.platform,
  serverUrl: load().serverUrl ?? null,
}))

ipcMain.handle('app:set-server', (_event, value) => {
  const url = normalizeServerUrl(value)
  if (!url) return { ok: false }
  save({ serverUrl: url })
  showApp()
  return { ok: true }
})

app.whenReady().then(() => {
  if (process.platform === 'darwin') app.dock?.setIcon(path.join(__dirname, '..', 'build', 'icon.png'))
  buildMenu()
  createWindow()
  app.on('activate', () => { if (!BrowserWindow.getAllWindows().length) createWindow() })
})

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit() })
