import Link from 'next/link';
import Image from 'next/image';
import { formatDate, getCategoryColor, stripHtml } from '@/lib/utils';

export default function LatestNewsGrid({ posts }) {
  if (!posts?.length) return null;

  return (
    <section className="my-8">
      <h2 className="font-merriweather font-bold text-xl text-text-primary mb-5 pb-2 border-b-2 border-accent inline-block">
        Latest News
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {posts.map((post, index) => {
          const img = post._embedded?.['wp:featuredmedia']?.[0]?.source_url || null;
          const category = post._embedded?.['wp:term']?.[0]?.[0] || null;
          return (
            <Link
              key={post.id}
              href={`/${post.slug}`}
              className="group flex flex-col bg-white border border-border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200"
            >
              <div className="relative w-full aspect-video overflow-hidden bg-surface">
                {img ? (
                  <Image
                    src={img}
                    alt={stripHtml(post.title?.rendered || '')}
                    fill
                    priority={index === 0}
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  />
                ) : (
                  <div className={`w-full h-full ${getCategoryColor(category?.slug || 'default')}`} />
                )}
                {category && (
                  <span className={`absolute top-2 left-2 px-2 py-0.5 rounded-full text-white text-xs font-semibold ${getCategoryColor(category.slug)}`}>
                    {category.name}
                  </span>
                )}
              </div>

              <div className="p-4 flex flex-col flex-1">
                <h3
                  className="font-merriweather font-bold text-sm text-text-primary leading-snug line-clamp-2 group-hover:text-accent transition-colors mb-2"
                  dangerouslySetInnerHTML={{ __html: post.title?.rendered }}
                />
                <p className="text-xs text-text-secondary mt-auto">{formatDate(post.date)}</p>
              </div>
            </Link>
          );
        })}
      </div>

      <div className="mt-6 text-center">
        <Link
          href="/category/blog"
          className="inline-block px-6 py-2.5 bg-primary text-white text-sm font-semibold rounded hover:bg-[#2a5298] transition-colors"
        >
          👉 Explore Today Top News &amp; Blog – Click Here
        </Link>
      </div>
    </section>
  );
}