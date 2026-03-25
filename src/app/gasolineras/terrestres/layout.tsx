import { Metadata } from "next";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

export const metadata: Metadata = {
  alternates: {
    canonical: `${BASE_URL}/gasolineras/terrestres`,
  },
};

export default function TerrestresLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
