import { useState } from 'react';
import { Film } from 'lucide-react';
import type { BgSource } from '../lib/backgrounds';

export default function BgPreview({ source, className = '' }: { source: BgSource; className?: string }) {
  const [failed, setFailed] = useState(false);
  const base = `relative overflow-hidden bg-black/40 ${className}`;

  if (source.mediaType === 'css') {
    return (
      <div className={base}>
        <div className={`absolute inset-0 ${source.themeClass ?? ''}`} />
      </div>
    );
  }
  if (failed || !source.url) {
    return (
      <div className={`${base} flex items-center justify-center text-white/60`}>
        <Film size={18} />
      </div>
    );
  }
  if (source.mediaType === 'image') {
    return (
      <div className={base}>
        <img
          src={source.url}
          alt=""
          loading="lazy"
          className="absolute inset-0 w-full h-full object-cover"
          onError={() => setFailed(true)}
        />
      </div>
    );
  }
  return (
    <div className={base}>
      <video
        src={`${source.url}#t=0.1`}
        muted
        playsInline
        preload="metadata"
        aria-hidden="true"
        className="absolute inset-0 w-full h-full object-cover"
        onError={() => setFailed(true)}
      />
    </div>
  );
}
