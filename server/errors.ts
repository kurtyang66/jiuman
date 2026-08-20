export type ProviderErrorCode =
  | "CONFIGURATION_ERROR"
  | "NETWORK_ERROR"
  | "RATE_LIMITED"
  | "UPSTREAM_ERROR"
  | "INVALID_RESPONSE"
  | "INVALID_META_OUTPUT";

export type RateLimitSource = "OPENROUTER_PLATFORM" | "UPSTREAM_PROVIDER" | "UNKNOWN";

export type RateLimitDiagnostics = {
  source: RateLimitSource;
  provider_code?: string;
  retry_after_seconds?: number;
  "x-ratelimit-limit"?: string;
  "x-ratelimit-remaining"?: string;
  "x-ratelimit-reset"?: string;
};

export type OpenRouter404Classification =
  | "MODEL_NOT_FOUND"
  | "NO_COMPATIBLE_ENDPOINT"
  | "DATA_POLICY_NO_ENDPOINT"
  | "UNKNOWN_404";

export type OpenRouterErrorDiagnostics = {
  classification: OpenRouter404Classification;
  error_code?: number;
  error_message?: string;
  provider_name?: string;
  provider_code?: string;
};

export type ProviderDiagnostics = RateLimitDiagnostics | OpenRouterErrorDiagnostics;

export class ProviderError extends Error {
  readonly code: ProviderErrorCode;
  readonly status?: number;
  readonly retryable: boolean;
  readonly diagnostics?: ProviderDiagnostics;

  constructor(
    message: string,
    options: {
      code: ProviderErrorCode;
      status?: number;
      retryable?: boolean;
      cause?: unknown;
      diagnostics?: ProviderDiagnostics;
    },
  ) {
    super(message, { cause: options.cause });
    this.name = "ProviderError";
    this.code = options.code;
    this.status = options.status;
    this.retryable = options.retryable ?? false;
    this.diagnostics = options.diagnostics;
  }
}

export class ProviderConfigurationError extends ProviderError {
  constructor(message: string) {
    super(message, { code: "CONFIGURATION_ERROR" });
    this.name = "ProviderConfigurationError";
  }
}

export class ProviderResponseError extends ProviderError {
  constructor(
    message: string,
    options: {
      code?: "INVALID_RESPONSE" | "INVALID_META_OUTPUT";
      status?: number;
      cause?: unknown;
    } = {},
  ) {
    super(message, {
      code: options.code ?? "INVALID_RESPONSE",
      status: options.status,
      cause: options.cause,
    });
    this.name = "ProviderResponseError";
  }
}

export class ProviderRateLimitError extends ProviderError {
  readonly diagnostics: RateLimitDiagnostics;

  constructor(
    message: string,
    status = 429,
    diagnostics: RateLimitDiagnostics = { source: "UNKNOWN" },
  ) {
    super(message, { code: "RATE_LIMITED", status, retryable: true });
    this.name = "ProviderRateLimitError";
    this.diagnostics = Object.freeze({ ...diagnostics });
  }
}

export class ReplyOutputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ReplyOutputError";
  }
}
