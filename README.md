# 📡 Stream Server Bitrate Overlay

[![GitHub License](https://img.shields.io/github/license/AlexanderWagnerDev/stream-server-bitrate?style=flat-square)](https://github.com/AlexanderWagnerDev/stream-server-bitrate/blob/main/LICENSE)
[![HTML](https://img.shields.io/badge/HTML-orange?style=flat-square&logo=html5&logoColor=white)](colorBitrate.html)

A lightweight, transparent HTML overlay that displays live bitrate and RTT with color-coded status — compatible with SRT-Live-Server, OpenIRL SRT, Node-Media-Server, and nginx-rtmp. Supports multiple servers with automatic fallback.

---

## ✨ Features

- 🟢 **Color-coded status** — green / orange / red for both bitrate and RTT
- 📡 **Multi-server support** — define multiple servers, the first responding one is used
- 🔄 **Automatic fallback** — if the primary server is unavailable, the next is tried
- 🎛️ **Four server types supported:** SRT-Live-Server, OpenIRL SRT, Node-Media-Server (NMS), nginx-rtmp
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

Open `colorBitrate.html` and edit the `servers` array near the top of the `<script>` section:

```js
const interval = 2000; // polling interval in ms

const servers = [
  // SRT-Live-Server (SLS)
  { type: "SRT",     page: "http://127.0.0.1:8181/stats", publisher: "publish/live/test", show_rtt: true },

  // OpenIRL SRT server (slightly different JSON structure)
  // { type: "OPENIRL", page: "http://127.0.0.1:8181/stats", publisher: "publish/live/test", show_rtt: true },

  // Node-Media-Server
  // { type: "NMS",     page: "http://localhost:8000/api/streams/live/feed1" },
  // { type: "NMS",     page: "http://admin:admin@localhost:8000/api/streams/live/feed1" },

  // nginx-rtmp
  // { type: "NGINX",   page: "http://localhost/stat", key: "live" },
];
```

### Server Types

| Type      | Description                                      | Required fields              |
|-----------|--------------------------------------------------|------------------------------|
| `SRT`     | SRT-Live-Server `/stats` JSON endpoint           | `page`, `publisher`          |
| `OPENIRL` | OpenIRL SRT server stats (different JSON layout) | `page`, `publisher`          |
| `NMS`     | Node-Media-Server REST API                       | `page`                       |
| `NGINX`   | nginx-rtmp `/stat` XML endpoint                  | `page`, `key`                |

### Options per Server Entry

| Option       | Type    | Description                                               |
|--------------|---------|-----------------------------------------------------------|
| `type`       | string  | Server type: `"SRT"`, `"OPENIRL"`, `"NMS"`, `"NGINX"`    |
| `page`       | string  | Full URL of the stats endpoint                            |
| `publisher`  | string  | Stream key path (SRT / OpenIRL only)                      |
| `key`        | string  | XML tag name (NGINX only)                                 |
| `show_rtt`   | boolean | Show RTT row below bitrate (SRT / OpenIRL only)           |
| `show_label` | boolean | Show a small server-type badge next to the value          |

---

## 🖥️ OBS Setup

1. In OBS, add a **Browser Source**
2. Check **Local file** and point to `colorBitrate.html`
3. Set width/height to fit your overlay layout (e.g. 300 × 80)
4. Enable **Shutdown source when not visible** for best performance

---

## 📄 License

See [LICENSE](LICENSE) for details.

Based on [b3ck/server-bitrate-html](https://github.com/b3ck/server-bitrate-html).

---

# 📡 Stream Server Bitrate Overlay (Deutsch)

Ein schlankes, transparentes HTML-Overlay, das Live-Bitrate und RTT farbkodiert anzeigt — kompatibel mit SRT-Live-Server, OpenIRL SRT, Node-Media-Server und nginx-rtmp. Unterstützt mehrere Server mit automatischem Fallback.

---

## ✨ Features

- 🟢 **Farbkodierter Status** — Grün / Orange / Rot für Bitrate und RTT
- 📡 **Multi-Server-Unterstützung** — mehrere Server eintragen, der erste antwortende wird verwendet
- 🔄 **Automatischer Fallback** — bei Ausfall des primären Servers wird der nächste versucht
- 🎛️ **Vier Server-Typen unterstützt:** SRT-Live-Server, OpenIRL SRT, Node-Media-Server (NMS), nginx-rtmp
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

`colorBitrate.html` öffnen und das `servers`-Array im `<script>`-Bereich anpassen:

```js
const interval = 2000; // Abfrageintervall in ms

const servers = [
  // SRT-Live-Server (SLS)
  { type: "SRT",     page: "http://127.0.0.1:8181/stats", publisher: "publish/live/test", show_rtt: true },

  // OpenIRL SRT-Server (leicht anderes JSON-Format)
  // { type: "OPENIRL", page: "http://127.0.0.1:8181/stats", publisher: "publish/live/test", show_rtt: true },

  // Node-Media-Server
  // { type: "NMS",     page: "http://localhost:8000/api/streams/live/feed1" },

  // nginx-rtmp
  // { type: "NGINX",   page: "http://localhost/stat", key: "live" },
];
```

### Server-Typen

| Typ       | Beschreibung                                             | Pflichtfelder                |
|-----------|----------------------------------------------------------|------------------------------|
| `SRT`     | SRT-Live-Server `/stats` JSON-Endpoint                   | `page`, `publisher`          |
| `OPENIRL` | OpenIRL SRT-Server Stats (anderes JSON-Layout)           | `page`, `publisher`          |
| `NMS`     | Node-Media-Server REST API                               | `page`                       |
| `NGINX`   | nginx-rtmp `/stat` XML-Endpoint                          | `page`, `key`                |

---

## 🖥️ OBS-Setup

1. In OBS eine **Browser-Quelle** hinzufügen
2. **Lokale Datei** aktivieren und `colorBitrate.html` auswählen
3. Breite/Höhe an das Overlay-Layout anpassen (z. B. 300 × 80)
4. **Quelle deaktivieren, wenn nicht sichtbar** für beste Performance aktivieren

---

## 📄 Lizenz

Details siehe [LICENSE](LICENSE).

Basiert auf [b3ck/server-bitrate-html](https://github.com/b3ck/server-bitrate-html).
