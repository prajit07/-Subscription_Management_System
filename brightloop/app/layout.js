import "./globals.css";
import Providers from "./providers";
import Sidebar from "./components/Sidebar";
import { Suspense } from "react";

export const metadata = {
  title: "Brightloop — Subscription Management",
  description: "Unified subscription lifecycle, billing, payments, and revenue reporting platform.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <div className="app-layout">
            <Suspense fallback={null}>
              <Sidebar />
            </Suspense>
            <main className="main-content" id="main-content">
              <Suspense fallback={<div className="loading-spinner"><div className="spinner"></div></div>}>
                {children}
              </Suspense>
            </main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
