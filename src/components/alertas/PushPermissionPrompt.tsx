"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Bell, X } from "lucide-react";

const STORAGE_KEY = "tl:push-prompt-dismissed";
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

async function registerPushSubscription(userId: string): Promise<void> {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
  if (!VAPID_PUBLIC_KEY) {
    console.warn("[push] NEXT_PUBLIC_VAPID_PUBLIC_KEY not set — skipping subscription");
    return;
  }

  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
  });

  await fetch("/api/alerts/push-subscription", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-user-id": userId,
    },
    body: JSON.stringify(sub.toJSON()),
  });
}

interface PushPermissionPromptProps {
  /** userId from session — required to save the subscription server-side */
  userId?: string | null;
}

export function PushPermissionPrompt({ userId }: PushPermissionPromptProps) {
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [granted, setGranted] = useState(false);

  useEffect(() => {
    // Only show if:
    // 1. Browser supports push
    // 2. Not already granted
    // 3. User hasn't dismissed the prompt before
    if (!("Notification" in window)) return;
    if (Notification.permission === "granted") return;
    if (typeof localStorage !== "undefined" && localStorage.getItem(STORAGE_KEY)) return;
    setShow(true);
  }, []);

  // Register SW on mount (noop if already registered)
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw-push.js").catch((err) => {
      console.warn("[push] SW registration failed:", err);
    });
  }, []);

  async function handleEnable() {
    setLoading(true);
    try {
      const perm = await Notification.requestPermission();
      if (perm === "granted" && userId) {
        await registerPushSubscription(userId);
        setGranted(true);
        setShow(false);
      } else {
        setShow(false);
        localStorage.setItem(STORAGE_KEY, "1");
      }
    } finally {
      setLoading(false);
    }
  }

  function handleDismiss() {
    setShow(false);
    localStorage.setItem(STORAGE_KEY, "1");
  }

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          role="alert"
          className="fixed bottom-6 right-4 left-4 sm:left-auto sm:w-96 z-50 rounded-xl border border-tl-200 dark:border-tl-800 bg-white dark:bg-gray-900 shadow-2xl p-4 flex items-start gap-3"
        >
          <div className="w-10 h-10 rounded-lg bg-tl-100 dark:bg-tl-900/40 flex items-center justify-center flex-shrink-0">
            <Bell className="w-5 h-5 text-tl-600 dark:text-tl-400" aria-hidden="true" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              Alertas en tiempo real
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Activa las notificaciones para recibir alertas de tráfico al instante, sin abrir la app.
            </p>
            <div className="mt-3 flex items-center gap-2">
              <button
                type="button"
                onClick={handleEnable}
                disabled={loading}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-tl-600 text-white hover:bg-tl-700 transition-colors disabled:opacity-50"
              >
                {loading ? "Activando…" : "Activar notificaciones"}
              </button>
              <button
                type="button"
                onClick={handleDismiss}
                className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
              >
                Ahora no
              </button>
            </div>
          </div>
          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Cerrar"
            className="p-1 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors flex-shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </motion.div>
      )}
      {granted && (
        <motion.div
          key="granted"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="fixed bottom-6 right-4 left-4 sm:left-auto sm:w-80 z-50 rounded-xl bg-tl-600 text-white px-4 py-3 text-sm font-semibold shadow-xl"
        >
          Notificaciones activadas
        </motion.div>
      )}
    </AnimatePresence>
  );
}
