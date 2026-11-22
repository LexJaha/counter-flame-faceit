import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Counter Flame FACEIT",
  description: "A competitive gaming platform for matchmaking, rankings and community.",
  applicationName: "Counter Flame FACEIT",
  themeColor: "#08090b",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;
}
