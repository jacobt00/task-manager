import { request, type APIRequestContext, type APIResponse } from '@playwright/test';

export type StorageState = Awaited<ReturnType<APIRequestContext['storageState']>>;
type FetchOptions = NonNullable<Parameters<APIRequestContext['fetch']>[1]>;

/**
 * One user's connection to the app: its own cookie jar, plus a record of
 * every response it received. Adapters must send all requests through
 * `fetch()` so the tests can inspect cookies and response bodies.
 */
export class Session {
  /** Raw body of every response this session received, in order (redirects included). */
  readonly responseBodies: string[] = [];
  /** Raw Set-Cookie header values of every response this session received, in order. */
  readonly setCookieHeaders: string[] = [];

  private constructor(private readonly context: APIRequestContext, readonly baseURL: string) {}

  static async create(baseURL: string, storageState?: StorageState): Promise<Session> {
    const context = await request.newContext({ baseURL, storageState, ignoreHTTPSErrors: true });
    return new Session(context, baseURL);
  }

  /**
   * Sends a request and follows redirects one hop at a time, so the
   * Set-Cookie headers and bodies of intermediate responses are recorded too.
   */
  async fetch(url: string, options: FetchOptions = {}): Promise<APIResponse> {
    let response = await this.context.fetch(url, { ...options, maxRedirects: 0 });
    await this.record(response);
    for (let hop = 0; hop < 10 && response.status() >= 300 && response.status() < 400; hop++) {
      const location = response.headers()['location'];
      if (!location) break;
      const next = new URL(location, response.url()).toString();
      const keepMethod = response.status() === 307 || response.status() === 308;
      response = await this.context.fetch(next, keepMethod ? { ...options, maxRedirects: 0 } : { method: 'GET', maxRedirects: 0 });
      await this.record(response);
    }
    return response;
  }

  storageState(): Promise<StorageState> {
    return this.context.storageState();
  }

  dispose(): Promise<void> {
    return this.context.dispose();
  }

  private async record(response: APIResponse): Promise<void> {
    for (const header of response.headersArray()) {
      if (header.name.toLowerCase() === 'set-cookie') this.setCookieHeaders.push(header.value);
    }
    this.responseBodies.push(await response.text().catch(() => ''));
  }
}
