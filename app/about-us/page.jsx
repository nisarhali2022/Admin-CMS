import { notFound } from 'next/navigation'
import { getPageBySlug } from '@/lib/wordpress'
import {
  optimizeContentImages,
  toPlainText,
  truncateText,
} from '@/lib/utils'
import { buildMetadata } from '@/lib/seo'
import { SITE_CONFIG } from '@/lib/constants'
import Breadcrumbs from '@/components/navigation/Breadcrumbs'

export const revalidate = 3600

export async function generateMetadata() {
  const page = await getPageBySlug('about-us')
  const title = page?.title?.rendered
    ? toPlainText(page.title.rendered)
    : 'About Us'
  const description = page?.excerpt?.rendered
    ? truncateText(page.excerpt.rendered, 160)
    : `Learn more about ${SITE_CONFIG.name}.`

  return buildMetadata({ title, description, path: '/about-us' })
}

export default async function AboutPage() {
  const page = await getPageBySlug('about-us')
  if (!page) notFound()

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Breadcrumbs
        items={[{ label: 'Home', href: '/' }, { label: 'About Us' }]}
        currentPath="/about-us"
      />
      <article>
        <h1 className="font-heading font-bold text-3xl sm:text-4xl text-text-primary mt-2 mb-8">
          {toPlainText(page.title?.rendered)}
        </h1>
        <div
          className="prose prose-lg max-w-none prose-headings:font-heading prose-headings:text-text-primary prose-a:text-accent hover:prose-a:underline prose-img:rounded-lg prose-img:shadow-sm prose-blockquote:border-l-4 prose-blockquote:border-accent prose-blockquote:text-text-secondary"
          dangerouslySetInnerHTML={{
            __html: optimizeContentImages(page.content?.rendered || ''),
          }}
        />
      </article>
    </div>
  )
}
