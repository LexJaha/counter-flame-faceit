import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CounterFlame — New Foundation",
  description: "CounterFlame competitive platform.",
  applicationName: "CounterFlame",
  themeColor: "#090a0c",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="tr"><body>{children}</body></html>;
}
