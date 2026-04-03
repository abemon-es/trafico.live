import { useState, useCallback } from "react";
import type { InfrastructureDetail } from "@/components/map/InfrastructureDetailPanel";

export function useDetailPanel() {
  const [detail, setDetail] = useState<InfrastructureDetail | null>(null);

  const showDetail = useCallback((d: InfrastructureDetail) => {
    setDetail(d);
  }, []);

  const hideDetail = useCallback(() => {
    setDetail(null);
  }, []);

  return { detail, showDetail, hideDetail };
}
