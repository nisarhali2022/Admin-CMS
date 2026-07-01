import '@/styles/globals.css'

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
    <html lang="en">
      <body>
        <main>{children}</main>
      </body>
    </html>
  )
}
