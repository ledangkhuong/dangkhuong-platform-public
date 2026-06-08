"use client";

import { useState } from "react";
import Image from "next/image";
import { Play } from "lucide-react";

/**
 * Click-to-play YouTube facade: renders a lightweight thumbnail + play button
 * and only mounts the real iframe (with autoplay) after the user clicks.
 *
 * Thumbnail strategy: try maxresdefault first (sharpest), fall back to
 * hqdefault on error. maxresdefault doesn't exist for every video (older
 * uploads / shorts), so the fallback prevents a broken-image render.
 */
export default function YouTubeFacade({
  videoId,
  title,
}: {
  videoId: string;
  title: string;
}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [thumbSrc, setThumbSrc] = useState(
    `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`
  );

  if (isPlaying) {
    return (
      <iframe
        src={`https://www.youtube.com/embed/${videoId}?autoplay=1`}
        title={title}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        className="absolute inset-0 w-full h-full"
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => setIsPlaying(true)}
      aria-label={`Phát video: ${title}`}
      className="absolute inset-0 w-full h-full group cursor-pointer"
    >
      <Image
        src={thumbSrc}
        alt={title}
        fill
        sizes="(max-width: 768px) 100vw, 640px"
        className="object-cover"
        onError={() =>
          setThumbSrc(`https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`)
        }
        unoptimized
      />
      <span className="absolute inset-0 flex items-center justify-center bg-black/20 transition-colors group-hover:bg-black/30">
        <span className="flex items-center justify-center w-16 h-16 rounded-full bg-[#D4A843] text-black shadow-lg transition-transform group-hover:scale-110">
          <Play size={28} fill="currentColor" className="ml-1" />
        </span>
      </span>
    </button>
  );
}
