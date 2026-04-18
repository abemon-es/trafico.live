"use client";

import { useEffect, useRef } from "react";
import { Trash2, X } from "lucide-react";

interface ConfirmDeleteModalProps {
  isOpen: boolean;
  keyName: string;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function ConfirmDeleteModal({
  isOpen,
  keyName,
  onConfirm,
  onCancel,
  isLoading = false,
}: ConfirmDeleteModalProps) {
  const confirmRef = useRef<HTMLButtonElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  // Focus trap + initial focus on cancel (safer default)
  useEffect(() => {
    if (isOpen) {
      cancelRef.current?.focus();
    }
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
      if (e.key === "Tab") {
        const focusable = [cancelRef.current, confirmRef.current].filter(Boolean) as HTMLElement[];
        const idx = focusable.indexOf(document.activeElement as HTMLElement);
        e.preventDefault();
        const next = e.shiftKey ? (idx - 1 + focusable.length) % focusable.length : (idx + 1) % focusable.length;
        focusable[next]?.focus();
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-modal-title"
      aria-describedby="delete-modal-desc"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        aria-hidden="true"
        onClick={onCancel}
      />

      {/* Panel */}
      <div className="relative z-10 w-full max-w-md rounded-xl bg-white dark:bg-tl-950 border border-tl-200 dark:border-tl-800 shadow-2xl p-6">
        <button
          onClick={onCancel}
          aria-label="Cerrar"
          className="absolute top-4 right-4 text-tl-400 hover:text-tl-600 dark:hover:text-tl-300 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-red-50 dark:bg-red-950/40">
            <Trash2 className="w-5 h-5 text-red-600 dark:text-red-400" />
          </div>
          <h2 id="delete-modal-title" className="text-lg font-heading font-700 text-foreground">
            Revocar clave
          </h2>
        </div>

        <p id="delete-modal-desc" className="text-sm text-tl-600 dark:text-tl-300 font-body mb-6">
          ¿Seguro que quieres revocar <strong className="text-foreground">&ldquo;{keyName}&rdquo;</strong>?
          Esta acción es irreversible. Las integraciones que usen esta clave dejarán de funcionar de
          inmediato.
        </p>

        <div className="flex gap-3 justify-end">
          <button
            ref={cancelRef}
            onClick={onCancel}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium rounded-lg border border-tl-200 dark:border-tl-700 text-foreground hover:bg-tl-50 dark:hover:bg-tl-900 transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            ref={confirmRef}
            onClick={onConfirm}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium rounded-lg bg-red-600 hover:bg-red-700 text-white transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {isLoading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Revocando...
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                Revocar clave
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
