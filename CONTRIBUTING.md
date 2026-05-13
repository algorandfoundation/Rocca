# Contributing

Thanks for your interest in contributing to the Rocca Wallet Sample. This document
focuses on the pieces that are not obvious from the top-level `README.md` — most
notably how the app integrates with the **Intermezzo** gateway backend during
onboarding (email OTP / Google sign-in, account linking, challenge / response,
etc.).

For an overview of the app itself, screen flow and extension architecture, see
[`README.md`](./README.md).

## Repository Layout

- `app/`, `components/`, `hooks/`, `providers/`, `stores/`, `extensions/` —
  the React Native / Expo client.
- The **Intermezzo** backend (NestJS + Hashicorp Vault) that the client talks
  to for authentication, player linking and signing challenges is maintained
  as a separate project:
  <https://github.com/algorandfoundation/chess-gateway>. Refer to that
  repository's README for instructions on how to run, configure and test the
  gateway — we do not duplicate them here.

## Pointing the client at a gateway

By default, the client tunnels gateway traffic through the **Expo dev server's
host**: it reuses the same machine address Metro is served from (the one your
phone is already talking to over LAN or `expo start --tunnel`) and swaps the
port to the gateway's port (3000 by default). This mirrors how Electron apps
talk to the development host directly — no hardcoded LAN IP needed.

Resolution order (see `resolveGatewayUrl` in `app/onboarding.tsx`):

1. `EXPO_PUBLIC_GATEWAY_URL` (surfaced as `expoConfig.extra.gateway.url`) — an
   explicit override, useful for staging / production builds.
2. `Constants.expoConfig?.hostUri` (or `expoGoConfig.debuggerHost` on Expo Go),
   with the host portion combined with `extra.gateway.port` (default `3000`,
   override via `EXPO_PUBLIC_GATEWAY_PORT`).
3. `http://localhost:<port>` as a last resort (web / simulator on host).

All gateway routes live under the `/v1` global prefix, e.g. `/v1/link/auth/*`,
`/v1/link/session`, `/v1/link/challenge`, `/v1/link/response`.

For physical-device development, the typical flow is:

1. Run the gateway on your dev machine and make sure it listens on `0.0.0.0:3000`
   (or whatever port you set via `EXPO_PUBLIC_GATEWAY_PORT`).
2. Start the app the way you usually do — e.g. `npm run android` or `npx expo
start --tunnel`. The client will pick up the dev host automatically.
3. Make sure the firewall on the dev machine allows inbound connections on the
   gateway port from your device's network.

To override (e.g. when pointing at a remote gateway):

```bash
EXPO_PUBLIC_GATEWAY_URL=https://gateway.example.com npm run android
```

To verify the device can reach the gateway, open `/docs` on the resolved URL
from your phone's browser — you should see the Swagger UI served by the
gateway.

## Client integration notes

These are the pieces of behaviour the client relies on; if you change the
gateway, keep them aligned with
<https://github.com/algorandfoundation/chess-gateway>:

- The mobile client calls `/v1/link/auth/email-otp/send-verification-otp` and
  `/v1/link/auth/sign-in/email-otp` (the better-auth route names), not
  `send-otp` / `verify-otp`.
- `/v1/link/session` is the source of truth for whether the user is signed in
  _and_ maps to a known player; onboarding bails out with "Account not
  registered" when `session.player` is `null`.
- `LinkResponseDto` expects `walletAddress` (not `address`).
- The session is gated by the `better-auth.session_token` cookie. React
  Native's `fetch` does not maintain a cookie jar, so the client captures and
  forwards this cookie manually — keep that in mind when adding new endpoints.
- Real Google OAuth requires `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` to be
  configured on the gateway side; with the dev placeholders, `sign-in/social`
  returns a Google URL but the callback will not complete.

## Working on the client

Standard Expo workflow (see `README.md` for full details):

```bash
npm install
npm run android     # physical Android device required for native crypto modules
```

## Submitting changes

- Run `npm run lint` for the client.
- For backend changes, follow the contribution and testing instructions in
  <https://github.com/algorandfoundation/chess-gateway>.
- Keep onboarding-related changes covered by a manual run-through against a
  running gateway, since the flow spans cookies, Vault and on-device key
  generation.
