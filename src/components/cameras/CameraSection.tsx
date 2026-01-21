"use client";

import { useState } from "react";
import Link from "next/link";
import { Camera, ChevronRight, AlertCircle } from "lucide-react";
import { CameraModal } from "./CameraModal";

export interface CameraItem {
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

interface CameraSectionProps {
  cameras: CameraItem[];
  title?: string;
  linkUrl?: string;
  linkText?: string;
  maxItems?: number;
}

export function CameraSection({
  cameras,
  title = "Cámaras de Tráfico",
  linkUrl,
  linkText = "Ver todas las cámaras",
  maxItems = 8,
}: CameraSectionProps) {
  const [selectedCamera, setSelectedCamera] = useState<CameraItem | null>(null);
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());

  const displayCameras = cameras.slice(0, maxItems);
  const hasMore = cameras.length > maxItems;

  if (cameras.length === 0) {
    return null;
  }

  const handleImageError = (cameraId: string) => {
    setImageErrors((prev) => new Set(prev).add(cameraId));
  };

  return (
    <div className="mb-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
          <Camera className="w-5 h-5 text-blue-600" />
          {title}
          <span className="text-sm font-normal text-gray-500">
            ({cameras.length})
          </span>
        </h2>
        {linkUrl && (
          <Link
            href={linkUrl}
            className="text-blue-600 hover:text-blue-700 text-sm flex items-center gap-1"
          >
            {linkText}
            <ChevronRight className="w-4 h-4" />
          </Link>
        )}
      </div>

      {/* Camera Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {displayCameras.map((camera) => (
          <button
            key={camera.id}
            onClick={() => setSelectedCamera(camera)}
            className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md hover:border-blue-300 transition-all text-left group"
          >
            {/* Thumbnail */}
            <div className="relative aspect-video bg-gray-100">
              {!imageErrors.has(camera.id) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={camera.imageUrl}
                  alt={camera.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  loading="lazy"
                  onError={() => handleImageError(camera.id)}
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                  <AlertCircle className="w-6 h-6" />
                </div>
              )}
              {/* Province badge */}
              <div className="absolute top-1 right-1 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded">
                {camera.province}
              </div>
            </div>

            {/* Info */}
            <div className="p-2">
              <p className="text-xs font-medium text-gray-900 truncate group-hover:text-blue-600 transition-colors">
                {camera.road}
                {camera.kmPoint !== null && (
                  <span className="text-gray-500 font-normal">
                    {" "}km {camera.kmPoint}
                  </span>
                )}
              </p>
            </div>
          </button>
        ))}
      </div>

      {/* Show more link */}
      {hasMore && linkUrl && (
        <div className="mt-3 text-center">
          <Link
            href={linkUrl}
            className="text-sm text-blue-600 hover:text-blue-700 hover:underline"
          >
            Ver las {cameras.length} cámaras →
          </Link>
        </div>
      )}

      {/* Modal */}
      {selectedCamera && (
        <CameraModal
          camera={selectedCamera}
          onClose={() => setSelectedCamera(null)}
        />
      )}
    </div>
  );
}
