import { ReactNode } from "react";

interface LayerToggleProps {
  label: string;
  active: boolean;
  onClick: () => void;
  color: "red" | "orange" | "blue" | "green" | "purple" | "gray";
  icon?: ReactNode;
}

const colorClasses = {
  red: {
    active: "bg-red-100 border-red-500 text-red-700",
    inactive: "bg-gray-50 border-gray-300 text-gray-500 hover:bg-gray-100",
    dot: "bg-red-500",
  },
  orange: {
    active: "bg-orange-100 border-orange-500 text-orange-700",
    inactive: "bg-gray-50 border-gray-300 text-gray-500 hover:bg-gray-100",
    dot: "bg-orange-500",
  },
  blue: {
    active: "bg-blue-100 border-blue-500 text-blue-700",
    inactive: "bg-gray-50 border-gray-300 text-gray-500 hover:bg-gray-100",
    dot: "bg-blue-500",
  },
  green: {
    active: "bg-green-100 border-green-500 text-green-700",
    inactive: "bg-gray-50 border-gray-300 text-gray-500 hover:bg-gray-100",
    dot: "bg-green-500",
  },
  purple: {
    active: "bg-purple-100 border-purple-500 text-purple-700",
    inactive: "bg-gray-50 border-gray-300 text-gray-500 hover:bg-gray-100",
    dot: "bg-purple-500",
  },
  gray: {
    active: "bg-gray-200 border-gray-500 text-gray-700",
    inactive: "bg-gray-50 border-gray-300 text-gray-500 hover:bg-gray-100",
    dot: "bg-gray-500",
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
