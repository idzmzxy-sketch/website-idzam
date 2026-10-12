import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

interface LightboxProps {
  src: string;
  alt: string;
  caption?: string;
  onClose: () => void;
}

// Rendered in a portal on <body>: the glass cards use backdrop-filter, which would otherwise
// trap a `position: fixed` child inside the card instead of covering the whole screen.
export default function Lightbox({ src, alt, caption, onClose }: LightboxProps) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={alt}
      className="fixed inset-0 z-[90] flex flex-col items-center justify-center bg-black/85 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <button
        ref={closeRef}
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="btn-glass absolute right-4 top-4 w-10 h-10 rounded-full flex items-center justify-center"
      >
        <X size={20} />
      </button>
      <img
        src={src}
        alt={alt}
        onClick={(e) => e.stopPropagation()}
        className="max-w-full max-h-[calc(100dvh-8rem)] object-contain rounded-xl shadow-2xl"
      />
      {caption && <p className="mt-3 text-sm text-white/90 text-center max-w-xl">{caption}</p>}
    </div>,
    document.body
  );
}
