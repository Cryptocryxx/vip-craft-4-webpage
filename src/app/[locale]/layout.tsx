import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { Chakra_Petch, Inter, JetBrains_Mono, Silkscreen } from "next/font/google";
import "../globals.css";
import { AnnouncementBanner } from "@/components/layout/AnnouncementBanner";
import { CookieBanner } from "@/components/legal/CookieBanner";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { routing } from "@/i18n/routing";
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

/**
 * Pixelschrift für den Start-Countdown.
 *
 * Die echte Minecraft-Schrift gehört Mojang und darf hier nicht mit
 * ausgeliefert werden. Silkscreen ist eine frei lizenzierte Pixelschrift mit
 * demselben Raster; zusammen mit dem harten Schlagschatten (siehe
 * ServerCountdown) sieht es aus wie die Oberfläche im Spiel.
 */
const pixel = Silkscreen({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-pixel",
});

/** Beide Sprachen vorab bauen, statt sie erst beim ersten Aufruf zu erzeugen. */
export function generateStaticParams(): Array<{ locale: string }> {
  return routing.locales.map((locale) => ({ locale }));
}

type Props = LayoutProps<"/[locale]">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Metadata" });

  return {
    title: {
      default: siteConfig.name,
      template: `%s | ${siteConfig.name}`,
    },
    description: t("description", {
      name: siteConfig.name,
      tagline: t("tagline"),
      mcVersion: siteConfig.minecraftVersion,
      createVersion: siteConfig.createVersion,
    }),
    keywords: t("keywords").split(", "),
  };
}

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
 *
 * Der Pfad-Test deckt beide Sprachfassungen der Startseite ab: "/" (Deutsch,
 * ohne Präfix) und "/en" (Englisch) - siehe i18n/routing.ts.
 */
const introSkript = `(function(){try{
  if(!/^\\/(en)?$/.test(location.pathname))return;
  if(localStorage.getItem("vipcraft:intro-gesehen"))return;
  if(matchMedia("(prefers-reduced-motion: reduce)").matches)return;
  document.documentElement.dataset.intro="pending";
  localStorage.setItem("vipcraft:intro-gesehen","1");
}catch(e){}})();`;

export default async function RootLayout({ children, params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();

  // Aktiviert statisches Rendern für diese Sprache - next-intl braucht das,
  // um zu wissen, dass die Sprache für die ganze Anfrage feststeht.
  setRequestLocale(locale);

  return (
    <html
      lang={locale}
      className={`${display.variable} ${body.variable} ${mono.variable} ${pixel.variable} h-full antialiased`}
      // Das Intro-Skript setzt data-intro noch vor der Hydration. React kennt
      // das Attribut aus dem Server-HTML nicht und meldet sonst einen
      // Hydration-Mismatch – hier ist die Abweichung gewollt.
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: introSkript }} />
      </head>
      <body className="flex min-h-full flex-col">
        <NextIntlClientProvider>
          <AnnouncementBanner />
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
          <CookieBanner />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
