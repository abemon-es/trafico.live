"use client";

import { useState, useCallback } from "react";
import { Copy, Check, RefreshCw, Trash2, Plus, Key } from "lucide-react";
import type { ApiTierName } from "@/lib/api-tiers";
import { TierBadge } from "./TierBadge";
import { ConfirmDeleteModal } from "./ConfirmDeleteModal";
import { CreateKeyModal } from "./CreateKeyModal";

export interface ApiKeyRow {
  id: string;
  name: string;
  keyPreview: string;
  tier: ApiTierName;
  isActive: boolean;
  lastUsedAt: string | null;
  createdAt: string;
  requestsToday: number;
  rateLimitPerDay: number;
}

interface KeysTableProps {
  initialKeys: ApiKeyRow[];
  userTier: ApiTierName;
}

function formatDate(iso: string | null): string {
  if (!iso) return "Nunca";
  return new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "short", year: "numeric" }).format(
    new Date(iso)
  );
}

function CopyButton({ value, ariaLabel }: { value: string; ariaLabel: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={handleCopy}
      aria-label={ariaLabel}
      title={ariaLabel}
      className="p-1 rounded text-tl-400 hover:text-tl-600 dark:hover:text-tl-300 hover:bg-tl-50 dark:hover:bg-tl-900 transition-colors"
    >
      {copied ? (
        <Check className="w-4 h-4 text-tl-success" />
      ) : (
        <Copy className="w-4 h-4" />
      )}
    </button>
  );
}

