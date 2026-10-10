# 📡 Stream Server Bitrate Overlay

[![GitHub License](https://img.shields.io/github/license/AlexanderWagnerDev/stream-server-bitrate?style=flat-square)](https://github.com/AlexanderWagnerDev/stream-server-bitrate/blob/main/LICENSE)
[![HTML](https://img.shields.io/badge/HTML-orange?style=flat-square&logo=html5&logoColor=white)](bitrate.html)

A lightweight, transparent HTML overlay that displays live bitrate and RTT with color-coded status — compatible with SRT-Live-Server, OpenIRL SRT/SRTLA, **OpenRTMP**, Node-Media-Server, and nginx-rtmp. Supports multiple servers with automatic fallback. The original single-file OBS overlay remains the primary feature; designs, charts and the optional generator extend it.

---

## ✨ Features

- 🟢 **Color-coded status** — green / orange / red for both bitrate and RTT
- 📡 **Multi-server support** — define multiple servers, the first responding one is used
- 🔄 **Automatic fallback** — if the primary server is unavailable, the next is tried
- 🎛️ **Five server types supported:** SRT-Live-Server, OpenIRL SRT/SRTLA, **OpenRTMP**, Node-Media-Server (NMS), nginx-rtmp
- 🎨 **Optional designs & widgets** — 12 visual presets, customizable labels/layouts, optional bitrate and RTT graphs
- 🛠️ **Optional visual generator** — convenient browser-based editor; not required to use the HTML overlay
- 🪟 **Transparent background** — designed for OBS browser source overlays
- ⚙️ **No dependencies** — single HTML file, no build tools required

---

## 📊 Color Thresholds

### Bitrate

| Color  | Condition           |
|--------|---------------------|
| 🟢 Green  | > 2500 kb/s      |
| 🟠 Orange | 1200 – 2500 kb/s |
| 🔴 Red    | ≤ 1200 kb/s      |

### RTT

| Color  | Condition      |
|--------|----------------|
| 🟢 Green  | < 120 ms    |
| 🟠 Orange | 120 – 250 ms|
| 🔴 Red    | ≥ 250 ms    |

---

## ⚙️ Configuration

Open `bitrate.html` and edit the `servers` array near the top of the `<script>` section:

```js
const interval = 2000; // polling interval in ms

const servers = [
  // SRT-Live-Server (SLS)
  { type: "SRT",     page: "http://127.0.0.1:8181/stats",    publisher: "publish/live/test", show_rtt: true },

  // Modern OpenIRL SLS stats, both regular SRT and SRTLA; key = player ID
  // { type: "OpenIRL", page: "http://127.0.0.1:8080/stats", key: "live", show_rtt: true,
  //   peer_display: "details", max_peers: 4 },

  // OpenRTMP public per-stream stats; key = stats_key, NOT an admin API token
  // { type: "OpenRTMP", page: "http://127.0.0.1:8081/stats", key: "sts_your_stats_key", show_rtt: true },

  // Node-Media-Server
  // { type: "NMS",     page: "http://localhost:8000/api/streams/live/feed1" },
  // { type: "NMS",     page: "http://admin:admin@localhost:8000/api/streams/live/feed1" },

  // nginx-rtmp
  // { type: "NGINX",   page: "http://localhost/stat",        key: "live" },
];
```

### Server Types

| Type       | Description                                           | Required fields     |
|------------|-------------------------------------------------------|---------------------|
| `SRT`      | SRT-Live-Server `/stats` JSON endpoint                | `page`, `publisher` |
| `OpenIRL`  | Modern OpenIRL SLS `/stats/<player_id>` for SRT & SRTLA | `page`, `key` | 
| `OpenRTMP` | Public OpenRTMP `/stats?key=<stats_key>` JSON           | `page`, `key` |
| `NMS`      | Node-Media-Server REST API                            | `page`              |
| `NGINX`    | nginx-rtmp `/stat` XML endpoint                       | `page`, `key`       |

### Options per Server Entry

| Option       | Type    | Description                                                  |
|--------------|---------|--------------------------------------------------------------|
| `type`       | string  | Server type: `"SRT"`, `"OpenIRL"`, `"OpenRTMP"`, `"NMS"`, `"NGINX"` |
| `page`       | string  | Base URL of the stats endpoint                               |
| `publisher`  | string  | Stream key path (SRT only)                                   |
| `key`        | string  | OpenIRL player ID, OpenRTMP stats key or NGINX application name |
| `show_rtt`   | boolean | Show RTT when the selected stats source supplies it        |
| `show_label` | boolean | Show a small server-type badge next to the value             |
| `label`      | string  | Optional custom server label                                |
| `show_throughput` | boolean | OpenIRL: display network throughput when available |
| `peer_display` | string | OpenIRL SRTLA: `"off"`, `"count"` or `"details"` |
| `max_peers` | number | Maximum OpenIRL SRTLA peer rows                              |

---

## 🎨 Optional designs, graphs & custom labels

The **default `bitrate.html` stays transparent and uses the original compact layout**. All enhancements are optional and work directly in the single HTML file:

- **12 presets:** `classic`, `minimal`, `pill`, `card`, `glass`, `neon`, `broadcast`, `terminal`, `outline`, `scoreboard`, `gradient`, `ticker`.
- **Six layouts:** vertical, horizontal, compact, grid, split, dashboard.
- Optional live bitrate/RTT history graphs, bitrate bar, stream status, uptime and OpenIRL SRTLA link count/bitrate/jitter when supplied by the server.
- Customize label and status text, graph titles, link/jitter text, units, colors, fonts and spacing. Set a label to an empty string to hide it. The `display.labels` object owns these visible strings; the `display` object controls widgets and order.
- See the [12-design comparison image](docs/theme-previews.svg) or open the [interactive theme gallery](examples/themes.html) locally.

The bitrate color thresholds are based on kb/s even when the number is displayed in Mb/s. RTT color thresholds use milliseconds. Peer jitter is a separate metric, not per-peer RTT, and the server's aggregate SRTLA bitrate is never calculated by summing peers.

### Optional visual generator (not needed for normal use)

Want to avoid editing HTML manually? Open [`index.html`](index.html) over a local HTTP server (for example `python3 -m http.server 8000`) or via GitHub Pages **after it has been enabled and deployed**. The optional generator offers live sample previews, all text-label settings, status thresholds, widgets, themes, server fallback, JSON configuration import/export, and a ready-to-use `bitrate.html` download. Generated files and JSON may contain stats keys and should not be uploaded publicly.

GitHub Pages needs Settings → Pages → Source: **GitHub Actions**, followed by a successful deployment. The generator is a convenience, not a runtime dependency.

### CORS note

OBS Browser Sources enforce browser security rules. OpenIRL SLS supplies a permissive CORS header for stats, but OpenRTMP's current public stats endpoint does not; cross-origin or `file://` OBS usage may require a same-origin proxy or an explicit CORS response for `/stats`. Do not disable browser security to work around this. Use HTTPS stats when the overlay is hosted over HTTPS.

---

## 🖥️ OBS Setup

1. In OBS, add a **Browser Source**
2. Check **Local file** and point to `bitrate.html`
3. Set width/height to fit your overlay layout (e.g. 300 × 80)
4. Enable **Shutdown source when not visible** for best performance

---

## 📄 License

See [LICENSE](LICENSE) for details.

Based on [b3ck/server-bitrate-html](https://github.com/b3ck/server-bitrate-html).

---

# 📡 Stream Server Bitrate Overlay (Deutsch)

Ein schlankes, **standardmäßig transparentes** HTML-Overlay, das Live-Bitrate und RTT farbkodiert anzeigt — kompatibel mit SRT-Live-Server, OpenIRL SRT/SRTLA, **OpenRTMP**, Node-Media-Server und nginx-rtmp. Mehrere Server mit automatischem Fallback. Das ursprüngliche Overlay bleibt das Hauptfeature; Designs, Graphen und Generator sind optionale Erweiterungen.

---

## ✨ Features

- 🟢 **Farbkodierter Status** — Grün / Orange / Rot für Bitrate und RTT
- 📡 **Multi-Server-Unterstützung** — mehrere Server eintragen, der erste antwortende wird verwendet
- 🔄 **Automatischer Fallback** — bei Ausfall des primären Servers wird der nächste versucht
- 🎛️ **Fünf Server-Typen unterstützt:** SRT-Live-Server, OpenIRL SRT/SRTLA, **OpenRTMP**, Node-Media-Server (NMS), nginx-rtmp
- 🎨 **Optionale Designs & Widgets** — 12 Presets, einstellbare Texte/Layouts und Bitrate-/RTT-Verlaufsgrafen
- 🛠️ **Optionaler Generator** — erleichtert die Konfiguration, ist aber nicht erforderlich
- 🪟 **Transparenter Hintergrund** — für OBS Browser-Source-Overlays konzipiert
- ⚙️ **Keine Abhängigkeiten** — einzelne HTML-Datei, kein Build-Tool nötig

---

## 📊 Farb-Schwellenwerte

### Bitrate

| Farbe  | Bedingung           |
|--------|---------------------|
| 🟢 Grün   | > 2500 kb/s      |
| 🟠 Orange | 1200 – 2500 kb/s |
| 🔴 Rot    | ≤ 1200 kb/s      |

### RTT

| Farbe  | Bedingung      |
|--------|----------------|
| 🟢 Grün   | < 120 ms    |
| 🟠 Orange | 120 – 250 ms|
| 🔴 Rot    | ≥ 250 ms    |

---

## ⚙️ Konfiguration

`bitrate.html` öffnen und das `servers`-Array im `<script>`-Bereich anpassen:

```js
const interval = 2000; // Abfrageintervall in ms

const servers = [
  // SRT-Live-Server (SLS)
  { type: "SRT",     page: "http://127.0.0.1:8181/stats",    publisher: "publish/live/test", show_rtt: true },

  // Modernes OpenIRL SLS für SRT und SRTLA; key = Player-ID
  // { type: "OpenIRL", page: "http://127.0.0.1:8080/stats", key: "live", show_rtt: true,
  //   peer_display: "details", max_peers: 4 },

  // OpenRTMP öffentliche Stats; key = Stats-Key, KEIN Admin-API-Token
  // { type: "OpenRTMP", page: "http://127.0.0.1:8081/stats", key: "sts_your_stats_key", show_rtt: true },

  // Node-Media-Server
  // { type: "NMS",     page: "http://localhost:8000/api/streams/live/feed1" },

  // nginx-rtmp
  // { type: "NGINX",   page: "http://localhost/stat",        key: "live" },
];
```

### Server-Typen

| Typ        | Beschreibung                                              | Pflichtfelder       |
|------------|-----------------------------------------------------------|---------------------|
| `SRT`      | SRT-Live-Server `/stats` JSON-Endpoint                    | `page`, `publisher` |
| `OpenIRL`  | Modernes OpenIRL SLS `/stats/<player_id>` für SRT/SRTLA | `page`, `key` |
| `OpenRTMP` | Öffentliche OpenRTMP-Stats `/stats?key=<stats_key>`     | `page`, `key` |
| `NMS`      | Node-Media-Server REST API                                | `page`              |
| `NGINX`    | nginx-rtmp `/stat` XML-Endpoint                           | `page`, `key`       |

---

## 🎨 Optionale Designs, Graphen & frei änderbare Texte

Die ursprüngliche `bitrate.html` bleibt **im Standard transparent**, kompakt und ohne zusätzliche Bibliotheken nutzbar. Optional gibt es zwölf Designs (`classic`, `minimal`, `pill`, `card`, `glass`, `neon`, `broadcast`, `terminal`, `outline`, `scoreboard`, `gradient`, `ticker`), sechs Layouts und einzeln aktivierbare Widgets.

Bitrate- und RTT-Verlauf, Balken, Uptime, Status sowie SRTLA-Linkinformationen lassen sich ein-/ausblenden. **Alle sichtbaren Beschriftungen** – inklusive Einheiten, Jitter, Link-Texte, Diagrammtitel und Offline-/Online-Texte – sind über `display.labels` veränderbar. Ein leeres Label blendet den Text aus. [Designvergleich](docs/theme-previews.svg) · [Interaktive Vorschau](examples/themes.html).

### Optionaler Generator für einfachere Einstellungen

Wer die HTML-Datei nicht selbst bearbeiten möchte, nutzt den [Generator](index.html) lokal über einen HTTP-Server (z. B. `python3 -m http.server 8000`) oder später über GitHub Pages. Einstellungen können importiert, exportiert und als eigenständige `bitrate.html` für OBS heruntergeladen werden. Das **Overlay selbst braucht den Generator nicht**. Stats-Keys in exportierten HTML-/JSON-Dateien vertraulich behandeln.

**Browser/CORS:** OpenRTMP liefert am aktuellen öffentlichen Stats-Endpunkt nicht automatisch den erforderlichen CORS-Header für browserbasierte Cross-Origin-Abfragen. Bei OBS kann ein Reverse Proxy bzw. passende CORS-Konfiguration notwendig sein. Die Browsersicherheit nicht deaktivieren.

---

## 🖥️ OBS-Setup

1. In OBS eine **Browser-Quelle** hinzufügen
2. **Lokale Datei** aktivieren und `bitrate.html` auswählen
3. Breite/Höhe an das Overlay-Layout anpassen (z. B. 300 × 80)
4. **Quelle deaktivieren, wenn nicht sichtbar** für beste Performance aktivieren

---

## 📄 Lizenz

Details siehe [LICENSE](LICENSE).

Basiert auf [b3ck/server-bitrate-html](https://github.com/b3ck/server-bitrate-html).
