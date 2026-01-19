/**
 * useMultimodal Hook
 *
 * React hook for image-based payment processing.
 * Supports invoice analysis, receipt parsing, and delivery verification.
 */

import { useState, useCallback } from 'react';
import { useAIAgent } from './useAIAgent';
import type { AIAgentConfig, AICommandResult } from '../ai/types';

export interface UseMultimodalOptions extends AIAgentConfig {}

export interface UseMultimodalReturn {
  // AI Agent features
  isProcessing: boolean;
  lastResult: AICommandResult | null;
  pendingConfirmation: string | null;
  error: string | null;
  processCommand: (command: string) => Promise<AICommandResult>;
  processWithImage: (command: string, imageBase64: string, mimeType?: string) => Promise<AICommandResult>;
  confirm: () => Promise<AICommandResult>;
  cancel: () => void;
  address: string | null;

  // Image-specific features
  selectedImage: string | null;
  imagePreview: string | null;
  selectImage: (file: File) => Promise<string>;
  analyzeInvoice: () => Promise<AICommandResult>;
  verifyDelivery: (escrowId: string, expectedDelivery: string) => Promise<AICommandResult>;
  clearImage: () => void;
}

export function useMultimodal(config: UseMultimodalOptions): UseMultimodalReturn {
  const aiAgent = useAIAgent(config);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const selectImage = useCallback((file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1];
        setSelectedImage(base64);
        setImagePreview(result);
        resolve(base64);
      };

      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  }, []);

  const analyzeInvoice = useCallback(async (): Promise<AICommandResult> => {
    if (!selectedImage) {
      return { success: false, action: 'error', message: 'No image selected' };
    }

    return aiAgent.processWithImage('Pay this invoice', selectedImage);
  }, [selectedImage, aiAgent.processWithImage]);

  const verifyDelivery = useCallback(async (
    escrowId: string,
    expectedDelivery: string
  ): Promise<AICommandResult> => {
    if (!selectedImage) {
      return { success: false, action: 'error', message: 'No image selected' };
    }

    return aiAgent.processWithImage(
      `Verify delivery for escrow ${escrowId}. Expected: ${expectedDelivery}. Release if confirmed.`,
      selectedImage
    );
  }, [selectedImage, aiAgent.processWithImage]);

  const clearImage = useCallback(() => {
    setSelectedImage(null);
    setImagePreview(null);
  }, []);

  return {
    ...aiAgent,
    selectedImage,
    imagePreview,
    selectImage,
    analyzeInvoice,
    verifyDelivery,
    clearImage
  };
}
