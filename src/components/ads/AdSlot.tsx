"use client";

import { Suspense, useEffect, useRef, useState } from "react";

interface AdSlotProps {
  id: string;
  format: "banner" | "sidebar" | "inline" | "sticky-footer";
  className?: string;
}

const FORMAT_HEIGHTS: Record<AdSlotProps["format"], number> = {
  banner: 90,
  sidebar: 250,
  inline: 250,
  "sticky-footer": 60,
};

function AdSlotInner({ id, format, className }: AdSlotProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px" }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const minHeight = FORMAT_HEIGHTS[format];

  return (
    <div
      ref={ref}
      className={className}
      style={{ minHeight }}
      aria-label="Publicidad"
    >
      {visible && (
        <div
          data-ad-slot={id}
          data-ad-format={format}
          style={{ minHeight }}
          className="w-full flex flex-col items-center justify-center bg-gray-50 border border-gray-100 rounded"
        >
          <span className="text-[10px] text-gray-300 select-none uppercase tracking-widest">
            Publicidad
          </span>
        </div>
      )}
    </div>
  );
}

export function AdSlot(props: AdSlotProps) {
  return (
    <Suspense fallback={<div style={{ minHeight: FORMAT_HEIGHTS[props.format] }} />}>
      <AdSlotInner {...props} />
    </Suspense>
  );
}
