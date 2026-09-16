import type { Metadata } from "next";
import { League_Spartan } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { NotificationProvider } from "@/context/NotificationContext";

const leagueSpartan = League_Spartan({
  variable: "--font-spartan",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "ResearchCompany — Intelligent Research Workspace",
  description: "Scalable research workspace integrating AI research assistant, file & data management, citations, schedule, and team communication.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${leagueSpartan.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#F6F7F9] text-[#111111] font-sans selection:bg-[#EEF2FF] selection:text-[#0000CD]">
        <AuthProvider>
          <NotificationProvider>{children}</NotificationProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
