import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Release Communication and Readiness Brief Assistant',
  description:
    'LLM-assisted release package analysis, readiness checking, human governance, and audience-specific summary brief generation.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="bg-slate-950 text-slate-100 min-h-screen antialiased">
        {children}
      </body>
    </html>
  );
}
