"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Play, Pause, SkipBack, SkipForward, Clock, History } from "lucide-react";

interface TimelineSlot {
  timestamp: string;
  count: number;
}

interface TimeSliderProps {
  slots: TimelineSlot[];
  currentIndex: number;
  onIndexChange: (index: number) => void;
  isPlaying: boolean;
  onPlayToggle: () => void;
  isLoading?: boolean;
}

function formatSlotTime(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
}

function formatSlotDate(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  if (isToday) return "Hoy";
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return "Ayer";
  return date.toLocaleDateString("es-ES", { day: "numeric", month: "short" });
}

export function TimeSlider({
  slots,
  currentIndex,
  onIndexChange,
  isPlaying,
  onPlayToggle,
  isLoading = false,
}: TimeSliderProps) {
  const sliderRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const maxCount = Math.max(...slots.map((s) => s.count), 1);
  const currentSlot = slots[currentIndex];

  const handleSliderClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!sliderRef.current || slots.length === 0) return;
      const rect = sliderRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const pct = Math.max(0, Math.min(1, x / rect.width));
      const index = Math.round(pct * (slots.length - 1));
      onIndexChange(index);
    },
    [slots, onIndexChange]
  );

  const handleMouseDown = useCallback(() => setIsDragging(true), []);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!sliderRef.current || slots.length === 0) return;
      const rect = sliderRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const pct = Math.max(0, Math.min(1, x / rect.width));
      const index = Math.round(pct * (slots.length - 1));
      onIndexChange(index);
    };

    const handleMouseUp = () => setIsDragging(false);

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, slots, onIndexChange]);

  if (slots.length === 0) return null;

  return (
    <div className="bg-white dark:bg-gray-900/95 backdrop-blur-sm border-t border-gray-200 dark:border-gray-800 px-4 py-3">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 text-sm">
          <History className="w-4 h-4 text-tl-500" />
          <span className="font-medium text-gray-700 dark:text-gray-300">Evolución temporal</span>
          {isLoading && (
            <span className="text-xs text-gray-400 animate-pulse">Cargando...</span>
          )}
        </div>
        {currentSlot && (
          <div className="flex items-center gap-1.5 text-sm">
            <Clock className="w-3.5 h-3.5 text-gray-400" />
            <span className="text-gray-500 dark:text-gray-400">
              {formatSlotDate(currentSlot.timestamp)} {formatSlotTime(currentSlot.timestamp)}
            </span>
            <span className="font-mono font-medium text-gray-700 dark:text-gray-300 ml-1">
              {currentSlot.count}
            </span>
            <span className="text-gray-400 text-xs">incidencias</span>
          </div>
        )}
      </div>

      {/* Controls + Slider */}
      <div className="flex items-center gap-3">
        {/* Playback controls */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => onIndexChange(0)}
            className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
            title="Inicio"
          >
            <SkipBack className="w-4 h-4" />
          </button>
          <button
            onClick={onPlayToggle}
            className="p-2 bg-tl-600 hover:bg-tl-700 text-white rounded-full transition-colors shadow-sm"
            title={isPlaying ? "Pausar" : "Reproducir"}
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
          </button>
          <button
            onClick={() => onIndexChange(slots.length - 1)}
            className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
            title="Ahora"
          >
            <SkipForward className="w-4 h-4" />
          </button>
        </div>

        {/* Timeline bar with histogram */}
        <div className="flex-1 relative">
          {/* Histogram bars */}
          <div className="flex items-end h-8 gap-px mb-1">
            {slots.map((slot, i) => {
              const height = (slot.count / maxCount) * 100;
              const isActive = i === currentIndex;
              const isPast = i < currentIndex;
              return (
                <div
                  key={i}
                  className="flex-1 min-w-0 rounded-t-sm transition-all duration-150"
                  style={{
                    height: `${Math.max(height, 4)}%`,
                    backgroundColor: isActive
                      ? "var(--color-tl-600, #1b4bd5)"
                      : isPast
                        ? "var(--color-tl-300, #94b6ff)"
                        : "var(--color-tl-100, #dde8ff)",
                    opacity: isActive ? 1 : isPast ? 0.8 : 0.5,
                  }}
                />
              );
            })}
          </div>

          {/* Scrub track */}
          <div
            ref={sliderRef}
            className="relative h-2 bg-gray-200 dark:bg-gray-700 rounded-full cursor-pointer select-none"
            onClick={handleSliderClick}
            onMouseDown={handleMouseDown}
          >
            {/* Progress fill */}
            <div
              className="absolute top-0 left-0 h-full bg-tl-500 rounded-full transition-all"
              style={{ width: `${(currentIndex / Math.max(slots.length - 1, 1)) * 100}%` }}
            />
            {/* Thumb */}
            <div
              className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white border-2 border-tl-600 rounded-full shadow-md transition-all"
              style={{ left: `calc(${(currentIndex / Math.max(slots.length - 1, 1)) * 100}% - 8px)` }}
            />
          </div>

          {/* Time labels */}
          <div className="flex justify-between mt-1">
            <span className="text-xs text-gray-400">
              {slots.length > 0 ? formatSlotTime(slots[0].timestamp) : ""}
            </span>
            <span className="text-xs text-gray-400">
              {slots.length > 0 ? formatSlotTime(slots[slots.length - 1].timestamp) : ""}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
