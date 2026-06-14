import { SITE_CONFIG } from '@/lib/constants';

export default function robots() {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/wp-admin/', '/wp-login.php'],
    },
    sitemap: `${SITE_CONFIG.siteUrl}/sitemap_index.xml`,
  };
}
