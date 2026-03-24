"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { AdSlot } from "./AdSlot";

export function StickyFooterAd() {
  const [show, setShow] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);

    const onScroll = () => {
      const scrolled = window.scrollY;
      const total = document.documentElement.scrollHeight - window.innerHeight;
      if (total > 0 && scrolled / total >= 0.5) {
        setShow(true);
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (dismissed || !show) return null;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 flex justify-center"
      style={{
        transform: "translateY(0)",
        transition: reducedMotion ? "none" : "transform 0.3s ease-out",
      }}
    >
      <div className="relative w-full max-w-screen-lg mx-auto bg-white border-t border-gray-200 shadow-lg">
        <button
          onClick={() => setDismissed(true)}
          aria-label="Cerrar publicidad"
          className="absolute -top-7 right-2 bg-white border border-gray-200 rounded-full p-1 shadow-sm hover:bg-gray-50 transition-colors"
        >
          <X className="w-3.5 h-3.5 text-gray-500" />
        </button>
        <AdSlot id="sticky-footer-global" format="sticky-footer" className="w-full" />
      </div>
    </div>
  );
}
