import '@/styles/globals.css'

export const metadata = {
  title: 'CMS Setup Provisioning',
  description: 'Website setup and WordPress import for the shared CMS database.',
  robots: {
    index: false,
    follow: false,
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
