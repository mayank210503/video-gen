import { useEffect, useId, useRef, useState } from 'react';

interface Props {
  index: number;
  label: string;
  file: File | null;
  kind?: 'image' | 'video';
  disabled?: boolean;
  onChange: (file: File | null) => void;
  onError: (message: string) => void;
}

const mediaConfig = {
  image: {
    allowedTypes: new Set(['image/jpeg', 'image/png', 'image/webp']),
    accept: '.jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp',
    maxBytes: 16 * 1024 * 1024,
    noun: 'image',
    hint: 'JPG, PNG or WebP',
  },
  video: {
    allowedTypes: new Set(['video/mp4', 'video/quicktime', 'video/webm']),
    accept: '.mp4,.mov,.webm,video/mp4,video/quicktime,video/webm',
    maxBytes: 64 * 1024 * 1024,
    noun: 'video',
    hint: 'MP4, MOV or WebM',
  },
} as const;

export function ImageUploadCard({ index, label, file, kind = 'image', disabled, onChange, onError }: Props) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [preview, setPreview] = useState<string>();
  const config = mediaConfig[kind];

  useEffect(() => {
    if (!file) { setPreview(undefined); return; }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const choose = (candidate?: File) => {
    if (!candidate) return;
    if (!config.allowedTypes.has(candidate.type)) {
      return onError(`Use a ${config.hint} ${config.noun}.`);
    }
    if (candidate.size > config.maxBytes) {
      return onError(`Each ${config.noun} must be ${(config.maxBytes / (1024 * 1024)).toFixed(0)} MB or smaller.`);
    }
    onChange(candidate);
  };

  return (
    <article className={`overflow-hidden rounded-xl border bg-panel transition ${dragging ? 'border-accent shadow-glow' : 'border-line'} ${disabled ? 'opacity-55' : ''}`}>
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <div>
          <span className="mr-2 text-xs font-semibold tracking-[.16em] text-accent">0{index}</span>
          <h3 className="inline text-sm font-semibold text-text">{label}</h3>
        </div>
        {file && !disabled && (
          <button type="button" onClick={() => onChange(null)} className="rounded px-2 py-1 text-xs text-muted hover:bg-white/5 hover:text-text">Remove</button>
        )}
      </div>
      <div
        className="relative m-3 flex min-h-44 items-center justify-center overflow-hidden rounded-lg border border-dashed border-line bg-ink/50 text-center"
        onDragEnter={(event) => { event.preventDefault(); if (!disabled) setDragging(true); }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => { event.preventDefault(); setDragging(false); if (!disabled) choose(event.dataTransfer.files[0]); }}
      >
        {preview ? (
          <>
            {kind === 'video'
              ? <video src={preview} muted playsInline controls className="absolute inset-0 h-full w-full object-cover" />
              : <img src={preview} alt={`${label} reference preview`} className="absolute inset-0 h-full w-full object-cover" />}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
            <div className="relative mt-auto flex w-full items-end justify-between gap-3 p-3 text-left">
              <p className="min-w-0 truncate text-xs text-white/90">{file?.name}</p>
              {!disabled && <button type="button" onClick={() => inputRef.current?.click()} className="shrink-0 rounded-md bg-black/55 px-3 py-2 text-xs font-medium text-white backdrop-blur hover:bg-black/75">Replace</button>}
            </div>
          </>
        ) : (
          <label htmlFor={inputId} className={`flex h-full w-full flex-col items-center justify-center px-5 py-8 ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
            <span aria-hidden="true" className="mb-3 grid h-9 w-9 place-items-center rounded-full border border-line bg-panel text-xl text-accent">+</span>
            <span className="text-sm font-medium text-text">Drop {config.noun} or browse</span>
            <span className="mt-1 text-xs text-muted">{config.hint} · max {(config.maxBytes / (1024 * 1024)).toFixed(0)} MB</span>
          </label>
        )}
        <input ref={inputRef} id={inputId} type="file" accept={config.accept} className="sr-only" disabled={disabled} onChange={(event) => { choose(event.target.files?.[0]); event.target.value = ''; }} />
      </div>
    </article>
  );
}
