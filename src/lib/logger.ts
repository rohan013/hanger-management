type LogLevel = 'info' | 'warn' | 'error';

function log(level: LogLevel, message: string, context?: Record<string, unknown>) {
  const entry = { level, message, ...(context && { context }) };
  if (level === 'error') console.error(JSON.stringify(entry));
  else if (level === 'warn') console.warn(JSON.stringify(entry));
  else console.log(JSON.stringify(entry));
}

export const logger = {
  info:  (msg: string, ctx?: Record<string, unknown>) => log('info', msg, ctx),
  warn:  (msg: string, ctx?: Record<string, unknown>) => log('warn', msg, ctx),
  error: (msg: string, ctx?: Record<string, unknown>) => log('error', msg, ctx),
};

export function serializeError(err: unknown): Record<string, unknown> {
  if (!(err instanceof Error)) return { message: String(err) };
  return {
    message: err.message,
    stack: err.stack,
    ...(err.cause != null ? { cause: err.cause instanceof Error ? err.cause.message : String(err.cause) } : {}),
  };
}
