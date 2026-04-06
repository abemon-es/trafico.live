"use client";

import dynamic from "next/dynamic";

const RouteMap = dynamic(() => import("./route-map"), { ssr: false });

export default function RouteMapWrapper(props: React.ComponentProps<typeof RouteMap>) {
  return <RouteMap {...props} />;
}
