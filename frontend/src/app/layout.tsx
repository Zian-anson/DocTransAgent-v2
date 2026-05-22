import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import GMIStatusBar from "@/components/GMIStatusBar";
import ErrorBoundary from "@/components/ErrorBoundary";

export const metadata: Metadata = {
  title: "DocTransAgent — AI Translation & Knowledge Base",
  description:
    "AI-powered overseas document translation & knowledge base agent. Built on GMI Cloud Inference Engine.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh">
      <body className="antialiased">
        <GMIStatusBar />
        <div className="flex min-h-screen">
          <Sidebar />
          <main className="ml-56 flex-1 p-8">
            <ErrorBoundary>{children}</ErrorBoundary>
          </main>
        </div>
      </body>
    </html>
  );
}
