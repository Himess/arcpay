/**
 * Multimodal Analyzer
 *
 * Analyzes images for payment-related content:
 * - Invoices: Extract payment details
 * - Receipts: Parse transaction records
 * - Delivery Proofs: Verify for escrow release
 */

import { GeminiClient } from './gemini-client';
import type {
  InvoiceAnalysis,
  ReceiptAnalysis,
  DeliveryProofAnalysis,
  PaymentImageAnalysis
} from './types';

export class MultimodalAnalyzer {
  private gemini: GeminiClient;

  constructor(geminiClient: GeminiClient) {
    this.gemini = geminiClient;
  }

  /**
   * Analyze an invoice image and extract payment details
   */
  async analyzeInvoice(imageBase64: string, mimeType: string = 'image/jpeg'): Promise<InvoiceAnalysis> {
    const prompt = `Analyze this invoice image and extract payment information.

Return ONLY valid JSON with this structure:
{
  "detected": true/false (is this an invoice?),
  "amount": "numeric amount as string (e.g., '150.00')",
  "currency": "USD/EUR/USDC etc",
  "recipient": "payment address if visible (0x...) or null",
  "recipientName": "company/person name",
  "invoiceNumber": "invoice reference number",
  "dueDate": "due date in YYYY-MM-DD format",
  "description": "what the invoice is for",
  "confidence": 0.0-1.0 (how confident are you in the extraction),
  "rawText": "any relevant text from the invoice"
}

If this is not an invoice, return:
{
  "detected": false,
  "confidence": 0
}`;

    try {
      const response = await this.gemini.generateMultimodal(prompt, imageBase64, mimeType);
      return this.parseJSON<InvoiceAnalysis>(response);
    } catch (error) {
      return { detected: false, confidence: 0 };
    }
  }

  /**
   * Analyze a receipt image
   */
  async analyzeReceipt(imageBase64: string, mimeType: string = 'image/jpeg'): Promise<ReceiptAnalysis> {
    const prompt = `Analyze this receipt image and extract transaction details.

Return ONLY valid JSON:
{
  "detected": true/false (is this a receipt?),
  "merchant": "store/company name",
  "amount": "total amount as string",
  "date": "transaction date YYYY-MM-DD",
  "items": [{"name": "item name", "price": "price"}],
  "paymentMethod": "cash/card/crypto",
  "confidence": 0.0-1.0
}`;

    try {
      const response = await this.gemini.generateMultimodal(prompt, imageBase64, mimeType);
      return this.parseJSON<ReceiptAnalysis>(response);
    } catch (error) {
      return { detected: false, confidence: 0 };
    }
  }

  /**
   * Analyze delivery proof image to decide if escrow should be released
   */
  async analyzeDeliveryProof(
    imageBase64: string,
    expectedDelivery: string,
    mimeType: string = 'image/jpeg'
  ): Promise<DeliveryProofAnalysis> {
    const prompt = `You are analyzing a delivery proof image to determine if an escrow payment should be released.

Expected delivery: ${expectedDelivery}

Analyze the image and determine:
1. Is there evidence of successful delivery?
2. Does the image show a package, delivered goods, or proof of service?
3. Is there anything suspicious or concerning?

Return ONLY valid JSON:
{
  "isDelivered": true/false,
  "confidence": 0.0-1.0,
  "evidence": ["list of evidence points you see in the image"],
  "recommendation": "release" | "hold" | "review",
  "reasoning": "explain your recommendation"
}

Guidelines:
- "release": Clear evidence of delivery (package at door, signed receipt, goods visible)
- "hold": No evidence of delivery or image is unclear
- "review": Some evidence but needs human review (partial delivery, damaged goods)`;

    try {
      const response = await this.gemini.generateMultimodal(prompt, imageBase64, mimeType);
      return this.parseJSON<DeliveryProofAnalysis>(response);
    } catch (error) {
      return {
        isDelivered: false,
        confidence: 0,
        evidence: [],
        recommendation: 'review',
        reasoning: 'Failed to analyze image'
      };
    }
  }

  /**
   * General image analysis for payment context
   */
  async analyzeForPayment(
    imageBase64: string,
    userPrompt: string,
    mimeType: string = 'image/jpeg'
  ): Promise<PaymentImageAnalysis> {
    const prompt = `You are an AI payment assistant analyzing an image in a payment context.

User says: "${userPrompt}"

Analyze the image and determine:
1. What type of document/image is this? (invoice, receipt, delivery proof, QR code, other)
2. Is there payment-relevant information?
3. What action should be taken?

Return ONLY valid JSON:
{
  "imageType": "invoice" | "receipt" | "delivery_proof" | "qr_code" | "other",
  "hasPaymentInfo": true/false,
  "extractedData": {
    "amount": "amount if found",
    "recipient": "address or name if found",
    "description": "what it's for"
  },
  "suggestedAction": "pay" | "create_escrow" | "release_escrow" | "verify" | "none",
  "confidence": 0.0-1.0,
  "summary": "brief description of what you see"
}`;

    try {
      const response = await this.gemini.generateMultimodal(prompt, imageBase64, mimeType);
      return this.parseJSON<PaymentImageAnalysis>(response);
    } catch (error) {
      return {
        imageType: 'other',
        hasPaymentInfo: false,
        extractedData: {},
        suggestedAction: 'none',
        confidence: 0,
        summary: 'Failed to analyze image'
      };
    }
  }

  private parseJSON<T>(text: string): T {
    const jsonMatch = text.match(/```json\n?([\s\S]*?)\n?```/) ||
                      text.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }

    const jsonStr = jsonMatch[1] || jsonMatch[0];
    return JSON.parse(jsonStr);
  }
}

/**
 * Create a multimodal analyzer
 */
export function createMultimodalAnalyzer(geminiClient: GeminiClient): MultimodalAnalyzer {
  return new MultimodalAnalyzer(geminiClient);
}
