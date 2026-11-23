import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

// ES Build, il font del brand Veeam (variabile: un solo file per tutti i pesi)
const esBuild = localFont({ src: "./fonts/ES-Build.woff2", variable: "--font-text", weight: "100 900" });

export const metadata: Metadata = {
  title: "Report Backup: lo schema dei backup di un cliente",
  description: "Inserisci sistemi, destinazioni e piani di backup e ottieni un report semplice da consegnare al cliente.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it">
      <body className={`${esBuild.variable} font-sans antialiased`}>{children}</body>
    </html>
  );
}
