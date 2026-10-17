import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PGPC · CUValles",
  description: "Plataforma de Gestión de la Producción Científica",
};

// Aplica el tema guardado en la cookie antes de pintar, para que no parpadee
// (guía de Next.js "Preventing flash before hydration"). Sin cookie queda el claro.
const SCRIPT_TEMA = `(function(){try{var m=document.cookie.match(/(?:^|; )tema=(claro|oscuro)(?:;|$)/);if(m)document.documentElement.setAttribute("data-tema",m[1])}catch(e){}})()`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      data-tema="claro"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: SCRIPT_TEMA }} />
      </head>
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
