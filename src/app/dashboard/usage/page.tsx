import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth-config";
import { UsageChart } from "@/components/dashboard/UsageChart";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Uso de la API — Panel de control",
  robots: { index: false, follow: true },
};

export default async function UsagePage() {
  const session = await auth();
  if (!session?.user?.email) {
    redirect("/login");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-700 text-foreground">Uso de la API</h1>
        <p className="text-sm text-tl-500 font-body mt-1">
          Analiza el consumo de tus claves API por período y endpoint
        </p>
      </div>

      {/* Client component handles its own data fetching via SWR / fetch */}
      <UsageChart />
    </div>
  );
}
