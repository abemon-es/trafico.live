"use client";

import {
  Search,
  Fuel,
  Radar,
  Camera,
  Calendar,
  Ban,
  AlertTriangle,
  Calculator,
  MapPin,
  Zap,
  BookOpen,
  Code,
  Building2,
  Route,
  AlertCircle,
  Map,
  Newspaper,
  TrainFront,
  ShieldAlert,
  MonitorDot,
  Anchor,
  Activity,
  Globe,
  Mountain,
  Wind,
  FileText,
  CloudRain,
} from "lucide-react";

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Fuel,
  Radar,
  Camera,
  Calendar,
  Ban,
  AlertTriangle,
  Calculator,
  MapPin,
  Zap,
  BookOpen,
  Code,
  Building2,
  Route,
  AlertCircle,
  Map,
  Newspaper,
  TrainFront,
  ShieldAlert,
  MonitorDot,
  Anchor,
  Activity,
  Globe,
  Mountain,
  Wind,
  FileText,
  CloudRain,
  Search,
};

export function SearchIcon({
  name,
  className,
}: {
  name: string;
  className?: string;
}) {
  const Icon = ICON_MAP[name] ?? Search;
  return <Icon className={className} />;
}
