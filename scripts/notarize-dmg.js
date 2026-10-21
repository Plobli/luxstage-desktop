// electron-builder notarisiert nur die .app. Hier wird zusätzlich das DMG notarisiert und geheftet,
// damit auch `spctl -t install` und Browser-Downloads ohne Warnung durchgehen.
// Zugangsdaten kommen aus dem Schlüsselbund-Profil (einmalig: `xcrun notarytool store-credentials`),
// nicht über Kommandozeilen-Argumente, damit kein Passwort in der Prozessliste auftaucht.
const { execFileSync } = require('node:child_process')

const PROFILE = process.env.NOTARY_PROFILE || 'luxstage-notary'

exports.default = async function notarizeDmg(context) {
  if (!process.env.APPLE_ID) {
    console.log('  • DMG-Notarisierung übersprungen (Notarisierung nicht aktiv)')
    return []
  }
  for (const file of context.artifactPaths.filter((f) => f.endsWith('.dmg'))) {
    console.log(`  • notarisiere DMG ${file} (Profil „${PROFILE}“)`)
    try {
      execFileSync('xcrun', ['notarytool', 'submit', file, '--keychain-profile', PROFILE, '--wait'], { stdio: 'inherit' })
    } catch {
      throw new Error(`DMG-Notarisierung fehlgeschlagen. Profil „${PROFILE}“ angelegt? xcrun notarytool store-credentials "${PROFILE}" --apple-id … --team-id …`)
    }
    execFileSync('xcrun', ['stapler', 'staple', file], { stdio: 'inherit' })
  }
  return []
}