export function KeysTable({ initialKeys, userTier }: KeysTableProps) {
  const [keys, setKeys] = useState<ApiKeyRow[]>(initialKeys);
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ApiKeyRow | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);

  const reload = useCallback(async () => {
    const res = await fetch("/api/dashboard/keys");
    const json = await res.json();
    if (json.success) setKeys(json.data);
  }, []);

  async function handleDelete(key: ApiKeyRow) {
    setDeletingId(key.id);
    try {
      await fetch(`/api/dashboard/keys/${key.id}`, { method: "DELETE" });
      setKeys((prev) => prev.filter((k) => k.id !== key.id));
    } finally {
      setDeletingId(null);
      setDeleteTarget(null);
    }
  }

  async function handleRegenerate(key: ApiKeyRow) {
    setRegeneratingId(key.id);
    try {
      const res = await fetch(`/api/dashboard/keys/${key.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "regenerate" }),
      });
      const json = await res.json();
      if (json.success && json.data?.key) {
        // Show new key in a small inline alert
        alert(`Nueva clave para "${key.name}" (guárdala ahora):\n\n${json.data.key}`);
        await reload();
      }
    } finally {
      setRegeneratingId(null);
    }
  }

  return (
    <>
      <div className="rounded-xl border border-tl-200 dark:border-tl-800 bg-white dark:bg-tl-950 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-tl-100 dark:border-tl-800">
          <div className="flex items-center gap-2">
            <Key className="w-4 h-4 text-tl-500" />
            <h2 className="text-base font-heading font-600 text-foreground">Claves API</h2>
            <span className="ml-1 text-xs font-mono text-tl-400 bg-tl-50 dark:bg-tl-900 border border-tl-100 dark:border-tl-800 rounded px-1.5 py-0.5">
              {keys.length}
            </span>
          </div>
          <button
            onClick={() => setCreateOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg bg-tl-600 hover:bg-tl-700 text-white transition-colors"
          >
            <Plus className="w-4 h-4" />
            Nueva clave
          </button>
        </div>

        {keys.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <Key className="w-8 h-8 text-tl-300 mx-auto mb-3" />
            <p className="text-sm text-tl-500 font-body">No tienes claves API activas.</p>
            <button
              onClick={() => setCreateOpen(true)}
              className="mt-3 text-sm text-tl-600 dark:text-tl-400 hover:underline font-medium"
            >
              Crear tu primera clave
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm" aria-label="Claves API">
              <thead>
                <tr className="border-b border-tl-100 dark:border-tl-800 bg-tl-50/50 dark:bg-tl-900/30">
                  <th scope="col" className="text-left px-5 py-3 text-xs font-medium text-tl-500 uppercase tracking-wide font-body">
                    Nombre
                  </th>
                  <th scope="col" className="text-left px-5 py-3 text-xs font-medium text-tl-500 uppercase tracking-wide font-body">
                    Clave
                  </th>
                  <th scope="col" className="text-left px-5 py-3 text-xs font-medium text-tl-500 uppercase tracking-wide font-body">
                    Plan
                  </th>
                  <th scope="col" className="text-left px-5 py-3 text-xs font-medium text-tl-500 uppercase tracking-wide font-body">
                    Creada
                  </th>
                  <th scope="col" className="text-left px-5 py-3 text-xs font-medium text-tl-500 uppercase tracking-wide font-body">
                    Último uso
                  </th>
                  <th scope="col" className="text-right px-5 py-3 text-xs font-medium text-tl-500 uppercase tracking-wide font-body">
                    Hoy
                  </th>
                  <th scope="col" className="text-right px-5 py-3 text-xs font-medium text-tl-500 uppercase tracking-wide font-body">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-tl-100 dark:divide-tl-800">
                {keys.map((k) => {
                  const pctToday = k.rateLimitPerDay > 0 && k.rateLimitPerDay !== Number.MAX_SAFE_INTEGER
                    ? Math.min(100, Math.round((k.requestsToday / k.rateLimitPerDay) * 100))
                    : 0;

                  return (
                    <tr
                      key={k.id}
                      className="hover:bg-tl-50/50 dark:hover:bg-tl-900/20 transition-colors"
                    >
                      <td className="px-5 py-3.5 font-medium text-foreground font-body">{k.name}</td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1.5">
                          <code className="font-mono text-xs text-tl-600 dark:text-tl-300 bg-tl-50 dark:bg-tl-900 px-2 py-0.5 rounded">
                            {k.keyPreview}
                          </code>
                          <CopyButton value={k.keyPreview} ariaLabel={`Copiar clave ${k.name}`} />
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <TierBadge tier={k.tier} />
                      </td>
                      <td className="px-5 py-3.5 text-tl-500 font-body text-xs whitespace-nowrap">
                        {formatDate(k.createdAt)}
                      </td>
                      <td className="px-5 py-3.5 text-tl-500 font-body text-xs whitespace-nowrap">
                        {formatDate(k.lastUsedAt)}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex flex-col items-end gap-1">
                          <span className="font-mono text-xs text-foreground">
                            {new Intl.NumberFormat("es-ES").format(k.requestsToday)}
                          </span>
                          {pctToday > 0 && (
                            <div
                              className="w-16 h-1 rounded-full bg-tl-100 dark:bg-tl-800 overflow-hidden"
                              role="progressbar"
                              aria-valuenow={pctToday}
                              aria-valuemin={0}
                              aria-valuemax={100}
                              aria-label={`${pctToday}% del límite diario usado`}
                            >
                              <div
                                className={`h-full rounded-full transition-all ${pctToday > 80 ? "bg-signal-red" : pctToday > 60 ? "bg-signal-amber" : "bg-tl-500"}`}
                                style={{ width: `${pctToday}%` }}
                              />
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleRegenerate(k)}
                            disabled={regeneratingId === k.id}
                            aria-label={`Regenerar clave ${k.name}`}
                            title="Regenerar clave"
                            className="p-1.5 rounded text-tl-400 hover:text-tl-amber-600 dark:hover:text-tl-amber-400 hover:bg-tl-amber-50 dark:hover:bg-tl-amber-900/20 transition-colors disabled:opacity-40"
                          >
                            <RefreshCw
                              className={`w-4 h-4 ${regeneratingId === k.id ? "animate-spin" : ""}`}
                            />
                          </button>
                          <button
                            onClick={() => setDeleteTarget(k)}
                            aria-label={`Revocar clave ${k.name}`}
                            title="Revocar clave"
                            className="p-1.5 rounded text-tl-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ConfirmDeleteModal
        isOpen={deleteTarget !== null}
        keyName={deleteTarget?.name ?? ""}
        onConfirm={() => deleteTarget && handleDelete(deleteTarget)}
        onCancel={() => setDeleteTarget(null)}
        isLoading={deletingId !== null}
      />

      <CreateKeyModal
        isOpen={createOpen}
        userTier={userTier}
        onClose={() => setCreateOpen(false)}
        onCreated={reload}
      />
    </>
  );
}
