import '@/styles/globals.css'

export const metadata = {
  title: 'Quiz Admin',
  description: 'Private quiz publishing admin.',
  robots: {
    index: false,
    follow: false,
    googleBot: { index: false, follow: false },
  },
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="font-body bg-surface text-text-primary">
        <main>{children}</main>
      </body>
    </html>
  )
}
