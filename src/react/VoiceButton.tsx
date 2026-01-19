/**
 * VoiceButton Component
 *
 * A React component for voice-activated payment commands.
 * Press and hold to speak, release to process.
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import type { AICommandResult } from '../ai/types';

// ============ Types ============

export interface VoiceButtonProps {
  onResult?: (result: AICommandResult) => void;
  onError?: (error: Error) => void;
  onListeningChange?: (isListening: boolean) => void;
  onTranscript?: (transcript: string) => void;

  // Styling
  className?: string;
  style?: React.CSSProperties;
  size?: 'small' | 'medium' | 'large';
  variant?: 'default' | 'minimal' | 'floating';
  color?: string;

  // Behavior
  disabled?: boolean;
  holdToSpeak?: boolean; // If true, hold button to speak. If false, click to toggle.
  showTranscript?: boolean;
  showStatus?: boolean;
  autoConfirm?: boolean; // Auto-confirm payments under threshold

  // Voice agent
  processCommand: (command: string) => Promise<AICommandResult>;
  isVoiceAvailable?: boolean;

  // Labels
  idleLabel?: string;
  listeningLabel?: string;
  processingLabel?: string;
}

export interface VoiceButtonState {
  status: 'idle' | 'listening' | 'processing' | 'success' | 'error';
  transcript: string;
  result: AICommandResult | null;
  error: Error | null;
}

// ============ Styles ============

const baseStyles: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  border: 'none',
  borderRadius: '50%',
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  outline: 'none',
  position: 'relative'
};

const sizeStyles: Record<string, React.CSSProperties> = {
  small: { width: 40, height: 40, fontSize: 16 },
  medium: { width: 56, height: 56, fontSize: 24 },
  large: { width: 72, height: 72, fontSize: 32 }
};

const variantStyles: Record<string, React.CSSProperties> = {
  default: {
    backgroundColor: '#4F46E5',
    color: 'white',
    boxShadow: '0 2px 8px rgba(79, 70, 229, 0.3)'
  },
  minimal: {
    backgroundColor: 'transparent',
    color: '#4F46E5',
    border: '2px solid #4F46E5'
  },
  floating: {
    backgroundColor: '#4F46E5',
    color: 'white',
    boxShadow: '0 4px 16px rgba(79, 70, 229, 0.4)',
    position: 'fixed',
    bottom: 24,
    right: 24
  }
};

const statusColors: Record<string, string> = {
  idle: '#4F46E5',
  listening: '#EF4444',
  processing: '#F59E0B',
  success: '#10B981',
  error: '#EF4444'
};

// ============ Icons ============

const MicIcon: React.FC<{ size?: number }> = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm-1 1.93c-3.94-.49-7-3.85-7-7.93h2c0 3.04 2.51 5.5 5.6 5.5s5.6-2.46 5.6-5.5h2c0 4.08-3.06 7.44-7 7.93V20h-2v-4.07z"/>
  </svg>
);

const StopIcon: React.FC<{ size?: number }> = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <rect x="6" y="6" width="12" height="12" rx="2"/>
  </svg>
);

const LoadingIcon: React.FC<{ size?: number }> = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" style={{ animation: 'spin 1s linear infinite' }}>
    <path d="M12 2a10 10 0 1 0 10 10h-2a8 8 0 1 1-8-8V2z" opacity="0.3"/>
    <path d="M12 2v2a8 8 0 0 1 8 8h2a10 10 0 0 0-10-10z"/>
  </svg>
);

const CheckIcon: React.FC<{ size?: number }> = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
  </svg>
);

// ============ Component ============

export const VoiceButton: React.FC<VoiceButtonProps> = ({
  onResult,
  onError,
  onListeningChange,
  onTranscript,
  className,
  style,
  size = 'medium',
  variant = 'default',
  color,
  disabled = false,
  holdToSpeak = false,
  showTranscript = false,
  showStatus = false,
  processCommand,
  isVoiceAvailable = true,
  idleLabel = 'Tap to speak',
  listeningLabel = 'Listening...',
  processingLabel = 'Processing...'
}) => {
  const [state, setState] = useState<VoiceButtonState>({
    status: 'idle',
    transcript: '',
    result: null,
    error: null
  });

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognitionAPI = (window as Window & {
        SpeechRecognition?: typeof SpeechRecognition;
        webkitSpeechRecognition?: typeof SpeechRecognition;
      }).SpeechRecognition || (window as Window & {
        SpeechRecognition?: typeof SpeechRecognition;
        webkitSpeechRecognition?: typeof SpeechRecognition;
      }).webkitSpeechRecognition;

      if (SpeechRecognitionAPI) {
        recognitionRef.current = new SpeechRecognitionAPI();
        recognitionRef.current.continuous = false;
        recognitionRef.current.interimResults = true;
        recognitionRef.current.lang = 'en-US';

        recognitionRef.current.onresult = (event) => {
          const transcript = Array.from(event.results)
            .map(result => result[0].transcript)
            .join('');

          setState(prev => ({ ...prev, transcript }));
          onTranscript?.(transcript);

          // If final result, process the command
          if (event.results[event.results.length - 1].isFinal) {
            handleProcess(transcript);
          }
        };

        recognitionRef.current.onerror = (event) => {
          const error = new Error(`Speech recognition error: ${event.error}`);
          setState(prev => ({ ...prev, status: 'error', error }));
          onError?.(error);
        };

        recognitionRef.current.onend = () => {
          if (state.status === 'listening') {
            setState(prev => ({ ...prev, status: 'idle' }));
            onListeningChange?.(false);
          }
        };
      }
    }

    return () => {
      recognitionRef.current?.abort();
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const handleProcess = useCallback(async (transcript: string) => {
    if (!transcript.trim()) return;

    setState(prev => ({ ...prev, status: 'processing' }));

    try {
      const result = await processCommand(transcript);
      setState(prev => ({ ...prev, status: 'success', result }));
      onResult?.(result);

      // Reset to idle after showing success
      timeoutRef.current = setTimeout(() => {
        setState(prev => ({ ...prev, status: 'idle' }));
      }, 2000);
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Command failed');
      setState(prev => ({ ...prev, status: 'error', error: err }));
      onError?.(err);
    }
  }, [processCommand, onResult, onError]);

  const startListening = useCallback(() => {
    if (!recognitionRef.current || disabled || !isVoiceAvailable) return;

    setState(prev => ({ ...prev, status: 'listening', transcript: '' }));
    onListeningChange?.(true);

    try {
      recognitionRef.current.start();
    } catch {
      // Already started
    }
  }, [disabled, isVoiceAvailable, onListeningChange]);

  const stopListening = useCallback(() => {
    if (!recognitionRef.current) return;

    recognitionRef.current.stop();
    setState(prev => ({ ...prev, status: 'idle' }));
    onListeningChange?.(false);
  }, [onListeningChange]);

  const handleClick = useCallback(() => {
    if (holdToSpeak) return;

    if (state.status === 'listening') {
      stopListening();
    } else if (state.status === 'idle') {
      startListening();
    }
  }, [holdToSpeak, state.status, startListening, stopListening]);

  const handleMouseDown = useCallback(() => {
    if (holdToSpeak) {
      startListening();
    }
  }, [holdToSpeak, startListening]);

  const handleMouseUp = useCallback(() => {
    if (holdToSpeak) {
      stopListening();
    }
  }, [holdToSpeak, stopListening]);

  // Render icon based on status
  const renderIcon = () => {
    const iconSize = size === 'small' ? 16 : size === 'medium' ? 24 : 32;

    switch (state.status) {
      case 'listening':
        return <StopIcon size={iconSize} />;
      case 'processing':
        return <LoadingIcon size={iconSize} />;
      case 'success':
        return <CheckIcon size={iconSize} />;
      default:
        return <MicIcon size={iconSize} />;
    }
  };

  // Compute button styles
  const buttonStyle: React.CSSProperties = {
    ...baseStyles,
    ...sizeStyles[size],
    ...variantStyles[variant],
    backgroundColor: color || statusColors[state.status],
    opacity: disabled ? 0.5 : 1,
    cursor: disabled ? 'not-allowed' : 'pointer',
    ...style
  };

  // Status label
  const getStatusLabel = () => {
    switch (state.status) {
      case 'listening':
        return listeningLabel;
      case 'processing':
        return processingLabel;
      case 'success':
        return state.result?.message || 'Done!';
      case 'error':
        return state.error?.message || 'Error';
      default:
        return idleLabel;
    }
  };

  if (!isVoiceAvailable) {
    return (
      <div className={className} style={{ textAlign: 'center', color: '#6B7280' }}>
        Voice not available in this browser
      </div>
    );
  }

  return (
    <div className={className} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <button
        type="button"
        style={buttonStyle}
        onClick={handleClick}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={holdToSpeak ? handleMouseUp : undefined}
        onTouchStart={handleMouseDown}
        onTouchEnd={handleMouseUp}
        disabled={disabled || state.status === 'processing'}
        aria-label={getStatusLabel()}
      >
        {renderIcon()}

        {/* Pulse animation when listening */}
        {state.status === 'listening' && (
          <span
            style={{
              position: 'absolute',
              width: '100%',
              height: '100%',
              borderRadius: '50%',
              backgroundColor: statusColors.listening,
              opacity: 0.3,
              animation: 'pulse 1.5s ease-out infinite'
            }}
          />
        )}
      </button>

      {showStatus && (
        <span style={{ fontSize: 14, color: '#6B7280' }}>
          {getStatusLabel()}
        </span>
      )}

      {showTranscript && state.transcript && (
        <div style={{
          padding: '8px 16px',
          backgroundColor: '#F3F4F6',
          borderRadius: 8,
          fontSize: 14,
          maxWidth: 300,
          textAlign: 'center'
        }}>
          "{state.transcript}"
        </div>
      )}

      {/* CSS for animations */}
      <style>{`
        @keyframes pulse {
          0% { transform: scale(1); opacity: 0.3; }
          100% { transform: scale(1.5); opacity: 0; }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default VoiceButton;
