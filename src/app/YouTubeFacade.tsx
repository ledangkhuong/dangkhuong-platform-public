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
  poster,
  priority = false,
}: {
  videoId: string;
  title: string;
  /**
   * Optional local poster path (e.g. "/images/hero/offer-banner.jpg").
   * When provided, the facade skips the YouTube thumbnail CDN entirely —
   * the local image loads from the same origin as the page, dramatically
   * faster than i.ytimg.com (no CORS, no extra DNS, no maxres-404 retry).
   */
  poster?: string;
  /** Mark as priority for above-the-fold video posters (preloads the image). */
  priority?: boolean;
}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [thumbSrc, setThumbSrc] = useState(
    poster ?? `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`
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

  const isLocalPoster = thumbSrc.startsWith("/");

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
        priority={priority}
        onError={() => {
          // Only fall back through YouTube thumbnails if we're not using a
          // local poster (a local 404 means the dev typo'd the path —
          // they should see the error, not get a silent YouTube fallback).
          if (!isLocalPoster) {
            setThumbSrc(`https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`);
          }
        }}
        unoptimized={!isLocalPoster}
      />
      <span className="absolute inset-0 flex items-center justify-center bg-black/20 transition-colors group-hover:bg-black/30">
        <span className="flex items-center justify-center w-16 h-16 rounded-full bg-[#D4A843] text-black shadow-lg transition-transform group-hover:scale-110">
          <Play size={28} fill="currentColor" className="ml-1" />
        </span>
      </span>
    </button>
  );
}
