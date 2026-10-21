const { contextBridge, ipcRenderer } = require('electron')

// Schnittstelle für Web-App und Startseite. Der Pult-Sync (OSC) wird hier später ergänzt:
// window.luxstageDesktop.eos.* -> ipcRenderer.invoke('eos:...') -> OSC-Dienst im Hauptprozess.
contextBridge.exposeInMainWorld('luxstageDesktop', {
  isDesktop: true,
  getInfo: () => ipcRenderer.invoke('app:info'),
  openRegister: () => ipcRenderer.invoke('app:open-register'),
  setServer: (value) => ipcRenderer.invoke('app:set-server', value),
})
