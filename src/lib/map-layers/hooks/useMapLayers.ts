"use client";

import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { LAYER_REGISTRY } from "../registry";
import { PRESET_LAYERS } from "../groups";
import type { LayerDefinition, MapPreset } from "../types";

const URL_PARAM = "layers";

interface UseMapLayersOptions {
  preset?: MapPreset;
  initialLayers?: string[];
  availableLayers?: string[];
  syncUrl?: boolean;
}

interface UseMapLayersResult {
  activeLayers: string[];
  availableLayers: LayerDefinition[];
  toggleLayer: (id: string) => void;
  setActiveLayers: (ids: string[]) => void;
}

/**
 * Manages active map layer state with optional URL sync.
 *
 * Priority for initial state:
 *   1. URL param `?layers=id1,id2` (when syncUrl=true)
 *   2. `initialLayers` prop
 *   3. preset default layers
 */
export function useMapLayers(opts: UseMapLayersOptions = {}): UseMapLayersResult {
  const { preset, initialLayers, availableLayers: allowedIds, syncUrl = false } = opts;

  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const availableLayers = useMemo<LayerDefinition[]>(() => {
    if (allowedIds && allowedIds.length > 0) {
      return LAYER_REGISTRY.filter((l) => allowedIds.includes(l.id));
    }
    return LAYER_REGISTRY;
  }, [allowedIds]);

  const availableIds = useMemo(() => availableLayers.map((l) => l.id), [availableLayers]);

  const getInitialLayers = useCallback((): string[] => {
    if (syncUrl) {
      const fromUrl = searchParams.get(URL_PARAM);
      if (fromUrl) {
        const ids = fromUrl.split(",").filter((id) => availableIds.includes(id));
        if (ids.length > 0) return ids;
      }
    }
    if (initialLayers && initialLayers.length > 0) {
      return initialLayers.filter((id) => availableIds.includes(id));
    }
    if (preset && PRESET_LAYERS[preset]) {
      return PRESET_LAYERS[preset].filter((id) => availableIds.includes(id));
    }
    return [];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [activeLayers, setActiveLayersState] = useState<string[]>(getInitialLayers);

  const syncUrlRef = useRef(syncUrl);
  syncUrlRef.current = syncUrl;

  useEffect(() => {
    if (!syncUrlRef.current) return;
    const params = new URLSearchParams(searchParams.toString());
    if (activeLayers.length > 0) {
      params.set(URL_PARAM, activeLayers.join(","));
    } else {
      params.delete(URL_PARAM);
    }
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [activeLayers, pathname, router, searchParams]);

  const toggleLayer = useCallback((id: string) => {
    setActiveLayersState((prev) =>
      prev.includes(id) ? prev.filter((l) => l !== id) : [...prev, id],
    );
  }, []);

  const setActiveLayers = useCallback(
    (ids: string[]) => {
      setActiveLayersState(ids.filter((id) => availableIds.includes(id)));
    },
    [availableIds],
  );

  return { activeLayers, availableLayers, toggleLayer, setActiveLayers };
}
