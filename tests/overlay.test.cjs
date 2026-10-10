'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const html = fs.readFileSync(path.join(__dirname, '..', 'colorBitrate.html'), 'utf8');
const match = html.match(/<script>([\s\S]*?)<\/script>/);
assert.ok(match, 'overlay has a JavaScript block');
const script = match[1];

class Element {
  constructor() {
    this.children = [];
    this.className = '';
    this.style = {};
    this.textContent = '';
  }

  appendChild(child) {
    this.children.push(child);
  }

  replaceChildren(...children) {
    this.children = children;
  }
}

function createHarness() {
  const overlay = new Element();
  const urls = [];
  let result = { ok: false };

  const document = {
    body: new Element(),
    documentElement: { style: { setProperty() {} } },
    createElement: () => new Element(),
    getElementById: (id) => id === 'overlay' ? overlay : null,
  };

  const context = vm.createContext({
    document,
    window: { location: { href: 'http://localhost/overlay.html' } },
    URL,
    AbortController,
    clearTimeout() {},
    setTimeout() { return 1; },
    async fetch(url) {
      urls.push(url);
      return result;
    },
  });

  // The page's polling timer is a stub. Interrogate adapters directly.
  vm.runInContext(script + '\n' +
    'globalThis.__test = { fetchOpenIRL, fetchOpenRTMP, fetchSRT, normalized, render };', context);

  return {
    api: context.__test,
    overlay,
    urls,
    respondJson(value) {
      result = { ok: true, async json() { return value; } };
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

test('OpenRTMP modern flat and legacy streams formats', async () => {
  const h = createHarness();
  h.respondJson({ bitrate_kbps: 4300, rtt_ms: 14.8 });
  const current = await h.api.fetchOpenRTMP({ page: 'http://host/stats', key: 'sts_demo' });
  assert.equal(h.urls.at(-1), 'http://host/stats?key=sts_demo');
  assert.equal(current.bitrate, 4300);
  assert.equal(current.rtt, 14.8);

  h.respondJson({ streams: [{ bitrate_kbps: 2380, rtt_ms: 30 }] });
  const legacy = await h.api.fetchOpenRTMP({ page: 'http://host/stats?key=existing' });
  assert.equal(legacy.bitrate, 2380);
});

test('OpenRTMP plain text offline and invalid metric values are safe', async () => {
  const h = createHarness();
  h.respondOffline();
  assert.equal(await h.api.fetchOpenRTMP({ page: 'http://host/stats?key=demo' }), null);
  assert.equal(h.api.normalized(0, 22), null);
  assert.equal(h.api.normalized('oops', 22), null);
});
