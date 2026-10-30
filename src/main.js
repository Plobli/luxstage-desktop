const { app, BrowserWindow, Menu, ipcMain, shell, nativeTheme, screen } = require('electron')
const path = require('node:path')
const { autoUpdater } = require('electron-updater')
const { load, save, normalizeServerUrl } = require('./config')
const { fetchPatch, DEFAULT_PORT } = require('./eos-sync')

app.setName('LuxStage')
app.setAboutPanelOptions({
  applicationName: 'LuxStage',
  applicationVersion: app.getVersion(),
  version: '',
  iconPath: path.join(__dirname, 'icon.png'),
  copyright: '© LuxStage',
})

const ROOT_URL = 'https://luxstage.app'

let win = null

const MAC = process.platform === 'darwin'
const TITLEBAR = 28

// Natives Verhalten für die Web-App: kein Text-Markieren auf der Oberfläche,
// kein Gummiband-Scrollen, Standard-Cursor, Titelleiste zum Ziehen.
const NATIVE_CSS = `
  html { font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif !important; }
  html, body { overscroll-behavior: none; -webkit-font-smoothing: antialiased; cursor: default; }
  body { -webkit-user-select: none; user-select: none; -webkit-touch-callout: none; }
  input, textarea, [contenteditable=""], [contenteditable="true"], pre, code, .selectable { -webkit-user-select: text; user-select: text; cursor: text; }
  a, button, [role="button"], select, label, summary, input[type="checkbox"], input[type="radio"] { cursor: default; }
  a[href^="http"] { cursor: pointer; }
  img, a { -webkit-user-drag: none; }
  ${MAC ? `
  html { padding-top: ${TITLEBAR}px; box-sizing: border-box; height: 100vh; }
  body::before { content: ''; position: fixed; top: 0; left: 0; right: 0; height: ${TITLEBAR}px; -webkit-app-region: drag; z-index: 2147483647; pointer-events: auto; }
  ` : ''}
`

function restoreBounds() {
  const saved = load().windowBounds
  const fallback = { width: 1400, height: 900 }
  if (!saved) return fallback
  const visible = screen.getAllDisplays().some((d) => {
    const a = d.workArea
    return saved.x < a.x + a.width - 100 && saved.x + saved.width > a.x + 100 &&
      saved.y < a.y + a.height - 50 && saved.y + saved.height > a.y
  })
  return visible ? saved : fallback
}

function rememberBounds() {
  if (!win || win.isDestroyed() || win.isFullScreen() || win.isMinimized()) return
  save({ windowBounds: win.getNormalBounds(), windowMaximized: win.isMaximized() })
}

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
    ...restoreBounds(),
    show: false,
    minWidth: 900,
    minHeight: 600,
    title: 'LuxStage',
    backgroundColor: '#0b0b0e',
    icon: path.join(__dirname, 'icon.png'),
    ...(MAC
      ? { titleBarStyle: 'hiddenInset', trafficLightPosition: { x: 16, y: 14 }, fullscreenable: true }
      : {}),
    webPreferences: {
      spellcheck: true,
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
    const origin = new URL(url).origin
    if (origin !== allowedOrigin() && origin !== ROOT_URL) {
      event.preventDefault()
      if (/^https?:/i.test(url)) shell.openExternal(url)
    }
  })
  win.webContents.on('did-fail-load', (_e, code, desc, _url, isMain) => {
    if (isMain && code !== -3) showStart()
  })
  win.on('closed', () => { win = null })

  // Fenster erst zeigen, wenn Inhalt steht (kein weißes Aufblitzen); Position merken.
  win.once('ready-to-show', () => {
    if (load().windowMaximized) win.maximize()
    win.show()
  })
  win.on('focus', () => win.webContents.send('window:focus', true))
  win.on('blur', () => win.webContents.send('window:focus', false))
  win.on('resize', rememberBounds)
  win.on('move', rememberBounds)
  win.on('close', rememberBounds)

  // Native Optik: Pinch-Zoom aus, Wischen für Zurück/Vor, Seiten-CSS.
  win.webContents.setVisualZoomLevelLimits(1, 1)
  win.on('swipe', (_e, direction) => {
    const nav = win.webContents.navigationHistory
    if (direction === 'left' && nav.canGoBack()) nav.goBack()
    if (direction === 'right' && nav.canGoForward()) nav.goForward()
  })
  win.webContents.on('dom-ready', () => {
    if (!win.webContents.getURL().startsWith('file://')) win.webContents.insertCSS(NATIVE_CSS)
  })

  // Natives Kontextmenü: Rechtschreibung, Bearbeiten, Links.
  win.webContents.on('context-menu', (_e, params) => {
    const items = []
    if (params.misspelledWord) {
      for (const word of params.dictionarySuggestions.slice(0, 5)) {
        items.push({ label: word, click: () => win.webContents.replaceMisspelling(word) })
      }
      if (items.length) items.push({ type: 'separator' })
    }
    if (params.linkURL) {
      items.push(
        { label: 'Link im Browser öffnen', click: () => shell.openExternal(params.linkURL) },
        { label: 'Link kopieren', click: () => require('electron').clipboard.writeText(params.linkURL) },
        { type: 'separator' },
      )
    }
    if (params.isEditable) {
      items.push(
        { role: 'undo', label: 'Widerrufen' }, { role: 'redo', label: 'Wiederholen' }, { type: 'separator' },
        { role: 'cut', label: 'Ausschneiden' }, { role: 'copy', label: 'Kopieren' },
        { role: 'paste', label: 'Einsetzen' }, { role: 'selectAll', label: 'Alles auswählen' },
      )
    } else if (params.selectionText) {
      items.push({ role: 'copy', label: 'Kopieren' })
    }
    if (items.length) Menu.buildFromTemplate(items).popup({ window: win })
  })

  showApp()
}

