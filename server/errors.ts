export type ProviderErrorCode =
  | "CONFIGURATION_ERROR"
  | "NETWORK_ERROR"
  | "RATE_LIMITED"
  | "UPSTREAM_ERROR"
  | "INVALID_RESPONSE"
  | "INVALID_META_OUTPUT";

export class ProviderError extends Error {
  readonly code: ProviderErrorCode;
  readonly status?: number;
  readonly retryable: boolean;

  constructor(
    message: string,
    options: {
      code: ProviderErrorCode;
      status?: number;
      retryable?: boolean;
      cause?: unknown;
    },
  ) {
    super(message, { cause: options.cause });
    this.name = "ProviderError";
    this.code = options.code;
    this.status = options.status;
    this.retryable = options.retryable ?? false;
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
  constructor(message: string, status = 429) {
    super(message, { code: "RATE_LIMITED", status, retryable: true });
    this.name = "ProviderRateLimitError";
  }
}

export class ReplyOutputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ReplyOutputError";
  }
}
