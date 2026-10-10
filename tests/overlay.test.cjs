'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const html = fs.readFileSync(path.join(__dirname, '..', 'bitrate.html'), 'utf8');
const match = html.match(/<script>([\s\S]*?)<\/script>/);
const script = match?.[1] ?? '';
test('overlay HTML contains a JavaScript block', () => {
  assert.ok(match, 'overlay has a JavaScript block');
});

class Element {
  constructor() {
    this.children = [];
    this.className = '';
    this.style = {};
    this.textContent = '';
    this.attributes = {};
  }

  appendChild(child) {
    this.children.push(child);
  }

  append(...children) {
    this.children.push(...children);
  }

  setAttribute(name, value) {
    this.attributes[name] = value;
  }

  replaceChildren(...children) {
    this.children = children;
  }
}

function createHarness(href = 'http://localhost/overlay.html', embedded = null) {
  const overlay = new Element();
  const urls = [];
  let result = { ok: false };
  let bodyTimeoutActive = false;
  const sockets = [];
  class FakeWebSocket {
    constructor(url) {
      this.url = url;
      this.readyState = 0;
      sockets.push(this);
    }

    emit(value) {
      this.readyState = 1;
      this.onmessage({ data: JSON.stringify(value) });
    }

    close() {
      this.readyState = 3;
      this.onclose?.();
    }
  }

  const document = {
    body: new Element(),
    documentElement: { style: { setProperty() {} } },
    createElement: () => new Element(),
    createElementNS: () => new Element(),
    getElementById: (id) => id === 'overlay' ? overlay : null,
  };

  const context = vm.createContext({
    document,
    window: { location: { href } },
    URL,
    AbortController,
    WebSocket: FakeWebSocket,
    clearTimeout() { bodyTimeoutActive = false; },
    setTimeout() { bodyTimeoutActive = true; return 1; },
    async fetch(url) {
      urls.push(url);
      return result;
    },
  });

  // The page's polling timer is a stub. Interrogate adapters directly.
  const source = embedded ? script.replace(
    'const EMBEDDED_SETTINGS = null; // GENERATED_OVERLAY_SETTINGS',
    'const EMBEDDED_SETTINGS = ' + JSON.stringify(embedded) + '; // GENERATED_OVERLAY_SETTINGS',
  ) : script;
  vm.runInContext(source + '\n' +
    'globalThis.__test = { fetchOpenIRL, fetchOpenRTMP, fetchSRT, fetchNGINX, fetchRIST, parseRISTStats, getBitrate, normalized, render, recordSample, history };', context);

  return {
    api: context.__test,
    overlay,
    urls,
    sockets,
    respondJson(value) {
      result = { ok: true, async json() { return value; } };
    },
    respondJsonObserved(value, observer) {
      result = { ok: true, async json() {
        observer(bodyTimeoutActive);
        return value;
      } };
    },
    respondXml(doc) {
      result = { ok: true, async text() { return '<rtmp />'; } };
      context.DOMParser = class {
        parseFromString() { return doc; }
      };
    },
    respondOffline() {
      result = { ok: true, async json() { throw new SyntaxError('Stream offline'); } };
    },
  };
}

test('OpenIRL standard SRT modern stats use publisher bitrate and RTT', async () => {
  const h = createHarness();
  h.respondJson({ status: 'ok', publisher: { bitrate: 3750, rtt: 23.8, throughput: 3900 } });

  const data = await h.api.fetchOpenIRL({ page: 'http://host:8080/stats', key: 'player_1' });
  assert.equal(h.urls.at(-1), 'http://host:8080/stats/player_1');
  assert.equal(data.bitrate, 3750);
  assert.equal(data.rtt, 23.8);
  assert.equal(data.peers, null);

  h.api.render({ data, server: { type: 'OpenIRL', show_rtt: true, peer_display: 'details' } });
  assert.equal(h.overlay.children.length, 2);
});

