# AC2 controller

This Expo / React-Native app is the **controller / wallet** side of the
[AC2](https://github.com/algorandfoundation/ac2-sdk) protocol. It pairs
with the reference plugin in
[`packages/ac2-open-claw-reference`](../packages/ac2-open-claw-reference/README.md),
which is the **agent** side hosted in OpenClaw.

## What the controller contributes to AC2

| AC2 surface                                        | Where it lives in this app                                |
| -------------------------------------------------- | --------------------------------------------------------- |
| Liquid Auth + WebRTC pairing                       | `lib/ac2/transport.ts` (`createAc2Transport`)             |
| `Ac2Client` wiring + envelope mirror               | `lib/ac2/client.ts` (`createAc2Client`)                   |
| `SigningRequest` approve/reject                    | `hooks/useAc2Responders.ts` + `lib/ac2/responders.ts`     |
| `KeyRequest` approve/reject (agent identity grant) | `hooks/useAc2Responders.ts` + `stores/agentIdentities.ts` |
| Multi-conversation control plane                   | `lib/ac2/conversations.ts` + `lib/ac2/threads.ts`         |
| Stream-channel control frames (`ac2-stream`)       | `lib/ac2/stream.ts`                                       |
| Heartbeat side channel (`ac2-heartbeat`)           | `lib/ac2/heartbeat.ts`                                    |
| AC2 message timeline (UI)                          | `app/chat.tsx`                                            |
| Connection list / sessions                         | `app/connections.tsx` + `stores/sessions.ts`              |

The hook `hooks/useConnection.ts` composes all of the above behind a
single React-facing surface that `app/chat.tsx` and `app/connections.tsx`
consume.

## Stores that carry AC2 state

- `stores/messages.ts` — free-text chat per conversation thread.
- `stores/ac2Messages.ts` — validated DIDComm v2 envelopes (the signing
  trio + any other `AC2BaseMessage`).
- `stores/agentIdentities.ts` — Ed25519 identity keys the wallet has
  granted to AC2 agents in response to a bootstrap `KeyRequest`.
- `stores/sessions.ts` — persisted connection list (origin + requestId).

## Entry points in `lib/ac2/*`

- `transport.ts` — Liquid Auth `SignalClient` + `peer()` + DataChannel
  negotiation (`ac2-v1`, `ac2-stream`, `ac2-heartbeat`).
- `client.ts` — wraps the control DataChannel with the SDK's transport
  adapter and mirrors inbound envelopes into `ac2MessagesStore`.
- `responders.ts` — pure builders for `SigningResponse`,
  `SigningRejected`, and `KeyResponse` envelopes.
- `conversations.ts` — `ac2/ConversationOpen` / `ConversationClose`
  sender + active `thid` bookkeeping.
- `stream.ts` — STX-prefixed control-frame parser for `ac2-stream`
  (`preview` / `finalize` / `discard` / `conversations` / `tool` /
  `history`).
- `heartbeat.ts` — `ac2-heartbeat` channel handlers.

## Message flow at a glance

1. User scans the QR rendered by the OpenClaw plugin → Liquid Auth
   signaling + WebRTC pairing (`lib/ac2/transport.ts`).
2. Agent sends a bootstrap `ac2/KeyRequest`; the wallet mints a fresh
   Ed25519 identity key, persists it (`stores/agentIdentities.ts`), and
   returns `ac2/KeyResponse` (`hooks/useAc2Responders.ts`).
3. Agent calls `ac2_sign` on its side; the wallet receives an
   `ac2/SigningRequest`, prompts the user, signs with the active
   account, and returns `ac2/SigningResponse` (or `SigningRejected`).
4. Free-text chat + tool/preview frames flow on `ac2-stream`; liveness
   on `ac2-heartbeat`.

For the agent-side counterpart see
[`packages/ac2-open-claw-reference/README.md`](../packages/ac2-open-claw-reference/README.md).
