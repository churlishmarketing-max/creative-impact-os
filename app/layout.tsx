import type { Metadata, Viewport } from "next";
import "./cockpit.css";
import "./mobile.css";

export const metadata: Metadata = {
  title: "Churlish OS",
  description: "Churlish OS — Command Center",
  manifest: "/manifest.json",
  icons: { icon: "/icons/icon-192.png", apple: "/icons/icon-192.png" },
};

export const viewport: Viewport = {
  themeColor: "#080809",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        {children}
        {/* Register the no-cache service worker (PWA installability for the Android app) */}
        <script
          dangerouslySetInnerHTML={{
            __html: `if("serviceWorker" in navigator)window.addEventListener("load",function(){navigator.serviceWorker.register("/sw.js").catch(function(){})});`,
          }}
        />
      </body>
    </html>
  );
}
