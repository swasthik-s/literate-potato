import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ReelRadar — Global Movie & OTT Tracker",
  description: "Discover worldwide movie releases and find where to watch them."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
