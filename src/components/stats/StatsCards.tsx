"use client";

import { AlertTriangle, TrendingUp, TrendingDown, Camera, Zap, Ban } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  change?: number;
  icon: React.ReactNode;
  color: string;
}

function StatCard({ title, value, change, icon, color }: StatCardProps) {
  const isPositive = change && change > 0;
  const isNegative = change && change < 0;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div className={`p-2 rounded-lg ${color}`}>{icon}</div>
        {change !== undefined && (
          <div
            className={`flex items-center gap-1 text-sm font-medium ${
              isPositive ? "text-green-600" : isNegative ? "text-red-600" : "text-gray-500"
            }`}
          >
            {isPositive ? (
              <TrendingUp className="w-4 h-4" />
            ) : isNegative ? (
              <TrendingDown className="w-4 h-4" />
            ) : null}
            <span>{Math.abs(change)}%</span>
          </div>
        )}
      </div>
      <div className="mt-3">
        <p className="text-2xl font-bold text-gray-900">{value.toLocaleString()}</p>
        <p className="text-sm text-gray-500">{title}</p>
      </div>
    </div>
  );
}

export function StatsCards() {
  // Sample data - will be replaced with API data
  const stats = {
    v16Active: 127,
    v16Change: 12,
    incidents: 45,
    incidentsChange: -8,
    cameras: 512,
    chargers: 8432,
    chargersChange: 2,
    zbeZones: 156,
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
      <StatCard
        title="V16 Activas"
        value={stats.v16Active}
        change={stats.v16Change}
        icon={<AlertTriangle className="w-5 h-5 text-red-600" />}
        color="bg-red-50"
      />
      <StatCard
        title="Incidencias"
        value={stats.incidents}
        change={stats.incidentsChange}
        icon={<AlertTriangle className="w-5 h-5 text-orange-600" />}
        color="bg-orange-50"
      />
      <StatCard
        title="Cámaras"
        value={stats.cameras}
        icon={<Camera className="w-5 h-5 text-blue-600" />}
        color="bg-blue-50"
      />
      <StatCard
        title="Cargadores EV"
        value={stats.chargers}
        change={stats.chargersChange}
        icon={<Zap className="w-5 h-5 text-green-600" />}
        color="bg-green-50"
      />
      <StatCard
        title="Zonas ZBE"
        value={stats.zbeZones}
        icon={<Ban className="w-5 h-5 text-purple-600" />}
        color="bg-purple-50"
      />
    </div>
  );
}
