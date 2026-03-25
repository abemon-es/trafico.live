import { ReactNode } from "react";

interface LayerToggleProps {
  label: string;
  active: boolean;
  onClick: () => void;
  color: "red" | "orange" | "blue" | "green" | "purple" | "gray" | "cyan" | "yellow" | "amber";
  icon?: ReactNode;
}

const colorClasses = {
  red: {
    active: "bg-red-100 dark:bg-red-900/30 border-red-500 text-red-700 dark:text-red-400",
    inactive: "bg-gray-50 dark:bg-gray-950 border-gray-300 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:bg-gray-900",
    dot: "bg-red-50 dark:bg-red-900/200",
  },
  orange: {
    active: "bg-orange-100 border-orange-500 text-orange-700 dark:text-orange-400",
    inactive: "bg-gray-50 dark:bg-gray-950 border-gray-300 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:bg-gray-900",
    dot: "bg-orange-500",
  },
  blue: {
    active: "bg-tl-100 dark:bg-tl-900/30 border-tl-500 text-tl-700 dark:text-tl-300",
    inactive: "bg-gray-50 dark:bg-gray-950 border-gray-300 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:bg-gray-900",
    dot: "bg-tl-50 dark:bg-tl-900/200",
  },
  green: {
    active: "bg-green-100 dark:bg-green-900/30 border-green-500 text-green-700 dark:text-green-400",
    inactive: "bg-gray-50 dark:bg-gray-950 border-gray-300 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:bg-gray-900",
    dot: "bg-green-50 dark:bg-green-900/200",
  },
  purple: {
    active: "bg-purple-100 border-purple-500 text-purple-700 dark:text-purple-400",
    inactive: "bg-gray-50 dark:bg-gray-950 border-gray-300 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:bg-gray-900",
    dot: "bg-purple-500",
  },
  gray: {
    active: "bg-gray-200 border-gray-500 text-gray-700 dark:text-gray-300",
    inactive: "bg-gray-50 dark:bg-gray-950 border-gray-300 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:bg-gray-900",
    dot: "bg-gray-50 dark:bg-gray-9500",
  },
  cyan: {
    active: "bg-cyan-100 border-cyan-500 text-cyan-700",
    inactive: "bg-gray-50 dark:bg-gray-950 border-gray-300 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:bg-gray-900",
    dot: "bg-cyan-500",
  },
  yellow: {
    active: "bg-yellow-100 border-yellow-500 text-yellow-700 dark:text-yellow-400",
    inactive: "bg-gray-50 dark:bg-gray-950 border-gray-300 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:bg-gray-900",
    dot: "bg-yellow-500",
  },
  amber: {
    active: "bg-tl-amber-100 border-tl-amber-500 text-tl-amber-700 dark:text-tl-amber-300",
    inactive: "bg-gray-50 dark:bg-gray-950 border-gray-300 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:bg-gray-900",
    dot: "bg-tl-amber-50 dark:bg-tl-amber-900/200",
  },
};

export function LayerToggle({ label, active, onClick, color, icon }: LayerToggleProps) {
  const classes = colorClasses[color];

  return (
    <button
      onClick={onClick}
      className={`
        flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium
        border transition-all cursor-pointer
        ${active ? classes.active : classes.inactive}
      `}
    >
      {active && <span className={`w-2 h-2 rounded-full ${classes.dot}`} />}
      {icon}
      <span>{label}</span>
    </button>
  );
}
