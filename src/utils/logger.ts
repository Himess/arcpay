/**
 * Structured Logging System
 *
 * Features:
 * - Structured JSON logging with pino
 * - Log levels (trace, debug, info, warn, error, fatal)
 * - Contextual logging with child loggers
 * - Transaction correlation
 * - Performance timing
 * - Sensitive data redaction
 * - Log rotation support
 */

import pino from 'pino';
import { ArcPayError } from './errors';

/**
 * Log levels
 */
export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';

/**
 * Logger configuration
 */
export interface LoggerConfig {
  /** Log level */
  level?: LogLevel;
  /** Application name */
  name?: string;
  /** Enable pretty printing (for development) */
  pretty?: boolean;
  /** Additional base context */
  context?: Record<string, unknown>;
  /** Redact sensitive fields */
  redact?: string[];
  /** Destination (file path or stream) */
  destination?: string | NodeJS.WritableStream;
}

/**
 * Default fields to redact
 */
const DEFAULT_REDACT_PATHS = [
  'privateKey',
  'secret',
  'password',
  'token',
  'apiKey',
  'authorization',
  'cookie',
  'mnemonic',
  'seed',
  'seedPhrase',
  '*.privateKey',
  '*.secret',
  '*.password',
  '*.token',
  '*.apiKey',
];

/**
 * Create pino logger instance
 */
function createPinoLogger(config: LoggerConfig): pino.Logger {
  const redactPaths = [...DEFAULT_REDACT_PATHS, ...(config.redact || [])];

  const baseOptions: pino.LoggerOptions = {
    name: config.name || 'arcpay',
    level: config.level || 'info',
    redact: {
      paths: redactPaths,
      censor: '[REDACTED]',
    },
    base: {
      env: process.env.NODE_ENV || 'development',
      ...config.context,
    },
    timestamp: pino.stdTimeFunctions.isoTime,
    formatters: {
      level: (label) => ({ level: label }),
      bindings: (bindings) => ({
        pid: bindings.pid,
        hostname: bindings.hostname,
        name: bindings.name,
      }),
    },
    serializers: {
      error: pino.stdSerializers.err,
      err: pino.stdSerializers.err,
      req: pino.stdSerializers.req,
      res: pino.stdSerializers.res,
    },
  };

  if (config.pretty) {
    return pino({
      ...baseOptions,
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
        },
      },
    });
  }

  if (config.destination) {
    if (typeof config.destination === 'string') {
      return pino(baseOptions, pino.destination(config.destination));
    }
    return pino(baseOptions, config.destination);
  }

  return pino(baseOptions);
}

/**
 * Logger class with enhanced functionality
 */
export class Logger {
  private pino: pino.Logger;
  private correlationId?: string;
  private module?: string;

  constructor(config: LoggerConfig = {}) {
    this.pino = createPinoLogger(config);
  }

  /**
   * Create a child logger with additional context
   */
  child(context: Record<string, unknown>): Logger {
    const childLogger = new Logger();
    childLogger.pino = this.pino.child(context);
    childLogger.correlationId = this.correlationId;
    childLogger.module = this.module;
    return childLogger;
  }

  /**
   * Create a module-specific logger
   */
  forModule(moduleName: string): Logger {
    const moduleLogger = this.child({ module: moduleName });
    moduleLogger.module = moduleName;
    return moduleLogger;
  }

  /**
   * Set correlation ID for request tracing
   */
  withCorrelation(correlationId: string): Logger {
    const correlatedLogger = this.child({ correlationId });
    correlatedLogger.correlationId = correlationId;
    return correlatedLogger;
  }

  /**
   * Set transaction context
   */
  withTransaction(txHash: string, from?: string, to?: string): Logger {
    return this.child({
      transaction: {
        hash: txHash,
        from,
        to,
      },
    });
  }

  /**
   * Trace level logging
   */
  trace(msg: string, data?: Record<string, unknown>): void {
    this.pino.trace(data || {}, msg);
  }

  /**
   * Debug level logging
   */
  debug(msg: string, data?: Record<string, unknown>): void {
    this.pino.debug(data || {}, msg);
  }

  /**
   * Info level logging
   */
  info(msg: string, data?: Record<string, unknown>): void {
    this.pino.info(data || {}, msg);
  }

  /**
   * Warn level logging
   */
  warn(msg: string, data?: Record<string, unknown>): void {
    this.pino.warn(data || {}, msg);
  }

  /**
   * Error level logging
   */
  error(msg: string, error?: Error | ArcPayError | unknown, data?: Record<string, unknown>): void {
    const errorData = this.formatError(error);
    this.pino.error({ ...data, ...errorData }, msg);
  }

  /**
   * Fatal level logging
   */
  fatal(msg: string, error?: Error | ArcPayError | unknown, data?: Record<string, unknown>): void {
    const errorData = this.formatError(error);
    this.pino.fatal({ ...data, ...errorData }, msg);
  }

  /**
   * Log an ArcPay error with full context
   */
  logError(error: ArcPayError): void {
    const level = error.retryable ? 'warn' : 'error';
    this.pino[level](
      {
        error: {
          name: error.name,
          code: error.code,
          category: error.category,
          message: error.message,
          stack: error.stack,
          retryable: error.retryable,
          recovery: error.recovery,
          metadata: error.metadata,
          cause: error.cause instanceof Error ? error.cause.message : undefined,
        },
      },
      `ArcPay Error: ${error.message}`
    );
  }

