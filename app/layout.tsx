import type { Metadata } from "next";
import { Archivo_Black, Space_Grotesk } from "next/font/google";
import "./globals.css";

const archivoBlack = Archivo_Black({
  variable: "--font-archivo-black",
  subsets: ["latin"],
  weight: "400",
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Dashboard de inicio",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      suppressHydrationWarning
      className={`${archivoBlack.variable} ${spaceGrotesk.variable} h-full antialiased`}
    >
      <head>
        {/* Favicons de noticias/buscador salen de google.com — ahorra el handshake */}
        <link rel="preconnect" href="https://www.google.com" />
        {/* Precarga el fondo del tema claro (el más usado) para el primer paint */}
        <link rel="preload" as="image" href="/fondo-blanco.webp" media="(prefers-color-scheme: light)" />
        {/* Aplica el tema guardado antes del primer paint — evita el flash */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem('dash-theme');if(t==='dark'||t==='light'||t==='rose'){document.documentElement.setAttribute('data-theme',t);}else if(matchMedia('(prefers-color-scheme:dark)').matches){document.documentElement.setAttribute('data-theme','dark');}}catch(e){}`,
          }}
        />
      </head>
      <body className="min-h-full" style={{ fontFamily: "var(--font-sans)" }}>
        {children}
      </body>
    </html>
  );
}
