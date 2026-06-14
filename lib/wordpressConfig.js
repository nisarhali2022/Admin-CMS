import { SITE_CONFIG } from './constants'

export const WORDPRESS_API_URL =
  process.env.WORDPRESS_API_URL ||
  process.env.NEXT_PUBLIC_WORDPRESS_API_URL ||
  SITE_CONFIG.wpApiUrl
