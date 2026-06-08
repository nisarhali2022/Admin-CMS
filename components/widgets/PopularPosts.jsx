import Link from 'next/link';
import Image from 'next/image';
import { getPosts } from '@/lib/wordpress';
import { formatDate } from '@/lib/utils';
import { SITE_CONFIG } from '@/lib/constants';

export default async function PopularPosts({ count = 5 }) {
  // WordPress REST API doesn't expose view counts natively;
  // we use most-commented posts as a popularity proxy.
  const data = await getPosts({ perPage: count, orderby: 'comment_count' });
  const posts = data?.posts || [];

  if (posts.length === 0) return null;

  return (
    <div>
      <h3 className="font-merriweather font-bold text-base text-text-primary mb-3 pb-2 border-b border-border">
        Popular Posts
      </h3>
      <ul className="space-y-3">
        {posts.map((post, index) => {
          const imageUrl =
            post._embedded?.['wp:featuredmedia']?.[0]?.source_url || null;
          return (
            <li key={post.id}>
              <Link href={`/${post.slug}`} className="flex gap-3 group">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-accent text-white text-xs font-bold flex items-center justify-center mt-1">
                  {index + 1}
                </span>
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