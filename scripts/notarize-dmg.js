// electron-builder notarisiert nur die .app. Hier wird zusätzlich das DMG notarisiert und geheftet,
// damit auch `spctl -t install` und Browser-Downloads ohne Warnung durchgehen.
const { execFileSync } = require('node:child_process')

exports.default = async function notarizeDmg(context) {
  const { APPLE_ID, APPLE_APP_SPECIFIC_PASSWORD, APPLE_TEAM_ID } = process.env
  if (!APPLE_ID || !APPLE_APP_SPECIFIC_PASSWORD || !APPLE_TEAM_ID) {
    console.log('  • DMG-Notarisierung übersprungen (APPLE_* nicht gesetzt)')
    return []
  }
  for (const file of context.artifactPaths.filter((f) => f.endsWith('.dmg'))) {
    console.log(`  • notarisiere DMG ${file}`)
    execFileSync('xcrun', ['notarytool', 'submit', file, '--apple-id', APPLE_ID, '--password', APPLE_APP_SPECIFIC_PASSWORD, '--team-id', APPLE_TEAM_ID, '--wait'], { stdio: 'inherit' })
    execFileSync('xcrun', ['stapler', 'staple', file], { stdio: 'inherit' })
  }
  return []
}
