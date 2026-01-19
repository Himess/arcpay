/**
 * AI Module Types
 */

export interface GeminiConfig {
  apiKey: string;
  model?: string; // default: 'gemini-2.0-flash'
}

export interface GeminiFunctionResponse {
  type: 'function_call' | 'text';
  functionCalls: Array<{
    name: string;
    args: Record<string, unknown>;
  }> | null;
  text: string | null;
}

export interface InvoiceAnalysis {
  detected: boolean;
  amount?: string;
  currency?: string;
  recipient?: string;
  recipientName?: string;
  invoiceNumber?: string;
  dueDate?: string;
  description?: string;
  confidence: number;
  rawText?: string;
}

export interface ReceiptAnalysis {
  detected: boolean;
  merchant?: string;
  amount?: string;
  date?: string;
  items?: Array<{ name: string; price: string }>;
  paymentMethod?: string;
  confidence: number;
}

export interface DeliveryProofAnalysis {
  isDelivered: boolean;
  confidence: number;
  evidence: string[];
  recommendation: 'release' | 'hold' | 'review';
  reasoning: string;
}

export interface PaymentImageAnalysis {
  imageType: 'invoice' | 'receipt' | 'delivery_proof' | 'qr_code' | 'other';
  hasPaymentInfo: boolean;
  extractedData: {
    amount?: string;
    recipient?: string;
    description?: string;
  };
  suggestedAction: 'pay' | 'create_escrow' | 'release_escrow' | 'verify' | 'none';
  confidence: number;
  summary: string;
}

export interface AICommandResult {
  success: boolean;
  action: string;
  message: string;
  txHash?: string;
  data?: unknown;
  functionCalls?: Array<{ name: string; args: Record<string, unknown> }>;
  needsConfirmation?: boolean;
  confirmationPrompt?: string;
}
