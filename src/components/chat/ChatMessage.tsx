"use client";

/**
 * ChatMessage — individual message bubble for user and assistant.
 * Renders markdown-like formatting (bold, links, lists) inline.
 * Shows source chips when tool calls were made.
 */

import type { ChatMessageItem } from "./useChat";
import { AlertCircle, Bot, User, Zap } from "lucide-react";

// ─── Minimal markdown renderer ─────────────────────────────────────────────

function renderContent(text: string): React.ReactNode[] {
  const lines = text.split("\n");
  const nodes: React.ReactNode[] = [];
  let listBuffer: string[] = [];

  function flushList() {
    if (listBuffer.length === 0) return;
    nodes.push(
      <ul key={`ul-${nodes.length}`} className="list-disc list-inside space-y-0.5 my-1 text-sm">
        {listBuffer.map((item, i) => (
          <li key={i}>{renderInline(item)}</li>
        ))}
      </ul>
    );
    listBuffer = [];
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // List items
    if (/^[-*•]\s+/.test(line)) {
      listBuffer.push(line.replace(/^[-*•]\s+/, ""));
      continue;
    } else {
      flushList();
    }

    // Empty line → paragraph break
    if (line.trim() === "") {
      if (i > 0 && nodes.length > 0) {
        nodes.push(<br key={`br-${i}`} />);
      }
      continue;
    }

    // Heading-ish lines (##)
    if (/^#{1,3}\s+/.test(line)) {
      const text = line.replace(/^#{1,3}\s+/, "");
      nodes.push(
        <p key={`h-${i}`} className="font-semibold text-sm mt-2 mb-0.5">
          {renderInline(text)}
        </p>
      );
      continue;
    }

    nodes.push(
      <p key={`p-${i}`} className="text-sm leading-relaxed">
        {renderInline(line)}
      </p>
    );
  }

  flushList();
  return nodes;
}

function renderInline(text: string): React.ReactNode {
  // Split by bold **text**, links [text](url), and backtick `code`
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code
          key={i}
          className="font-mono text-xs bg-black/10 dark:bg-white/10 px-1 py-0.5 rounded"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    const linkMatch = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (linkMatch) {
      return (
        <a
          key={i}
          href={linkMatch[2]}
          className="underline underline-offset-2 hover:no-underline"
          target="_blank"
          rel="noopener noreferrer"
        >
          {linkMatch[1]}
        </a>
      );
    }
    return part;
  });
}

// ─── Source chip ─────────────────────────────────────────────────────────────

function SourceChip({ source }: { source: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-tl-50 dark:bg-tl-900/40 text-tl-600 dark:text-tl-300 border border-tl-100 dark:border-tl-800">
      <Zap className="w-2.5 h-2.5" aria-hidden="true" />
      {source}
    </span>
  );
}

// ─── Tool call hints ──────────────────────────────────────────────────────────

function ToolCallsBar({ message }: { message: ChatMessageItem }) {
  const { toolCalls, isStreaming } = message;
  if (!toolCalls || toolCalls.length === 0) return null;

  const uniqueSources = [...new Set(toolCalls.map((tc) => tc.source).filter(Boolean))];

  return (
    <div
      className="flex flex-wrap gap-1 mt-1"
      aria-label="Fuentes de datos consultadas"
    >
      {isStreaming && toolCalls.length > 0 && (
        <span className="text-[10px] text-tl-500 dark:text-tl-400 italic">
          {toolCalls[toolCalls.length - 1]?.label}…
        </span>
      )}
      {!isStreaming &&
        uniqueSources.map((src) => (
          <SourceChip key={src} source={src!} />
        ))}
      {!isStreaming && uniqueSources.length > 0 && (
        <span className="text-[10px] text-gray-400 dark:text-gray-500 self-center">
          Fuente: {uniqueSources.join(" · ")}
        </span>
      )}
    </div>
  );
}

// ─── Message component ─────────────────────────────────────────────────────────

interface ChatMessageProps {
  message: ChatMessageItem;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === "user";
  const isError = message.error;

  return (
    <div
      role="listitem"
      className={`flex gap-2 ${isUser ? "flex-row-reverse" : "flex-row"}`}
      aria-label={isUser ? "Tu mensaje" : "Respuesta del asistente"}
    >
      {/* Avatar */}
      <div
        className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center mt-0.5 ${
          isUser
            ? "bg-tl-500 text-white"
            : isError
            ? "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400"
            : "bg-tl-50 dark:bg-tl-900/40 border border-tl-100 dark:border-tl-800 text-tl-600 dark:text-tl-400"
        }`}
        aria-hidden="true"
      >
        {isUser ? (
          <User className="w-3.5 h-3.5" />
        ) : isError ? (
          <AlertCircle className="w-3.5 h-3.5" />
        ) : (
          <Bot className="w-3.5 h-3.5" />
        )}
      </div>

      {/* Bubble */}
      <div className={`max-w-[82%] space-y-1 ${isUser ? "items-end" : "items-start"} flex flex-col`}>
        <div
          className={`px-3 py-2 rounded-2xl text-sm leading-relaxed ${
            isUser
              ? "bg-tl-500 text-white rounded-tr-sm"
              : isError
              ? "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-tl-sm"
              : "bg-tl-50 dark:bg-tl-900/30 border border-tl-100 dark:border-tl-800 text-gray-800 dark:text-gray-100 rounded-tl-sm"
          }`}
        >
          {message.isStreaming && !message.content ? (
            /* Typing indicator */
            <span className="flex items-center gap-1 py-0.5" aria-label="El asistente está escribiendo">
              <span className="w-1.5 h-1.5 rounded-full bg-tl-400 animate-bounce [animation-delay:0ms]" />
              <span className="w-1.5 h-1.5 rounded-full bg-tl-400 animate-bounce [animation-delay:150ms]" />
              <span className="w-1.5 h-1.5 rounded-full bg-tl-400 animate-bounce [animation-delay:300ms]" />
            </span>
          ) : isUser ? (
            <span>{message.content}</span>
          ) : (
            <div className="space-y-0.5">{renderContent(message.content)}</div>
          )}
        </div>

        {/* Tool call source chips (assistant only) */}
        {!isUser && <ToolCallsBar message={message} />}
      </div>
    </div>
  );
}
