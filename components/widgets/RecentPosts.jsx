import Link from 'next/link';
import Image from 'next/image';
import { getLatestPosts } from '@/lib/wordpress';
import { formatDate } from '@/lib/utils';

export default async function RecentPosts({ count = 5 }) {
  const posts = await getLatestPosts(count);

  if (!posts || posts.length === 0) return null;

  return (
    <div>
      <h3 className="font-merriweather font-bold text-base text-text-primary mb-3 pb-2 border-b border-border">
        Recent Posts
      </h3>
      <ul className="space-y-3">
        {posts.map((post) => {
          const imageUrl =
            post._embedded?.['wp:featuredmedia']?.[0]?.source_url || null;
          return (
            <li key={post.id}>
              <Link
                href={`/${post.slug}`}
                className="flex gap-3 group"
              >
                <div className="relative w-16 h-14 flex-shrink-0 rounded overflow-hidden bg-surface">
                  {imageUrl ? (
                    <Image
                      src={imageUrl}
                      alt={post.title?.rendered || ''}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-200"
                      sizes="64px"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-primary to-accent" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p
                    className="text-sm font-medium text-text-primary group-hover:text-accent transition-colors line-clamp-2 leading-snug"
                    dangerouslySetInnerHTML={{ __html: post.title?.rendered }}
                  />
                  <p className="text-xs text-text-secondary mt-1">
                    {formatDate(post.date)}
                  </p>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}