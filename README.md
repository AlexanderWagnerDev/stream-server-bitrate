# 📡 Stream Server Bitrate Overlay

[![GitHub License](https://img.shields.io/github/license/AlexanderWagnerDev/stream-server-bitrate?style=flat-square)](https://github.com/AlexanderWagnerDev/stream-server-bitrate/blob/main/LICENSE)
[![HTML](https://img.shields.io/badge/HTML-orange?style=flat-square&logo=html5&logoColor=white)](bitrate.html)

A lightweight, transparent HTML overlay that displays live bitrate and RTT with color-coded status — compatible with SRT-Live-Server, OpenIRL SRT/SRTLA, **OpenRTMP**, RIST, Node-Media-Server, and nginx-rtmp. Supports multiple servers with automatic fallback. The single-file OBS overlay remains the main feature; additional designs and charts are optional.

---

## ✨ Features

- 🟢 **Color-coded status** — green / orange / red for both bitrate and RTT
- 📡 **Multi-server support** — define multiple servers, the first responding one is used
- 🔄 **Automatic fallback** — if the primary server is unavailable, the next is tried
- 🎛️ **Six server types supported:** SRT-Live-Server, OpenIRL SRT/SRTLA, **OpenRTMP**, RIST, Node-Media-Server (NMS), nginx-rtmp
- 🎨 **Optional designs & widgets** — 12 visual presets, customizable labels/layouts, optional bitrate and RTT graphs
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
  // { type: "OpenIRL", page: "http://127.0.0.1:8080/stats", key: "play_60a0055a7fdb436d92fab3a943f5c55c", show_rtt: true,
  //   peer_display: "details", max_peers: 4 },

  // OpenRTMP public per-stream stats; key = stats_key, NOT an admin API token
  // { type: "OpenRTMP", page: "http://127.0.0.1:8081/stats", key: "sts_your_stats_key", show_rtt: true },

  // RIST stats (moo-the-cow hosting): native = ws://127.0.0.1:8081
  // Docker Compose publishes the stats WebSocket on port 8683
  // { type: "RIST", page: "ws://127.0.0.1:8683", show_rtt: true,
  //   peer_display: "details", max_peers: 4 },

  // RIST StatsServer (moo-the-cow): nativ 8081, Docker 8683 (WebSocket)
  // { type: "RIST", page: "ws://127.0.0.1:8683", show_rtt: true,
  //   peer_display: "details", max_peers: 4 },

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
| `RIST`     | moo RIST StatsServer WebSocket; native 8081 / Docker 8683 | `page` |
| `NMS`      | Node-Media-Server REST API                            | `page`              |
| `NGINX`    | nginx-rtmp `/stat` XML endpoint                       | `page`, `key`       |

### Options per Server Entry

| Option       | Type    | Description                                                  |
|--------------|---------|--------------------------------------------------------------|
| `type`       | string  | Server type: `"SRT"`, `"OpenIRL"`, `"OpenRTMP"`, `"RIST"`, `"NMS"`, `"NGINX"` |
| `page`       | string  | Base URL of the stats endpoint                               |
| `publisher`  | string  | Stream key path (SRT only)                                   |
| `key`        | string  | OpenIRL player ID, OpenRTMP stats key or NGINX application name |
| `show_rtt`   | boolean | Show RTT when the selected stats source supplies it        |
| `show_label` | boolean | Show a small server-type badge next to the value             |
| `label`      | string  | Optional custom server label                                |
| `show_throughput` | boolean | OpenIRL: display network throughput when available |
| `peer_display` | string | OpenIRL SRTLA / RIST: `"off"`, `"count"` or `"details"` |
| `max_peers` | number | Maximum SRTLA / RIST peer rows                              |

---

## 🎨 Optional designs, graphs & custom labels

The **default `bitrate.html` stays transparent and uses the original compact layout**. All enhancements are optional and work directly in the single HTML file:

- **12 presets:** `classic`, `minimal`, `pill`, `card`, `glass`, `neon`, `broadcast`, `terminal`, `outline`, `scoreboard`, `gradient`, `ticker`.
- **Six layouts:** vertical, horizontal, compact, grid, split, dashboard.
- Optional live bitrate/RTT history graphs, bitrate bar, stream status, uptime and per-link SRTLA / RIST statistics when supplied by the server.
- Customize label and status text, graph titles, link/jitter text, units, colors, fonts and spacing. Set a label to an empty string to hide it. The `display.labels` object owns these visible strings; the `display` object controls widgets and order.
- See the [12-design comparison image](docs/theme-previews.svg) or open the [interactive theme gallery](examples/themes.html) locally.

The bitrate color thresholds are based on kb/s even when the number is displayed in Mb/s. RTT color thresholds use milliseconds. Peer jitter is a separate metric, not per-peer RTT. OpenIRL reports an aggregate SRTLA bitrate; RIST receiver stats instead provide per-peer bitrate in bit/s, which the adapter sums across active peers and converts to kb/s. RIST RTT is averaged over active peers.


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

Ein schlankes, **standardmäßig transparentes** HTML-Overlay, das Live-Bitrate und RTT farbkodiert anzeigt — kompatibel mit SRT-Live-Server, OpenIRL SRT/SRTLA, **OpenRTMP**, RIST, Node-Media-Server und nginx-rtmp. Mehrere Server mit automatischem Fallback. Das ursprüngliche Overlay bleibt das Hauptfeature; Designs und Graphen sind optionale Erweiterungen.

---

## ✨ Features

- 🟢 **Farbkodierter Status** — Grün / Orange / Rot für Bitrate und RTT
- 📡 **Multi-Server-Unterstützung** — mehrere Server eintragen, der erste antwortende wird verwendet
- 🔄 **Automatischer Fallback** — bei Ausfall des primären Servers wird der nächste versucht
- 🎛️ **Sechs Server-Typen unterstützt:** SRT-Live-Server, OpenIRL SRT/SRTLA, **OpenRTMP**, RIST, Node-Media-Server (NMS), nginx-rtmp
- 🎨 **Optionale Designs & Widgets** — 12 Presets, einstellbare Texte/Layouts und Bitrate-/RTT-Verlaufsgrafen
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
  // { type: "OpenIRL", page: "http://127.0.0.1:8080/stats", key: "play_60a0055a7fdb436d92fab3a943f5c55c", show_rtt: true,
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
| `RIST`     | moo RIST StatsServer WebSocket (nativ 8081 / Docker 8683) | `page` |
| `NMS`      | Node-Media-Server REST API                                | `page`              |
| `NGINX`    | nginx-rtmp `/stat` XML-Endpoint                           | `page`, `key`       |

---

## 🎨 Optionale Designs, Graphen & frei änderbare Texte

Die ursprüngliche `bitrate.html` bleibt **im Standard transparent**, kompakt und ohne zusätzliche Bibliotheken nutzbar. Optional gibt es zwölf Designs (`classic`, `minimal`, `pill`, `card`, `glass`, `neon`, `broadcast`, `terminal`, `outline`, `scoreboard`, `gradient`, `ticker`), sechs Layouts und einzeln aktivierbare Widgets.

Bitrate- und RTT-Verlauf, Balken, Uptime, Status sowie SRTLA-/RIST-Linkinformationen lassen sich ein-/ausblenden. **Alle sichtbaren Beschriftungen** – inklusive Einheiten, Jitter, Link-Texte, Diagrammtitel und Offline-/Online-Texte – sind über `display.labels` veränderbar. Ein leeres Label blendet den Text aus. [Designvergleich](docs/theme-previews.svg) · [Interaktive Vorschau](examples/themes.html).


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
