import type { Metadata } from 'next';
import { Geist } from 'next/font/google'; // Changed to Geist Sans only
import './globals.css';
import { Toaster } from '@/components/ui/toaster'; // Import Toaster

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

// Removed Geist Mono as it's not needed for the clean sans-serif style

export const metadata: Metadata = {
  title: 'FocusFlow', // Updated app name
  description: 'Simple Pomodoro Timer and Leaderboard', // Updated description
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      {/* Removed geistMono variable */}
      <body className={`${geistSans.variable} antialiased`}>
        {children}
        <Toaster /> {/* Add Toaster here */}
      </body>
    </html>
  );
}
