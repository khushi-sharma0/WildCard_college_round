import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nexus | Business Operating Platform",
  description: "Autonomous multi-step business workflows across CRM, Sites, Webinars, Marketing, and Billing with Human-in-the-Loop governance.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#FAF8F5] text-stone-900 font-sans antialiased selection:bg-[#E8C2B3] selection:text-stone-900">
        {children}
      </body>
    </html>
  );
}
