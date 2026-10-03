import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  redact: {
    paths: [
      'apiKey',
      'LLM_API_KEY',
      'authorization',
      'DATABASE_URL',
      'DIRECT_URL',
      'headers.authorization',
      '*.apiKey',
      '*.LLM_API_KEY',
      '*.authorization',
      '*.DATABASE_URL',
      '*.DIRECT_URL',
      '*.headers.authorization',
    ],
    censor: '[REDACTED]',
  },
  formatters: {
    level: (label) => ({ level: label }),
  },
  base: {
    env: process.env.NODE_ENV || 'development',
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});

export interface LogContext {
  requestId?: string;
  releaseId?: string;
  versionNum?: number;
  stepName?: string;
  model?: string;
  latencyMs?: number;
  tokensUsed?: number;
  success?: boolean;
  validationErrors?: unknown;
  error?: string;
  [key: string]: unknown;
}

export function logStep(message: string, context: LogContext) {
  // Sanitize context as secondary guard
  const sanitizedContext = { ...context };
  delete sanitizedContext.LLM_API_KEY;
  delete sanitizedContext.apiKey;
  delete sanitizedContext.api_key;
  delete sanitizedContext.authorization;
  delete sanitizedContext.DATABASE_URL;
  delete sanitizedContext.DIRECT_URL;
  delete sanitizedContext.secret;
  delete sanitizedContext.token;

  if (context.success === false || context.error) {
    logger.error(sanitizedContext, message);
  } else {
    logger.info(sanitizedContext, message);
  }
}
