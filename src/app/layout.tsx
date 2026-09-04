import type { Metadata } from "next";
import { Chakra_Petch, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { AnnouncementBanner } from "@/components/layout/AnnouncementBanner";
import { CookieBanner } from "@/components/legal/CookieBanner";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { siteConfig } from "@/lib/config";

const display = Chakra_Petch({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-display",
});

const body = Inter({
  subsets: ["latin"],
  variable: "--font-body",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: {
    default: siteConfig.name,
    template: `%s | ${siteConfig.name}`,
  },
  description: `${siteConfig.name} – ${siteConfig.tagline}. Create-Mod, Zugstrecken, Events und eine Community aus der Uni.`,
  keywords: ["Minecraft", "Create Mod", "Server", "VIP Craft", "Uni", "Community"],
};

/**
 * Entscheidet noch vor dem ersten Bildaufbau, ob das Intro laufen soll.
 *
 * Muss synchron im <head> stehen: Erst danach weiss das CSS, ob es die Seite
 * hinter einer schwarzen Flaeche verstecken soll. Wuerde das erst React
 * erledigen, saehen Wiederkehrer kurz Schwarz und Erstbesucher kurz die Seite.
 *
 * Der Merker wird hier gesetzt – im Moment der Entscheidung, nicht erst wenn das
 * Video laeuft. Sonst gibt es ein Zeitfenster, in dem noch nichts gemerkt wurde:
 * Das Video ist 20 MB gross, und wer den Tab waehrend des Ladens schliesst,
 * bekaeme das Intro beim naechsten Aufruf erneut. Umgekehrt gilt: Faellt das
 * Intro danach aus (Video fehlt, Verbindung bricht ab), wurde es trotzdem als
 * gesehen vermerkt. Das ist gewollt – hoechstens einmal ist wichtiger als
 * unbedingt einmal.
 *
 * Reihenfolge mit Absicht: erst das Attribut, dann der Merker. Schlaegt der
 * Speicherzugriff fehl (privates Fenster), laeuft das Intro trotzdem.
 */
const introSkript = `(function(){try{
  if(location.pathname!=="/")return;
  if(localStorage.getItem("vipcraft:intro-gesehen"))return;
  if(matchMedia("(prefers-reduced-motion: reduce)").matches)return;
  document.documentElement.dataset.intro="pending";
  localStorage.setItem("vipcraft:intro-gesehen","1");
}catch(e){}})();`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="de"
      className={`${display.variable} ${body.variable} ${mono.variable} h-full antialiased`}
      // Das Intro-Skript setzt data-intro noch vor der Hydration. React kennt
      // das Attribut aus dem Server-HTML nicht und meldet sonst einen
      // Hydration-Mismatch – hier ist die Abweichung gewollt.
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: introSkript }} />
      </head>
      <body className="flex min-h-full flex-col">
        <AnnouncementBanner />
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
        <CookieBanner />
      </body>
    </html>
  );
}
