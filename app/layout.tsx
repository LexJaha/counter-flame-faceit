import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CounterFlame FACEIT — Competitive Community",
  description: "Competitive matchmaking, private match rooms, realtime team chat and verified community rankings.",
  applicationName: "CounterFlame FACEIT",
  themeColor: "#08090b",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="tr"><body>{children}</body></html>;
}
