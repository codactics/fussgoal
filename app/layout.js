import "./globals.css";
import Script from "next/script";
import favicon from "../logo/favicon.ico";
import shareImage from "../logo/fussgoal.png";

export const metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://fussgoal.vercel.app"),
  title: "FussGoal",
  description: "FussGoal football tournament and scoreboard platform.",
  icons: {
    icon: favicon.src,
    shortcut: favicon.src,
    apple: favicon.src,
  },
  openGraph: {
    title: "FussGoal",
    description: "FussGoal football tournament and scoreboard platform.",
    url: "https://fussgoal.vercel.app",
    siteName: "FussGoal",
    images: [
      {
        url: shareImage.src,
        width: 1200,
        height: 630,
        alt: "FussGoal",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "FussGoal",
    description: "FussGoal football tournament and scoreboard platform.",
    images: [shareImage.src],
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {children}
        <Script
          async
          src="https://plausible.io/js/pa-F24zV2vjtfOPZwTxsfGM5.js"
          strategy="afterInteractive"
        />
        <Script id="plausible-init" strategy="afterInteractive">
          {`window.plausible=window.plausible||function(){(plausible.q=plausible.q||[]).push(arguments)};plausible.init=plausible.init||function(i){plausible.o=i||{}};plausible.init();`}
        </Script>
      </body>
    </html>
  );
}
