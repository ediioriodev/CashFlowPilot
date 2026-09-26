import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

import { AuthProvider } from "@/context/AuthContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { ModeProvider } from "@/context/ModeContext";
import { ScopeProvider } from "@/context/ScopeContext";
import { PeriodProvider } from "@/context/PeriodContext";
import { InstallProvider } from "@/context/InstallContext";
import AppShell from "@/components/layout/AppShell";
import AppToaster from "@/components/layout/AppToaster";
import DebugLog from "@/components/DebugLog";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Cash Flow Pilot",
  description: "Sai sempre quanto puoi spendere davvero.",
  manifest: "/manifest.json",
  icons: {
    icon: "/icon-192x192.png",
    shortcut: "/icon-192x192.png",
    apple: "/icon-192x192.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Cash Flow Pilot",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  // NB: niente maximumScale/userScalable. Disabilitare lo zoom viola
  // WCAG 1.4.4 e impedisce di ingrandire il testo. Il "feel da app"
  // si ottiene con touch-action: manipulation (vedi globals.css).
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F5F4F1" },
    { media: "(prefers-color-scheme: dark)", color: "#0E1013" },
  ],
};

/**
 * Applica tema e modalità PRIMA della prima pittura: niente lampo
 * bianco, niente schermo vuoto in attesa del primo effetto client e
 * niente blocchi che compaiono per un istante e poi spariscono.
 */
const bootstrap = `
(function(){
  try {
    var t = localStorage.getItem('theme');
    var dark = t === 'dark' || (!t && window.matchMedia('(prefers-color-scheme: dark)').matches);
    if (dark) document.documentElement.classList.add('dark');
  } catch (e) {}
  // data-mode va messo SEMPRE, anche se localStorage lancia: le regole
  // in globals.css sono [data-mode="simple"] e [data-mode="advanced"],
  // quindi senza attributo non si applica nessuna delle due e i blocchi
  // delle due modalità comparirebbero tutti insieme.
  var m = null;
  try { m = localStorage.getItem('view_mode'); } catch (e) {}
  // Il confronto è su 'advanced' perché il default è Semplice: senza
  // nulla in memoria si dipinge Semplice. Deve restare allineato a
  // MODE_DEFAULT e a getSnapshot() in ModeContext — se divergono,
  // React ricalcola dopo l'idratazione e i blocchi lampeggiano.
  document.documentElement.setAttribute('data-mode', m === 'advanced' ? 'advanced' : 'simple');

  // Installazione: Chrome/Edge/Samsung lanciano beforeinstallprompt una
  // volta sola e spesso PRIMA che React idrati. Se nessuno lo ascolta in
  // quell'istante è perso fino al prossimo caricamento: lo si trattiene
  // qui e InstallContext lo raccoglie quando arriva.
  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    window.__cfpInstallEvt = e;
    window.dispatchEvent(new Event('cfp:installable'));
  });
  window.addEventListener('appinstalled', function () {
    window.__cfpInstallEvt = null;
    window.__cfpInstalled = true;
    window.dispatchEvent(new Event('cfp:installed'));
  });
})();
`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="it" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: bootstrap }} />
      </head>
      {/* le estensioni del browser (ColorZilla, Grammarly…) aggiungono attributi al body
          prima dell'idratazione: senza questo ogni pagina segnala un falso mismatch */}
      <body className={`${inter.variable} font-sans bg-bg text-ink antialiased`} suppressHydrationWarning>
        <AuthProvider>
          <ThemeProvider>
            <ModeProvider>
              <ScopeProvider>
                <PeriodProvider>
                  <InstallProvider>
                    <AppShell>{children}</AppShell>
                    <AppToaster />
                    {process.env.NODE_ENV === "development" && <DebugLog />}
                  </InstallProvider>
                </PeriodProvider>
              </ScopeProvider>
            </ModeProvider>
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
