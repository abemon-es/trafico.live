"use client";

import { useState } from "react";
import { Key, Loader2, CheckCircle2, Copy, Check } from "lucide-react";

interface ApiKeyResponse {
  key: string;
  tier: string;
  rateLimits: { perMinute: number; perDay: number };
  createdAt: string;
}

export function ApiKeyForm() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ApiKeyResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name: name || undefined }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Error al crear la clave. Inténtalo de nuevo.");
        return;
      }

      setResult(data as ApiKeyResponse);
    } catch {
      setError("Error de red. Comprueba tu conexión e inténtalo de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  async function copyKey() {
    if (!result) return;
    await navigator.clipboard.writeText(result.key);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (result) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3 p-4 rounded-xl bg-[color:var(--tl-primary-bg)] border border-tl-200 dark:border-tl-700">
          <CheckCircle2 className="w-5 h-5 text-[color:var(--tl-success)] flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-foreground">
              Clave creada correctamente
            </p>
            <p className="text-xs text-tl-600 dark:text-tl-300 mt-0.5">
              Plan FREE · {result.rateLimits.perMinute} req/min · {result.rateLimits.perDay.toLocaleString("es-ES")} req/día
            </p>
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold text-tl-600 dark:text-tl-300 uppercase tracking-wide mb-2">
            Tu API Key
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 font-data text-xs bg-tl-950 dark:bg-tl-950 text-tl-100 px-4 py-3 rounded-lg overflow-x-auto whitespace-nowrap">
              {result.key}
            </code>
            <button
              onClick={copyKey}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-tl-200 dark:border-tl-700 text-sm font-medium text-tl-600 dark:text-tl-300 hover:bg-[color:var(--tl-primary-bg)] transition-colors flex-shrink-0"
              type="button"
            >
              {copied ? (
                <Check className="w-4 h-4 text-[color:var(--tl-success)]" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
              {copied ? "Copiado" : "Copiar"}
            </button>
          </div>
        </div>

        <p className="text-xs text-tl-500 dark:text-tl-400">
          Guarda esta clave en un lugar seguro. La enviaremos también a{" "}
          <strong className="text-foreground">{email}</strong>. Añádela como header{" "}
          <code className="font-data bg-tl-100 dark:bg-tl-900 px-1.5 py-0.5 rounded text-tl-700 dark:text-tl-200">
            X-API-Key
          </code>{" "}
          en cada petición.
        </p>

        <button
          onClick={() => {
            setResult(null);
            setEmail("");
            setName("");
          }}
          className="text-xs text-tl-500 dark:text-tl-400 hover:text-tl-600 dark:hover:text-tl-300 underline underline-offset-2"
          type="button"
        >
          Solicitar otra clave
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label
          htmlFor="api-email"
          className="block text-sm font-medium text-foreground mb-1.5"
        >
          Email de contacto
        </label>
        <input
          id="api-email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="tu@empresa.com"
          className="w-full px-4 py-2.5 rounded-lg border border-tl-200 dark:border-tl-700 bg-background text-foreground placeholder-tl-400 focus:outline-none focus:ring-2 focus:ring-[color:var(--tl-primary)] focus:border-transparent text-sm transition-shadow"
        />
      </div>

      <div>
        <label
          htmlFor="api-name"
          className="block text-sm font-medium text-foreground mb-1.5"
        >
          Nombre del proyecto{" "}
          <span className="text-tl-400 font-normal">(opcional)</span>
        </label>
        <input
          id="api-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Mi app de tráfico"
          maxLength={80}
          className="w-full px-4 py-2.5 rounded-lg border border-tl-200 dark:border-tl-700 bg-background text-foreground placeholder-tl-400 focus:outline-none focus:ring-2 focus:ring-[color:var(--tl-primary)] focus:border-transparent text-sm transition-shadow"
        />
      </div>

      {error && (
        <p className="text-sm text-[color:var(--tl-danger)] bg-tl-50 dark:bg-tl-950 border border-tl-200 dark:border-tl-800 rounded-lg px-4 py-3">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading || !email}
        className="w-full flex items-center justify-center gap-2 bg-[color:var(--tl-primary)] hover:bg-[color:var(--tl-primary-hover)] text-white font-semibold px-6 py-3 rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Key className="w-4 h-4" />
        )}
        {loading ? "Generando clave…" : "Obtener API Key gratis"}
      </button>

      <p className="text-xs text-tl-400 text-center">
        Sin tarjeta de crédito. Plan FREE: 10 req/min, 1.000 req/día.
      </p>
    </form>
  );
}
