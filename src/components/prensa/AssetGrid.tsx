import { Download, Image as ImageIcon } from "lucide-react";

interface Asset {
  name: string;
  description: string;
  href: string;
  type: "svg" | "png" | "pdf" | "zip";
  fileSize?: string;
}

interface AssetGridProps {
  assets?: Asset[];
  colorSwatches?: { name: string; hex: string; token: string }[];
}

const DEFAULT_ASSETS: Asset[] = [
  {
    name: "Logo trafico.live (color)",
    description: "Logotipo completo sobre fondo claro. SVG vectorial.",
    href: "/press/logo.svg",
    type: "svg",
    fileSize: "~4 KB",
  },
  {
    name: "Logo trafico.live (oscuro)",
    description: "Versión blanca para fondos oscuros o fotografía.",
    href: "/press/logo-dark.svg",
    type: "svg",
    fileSize: "~4 KB",
  },
  {
    name: "Logo monocromo",
    description: "Versión tinta única para impresión o bordado.",
    href: "/press/logo-mono.svg",
    type: "svg",
    fileSize: "~4 KB",
  },
  {
    name: "Wordmark",
    description: "Solo texto «trafico.live» sin ícono.",
    href: "/press/wordmark.svg",
    type: "svg",
    fileSize: "~2 KB",
  },
];

const BRAND_COLORS = [
  { name: "Signal Blue", hex: "#1b4bd5", token: "tl-600" },
  { name: "Signal Blue Light", hex: "#366cf8", token: "tl-500" },
  { name: "Amber Accent", hex: "#b56200", token: "tl-amber-500" },
  { name: "Ocean Blue", hex: "#0369a1", token: "tl-sea-500" },
  { name: "Deep Navy", hex: "#0b0f1a", token: "background-dark" },
  { name: "Off White", hex: "#f0f5ff", token: "tl-50" },
];

const TYPE_BADGE: Record<Asset["type"], string> = {
  svg: "bg-tl-50 dark:bg-tl-900/20 text-tl-600 dark:text-tl-400",
  png: "bg-tl-sea-50 dark:bg-tl-sea-900/20 text-tl-sea-500 dark:text-tl-sea-400",
  pdf: "bg-tl-amber-50 dark:bg-tl-amber-900/20 text-tl-amber-500 dark:text-tl-amber-400",
  zip: "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300",
};

export function AssetGrid({
  assets = DEFAULT_ASSETS,
  colorSwatches = BRAND_COLORS,
}: AssetGridProps) {
  return (
    <div className="space-y-8">
      {/* Logo assets */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {assets.map((asset) => (
          <div
            key={asset.href}
            className="flex items-start gap-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 group hover:border-tl-300 dark:hover:border-tl-700 transition-colors"
          >
            <div className="p-2.5 rounded-lg bg-gray-50 dark:bg-gray-800 shrink-0">
              <ImageIcon className="h-5 w-5 text-gray-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                  {asset.name}
                </p>
                <span
                  className={`text-xs font-mono px-1.5 py-0.5 rounded uppercase font-semibold shrink-0 ${TYPE_BADGE[asset.type]}`}
                >
                  {asset.type}
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                {asset.description}
                {asset.fileSize && (
                  <span className="ml-1 text-gray-400">({asset.fileSize})</span>
                )}
              </p>
              <a
                href={asset.href}
                download
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-tl-600 dark:text-tl-400 hover:underline"
              >
                <Download className="h-3.5 w-3.5" />
                Descargar
              </a>
            </div>
          </div>
        ))}
      </div>

      {/* Color swatches */}
      {colorSwatches.length > 0 && (
        <div>
          <h4 className="text-sm font-heading font-semibold text-gray-700 dark:text-gray-300 mb-3">
            Colores de marca
          </h4>
          <div className="flex flex-wrap gap-3">
            {colorSwatches.map((color) => (
              <div key={color.hex} className="flex items-center gap-2.5">
                <div
                  className="h-8 w-8 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm"
                  style={{ background: color.hex }}
                  title={color.hex}
                />
                <div>
                  <p className="text-xs font-semibold text-gray-900 dark:text-white leading-none">
                    {color.name}
                  </p>
                  <p className="text-xs font-mono text-gray-500 dark:text-gray-400">
                    {color.hex}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
