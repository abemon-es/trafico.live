"use client";

import { useEffect, useRef, useState } from "react";
import { Key, X, Copy, Check, AlertCircle } from "lucide-react";
import type { ApiTierName } from "@/lib/api-tiers";
import { TierBadge } from "./TierBadge";

interface CreateKeyModalProps {
  isOpen: boolean;
  userTier: ApiTierName;
  onClose: () => void;
  onCreated: () => void;
}

type Step = "form" | "success";

const AVAILABLE_TIERS: ApiTierName[] = ["FREE", "PRO", "ENTERPRISE"];

function getAllowedTiers(userTier: ApiTierName): ApiTierName[] {
  const tierRank: Record<ApiTierName, number> = { FREE: 0, PRO: 1, ENTERPRISE: 2 };
  return AVAILABLE_TIERS.filter((t) => tierRank[t] <= tierRank[userTier]);
}

export function CreateKeyModal({ isOpen, userTier, onClose, onCreated }: CreateKeyModalProps) {
  const [step, setStep] = useState<Step>("form");
  const [name, setName] = useState("");
  const [tier, setTier] = useState<ApiTierName>("FREE");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const nameRef = useRef<HTMLInputElement>(null);
  const allowedTiers = getAllowedTiers(userTier);

  // Reset on open
  useEffect(() => {
    if (isOpen) {
      setStep("form");
      setName("");
      setTier("FREE");
      setError(null);
      setCreatedKey(null);
      setCopied(false);
      setTimeout(() => nameRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handle = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    document.addEventListener("keydown", handle);
    return () => document.removeEventListener("keydown", handle);
  }, [isOpen, step]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleClose() {
    if (step === "success") onCreated();
    onClose();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError("El nombre no puede estar vacío");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/dashboard/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), tier }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.error ?? "Error al crear la clave");
        return;
      }
      setCreatedKey(json.data.key);
      setStep("success");
    } catch {
      setError("Error de conexión. Inténtalo de nuevo.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCopy() {
    if (!createdKey) return;
    await navigator.clipboard.writeText(createdKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-key-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        aria-hidden="true"
        onClick={handleClose}
      />

      <div className="relative z-10 w-full max-w-md rounded-xl bg-white dark:bg-tl-950 border border-tl-200 dark:border-tl-800 shadow-2xl p-6">
        <button
          onClick={handleClose}
          aria-label="Cerrar"
          className="absolute top-4 right-4 text-tl-400 hover:text-tl-600 dark:hover:text-tl-300 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* --- FORM STEP --- */}
        {step === "form" && (
          <>
            <div className="flex items-center gap-3 mb-5">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-tl-50 dark:bg-tl-900">
                <Key className="w-5 h-5 text-tl-600 dark:text-tl-400" />
              </div>
              <h2 id="create-key-title" className="text-lg font-heading font-700 text-foreground">
                Nueva clave API
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="key-name"
                  className="block text-sm font-medium text-foreground mb-1.5 font-body"
                >
                  Nombre descriptivo
                </label>
                <input
                  ref={nameRef}
                  id="key-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="p.ej. Producción App Web"
                  maxLength={64}
                  required
                  className="w-full px-3 py-2 text-sm rounded-lg border border-tl-200 dark:border-tl-700 bg-white dark:bg-tl-900 text-foreground placeholder:text-tl-400 focus:outline-none focus:ring-2 focus:ring-tl-500 dark:focus:ring-tl-400 transition-colors font-body"
                />
                <p className="mt-1 text-xs text-tl-400 font-body">{name.length}/64 caracteres</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5 font-body">
                  Tipo de clave
                </label>
                <div className="space-y-2">
                  {allowedTiers.map((t) => (
                    <label
                      key={t}
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        tier === t
                          ? "border-tl-500 bg-tl-50 dark:bg-tl-900/60 dark:border-tl-500"
                          : "border-tl-200 dark:border-tl-700 hover:border-tl-300 dark:hover:border-tl-600"
                      }`}
                    >
                      <input
                        type="radio"
                        name="tier"
                        value={t}
                        checked={tier === t}
                        onChange={() => setTier(t)}
                        className="sr-only"
                      />
                      <div
                        className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                          tier === t
                            ? "border-tl-500 bg-tl-500"
                            : "border-tl-300 dark:border-tl-600"
                        }`}
                      >
                        {tier === t && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>
                      <TierBadge tier={t} />
                    </label>
                  ))}
                </div>
              </div>

              {error && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800">
                  <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700 dark:text-red-400 font-body">{error}</p>
                </div>
              )}

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={handleClose}
                  className="flex-1 px-4 py-2 text-sm font-medium rounded-lg border border-tl-200 dark:border-tl-700 text-foreground hover:bg-tl-50 dark:hover:bg-tl-900 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isLoading || !name.trim()}
                  className="flex-1 px-4 py-2 text-sm font-medium rounded-lg bg-tl-600 hover:bg-tl-700 text-white transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Creando...
                    </>
                  ) : (
                    <>
                      <Key className="w-4 h-4" />
                      Crear clave
                    </>
                  )}
                </button>
              </div>
            </form>
          </>
        )}

        {/* --- SUCCESS STEP --- */}
        {step === "success" && createdKey && (
          <>
            <div className="flex items-center gap-3 mb-5">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-tl-50 dark:bg-tl-900">
                <Check className="w-5 h-5 text-tl-600 dark:text-tl-400" />
              </div>
              <h2 id="create-key-title" className="text-lg font-heading font-700 text-foreground">
                Clave creada
              </h2>
            </div>

            <div className="mb-4 p-3 rounded-lg bg-tl-amber-50 dark:bg-tl-amber-900/20 border border-tl-amber-200 dark:border-tl-amber-800 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-tl-amber-600 dark:text-tl-amber-400 shrink-0 mt-0.5" />
              <p className="text-sm text-tl-amber-800 dark:text-tl-amber-300 font-body">
                <strong>Guarda esta clave ahora.</strong> No se volverá a mostrar.
              </p>
            </div>

            <div className="mb-5">
              <p className="text-xs text-tl-500 mb-1.5 font-body">Tu nueva clave API</p>
              <div className="flex items-center gap-2 p-3 rounded-lg bg-tl-50 dark:bg-tl-900 border border-tl-200 dark:border-tl-800">
                <code className="flex-1 text-sm font-mono text-tl-700 dark:text-tl-300 break-all">
                  {createdKey}
                </code>
                <button
                  onClick={handleCopy}
                  aria-label="Copiar clave"
                  className="shrink-0 p-1.5 rounded text-tl-500 hover:text-tl-700 dark:hover:text-tl-300 hover:bg-tl-100 dark:hover:bg-tl-800 transition-colors"
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-tl-success" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <button
              onClick={handleClose}
              className="w-full px-4 py-2 text-sm font-medium rounded-lg bg-tl-600 hover:bg-tl-700 text-white transition-colors"
            >
              Entendido, he guardado la clave
            </button>
          </>
        )}
      </div>
    </div>
  );
}
