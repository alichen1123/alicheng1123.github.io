/**
 * 动态 Sitemap
 * 从 Ghost API 拉取所有文章生成 sitemap。
 * 当文章数超过 SITEMAP_PAGE_SIZE 时，自动生成 sitemap index。
 *
 * 用法：
 *   /sitemap.xml        → sitemap index（如果超过分片大小）或完整 sitemap
 *   /sitemap.xml?page=1 → 分片 sitemap
 */
import type { APIRoute } from 'astro';
import { SITE_URL, CACHE_TTL, SITEMAP_PAGE_SIZE, SUPPORTED_LANGS } from '../lib/env';
import { getAllPostSlugs } from '../lib/ghost';

export const GET: APIRoute = async ({ url }) => {
  const pageParam = url.searchParams.get('page');

  // 获取所有文章 slug（Ghost 不可用时返回空数组）
  let allSlugs: Awaited<ReturnType<typeof getAllPostSlugs>> = [];
  try {
    allSlugs = await getAllPostSlugs();
  } catch (err) {
    console.warn('[sitemap] Ghost API 不可用，只生成静态页面 URL:', err);
  }

  // 静态页面：首页 + 频道页 + 法律页面
  const today = new Date().toISOString().split('T')[0];
  const hubPages = ['tutorials', 'news', 'reviews', 'glossary'];
  const legalPages = ['disclaimer', 'privacy-policy', 'editorial-policy'];

  const staticUrls: Array<{ loc: string; lastmod: string }> = [];

  for (const lang of SUPPORTED_LANGS) {
    // 首页
    staticUrls.push({ loc: `${SITE_URL}/${lang}`, lastmod: today });
    // 频道枢纽页
    for (const hub of hubPages) {
      staticUrls.push({ loc: `${SITE_URL}/${lang}/${hub}`, lastmod: today });
    }
    // 法律页面
    for (const page of legalPages) {
      staticUrls.push({ loc: `${SITE_URL}/${lang}/page/${page}`, lastmod: today });
    }
    // 关于页面
    staticUrls.push({ loc: `${SITE_URL}/${lang}/page/about`, lastmod: today });
  }

  const articleUrls = allSlugs.map((item) => ({
    loc: `${SITE_URL}/${item.lang}/${item.slug}`,
    lastmod: item.updatedAt ? new Date(item.updatedAt).toISOString().split('T')[0] : undefined,
  }));

  const allUrls = [...staticUrls, ...articleUrls];
  const totalPages = Math.ceil(allUrls.length / SITEMAP_PAGE_SIZE);

  // 如果请求的是分片
  if (pageParam) {
    const page = parseInt(pageParam, 10);
    if (isNaN(page) || page < 1 || page > totalPages) {
      return new Response('Not Found', { status: 404 });
    }

    const start = (page - 1) * SITEMAP_PAGE_SIZE;
    const pageUrls = allUrls.slice(start, start + SITEMAP_PAGE_SIZE);
    return sitemapResponse(buildUrlset(pageUrls));
  }

  // 如果总数超过分片大小，返回 sitemap index
  if (allUrls.length > SITEMAP_PAGE_SIZE) {
    return sitemapResponse(buildSitemapIndex(totalPages));
  }

  // 否则返回完整 sitemap
  return sitemapResponse(buildUrlset(allUrls));
};

// --------------------------------------------------
// XML 构建
// --------------------------------------------------

function buildUrlset(urls: Array<{ loc: string; lastmod?: string }>): string {
  const entries = urls
    .map(
      (u) =>
        `  <url>
    <loc>${escapeXml(u.loc)}</loc>${u.lastmod ? `\n    <lastmod>${u.lastmod}</lastmod>` : ''}
  </url>`
    )
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries}
</urlset>`;
}

function buildSitemapIndex(totalPages: number): string {
  const entries: string[] = [];
  for (let i = 1; i <= totalPages; i++) {
    entries.push(`  <sitemap>
    <loc>${SITE_URL}/sitemap.xml?page=${i}</loc>
  </sitemap>`);
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.join('\n')}
</sitemapindex>`;
}

function escapeXml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function sitemapResponse(body: string): Response {
  return new Response(body, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': `public, s-maxage=${CACHE_TTL.sitemapSMaxAge}, stale-while-revalidate=86400`,
    },
  });
}
