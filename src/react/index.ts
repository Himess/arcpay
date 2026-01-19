/**
 * ArcPay React Hooks
 *
 * React hooks for seamless integration of ArcPay in React/Next.js apps.
 *
 * @example
 * ```tsx
 * import { ArcPayProvider, useArcPay, useEscrow, useStream } from 'arcpay/react';
 *
 * function App() {
 *   return (
 *     <ArcPayProvider privateKey={process.env.NEXT_PUBLIC_PRIVATE_KEY}>
 *       <PaymentButton />
 *     </ArcPayProvider>
 *   );
 * }
 *
 * function PaymentButton() {
 *   const { pay, balance, loading } = useArcPay();
 *
 *   return (
 *     <button onClick={() => pay('0x...', '10')} disabled={loading}>
 *       Pay 10 USDC (Balance: {balance})
 *     </button>
 *   );
 * }
 * ```
 */

// Note: This module requires React as a peer dependency
// Users must have React 18+ installed

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { ArcPayClient } from '../client';
import { createEscrowManager, type EscrowManager, type Escrow } from '../modules/escrow';
import { createPaymentChannelManager, type PaymentChannelManager, type PaymentChannel } from '../modules/channels';
import { createStreamManager, type StreamManager, type Stream } from '../modules/streams';
import { createPrivacyModule, type PrivacyModule } from '../modules/privacy';
import { createAgent, type ArcPayAgent } from '../agent';

// ============================================
// TYPES
// ============================================

export interface ArcPayContextValue {
  client: ArcPayClient | null;
  escrow: EscrowManager | null;
  channels: PaymentChannelManager | null;
  streams: StreamManager | null;
  privacy: PrivacyModule | null;
  agent: ArcPayAgent | null;
  isConnected: boolean;
  address: string | null;
  balance: string | null;
  loading: boolean;
  error: Error | null;
}

export interface ArcPayProviderProps {
  children: ReactNode;
  privateKey?: string;
  network?: 'arc-testnet' | 'arc-mainnet';
  agentConfig?: {
    name?: string;
    budget?: {
      daily?: string;
      perTransaction?: string;
    };
  };
}

// ============================================
// CONTEXT
// ============================================

const ArcPayContext = createContext<ArcPayContextValue | null>(null);

/**
 * ArcPay Provider
 *
 * Wrap your app with this provider to enable ArcPay hooks.
 *
 * @example
 * ```tsx
 * <ArcPayProvider privateKey={privateKey}>
 *   <App />
 * </ArcPayProvider>
 * ```
 */
export function ArcPayProvider({
  children,
  privateKey,
  network = 'arc-testnet',
  agentConfig,
}: ArcPayProviderProps) {
  const [state, setState] = useState<ArcPayContextValue>({
    client: null,
    escrow: null,
    channels: null,
    streams: null,
    privacy: null,
    agent: null,
    isConnected: false,
    address: null,
    balance: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    if (!privateKey) {
      setState((prev) => ({ ...prev, loading: false }));
      return;
    }

    try {
      const client = new ArcPayClient({ network, privateKey });
      const escrow = createEscrowManager({ privateKey });
      const channels = createPaymentChannelManager({ privateKey });
      const streams = createStreamManager({ privateKey });
      const privacy = createPrivacyModule({ privateKey });
      const agent = createAgent({
        privateKey,
        name: agentConfig?.name,
        budget: agentConfig?.budget,
      });

      // Get initial balance
      client.getBalance().then((result) => {
        setState({
          client,
          escrow,
          channels,
          streams,
          privacy,
          agent,
          isConnected: true,
          address: result.address,
          balance: result.usdc,
          loading: false,
          error: null,
        });
      });
    } catch (error) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error : new Error('Failed to initialize ArcPay'),
      }));
    }
  }, [privateKey, network, agentConfig?.name, agentConfig?.budget]);

  return <ArcPayContext.Provider value={state}>{children}</ArcPayContext.Provider>;
}

/**
 * Get ArcPay context
 */
function useArcPayContext(): ArcPayContextValue {
  const context = useContext(ArcPayContext);
  if (!context) {
    throw new Error('useArcPay must be used within an ArcPayProvider');
  }
  return context;
}

