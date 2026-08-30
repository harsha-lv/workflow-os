import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { THEME_BOOTSTRAP_SCRIPT } from "@/lib/theme";
import "./globals.css";

const sans = Geist({
  subsets: ["latin"],
  variable: "--font-sans-family",
});

const mono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono-family",
});

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  applicationName: "FlowForge",
  title: {
    default: "FlowForge",
    template: "%s · FlowForge",
  },
  description: "AI-native workflow automation and orchestration platform.",
  icons: { icon: "/favicon.svg" },
  openGraph: {
    title: "FlowForge",
    description: "AI-native workflow automation and orchestration platform.",
    siteName: "FlowForge",
    type: "website",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" data-theme="system" data-resolved="dark" className={`${sans.variable} ${mono.variable} h-full`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP_SCRIPT }} />
      </head>
      <body className="min-h-full bg-bg font-sans text-text antialiased">
        <ThemeProvider>
          <TooltipProvider>{children}</TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
