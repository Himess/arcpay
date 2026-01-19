/**
 * ArcPay Voice Module
 *
 * Hands-free payment experience using speech recognition and synthesis.
 * Combined with Gemini 3.0 Flash for natural language understanding.
 */

// Speech Recognition
export { SpeechRecognizer, createSpeechRecognizer } from './speech-recognition';

// Speech Synthesis
export { SpeechSynthesizer, createSpeechSynthesizer } from './speech-synthesis';

// Voice Agent
export { VoiceEnabledAgent, createVoiceAgent } from './voice-agent';
export type { VoiceEnabledAgentConfig } from './voice-agent';

// Types
export type {
  SpeechRecognitionConfig,
  SpeechRecognitionResult,
  SpeechSynthesisConfig,
  VoiceAgentConfig,
  VoiceCommandResult,
} from './types';
