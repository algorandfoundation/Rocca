# Dev Verifier

A tiny zero-dependency Node service used to **test the Rocca wallet's
OID4VC flows** (both presentation/device-proving _and_ issuance/claim) end-to-end
against the local [`intermezzo-fresh`](../../../intermezzo-fresh) backend.

The single-page UI has two tabs:

- **Verify (present)** — calls `POST /credential/verifier/requests` and renders
  the returned `openid4vp://…` URI as a QR. The wallet scans, builds a VP token
  and posts it back; the dev verifier polls the verification session until
  `ResponseVerified`.
- **Issue (claim)** — calls `POST /credential/issuer/offers` (pinned to a holder
  `did:key`) and renders the returned `openid-credential-offer://…` URI as a QR.
  The wallet scans, runs the OID4VCI pre-authorized-code redemption, and the
  dev verifier polls the issuance session until `CredentialIssued`.

No dependencies are added to this repo — the dev verifier uses only Node
built-ins (`node:http`, global `fetch`). The QR rendering library is loaded
from a CDN inside the served page.

## Prerequisites

- Node 18+ (for global `fetch`).
- `intermezzo-fresh` running on `http://localhost:3000` (or wherever
  `INTERMEZZO_BASE_URL` points to).
- The Rocca wallet running on a device/simulator that can reach the
  intermezzo host _over the network_ — i.e. if you scan a QR with a real
  device, the URI inside it must resolve from that device, so use your LAN
  IP for intermezzo (`EXPO_PUBLIC_INTERMEZZO_BASE_URL` on the wallet side,
  `INTERMEZZO_BASE_URL` here).

## Run

From the repo root:

```bash
node tools/dev-verifier/server.mjs
```

Then open <http://localhost:4000> in your browser.

### Configuration

| Env var                | Default                 | Purpose                                                                                          |
| ---------------------- | ----------------------- | ------------------------------------------------------------------------------------------------ |
| `PORT`                 | `4000`                  | Port the dev verifier listens on.                                                                |
| `INTERMEZZO_BASE_URL`  | `http://localhost:3000` | Base URL of the intermezzo-fresh service.                                                        |
| `INTERMEZZO_BASE_PATH` | `/v1`                   | Global path prefix (intermezzo-fresh sets `app.setGlobalPrefix('v1')`). Set to empty to disable. |
| `INTERMEZZO_TOKEN`     | _(empty)_               | Optional bearer token forwarded as `Authorization: Bearer …`.                                    |

Example (verifying against intermezzo on a different host):

```bash
INTERMEZZO_BASE_URL=http://192.168.1.20:3000 \
INTERMEZZO_TOKEN=eyJhbGciOi… \
node tools/dev-verifier/server.mjs
```

## Test the device-proving flow

1. **Start intermezzo-fresh** on `localhost:3000`.
2. **Start the Rocca wallet** (`npx expo start`) on a device/simulator and
   ensure it has at least one Identity created (Landing → Identities).
3. **Start the dev verifier**:

   ```bash
   node tools/dev-verifier/server.mjs
   ```

4. Open <http://localhost:4000>. You will see a default Presentation
   Definition asking for a `device-attestation-credential` (the same example
   used in intermezzo's swagger). Edit it freely.
5. Click **Generate Request**. A QR appears containing an `openid4vp://…`
   authorization request URI. The session id is shown below the QR and a
   live-polled session record is rendered in the bottom card.
6. On the wallet, scan the QR (or paste the raw URI for now — a built-in
   scanner is a separate follow-up). The wallet will:
   - Parse the authorization request (see
     `extensions/credentials/utils/oid4vp.ts`).
   - Build a VP token JWT signed by the active identity's key (see
     `buildVpToken` + `JwsSigner` from `getSignerForIdentity`).
   - POST it back to the intermezzo `OID4VC_VERIFIER_PATH` callback (Credo).
7. The dev verifier's session card flips to **`Verified ✓`** when intermezzo
   reports `ResponseVerified`.

## Test the claim flow (issuance)

1. **Start intermezzo-fresh** and the **Rocca wallet** as above. Make sure the
   wallet has at least one Identity — its `did:key` is needed to pin the offer.
2. In the wallet, copy the identity's `did:key` (Identities screen → tap the
   identity → DID Document → `did:key` field).
3. Open <http://localhost:4000>, switch to the **Issue (claim)** tab.
4. Set:
   - **Credential Configuration ID** — defaults to `device-attestation-credential`.
     Click _Load available configurations_ to inspect what the issuer advertises.
   - **Holder did:key** — paste the value from step 2.
   - **Issuance Metadata** — optional JSON; passed through to the credential
     mapper at redemption time (e.g. `{ "rewardTier": "gold" }`).
5. Click **Create Offer**. A QR appears containing an `openid-credential-offer://…`
   URI; the issuance session record is live-polled below.
6. Scan the QR with the wallet. It routes to the new `credential-offer`
   confirmation screen, which calls `redeemOfferUri(...)` — the wallet runs
   the OID4VCI pre-authorized-code redemption and persists the SD-JWT VC.
7. The dev verifier's session card flips to **`Issued ✓`** when intermezzo
   reports `CredentialIssued`.

## Endpoints exposed by the dev verifier

These are thin proxies that exist so the browser can avoid hard-coding
intermezzo's URL / auth token:

- `GET  /` — the single-page UI.
- `POST /api/request` → `POST {INTERMEZZO}/credential/verifier/requests`
  (forwards `{ presentationDefinition }`).
- `GET  /api/sessions/:id` → `GET {INTERMEZZO}/credential/verifier/sessions/:id`.
- `GET  /api/configurations` → `GET {INTERMEZZO}/credential/issuer/configurations`.
- `POST /api/offer` → `POST {INTERMEZZO}/credential/issuer/offers`
  (forwards `{ credentialConfigurationIds, holderDidKey, issuanceMetadata? }`).
- `GET  /api/issuance/:id` → `GET {INTERMEZZO}/credential/issuer/sessions/:id`.
