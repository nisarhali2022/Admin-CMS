import Link from 'next/link';
import { getCategories } from '@/lib/wordpress';
import { getCategoryColor } from '@/lib/utils';

export default async function CategoryList() {
  const categories = await getCategories();

  if (!categories || categories.length === 0) return null;

  return (
    <div>
      <h3 className="font-merriweather font-bold text-base text-text-primary mb-3 pb-2 border-b border-border">
        Categories
      </h3>
      <ul className="space-y-1">
        {categories.map((cat) => {
          const colorClass = getCategoryColor(cat.slug);
          return (
            <li key={cat.id}>
              <Link
                href={`/${cat.slug}`}
                className={`flex items-center justify-between px-3 py-2 rounded hover:bg-surface transition-colors group border-l-4 ${colorClass.replace('bg-', 'border-')}`}
              >
                <span className="text-sm text-text-primary group-hover:text-accent transition-colors font-medium">
                  {cat.name}
                </span>
                <span className="text-xs text-text-secondary bg-surface px-2 py-0.5 rounded-full">
                  {cat.count}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}