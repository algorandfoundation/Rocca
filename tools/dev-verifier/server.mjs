#!/usr/bin/env node
/**
 * Dev Verifier — tiny standalone service for testing the Rocca wallet
 * against the local intermezzo-fresh OID4VC backend.
 *
 * Responsibilities:
 *   1. Serve a single-page UI with two tabs:
 *      - "Verify": craft an OID4VP presentation definition and render an
 *        `openid4vp://` QR (device-proving / credential presentation).
 *      - "Issue":  craft an OID4VCI credential offer pinned to a holder
 *        `did:key` and render the `openid-credential-offer://` QR
 *        (claim-by-scan).
 *   2. Proxy verifier endpoints:
 *      - POST /api/request           -> POST /credential/verifier/requests
 *      - GET  /api/sessions/:id      -> GET  /credential/verifier/sessions/:id
 *   3. Proxy issuer endpoints:
 *      - GET  /api/configurations    -> GET  /credential/issuer/configurations
 *      - POST /api/offer             -> POST /credential/issuer/offers
 *      - GET  /api/issuance/:id      -> GET  /credential/issuer/sessions/:id
 *   4. Render the returned URI as a QR code in-browser, then poll the
 *      session until it transitions to a terminal state.
 *
 * Run with:
 *     node tools/dev-verifier/server.mjs
 *
 * Env vars:
 *     PORT                  default 4000
 *     INTERMEZZO_BASE_URL   default http://localhost:3000
 *     INTERMEZZO_BASE_PATH  default /v1 (intermezzo-fresh sets app.setGlobalPrefix('v1'))
 *     INTERMEZZO_TOKEN      optional bearer token for the intermezzo API
 *
 * No npm dependencies — uses Node built-ins (http, fetch is global in Node 18+).
 * The QR library is loaded from a CDN in the browser.
 */

import http from 'node:http';
import { URL } from 'node:url';

const PORT = Number(process.env.PORT ?? 4000);
const INTERMEZZO = (process.env.INTERMEZZO_BASE_URL ?? 'http://localhost:3000').replace(/\/$/, '');
const RAW_BASE_PATH = process.env.INTERMEZZO_BASE_PATH ?? '/v1';
const BASE_PATH = RAW_BASE_PATH === '' ? '' : '/' + RAW_BASE_PATH.replace(/^\/+|\/+$/g, '');
const API = INTERMEZZO + BASE_PATH;
const TOKEN = process.env.INTERMEZZO_TOKEN ?? '';

function authHeaders() {
  const h = { 'content-type': 'application/json' };
  if (TOKEN) h.authorization = `Bearer ${TOKEN}`;
  return h;
}

async function readJson(req) {
  return await new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (c) => (data += c));
    req.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}

function send(res, status, body, contentType = 'application/json') {
  res.writeHead(status, {
    'content-type': contentType,
    'access-control-allow-origin': '*',
    'access-control-allow-headers': 'content-type,authorization',
    'access-control-allow-methods': 'GET,POST,OPTIONS',
  });
  res.end(typeof body === 'string' ? body : JSON.stringify(body));
}

async function proxy(res, upstreamUrl, init = {}) {
  try {
    const r = await fetch(upstreamUrl, { headers: authHeaders(), ...init });
    const text = await r.text();
    res.writeHead(r.status, { 'content-type': 'application/json' });
    return res.end(text);
  } catch (e) {
    const cause = e?.cause?.code ?? e?.code ?? '';
    const msg = String(e?.message ?? e);
    let hint;
    if (cause === 'ECONNREFUSED') {
      hint =
        `Could not reach intermezzo at ${INTERMEZZO}. Is it running? ` +
        `Start it (e.g. \`pnpm start:dev\` in intermezzo-fresh) or set INTERMEZZO_BASE_URL.`;
    } else if (cause === 'ENOTFOUND' || cause === 'EAI_AGAIN') {
      hint = `DNS lookup for ${INTERMEZZO} failed (${cause}). Check INTERMEZZO_BASE_URL.`;
    } else if (cause === 'UND_ERR_SOCKET' || cause === 'ECONNRESET') {
      hint = `Connection to ${INTERMEZZO} was reset (${cause}). Is intermezzo healthy?`;
    }
    const body = { error: msg, cause: cause || undefined, target: upstreamUrl, hint };
    console.error('[proxy] %s %s -> %s (%s)', init.method || 'GET', upstreamUrl, msg, cause || '?');
    return send(res, 502, body);
  }
}

