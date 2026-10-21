// Nur Entwicklung: Menüleiste, Dock und Über-Fenster zeigen sonst „Electron“.
// Gebaute Apps (electron-builder) bringen Name und Icon selbst mit.
if (process.platform !== 'darwin') process.exit(0)
const { execFileSync } = require('node:child_process')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')

try {
  const contents = path.join(require.resolve('electron'), '..', 'dist', 'Electron.app', 'Contents')
  for (const key of ['CFBundleName', 'CFBundleDisplayName']) {
    execFileSync('/usr/bin/plutil', ['-replace', key, '-string', 'LuxStage', path.join(contents, 'Info.plist')])
  }

  const png = path.join(__dirname, '..', 'src', 'icon.png')
  const target = path.join(contents, 'Resources', 'electron.icns')
  const marker = path.join(contents, 'Resources', '.luxstage-icon')
  const stamp = String(fs.statSync(png).mtimeMs)
  if (!fs.existsSync(marker) || fs.readFileSync(marker, 'utf8') !== stamp) {
    const set = fs.mkdtempSync(path.join(os.tmpdir(), 'lux-')) + '/icon.iconset'
    fs.mkdirSync(set)
    for (const size of [16, 32, 128, 256, 512]) {
      execFileSync('/usr/bin/sips', ['-z', size, size, png, '--out', `${set}/icon_${size}x${size}.png`], { stdio: 'ignore' })
      execFileSync('/usr/bin/sips', ['-z', size * 2, size * 2, png, '--out', `${set}/icon_${size}x${size}@2x.png`], { stdio: 'ignore' })
    }
    execFileSync('/usr/bin/iconutil', ['-c', 'icns', set, '-o', target])
    fs.writeFileSync(marker, stamp)
  }
} catch (e) {
  console.warn('dev-name:', e.message)
}
