export type LlmErrorCode =
  | 'PROMPT_TOO_LARGE'
  | 'RATE_LIMIT_EXCEEDED'
  | 'SERVICE_UNAVAILABLE'
  | 'NETWORK_TIMEOUT'
  | 'DEADLINE_EXCEEDED'
  | 'INVALID_MODEL_OUTPUT'
  | 'AUTH_ERROR'
  | 'INVALID_REQUEST'
  | 'SAFETY_BLOCK'
  | 'UNKNOWN_ERROR';

export interface LlmErrorPayload {
  code: LlmErrorCode;
  message: string;
  retryable: boolean;
  attempts: number;
  statusCode: number;
  details?: unknown;
}

export class LlmError extends Error {
  readonly code: LlmErrorCode;
  readonly retryable: boolean;
  readonly attempts: number;
  readonly statusCode: number;
  readonly details?: unknown;

  constructor(payload: LlmErrorPayload) {
    super(payload.message);
    this.name = 'LlmError';
    this.code = payload.code;
    this.retryable = payload.retryable;
    this.attempts = payload.attempts;
    this.statusCode = payload.statusCode;
    this.details = payload.details;
    Object.setPrototypeOf(this, LlmError.prototype);
  }

  toJSON() {
    return {
      error: {
        code: this.code,
        message: this.message,
        retryable: this.retryable,
        attempts: this.attempts,
      },
    };
  }
}

/**
 * Classifies an unknown thrown error into a typed LlmError configuration.
 */
export function classifyError(
  err: unknown,
  attempts = 1
): { code: LlmErrorCode; retryable: boolean; statusCode: number; message: string } {
  if (err instanceof LlmError) {
    return {
      code: err.code,
      retryable: err.retryable,
      statusCode: err.statusCode,
      message: err.message,
    };
  }

  const rawMessage = err instanceof Error ? err.message : String(err);
  const lowerMsg = rawMessage.toLowerCase();

  // 1. Rate limits & quota exhaustion
  if (
    lowerMsg.includes('429') ||
    lowerMsg.includes('resource_exhausted') ||
    lowerMsg.includes('quota') ||
    lowerMsg.includes('rate limit')
  ) {
    return {
      code: 'RATE_LIMIT_EXCEEDED',
      retryable: true,
      statusCode: 429,
      message: rawMessage,
    };
  }

  // 2. Network and transient server errors
  if (
    lowerMsg.includes('503') ||
    lowerMsg.includes('500') ||
    lowerMsg.includes('502') ||
    lowerMsg.includes('504') ||
    lowerMsg.includes('unavailable') ||
    lowerMsg.includes('econnreset') ||
    lowerMsg.includes('etimedout') ||
    lowerMsg.includes('enotfound') ||
    lowerMsg.includes('fetch failed') ||
    lowerMsg.includes('aborterror') ||
    lowerMsg.includes('aborted')
  ) {
    return {
      code: 'SERVICE_UNAVAILABLE',
      retryable: true,
      statusCode: 503,
      message: rawMessage,
    };
  }

  // 3. Authentication & credentials (fail fast)
  if (
    lowerMsg.includes('401') ||
    lowerMsg.includes('403') ||
    lowerMsg.includes('api_key') ||
    lowerMsg.includes('unauthenticated') ||
    lowerMsg.includes('permission_denied')
  ) {
    return {
      code: 'AUTH_ERROR',
      retryable: false,
      statusCode: 401,
      message: rawMessage,
    };
  }

  // 4. Safety or policy blocking (fail fast)
  if (
    lowerMsg.includes('safety') ||
    lowerMsg.includes('blocked') ||
    lowerMsg.includes('harm') ||
    lowerMsg.includes('blockreason')
  ) {
    return {
      code: 'SAFETY_BLOCK',
      retryable: false,
      statusCode: 422,
      message: rawMessage,
    };
  }

  // 5. Invalid arguments / bad requests (fail fast)
  if (
    lowerMsg.includes('400') ||
    lowerMsg.includes('invalid_argument') ||
    lowerMsg.includes('bad request')
  ) {
    return {
      code: 'INVALID_REQUEST',
      retryable: false,
      statusCode: 400,
      message: rawMessage,
    };
  }

  return {
    code: 'UNKNOWN_ERROR',
    retryable: false,
    statusCode: 500,
    message: rawMessage,
  };
}
