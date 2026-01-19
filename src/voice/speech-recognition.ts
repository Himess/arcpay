/**
 * Speech Recognition
 *
 * Browser-based speech-to-text using Web Speech API
 */

import type { SpeechRecognitionConfig, SpeechRecognitionResult } from './types';

// Web Speech API types
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResultItem;
  [index: number]: SpeechRecognitionResultItem;
}

interface SpeechRecognitionResultItem {
  isFinal: boolean;
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

// Global types for Web Speech API
declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition: new () => SpeechRecognitionInstance;
  }
}

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
}

export class SpeechRecognizer {
  private recognition: SpeechRecognitionInstance | null = null;
  private config: SpeechRecognitionConfig;
  private isListening: boolean = false;

  constructor(config: SpeechRecognitionConfig = {}) {
    this.config = {
      language: config.language || 'en-US',
      continuous: config.continuous ?? false,
      interimResults: config.interimResults ?? false
    };

    this.initRecognition();
  }

  private initRecognition(): void {
    // Check if running in browser environment
    const win = typeof globalThis !== 'undefined' ? (globalThis as unknown as Window) : undefined;

    if (!win) {
      console.warn('Speech recognition is only available in browser environment');
      return;
    }

    const SpeechRecognitionAPI = win.SpeechRecognition || win.webkitSpeechRecognition;

    if (!SpeechRecognitionAPI) {
      console.warn('Speech recognition not supported in this browser');
      return;
    }

    this.recognition = new SpeechRecognitionAPI();
    this.recognition.continuous = this.config.continuous || false;
    this.recognition.interimResults = this.config.interimResults || false;
    this.recognition.lang = this.config.language || 'en-US';
  }

  /**
   * Check if speech recognition is available
   */
  isAvailable(): boolean {
    return this.recognition !== null;
  }

  /**
   * Start listening and return the recognized speech
   */
  async listen(): Promise<SpeechRecognitionResult> {
    return new Promise((resolve, reject) => {
      if (!this.recognition) {
        reject(new Error('Speech recognition not available'));
        return;
      }

      if (this.isListening) {
        reject(new Error('Already listening'));
        return;
      }

      this.isListening = true;

      this.recognition.onresult = (event: SpeechRecognitionEvent) => {
        const results = event.results;
        const lastResult = results[results.length - 1];

        if (lastResult.isFinal) {
          const alternative = lastResult[0];
          this.isListening = false;

          resolve({
            transcript: alternative.transcript,
            confidence: alternative.confidence,
            isFinal: true
          });
        }
      };

      this.recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        this.isListening = false;
        reject(new Error(`Speech recognition error: ${event.error}`));
      };

      this.recognition.onend = () => {
        this.isListening = false;
      };

      try {
        this.recognition.start();
      } catch (error) {
        this.isListening = false;
        reject(error);
      }
    });
  }

  /**
   * Start continuous listening with callback
   */
  startContinuous(
    onResult: (result: SpeechRecognitionResult) => void,
    onError?: (error: Error) => void
  ): void {
    if (!this.recognition) {
      onError?.(new Error('Speech recognition not available'));
      return;
    }

    if (this.isListening) {
      return;
    }

    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.isListening = true;

    this.recognition.onresult = (event: SpeechRecognitionEvent) => {
      const results = event.results;

      for (let i = event.resultIndex; i < results.length; i++) {
        const result = results[i];
        const alternative = result[0];

        onResult({
          transcript: alternative.transcript,
          confidence: alternative.confidence,
          isFinal: result.isFinal
        });
      }
    };

    this.recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      onError?.(new Error(`Speech recognition error: ${event.error}`));
    };

    this.recognition.onend = () => {
      // Restart if still supposed to be listening
      if (this.isListening && this.recognition) {
        try {
          this.recognition.start();
        } catch {
          // Ignore restart errors
        }
      }
    };

    try {
      this.recognition.start();
    } catch (error) {
      this.isListening = false;
      onError?.(error as Error);
    }
  }

  /**
   * Stop listening
   */
  stop(): void {
    this.isListening = false;
    this.recognition?.stop();
  }

  /**
   * Abort recognition
   */
  abort(): void {
    this.isListening = false;
    this.recognition?.abort();
  }

  /**
   * Check if currently listening
   */
  getIsListening(): boolean {
    return this.isListening;
  }

  /**
   * Update language
   */
  setLanguage(language: string): void {
    this.config.language = language;
    if (this.recognition) {
      this.recognition.lang = language;
    }
  }
}

/**
 * Create a speech recognizer
 */
export function createSpeechRecognizer(config?: SpeechRecognitionConfig): SpeechRecognizer {
  return new SpeechRecognizer(config);
}
