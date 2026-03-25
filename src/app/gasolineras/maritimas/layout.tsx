import { Metadata } from "next";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

export const metadata: Metadata = {
  alternates: {
    canonical: `${BASE_URL}/gasolineras/maritimas`,
  },
};

export default function MaritimasLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