test('OpenIRL SRTLA keeps aggregate total and optionally shows link details', async () => {
  const h = createHarness();
  h.respondJson({
    status: 'ok',
    publisher: {
      bitrate: 6900,
      rtt: 36.2,
      throughput: 7150,
      peers: [
        { bitrate: 3900, throughput: 4000, jitter: 1.2 },
        { bitrate: 3000, throughput: 3150, jitter: 3.1 },
      ],
    },
  });

  const data = await h.api.fetchOpenIRL({ page: 'http://host:8080/stats/live' });
  assert.equal(data.bitrate, 6900);
  assert.equal(data.peers.length, 2);
  h.api.render({
    data,
    server: {
      type: 'OpenIRL', show_rtt: true, show_throughput: true,
      peer_display: 'details', max_peers: 4,
    },
  });
  assert.equal(h.overlay.children.length, 6);
  assert.ok(h.overlay.children[5].children.some(
    (node) => node.textContent.includes('3.1 ms jitter'),
  ));

  h.api.render({ data, server: { type: 'OpenIRL', show_rtt: true, peer_display: 'off' } });
  assert.equal(h.overlay.children.length, 2);
});

test('OpenIRL missing publisher and zero bitrate count as offline', async () => {
  const h = createHarness();
  h.respondJson({ status: 'error', message: 'Publisher is currently not streaming' });
  assert.equal(await h.api.fetchOpenIRL({ page: 'http://host/stats', key: 'live' }), null);

  h.respondJson({ status: 'ok', publisher: { bitrate: 0, rtt: 40 } });
  assert.equal(await h.api.fetchOpenIRL({ page: 'http://host/stats', key: 'live' }), null);
});

test('OpenRTMP public /stats uses only flat bitrate_kbps and rtt_ms', async () => {
  const h = createHarness();
  h.respondJson({ bitrate_kbps: 4300, rtt_ms: 14.8 });
  const stats = await h.api.fetchOpenRTMP({ page: 'http://host/stats', key: 'sts_demo' });
  assert.equal(h.urls.at(-1), 'http://host/stats?key=sts_demo');
  assert.equal(stats.bitrate, 4300);
  assert.equal(stats.rtt, 14.8);

  // The streams array belongs to a different API, not public /stats.
  h.respondJson({ streams: [{ bitrate_kbps: 2380, rtt_ms: 30 }] });
  assert.equal(await h.api.fetchOpenRTMP({ page: 'http://host/stats?key=existing' }), null);
});

test('OpenRTMP plain text offline and invalid metric values are safe', async () => {
  const h = createHarness();
  h.respondOffline();
  assert.equal(await h.api.fetchOpenRTMP({ page: 'http://host/stats?key=demo' }), null);
  assert.equal(h.api.normalized(0, 22), null);
  assert.equal(h.api.normalized('oops', 22), null);
});

test('all 12 theme presets render demo stats without a network request', () => {
  const names = [
    'classic', 'minimal', 'pill', 'card',
    'glass', 'neon', 'broadcast', 'terminal',
    'outline', 'scoreboard', 'gradient', 'ticker',
  ];
  for (const preset of names) {
    const h = createHarness('http://localhost/overlay.html?demo=1&preset=' + preset);
    assert.match(h.overlay.className, new RegExp('preset-' + preset));
    assert.equal(h.overlay.children.length, 3, preset + ' displays bitrate, RTT and network throughput');
    assert.ok(h.overlay.children[0].children.some(
      (node) => node.textContent.includes('3480 kb/s'),
    ));
    assert.deepEqual(h.urls, [], preset + ' preview must not fetch stats');
  }
});

test('interactive demo options apply indicators, orientation, and two SRTLA links', () => {
  const h = createHarness(
    'http://localhost/overlay.html?demo=1&preset=glass&layout=horizontal' +
    '&indicator=bar&fontSize=28&accent=%23aa88ff&srtla=1',
  );
  assert.match(h.overlay.className, /preset-glass/);
  assert.match(h.overlay.className, /layout-horizontal/);
  assert.match(h.overlay.className, /indicator-bar/);
  assert.equal(h.overlay.children.length, 6); // bitrate + RTT + throughput + count + two peers
  assert.deepEqual(h.urls, []);
});

test('unknown theme does not escape the safe preset allowlist', () => {
  const h = createHarness('http://localhost/overlay.html?demo=1&preset=unknown');
  assert.match(h.overlay.className, /preset-classic/);
});

