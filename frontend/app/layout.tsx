import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/lib/auth-context';
import { ToastProvider } from '@/components/ui/toast';
import { ThemeProvider } from '@/lib/theme-context';

export const metadata: Metadata = {
  title: 'YOYO — Enterprise Cloud AI Model API Platform',
  description: 'High-throughput, OpenAI-compatible cloud AI model API platform serving open-weights foundation models on dedicated NVIDIA H100 SXM5 and A100 GPU clusters.',
  icons: {
    icon: '/icon.svg',
    shortcut: '/favicon.svg',
    apple: '/icon.svg',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  const stored = localStorage.getItem('yoyo_theme');
                  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                  const theme = stored === 'light' ? 'light' : (stored === 'dark' ? 'dark' : (prefersDark ? 'dark' : 'light'));
                  document.documentElement.classList.add(theme);
                  document.documentElement.style.colorScheme = theme;
                } catch(e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="min-h-screen bg-background text-foreground antialiased selection:bg-primary/30 font-sans">
        <ThemeProvider>
          <ToastProvider>
            <AuthProvider>{children}</AuthProvider>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
