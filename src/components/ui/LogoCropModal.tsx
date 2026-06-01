'use client';

import { useState, useRef, useCallback } from 'react';
import ReactCrop, { type Crop, type PixelCrop, centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { X, Check } from 'lucide-react';

interface Props {
    src: string;
    onConfirm: (file: File) => void;
    onCancel: () => void;
}

function centerAspectCrop(width: number, height: number): Crop {
    return centerCrop(
        makeAspectCrop({ unit: '%', width: 80 }, 1, width, height),
        width, height,
    );
}

const MAX_LOGO_SIZE = 512;

async function cropImageToFile(img: HTMLImageElement, pixelCrop: PixelCrop, fileName: string): Promise<File> {
    const canvas = document.createElement('canvas');
    const srcSize = Math.max(pixelCrop.width, pixelCrop.height);
    const outSize = Math.min(srcSize, MAX_LOGO_SIZE);
    canvas.width = outSize;
    canvas.height = outSize;
    const ctx = canvas.getContext('2d')!;
    // Fill white first — JPEG has no transparency; without this, transparent
    // pixels in PNG logos render as solid black in the output file.
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, outSize, outSize);
    ctx.drawImage(
        img,
        pixelCrop.x, pixelCrop.y,
        pixelCrop.width, pixelCrop.height,
        0, 0, outSize, outSize,
    );
    return new Promise(resolve => {
        canvas.toBlob(blob => {
            resolve(new File([blob!], fileName.replace(/\.\w+$/, '.jpg'), { type: 'image/jpeg' }));
        }, 'image/jpeg', 0.85);
    });
}

export default function LogoCropModal({ src, onConfirm, onCancel }: Props) {
    const imgRef = useRef<HTMLImageElement>(null);
    const [crop, setCrop] = useState<Crop>();
    const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
    const [loading, setLoading] = useState(false);

    const onImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
        const { naturalWidth, naturalHeight } = e.currentTarget;
        setCrop(centerAspectCrop(naturalWidth, naturalHeight));
    }, []);

    const handleConfirm = async () => {
        if (!imgRef.current || !completedCrop) return;
        setLoading(true);
        try {
            const file = await cropImageToFile(imgRef.current, completedCrop, 'logo.jpg');
            onConfirm(file);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[10000] flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-700">
                    <div>
                        <h3 className="font-bold text-slate-900 dark:text-white text-sm">Crop Logo</h3>
                        <p className="text-xs text-slate-400 mt-0.5">Drag to reposition · resize handles to adjust</p>
                    </div>
                    <button onClick={onCancel} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 transition-colors">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <div className="p-5 flex flex-col items-center gap-4 bg-slate-900">
                    <ReactCrop
                        crop={crop}
                        onChange={c => setCrop(c)}
                        onComplete={c => setCompletedCrop(c)}
                        aspect={1}
                        circularCrop={false}
                        keepSelection
                        minWidth={40}
                        minHeight={40}
                    >
                        <img
                            ref={imgRef}
                            src={src}
                            alt="Crop preview"
                            onLoad={onImageLoad}
                            style={{ maxHeight: '60vh', maxWidth: '100%', objectFit: 'contain' }}
                        />
                    </ReactCrop>
                </div>

                {/* Preview */}
                {completedCrop && imgRef.current && (
                    <div className="px-5 py-3 flex items-center gap-3 bg-slate-50 dark:bg-slate-700/50 border-t border-slate-100 dark:border-slate-700">
                        <span className="text-xs text-slate-500 dark:text-slate-400 font-medium shrink-0">Preview:</span>
                        <CropPreview img={imgRef.current} crop={completedCrop} />
                    </div>
                )}

                <div className="flex gap-3 px-5 py-4">
                    <button
                        onClick={onCancel}
                        className="flex-1 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-white rounded-xl px-4 py-2.5 font-semibold text-sm hover:bg-slate-50 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={!completedCrop || loading}
                        className="flex-1 flex items-center justify-center gap-2 bg-[var(--brand)] hover:opacity-90 text-white rounded-xl px-4 py-2.5 font-semibold text-sm transition-all disabled:opacity-50"
                    >
                        {loading
                            ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            : <Check className="w-4 h-4" />
                        }
                        Use This Crop
                    </button>
                </div>
            </div>
        </div>
    );
}

function CropPreview({ img, crop }: { img: HTMLImageElement; crop: PixelCrop }) {
    const scaleX = img.naturalWidth / img.width;
    const scaleY = img.naturalHeight / img.height;
    const size = 44;
    const scale = size / Math.max(crop.width, crop.height);

    return (
        <div
            style={{
                width: size, height: size,
                borderRadius: 10,
                overflow: 'hidden',
                border: '2px solid rgba(255,255,255,0.2)',
                position: 'relative',
                flexShrink: 0,
                background: '#1e293b',
            }}
        >
            <img
                src={img.src}
                alt="preview"
                style={{
                    position: 'absolute',
                    top: -crop.y * scale / scaleY,
                    left: -crop.x * scale / scaleX,
                    width: img.width * scale,
                    height: img.height * scale,
                }}
            />
        </div>
    );
}
