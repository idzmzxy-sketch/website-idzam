import { useCallback, useState } from 'react';
import Lightbox from './Lightbox';

interface ZoomableImageProps {
  src: string;
  alt: string;
  caption?: string;
  className?: string;
}

export default function ZoomableImage({ src, alt, caption, className = '' }: ZoomableImageProps) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`View ${alt} larger`}
        className="block w-full cursor-zoom-in"
      >
        <img src={src} alt={alt} loading="lazy" className={className} />
      </button>
      {open && <Lightbox src={src} alt={alt} caption={caption} onClose={close} />}
    </>
  );
}