  /**
   * Start a timer for performance logging
   */
  startTimer(operation: string): () => void {
    const start = Date.now();
    return () => {
      const duration = Date.now() - start;
      this.pino.info(
        {
          operation,
          duration,
          durationMs: duration,
        },
        `${operation} completed`
      );
    };
  }

  /**
   * Time an async operation
   */
  async time<T>(operation: string, fn: () => Promise<T>): Promise<T> {
    const start = Date.now();
    try {
      const result = await fn();
      const duration = Date.now() - start;
      this.pino.info(
        {
          operation,
          duration,
          success: true,
        },
        `${operation} completed successfully`
      );
      return result;
    } catch (error) {
      const duration = Date.now() - start;
      this.pino.error(
        {
          operation,
          duration,
          success: false,
          ...this.formatError(error),
        },
        `${operation} failed`
      );
      throw error;
    }
  }

  /**
   * Log blockchain transaction
   */
  logTransaction(
    action: 'send' | 'confirm' | 'fail',
    txData: {
      hash: string;
      from: string;
      to: string;
      value?: string;
      gasUsed?: string;
      blockNumber?: number;
      error?: string;
    }
  ): void {
    const level = action === 'fail' ? 'error' : 'info';
    this.pino[level](
      {
        type: 'transaction',
        action,
        transaction: txData,
      },
      `Transaction ${action}: ${txData.hash}`
    );
  }

  /**
   * Log smart contract interaction
   */
  logContractCall(
    contract: string,
    method: string,
    args: unknown[],
    result?: unknown,
    error?: unknown
  ): void {
    const level = error ? 'error' : 'debug';
    this.pino[level](
      {
        type: 'contract_call',
        contract,
        method,
        args,
        result: error ? undefined : result,
        ...this.formatError(error),
      },
      `Contract call: ${contract}.${method}`
    );
  }

  /**
   * Log API request/response
   */
  logApiCall(
    direction: 'request' | 'response',
    data: {
      method: string;
      url: string;
      status?: number;
      duration?: number;
      error?: unknown;
    }
  ): void {
    const level = data.error || (data.status && data.status >= 400) ? 'error' : 'info';
    this.pino[level](
      {
        type: 'api_call',
        direction,
        ...data,
        ...this.formatError(data.error),
      },
      `API ${direction}: ${data.method} ${data.url}`
    );
  }

  /**
   * Log stream payment event
   */
  logStreamEvent(
    event: 'create' | 'start' | 'pause' | 'resume' | 'claim' | 'cancel' | 'complete',
    streamData: {
      streamId: string;
      sender: string;
      recipient: string;
      amount?: string;
      claimedAmount?: string;
    }
  ): void {
    this.pino.info(
      {
        type: 'stream_event',
        event,
        stream: streamData,
      },
      `Stream ${event}: ${streamData.streamId}`
    );
  }

  /**
   * Log escrow event
   */
  logEscrowEvent(
    event: 'create' | 'fund' | 'release' | 'refund' | 'dispute' | 'resolve',
    escrowData: {
      escrowId: string;
      depositor: string;
      beneficiary: string;
      amount?: string;
      reason?: string;
    }
  ): void {
    this.pino.info(
      {
        type: 'escrow_event',
        event,
        escrow: escrowData,
      },
      `Escrow ${event}: ${escrowData.escrowId}`
    );
  }

  /**
   * Log compliance check
   */
  logComplianceCheck(
    checkType: 'kyc' | 'aml' | 'sanctions',
    result: {
      address: string;
      passed: boolean;
      score?: number;
      reason?: string;
    }
  ): void {
    const level = result.passed ? 'info' : 'warn';
    this.pino[level](
      {
        type: 'compliance_check',
        checkType,
        ...result,
      },
      `Compliance ${checkType} check: ${result.passed ? 'passed' : 'failed'} for ${result.address}`
    );
  }

  /**
   * Get the underlying pino logger
   */
  getPino(): pino.Logger {
    return this.pino;
  }

  /**
   * Flush logs (for shutdown)
   */
  flush(): void {
    this.pino.flush();
  }

  private formatError(error: unknown): Record<string, unknown> {
    if (!error) {
      return {};
    }

    if (error instanceof ArcPayError) {
      return {
        error: {
          name: error.name,
          code: error.code,
          category: error.category,
          message: error.message,
          stack: error.stack,
          retryable: error.retryable,
          recovery: error.recovery,
          metadata: error.metadata,
        },
      };
    }

    if (error instanceof Error) {
      return {
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack,
        },
      };
    }

    return {
      error: {
        message: String(error),
      },
    };
  }
}

/**
 * Default logger instance
 */
export const defaultLogger = new Logger({
  level: (process.env.LOG_LEVEL as LogLevel) || 'info',
  pretty: process.env.NODE_ENV !== 'production',
});

/**
 * Module-specific loggers
 */
export const loggers = {
  streaming: defaultLogger.forModule('streaming'),
  intent: defaultLogger.forModule('intent'),
  privacy: defaultLogger.forModule('privacy'),
  combo: defaultLogger.forModule('combo'),
  escrow: defaultLogger.forModule('escrow'),
  channels: defaultLogger.forModule('channels'),
  gasStation: defaultLogger.forModule('gas-station'),
  smartWallet: defaultLogger.forModule('smart-wallet'),
  aiWallet: defaultLogger.forModule('ai-wallet'),
  compliance: defaultLogger.forModule('compliance'),
};

/**
 * Create a new logger with custom configuration
 */
export function createLogger(config: LoggerConfig): Logger {
  return new Logger(config);
}

export default {
  Logger,
  defaultLogger,
  loggers,
  createLogger,
};
