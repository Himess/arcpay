/**
 * ImagePayment Component
 *
 * A React component for image-based payments.
 * Upload an invoice, receipt, or delivery proof for AI analysis.
 */

import React, { useState, useCallback, useRef } from 'react';
import type { AICommandResult } from '../ai/types';

// ============ Types ============

export interface ImagePaymentProps {
  onAnalyze?: (result: AICommandResult) => void;
  onPay?: (result: AICommandResult) => void;
  onError?: (error: Error) => void;

  // Styling
  className?: string;
  style?: React.CSSProperties;
  variant?: 'default' | 'dropzone' | 'compact';

  // Behavior
  disabled?: boolean;
  autoAnalyze?: boolean;
  showPreview?: boolean;
  allowCamera?: boolean;
  acceptedTypes?: string[];

  // AI Functions
  processWithImage: (command: string, imageBase64: string, mimeType?: string) => Promise<AICommandResult>;
  analyzeInvoice?: (imageBase64: string) => Promise<AICommandResult>;
  confirmPayment?: () => Promise<AICommandResult>;
  cancelPayment?: () => void;

  // Labels
  uploadLabel?: string;
  analyzeLabel?: string;
  payLabel?: string;
  cameraLabel?: string;
}

export interface AnalysisResult {
  detected: boolean;
  type: 'invoice' | 'receipt' | 'delivery_proof' | 'unknown';
  amount?: string;
  recipient?: string;
  recipientName?: string;
  confidence: number;
  summary?: string;
}

// ============ Styles ============

const containerStyles: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 16,
  width: '100%',
  maxWidth: 400
};

const dropzoneStyles: React.CSSProperties = {
  border: '2px dashed #D1D5DB',
  borderRadius: 12,
  padding: 32,
  textAlign: 'center',
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  backgroundColor: '#F9FAFB'
};

const dropzoneActiveStyles: React.CSSProperties = {
  borderColor: '#4F46E5',
  backgroundColor: '#EEF2FF'
};

const previewStyles: React.CSSProperties = {
  position: 'relative',
  borderRadius: 12,
  overflow: 'hidden',
  backgroundColor: '#F3F4F6'
};

const imageStyles: React.CSSProperties = {
  width: '100%',
  height: 'auto',
  maxHeight: 300,
  objectFit: 'contain',
  display: 'block'
};

const buttonStyles: React.CSSProperties = {
  padding: '12px 24px',
  borderRadius: 8,
  border: 'none',
  fontSize: 16,
  fontWeight: 500,
  cursor: 'pointer',
  transition: 'all 0.2s ease'
};

const primaryButtonStyles: React.CSSProperties = {
  ...buttonStyles,
  backgroundColor: '#4F46E5',
  color: 'white'
};

const secondaryButtonStyles: React.CSSProperties = {
  ...buttonStyles,
  backgroundColor: '#F3F4F6',
  color: '#374151'
};

const resultCardStyles: React.CSSProperties = {
  padding: 16,
  borderRadius: 12,
  backgroundColor: '#F9FAFB',
  border: '1px solid #E5E7EB'
};

// ============ Icons ============

const UploadIcon: React.FC = () => (
  <svg width="48" height="48" viewBox="0 0 24 24" fill="#9CA3AF">
    <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM14 13v4h-4v-4H7l5-5 5 5h-3z"/>
  </svg>
);

const CameraIcon: React.FC = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 15.2c1.77 0 3.2-1.43 3.2-3.2s-1.43-3.2-3.2-3.2-3.2 1.43-3.2 3.2 1.43 3.2 3.2 3.2zm9-9h-3.37l-1.83-2H8.2L6.37 6.2H3c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2v-12c0-1.1-.9-2-2-2z"/>
  </svg>
);

const CloseIcon: React.FC = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
  </svg>
);

// ============ Component ============

