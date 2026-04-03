"use client";

import { useState } from "react";
import { Mail, CheckCircle, AlertCircle } from "lucide-react";

export function DigestForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;

    setStatus("loading");
    try {
      const res = await fetch("/api/digest/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setStatus("success");
        setMessage("Revisa tu email para confirmar la suscripción.");
        setEmail("");
      } else {
        setStatus("error");
        setMessage(data.error || "Error al suscribirse.");
      }
    } catch {
      setStatus("error");
      setMessage("Error de conexión. Inténtalo de nuevo.");
    }
  }

  if (status === "success") {
    return (
      <div className="flex items-center gap-3 p-4 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
        <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
        <p className="text-sm text-green-800 dark:text-green-200">{message}</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="flex items-center gap-2 mb-2">
        <Mail className="w-5 h-5 text-tl-primary" />
        <h3 className="font-heading font-semibold text-sm text-gray-900 dark:text-gray-100">
          Resumen semanal de tráfico
        </h3>
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400">
        Recibe cada lunes un resumen con incidentes, precios de combustible y alertas meteorológicas.
      </p>
      <div className="flex gap-2">
        <input
          type="email"
          value={email}
          onChange={(e) => { setEmail(e.target.value); setStatus("idle"); }}
          placeholder="tu@email.com"
          required
          className="flex-1 px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-tl-primary/50"
        />
        <button
          type="submit"
          disabled={status === "loading"}
          className="px-4 py-2 text-sm font-semibold rounded-lg bg-tl-primary text-white hover:bg-tl-primary/90 disabled:opacity-50 transition-colors whitespace-nowrap"
        >
          {status === "loading" ? "..." : "Suscribir"}
        </button>
      </div>
      {status === "error" && (
        <div className="flex items-center gap-2 text-xs text-red-600 dark:text-red-400">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
          {message}
        </div>
      )}
    </form>
  );
}
