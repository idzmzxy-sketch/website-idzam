import { useCallback, useState } from 'react';
import Lightbox from './Lightbox';

interface RemoteImageProps {
  thumb: string;
  alt: string;
  caption?: string;
  className?: string;
  /** Fetches the full-size picture (a data URL) when the thumbnail is tapped. */
  loadFull: () => Promise<string | null>;
}

export default function RemoteImage({ thumb, alt, caption, className = '', loadFull }: RemoteImageProps) {
  const [open, setOpen] = useState(false);
  const [full, setFull] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const close = useCallback(() => setOpen(false), []);

  const onOpen = () => {
    setOpen(true);
    if (full || loading) return;
    setLoading(true);
    setFailed(false);
    loadFull()
      .then((data) => {
        if (data) setFull(data);
        else setFailed(true);
      })
      .catch(() => setFailed(true))
      .finally(() => setLoading(false));
  };

  const note = failed ? 'Could not load the full image.' : loading ? 'Loading full image...' : caption;

  return (
    <>
      <button type="button" onClick={onOpen} aria-label={`View ${alt} larger`} className="block w-full cursor-zoom-in">
        <img src={thumb} alt={alt} loading="lazy" className={className} />
      </button>
      {open && <Lightbox src={full ?? thumb} alt={alt} caption={note} onClose={close} />}
    </>
  );
}
