import type {Metadata} from "next";
import type {ReactNode} from "react";

import "./globals.css";

export const metadata: Metadata = {
  title: "Trialign — Outcome concordance",
  description: "Prospective clinical-trial outcome concordance on GenLayer.",
  icons: {
    icon: "/trialign-logo.svg",
    apple: "/trialign-logo.svg",
  },
};

export default function RootLayout({children}: {children: ReactNode}) {
  return <html lang="en"><body>{children}</body></html>;
}