test('history graph creates SVG paths for bitrate and RTT without library dependencies', () => {
  const h = createHarness('http://localhost/overlay.html', {
    servers: [{ type: 'OpenRTMP', page: 'https://example.invalid/stats', show_rtt: true }],
    design: { preset: 'glass', layout: 'dashboard', colors: { green: '#00ff00' } },
    display: {
      graph: true, rtt_graph: true, bitrate_bar: true, uptime: true,
      status: true, title: 'My stream', history_points: 6,
      graph_width: 320, graph_height: 100, bar_max: 6000,
    },
  });
  for (const bitrate of [3200, 3500, 3300, 3600, 3400]) {
    h.api.recordSample({ data: { bitrate, rtt: 35 }, server: { show_rtt: true } });
  }
  const data = { bitrate: 3400, rtt: 35, uptime: 120 };
  h.api.render({ data, server: { type: 'OpenRTMP', show_rtt: true } });
  const charts = h.overlay.children.filter(element => element.className === 'chart');
  assert.equal(charts.length, 2);
  assert.ok(charts.every(el => el.children[1].children.some(node =>
    node.attributes.d && node.attributes.d.startsWith('M'),
  )));
  const bar = h.overlay.children.find(element => element.className.includes('bar-widget'));
  assert.ok(bar);
  assert.match(bar.children[1].children[0].style.width, /^56/);
  assert.match(h.overlay.className, /layout-dashboard/);
});

test('history is capped and offline polls create gaps instead of zeros', () => {
  const h = createHarness('http://localhost/overlay.html', {
    display: { history_points: 5, graph: true },
  });
  for (let i = 0; i < 10; i++) h.api.recordSample({ data: { bitrate: 3300 + i, rtt: 20 } });
  h.api.recordSample(null);
  assert.equal(h.api.history.length, 5);
  assert.equal(h.api.history[4], null);
  h.api.render(null);
  assert.ok(h.overlay.children.some(el => el.className === 'chart'));
});

test('generator template is replaceable and GitHub Pages builder has safe export path', () => {
  const generator = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const generatorJs = generator.match(/<script>([\s\S]*?)<\/script>/)?.[1];
  assert.ok(generatorJs, 'generator has an inline script');
  assert.doesNotThrow(() => new vm.Script(generatorJs), 'generator JavaScript parses');
  const marker = 'const EMBEDDED_SETTINGS = null; // GENERATED_OVERLAY_SETTINGS';
  assert.ok(html.includes(marker));
  assert.ok(generator.includes(marker));
  assert.ok(generator.includes('fetch("./bitrate.html"'));
  assert.ok(generator.includes('bitrate-overlay-preview'));
  assert.ok(generator.includes('never sends your stream keys'));
});

test('body timeout remains active until JSON is completely read', async () => {
  const h = createHarness();
  let wasActive = false;
  h.respondJsonObserved({ bitrate_kbps: 3100, rtt_ms: 15 }, active => {
    wasActive = active;
  });
  const data = await h.api.fetchOpenRTMP({ page: 'http://host/stats', key: 'sts_test' });
  assert.equal(data.bitrate, 3100);
  assert.equal(wasActive, true);
});

test('NGINX selects a named application and skips publishing streams with zero bitrate', async () => {
  const h = createHarness();
  const stream = (bitrate, publishing = true) => ({
    getElementsByTagName(name) {
      if (name === 'publishing') return publishing ? [{}] : [];
      if (name === 'bw_in') return [{ textContent: String(bitrate) }];
      return [];
    },
  });
  const app = (name, streams) => ({
    children: [{ tagName: 'name', textContent: name }],
    getElementsByTagName(nameTag) {
      return nameTag === 'stream' ? streams : [];
    },
  });
  h.respondXml({
    getElementsByTagName(name) {
      if (name === 'parsererror') return [];
      if (name === 'application') return [
        app('other', [stream(8000000)]),
        app('live', [stream(0), stream(4900000)]),
      ];
      return [];
    },
  });
  const data = await h.api.fetchNGINX({ page: 'http://host/stat', key: 'live' });
  assert.equal(data.bitrate, 4900);
  assert.equal(await h.api.fetchNGINX({ page: 'http://host/stat', key: 'missing' }), null);
});

