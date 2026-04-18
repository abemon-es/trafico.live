"use client";

/**
 * ChatInput — textarea + submit button + char count + quick-start pills.
 */

import { useRef, useState, useCallback, type KeyboardEvent } from "react";
import { ArrowUp, Loader2 } from "lucide-react";

// ─── Quick-start prompts ──────────────────────────────────────────────────────

const QUICK_PROMPTS = [
  "¿Cómo está el tráfico ahora?",
  "Gasolineras más baratas cerca de Madrid",
  "Trenes entre Madrid y Barcelona",
];

const MAX_CHARS = 1000;

// ─── Component ───────────────────────────────────────────────────────────────

interface ChatInputProps {
  onSend: (text: string) => void;
  isStreaming: boolean;
  isEmpty: boolean; // true when no messages yet (show quick-start pills)
}

export function ChatInput({ onSend, isStreaming, isEmpty }: ChatInputProps) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = useCallback(() => {
    const text = value.trim();
    if (!text || isStreaming || text.length > MAX_CHARS) return;
    onSend(text);
    setValue("");
    textareaRef.current?.focus();
  }, [value, isStreaming, onSend]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  const handleQuickPrompt = useCallback(
    (prompt: string) => {
      if (isStreaming) return;
      setValue(prompt);
      textareaRef.current?.focus();
      // Auto-send quick prompt
      onSend(prompt);
    },
    [isStreaming, onSend]
  );

  const charCount = value.length;
  const isOverLimit = charCount > MAX_CHARS;
  const canSend = value.trim().length > 0 && !isStreaming && !isOverLimit;

  return (
    <div className="space-y-2">
      {/* Quick-start pills (shown when chat is empty) */}
      {isEmpty && (
        <div
          className="flex flex-wrap gap-1.5"
          role="group"
          aria-label="Preguntas de inicio rápido"
        >
          {QUICK_PROMPTS.map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => handleQuickPrompt(prompt)}
              disabled={isStreaming}
              className="text-xs px-2.5 py-1 rounded-full border border-tl-200 dark:border-tl-700 bg-tl-50 dark:bg-tl-900/30 text-tl-700 dark:text-tl-300 hover:bg-tl-100 dark:hover:bg-tl-800/50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed truncate max-w-[180px]"
            >
              {prompt}
            </button>
          ))}
        </div>
      )}

      {/* Input area */}
      <div
        className={`flex items-end gap-2 rounded-xl border transition-colors ${
          isOverLimit
            ? "border-red-400 dark:border-red-600 ring-1 ring-red-400/30"
            : "border-tl-200 dark:border-tl-700 focus-within:border-tl-400 dark:focus-within:border-tl-500"
        } bg-white dark:bg-gray-900/50 px-3 py-2`}
      >
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Pregunta sobre tráfico, trenes, vuelos…"
          rows={1}
          maxLength={MAX_CHARS + 50} // Allow slight overage so counter shows
          disabled={isStreaming}
          aria-label="Escribe tu pregunta"
          aria-describedby="chat-input-hint"
          className="flex-1 resize-none bg-transparent text-sm leading-relaxed text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 outline-none min-h-[24px] max-h-[120px] overflow-y-auto font-[var(--font-body)] disabled:opacity-60"
          style={{
            // Auto-grow
            height: "auto",
          }}
          onInput={(e) => {
            const el = e.currentTarget;
            el.style.height = "auto";
            el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
          }}
        />

        {/* Char count (shown when >50% full) */}
        {charCount > MAX_CHARS * 0.5 && (
          <span
            className={`text-[10px] self-end mb-0.5 font-mono tabular-nums ${
              isOverLimit ? "text-red-500" : "text-gray-400"
            }`}
            aria-live="polite"
          >
            {charCount}/{MAX_CHARS}
          </span>
        )}

        {/* Submit button */}
        <button
          type="button"
          onClick={handleSend}
          disabled={!canSend}
          aria-label="Enviar mensaje"
          className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-all bg-tl-500 text-white hover:bg-tl-600 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-tl-500 self-end"
        >
          {isStreaming ? (
            <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
          ) : (
            <ArrowUp className="w-4 h-4" aria-hidden="true" />
          )}
        </button>
      </div>

      {/* Keyboard hint */}
      <p
        id="chat-input-hint"
        className="text-[10px] text-gray-400 dark:text-gray-500 text-right"
      >
        Ctrl+Enter para enviar
      </p>
    </div>
  );
}
