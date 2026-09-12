import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: 'Dream Island ✦ A tiny photo safari', description: 'Explore a living, AI-generated garden. Make a wish, meet curious creatures, and fill your little postcard album.' };
export default function Layout({children}:{children:React.ReactNode}) { return <html lang="en"><body>{children}</body></html>; }
