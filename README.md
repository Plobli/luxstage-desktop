# LuxStage Desktop

Electron-Hülle um die Web-App (Mac, Windows). Träger für den Pult-Sync (OSC über TCP 3037 im Hauptprozess: `src/osc.js`, `src/eos-sync.js`; Brücke `window.luxstageDesktop.eos`). Tests: `npm test`.

- `npm install`, dann `npm start`
- Erster Start: Team-Name (`mein-theater` -> https://mein-theater.luxstage.app) oder volle URL (z. B. http://localhost:5173)
- Build: `npm run dist:mac` / `npm run dist:win`

- Icon: `build/icon.png` (1024 px); electron-builder erzeugt daraus .icns/.ico
- CI: `.github/workflows/build.yml` baut bei Tag `v*` Mac (signiert + notarisiert) und Windows (unsigniert) und veröffentlicht das Release; manueller Lauf baut nur Artefakte. Mac-Secrets: `CSC_LINK`, `CSC_KEY_PASSWORD`, `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`, `APPLE_TEAM_ID`.
