/**
 * Streaming module types - Real-time payment streaming
 */

/**
 * Stream configuration
 */
export interface StreamConfig {
  /** Target endpoint URL */
  endpoint: string;

  /** Payment rate */
  rate: {
    /** Amount per unit (e.g., "0.0001") */
    amount: string;
    /** Unit type */
    per: 'token' | 'second' | 'request' | 'kb';
  };

  /** Budget limits */
  budget: {
    /** Maximum total spend */
    max: string;
    /** Warn when reaching this amount */
    warningAt?: string;
  };

  /** Stream options */
  options?: {
    /** Batch settlement interval in ms (default: 5000) */
    settlementInterval?: number;
    /** Min amount before settling (default: "0.01") */
    minSettlementAmount?: string;
    /** Stop on budget exhaustion (default: true) */
    autoStop?: boolean;
  };
}

/**
 * Stream session state
 */
export interface StreamSession {
  /** Session ID */
  id: string;
  /** Target endpoint */
  endpoint: string;
  /** Session status */
  status: 'active' | 'paused' | 'stopped' | 'exhausted';
  /** Start timestamp */
  startedAt: string;

  /** Metering */
  usage: {
    /** Total units consumed */
    units: number;
    /** Unit type (token, second, etc.) */
    unitType: string;
  };

  /** Financials */
  billing: {
    /** Amount accrued (not yet settled) */
    accrued: string;
    /** Amount settled on-chain */
    settled: string;
    /** Total (accrued + settled) */
    total: string;
    /** Remaining budget */
    remaining: string;
  };

  /** Settlement history */
  settlements: SettlementRecord[];
}

/**
 * Settlement record
 */
export interface SettlementRecord {
  /** Timestamp */
  timestamp: string;
  /** Amount settled */
  amount: string;
  /** Transaction hash */
  txHash: string;
  /** Units covered by this settlement */
  units: number;
}

/**
 * Stream event callbacks
 */
export interface StreamEvents {
  /** Called for each unit received */
  onUnit: (unit: unknown, session: StreamSession) => void;
  /** Called when settlement occurs */
  onSettle: (record: SettlementRecord) => void;
  /** Called when approaching budget limit */
  onWarning: (message: string, session: StreamSession) => void;
  /** Called when budget exhausted */
  onExhausted: (session: StreamSession) => void;
  /** Called on error */
  onError: (error: Error) => void;
}

/**
 * Streamable response with controls
 */
export type StreamableResponse<T> = AsyncIterable<T> & {
  /** Current session state */
  session: StreamSession;
  /** Stop the stream and settle remaining */
  stop: () => Promise<StreamSession>;
  /** Pause the stream */
  pause: () => void;
  /** Resume the stream */
  resume: () => void;
  /** Get current status */
  getStatus: () => StreamSession;
};

/**
 * Metered request options
 */
export interface MeteredRequestOptions {
  /** Price for the request */
  price: string;
  /** HTTP method */
  method?: string;
  /** Request body */
  body?: unknown;
  /** Request headers */
  headers?: Record<string, string>;
}

/**
 * Metered request result
 */
export interface MeteredRequestResult<T> {
  /** Response data */
  data: T;
  /** Payment record */
  payment: SettlementRecord;
}
