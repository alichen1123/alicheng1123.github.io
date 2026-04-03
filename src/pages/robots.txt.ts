/**
 * 动态 robots.txt
 */
import type { APIRoute } from 'astro';
import { SITE_URL, CACHE_TTL } from '../lib/env';

export const GET: APIRoute = () => {
  const body = `User-agent: *
Allow: /

Sitemap: ${SITE_URL}/sitemap.xml

# 禁止抓取 API 和内部路径
Disallow: /api/
`;

  return new Response(body, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': `public, s-maxage=${CACHE_TTL.robotsSMaxAge}`,
    },
  });
};
