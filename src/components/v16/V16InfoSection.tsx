"use client";

import { useState } from "react";
import {
  AlertTriangle,
  Scale,
  Cpu,
  HelpCircle,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Radio,
  Clock,
  MapPin,
  ShieldCheck,
  Banknote,
} from "lucide-react";

interface FAQItem {
  question: string;
  answer: string;
}

const faqs: FAQItem[] = [
  {
    question: "¿Es obligatoria la baliza V16?",
    answer:
      "Sí, desde el 1 de julio de 2021 es obligatorio llevar una baliza V16 homologada en todos los vehículos. Sustituye la obligación de colocar los triángulos de emergencia cuando el vehículo queda detenido en la calzada.",
  },
  {
    question: "¿La baliza V16 sustituye a los triángulos de emergencia?",
    answer:
      "Solo en la calzada. Si el vehículo queda detenido en el arcén, sigue siendo obligatorio usar los triángulos de emergencia. La baliza V16 está pensada para situaciones donde salir del vehículo supone un riesgo.",
  },
  {
    question: "¿Cómo funciona la baliza V16?",
    answer:
      "La baliza emite una luz amarilla intermitente visible a 1 km de distancia. Además, las balizas conectadas (V16 con GPS) transmiten automáticamente la posición del vehículo a la plataforma NAP de la DGT, que difunde la alerta a otros conductores.",
  },
  {
    question: "¿Qué multa hay por no llevar baliza V16?",
    answer:
      "No llevar la baliza V16 o no utilizarla correctamente puede acarrear una multa de entre 80€ y 200€, según la gravedad de la infracción.",
  },
  {
    question: "¿Dónde puedo comprar una baliza V16 homologada?",
    answer:
      "Las balizas V16 homologadas se pueden adquirir en gasolineras, tiendas de accesorios de automóvil, grandes superficies y tiendas online. Es importante verificar que lleve el marcado V-16 de homologación de la DGT.",
  },
  {
    question: "¿Qué diferencia hay entre baliza V16 y baliza V16 conectada?",
    answer:
      "La baliza V16 básica solo emite luz. La baliza V16 conectada (la que mostramos en este dashboard) además incorpora GPS y conectividad para enviar la posición a la DGT automáticamente, mejorando la seguridad vial.",
  },
];

function FAQAccordion({ item }: { item: FAQItem }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border-b border-gray-100 dark:border-gray-800 last:border-0">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between py-3 text-left hover:bg-gray-50 dark:bg-gray-950 transition-colors"
      >
        <span className="text-sm font-medium text-gray-900 dark:text-gray-100 pr-4">{item.question}</span>
        {isOpen ? (
          <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
        )}
      </button>
      {isOpen && (
        <div className="pb-3 pr-8">
          <p className="text-sm text-gray-600 dark:text-gray-400">{item.answer}</p>
        </div>
      )}
    </div>
  );
}

interface V16InfoSectionProps {
  dataStartDate?: string;
}

