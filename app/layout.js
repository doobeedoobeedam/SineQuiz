import { Bricolage_Grotesque, Instrument_Serif } from 'next/font/google';
import './globals.css';

const sans = Bricolage_Grotesque({ subsets: ['latin'], variable: '--f-sans' });
const serif = Instrument_Serif({ subsets: ['latin'], weight: '400', style: ['normal', 'italic'], variable: '--f-serif' });

export const metadata = {
  title: 'SineQuiz - tebak film dari satu scene',
  description: 'Quiz tebak judul film dari cuplikan scene. Data dari TMDB.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="id" className={`${sans.variable} ${serif.variable}`}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
