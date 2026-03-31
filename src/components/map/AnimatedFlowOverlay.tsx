"use client";

import { useEffect, useRef } from "react";
import type maplibregl from "maplibre-gl";

interface AnimatedFlowOverlayProps {
  map: maplibregl.Map | null;
  enabled: boolean;
  flowData: GeoJSON.FeatureCollection | null;
}

/**
 * Creates an animated traffic flow visualization using MapLibre's
 * line-dasharray property cycling to simulate particle movement
 * along road segments.
 */
export function useAnimatedFlow({ map, enabled, flowData }: AnimatedFlowOverlayProps) {
  const animationRef = useRef<number | null>(null);
  const stepRef = useRef(0);

  useEffect(() => {
    if (!map || !enabled || !flowData) {
      // Cleanup
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      if (map?.getLayer("flow-animated")) {
        map.setLayoutProperty("flow-animated", "visibility", "none");
      }
      return;
    }

    // Add source if needed
    if (!map.getSource("traffic-flow")) {
      map.addSource("traffic-flow", {
        type: "geojson",
        data: flowData,
      });
    } else {
      (map.getSource("traffic-flow") as maplibregl.GeoJSONSource).setData(
        flowData as maplibregl.GeoJSONSourceSpecification["data"]
      );
    }

    // Add background line (solid color showing flow state)
    if (!map.getLayer("flow-background")) {
      map.addLayer({
        id: "flow-background",
        type: "line",
        source: "traffic-flow",
        layout: {
          "line-join": "round",
          "line-cap": "round",
        },
        paint: {
          "line-color": ["get", "flowColor"],
          "line-width": ["interpolate", ["linear"], ["zoom"], 5, 2, 10, 4, 15, 8],
          "line-opacity": 0.4,
        },
      });
    }

    // Add animated dashed line on top
    if (!map.getLayer("flow-animated")) {
      map.addLayer({
        id: "flow-animated",
        type: "line",
        source: "traffic-flow",
        layout: {
          "line-join": "round",
          "line-cap": "round",
          visibility: "visible",
        },
        paint: {
          "line-color": ["get", "flowColor"],
          "line-width": ["interpolate", ["linear"], ["zoom"], 5, 1.5, 10, 3, 15, 6],
          "line-opacity": 0.8,
          "line-dasharray": [0, 4, 3],
        },
        // Only show flow animation on segments with incidents
        filter: ["!=", ["get", "flowLevel"], "free"],
      });
    } else {
      map.setLayoutProperty("flow-animated", "visibility", "visible");
    }

    // Animate the dash pattern
    const dashArraySequence = [
      [0, 4, 3],
      [0.5, 4, 2.5],
      [1, 4, 2],
      [1.5, 4, 1.5],
      [2, 4, 1],
      [2.5, 4, 0.5],
      [3, 4, 0],
      [0, 0.5, 3, 3.5],
      [0, 1, 3, 3],
      [0, 1.5, 3, 2.5],
      [0, 2, 3, 2],
      [0, 2.5, 3, 1.5],
      [0, 3, 3, 1],
      [0, 3.5, 3, 0.5],
    ];

    let lastTime = 0;
    const FRAME_INTERVAL = 80; // ms between frames

    function animate(timestamp: number) {
      if (timestamp - lastTime >= FRAME_INTERVAL) {
        lastTime = timestamp;
        stepRef.current = (stepRef.current + 1) % dashArraySequence.length;
        if (map.getLayer("flow-animated")) {
          map.setPaintProperty("flow-animated", "line-dasharray", dashArraySequence[stepRef.current]);
        }
      }
      animationRef.current = requestAnimationFrame(animate);
    }

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    };
  }, [map, enabled, flowData]);
}
