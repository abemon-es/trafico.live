"use client";

import Link from "next/link";
import { Route, Fuel, Zap, Ban } from "lucide-react";

const QUICK_ACTIONS = [
  {
    title: "Mi Ruta",
    description: "Consulta tu trayecto",
    href: "/carreteras",
    icon: Route,
    color: "bg-tl-50 dark:bg-tl-900/20 hover:bg-tl-100 dark:bg-tl-900/30 border-tl-200 dark:border-tl-800",
    iconColor: "text-tl-600 dark:text-tl-400",
  },
  {
    title: "Diesel",
    description: "Encuentra el mejor precio",
    href: "/profesional/diesel",
    icon: Fuel,
    color: "bg-tl-amber-50 dark:bg-tl-amber-900/20 hover:bg-tl-amber-100 border-tl-amber-200 dark:border-tl-amber-800",
    iconColor: "text-tl-amber-600 dark:text-tl-amber-400",
  },
  {
    title: "Carga EV",
    description: "Planifica tu carga",
    href: "/carga-ev",
    icon: Zap,
    color: "bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:bg-green-900/30 border-green-200",
    iconColor: "text-green-600 dark:text-green-400",
  },
  {
    title: "ZBE",
    description: "Comprueba tu acceso",
    href: "/profesional/restricciones",
    icon: Ban,
    color: "bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:bg-red-900/30 border-red-200",
    iconColor: "text-red-600 dark:text-red-400",
  },
];

export function QuickActions() {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-4">
      <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-4">
        Acciones rápidas
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {QUICK_ACTIONS.map((action) => {
          const Icon = action.icon;
          return (
            <Link
              key={action.title}
              href={action.href}
              className={`flex flex-col items-center p-4 rounded-lg border transition-all ${action.color}`}
            >
              <Icon className={`w-6 h-6 ${action.iconColor} mb-2`} />
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{action.title}</span>
              <span className="text-xs text-gray-500 dark:text-gray-400 text-center">{action.description}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
