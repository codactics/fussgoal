import "./globals.css";
import favicon from "../logo/favicon.ico";

export const metadata = {
  title: "FussGoal",
  description: "FussGoal football tournament and scoreboard platform.",
  icons: {
    icon: favicon.src,
    shortcut: favicon.src,
    apple: favicon.src,
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
