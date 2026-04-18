import { getStripe } from "@/lib/stripe";
import { ExternalLink, Receipt } from "lucide-react";

interface InvoicesListProps {
  stripeCustomerId: string | null | undefined;
}

interface InvoiceRow {
  id: string;
  number: string | null;
  date: number;
  amount: number;
  currency: string;
  status: string;
  pdfUrl: string | null;
}

async function fetchInvoices(customerId: string): Promise<InvoiceRow[]> {
  try {
    const stripe = getStripe();
    const invoices = await stripe.invoices.list({
      customer: customerId,
      limit: 12,
    });
    return invoices.data.map((inv) => ({
      id: inv.id,
      number: inv.number,
      date: inv.created,
      amount: inv.amount_paid,
      currency: inv.currency,
      status: inv.status ?? "unknown",
      pdfUrl: inv.invoice_pdf,
    }));
  } catch {
    return [];
  }
}

function formatAmount(amount: number, currency: string): string {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: currency.toUpperCase(),
    minimumFractionDigits: 2,
  }).format(amount / 100);
}

function formatDate(unix: number): string {
  return new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "long", year: "numeric" }).format(
    new Date(unix * 1000)
  );
}

const STATUS_STYLES: Record<string, string> = {
  paid: "bg-tl-50 text-tl-700 dark:bg-tl-900/40 dark:text-tl-300",
  open: "bg-tl-amber-50 text-tl-amber-700 dark:bg-tl-amber-900/30 dark:text-tl-amber-300",
  void: "bg-tl-100 text-tl-400 dark:bg-tl-900 dark:text-tl-500",
  uncollectible: "bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400",
  unknown: "bg-tl-100 text-tl-400",
};

const STATUS_LABELS: Record<string, string> = {
  paid: "Pagada",
  open: "Pendiente",
  void: "Anulada",
  uncollectible: "Sin cobrar",
  unknown: "—",
};

export async function InvoicesList({ stripeCustomerId }: InvoicesListProps) {
  if (!stripeCustomerId) {
    return (
      <div className="rounded-xl border border-tl-200 dark:border-tl-800 bg-white dark:bg-tl-950 p-6 text-center">
        <Receipt className="w-8 h-8 text-tl-300 mx-auto mb-3" />
        <p className="text-sm text-tl-500 font-body">Sin historial de facturas</p>
      </div>
    );
  }

  const invoices = await fetchInvoices(stripeCustomerId);

  if (invoices.length === 0) {
    return (
      <div className="rounded-xl border border-tl-200 dark:border-tl-800 bg-white dark:bg-tl-950 p-6 text-center">
        <Receipt className="w-8 h-8 text-tl-300 mx-auto mb-3" />
        <p className="text-sm text-tl-500 font-body">Todavía no hay facturas</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-tl-200 dark:border-tl-800 bg-white dark:bg-tl-950 overflow-hidden">
      <div className="px-5 py-4 border-b border-tl-100 dark:border-tl-800 flex items-center gap-2">
        <Receipt className="w-4 h-4 text-tl-500" />
        <h3 className="text-base font-heading font-600 text-foreground">Historial de facturas</h3>
      </div>
      <table className="w-full text-sm" aria-label="Historial de facturas">
        <thead>
          <tr className="border-b border-tl-100 dark:border-tl-800 bg-tl-50/50 dark:bg-tl-900/30">
            <th scope="col" className="text-left px-5 py-3 text-xs font-medium text-tl-500 uppercase tracking-wide font-body">
              Nº Factura
            </th>
            <th scope="col" className="text-left px-5 py-3 text-xs font-medium text-tl-500 uppercase tracking-wide font-body">
              Fecha
            </th>
            <th scope="col" className="text-right px-5 py-3 text-xs font-medium text-tl-500 uppercase tracking-wide font-body">
              Importe
            </th>
            <th scope="col" className="text-left px-5 py-3 text-xs font-medium text-tl-500 uppercase tracking-wide font-body">
              Estado
            </th>
            <th scope="col" className="text-right px-5 py-3 text-xs font-medium text-tl-500 uppercase tracking-wide font-body">
              PDF
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-tl-100 dark:divide-tl-800">
          {invoices.map((inv) => (
            <tr key={inv.id} className="hover:bg-tl-50/50 dark:hover:bg-tl-900/20 transition-colors">
              <td className="px-5 py-3.5 font-mono text-xs text-tl-600 dark:text-tl-300">
                {inv.number ?? "—"}
              </td>
              <td className="px-5 py-3.5 text-xs text-tl-600 dark:text-tl-300 font-body whitespace-nowrap">
                {formatDate(inv.date)}
              </td>
              <td className="px-5 py-3.5 text-right font-mono text-xs text-foreground">
                {formatAmount(inv.amount, inv.currency)}
              </td>
              <td className="px-5 py-3.5">
                <span
                  className={`inline-flex items-center rounded-full text-xs font-medium px-2 py-0.5 ${STATUS_STYLES[inv.status] ?? STATUS_STYLES.unknown}`}
                >
                  {STATUS_LABELS[inv.status] ?? inv.status}
                </span>
              </td>
              <td className="px-5 py-3.5 text-right">
                {inv.pdfUrl ? (
                  <a
                    href={inv.pdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Descargar factura ${inv.number ?? inv.id}`}
                    className="inline-flex items-center gap-1 text-xs text-tl-600 dark:text-tl-400 hover:text-tl-500 transition-colors"
                  >
                    PDF
                    <ExternalLink className="w-3 h-3" />
                  </a>
                ) : (
                  <span className="text-xs text-tl-300">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="px-5 py-3 text-xs text-tl-400 font-body border-t border-tl-100 dark:border-tl-800">
        IVA aplicado por Stripe Tax. Los importes mostrados incluyen IVA cuando corresponde.
      </p>
    </div>
  );
}
