const { contextBridge, ipcRenderer } = require('electron')

// Schnittstelle für Web-App und Startseite.
// eos.*: Pult-Sync (OSC im Hauptprozess, siehe eos-sync.js).
contextBridge.exposeInMainWorld('luxstageDesktop', {
  isDesktop: true,
  getInfo: () => ipcRenderer.invoke('app:info'),
  openRegister: () => ipcRenderer.invoke('app:open-register'),
  setServer: (value) => ipcRenderer.invoke('app:set-server', value),
  eos: {
    getHost: () => ipcRenderer.invoke('eos:get-host'),
    fetchPatch: (host, port) => ipcRenderer.invoke('eos:fetch-patch', { host, port }),
    onProgress: (callback) => {
      const handler = (_event, data) => callback(data)
      ipcRenderer.on('eos:progress', handler)
      return () => ipcRenderer.removeListener('eos:progress', handler)
    },
  },
})
