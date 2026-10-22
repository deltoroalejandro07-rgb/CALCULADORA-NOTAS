import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "CRM dliverygo", template: "%s · dliverygo" },
  description: "Visitas, clientes y ofertas para el equipo comercial.",
  applicationName: "CRM dliverygo",
  appleWebApp: { capable: true, title: "dliverygo", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f7f9" },
    { media: "(prefers-color-scheme: dark)", color: "#0d1117" },
  ],
  viewportFit: "cover",
};

// Tema guardado ("claro"/"oscuro") o el del sistema, antes de pintar nada.
const scriptTema = `(function(){try{var t=localStorage.getItem("tema");var d=t?t==="oscuro":matchMedia("(prefers-color-scheme: dark)").matches;document.documentElement.setAttribute("data-theme",d?"dark":"light")}catch(e){}})()`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" data-theme="light" className={`${inter.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: scriptTema }} />
      </head>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
