import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://et-tee.com';

  return {
    rules: [
      {
        userAgent: '*',
        allow: [
          '/',
          '/products',
          '/products/*',
          '/about',
          '/contact',
          '/faq',
          '/stores',
          '/policy',
          '/policy/*',
          '/size-guide',
          '/terms',
          '/privacy',
          '/news',
          '/news/*',
        ],
        disallow: [
          '/admin',
          '/admin/*',
          '/staff',
          '/staff/*',
          '/store-owner',
          '/store-owner/*',
          '/account',
          '/account/*',
          '/checkout',
          '/cart',
          '/auth',
          '/auth/*',
          '/api',
          '/api/*',
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
