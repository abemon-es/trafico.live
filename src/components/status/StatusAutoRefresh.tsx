"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function StatusAutoRefresh({ intervalSec = 30 }: { intervalSec?: number }) {
  const router = useRouter();
  useEffect(() => {
    const id = window.setInterval(() => {
      router.refresh();
    }, intervalSec * 1000);
    return () => window.clearInterval(id);
  }, [router, intervalSec]);
  return null;
}
