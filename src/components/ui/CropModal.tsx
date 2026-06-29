'use client';

import { useState, useRef, useCallback } from 'react';
import ReactCrop, {
  type Crop,
  type PixelCrop,
  centerCrop,
  makeAspectCrop,
} from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { X, Check, Crop as CropIcon } from 'lucide-react';

interface CropModalProps {
  src: string;
  fileName: string;
  onConfirm: (file: File) => void;
  onCancel: () => void;
  aspect?: number;        // e.g. 1 for square, 16/9 for widescreen; omit for free-form
  circularCrop?: boolean;
  title?: string;
  outputSize?: number;    // max px for output canvas (default 800)
}

function makeCenteredCrop(
  width: number,
  height: number,
  aspect?: number,
): Crop {
  if (!aspect) {
    return { unit: '%', x: 10, y: 10, width: 80, height: 80 };
  }
  return centerCrop(
    makeAspectCrop({ unit: '%', width: 80 }, aspect, width, height),
    width,
    height,
  );
}

async function cropToFile(
  img: HTMLImageElement,
  pixelCrop: PixelCrop,
  fileName: string,
  outputSize: number,
): Promise<File> {
  // react-image-crop reports the crop in the *displayed* image's pixels; the source image is
  // full resolution. Scale the crop rect into natural pixels before reading from it, otherwise
  // drawImage grabs only the top-left fraction of the original (what you cropped != what shows).
  const scaleX = img.naturalWidth / img.width;
  const scaleY = img.naturalHeight / img.height;
  const sx = pixelCrop.x * scaleX;
  const sy = pixelCrop.y * scaleY;
  const sWidth = pixelCrop.width * scaleX;
  const sHeight = pixelCrop.height * scaleY;

  const canvas = document.createElement('canvas');
  const scale = Math.min(outputSize / sWidth, outputSize / sHeight);
  canvas.width = Math.round(sWidth * scale);
  canvas.height = Math.round(sHeight * scale);
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(
    img,
    sx, sy,
    sWidth, sHeight,
    0, 0, canvas.width, canvas.height,
  );
  return new Promise(resolve => {
    canvas.toBlob(
      blob => resolve(new File([blob!], fileName.replace(/\.\w+$/, '.jpg'), { type: 'image/jpeg' })),
      'image/jpeg',
      0.88,
    );
  });
}

function CropPreview({
  img,
  crop,
  circular,
}: {
  img: HTMLImageElement;
  crop: PixelCrop;
  circular: boolean;
}) {
  const scaleX = img.naturalWidth / img.width;
  const scaleY = img.naturalHeight / img.height;
  const size = 52;
  const scale = size / Math.max(crop.width, crop.height);

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: circular ? '50%' : 10,
        overflow: 'hidden',
        border: '2px solid rgba(255,255,255,0.25)',
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
          top: -(crop.y * scale) / scaleY,
          left: -(crop.x * scale) / scaleX,
          width: img.width * scale,
          height: img.height * scale,
        }}
      />
    </div>
  );
}

export default function CropModal({
  src,
  fileName,
  onConfirm,
  onCancel,
  aspect = 1,
  circularCrop = false,
  title = 'Crop Image',
  outputSize = 800,
}: CropModalProps) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [saving, setSaving] = useState(false);

  const onImageLoad = useCallback(
    (e: React.SyntheticEvent<HTMLImageElement>) => {
      const { naturalWidth, naturalHeight } = e.currentTarget;
      setCrop(makeCenteredCrop(naturalWidth, naturalHeight, aspect));
    },
    [aspect],
  );

  const handleConfirm = async () => {
    if (!imgRef.current || !completedCrop) return;
    setSaving(true);
    try {
      const file = await cropToFile(imgRef.current, completedCrop, fileName, outputSize);
      onConfirm(file);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-[10000] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-700">
          <div className="flex items-center gap-2.5">
            <CropIcon className="w-4 h-4 text-[var(--brand)]" />
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-sm">{title}</h3>
              <p className="text-xs text-slate-400 mt-0.5">Drag to reposition · handles to resize</p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Crop canvas */}
        <div className="p-5 flex flex-col items-center bg-slate-900">
          <ReactCrop
            crop={crop}
            onChange={c => setCrop(c)}
            onComplete={c => setCompletedCrop(c)}
            aspect={aspect}
            circularCrop={circularCrop}
            keepSelection
            minWidth={40}
            minHeight={40}
          >
            <img
              ref={imgRef}
              src={src}
              alt="Crop"
              onLoad={onImageLoad}
              style={{ maxHeight: '55vh', maxWidth: '100%', objectFit: 'contain' }}
            />
          </ReactCrop>
        </div>

        {/* Preview row */}
        {completedCrop && imgRef.current && (
          <div className="px-5 py-3 flex items-center gap-3 bg-slate-50 dark:bg-slate-700/50 border-t border-slate-100 dark:border-slate-700">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium shrink-0">
              Preview:
            </span>
            <CropPreview
              img={imgRef.current}
              crop={completedCrop}
              circular={circularCrop}
            />
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 px-5 py-4">
          <button
            onClick={onCancel}
            className="flex-1 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-white rounded-xl px-4 py-2.5 font-semibold text-sm hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!completedCrop || saving}
            className="flex-1 flex items-center justify-center gap-2 bg-[var(--brand)] hover:opacity-90 text-white rounded-xl px-4 py-2.5 font-semibold text-sm transition-all disabled:opacity-50"
          >
            {saving ? (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Check className="w-4 h-4" />
            )}
            Use This Crop
          </button>
        </div>
      </div>
    </div>
  );
}