const HTML = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Rocca · Dev Verifier</title>
  <style>
    :root { color-scheme: light dark; }
    body { font-family: ui-sans-serif, system-ui, sans-serif; max-width: 900px; margin: 2rem auto; padding: 0 1rem; }
    h1 { margin-bottom: 0.25rem; }
    .sub { color: #64748b; margin-bottom: 1.5rem; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; }
    @media (max-width: 720px) { .grid { grid-template-columns: 1fr; } }
    textarea, input[type=text] { width: 100%; font: 13px/1.4 ui-monospace, monospace; padding: 8px; border-radius: 8px; border: 1px solid #cbd5e1; box-sizing: border-box; }
    textarea { height: 280px; }
    input[type=text] { padding: 10px; }
    button { background: #3b82f6; color: white; border: 0; padding: 10px 16px; border-radius: 8px; font-weight: 600; cursor: pointer; }
    button:disabled { opacity: 0.6; cursor: not-allowed; }
    .card { border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; background: #ffffff10; }
    .qr { display: flex; flex-direction: column; align-items: center; gap: 8px; }
    .qr canvas { background: white; padding: 12px; border-radius: 8px; }
    .uri { font-family: ui-monospace, monospace; font-size: 11px; word-break: break-all; background: #f1f5f9; padding: 8px; border-radius: 6px; max-height: 80px; overflow: auto; }
    .state { font-weight: 600; }
    .state.ok { color: #16a34a; }
    .state.pending { color: #d97706; }
    .state.err { color: #dc2626; }
    pre { background: #0f172a; color: #e2e8f0; padding: 12px; border-radius: 8px; overflow: auto; max-height: 240px; font-size: 12px; }
    .row { display: flex; gap: 8px; align-items: center; margin-bottom: 8px; flex-wrap: wrap; }
    label { font-size: 13px; color: #475569; font-weight: 600; }
    .tabs { display: flex; gap: 4px; border-bottom: 1px solid #e2e8f0; margin-bottom: 1.25rem; }
    .tab { background: transparent; color: #64748b; border: 0; padding: 10px 18px; font-weight: 600; cursor: pointer; border-radius: 8px 8px 0 0; }
    .tab.active { background: #3b82f6; color: white; }
    .panel { display: none; }
    .panel.active { display: block; }
    .hint { font-size: 12px; color: #64748b; margin-top: 4px; }
  </style>
</head>
<body>
  <h1>Rocca · Dev Verifier</h1>
  <div class="sub">
    Talks to <code>${INTERMEZZO}</code>. Scan the QR with the Rocca wallet to test
    device proving (Verify) or claiming a credential (Issue).
  </div>

  <div class="tabs">
    <button class="tab active" data-tab="verify">Verify (present)</button>
    <button class="tab" data-tab="issue">Issue (claim)</button>
  </div>

  <!-- ============== VERIFY ============== -->
  <div class="panel active" id="panel-verify">
    <div class="grid">
      <div class="card">
        <div class="row"><label>Presentation Definition (JSON)</label></div>
        <textarea id="pd"></textarea>
        <div class="row" style="margin-top: 10px;">
          <button id="go-verify">Generate Request</button>
          <button id="reset-verify" style="background:#64748b">Reset</button>
          <span id="status-verify" class="state"></span>
        </div>
      </div>

      <div class="card qr">
        <label>Scan with wallet</label>
        <canvas id="qr-verify"></canvas>
        <div class="uri" id="uri-verify">No request yet.</div>
      </div>
    </div>

    <div class="card" style="margin-top: 1.5rem;">
      <div class="row" style="justify-content: space-between;">
        <label>Verification Session</label>
        <span id="sid-verify" style="font-family:ui-monospace,monospace;font-size:12px;color:#64748b;"></span>
      </div>
      <pre id="session-verify">{}</pre>
    </div>
  </div>

  <!-- ============== ISSUE ============== -->
  <div class="panel" id="panel-issue">
    <div class="grid">
      <div class="card">
        <div class="row"><label>Credential Configuration ID</label></div>
        <input type="text" id="ccid" value="device-attestation-credential" />
        <div class="hint">
          Must match an id declared by the issuer.
          <a href="#" id="load-configs">Load available configurations</a>.
        </div>
        <div id="configs" class="hint" style="margin-top:6px;"></div>

        <div class="row" style="margin-top: 12px;"><label>Holder did:key</label></div>
        <input type="text" id="holder" placeholder="did:key:z6Mk..." />
        <div class="hint">The wallet-local DID the credential will be bound to.</div>

        <div class="row" style="margin-top: 12px;"><label>Issuance Metadata (JSON, optional)</label></div>
        <textarea id="meta" style="height:140px;">{}</textarea>

        <div class="row" style="margin-top: 10px;">
          <button id="go-issue">Create Offer</button>
          <button id="reset-issue" style="background:#64748b">Reset</button>
          <span id="status-issue" class="state"></span>
        </div>
      </div>

      <div class="card qr">
        <label>Scan with wallet</label>
        <canvas id="qr-issue"></canvas>
        <div class="uri" id="uri-issue">No offer yet.</div>
      </div>
    </div>

    <div class="card" style="margin-top: 1.5rem;">
      <div class="row" style="justify-content: space-between;">
        <label>Issuance Session</label>
        <span id="sid-issue" style="font-family:ui-monospace,monospace;font-size:12px;color:#64748b;"></span>
      </div>
      <pre id="session-issue">{}</pre>
    </div>
  </div>

<script type="module">
import QRCode from 'https://cdn.jsdelivr.net/npm/qrcode@1.5.4/+esm';

const $ = (id) => document.getElementById(id);

// ---------------- tabs ----------------
document.querySelectorAll('.tab').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach((b) => b.classList.toggle('active', b === btn));
    const which = btn.dataset.tab;
    document.querySelectorAll('.panel').forEach((p) => p.classList.toggle('active', p.id === 'panel-' + which));
  });
});

function setStatus(id, text, cls = '') {
  const s = $(id);
  s.textContent = text;
  s.className = 'state ' + cls;
}

function isTerminal(state, kind) {
  const s = (state || '').toLowerCase();
  if (kind === 'verify') {
    return s.includes('verified') || s.includes('error') || s.includes('failed');
  }
  // issue
  return s.includes('issued') || s.includes('error') || s.includes('failed');
}

function poller(kind, fetchUrl, sessionElId, statusElId) {
  let handle = null;
  return {
    start(id) {
      if (handle) clearInterval(handle);
      const tick = async () => {
        try {
          const r = await fetch(fetchUrl(id));
          const data = await r.json();
          $(sessionElId).textContent = JSON.stringify(data, null, 2);
          const state = data.state || '';
          if (isTerminal(state, kind)) {
            const okWord = kind === 'verify' ? 'verified' : 'issued';
            const ok = state.toLowerCase().includes(okWord);
            setStatus(statusElId, ok ? (kind === 'verify' ? 'Verified ✓' : 'Issued ✓') : 'Failed: ' + state, ok ? 'ok' : 'err');
            clearInterval(handle);
            handle = null;
          } else {
            setStatus(statusElId, 'Waiting for wallet… (' + state + ')', 'pending');
          }
        } catch (e) {
          console.error(e);
        }
      };
      handle = setInterval(tick, 1500);
      tick();
    },
    stop() { if (handle) { clearInterval(handle); handle = null; } },
  };
}

// ---------------- VERIFY ----------------
const DEFAULT_PD = {
  id: "device-attestation",
  input_descriptors: [
    {
      id: "device-attestation-credential",
      format: { "vc+sd-jwt": { "sd-jwt_alg_values": ["EdDSA"] } },
      constraints: {
        fields: [
          { path: ["$.vct"], filter: { type: "string", const: "device-attestation-credential" } }
        ]
      }
    }
  ]
};
$('pd').value = JSON.stringify(DEFAULT_PD, null, 2);

const verifyPoll = poller('verify', (id) => '/api/sessions/' + encodeURIComponent(id), 'session-verify', 'status-verify');

$('go-verify').addEventListener('click', async () => {
  let pd;
  try { pd = JSON.parse($('pd').value); }
  catch (e) { setStatus('status-verify', 'Invalid JSON: ' + e.message, 'err'); return; }

  $('go-verify').disabled = true;
  setStatus('status-verify', 'Requesting…', 'pending');
  try {
    const r = await fetch('/api/request', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ presentationDefinition: pd }),
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data?.error || ('HTTP ' + r.status));
    $('sid-verify').textContent = 'id: ' + data.id;
    $('uri-verify').textContent = data.authorizationRequest;
    QRCode.toCanvas($('qr-verify'), data.authorizationRequest, { width: 280, margin: 1 });
    setStatus('status-verify', 'Waiting for wallet…', 'pending');
    verifyPoll.start(data.id);
  } catch (e) {
    setStatus('status-verify', 'Error: ' + e.message, 'err');
  } finally {
    $('go-verify').disabled = false;
  }
});

$('reset-verify').addEventListener('click', () => {
  verifyPoll.stop();
  $('sid-verify').textContent = '';
  $('uri-verify').textContent = 'No request yet.';
  $('session-verify').textContent = '{}';
  setStatus('status-verify', '');
  const c = $('qr-verify'); c.getContext('2d').clearRect(0, 0, c.width, c.height);
});

// ---------------- ISSUE ----------------
const issuePoll = poller('issue', (id) => '/api/issuance/' + encodeURIComponent(id), 'session-issue', 'status-issue');

$('load-configs').addEventListener('click', async (ev) => {
  ev.preventDefault();
  try {
    const r = await fetch('/api/configurations');
    const data = await r.json();
    if (!r.ok) throw new Error(data?.error || ('HTTP ' + r.status));
    const ids = Array.isArray(data)
      ? data.map((c) => c.id ?? c.credentialConfigurationId).filter(Boolean)
      : Object.keys(data?.credential_configurations_supported ?? data ?? {});
    $('configs').innerHTML = ids.length
      ? 'Available: ' + ids.map((id) => '<a href="#" data-cc="' + id + '">' + id + '</a>').join(', ')
      : '(no configurations advertised)';
    $('configs').querySelectorAll('a[data-cc]').forEach((a) => {
      a.addEventListener('click', (e) => { e.preventDefault(); $('ccid').value = a.dataset.cc; });
    });
  } catch (e) {
    $('configs').textContent = 'Error loading configs: ' + e.message;
  }
});

$('go-issue').addEventListener('click', async () => {
  const credentialConfigurationIds = $('ccid').value.split(',').map((s) => s.trim()).filter(Boolean);
  const holderDidKey = $('holder').value.trim();
  if (!credentialConfigurationIds.length) {
    setStatus('status-issue', 'Need a credential configuration id.', 'err'); return;
  }
  if (!/^did:key:z[1-9A-HJ-NP-Za-km-z]+$/.test(holderDidKey)) {
    setStatus('status-issue', 'Holder must be a valid did:key.', 'err'); return;
  }
  let issuanceMetadata = undefined;
  const metaText = $('meta').value.trim();
  if (metaText && metaText !== '{}') {
    try { issuanceMetadata = JSON.parse(metaText); }
    catch (e) { setStatus('status-issue', 'Invalid metadata JSON: ' + e.message, 'err'); return; }
  }

  $('go-issue').disabled = true;
  setStatus('status-issue', 'Creating offer…', 'pending');
  try {
    const r = await fetch('/api/offer', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ credentialConfigurationIds, holderDidKey, issuanceMetadata }),
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data?.error || data?.message || ('HTTP ' + r.status));
    const offerUri = data.credentialOffer;
    $('sid-issue').textContent = 'id: ' + data.id;
    $('uri-issue').textContent = offerUri;
    QRCode.toCanvas($('qr-issue'), offerUri, { width: 280, margin: 1 });
    setStatus('status-issue', 'Waiting for wallet…', 'pending');
    issuePoll.start(data.id);
  } catch (e) {
    setStatus('status-issue', 'Error: ' + e.message, 'err');
  } finally {
    $('go-issue').disabled = false;
  }
});

$('reset-issue').addEventListener('click', () => {
  issuePoll.stop();
  $('sid-issue').textContent = '';
  $('uri-issue').textContent = 'No offer yet.';
  $('session-issue').textContent = '{}';
  setStatus('status-issue', '');
  const c = $('qr-issue'); c.getContext('2d').clearRect(0, 0, c.width, c.height);
});
</script>
</body>
</html>`;

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (req.method === 'OPTIONS') return send(res, 204, '');

  if (req.method === 'GET' && url.pathname === '/') {
    return send(res, 200, HTML, 'text/html; charset=utf-8');
  }

  // ---- verifier ----
  if (req.method === 'POST' && url.pathname === '/api/request') {
    const body = await readJson(req);
    return proxy(res, `${API}/credential/verifier/requests`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  let m = url.pathname.match(/^\/api\/sessions\/([^/]+)$/);
  if (req.method === 'GET' && m) {
    return proxy(res, `${API}/credential/verifier/sessions/${encodeURIComponent(m[1])}`);
  }

  // ---- issuer ----
  if (req.method === 'GET' && url.pathname === '/api/configurations') {
    return proxy(res, `${API}/credential/issuer/configurations`);
  }

  if (req.method === 'POST' && url.pathname === '/api/offer') {
    const body = await readJson(req);
    return proxy(res, `${API}/credential/issuer/offers`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  m = url.pathname.match(/^\/api\/issuance\/([^/]+)$/);
  if (req.method === 'GET' && m) {
    return proxy(res, `${API}/credential/issuer/sessions/${encodeURIComponent(m[1])}`);
  }

  send(res, 404, { error: 'not found' });
});

server.listen(PORT, () => {
  console.log(`Dev Verifier listening on http://localhost:${PORT}`);
  console.log(`Proxying intermezzo at ${API}`);
});
