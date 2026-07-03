import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Project History AI', description: 'Project archive with AI search' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="ko"><body>{children}</body></html>;
}