test('OpenIRL URL handles many trailing slashes without regex backtracking', async () => {
  const h = createHarness();
  h.respondJson({ status: 'ok', publisher: { bitrate: 4000, rtt: 35 } });
  const result = await h.api.fetchOpenIRL({
    page: 'http://host/stats' + '/'.repeat(2000), key: 'stream/with slash',
  });
  assert.equal(result.bitrate, 4000);
  assert.ok(h.urls.at(-1).endsWith('/stats/stream%2Fwith%20slash'));
});

test('new filename is used in generator and all public entry points', () => {
  const generator = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const gallery = fs.readFileSync(path.join(__dirname, '..', 'examples', 'themes.html'), 'utf8');
  const readme = fs.readFileSync(path.join(__dirname, '..', 'README.md'), 'utf8');
  const pages = fs.readFileSync(path.join(__dirname, '..', '.github', 'workflows', 'pages.yml'), 'utf8');
  for (const content of [generator, gallery, readme, pages]) {
    assert.doesNotMatch(content, /colorBitrate\.html/);
    assert.match(content, /bitrate\.html/);
  }
  assert.match(generator, /"bitrate\.html"\);/);
});

test('every visible metric label can be customized or emptied without changing numbers', () => {
  const h = createHarness('http://localhost/overlay.html', {
    design: { show_bitrate_label: true, show_units: true },
    display: {
      graph: true, rtt_graph: true, bitrate_bar: true,
      peers: true, throughput: true, uptime: true, status: true,
      labels: {
        bitrate: 'My bitrate', rtt: 'Latency', throughput: 'Network speed',
        peers: 'Connections', link: 'Path', jitter: 'variation',
        uptime: 'Duration', status: 'Stream state', live: 'Connected',
        bitrate_graph: 'Chart 1', rtt_graph: 'Chart 2',
        bitrate_bar: 'Loading', links_plural: 'connections',
        kbps: 'kilobits', ms: 'milliseconds',
      },
    },
  });
  const rows = [
    {
      bitrate: 3400, rtt: 31, throughput: 3500, uptime: 123,
      peers: [{ bitrate: 2100, jitter: 2.3 }, { bitrate: 1300, jitter: 1.2 }],
    },
  ];
  h.api.render({ data: rows[0], server: {
    type: 'OpenIRL', show_rtt: true, show_label: false, show_throughput: true,
    peer_display: 'details', max_peers: 2,
  } });
  const content = [];
  const collect = el => {
    if (el.textContent) content.push(el.textContent);
    el.children.forEach(collect);
  };
  h.overlay.children.forEach(collect);
  const combined = content.join(' ');
  for (const text of ['My bitrate', 'Latency', 'Network speed', 'Connections',
    'Path 1', 'variation', 'Duration', 'Stream state', 'Connected', 'Chart 1',
    'Chart 2', 'Loading', 'kilobits', 'milliseconds']) {
    assert.ok(combined.includes(text), 'missing customizable label: ' + text);
  }
  assert.ok(!combined.includes('ms jitter'), 'hardcoded jitter text must not leak');
});

test('default original overlay is classic and has no graphs or background panel', () => {
  const h = createHarness('http://localhost/overlay.html?demo=1');
  assert.match(h.overlay.className, /preset-classic/);
  assert.ok(!h.overlay.children.some(element => element.className === 'chart'));
  const index = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  assert.match(index, /preset: "classic", layout: "vertical"/);
  assert.match(index, /background: "transparent"/);
});

test('responsive CSS wraps metric text and keeps the demo background separate', () => {
  assert.match(html, /overflow-wrap: anywhere/);
  assert.match(html, /flex-wrap: wrap/);
  assert.match(html, /body\.demo-mode/);
  assert.match(html, /background: transparent/);
});

