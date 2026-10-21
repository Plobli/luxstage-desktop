// Nur Entwicklung: Menüleiste/Dock zeigen sonst „Electron“. Gebaute Apps heißen schon LuxStage.
if (process.platform !== 'darwin') process.exit(0)
const { execFileSync } = require('node:child_process')
const path = require('node:path')
try {
  const plist = path.join(require.resolve('electron'), '..', 'dist', 'Electron.app', 'Contents', 'Info.plist')
  for (const key of ['CFBundleName', 'CFBundleDisplayName']) {
    execFileSync('/usr/bin/plutil', ['-replace', key, '-string', 'LuxStage', plist])
  }
} catch (e) {
  console.warn('dev-name:', e.message)
}
