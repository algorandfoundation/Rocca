import Constants from 'expo-constants';

/**
 * Client for the Intermezzo / chess-gateway HTTP API.
 *
 * Responsibilities:
 * - Resolve the gateway base URL from Expo configuration / dev host.
 * - Maintain a manual cookie jar (RN's `fetch` does not share cookies between
 *   calls), capturing the `better-auth.session_token` after sign-in and
 *   forwarding it on subsequent authenticated requests.
 * - Expose a typed method per gateway endpoint used by the client.
 *
 * Upstream gateway: https://github.com/algorandfoundation/chess-gateway
 */

/**
 * Logger shape aligned with `@algorandfoundation/log-store`'s `LogStoreApi`:
 * `(message, metadata?, context?)`. All methods are optional so callers can
 * pass a partial implementation (e.g. only `warn`/`error`).
 */
export interface GatewayLogger {
  info?: (message: string, metadata?: Record<string, any>, context?: string) => void;
  warn?: (message: string, metadata?: Record<string, any>, context?: string) => void;
  error?: (message: string, metadata?: Record<string, any>, context?: string) => void;
  debug?: (message: string, metadata?: Record<string, any>, context?: string) => void;
  trace?: (message: string, metadata?: Record<string, any>, context?: string) => void;
}

const LOG_CONTEXT = '@chess-passport/chess-gateway';

/** Console-backed default logger, mapped to the `LogStoreApi` shape. */
const defaultLogger: Required<Pick<GatewayLogger, 'info' | 'warn' | 'error' | 'debug'>> = {
  info: (message, metadata, context) =>
    console.log(`[${context ?? LOG_CONTEXT}] ${message}`, metadata ?? ''),
  warn: (message, metadata, context) =>
    console.warn(`[${context ?? LOG_CONTEXT}] ${message}`, metadata ?? ''),
  error: (message, metadata, context) =>
    console.error(`[${context ?? LOG_CONTEXT}] ${message}`, metadata ?? ''),
  debug: (message, metadata, context) =>
    console.debug(`[${context ?? LOG_CONTEXT}] ${message}`, metadata ?? ''),
};

/**
 * Resolves the gateway base URL.
 *
 * Resolution order:
 * 1. `Constants.expoConfig.extra.gateway.url` if it is a non-empty string
 *    (typically populated from `EXPO_PUBLIC_GATEWAY_URL`).
 * 2. The dev host extracted from `Constants.expoConfig.hostUri` /
 *    `expoGoConfig.debuggerHost` / legacy `manifest.debuggerHost`, combined
 *    with the configured port (default `3000`).
 * 3. `http://localhost:<port>` as last resort.
 */
export function resolveGatewayUrl(logger?: GatewayLogger): string {
  const extra = Constants.expoConfig?.extra as
    | { gateway?: { url?: unknown; port?: unknown } }
    | undefined;

  const explicit = extra?.gateway?.url;
  if (typeof explicit === 'string' && explicit.length > 0) {
    return explicit;
  }
  if (explicit != null && typeof explicit !== 'string') {
    (logger?.warn ?? defaultLogger.warn)(
      'ignoring non-string gateway.url override',
      { type: typeof explicit, value: explicit },
      LOG_CONTEXT,
    );
  }

  const portRaw = extra?.gateway?.port;
  const portParsed =
    typeof portRaw === 'number' ? portRaw : typeof portRaw === 'string' ? Number(portRaw) : NaN;
  const port = Number.isFinite(portParsed) && portParsed > 0 ? portParsed : 3000;

  const hostUriRaw =
    Constants.expoConfig?.hostUri ||
    Constants.expoGoConfig?.debuggerHost ||
    // @ts-expect-error - legacy fallback
    Constants.manifest?.debuggerHost ||
    '';
  const hostUri = typeof hostUriRaw === 'string' ? hostUriRaw : '';
  const host = hostUri.split('/')[0].split(':')[0];
  if (host) return `http://${host}:${port}`;

  return `http://localhost:${port}`;
}

export interface LinkSessionData {
  authenticated: boolean;
  user?: { id?: string; email?: string; emailVerified?: boolean } | null;
  verification?: { id?: string; email?: string } | null;
  player?: { id?: string; [k: string]: any } | null;
}

export interface LinkChallenge {
  challenge: string;
}

export interface SocialSignInResult {
  url?: string;
  redirect?: boolean;
  [k: string]: any;
}

export interface LinkResponseBody {
  walletAddress: string;
  integrityToken?: string;
  attestationObject?: string;
  keyId?: string;
}

/**
 * Error thrown by `ChessGatewayClient` when the gateway returns a non-2xx
 * response. Includes status code and the parsed body (or raw text) for
 * surfacing in UI.
 */
export class ChessGatewayError extends Error {
  status: number;
  body: unknown;
  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.name = 'ChessGatewayError';
    this.status = status;
    this.body = body;
  }
}

