// frontend/src/components/Common/CameraCaptureModal.js
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Camera, X, RotateCcw, Check, AlertCircle, RefreshCw, SwitchCamera } from 'lucide-react';

const CameraCaptureModal = ({
  isOpen,
  onClose,
  onCapture,
  title = 'Take Beneficiary Photo'
}) => {
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const [isStreaming, setIsStreaming] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [capturedImage, setCapturedImage] = useState(null);
  const [capturedBlob, setCapturedBlob] = useState(null);
  const [facingMode, setFacingMode] = useState('user'); // 'user' (front) or 'environment' (back)
  const [hasMultipleCameras, setHasMultipleCameras] = useState(false);

  // Stop camera tracks cleanly
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch (e) {
          console.error('Error stopping track:', e);
        }
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsStreaming(false);
  }, []);

  // Start camera stream
  const startCamera = useCallback(async () => {
    stopCamera();
    setCameraError(null);

    // Check mediaDevices support
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError(
        'Camera API is not supported in this browser or environment. Note: Cameras require a secure context (HTTPS or localhost).'
      );
      return;
    }

    try {
      const constraints = {
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      };

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = mediaStream;

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play().then(() => {
            setIsStreaming(true);
          }).catch((err) => {
            console.error('Error playing video stream:', err);
          });
        };
      }

      // Check available cameras
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoInputs = devices.filter((d) => d.kind === 'videoinput');
        setHasMultipleCameras(videoInputs.length > 1);
      } catch (e) {
        // device enumeration can fail silently
      }
    } catch (err) {
      console.error('Camera stream access failed:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCameraError('Camera access was denied. Please allow camera permissions in your browser address bar.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setCameraError('No camera found on this device. Please connect a webcam or upload a photo file instead.');
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        setCameraError('The camera is currently in use by another application. Please close other camera apps and retry.');
      } else {
        setCameraError(`Unable to start camera: ${err.message || 'Unknown error'}`);
      }
      setIsStreaming(false);
    }
  }, [facingMode, stopCamera]);

  // Manage camera lifecycle based on modal visibility
  useEffect(() => {
    if (isOpen) {
      setCapturedImage(null);
      setCapturedBlob(null);
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isOpen, startCamera, stopCamera]);

  // Flip between front and rear cameras
  const toggleFacingMode = () => {
    setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'));
  };

  // Capture snapshot from video element
  const takeSnapshot = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;

    const width = video.videoWidth || 640;
    const height = video.videoHeight || 480;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    // Draw frame onto canvas
    ctx.drawImage(video, 0, 0, width, height);

    // Convert to JPEG blob
    canvas.toBlob(
      (blob) => {
        if (blob) {
          const previewUrl = URL.createObjectURL(blob);
          setCapturedBlob(blob);
          setCapturedImage(previewUrl);
          stopCamera();
        }
      },
      'image/jpeg',
      0.92
    );
  };

  // Discard and retake
  const handleRetake = () => {
    if (capturedImage) {
      URL.revokeObjectURL(capturedImage);
    }
    setCapturedImage(null);
    setCapturedBlob(null);
    startCamera();
  };

  // Confirm photo and pass File back
  const handleConfirm = () => {
    if (capturedBlob) {
      const timestamp = Date.now();
      const photoFile = new File([capturedBlob], `child_camera_${timestamp}.jpg`, {
        type: 'image/jpeg',
      });
      onCapture(photoFile, capturedImage);
      handleClose();
    }
  };

  const handleClose = () => {
    stopCamera();
    if (capturedImage) {
      URL.revokeObjectURL(capturedImage);
    }
    setCapturedImage(null);
    setCapturedBlob(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.78)',
        backdropFilter: 'blur(4px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '560px',
          background: '#FFFFFF',
          borderRadius: '18px',
          overflow: 'hidden',
          boxShadow: '0 20px 45px rgba(0, 0, 0, 0.3)',
          display: 'flex',
          flexDirection: 'column',
          animation: 'fadeIn 0.2s ease-out',
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid #E4E6F0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: '#FAFAFD',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: '#EEF0F8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#2E2C6E',
              }}
            >
              <Camera size={18} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#1B1B2B' }}>
                {title}
              </h3>
              <p style={{ margin: 0, fontSize: '12px', color: '#5A5C74' }}>
                Position beneficiary within frame and capture ID photo
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#5A5C74',
              padding: '6px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            title="Close camera"
          >
            <X size={20} />
          </button>
        </div>

        {/* Viewfinder / Image Display Body */}
        <div
          style={{
            position: 'relative',
            width: '100%',
            height: '380px',
            background: '#0F172A',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
          }}
        >
          {/* Live Video */}
          {!capturedImage && (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                display: isStreaming ? 'block' : 'none',
              }}
            />
          )}

          {/* Captured Preview Image */}
          {capturedImage && (
            <img
              src={capturedImage}
              alt="Captured Beneficiary Preview"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                background: '#000000',
              }}
            />
          )}

          {/* Portrait Head & Shoulders Alignment Guide (Active while streaming) */}
          {isStreaming && !capturedImage && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                pointerEvents: 'none',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {/* Subtle face frame guide */}
              <div
                style={{
                  width: '190px',
                  height: '240px',
                  border: '2px dashed rgba(255, 255, 255, 0.45)',
                  borderRadius: '100px / 125px',
                  boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.25)',
                }}
              />
              <span
                style={{
                  position: 'absolute',
                  bottom: '16px',
                  background: 'rgba(0, 0, 0, 0.6)',
                  color: '#FFFFFF',
                  padding: '4px 12px',
                  borderRadius: '20px',
                  fontSize: '11.5px',
                  fontWeight: 500,
                  letterSpacing: '0.2px',
                }}
              >
                Align child's face & shoulders inside the guide
              </span>
            </div>
          )}

          {/* Camera Loading State */}
          {!isStreaming && !cameraError && !capturedImage && (
            <div style={{ textAlign: 'center', color: '#94A3B8' }}>
              <RefreshCw
                size={32}
                style={{
                  animation: 'spin 1.5s linear infinite',
                  margin: '0 auto 10px auto',
                }}
              />
              <p style={{ margin: 0, fontSize: '13px' }}>Starting camera preview...</p>
            </div>
          )}

          {/* Camera Error Display */}
          {cameraError && (
            <div
              style={{
                padding: '24px',
                textAlign: 'center',
                color: '#FFFFFF',
                maxWidth: '400px',
              }}
            >
              <AlertCircle size={36} color="#F87171" style={{ margin: '0 auto 12px auto' }} />
              <h4 style={{ margin: '0 0 6px 0', fontSize: '15px', color: '#F87171' }}>
                Camera Error
              </h4>
              <p style={{ fontSize: '13px', color: '#CBD5E1', lineHeight: 1.5, margin: '0 0 16px 0' }}>
                {cameraError}
              </p>
              <button
                type="button"
                onClick={startCamera}
                style={{
                  background: '#2E2C6E',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '8px 16px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <RefreshCw size={14} /> Try Again
              </button>
            </div>
          )}

          {/* Camera Flip Button (Top Right) */}
          {hasMultipleCameras && isStreaming && !capturedImage && (
            <button
              type="button"
              onClick={toggleFacingMode}
              style={{
                position: 'absolute',
                top: '12px',
                right: '12px',
                background: 'rgba(0, 0, 0, 0.6)',
                border: '1px solid rgba(255, 255, 255, 0.25)',
                color: '#FFFFFF',
                borderRadius: '8px',
                padding: '6px 10px',
                fontSize: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
              }}
              title="Flip between front and rear camera"
            >
              <SwitchCamera size={14} /> Flip Camera
            </button>
          )}

          {/* Live Indicator (Top Left) */}
          {isStreaming && !capturedImage && (
            <div
              style={{
                position: 'absolute',
                top: '12px',
                left: '12px',
                background: 'rgba(0, 0, 0, 0.6)',
                padding: '4px 9px',
                borderRadius: '20px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '11px',
                fontWeight: 600,
                color: '#4ADE80',
              }}
            >
              <span
                style={{
                  width: '7px',
                  height: '7px',
                  borderRadius: '50%',
                  background: '#4ADE80',
                  boxShadow: '0 0 6px #4ADE80',
                }}
              />
              LIVE
            </div>
          )}
        </div>

        {/* Modal Controls Bar */}
        <div
          style={{
            padding: '16px 20px',
            background: '#FFFFFF',
            borderTop: '1px solid #E4E6F0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          {/* While Capturing */}
          {!capturedImage ? (
            <>
              <button
                type="button"
                onClick={handleClose}
                style={{
                  background: 'none',
                  border: '1px solid #DCDFEA',
                  borderRadius: '8px',
                  padding: '9px 16px',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#5A5C74',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={takeSnapshot}
                disabled={!isStreaming}
                style={{
                  background: isStreaming ? '#2E2C6E' : '#A0A3BD',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '50px',
                  padding: '10px 28px',
                  fontSize: '14px',
                  fontWeight: 700,
                  cursor: isStreaming ? 'pointer' : 'not-allowed',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: isStreaming ? '0 4px 14px rgba(46, 44, 110, 0.3)' : 'none',
                  transition: 'all 0.15s ease',
                }}
              >
                <Camera size={18} /> Capture Photo
              </button>

              <div style={{ width: '60px' }} />
            </>
          ) : (
            /* After Image is Snapped (Review Mode) */
            <>
              <button
                type="button"
                onClick={handleRetake}
                style={{
                  background: '#FFFFFF',
                  border: '1px solid #DCDFEA',
                  borderRadius: '8px',
                  padding: '9px 16px',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#5A5C74',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <RotateCcw size={15} /> Retake
              </button>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  onClick={handleConfirm}
                  style={{
                    background: '#2F9E68',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '9px 20px',
                    fontSize: '13.5px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 4px 12px rgba(47, 158, 104, 0.25)',
                  }}
                >
                  <Check size={16} /> Use This Photo
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default CameraCaptureModal;