function openSettings() {
  if (!win) return
  const url = win.webContents.getURL()
  if (url.startsWith('file://') || !allowedOrigin()) return
  win.loadURL(`${allowedOrigin()}/settings`)
}

function buildMenu() {
  const mac = process.platform === 'darwin'
  const settings = { label: 'Einstellungen …', accelerator: 'CmdOrCtrl+,', click: openSettings }
  const switchTeam = { label: 'Team wechseln …', click: () => win && showStart() }
  const template = [
    ...(mac
      ? [{
          label: 'LuxStage',
          submenu: [
            { role: 'about', label: 'Über LuxStage' },
            { type: 'separator' },
            settings,
            switchTeam,
            { type: 'separator' },
            { role: 'services', label: 'Dienste' },
            { type: 'separator' },
            { role: 'hide', label: 'LuxStage ausblenden' },
            { role: 'hideOthers', label: 'Andere ausblenden' },
            { role: 'unhide', label: 'Alle einblenden' },
            { type: 'separator' },
            { role: 'quit', label: 'LuxStage beenden' },
          ],
        }]
      : [{
          label: 'Datei',
          submenu: [settings, switchTeam, { type: 'separator' }, { role: 'quit', label: 'Beenden' }],
        }]),
    { role: 'editMenu', label: 'Bearbeiten' },
    {
      label: 'Navigation',
      submenu: [
        { label: 'Zurück', accelerator: 'CmdOrCtrl+[', click: () => win?.webContents.navigationHistory.goBack() },
        { label: 'Vor', accelerator: 'CmdOrCtrl+]', click: () => win?.webContents.navigationHistory.goForward() },
      ],
    },
    {
      label: 'Ansicht',
      submenu: [
        { label: 'Neu laden', accelerator: 'CmdOrCtrl+R', click: () => win && showApp() },
        { role: 'togglefullscreen', label: 'Vollbild' },
        { role: 'resetZoom', label: 'Originalgröße' },
        { role: 'zoomIn', label: 'Vergrößern' },
        { role: 'zoomOut', label: 'Verkleinern' },
        ...(app.isPackaged ? [] : [{ type: 'separator' }, { role: 'toggleDevTools' }]),
      ],
    },
    { role: 'windowMenu', label: 'Fenster' },
    ...(MAC ? [] : [{ role: 'help', label: 'Hilfe', submenu: [{ label: 'Dokumentation', click: () => shell.openExternal('https://docs.luxstage.app') }] }]),
  ]
  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}

ipcMain.handle('app:info', () => ({
  version: app.getVersion(),
  platform: process.platform,
  serverUrl: load().serverUrl ?? null,
}))

ipcMain.handle('app:set-badge', (_event, count) => {
  if (MAC) app.dock?.setBadge(Number(count) > 0 ? String(count) : '')
  else if (win) win.flashFrame(Number(count) > 0)
})

ipcMain.handle('app:open-register', () => {
  if (win) win.loadURL(`${ROOT_URL}/register`)
})

ipcMain.handle('app:set-server', (_event, value) => {
  const url = normalizeServerUrl(value)
  if (!url) return { ok: false }
  save({ serverUrl: url })
  showApp()
  return { ok: true }
})

// Pult-Sync: nur Aufrufe aus der eigenen Web-App (Team-Origin) zulassen.
ipcMain.handle('eos:get-host', () => load().eosHost ?? '')

ipcMain.handle('eos:fetch-patch', async (event, { host, port } = {}) => {
  const sender = event.senderFrame?.url
  let origin = null
  try { origin = new URL(sender).origin } catch { /* ignorieren */ }
  if (!origin || (origin !== allowedOrigin() && origin !== ROOT_URL)) return { ok: false, error: 'Nicht erlaubt' }
  const cleanHost = String(host || '').trim()
  if (!/^[a-z0-9.\-:[\]]+$/i.test(cleanHost)) return { ok: false, error: 'Ungültige Adresse' }
  save({ eosHost: cleanHost })
  try {
    const result = await fetchPatch({
      host: cleanHost,
      port: Number(port) || DEFAULT_PORT,
      onProgress: (done, total) => event.sender.send('eos:progress', { done, total }),
    })
    return { ok: true, ...result }
  } catch (err) {
    return { ok: false, error: err.message }
  }
})

app.whenReady().then(() => {
  nativeTheme.themeSource = 'system'
  if (MAC) {
    app.dock?.setIcon(path.join(__dirname, 'icon.png'))
    app.dock?.setMenu(Menu.buildFromTemplate([
      { label: 'Team wechseln …', click: () => { if (win) showStart() } },
      { label: 'Einstellungen …', click: openSettings },
    ]))
  }
  buildMenu()
  createWindow()
  // Store-Version (MSIX) aktualisiert der Microsoft Store selbst.
  if (app.isPackaged && !process.windowsStore) {
    autoUpdater.on('error', (err) => console.error('Update-Prüfung fehlgeschlagen:', err.message))
    autoUpdater.checkForUpdatesAndNotify().catch(() => {})
  }
  app.on('activate', () => { if (!BrowserWindow.getAllWindows().length) createWindow() })
})

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit() })
