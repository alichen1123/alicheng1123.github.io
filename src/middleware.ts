/**
 * ============================================
 * Astro Middleware
 * ============================================
 * 职责：
 * 1. 读取 x-vercel-ip-country 检测访客国家
 * 2. 根据请求路径判断当前语言
 * 3. 构建联盟分流数据并注入 Astro.locals
 *
 * 注意：这里只处理 country-based affiliate routing，
 * 与 GEO（Generative Engine Optimization）完全无关。
 */

import { defineMiddleware } from 'astro:middleware';
import { buildAffiliateData } from './lib/affiliate';
import { isValidLang, DEFAULT_LANG, type SupportedLang } from './lib/env';

export const onRequest = defineMiddleware(async (context, next) => {
  // 1. 检测访客国家
  const countryCode =
    context.request.headers.get('x-vercel-ip-country') || 'UNKNOWN';

  // 2. 从 URL 路径判断当前语言
  const pathParts = new URL(context.request.url).pathname.split('/').filter(Boolean);
  const langFromPath = pathParts[0] || DEFAULT_LANG;
  const currentLang: SupportedLang = isValidLang(langFromPath)
    ? langFromPath
    : DEFAULT_LANG;

  // 3. 构建联盟数据并注入 locals
  context.locals.affiliate = buildAffiliateData(countryCode, currentLang);

  return next();
});
