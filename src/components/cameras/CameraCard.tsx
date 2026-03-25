"use client";

import { useState } from "react";
import { MapPin, AlertCircle } from "lucide-react";

export interface Camera {
  id: string;
  name: string;
  lat: number;
  lng: number;
  road: string;
  direction: string;
  kmPoint: number | null;
  province: string;
  imageUrl: string;
}

interface CameraCardProps {
  camera: Camera;
  onClick: () => void;
}

export function CameraCard({ camera, onClick }: CameraCardProps) {
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden cursor-pointer hover:shadow-md hover:border-tl-300 transition-all group"
    >
      {/* Image container with fixed aspect ratio */}
      <div className="relative aspect-video bg-gray-100 overflow-hidden">
        {!imageError ? (
          <>
            {/* Loading skeleton */}
            {!imageLoaded && (
              <div className="absolute inset-0 bg-gray-200 animate-pulse" />
            )}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={camera.imageUrl}
              alt={camera.name}
              className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 ${
                imageLoaded ? "opacity-100" : "opacity-0"
              }`}
              loading="lazy"
              onLoad={() => setImageLoaded(true)}
              onError={() => setImageError(true)}
            />
          </>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400">
            <AlertCircle className="w-8 h-8 mb-2" />
            <span className="text-sm">Sin imagen</span>
          </div>
        )}

        {/* Province badge */}
        <div className="absolute top-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded">
          {camera.province}
        </div>
      </div>

      {/* Info */}
      <div className="p-3">
        <h3 className="font-medium text-gray-900 text-sm truncate group-hover:text-tl-600 transition-colors">
          {camera.road}
          {camera.kmPoint !== null && (
            <span className="text-gray-500 font-normal"> km {camera.kmPoint}</span>
          )}
        </h3>
        {camera.direction && (
          <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
            <MapPin className="w-3 h-3" />
            {camera.direction}
          </p>
        )}
      </div>
    </div>
  );
}
