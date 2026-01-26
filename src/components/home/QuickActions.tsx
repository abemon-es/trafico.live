"use client";

import Link from "next/link";
import { Route, Fuel, Zap, Ban } from "lucide-react";

const QUICK_ACTIONS = [
  {
    title: "Mi Ruta",
    description: "Consulta tu trayecto",
    href: "/carreteras",
    icon: Route,
    color: "bg-blue-50 hover:bg-blue-100 border-blue-200",
    iconColor: "text-blue-600",
  },
  {
    title: "Diesel",
    description: "Encuentra el mejor precio",
    href: "/profesional/diesel",
    icon: Fuel,
    color: "bg-amber-50 hover:bg-amber-100 border-amber-200",
    iconColor: "text-amber-600",
  },
  {
    title: "Carga EV",
    description: "Planifica tu carga",
    href: "/carga-ev",
    icon: Zap,
    color: "bg-green-50 hover:bg-green-100 border-green-200",
    iconColor: "text-green-600",
  },
  {
    title: "ZBE",
    description: "Comprueba tu acceso",
    href: "/profesional/restricciones",
    icon: Ban,
    color: "bg-red-50 hover:bg-red-100 border-red-200",
    iconColor: "text-red-600",
  },
];

export function QuickActions() {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-4">
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
              <span className="text-sm font-medium text-gray-900">{action.title}</span>
              <span className="text-xs text-gray-500 text-center">{action.description}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