// ============================================
// MAIN HOOK
// ============================================

export interface UseArcPayReturn {
  // State
  isConnected: boolean;
  address: string | null;
  balance: string | null;
  loading: boolean;
  error: Error | null;

  // Actions
  pay: (to: string, amount: string) => Promise<{ txHash: string }>;
  refreshBalance: () => Promise<void>;
}

/**
 * Main ArcPay hook for payments and balance
 *
 * @example
 * ```tsx
 * function PaymentButton() {
 *   const { pay, balance, loading, error } = useArcPay();
 *
 *   const handlePay = async () => {
 *     const { txHash } = await pay('0x...', '10');
 *     console.log('Paid!', txHash);
 *   };
 *
 *   return (
 *     <div>
 *       <p>Balance: {balance} USDC</p>
 *       <button onClick={handlePay} disabled={loading}>
 *         Pay 10 USDC
 *       </button>
 *       {error && <p>Error: {error.message}</p>}
 *     </div>
 *   );
 * }
 * ```
 */
export function useArcPay(): UseArcPayReturn {
  const context = useArcPayContext();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [balance, setBalance] = useState<string | null>(context.balance);

  const pay = useCallback(
    async (to: string, amount: string) => {
      if (!context.client) throw new Error('ArcPay not initialized');

      setLoading(true);
      setError(null);

      try {
        const result = await context.client.transfer({ to, amount });
        // Refresh balance after payment
        const newBalance = await context.client.getBalance();
        setBalance(newBalance.usdc);
        return { txHash: result.txHash };
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Payment failed');
        setError(error);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [context.client]
  );

  const refreshBalance = useCallback(async () => {
    if (!context.client) return;

    try {
      const result = await context.client.getBalance();
      setBalance(result.usdc);
    } catch (err) {
      console.error('Failed to refresh balance:', err);
    }
  }, [context.client]);

  return {
    isConnected: context.isConnected,
    address: context.address,
    balance: balance ?? context.balance,
    loading: loading || context.loading,
    error: error || context.error,
    pay,
    refreshBalance,
  };
}

// ============================================
// ESCROW HOOK
// ============================================

export interface UseEscrowReturn {
  // State
  escrows: Escrow[];
  loading: boolean;
  error: Error | null;

  // Actions
  create: (beneficiary: string, amount: string, options?: { description?: string; deadline?: string }) => Promise<Escrow>;
  fund: (escrowId: string) => Promise<void>;
  release: (escrowId: string) => Promise<void>;
  refund: (escrowId: string) => Promise<void>;
  dispute: (escrowId: string, reason: string) => Promise<void>;
  refresh: () => Promise<void>;
}

/**
 * Hook for escrow management
 *
 * @example
 * ```tsx
 * function EscrowManager() {
 *   const { escrows, create, release, loading } = useEscrow();
 *
 *   const handleCreate = async () => {
 *     const escrow = await create('0x...', '500', {
 *       description: 'Website development'
 *     });
 *     console.log('Created escrow:', escrow.id);
 *   };
 *
 *   return (
 *     <div>
 *       <button onClick={handleCreate}>Create Escrow</button>
 *       {escrows.map(e => (
 *         <div key={e.id}>
 *           {e.id} - {e.amount} USDC - {e.state}
 *           {e.state === 'funded' && (
 *             <button onClick={() => release(e.id)}>Release</button>
 *           )}
 *         </div>
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */
export function useEscrow(): UseEscrowReturn {
  const context = useArcPayContext();
  const [escrows, setEscrows] = useState<Escrow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const create = useCallback(
    async (beneficiary: string, amount: string, options?: { description?: string; deadline?: string }) => {
      if (!context.escrow || !context.address) throw new Error('ArcPay not initialized');

      setLoading(true);
      setError(null);

      try {
        const escrow = await context.escrow.createEscrow({
          depositor: context.address,
          beneficiary,
          amount,
          conditions: [{ type: 'approval', params: {}, isMet: false }],
          description: options?.description,
          expiresAt: options?.deadline,
        });

        setEscrows((prev) => [...prev, escrow]);
        return escrow;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to create escrow');
        setError(error);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [context.escrow, context.address]
  );

  const fund = useCallback(
    async (escrowId: string) => {
      if (!context.escrow) throw new Error('ArcPay not initialized');

      setLoading(true);
      try {
        await context.escrow.fundEscrow(escrowId);
        setEscrows((prev) =>
          prev.map((e) => (e.id === escrowId ? { ...e, state: 'funded' as const } : e))
        );
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fund escrow'));
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [context.escrow]
  );

  const release = useCallback(
    async (escrowId: string) => {
      if (!context.escrow) throw new Error('ArcPay not initialized');

      setLoading(true);
      try {
        await context.escrow.releaseEscrow(escrowId);
        setEscrows((prev) =>
          prev.map((e) => (e.id === escrowId ? { ...e, state: 'released' as const } : e))
        );
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to release escrow'));
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [context.escrow]
  );

  const refund = useCallback(
    async (escrowId: string) => {
      if (!context.escrow) throw new Error('ArcPay not initialized');

      setLoading(true);
      try {
        await context.escrow.refundEscrow(escrowId);
        setEscrows((prev) =>
          prev.map((e) => (e.id === escrowId ? { ...e, state: 'refunded' as const } : e))
        );
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to refund escrow'));
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [context.escrow]
  );

  const dispute = useCallback(
    async (escrowId: string, reason: string) => {
      if (!context.escrow) throw new Error('ArcPay not initialized');

      setLoading(true);
      try {
        await context.escrow.createDispute(escrowId, reason);
        setEscrows((prev) =>
          prev.map((e) => (e.id === escrowId ? { ...e, state: 'disputed' as const } : e))
        );
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to create dispute'));
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [context.escrow]
  );

  const refresh = useCallback(async () => {
    // Refresh escrow list from chain
    // For now, just return current state
  }, []);

  return { escrows, loading, error, create, fund, release, refund, dispute, refresh };
}

// ============================================
// STREAM HOOK
// ============================================

export interface UseStreamReturn {
  // State
  streams: Stream[];
  loading: boolean;
  error: Error | null;

  // Actions
  create: (recipient: string, amount: string, duration: number) => Promise<Stream>;
  claim: (streamId: string) => Promise<{ amount: string }>;
  cancel: (streamId: string) => Promise<void>;
  getClaimable: (streamId: string) => Promise<string>;
  refresh: () => Promise<void>;
}

/**
 * Hook for streaming payments
 *
 * @example
 * ```tsx
 * function SalaryStream() {
 *   const { streams, create, claim } = useStream();
 *
 *   const startSalary = async () => {
 *     await create('0x...', '5000', 30 * 24 * 60 * 60); // 30 days
 *   };
 *
 *   return (
 *     <div>
 *       <button onClick={startSalary}>Start Salary Stream</button>
 *       {streams.map(s => (
 *         <div key={s.id}>
 *           Streaming {s.totalAmount} USDC
 *           <button onClick={() => claim(s.id)}>Claim</button>
 *         </div>
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */
export function useStream(): UseStreamReturn {
  const context = useArcPayContext();
  const [streams, setStreams] = useState<Stream[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const create = useCallback(
    async (recipient: string, amount: string, duration: number) => {
      if (!context.streams) throw new Error('ArcPay not initialized');

      setLoading(true);
      setError(null);

      try {
        const stream = await context.streams.createStream({
          recipient,
          totalAmount: amount,
          duration,
        });

        setStreams((prev) => [...prev, stream]);
        return stream;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to create stream');
        setError(error);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [context.streams]
  );

  const claim = useCallback(
    async (streamId: string) => {
      if (!context.streams) throw new Error('ArcPay not initialized');

      setLoading(true);
      try {
        const result = await context.streams.claim(streamId);
        return { amount: result.amountClaimed };
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to claim'));
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [context.streams]
  );

  const cancel = useCallback(
    async (streamId: string) => {
      if (!context.streams) throw new Error('ArcPay not initialized');

      setLoading(true);
      try {
        await context.streams.cancelStream(streamId);
        setStreams((prev) =>
          prev.map((s) => (s.id === streamId ? { ...s, state: 'cancelled' as const } : s))
        );
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to cancel stream'));
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [context.streams]
  );

  const getClaimable = useCallback(
    async (streamId: string) => {
      if (!context.streams) throw new Error('ArcPay not initialized');

      const result = await context.streams.getClaimable(streamId);
      return result.claimable;
    },
    [context.streams]
  );

  const refresh = useCallback(async () => {
    // Refresh streams from chain
  }, []);

  return { streams, loading, error, create, claim, cancel, getClaimable, refresh };
}

// ============================================
// CHANNEL HOOK
// ============================================

export interface UseChannelReturn {
  // State
  channels: PaymentChannel[];
  loading: boolean;
  error: Error | null;

  // Actions
  open: (recipient: string, deposit: string) => Promise<PaymentChannel>;
  pay: (channelId: string, amount: string) => Promise<{ receipt: string }>;
  close: (channelId: string) => Promise<void>;
  refresh: () => Promise<void>;
}

/**
 * Hook for payment channels (micro-payments)
 *
 * @example
 * ```tsx
 * function MicroPayments() {
 *   const { channels, open, pay } = useChannel();
 *
 *   const openChannel = async () => {
 *     await open('0x...', '10'); // 10 USDC deposit
 *   };
 *
 *   const micropay = async (channelId: string) => {
 *     await pay(channelId, '0.001'); // Instant, no gas!
 *   };
 *
 *   return (
 *     <div>
 *       <button onClick={openChannel}>Open Channel</button>
 *       {channels.map(c => (
 *         <div key={c.id}>
 *           Channel: {c.balance} USDC remaining
 *           <button onClick={() => micropay(c.id)}>Pay 0.001</button>
 *         </div>
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */
export function useChannel(): UseChannelReturn {
  const context = useArcPayContext();
  const [channels, setChannels] = useState<PaymentChannel[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const open = useCallback(
    async (recipient: string, deposit: string) => {
      if (!context.channels) throw new Error('ArcPay not initialized');

      setLoading(true);
      setError(null);

      try {
        const channel = await context.channels.createChannel({ recipient, deposit });
        setChannels((prev) => [...prev, channel]);
        return channel;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to open channel');
        setError(error);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [context.channels]
  );

  const pay = useCallback(
    async (channelId: string, amount: string) => {
      if (!context.channels) throw new Error('ArcPay not initialized');

      setLoading(true);
      try {
        const receipt = await context.channels.pay(channelId, amount);
        return { receipt: receipt.signature };
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to pay'));
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [context.channels]
  );

  const close = useCallback(
    async (channelId: string) => {
      if (!context.channels) throw new Error('ArcPay not initialized');

      setLoading(true);
      try {
        await context.channels.settleChannel(channelId);
        setChannels((prev) =>
          prev.map((c) => (c.id === channelId ? { ...c, state: 'closed' as const } : c))
        );
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to close channel'));
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [context.channels]
  );

  const refresh = useCallback(async () => {
    // Refresh channels from chain
  }, []);

  return { channels, loading, error, open, pay, close, refresh };
}

// ============================================
// PRIVACY HOOK
// ============================================

export interface UsePrivacyReturn {
  stealthAddress: string | null;
  loading: boolean;
  error: Error | null;
  payPrivate: (to: string, amount: string) => Promise<{ txHash: string }>;
  scanPayments: () => Promise<Array<{ amount: string; timestamp: number; claimed: boolean }>>;
}

/**
 * Hook for private payments using stealth addresses
 *
 * @example
 * ```tsx
 * function PrivatePayments() {
 *   const { stealthAddress, payPrivate, scanPayments } = usePrivacy();
 *
 *   return (
 *     <div>
 *       <p>Your stealth address: {stealthAddress}</p>
 *       <button onClick={() => payPrivate('st:arc:...', '100')}>
 *         Send Private Payment
 *       </button>
 *     </div>
 *   );
 * }
 * ```
 */
export function usePrivacy(): UsePrivacyReturn {
  const context = useArcPayContext();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const stealthAddress = context.privacy?.getStealthMetaAddress() || null;

  const payPrivate = useCallback(
    async (to: string, amount: string) => {
      if (!context.privacy) throw new Error('ArcPay not initialized');

      setLoading(true);
      setError(null);

      try {
        const result = await context.privacy.sendPrivate({ to, amount });
        return { txHash: result.txHash || '' };
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to send private payment');
        setError(error);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [context.privacy]
  );

  const scanPayments = useCallback(async () => {
    if (!context.privacy) throw new Error('ArcPay not initialized');

    const result = await context.privacy.scanAnnouncements();
    return result.payments.map((p) => ({
      amount: p.amount,
      timestamp: p.timestamp,
      claimed: p.claimed,
    }));
  }, [context.privacy]);

  return { stealthAddress, loading, error, payPrivate, scanPayments };
}

// ============================================
// AGENT HOOK
// ============================================

export interface UseAgentReturn {
  agent: ArcPayAgent | null;
  loading: boolean;
  error: Error | null;
  pay: (to: string, amount: string) => Promise<{ txHash: string }>;
  createTask: (config: {
    description: string;
    payment: string;
    worker: string;
    deadline?: string;
  }) => Promise<{ taskId: string }>;
  approveTask: (taskId: string) => Promise<void>;
  getSpendingReport: () => {
    totalSpent: string;
    remainingBudget: { daily: string };
  };
}

/**
 * Hook for AI Agent functionality
 *
 * @example
 * ```tsx
 * function AIAgent() {
 *   const { pay, createTask, approveTask, getSpendingReport } = useAgent();
 *
 *   const hireFreelancer = async () => {
 *     const { taskId } = await createTask({
 *       description: 'Write blog post',
 *       payment: '50',
 *       worker: '0x...',
 *       deadline: '48h'
 *     });
 *   };
 *
 *   return (
 *     <div>
 *       <p>Spent today: {getSpendingReport().totalSpent}</p>
 *       <button onClick={hireFreelancer}>Hire Freelancer</button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useAgent(): UseAgentReturn {
  const context = useArcPayContext();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const pay = useCallback(
    async (to: string, amount: string) => {
      if (!context.agent) throw new Error('ArcPay agent not initialized');

      setLoading(true);
      setError(null);

      try {
        return await context.agent.pay(to, amount);
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Payment failed');
        setError(error);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [context.agent]
  );

  const createTask = useCallback(
    async (config: { description: string; payment: string; worker: string; deadline?: string }) => {
      if (!context.agent) throw new Error('ArcPay agent not initialized');

      setLoading(true);
      try {
        const task = await context.agent.createTask(config);
        return { taskId: task.id };
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to create task'));
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [context.agent]
  );

  const approveTask = useCallback(
    async (taskId: string) => {
      if (!context.agent) throw new Error('ArcPay agent not initialized');

      setLoading(true);
      try {
        await context.agent.approveTask(taskId);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to approve task'));
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [context.agent]
  );

  const getSpendingReport = useCallback(() => {
    if (!context.agent) {
      return { totalSpent: '0', remainingBudget: { daily: '0' } };
    }
    const report = context.agent.getSpendingReport();
    return {
      totalSpent: report.totalSpent,
      remainingBudget: report.remainingBudget,
    };
  }, [context.agent]);

  return {
    agent: context.agent,
    loading,
    error,
    pay,
    createTask,
    approveTask,
    getSpendingReport,
  };
}

// ============================================
// AI & VOICE HOOKS
// ============================================

export { useAIAgent } from './useAIAgent';
export type { UseAIAgentOptions, UseAIAgentReturn } from './useAIAgent';

export { useMultimodal } from './useMultimodal';
export type { UseMultimodalOptions, UseMultimodalReturn } from './useMultimodal';

export { useVoiceAgent } from './useVoiceAgent';
export type { UseVoiceAgentOptions, UseVoiceAgentReturn } from './useVoiceAgent';

// ============================================
// REACT COMPONENTS
// ============================================

export { VoiceButton } from './VoiceButton';
export type { VoiceButtonProps, VoiceButtonState } from './VoiceButton';

export { ImagePayment } from './ImagePayment';
export type { ImagePaymentProps, AnalysisResult } from './ImagePayment';

// ============================================
// EXPORTS
// ============================================

export default {
  ArcPayProvider,
  useArcPay,
  useEscrow,
  useStream,
  useChannel,
  usePrivacy,
  useAgent,
  // AI & Voice hooks and components are exported separately
};
