import Link from 'next/link';
import { getCategories } from '@/lib/wordpress';
import { getCategoryColor } from '@/lib/utils';

export default async function CategoryMenu() {
  const categories = await getCategories();

  if (!categories || categories.length === 0) return null;

  return (
    <section className="py-8">
      <h2 className="font-merriweather text-xl font-bold text-text-primary mb-4">
        Browse Categories
      </h2>
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
        {categories.map((cat) => (
          <Link
            key={cat.id}
            href={`/category/${cat.slug}`}
            className={`flex-shrink-0 flex flex-col items-center justify-center px-5 py-4 rounded-xl text-white shadow-sm hover:shadow-md transition-all min-w-[120px] ${getCategoryColor(cat.slug)}`}
          >
            <span className="font-semibold text-sm text-center leading-tight">
              {cat.name}
            </span>
            <span className="text-xs opacity-80 mt-1">{cat.count} posts</span>
          </Link>
        ))}
      </div>
    </section>
  );
}