// Nur Entwicklung: startet Electron. Auf dem Mac über einen Link namens „LuxStage“,
// damit Dock-Tooltip und Aktivitätsanzeige nicht „Electron“ zeigen.
const { spawn } = require('node:child_process')
const fs = require('node:fs')
const path = require('node:path')

let bin = require('electron')
if (process.platform === 'darwin') {
  const link = path.join(path.dirname(bin), 'LuxStage')
  try {
    if (!fs.existsSync(link)) fs.symlinkSync(path.basename(bin), link)
    bin = link
  } catch { /* Fallback: Standardprogramm */ }
}
const child = spawn(bin, ['.', ...process.argv.slice(2)], { stdio: 'inherit', cwd: path.join(__dirname, '..') })
child.on('exit', (code) => process.exit(code ?? 0))
