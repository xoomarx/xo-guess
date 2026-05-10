import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Script from "next/script";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

const GA_ID = process.env.NEXT_PUBLIC_GA_ID;
const SITE_URL = "https://xo-guess.vercel.app";

export const metadata: Metadata = {
  title: "XO Guess — Free Multiplayer Party Games",
  description:
    "Play free multiplayer party games with friends! Logo & Flag Rush, Emoji Guess, Trivia, Typing Battle, Math Rush, True or False and more. No sign-up needed — create a room in seconds.",
  metadataBase: new URL(SITE_URL),
  openGraph: {
    title: "XO Guess — Free Multiplayer Party Games",
    description: "11 live game modes. Create a room, share the code, race your friends. Completely free.",
    url: SITE_URL,
    siteName: "XO Guess",
    type: "website",
    images: [{ url: `${SITE_URL}/og.png`, width: 1200, height: 630, alt: "XO Guess Party Games" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "XO Guess — Free Multiplayer Party Games",
    description: "Compete with friends in 11 real-time game modes. Free, no download, no sign-up needed.",
    images: [`${SITE_URL}/og.png`],
  },
  manifest: "/manifest.json",
  keywords: ["multiplayer party games", "logo quiz", "flag quiz", "trivia game", "online party game", "free browser game", "emoji quiz", "typing battle", "math rush"],
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <head>
        <meta name="theme-color" content="#03050f" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="XO Guess" />
      </head>
      <body className="min-h-full flex flex-col">
        {children}
        {GA_ID && (
          <>
            <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="afterInteractive" />
            <Script id="ga-init" strategy="afterInteractive">{`
              window.dataLayer=window.dataLayer||[];
              function gtag(){dataLayer.push(arguments);}
              gtag('js',new Date());
              gtag('config','${GA_ID}',{page_path:window.location.pathname});
            `}</Script>
          </>
        )}
      </body>
    </html>
  );
}
