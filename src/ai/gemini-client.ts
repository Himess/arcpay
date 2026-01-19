/**
 * Gemini Client with Function Calling
 *
 * Uses Gemini 3.0 Flash for transactional AI agents
 * Recommended by Google for commerce/payment workflows
 */

import type { GeminiConfig, GeminiFunctionResponse } from './types';

// Gemini API types (inline to avoid dependency issues)
interface Part {
  text?: string;
  inlineData?: {
    data: string;
    mimeType: string;
  };
}

interface FunctionCall {
  name: string;
  args: Record<string, unknown>;
}

interface FunctionDeclaration {
  name: string;
  description: string;
  parameters: {
    type: string;
    properties: Record<string, unknown>;
    required?: string[];
  };
}

interface GenerateContentResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
        functionCall?: FunctionCall;
      }>;
    };
  }>;
}

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta';

export class GeminiClient {
  private apiKey: string;
  private model: string;
  private functions: FunctionDeclaration[] = [];

  constructor(config: GeminiConfig) {
    this.apiKey = config.apiKey;
    // Gemini 3.0 Flash: Recommended for transactional/payment agents
    this.model = config.model || 'gemini-3.0-flash';
  }

  /**
   * Initialize model with function calling capabilities
   */
  initWithFunctions(functions: FunctionDeclaration[]): void {
    this.functions = functions;
  }

  /**
   * Generate content with function calling
   */
  async generateWithFunctions(
    prompt: string,
    images?: Part[]
  ): Promise<GeminiFunctionResponse> {
    const parts: Part[] = [];

    // Add images if provided
    if (images && images.length > 0) {
      parts.push(...images);
    }

    // Add text prompt
    parts.push({ text: prompt });

    const requestBody: Record<string, unknown> = {
      contents: [{ parts }],
    };

    // Add function declarations if available
    if (this.functions.length > 0) {
      requestBody.tools = [{
        functionDeclarations: this.functions
      }];
      requestBody.toolConfig = {
        functionCallingConfig: {
          mode: 'AUTO'
        }
      };
    }

    const response = await this.makeRequest(requestBody);

    // Check if Gemini wants to call a function
    const candidate = response.candidates?.[0];
    const responseParts = candidate?.content?.parts || [];

    const functionCalls: FunctionCall[] = [];
    let textResponse = '';

    for (const part of responseParts) {
      if (part.functionCall) {
        functionCalls.push({
          name: part.functionCall.name,
          args: part.functionCall.args || {}
        });
      }
      if (part.text) {
        textResponse += part.text;
      }
    }

    if (functionCalls.length > 0) {
      return {
        type: 'function_call',
        functionCalls: functionCalls.map(fc => ({
          name: fc.name,
          args: fc.args as Record<string, unknown>
        })),
        text: null
      };
    }

    return {
      type: 'text',
      text: textResponse || null,
      functionCalls: null
    };
  }

  /**
   * Generate with multimodal input (image + text)
   */
  async generateMultimodal(
    prompt: string,
    imageBase64: string,
    mimeType: string = 'image/jpeg'
  ): Promise<string> {
    const parts: Part[] = [
      {
        inlineData: {
          data: imageBase64,
          mimeType
        }
      },
      { text: prompt }
    ];

    const requestBody = {
      contents: [{ parts }]
    };

    const response = await this.makeRequest(requestBody);
    const text = response.candidates?.[0]?.content?.parts?.[0]?.text || '';
    return text;
  }

  /**
   * Simple text generation
   */
  async generate(prompt: string): Promise<string> {
    const requestBody = {
      contents: [{ parts: [{ text: prompt }] }]
    };

    const response = await this.makeRequest(requestBody);
    return response.candidates?.[0]?.content?.parts?.[0]?.text || '';
  }

  /**
   * Generate and parse as JSON
   */
  async generateJSON<T>(prompt: string): Promise<T> {
    const text = await this.generate(prompt);

    // Extract JSON from response
    const jsonMatch = text.match(/```json\n?([\s\S]*?)\n?```/) ||
                      text.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      throw new Error('Failed to parse JSON from Gemini response');
    }

    const jsonStr = jsonMatch[1] || jsonMatch[0];
    return JSON.parse(jsonStr);
  }

  /**
   * Make API request to Gemini
   */
  private async makeRequest(body: Record<string, unknown>): Promise<GenerateContentResponse> {
    const url = `${GEMINI_API_BASE}/models/${this.model}:generateContent?key=${this.apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Gemini API error: ${response.status} - ${error}`);
    }

    return response.json() as Promise<GenerateContentResponse>;
  }
}

/**
 * Create a Gemini client
 */
export function createGeminiClient(config: GeminiConfig): GeminiClient {
  return new GeminiClient(config);
}