export interface ChessGatewayClientOptions {
  baseUrl?: string;
  /**
   * Logger compatible with `@algorandfoundation/log-store`'s `LogStoreApi`.
   * If omitted, falls back to a `console`-backed implementation.
   */
  logger?: GatewayLogger;
}

/**
 * Map of event names to payloads emitted by `ChessGatewayClient`.
 *
 * Consumers can subscribe via `client.on('eventName', handler)` and unsubscribe
 * via the returned function or `client.off('eventName', handler)`. Events let
 * external state (UI, stores, analytics) react to gateway interactions without
 * polling the client.
 */
export interface ChessGatewayEventMap {
  /** Fired before every outgoing HTTP request. */
  request: { label: string; method: string; url: string; hasCookie: boolean };
  /** Fired after every HTTP response (success or non-2xx). */
  response: { label: string; status: number; ok: boolean; url: string };
  /** Fired when a request throws (network failure or non-2xx surfaced via `ensureOk`). */
  error: { label: string; error: unknown };
  /** Fired whenever a new session cookie is captured from `Set-Cookie`. */
  cookie: { cookie: string; label: string };
  /** Fired when the cookie jar is explicitly cleared. */
  cookieCleared: void;
  /** Fired after a successful `getSession` call, with the parsed payload (or null). */
  session: LinkSessionData | null;
  /** Fired after `sendOtp` succeeds. */
  otpSent: { email: string };
  /** Fired after `verifyOtp` succeeds (the user is now authenticated). */
  otpVerified: { email: string };
  /** Fired after `signInSocial` succeeds, before the consumer opens the OAuth URL. */
  signedInSocial: { provider: string; result: SocialSignInResult };
  /** Fired after `getChallenge` succeeds. */
  challenge: { address: string; challenge: string };
  /** Fired after `postLinkResponse` succeeds. */
  linkResponse: { walletAddress: string; response: unknown };
}

export type ChessGatewayEventName = keyof ChessGatewayEventMap;
export type ChessGatewayEventListener<E extends ChessGatewayEventName> = (
  payload: ChessGatewayEventMap[E],
) => void;

export class ChessGatewayClient {
  readonly baseUrl: string;
  private cookie: string | null = null;
  private readonly logger: GatewayLogger;
  private readonly listeners: {
    [E in ChessGatewayEventName]?: Set<ChessGatewayEventListener<E>>;
  } = {};

  constructor(options: ChessGatewayClientOptions = {}) {
    this.logger = options.logger ?? defaultLogger;
    this.baseUrl = options.baseUrl ?? resolveGatewayUrl(this.logger);
    this.logger.info?.(
      'resolved baseUrl',
      { baseUrl: this.baseUrl, type: typeof this.baseUrl },
      LOG_CONTEXT,
    );
  }

  /**
   * Subscribe to a client event. Returns an unsubscribe function.
   *
   * Example:
   * ```ts
   * const off = chessGateway.on('session', (s) => console.log(s?.authenticated));
   * off();
   * ```
   */
  on<E extends ChessGatewayEventName>(
    event: E,
    listener: ChessGatewayEventListener<E>,
  ): () => void {
    let set = this.listeners[event] as Set<ChessGatewayEventListener<E>> | undefined;
    if (!set) {
      set = new Set();
      (this.listeners as any)[event] = set;
    }
    set.add(listener);
    return () => this.off(event, listener);
  }

  /** Remove a previously registered listener. */
  off<E extends ChessGatewayEventName>(event: E, listener: ChessGatewayEventListener<E>): void {
    const set = this.listeners[event] as Set<ChessGatewayEventListener<E>> | undefined;
    set?.delete(listener);
  }

  /**
   * Fire an event to all registered listeners. Listener exceptions are caught
   * and logged so a single misbehaving subscriber cannot break the request flow.
   */
  emit<E extends ChessGatewayEventName>(event: E, payload: ChessGatewayEventMap[E]): void {
    const set = this.listeners[event] as Set<ChessGatewayEventListener<E>> | undefined;
    if (!set || set.size === 0) return;
    for (const listener of Array.from(set)) {
      try {
        listener(payload);
      } catch (err) {
        this.logger.error?.(
          'event listener threw',
          { event: String(event), error: err },
          LOG_CONTEXT,
        );
      }
    }
  }

  /** Returns the captured session cookie header value, or null. */
  getCookie(): string | null {
    return this.cookie;
  }

  /** Clears any captured session cookie (e.g. on logout). */
  clearCookie(): void {
    this.cookie = null;
    this.emit('cookieCleared', undefined as void);
  }

  private captureCookie(response: Response, label: string): void {
    const raw = response.headers.get('set-cookie');
    if (!raw) {
      this.logger.debug?.('no set-cookie header', { label }, LOG_CONTEXT);
      return;
    }
    const pairs = raw
      .split(/,(?=[^;]+?=)/)
      .map((c) => c.split(';')[0].trim())
      .filter(Boolean);
    this.cookie = pairs.join('; ');
    this.logger.info?.('captured cookie', { label, cookie: this.cookie }, LOG_CONTEXT);
    this.emit('cookie', { cookie: this.cookie, label });
  }

