/**
 * Shared markdown renderer for article body content.
 *
 * Supports: ## headings, ### subheadings, - lists, --- hr,
 * **bold**, [links](url), *italic blocks*, and | tables |.
 *
 * Used by /noticias/[slug], /informe-diario/[date], /informes/*, /analisis/*
 */

function formatInline(text: string): string {
  return text
    .replace(
      /\*\*(.+?)\*\*/g,
      '<strong class="font-semibold text-gray-900 dark:text-gray-100">$1</strong>'
    )
    .replace(
      /\[(.+?)\]\((.+?)\)/g,
      '<a href="$2" class="text-tl-600 dark:text-tl-400 hover:underline">$1</a>'
    );
}

function isTableBlock(block: string): boolean {
  const lines = block.split("\n").filter((l) => l.trim());
  if (lines.length < 2) return false;
  // Must have at least 2 lines, first line starts/ends with |, second line is separator
  return (
    lines[0].trim().startsWith("|") &&
    lines[0].trim().endsWith("|") &&
    /^\|[\s:|-]+\|$/.test(lines[1].trim())
  );
}

function renderTable(block: string): string {
  const lines = block.split("\n").filter((l) => l.trim());
  if (lines.length < 2) return "";

  const headerCells = lines[0]
    .split("|")
    .slice(1, -1)
    .map((c) => c.trim());

  // Parse alignment from separator row
  const separators = lines[1]
    .split("|")
    .slice(1, -1)
    .map((c) => c.trim());
  const alignments = separators.map((sep) => {
    if (sep.startsWith(":") && sep.endsWith(":")) return "center";
    if (sep.endsWith(":")) return "right";
    return "left";
  });

  const dataRows = lines.slice(2).map((line) =>
    line
      .split("|")
      .slice(1, -1)
      .map((c) => c.trim())
  );

  const alignClass = (i: number) => {
    if (alignments[i] === "center") return "text-center";
    if (alignments[i] === "right") return "text-right";
    return "text-left";
  };

  const thead = `<thead><tr>${headerCells
    .map(
      (c, i) =>
        `<th class="px-3 py-2 ${alignClass(i)} text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">${formatInline(c)}</th>`
    )
    .join("")}</tr></thead>`;

  const tbody = `<tbody>${dataRows
    .map(
      (row, ri) =>
        `<tr class="${ri % 2 === 0 ? "bg-white dark:bg-gray-900" : "bg-gray-50/50 dark:bg-gray-800/50"}">${row
          .map(
            (c, i) =>
              `<td class="px-3 py-2 ${alignClass(i)} text-sm text-gray-700 dark:text-gray-300 border-b border-gray-100 dark:border-gray-800">${formatInline(c)}</td>`
          )
          .join("")}</tr>`
    )
    .join("")}</tbody>`;

  return `<div class="overflow-x-auto my-4 rounded-lg border border-gray-200 dark:border-gray-700"><table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">${thead}${tbody}</table></div>`;
}

/**
 * Render markdown-like body to HTML.
 *
 * Supports:
 * - `## heading` → h2
 * - `### heading` → h3
 * - `- item` → unordered list
 * - `---` → horizontal rule
 * - `*text*` (block-level, wrapping paragraph) → italic paragraph
 * - `**text**` (inline) → bold
 * - `[text](url)` → link
 * - `| col | col |` → table with optional alignment
 */
export function renderMarkdown(body: string): string {
  return body
    .split("\n\n")
    .map((block) => {
      // Table detection (must come before other checks since tables are multi-line)
      if (isTableBlock(block)) {
        return renderTable(block);
      }
      if (block.startsWith("### ")) {
        return `<h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mt-4 mb-2">${formatInline(block.slice(4))}</h3>`;
      }
      if (block.startsWith("## ")) {
        return `<h2 class="text-xl font-semibold text-gray-900 dark:text-gray-100 mt-6 mb-3">${formatInline(block.slice(3))}</h2>`;
      }
      if (block.startsWith("- ")) {
        const items = block
          .split("\n")
          .map((line) => `<li>${formatInline(line.slice(2))}</li>`)
          .join("");
        return `<ul class="list-disc pl-6 space-y-1 text-gray-700 dark:text-gray-300">${items}</ul>`;
      }
      if (block.startsWith("---")) {
        return `<hr class="my-6 border-gray-200 dark:border-gray-800" />`;
      }
      if (block.startsWith("*") && block.endsWith("*")) {
        return `<p class="text-sm text-gray-500 dark:text-gray-400 italic">${formatInline(block.slice(1, -1))}</p>`;
      }
      return `<p class="text-gray-700 dark:text-gray-300">${formatInline(block)}</p>`;
    })
    .join("");
}