export function V16InfoSection({ dataStartDate }: V16InfoSectionProps) {
  return (
    <div className="mt-8 space-y-6">
      {/* Main Info Card */}
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-500 to-orange-600 px-6 py-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-3">
            <AlertTriangle className="w-6 h-6" />
            ¿Qué es una Baliza V16?
          </h2>
        </div>

        <div className="p-6">
          {/* Introduction */}
          <div className="mb-6">
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              La <strong>baliza V16</strong> es un dispositivo luminoso de preseñalización de
              peligro que se utiliza para alertar a otros conductores cuando un vehículo queda
              inmovilizado en la vía. Emite una luz amarilla intermitente visible a más de 1
              kilómetro de distancia, aumentando significativamente la seguridad del conductor y
              ocupantes.
            </p>
          </div>

          {/* Key Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="flex items-start gap-3 p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
              <Radio className="w-5 h-5 text-orange-600 dark:text-orange-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Luz visible</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">A más de 1 km de distancia</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-tl-50 dark:bg-tl-900/20 rounded-lg">
              <MapPin className="w-5 h-5 text-tl-600 dark:text-tl-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">GPS integrado</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">Transmite posición a la DGT</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <Clock className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Autonomía</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">Mínimo 30 minutos de batería</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
              <ShieldCheck className="w-5 h-5 text-purple-600 dark:text-purple-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Homologada</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">Marcado V-16 de la DGT</p>
              </div>
            </div>
          </div>

          {/* Legal Requirement Banner */}
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <Scale className="w-6 h-6 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-bold text-red-800 mb-1">
                  OBLIGATORIA DESDE EL 1 DE JULIO DE 2021
                </h3>
                <p className="text-sm text-red-700 dark:text-red-400 mb-2">
                  Según el <strong>Real Decreto 159/2021</strong>, todos los vehículos deben llevar
                  una baliza V16 homologada. Su uso es obligatorio cuando el vehículo queda detenido
                  en la calzada (no en el arcén).
                </p>
                <div className="flex items-center gap-2 text-sm">
                  <Banknote className="w-4 h-4 text-red-600 dark:text-red-400" />
                  <span className="text-red-700 dark:text-red-400">
                    <strong>Multa por incumplimiento:</strong> 80€ - 200€
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Technical Specs */}
          <div className="mb-6">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
              <Cpu className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              Especificaciones Técnicas
            </h3>
            <div className="bg-gray-50 dark:bg-gray-950 rounded-lg p-4">
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-700 dark:text-gray-300">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-orange-50 dark:bg-orange-900/200 rounded-full" />
                  Homologación DGT con marcado V-16
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-orange-50 dark:bg-orange-900/200 rounded-full" />
                  Luz amarilla intermitente (flash)
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-orange-50 dark:bg-orange-900/200 rounded-full" />
                  Batería mínima de 30 minutos
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-orange-50 dark:bg-orange-900/200 rounded-full" />
                  Temperatura operativa: -10°C a +50°C
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-orange-50 dark:bg-orange-900/200 rounded-full" />
                  GPS para geolocalización automática
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-orange-50 dark:bg-orange-900/200 rounded-full" />
                  Transmisión a plataforma NAP de la DGT
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-orange-50 dark:bg-orange-900/200 rounded-full" />
                  Base magnética para fijar al techo
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-orange-50 dark:bg-orange-900/200 rounded-full" />
                  Resistente a lluvia y condiciones adversas
                </li>
              </ul>
            </div>
          </div>

          {/* FAQs */}
          <div className="mb-6">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              Preguntas Frecuentes
            </h3>
            <div className="border border-gray-200 dark:border-gray-800 rounded-lg divide-y divide-gray-100">
              <div className="px-4">
                {faqs.map((faq, idx) => (
                  <FAQAccordion key={idx} item={faq} />
                ))}
              </div>
            </div>
          </div>

          {/* Official Links */}
          <div className="border-t border-gray-200 dark:border-gray-800 pt-4">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
              <ExternalLink className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              Enlaces Oficiales
            </h3>
            <div className="flex flex-wrap gap-3">
              <a
                href="https://www.dgt.es/nuestros-servicios/balizas-v16/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
              >
                <span>DGT - Balizas V16</span>
                <ExternalLink className="w-4 h-4" />
              </a>
              <a
                href="https://www.boe.es/buscar/act.php?id=BOE-A-2021-3668"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-gray-700 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors"
              >
                <span>BOE - Real Decreto 159/2021</span>
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Data Source Info */}
      <div className="bg-tl-50 dark:bg-tl-900/20 border border-tl-200 dark:border-tl-800 rounded-lg p-4">
        <h3 className="font-semibold text-tl-900 mb-2">Sobre los datos mostrados</h3>
        <p className="text-sm text-tl-800 dark:text-tl-200 mb-2">
          Los datos de balizas V16 se obtienen en tiempo real de la plataforma{" "}
          <strong>NAP DATEX II</strong> de la DGT (Dirección General de Tráfico). El sistema
          recopila información cada 5 minutos sobre las balizas V16 conectadas que están activas en
          las carreteras españolas.
        </p>
        {dataStartDate && (
          <p className="text-xs text-tl-700 dark:text-tl-300">
            <strong>Recopilando datos desde:</strong>{" "}
            {new Date(dataStartDate).toLocaleDateString("es-ES", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
        )}
      </div>
    </div>
  );
}
