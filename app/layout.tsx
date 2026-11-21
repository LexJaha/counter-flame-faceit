import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "CounterFlame FACEIT", description: "Community competitive platform" };
export default function RootLayout({ children }: { children: React.ReactNode }) { return <html lang="tr"><body>{children}</body></html>; }
