import type { Metadata } from "next";
import SessionProvider from "@/components/SessionProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "GCAL Stat Tracker",
  description:
    "See who you hang out with most, powered by your Google Calendar",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-zinc-950 text-zinc-100 min-h-screen antialiased">
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
