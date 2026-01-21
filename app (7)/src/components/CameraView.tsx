import React, { useState, useEffect, useRef } from 'react';
import { PhotoWithMeta } from '../types';

interface CameraViewProps {
    mode: 'single-case' | 'patrol';
    onCancel?: () => void;
    onDone?: (photos: PhotoWithMeta[]) => void;
    onSaveSet?: (photos: PhotoWithMeta[]) => void;
    onFinishPatrol?: (photos: PhotoWithMeta[]) => void;
}

const CameraView: React.FC<CameraViewProps> = ({ mode, onCancel, onDone, onSaveSet, onFinishPatrol }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [imageCapture, setImageCapture] = useState<ImageCapture | null>(null);
    const [capturedPhotos, setCapturedPhotos] = useState<PhotoWithMeta[]>([]);
    
    const [zoom, setZoom] = useState(1);
    const [zoomCapabilities, setZoomCapabilities] = useState<{min: number, max: number, step: number} | null>(null);
    const [torch, setTorch] = useState(false);
    const [torchAvailable, setTorchAvailable] = useState(false);

    useEffect(() => {
        let activeStream: MediaStream | null = null;
        const videoConstraints = {
            facingMode: 'environment',
            width: { ideal: 4096 },
            height: { ideal: 2160 }
        };

        navigator.mediaDevices.getUserMedia({ video: videoConstraints })
            .then(mediaStream => {
                activeStream = mediaStream;
                setStream(mediaStream);
                if (videoRef.current) videoRef.current.srcObject = mediaStream;
                const track = mediaStream.getVideoTracks()[0];
                
                if (typeof ImageCapture !== 'undefined') {
                    setImageCapture(new ImageCapture(track));
                } else {
                    console.warn("ImageCapture API not supported, falling back to canvas method.");
                }

                const capabilities = track.getCapabilities();
                if (capabilities.zoom) {
                    setZoomCapabilities({
                        min: capabilities.zoom.min,
                        max: capabilities.zoom.max,
                        step: capabilities.zoom.step,
                    });
                    setZoom(capabilities.zoom.min);
                }
                if (capabilities.torch) {
                    setTorchAvailable(true);
                }
            })
            .catch(err => {
                console.error("Could not access camera.", err);
                alert("Could not access camera. Please ensure permissions are granted in your browser settings.");
            });
            
        return () => { activeStream?.getTracks().forEach(track => track.stop()); };
    }, []);
    
    useEffect(() => {
        if (!stream || !zoomCapabilities) return;
        const track = stream.getVideoTracks()[0];
        track.applyConstraints({ advanced: [{ zoom: zoom }] }).catch(e => console.warn("Could not apply zoom", e));
    }, [zoom, stream, zoomCapabilities]);

    useEffect(() => {
        if (!stream || !torchAvailable) return;
        const track = stream.getVideoTracks()[0];
        track.applyConstraints({ advanced: [{ torch: torch }] }).catch(e => console.warn("Could not apply torch", e));
    }, [torch, stream, torchAvailable]);

    const handleCapture = () => {
        const processBlob = (blob: Blob | null) => {
            if (!blob) return;
            const file = new File([blob], `capture-${Date.now()}.jpg`, { type: 'image/jpeg' });
            const reader = new FileReader();
            reader.onload = () => {
                const dataUrl = reader.result as string;
                const newPhoto: PhotoWithMeta = { file, dataUrl };
                setCapturedPhotos(prev => [...prev, newPhoto]);
            };
            reader.readAsDataURL(blob);
        };

        const captureWithCanvas = () => {
            if (!videoRef.current) return;
            const canvas = document.createElement('canvas');
            canvas.width = videoRef.current.videoWidth;
            canvas.height = videoRef.current.videoHeight;
            canvas.getContext('2d')?.drawImage(videoRef.current, 0, 0);
            canvas.toBlob(processBlob, 'image/jpeg', 1.0);
        };

        if (imageCapture) {
            imageCapture.takePhoto()
                .then(processBlob)
                .catch(error => {
                    console.error('ImageCapture failed, falling back to canvas:', error);
                    captureWithCanvas();
                });
        } else {
            captureWithCanvas();
        }
    };
    
    const handleDeletePhoto = (index: number) => {
        setCapturedPhotos(prev => prev.filter((_, i) => i !== index));
    };

    const handleSaveAndNext = () => {
        if (onSaveSet) {
            onSaveSet(capturedPhotos);
            setCapturedPhotos([]);
        }
    };
    
    return (
        <div className="camera-overlay">
            <div className="camera-video-wrapper"><video ref={videoRef} autoPlay playsInline className="camera-video" /></div>
            
            <div className="camera-top-controls">
                {torchAvailable && (
                    <button className={`camera-icon-button ${torch ? 'active' : ''}`} onClick={() => setTorch(!torch)} aria-label="Toggle Flash">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>
                    </button>
                )}
            </div>
            
            {capturedPhotos.length > 0 && (
                <div className="captured-photos-bar">
                    {capturedPhotos.map((p, i) => 
                        <div key={i} className="captured-thumbnail">
                            <img src={p.dataUrl} alt={`Captured photo ${i+1}`} />
                            <button className="delete-photo" onClick={() => handleDeletePhoto(i)}>&times;</button>
                        </div>
                    )}
                </div>
            )}
            
            {zoomCapabilities && (
                <input type="range" className="camera-zoom-slider" min={zoomCapabilities.min} max={zoomCapabilities.max} step={zoomCapabilities.step} value={zoom} onChange={e => setZoom(parseFloat(e.target.value))} />
            )}
            
            <div className="camera-controls">
                {mode === 'single-case' ? (
                    <>
                        <button className="camera-action-button" onClick={onCancel}>Cancel</button>
                        <button className="capture-button" onClick={handleCapture} aria-label="Capture photo"><div className="capture-button-inner" /></button>
                        <button className="camera-action-button" onClick={() => onDone && onDone(capturedPhotos)} disabled={capturedPhotos.length === 0}>Done ({capturedPhotos.length})</button>
                    </>
                ) : ( // patrol mode
                    <>
                        <button className="camera-action-button" onClick={() => onFinishPatrol && onFinishPatrol(capturedPhotos)}>Finish Patrol</button>
                        <button className="capture-button" onClick={handleCapture} aria-label="Capture photo"><div className="capture-button-inner" /></button>
                        <button className="camera-action-button" onClick={handleSaveAndNext} disabled={capturedPhotos.length === 0}>Save &amp; Next</button>
                    </>
                )}
            </div>
        </div>
    );
};

export default CameraView;