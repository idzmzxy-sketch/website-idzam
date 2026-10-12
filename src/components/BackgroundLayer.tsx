import { useState } from 'react';
import type { BgSource } from '../lib/backgrounds';

function Media({ source }: { source: BgSource }) {
  const [failed, setFailed] = useState(false);

  if (source.mediaType === 'css') {
    return <div className={`absolute inset-0 ${source.themeClass ?? 'theme-midnight'}`} />;
  }
  if (failed || !source.url) {
    return <div className="absolute inset-0 theme-midnight" />;
  }
  if (source.mediaType === 'image') {
    return (
      <img
        src={source.url}
        alt=""
        className="absolute inset-0 w-full h-full object-cover"
        onError={() => setFailed(true)}
      />
    );
  }
  return (
    <video
      className="absolute inset-0 w-full h-full object-cover"
      src={source.url}
      autoPlay
      muted
      loop
      playsInline
      preload="auto"
      aria-hidden="true"
      onError={() => setFailed(true)}
    />
  );
}

export default function BackgroundLayer({ source }: { source: BgSource }) {
  return <Media key={source.id} source={source} />;
}
