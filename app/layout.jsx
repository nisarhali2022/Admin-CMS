import '@/styles/globals.css'
import { TooltipProvider } from '@/components/ui/tooltip'

export const metadata = {
  title: 'Admin CMS',
  description: 'Private single-admin multi-website CMS.',
  robots: {
    index: false,
    follow: false,
    googleBot: { index: false, follow: false },
  },
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="font-sans">
      <body>
        <TooltipProvider>
          <main>{children}</main>
        </TooltipProvider>
      </body>
    </html>
  )
}