test('moo RIST WebSocket aggregates alive peers in bits/s and averages RTT', async () => {
  const h = createHarness();
  const waiting = h.api.fetchRIST({ page: 'ws://localhost:8683' });
  assert.equal(h.sockets.length, 1);
  assert.equal(h.sockets[0].url, 'ws://localhost:8683/');
  h.sockets[0].emit({
    'receiver-stats': {
      flowinstant: {
        dead: 0,
        peers: [
          { dead: 0, stats: { bitrate: 2200000, rtt: 24 } },
          { dead: 0, stats: { bitrate: 1300000, rtt: 36 } },
          { dead: 1, stats: { bitrate: 9000000, rtt: 99 } },
        ],
      },
    },
  });
  const stats = await waiting;
  assert.equal(stats.bitrate, 3500);
  assert.equal(stats.rtt, 30);
  assert.equal(stats.peers.length, 2);
  assert.equal(stats.peers[0].bitrate, 2200);
  assert.equal(stats.peers[1].bitrate, 1300);
  assert.equal(stats.peers[0].jitter, null);

  // Reusing the cached fresh snapshot must not open another socket.
  assert.equal((await h.api.fetchRIST({ page: 'ws://localhost:8683' })).bitrate, 3500);
  assert.equal(h.sockets.length, 1);
});

test('moo RIST WebSocket returns null immediately for dead or missing peers', async () => {
  const h = createHarness();
  const initial = h.api.fetchRIST({ page: 'ws://127.0.0.1:8081' });
  h.sockets[0].emit({
    'receiver-stats': {
      flowinstant: { dead: 1, peers: [{ dead: 1, stats: { bitrate: 900000, rtt: 27 } }] },
    },
  });
  assert.equal(await initial, null);
  // No wait for request_timeout when the latest stats already say offline.
  assert.equal(await h.api.fetchRIST({ page: 'ws://127.0.0.1:8081' }), null);
  assert.equal(h.api.parseRISTStats({ 'sender-stats': {} }), null);
  assert.equal(h.api.parseRISTStats({ 'receiver-stats': { flowinstant: { peers: [] } } }), null);
});

test('RIST HTTP JSON endpoint accepts the same receiver-stats schema if configured', async () => {
  const h = createHarness();
  h.respondJson({ 'receiver-stats': {
    flowinstant: {
      peers: [
        { dead: 0, stats: { bitrate: 2600000, rtt: 14 } },
        { dead: 1, stats: { bitrate: 6000000, rtt: 80 } },
      ],
    },
  } });
  const data = await h.api.fetchRIST({ page: 'http://localhost:8681/custom-json-path' });
  assert.equal(data.bitrate, 2600);
  assert.equal(data.rtt, 14);
  assert.equal(h.urls.at(-1), 'http://localhost:8681/custom-json-path');
  assert.equal(await h.api.fetchRIST({ page: 'ftp://localhost/nope' }), null);
});

test('RIST options and player-id example are documented without generator or CORS sections', () => {
  const readme = fs.readFileSync(path.join(__dirname, '..', 'README.md'), 'utf8');
  const index = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  assert.match(readme, /play_60a0055a7fdb436d92fab3a943f5c55c/);
  assert.match(readme, /type: "RIST"/);
  assert.match(readme, /ws:\/\/127\.0\.0\.1:8081/);
  assert.match(readme, /ws:\/\/127\.0\.0\.1:8683/);
  assert.doesNotMatch(readme, /### Optional visual generator|### CORS note|### Optionaler Generator/);
  assert.match(index, /\["RIST", "moo RIST \(native \/ Docker\)"\]/);
  assert.match(index, /data-setting="display.labels.rist_peers"/);
});

test('RIST offline stats immediately try the next configured server', async () => {
  const h = createHarness('http://localhost/overlay.html', {
    servers: [
      { type: 'RIST', page: 'ws://localhost:8683', show_rtt: true },
      { type: 'OpenRTMP', page: 'http://localhost:8888/stats', key: 'sts_test', show_rtt: true },
    ],
  });
  h.respondJson({ bitrate_kbps: 4100, rtt_ms: 22 });
  const pending = h.api.getBitrate();
  assert.equal(h.sockets.length, 1);
  h.sockets[0].emit({
    'receiver-stats': {
      flowinstant: { dead: 0, peers: [{ dead: 1, stats: { bitrate: 4000000, rtt: 30 } }] },
    },
  });
  const result = await pending;
  assert.equal(result.server.type, 'OpenRTMP');
  assert.equal(result.data.bitrate, 4100);
  assert.equal(h.urls.length, 1);
  assert.equal(h.urls[0], 'http://localhost:8888/stats?key=sts_test');
  const again = await h.api.getBitrate();
  assert.equal(again.server.type, 'OpenRTMP');
  assert.equal(h.sockets.length, 1);
});