  private headers(extra: Record<string, string> = {}): Record<string, string> {
    return this.cookie ? { ...extra, Cookie: this.cookie } : { ...extra };
  }

  private async request(
    label: string,
    path: string,
    init: RequestInit & { jsonBody?: unknown } = {},
  ): Promise<Response> {
    const url = `${this.baseUrl}${path}`;
    const { jsonBody, headers, ...rest } = init;
    const finalHeaders = this.headers(
      jsonBody !== undefined
        ? { 'Content-Type': 'application/json', ...(headers as any) }
        : { ...(headers as any) },
    );
    const body = jsonBody !== undefined ? JSON.stringify(jsonBody) : (init.body as any);
    const method = (rest.method ?? 'GET').toUpperCase();
    this.logger.info?.('request', { label, method, url, hasCookie: !!this.cookie }, LOG_CONTEXT);
    this.emit('request', { label, method, url, hasCookie: !!this.cookie });
    let response: Response;
    try {
      response = await fetch(url, {
        ...rest,
        credentials: 'include',
        headers: finalHeaders,
        body,
      });
    } catch (err) {
      this.logger.error?.('request failed', { label, url, error: err }, LOG_CONTEXT);
      this.emit('error', { label, error: err });
      throw err;
    }
    this.logger.info?.(
      'response',
      { label, status: response.status, ok: response.ok },
      LOG_CONTEXT,
    );
    this.emit('response', { label, status: response.status, ok: response.ok, url });
    this.captureCookie(response, label);
    return response;
  }

  private async readJson(response: Response): Promise<unknown> {
    const text = await response.text();
    if (!text) return null;
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  }

  private async ensureOk(response: Response, label: string): Promise<unknown> {
    const body = await this.readJson(response);
    if (!response.ok) {
      const message =
        (body && typeof body === 'object' && (body as any).message) ||
        (typeof body === 'string' ? body : '') ||
        response.statusText ||
        'Request failed';
      const text = Array.isArray(message) ? message.join(', ') : String(message);
      const error = new ChessGatewayError(
        `${label} (${response.status}): ${text}`,
        response.status,
        body,
      );
      this.emit('error', { label, error });
      throw error;
    }
    return body;
  }

  /** GET /v1/link/session */
  async getSession(): Promise<LinkSessionData | null> {
    const response = await this.request('getSession', '/v1/link/session');
    if (!response.ok) {
      this.emit('session', null);
      return null;
    }
    const data = (await this.readJson(response)) as LinkSessionData | null;
    this.emit('session', data);
    return data;
  }

  /** POST /v1/link/auth/email-otp/send-verification-otp */
  async sendOtp(email: string): Promise<void> {
    const response = await this.request(
      'sendOtp',
      '/v1/link/auth/email-otp/send-verification-otp',
      {
        method: 'POST',
        jsonBody: { email, type: 'sign-in' },
      },
    );
    await this.ensureOk(response, 'Failed to send OTP');
    this.emit('otpSent', { email });
  }

  /** POST /v1/link/auth/sign-in/email-otp */
  async verifyOtp(email: string, otp: string): Promise<void> {
    const response = await this.request('verifyOtp', '/v1/link/auth/sign-in/email-otp', {
      method: 'POST',
      jsonBody: { email, otp },
    });
    await this.ensureOk(response, 'Invalid OTP');
    this.emit('otpVerified', { email });
  }

  /** POST /v1/link/auth/sign-in/social */
  async signInSocial(provider: string, callbackURL: string): Promise<SocialSignInResult> {
    const response = await this.request('signInSocial', '/v1/link/auth/sign-in/social', {
      method: 'POST',
      jsonBody: { provider, callbackURL },
    });
    const result = (await this.ensureOk(response, 'Social sign-in failed')) as SocialSignInResult;
    this.emit('signedInSocial', { provider, result });
    return result;
  }

  /** GET /v1/link/challenge?address=... */
  async getChallenge(address: string): Promise<LinkChallenge> {
    const response = await this.request(
      'getChallenge',
      `/v1/link/challenge?address=${encodeURIComponent(address)}`,
    );
    const data = (await this.ensureOk(response, 'Challenge failed')) as LinkChallenge;
    this.emit('challenge', { address, challenge: data?.challenge });
    return data;
  }

  /** POST /v1/link/response */
  async postLinkResponse(body: LinkResponseBody): Promise<unknown> {
    const response = await this.request('postLinkResponse', '/v1/link/response', {
      method: 'POST',
      jsonBody: body,
    });
    const data = await this.ensureOk(response, 'Linking Failed');
    this.emit('linkResponse', { walletAddress: body.walletAddress, response: data });
    return data;
  }
}

/** Default singleton client used across the app. */
export const chessGateway = new ChessGatewayClient();
