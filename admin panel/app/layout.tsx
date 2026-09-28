import './globals.css'
import { Montserrat, Manrope } from 'next/font/google'
import BrandFonts from './components/BrandFonts'

// Same typography system as the Customer and Captain apps:
// Montserrat for headings and buttons, Manrope for body text.
const montserrat = Montserrat({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800', '900'],
  variable: '--font-montserrat',
  display: 'swap',
})

const manrope = Manrope({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800'],
  variable: '--font-manrope',
  display: 'swap',
})

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${montserrat.variable} ${manrope.variable}`}>
      <body>
        <BrandFonts />
        {children}
      </body>
    </html>
  )
}
