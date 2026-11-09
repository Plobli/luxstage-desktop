# Mac App Store – Eintrag LuxStage (macOS-Version)

Felder wie in App Store Connect (macOS-Version → Deutsch / Englisch). Entwurf, Zahlen und Aussagen vor dem Absenden prüfen.

## Deutsch

**Produktname:** LuxStage

**Untertitel (max. 30):**
Licht im Theater, im Team

**Werbetext (max. 170):**
Aufbau, Einleuchten und Kreise eines Stücks an einem Ort. Im Team, in Echtzeit.

**Beschreibung:**
Das Heft liegt irgendwo. Das Foto steht auf Seite 5, die Notiz dazu auf Seite 2. Und der Kollege hat noch die Version von letzter Woche.

LuxStage legt alles an einen Ort: Aufbauplan, Scheinwerferpositionen, Einleuchtnotizen, Fotos und Zeichnungen. Alles hängt an der Kreisnummer. Kreis wählen, und Notiz, Farbfolie, Fotos und Position sind da.

Aufbau
Gassentürme, Traversen und Zugstangen sind nicht nur beschrieben, sondern sichtbar. Jeder im Team hakt seinen Bereich ab. So weiß das ganze Haus, wie lange es noch dauert.

Einleuchten
Kreis auswählen, Scheinwerfer geht an. Die Notiz steht daneben, mit Farbfolie (Lee/Rosco), Foto und Position. Eigene Notizen kann jeder im Team ergänzen. Es gibt nur eine Version, und die ist aktuell.

Vom Pult holen
Nur in der Desktop-App: Kreise, Adressen und Geräte holst du direkt aus dem Eos-Pult. Keine Export-Datei, kein CSV. Du wählst, ob nur Neues ergänzt, zusammengeführt oder das Pult gespiegelt wird. Beim Zusammenführen bleiben deine Farben, Positionen, Notizen und Fotos erhalten. Gespiegelt wird nur nach Bestätigung.

LuxStage Desktop ist die Mac-App dafür. Eigenes Fenster, kein Browser-Tab, der sich irgendwo versteckt. Beim ersten Start gibst du den Namen deines Teams ein, zum Beispiel „mein-theater". Updates kommen automatisch über den Store.

LuxStage ist ein unabhängiges Produkt und steht in keiner Verbindung zu ETC.

**Leistungsmerkmale (je max. 200 Zeichen):**
- Aufbau, Notizen, Fotos und Zeichnungen an einem Ort statt im Heft
- Alles hängt an der Kreisnummer: Notiz, Farbfolie, Fotos, Position
- Patch direkt vom Eos-Pult holen, ohne Export-Datei. Eigene Notizen bleiben erhalten
- Gassentürme, Traversen und Zugstangen sichtbar statt nur beschrieben
- Team arbeitet in Echtzeit, jeder hakt seinen Bereich ab
- Nur eine aktuelle Version, keine alten Ausdrucke mehr
- Updates automatisch über den Mac App Store

**Neu in dieser Version:**
Erste Version im Mac App Store.

**Schlüsselwörter (max. 100 Zeichen gesamt):**
Beleuchtung,Theater,Einleuchten,Lichtpult,Eos,Patch,Bühnenlicht,Licht,Kreise,Aufbau

