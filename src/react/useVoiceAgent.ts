/**
 * useVoiceAgent Hook
 *
 * React hook for voice-enabled payment processing.
 * Combines speech recognition with Gemini 3.0 Flash for hands-free payments.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { VoiceEnabledAgent, createVoiceAgent } from '../voice/voice-agent';
import type { VoiceEnabledAgentConfig } from '../voice/voice-agent';
import type { AICommandResult } from '../ai/types';

export interface UseVoiceAgentOptions extends VoiceEnabledAgentConfig {}

export interface UseVoiceAgentReturn {
  isListening: boolean;
  isProcessing: boolean;
  isSpeaking: boolean;
  lastResult: AICommandResult | null;
  pendingConfirmation: string | null;
  error: string | null;
  isVoiceAvailable: boolean;

  // Voice actions
  startListening: () => Promise<AICommandResult>;
  stopListening: () => void;
  speak: (text: string) => Promise<void>;

  // Text actions (fallback)
  processCommand: (command: string) => Promise<AICommandResult>;
  processWithImage: (command: string, imageBase64: string, mimeType?: string) => Promise<AICommandResult>;

  // Confirmation
  confirm: () => Promise<AICommandResult>;
  cancel: () => void;

  // Agent
  agent: VoiceEnabledAgent | null;
  address: string | null;
}

export function useVoiceAgent(config: UseVoiceAgentOptions): UseVoiceAgentReturn {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [lastResult, setLastResult] = useState<AICommandResult | null>(null);
  const [pendingConfirmation, setPendingConfirmation] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isVoiceAvailable, setIsVoiceAvailable] = useState(false);
  const [address, setAddress] = useState<string | null>(null);

  const agentRef = useRef<VoiceEnabledAgent | null>(null);

  useEffect(() => {
    if (config.privateKey && config.geminiApiKey) {
      agentRef.current = createVoiceAgent(config);
      setIsVoiceAvailable(agentRef.current.isVoiceAvailable());
      agentRef.current.getAddress().then(setAddress);
    }
  }, [config.privateKey, config.geminiApiKey]);

  const startListening = useCallback(async (): Promise<AICommandResult> => {
    if (!agentRef.current) {
      return { success: false, action: 'error', message: 'Agent not initialized' };
    }

    setIsListening(true);
    setIsProcessing(true);
    setError(null);

    try {
      const result = await agentRef.current.executeVoiceCommand();
      setLastResult(result);

      if (result.needsConfirmation) {
        setPendingConfirmation(result.confirmationPrompt || null);
      }

      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Voice command failed';
      setError(message);
      return { success: false, action: 'error', message };
    } finally {
      setIsListening(false);
      setIsProcessing(false);
    }
  }, []);

  const stopListening = useCallback(() => {
    agentRef.current?.stopContinuousListening();
    setIsListening(false);
  }, []);

  const speak = useCallback(async (text: string): Promise<void> => {
    if (!agentRef.current) return;

    setIsSpeaking(true);
    try {
      await agentRef.current.getSynthesizer().speak(text);
    } finally {
      setIsSpeaking(false);
    }
  }, []);

  const processCommand = useCallback(async (command: string): Promise<AICommandResult> => {
    if (!agentRef.current) {
      return { success: false, action: 'error', message: 'Agent not initialized' };
    }

    setIsProcessing(true);
    setError(null);

    try {
      const result = await agentRef.current.executeTextCommand(command);
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
      const result = await agentRef.current.processImage(imageBase64, command, mimeType);
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
      const result = await agentRef.current.confirmPendingAction();
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
    agentRef.current?.getAIAgent().cancelPendingAction();
    setPendingConfirmation(null);
  }, []);

  return {
    isListening,
    isProcessing,
    isSpeaking,
    lastResult,
    pendingConfirmation,
    error,
    isVoiceAvailable,
    startListening,
    stopListening,
    speak,
    processCommand,
    processWithImage,
    confirm,
    cancel,
    agent: agentRef.current,
    address
  };
}
