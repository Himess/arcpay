/**
 * useAIAgent Hook
 *
 * React hook for AI-powered payment processing with Gemini 3.0 Flash.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { AIAgent, createAIAgent } from '../ai/ai-agent';
import type { AIAgentConfig, AICommandResult } from '../ai/types';

export interface UseAIAgentOptions extends AIAgentConfig {}

export interface UseAIAgentReturn {
  isProcessing: boolean;
  lastResult: AICommandResult | null;
  pendingConfirmation: string | null;
  error: string | null;
  processCommand: (command: string) => Promise<AICommandResult>;
  processWithImage: (command: string, imageBase64: string, mimeType?: string) => Promise<AICommandResult>;
  confirm: () => Promise<AICommandResult>;
  cancel: () => void;
  agent: AIAgent | null;
  address: string | null;
}

export function useAIAgent(config: UseAIAgentOptions): UseAIAgentReturn {
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastResult, setLastResult] = useState<AICommandResult | null>(null);
  const [pendingConfirmation, setPendingConfirmation] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [address, setAddress] = useState<string | null>(null);

  const agentRef = useRef<AIAgent | null>(null);

  useEffect(() => {
    if (config.privateKey && config.geminiApiKey) {
      agentRef.current = createAIAgent(config);
      agentRef.current.getAddress().then(setAddress);
    }
  }, [config.privateKey, config.geminiApiKey]);

  const processCommand = useCallback(async (command: string): Promise<AICommandResult> => {
    if (!agentRef.current) {
      return { success: false, action: 'error', message: 'Agent not initialized' };
    }

    setIsProcessing(true);
    setError(null);

    try {
      const result = await agentRef.current.processCommand(command);
      setLastResult(result);

      if (result.needsConfirmation) {
        setPendingConfirmation(result.confirmationPrompt || null);
      }

      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Command failed';
      setError(message);
      return { success: false, action: 'error', message };
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const processWithImage = useCallback(async (
    command: string,
    imageBase64: string,
    mimeType?: string
  ): Promise<AICommandResult> => {
    if (!agentRef.current) {
      return { success: false, action: 'error', message: 'Agent not initialized' };
    }

    setIsProcessing(true);
    setError(null);

    try {
      const result = await agentRef.current.processWithImage(command, imageBase64, mimeType);
      setLastResult(result);

      if (result.needsConfirmation) {
        setPendingConfirmation(result.confirmationPrompt || null);
      }

      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Image processing failed';
      setError(message);
      return { success: false, action: 'error', message };
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const confirm = useCallback(async (): Promise<AICommandResult> => {
    if (!agentRef.current) {
      return { success: false, action: 'error', message: 'Agent not initialized' };
    }

    setIsProcessing(true);
    setPendingConfirmation(null);

    try {
      const result = await agentRef.current.confirmExecution();
      setLastResult(result);
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Execution failed';
      setError(message);
      return { success: false, action: 'error', message };
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const cancel = useCallback(() => {
    agentRef.current?.cancelPendingAction();
    setPendingConfirmation(null);
  }, []);

  return {
    isProcessing,
    lastResult,
    pendingConfirmation,
    error,
    processCommand,
    processWithImage,
    confirm,
    cancel,
    agent: agentRef.current,
    address
  };
}
