"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Route as Road,
  Train,
  Plane,
  Bell,
  Mail,
  MessageCircle,
  Pause,
  Play,
  Pencil,
  Trash2,
  Clock,
  Loader2,
} from "lucide-react";
import Link from "next/link";

export type AlertType = "ROAD" | "TRAIN" | "FLIGHT";
export type AlertChannel = "PUSH" | "EMAIL" | "TELEGRAM";
export type AlertFrequency = "REAL_TIME" | "DAILY" | "WEEKLY";
export type AlertStatus = "ACTIVE" | "PAUSED" | "DELETED";

export interface UserAlert {
  id: string;
  type: AlertType;
  targetKey: string;
  targetLabel: string;
  channels: AlertChannel[];
  frequency: AlertFrequency;
  status: AlertStatus;
  createdAt: string;
  lastTriggeredAt?: string | null;
}

interface AlertCardProps {
  alert: UserAlert;
  onToggle: (id: string, newStatus: "ACTIVE" | "PAUSED") => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

const TYPE_META: Record<AlertType, { label: string; icon: typeof Road; color: string }> = {
  ROAD: {
    label: "Carretera",
    icon: Road,
    color: "bg-tl-100 text-tl-700 dark:bg-tl-900/40 dark:text-tl-300",
  },
  TRAIN: {
    label: "Tren",
    icon: Train,
    color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  },
  FLIGHT: {
    label: "Vuelo",
    icon: Plane,
    color: "bg-tl-amber-100 text-tl-amber-600 dark:bg-tl-amber-900/40 dark:text-tl-amber-300",
  },
};

const CHANNEL_ICONS: Record<AlertChannel, { icon: typeof Bell; label: string }> = {
  PUSH: { icon: Bell, label: "Notificación web" },
  EMAIL: { icon: Mail, label: "Email" },
  TELEGRAM: { icon: MessageCircle, label: "Telegram" },
};

const FREQUENCY_LABELS: Record<AlertFrequency, string> = {
  REAL_TIME: "Tiempo real",
  DAILY: "Resumen diario",
  WEEKLY: "Resumen semanal",
};

export function AlertCard({ alert, onToggle, onDelete }: AlertCardProps) {
  const [toggling, setToggling] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const meta = TYPE_META[alert.type];
  const TypeIcon = meta.icon;

  async function handleToggle() {
    setToggling(true);
    try {
      await onToggle(alert.id, alert.status === "ACTIVE" ? "PAUSED" : "ACTIVE");
    } finally {
      setToggling(false);
    }
  }

  async function handleDelete() {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setDeleting(true);
    try {
      await onDelete(alert.id);
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className={[
        "rounded-xl border bg-white dark:bg-gray-900 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4",
        alert.status === "PAUSED"
          ? "border-gray-200 dark:border-gray-800 opacity-60"
          : "border-gray-200 dark:border-gray-800",
      ].join(" ")}
    >
      {/* Type icon */}
      <div
        className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${meta.color}`}
      >
        <TypeIcon className="w-5 h-5" aria-hidden="true" />
      </div>

      {/* Main info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className={`text-xs font-semibold px-2 py-0.5 rounded-full ${meta.color}`}
          >
            {meta.label}
          </span>
          {alert.status === "PAUSED" && (
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400">
              Pausada
            </span>
          )}
        </div>
        <p className="mt-1 font-semibold font-heading text-gray-900 dark:text-gray-100 truncate">
          {alert.targetLabel}
        </p>
        <div className="mt-1 flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" aria-hidden="true" />
            {FREQUENCY_LABELS[alert.frequency]}
          </span>
          {/* Channel icons */}
          <span className="flex items-center gap-1">
            {alert.channels.map((ch) => {
              const ChIcon = CHANNEL_ICONS[ch].icon;
              return (
                <ChIcon
                  key={ch}
                  className="w-3.5 h-3.5"
                  aria-label={CHANNEL_ICONS[ch].label}
                  title={CHANNEL_ICONS[ch].label}
                />
              );
            })}
          </span>
          {alert.lastTriggeredAt && (
            <span>
              Última alerta{" "}
              {new Date(alert.lastTriggeredAt).toLocaleDateString("es-ES", {
                day: "numeric",
                month: "short",
              })}
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {/* Pause / Play */}
        <button
          type="button"
          onClick={handleToggle}
          disabled={toggling || deleting}
          aria-label={alert.status === "ACTIVE" ? "Pausar alerta" : "Activar alerta"}
          className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-200 transition-colors disabled:opacity-40"
        >
          {toggling ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : alert.status === "ACTIVE" ? (
            <Pause className="w-4 h-4" />
          ) : (
            <Play className="w-4 h-4" />
          )}
        </button>

        {/* Edit */}
        <Link
          href={`/alertas/${alert.id}`}
          aria-label="Editar alerta"
          className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-tl-600 dark:hover:text-tl-300 transition-colors"
        >
          <Pencil className="w-4 h-4" />
        </Link>

        {/* Delete */}
        <AnimatePresence mode="wait">
          {confirmDelete ? (
            <motion.div
              key="confirm"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className="flex items-center gap-1"
            >
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="text-xs px-2 py-1 rounded bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {deleting ? <Loader2 className="w-3 h-3 animate-spin" /> : "Confirmar"}
              </button>
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="text-xs px-2 py-1 rounded bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                Cancelar
              </button>
            </motion.div>
          ) : (
            <motion.button
              key="delete"
              type="button"
              onClick={handleDelete}
              aria-label="Eliminar alerta"
              className="p-2 rounded-lg text-gray-500 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
