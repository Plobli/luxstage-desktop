// Fehlerüberwachung (Sentry) für den Hauptprozess. Nur in der gepackten App.
// Die DSN darf im Client stehen (sie erlaubt nur das Senden). Datenschutz: keine Nutzer, IP, Pfade, Hostname.
const { app } = require('electron')

const DSN = 'https://b2dd83442720ec0aa80e8a1fcb141764@o4512445879615488.ingest.de.sentry.io/4512446224007248'

if (app.isPackaged) {
  const Sentry = require('@sentry/electron/main')
  Sentry.init({
    dsn: DSN,
    release: `luxstage-desktop@${app.getVersion()}`,
    environment: 'production',
    sendDefaultPii: false,
    tracesSampleRate: 0,
    beforeSend(event) {
      delete event.user
      delete event.server_name
      if (event.request) delete event.request
      return event
    },
  })
}