**Hinweise für die App-Prüfung (Pflicht, nicht öffentlich; Englisch eintragen):**
```
LuxStage is a professional lighting production tool for theater and live events. Production teams document rigs, set up and focus fixtures together, and import patch data from an ETC Eos lighting console. It is not a consumer app and is aimed at lighting professionals.

This is the Mac version of our iOS/iPadOS app (Universal Purchase, same bundle ID). It is a desktop app around our web app (Electron) with one addition: importing patch data from a console over the local network. The iOS-only "Remote" tab (live console control) is not part of the Mac app.

Why an account is required

Show data (documentation, drawings, photos, check-offs) is synchronized in real time between team members. This runs on the LuxStage cloud service, operated by the developer at https://luxstage.app. Each team has its own address: https://<teamname>.luxstage.app. On first launch, the start screen asks for the team name only (e.g. "app-store-review"). The app builds the address itself. Accounts can be deleted by the user in the app's settings (web app).

Demo access for review

Team name: app-store-review

1. Open the app.
2. On the start screen, enter the team name above and click "Verbinden" (Connect).
3. Sign in with the username and password below.

Username: [USER]
Password: [PASSWORD]

Alternatively, "Demo ansehen" (View demo) on the start screen opens a demo show without an account (requires internet).

The app is free. There is no paywall and no in-app purchase.

Features overview

Shows
After login, the user sees a list of shows (productions). Click a show to open it.

Inside a show
- Aufbau (Setup): documentation of rig and positions, checklists, photos, drawing
- Einleuchten (Focus): channel list with notes, gel colour, photos and position; fixtures are checked off when focused, all team members see the status live
- Suche (Search): search across the whole show

Console import (optional, Mac app only)

The app can import channels, addresses, fixtures and groups from an ETC Eos console. The user enters the console's IP address; the app connects via OSC over TCP (port 3037) and reads the data. It only sends read requests and does not control the console or change anything on it. The user chooses whether to add only new items, merge, or mirror the console. This needs an Eos console (or the Eos offline editor) on the same network and cannot be tested without one. All other features work without it.

Permissions and sandbox

- App Sandbox is enabled.
- Entitlement com.apple.security.network.client: HTTPS to the LuxStage cloud service, and OSC/TCP to a console on the local network.
- Entitlement com.apple.security.files.user-selected.read-write: photos are attached through the system file dialog (only files the user selects).
- The app does not access the camera, microphone, contacts or location.

Network
The app uses HTTPS to the LuxStage cloud service. Links to external sites open in the default browser. The only other connection is the user-initiated console import (TCP) on the local network.

Without internet or account
Already loaded shows are cached and shown read-only when offline.
Without a team login, only the start screen and the demo are available.

Technical notes

- No analytics, no tracking, no third-party SDKs, no advertising
- Updates are delivered through the Mac App Store (the built-in updater is disabled in this build)
- Encryption export compliance: ITSAppUsesNonExemptEncryption = false
- Universal binary (Apple silicon and Intel)
- Supports macOS [VERSION]+
```

## English

**Product name:** LuxStage

**Subtitle (max. 30):**
Stage lighting, as a team

**Promotional text (max. 170):**
Rig, focus and circuits of a production in one place. Shared with your team in real time.

**Description:**
The binder is somewhere. The photo is on page 5, the note for it on page 2. And your colleague still has last week's version.

LuxStage puts everything in one place: rigging plan, fixture positions, focus notes, photos and drawings. Everything hangs on the circuit number. Pick a circuit and the note, gel, photos and position are right there.

Rigging
Booms, trusses and bars are not just described, you can see them. Everyone on the team ticks off their area, so the whole house knows how long it will take.

Focusing
Pick a circuit and the light comes on. The note sits next to it, with gel (Lee/Rosco), photo and position. Everyone on the team can add their own notes. There is only one version, and it is current.

Pull from the console
Desktop app only: fetch circuits, addresses and fixtures straight from the Eos console. No export file, no CSV. Choose whether to add only new items, merge, or mirror the console. Merging keeps your colours, positions, notes and photos. Mirroring only happens after confirmation.

LuxStage Desktop is the Mac app for it. Its own window, no browser tab lost somewhere. On first launch you enter your team name, for example "my-theatre". Updates arrive automatically through the Store.

LuxStage is an independent product and is not affiliated with ETC.

**Features:**
- Rigging, notes, photos and drawings in one place instead of a binder
- Everything hangs on the circuit number: note, gel, photos, position
- Pull the patch straight from the Eos console, no export file. Your own notes are kept
- Booms, trusses and bars visible instead of just described
- Team works in real time, everyone ticks off their area
- One current version, no outdated printouts
- Updates automatic through the Mac App Store

**What's new:**
First version in the Mac App Store.

**Keywords (max. 100 chars total):**
lighting,theatre,focusing,console,Eos,patch,stage,rigging,circuits,team

## Weitere Pflichtangaben

- **Kategorie:** Produktivität (Alternative: Unternehmen)
- **Datenschutz-URL:** `[URL eintragen, Pflicht wegen Login/Konto]`
- **Support-URL / Website:** https://luxstage.app
- **Altersfreigabe:** Fragebogen ohne Gewalt/Glücksspiel/Chat mit Fremden ausfüllen, ergibt „Ab 3". Teamfunktionen mit Nutzerinhalten ehrlich angeben.
- **Preis:** kostenlos (Konto-Abo läuft über LuxStage, nicht über den Store)
- **Screenshots (min. 1, besser 4):** 1366×768 oder größer, PNG. Vorschlag: Kreis mit Notiz + Foto, Aufbauplan/Zeichnung, Team-Abhaken, Fenster mit Team-Login.
