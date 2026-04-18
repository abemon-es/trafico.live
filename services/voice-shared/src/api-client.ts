/**
 * Shared HTTP client for trafico.live API.
 * Used by both Alexa Lambda and Google Cloud Function handlers.
 * Stateless, Lambda-safe.
 */

const DEFAULT_TIMEOUT_MS = 3000;
const FALLBACK_MESSAGE = "No he podido consultar los datos ahora. Inténtalo en un momento.";

export interface ApiClientOptions {
  baseUrl?: string;
  apiKey?: string;
  timeoutMs?: number;
}

export class TraficoApiClient {
  private baseUrl: string;
  private apiKey: string;
  private timeoutMs: number;

  constructor(options: ApiClientOptions = {}) {
    this.baseUrl = options.baseUrl ?? process.env.TRAFICO_API_BASE ?? "https://trafico.live/api";
    this.apiKey = options.apiKey ?? process.env.TRAFICO_API_KEY ?? "";
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  }

  async get<T = unknown>(path: string, params: Record<string, string> = {}): Promise<T> {
    const url = new URL(`${this.baseUrl}${path}`);
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== "") {
        url.searchParams.set(key, value);
      }
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(url.toString(), {
        method: "GET",
        headers: {
          "x-api-key": this.apiKey,
          "Accept": "application/json",
          "User-Agent": "trafico-live-voice/1.0",
        },
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new ApiError(`HTTP ${response.status}`, response.status);
      }

      return response.json() as Promise<T>;
    } catch (err: unknown) {
      if (err instanceof ApiError) throw err;
      if (err instanceof Error && err.name === "AbortError") {
        throw new ApiError("Request timeout", 408);
      }
      throw new ApiError("Network error", 503);
    } finally {
      clearTimeout(timer);
    }
  }
}

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly ttsFallback: string = FALLBACK_MESSAGE,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/** Singleton factory — reuse across Lambda warm invocations */
let _client: TraficoApiClient | null = null;
export function getApiClient(): TraficoApiClient {
  if (!_client) {
    _client = new TraficoApiClient();
  }
  return _client;
}
