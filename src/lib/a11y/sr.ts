export const SR_ONLY_CLASS = 'sr-only'

export const FOCUSABLE_SR_ONLY_CLASS =
  'sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[9999] focus:px-4 focus:py-2 focus:rounded-md focus:bg-tl-ink-900 focus:text-white focus:shadow-xl'

export function describeNumber(
  value: number,
  singular: string,
  plural: string,
  locale = 'es-ES',
): string {
  const formatted = new Intl.NumberFormat(locale).format(value)
  return `${formatted} ${value === 1 ? singular : plural}`
}

export function describeDelay(minutes: number, locale = 'es-ES'): string {
  if (minutes === 0) return 'En hora'
  const abs = Math.abs(minutes)
  const fmt = new Intl.NumberFormat(locale).format(abs)
  if (minutes < 0) return `Adelantado ${fmt} minutos`
  return `Retraso de ${fmt} minutos`
}

export function describePrice(
  value: number,
  currency = 'EUR',
  locale = 'es-ES',
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  }).format(value)
}

export function ariaLabelFromText(text: string): string {
  return text.replace(/\s+/g, ' ').trim()
}
