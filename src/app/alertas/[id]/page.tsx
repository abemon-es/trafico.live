"use client";

import { useState, useEffect, use } from "react";
import { motion } from "motion/react";
import { useRouter } from "next/navigation";
import {
  Bell,
  Mail,
  MessageCircle,
  Loader2,
  Trash2,
  Save,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";
import { FrequencyPicker, type AlertFrequency } from "@/components/alertas/FrequencyPicker";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type AlertChannel = "PUSH" | "EMAIL" | "TELEGRAM";

interface UserAlert {
  id: string;
  type: "ROAD" | "TRAIN" | "FLIGHT";
  targetKey: string;
  targetLabel: string;
  channels: AlertChannel[];
  frequency: AlertFrequency;
  status: "ACTIVE" | "PAUSED";
  createdAt: string;
  lastTriggeredAt?: string | null;
}

const TYPE_LABELS = { ROAD: "Carretera", TRAIN: "Tren", FLIGHT: "Vuelo" };

const CHANNEL_OPTIONS: {
  value: AlertChannel;
  label: string;
  icon: typeof Bell;
}[] = [
  { value: "PUSH", label: "Notificación web", icon: Bell },
  { value: "EMAIL", label: "Email", icon: Mail },
  { value: "TELEGRAM", label: "Telegram", icon: MessageCircle },
];

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function EditAlertaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const [alert, setAlert] = useState<UserAlert | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Editable state
  const [targetLabel, setTargetLabel] = useState("");
  const [channels, setChannels] = useState<AlertChannel[]>([]);
  const [frequency, setFrequency] = useState<AlertFrequency>("REAL_TIME");

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/alerts/${id}`, { credentials: "same-origin" });
        if (!res.ok) {
          if (res.status === 404) setError("Alerta no encontrada");
          else if (res.status === 401) setError("auth");
          else setError("Error al cargar la alerta");
          return;
        }
        const data = (await res.json()) as { alert: UserAlert };
        setAlert(data.alert);
        setTargetLabel(data.alert.targetLabel);
        setChannels(data.alert.channels);
        setFrequency(data.alert.frequency);
      } catch {
        setError("Error de conexión");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  function toggleChannel(ch: AlertChannel) {
    setChannels((prev) =>
      prev.includes(ch) ? prev.filter((c) => c !== ch) : [...prev, ch]
    );
  }

  async function handleSave() {
    if (!alert) return;
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch(`/api/alerts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ targetLabel, channels, frequency }),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        setSaveError(data.error ?? "Error al guardar");
        return;
      }
      router.push("/alertas?saved=1");
    } catch {
      setSaveError("Error de conexión");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setDeleting(true);
    try {
      await fetch(`/api/alerts/${id}`, {
        method: "DELETE",
        credentials: "same-origin",
      });
      router.push("/alertas?deleted=1");
    } catch {
      setError("Error al eliminar");
      setDeleting(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Render states
  // ---------------------------------------------------------------------------
  if (error === "auth") {
    return (
      <main className="max-w-xl mx-auto px-4 py-10 text-center">
        <p className="text-gray-500 dark:text-gray-400">
          Necesitas{" "}
          <Link href="/login" className="text-tl-600 font-semibold hover:underline">
            iniciar sesión
          </Link>{" "}
          para gestionar alertas.
        </p>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="max-w-xl mx-auto px-4 py-10 flex justify-center">
        <Loader2 className="w-8 h-8 text-tl-500 animate-spin" />
      </main>
    );
  }

  if (error || !alert) {
    return (
      <main className="max-w-xl mx-auto px-4 py-10">
        <div className="rounded-xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-900/20 p-4 text-sm text-red-700 dark:text-red-300">
          {error ?? "Alerta no encontrada"}
        </div>
        <Link
          href="/alertas"
          className="mt-4 inline-flex items-center gap-2 text-sm text-tl-600 hover:underline"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver a alertas
        </Link>
      </main>
    );
  }

  return (
    <main className="max-w-xl mx-auto px-4 py-8 space-y-6" id="main-content">
      {/* Breadcrumb */}
      <nav className="text-sm text-gray-500 dark:text-gray-400">
        <Link href="/" className="hover:text-[var(--tl-primary)] transition-colors">
          Inicio
        </Link>
        <span className="mx-2">/</span>
        <Link href="/alertas" className="hover:text-[var(--tl-primary)] transition-colors">
          Mis alertas
        </Link>
        <span className="mx-2">/</span>
        <span className="text-gray-900 dark:text-gray-100 font-semibold">Editar</span>
      </nav>

      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/alertas"
          aria-label="Volver"
          className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-xl font-bold font-heading text-gray-900 dark:text-gray-100">
            Editar alerta
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {TYPE_LABELS[alert.type]} · {alert.targetKey}
          </p>
        </div>
      </div>

      {/* Form card */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 sm:p-6 space-y-5"
      >
        {/* Target label */}
        <div>
          <label
            htmlFor="target-label"
            className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1"
          >
            Descripción
          </label>
          <input
            id="target-label"
            type="text"
            value={targetLabel}
            onChange={(e) => setTargetLabel(e.target.value)}
            className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2.5 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-tl-600 focus:border-transparent"
          />
        </div>

        {/* Channels */}
        <div>
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
            Canales
          </p>
          <div className="flex flex-wrap gap-2">
            {CHANNEL_OPTIONS.map((opt) => {
              const Icon = opt.icon;
              const selected = channels.includes(opt.value);
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => toggleChannel(opt.value)}
                  className={[
                    "inline-flex items-center gap-2 px-3 py-2 rounded-lg border-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-tl-600",
                    selected
                      ? "border-tl-600 bg-tl-50 text-tl-700 dark:bg-tl-900/20 dark:border-tl-400 dark:text-tl-300"
                      : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 hover:border-tl-300",
                  ].join(" ")}
                  aria-pressed={selected}
                >
                  <Icon className="w-4 h-4" aria-hidden="true" />
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Frequency */}
        <div>
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
            Frecuencia
          </p>
          <FrequencyPicker value={frequency} onChange={setFrequency} />
        </div>

        {saveError && (
          <div className="rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-900/20 px-4 py-3 text-sm text-red-700 dark:text-red-300">
            {saveError}
          </div>
        )}

        <button
          type="button"
          onClick={handleSave}
          disabled={saving || channels.length === 0}
          className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-tl-600 text-white font-semibold text-sm hover:bg-tl-700 disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-tl-600 transition-colors"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Guardando…
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Guardar cambios
            </>
          )}
        </button>
      </motion.div>

      {/* Delete zone */}
      <div className="rounded-xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-900/10 p-4">
        <h2 className="text-sm font-semibold text-red-700 dark:text-red-300 mb-1">
          Zona de peligro
        </h2>
        <p className="text-xs text-red-600 dark:text-red-400 mb-3">
          Al eliminar esta alerta perderás toda su configuración. Esta acción no se puede deshacer.
        </p>
        {confirmDelete ? (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 text-white font-semibold text-sm hover:bg-red-700 disabled:opacity-50 transition-colors"
            >
              {deleting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
              Confirmar eliminación
            </button>
            <button
              type="button"
              onClick={() => setConfirmDelete(false)}
              className="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              Cancelar
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={handleDelete}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-red-300 dark:border-red-800 text-red-700 dark:text-red-400 font-semibold text-sm hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Eliminar alerta
          </button>
        )}
      </div>
    </main>
  );
}
