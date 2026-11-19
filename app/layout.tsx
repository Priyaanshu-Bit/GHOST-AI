import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { dark } from "@clerk/ui/themes";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Ghost AI",
  description: "Real-time collaborative system design workspace",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const hasClerkKey = Boolean(
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ||
    process.env.CLERK_PUBLISHABLE_KEY
  );

  if (!hasClerkKey) {
    return (
      <html
        lang="en"
        className={`${geistSans.variable} ${geistMono.variable} dark h-full antialiased`}
      >
        <body className="min-h-full flex items-center justify-center bg-base text-copy-primary p-6 antialiased">
          <div className="max-w-md w-full bg-surface border border-border-subtle rounded-2xl p-6 shadow-2xl text-center space-y-4">
            <div className="w-10 h-10 rounded-xl bg-accent-primary/10 text-accent-primary border border-accent-primary/20 flex items-center justify-center mx-auto">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h1 className="text-base font-semibold text-copy-primary">Vercel Configuration Required</h1>
            <p className="text-xs text-copy-muted leading-relaxed">
              Environment variables have not been configured on this Vercel deployment yet. Please add your Clerk and database keys in <strong>Vercel Dashboard → Project Settings → Environment Variables</strong>.
            </p>
          </div>
        </body>
      </html>
    );
  }

  return (
    <ClerkProvider
      appearance={{
        theme: dark,
        variables: {
          colorPrimary: "var(--accent-primary)",
          colorPrimaryForeground: "var(--bg-base)",
          colorBackground: "var(--bg-surface)",
          colorInput: "var(--bg-subtle)",
          colorInputForeground: "var(--text-primary)",
          colorForeground: "var(--text-primary)",
          colorMuted: "var(--bg-subtle)",
          colorMutedForeground: "var(--text-muted)",
          colorDanger: "var(--state-error)",
          colorSuccess: "var(--state-success)",
          colorWarning: "var(--state-warning)",
          colorBorder: "var(--border-default)",
          colorNeutral: "var(--text-primary)",
          borderRadius: "0.75rem",
          fontFamily: "var(--font-geist-sans)",
        },
      }}
    >
      <html
        lang="en"
        className={`${geistSans.variable} ${geistMono.variable} dark h-full antialiased`}
      >
        <body className="min-h-full flex flex-col bg-base text-copy-primary antialiased">
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