export const ImagePayment: React.FC<ImagePaymentProps> = ({
  onAnalyze,
  onPay,
  onError,
  className,
  style,
  variant = 'default',
  disabled = false,
  autoAnalyze = true,
  showPreview = true,
  allowCamera = true,
  acceptedTypes = ['image/jpeg', 'image/png', 'image/webp'],
  processWithImage,
  analyzeInvoice,
  confirmPayment,
  cancelPayment,
  uploadLabel = 'Upload invoice or receipt',
  analyzeLabel = 'Analyze',
  payLabel = 'Confirm Payment',
  cameraLabel = 'Take Photo'
}) => {
  const [image, setImage] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string>('image/jpeg');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [result, setResult] = useState<AICommandResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Handle file selection
  const handleFileSelect = useCallback(async (file: File) => {
    if (!acceptedTypes.includes(file.type)) {
      setError(`Invalid file type. Accepted: ${acceptedTypes.join(', ')}`);
      return;
    }

    setError(null);
    setResult(null);
    setMimeType(file.type);

    // Read as base64
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      const base64 = dataUrl.split(',')[1];

      setImage(base64);
      setImagePreview(dataUrl);

      // Auto analyze if enabled
      if (autoAnalyze) {
        await handleAnalyze(base64, file.type);
      }
    };
    reader.onerror = () => {
      setError('Failed to read file');
      onError?.(new Error('Failed to read file'));
    };
    reader.readAsDataURL(file);
  }, [acceptedTypes, autoAnalyze]);

  // Handle drag and drop
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  }, [handleFileSelect]);

  // Handle file input change
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  }, [handleFileSelect]);

  // Analyze image
  const handleAnalyze = useCallback(async (imageBase64?: string, type?: string) => {
    const img = imageBase64 || image;
    if (!img) return;

    setIsAnalyzing(true);
    setError(null);

    try {
      let analysisResult: AICommandResult;

      if (analyzeInvoice) {
        analysisResult = await analyzeInvoice(img);
      } else {
        analysisResult = await processWithImage(
          'Analyze this image. If it\'s an invoice, extract payment details. If it\'s a delivery proof, verify delivery.',
          img,
          type || mimeType
        );
      }

      setResult(analysisResult);
      onAnalyze?.(analysisResult);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Analysis failed');
      setError(error.message);
      onError?.(error);
    } finally {
      setIsAnalyzing(false);
    }
  }, [image, mimeType, processWithImage, analyzeInvoice, onAnalyze, onError]);

  // Confirm payment
  const handlePay = useCallback(async () => {
    if (!confirmPayment) return;

    setIsPaying(true);
    setError(null);

    try {
      const payResult = await confirmPayment();
      setResult(payResult);
      onPay?.(payResult);

      if (payResult.success) {
        // Clear image after successful payment
        setTimeout(() => {
          handleClear();
        }, 3000);
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Payment failed');
      setError(error.message);
      onError?.(error);
    } finally {
      setIsPaying(false);
    }
  }, [confirmPayment, onPay, onError]);

  // Cancel payment
  const handleCancel = useCallback(() => {
    cancelPayment?.();
    setResult(null);
  }, [cancelPayment]);

  // Clear everything
  const handleClear = useCallback(() => {
    setImage(null);
    setImagePreview(null);
    setResult(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  }, []);

  // Render dropzone
  const renderDropzone = () => (
    <div
      style={{
        ...dropzoneStyles,
        ...(isDragging ? dropzoneActiveStyles : {}),
        opacity: disabled ? 0.5 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer'
      }}
      onClick={() => !disabled && fileInputRef.current?.click()}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <UploadIcon />
      <p style={{ margin: '16px 0 8px', color: '#374151', fontWeight: 500 }}>
        {uploadLabel}
      </p>
      <p style={{ margin: 0, color: '#9CA3AF', fontSize: 14 }}>
        Drag & drop or click to browse
      </p>

      {allowCamera && (
        <button
          type="button"
          style={{
            ...secondaryButtonStyles,
            marginTop: 16,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            margin: '16px auto 0'
          }}
          onClick={(e) => {
            e.stopPropagation();
            cameraInputRef.current?.click();
          }}
          disabled={disabled}
        >
          <CameraIcon />
          {cameraLabel}
        </button>
      )}
    </div>
  );

  // Render preview
  const renderPreview = () => (
    <div style={previewStyles}>
      <img src={imagePreview!} alt="Preview" style={imageStyles} />
      <button
        type="button"
        style={{
          position: 'absolute',
          top: 8,
          right: 8,
          padding: 4,
          borderRadius: '50%',
          border: 'none',
          backgroundColor: 'rgba(0,0,0,0.5)',
          color: 'white',
          cursor: 'pointer'
        }}
        onClick={handleClear}
      >
        <CloseIcon />
      </button>
    </div>
  );

  // Render result
  const renderResult = () => {
    if (!result) return null;

    const isSuccess = result.success;
    const needsConfirmation = result.needsConfirmation;

    return (
      <div style={{
        ...resultCardStyles,
        borderColor: isSuccess ? '#10B981' : '#EF4444',
        backgroundColor: isSuccess ? '#ECFDF5' : '#FEF2F2'
      }}>
        <p style={{
          margin: 0,
          fontWeight: 500,
          color: isSuccess ? '#065F46' : '#991B1B'
        }}>
          {result.message}
        </p>

        {result.data && (
          <div style={{ marginTop: 12, fontSize: 14, color: '#6B7280' }}>
            {result.data.analysis && (
              <>
                {(result.data.analysis as AnalysisResult).amount && (
                  <p style={{ margin: '4px 0' }}>
                    Amount: <strong>{(result.data.analysis as AnalysisResult).amount}</strong>
                  </p>
                )}
                {(result.data.analysis as AnalysisResult).recipient && (
                  <p style={{ margin: '4px 0' }}>
                    To: <strong>{(result.data.analysis as AnalysisResult).recipientName || (result.data.analysis as AnalysisResult).recipient}</strong>
                  </p>
                )}
              </>
            )}
          </div>
        )}

        {needsConfirmation && confirmPayment && (
          <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
            <button
              type="button"
              style={primaryButtonStyles}
              onClick={handlePay}
              disabled={isPaying}
            >
              {isPaying ? 'Processing...' : payLabel}
            </button>
            <button
              type="button"
              style={secondaryButtonStyles}
              onClick={handleCancel}
              disabled={isPaying}
            >
              Cancel
            </button>
          </div>
        )}

        {result.txHash && (
          <p style={{ margin: '12px 0 0', fontSize: 12, color: '#6B7280' }}>
            Tx: {result.txHash.slice(0, 10)}...{result.txHash.slice(-8)}
          </p>
        )}
      </div>
    );
  };

  return (
    <div className={className} style={{ ...containerStyles, ...style }}>
      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept={acceptedTypes.join(',')}
        onChange={handleInputChange}
        style={{ display: 'none' }}
        disabled={disabled}
      />
      {allowCamera && (
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleInputChange}
          style={{ display: 'none' }}
          disabled={disabled}
        />
      )}

      {/* Dropzone or Preview */}
      {!imagePreview || !showPreview ? renderDropzone() : renderPreview()}

      {/* Error message */}
      {error && (
        <div style={{
          padding: 12,
          borderRadius: 8,
          backgroundColor: '#FEF2F2',
          color: '#991B1B',
          fontSize: 14
        }}>
          {error}
        </div>
      )}

      {/* Analysis result */}
      {renderResult()}

      {/* Action buttons */}
      {image && !result && !autoAnalyze && (
        <button
          type="button"
          style={{
            ...primaryButtonStyles,
            width: '100%'
          }}
          onClick={() => handleAnalyze()}
          disabled={isAnalyzing || disabled}
        >
          {isAnalyzing ? 'Analyzing...' : analyzeLabel}
        </button>
      )}

      {isAnalyzing && (
        <div style={{ textAlign: 'center', color: '#6B7280' }}>
          <div style={{
            width: 24,
            height: 24,
            border: '3px solid #E5E7EB',
            borderTopColor: '#4F46E5',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 8px'
          }} />
          Analyzing image...
        </div>
      )}

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default ImagePayment;
