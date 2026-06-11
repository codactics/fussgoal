import "./globals.css";
import Script from "next/script";
import favicon from "../logo/favicon.ico";
import { buildAbsoluteUrl, getSiteUrl } from "../lib/site";

const siteUrl = getSiteUrl();
const socialImageUrl = buildAbsoluteUrl("/opengraph-image");

export const metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "FussGoal",
    template: "%s | FussGoal",
  },
  description: "FussGoal football tournament and scoreboard platform.",
  alternates: {
    canonical: "/",
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: favicon.src,
    shortcut: favicon.src,
    apple: favicon.src,
  },
  openGraph: {
    title: "FussGoal",
    description: "FussGoal football tournament and scoreboard platform.",
    url: siteUrl,
    siteName: "FussGoal",
    images: [
      {
        url: socialImageUrl,
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
    images: [socialImageUrl],
  },
};

function SocialIcon({ platform }) {
  if (platform === "facebook") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M13.5 21v-7.3h2.5l.4-3h-2.9V8.8c0-.9.3-1.5 1.6-1.5h1.5V4.6c-.3 0-1.2-.1-2.3-.1-2.3 0-3.8 1.4-3.8 4v2.2H8.6v3h2.4V21h2.5Z"
          fill="currentColor"
        />
      </svg>
    );
  }

  if (platform === "instagram") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M7.5 3h9A4.5 4.5 0 0 1 21 7.5v9a4.5 4.5 0 0 1-4.5 4.5h-9A4.5 4.5 0 0 1 3 16.5v-9A4.5 4.5 0 0 1 7.5 3Zm0 1.8A2.7 2.7 0 0 0 4.8 7.5v9a2.7 2.7 0 0 0 2.7 2.7h9a2.7 2.7 0 0 0 2.7-2.7v-9a2.7 2.7 0 0 0-2.7-2.7h-9Zm9.45 1.35a1.05 1.05 0 1 1 0 2.1 1.05 1.05 0 0 1 0-2.1ZM12 7.4A4.6 4.6 0 1 1 7.4 12 4.6 4.6 0 0 1 12 7.4Zm0 1.8A2.8 2.8 0 1 0 14.8 12 2.8 2.8 0 0 0 12 9.2Z"
          fill="currentColor"
        />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M21.6 7.2a2.9 2.9 0 0 0-2-2.1C17.8 4.5 12 4.5 12 4.5s-5.8 0-7.6.6a2.9 2.9 0 0 0-2 2.1A30.2 30.2 0 0 0 1.9 12a30.2 30.2 0 0 0 .5 4.8 2.9 2.9 0 0 0 2 2.1c1.8.6 7.6.6 7.6.6s5.8 0 7.6-.6a2.9 2.9 0 0 0 2-2.1 30.2 30.2 0 0 0 .5-4.8 30.2 30.2 0 0 0-.5-4.8ZM9.7 15.3V8.7l5.8 3.3-5.8 3.3Z"
        fill="currentColor"
      />
    </svg>
  );
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {children}
        <footer className="site-footer">
          <section className="site-footer-social" aria-label="CODACTICS social media">
            <p className="site-footer-social-prompt">Follow and subscribe us in:</p>
            <div className="site-footer-social-links">
              <a
                className="site-footer-social-link site-footer-social-facebook"
                href="https://www.facebook.com/Codactics"
                aria-label="Follow CODACTICS on Facebook"
                target="_blank"
                rel="noreferrer"
              >
                <SocialIcon platform="facebook" />
              </a>
              <a
                className="site-footer-social-link site-footer-social-instagram"
                href="https://www.instagram.com/codactics"
                aria-label="Follow CODACTICS on Instagram"
                target="_blank"
                rel="noreferrer"
              >
                <SocialIcon platform="instagram" />
              </a>
              <a
                className="site-footer-social-link site-footer-social-youtube"
                href="https://www.youtube.com/@Codactics"
                aria-label="Subscribe to CODACTICS on YouTube"
                target="_blank"
                rel="noreferrer"
              >
                <SocialIcon platform="youtube" />
              </a>
            </div>
          </section>
          <p className="site-footer-credit">
            <span>Developed and maintained by</span>
            <a
              className="site-footer-link"
              href="https://www.codactics.com/"
              target="_blank"
              rel="noreferrer"
            >
              CODACTICS
            </a>
          </p>
        </footer>
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
