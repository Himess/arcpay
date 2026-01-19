/**
 * Speech Synthesis
 *
 * Browser-based text-to-speech using Web Speech API
 */

import type { SpeechSynthesisConfig } from './types';

// Web Speech API types for Node.js compatibility
declare global {
  interface Window {
    speechSynthesis: SpeechSynthesisAPI;
  }
}

interface SpeechSynthesisAPI {
  getVoices(): SpeechSynthesisVoiceItem[];
  speak(utterance: SpeechSynthesisUtteranceItem): void;
  cancel(): void;
  pause(): void;
  resume(): void;
  speaking: boolean;
  onvoiceschanged: (() => void) | null | undefined;
}

interface SpeechSynthesisVoiceItem {
  name: string;
  lang: string;
  default: boolean;
  localService: boolean;
  voiceURI: string;
}

interface SpeechSynthesisUtteranceItem extends EventTarget {
  text: string;
  voice: SpeechSynthesisVoiceItem | null;
  rate: number;
  pitch: number;
  volume: number;
  lang: string;
  onend: (() => void) | null;
  onerror: ((event: { error: string }) => void) | null;
}

declare const SpeechSynthesisUtterance: {
  new (text: string): SpeechSynthesisUtteranceItem;
};

export class SpeechSynthesizer {
  private config: SpeechSynthesisConfig;
  private synthesis: SpeechSynthesisAPI | null = null;
  private voices: SpeechSynthesisVoiceItem[] = [];
  private selectedVoice: SpeechSynthesisVoiceItem | null = null;

  constructor(config: SpeechSynthesisConfig = {}) {
    this.config = {
      rate: config.rate ?? 1,
      pitch: config.pitch ?? 1,
      volume: config.volume ?? 1,
      language: config.language || 'en-US',
      voice: config.voice
    };

    this.initSynthesis();
  }

  private initSynthesis(): void {
    // Check if running in browser environment
    const win = typeof globalThis !== 'undefined' ? (globalThis as unknown as Window) : undefined;

    if (!win || typeof win.speechSynthesis === 'undefined') {
      console.warn('Speech synthesis is only available in browser environment');
      return;
    }

    this.synthesis = win.speechSynthesis;
    this.loadVoices();

    // Voices might load asynchronously
    if (this.synthesis.onvoiceschanged !== undefined) {
      this.synthesis.onvoiceschanged = () => this.loadVoices();
    }
  }

  private loadVoices(): void {
    if (!this.synthesis) return;

    this.voices = this.synthesis.getVoices();

    // Select voice based on config
    if (this.config.voice) {
      this.selectedVoice = this.voices.find(v => v.name === this.config.voice) || null;
    }

    // Fallback to language match
    if (!this.selectedVoice && this.config.language) {
      this.selectedVoice = this.voices.find(v =>
        v.lang.startsWith(this.config.language!.split('-')[0])
      ) || null;
    }

    // Final fallback to first available
    if (!this.selectedVoice && this.voices.length > 0) {
      this.selectedVoice = this.voices[0];
    }
  }

  /**
   * Check if speech synthesis is available
   */
  isAvailable(): boolean {
    return this.synthesis !== null;
  }

  /**
   * Get available voices
   */
  getVoices(): SpeechSynthesisVoiceItem[] {
    return this.voices;
  }

  /**
   * Set the voice to use
   */
  setVoice(voiceName: string): boolean {
    const voice = this.voices.find(v => v.name === voiceName);
    if (voice) {
      this.selectedVoice = voice;
      return true;
    }
    return false;
  }

  /**
   * Speak text
   */
  async speak(text: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.synthesis) {
        reject(new Error('Speech synthesis not available'));
        return;
      }

      // Cancel any ongoing speech
      this.synthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);

      if (this.selectedVoice) {
        utterance.voice = this.selectedVoice;
      }

      utterance.rate = this.config.rate || 1;
      utterance.pitch = this.config.pitch || 1;
      utterance.volume = this.config.volume || 1;

      if (this.config.language) {
        utterance.lang = this.config.language;
      }

      utterance.onend = () => resolve();
      utterance.onerror = (event) => reject(new Error(`Speech synthesis error: ${event.error}`));

      this.synthesis.speak(utterance);
    });
  }

  /**
   * Speak text without waiting for completion
   */
  speakAsync(text: string): void {
    this.speak(text).catch(console.error);
  }

  /**
   * Stop speaking
   */
  stop(): void {
    this.synthesis?.cancel();
  }

  /**
   * Pause speaking
   */
  pause(): void {
    this.synthesis?.pause();
  }

  /**
   * Resume speaking
   */
  resume(): void {
    this.synthesis?.resume();
  }

  /**
   * Check if currently speaking
   */
  isSpeaking(): boolean {
    return this.synthesis?.speaking || false;
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<SpeechSynthesisConfig>): void {
    this.config = { ...this.config, ...config };

    if (config.voice) {
      this.setVoice(config.voice);
    }
  }
}

/**
 * Create a speech synthesizer
 */
export function createSpeechSynthesizer(config?: SpeechSynthesisConfig): SpeechSynthesizer {
  return new SpeechSynthesizer(config);
}
