"use client";

import dynamic from "next/dynamic";
import { Plane } from "lucide-react";

const AviationMap = dynamic(() => import("./aviation-map"), {
  ssr: false,
  loading: () => (
    <div className="w-full bg-gray-50 dark:bg-gray-900 animate-pulse flex items-center justify-center" style={{ height: "500px" }}>
      <Plane className="w-10 h-10 text-gray-300 dark:text-gray-700" />
    </div>
  ),
});

export function AviationMapWrapper() {
  return <AviationMap height="500px" />;
}
