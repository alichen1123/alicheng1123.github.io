/**
 * ============================================
 * SEO 工具集
 * ============================================
 * canonical URL、hreflang、JSON-LD、OG 数据构建
 */

import {
  SITE_URL,
  SUPPORTED_LANGS,
  DEFAULT_LANG,
  UI_TEXT,
  type SupportedLang,
} from './env';
import type { GhostPost } from './ghost';
import type { ContentBlocks, HowToStep, ReviewData, DefinedTermData } from './content';

// --------------------------------------------------
// URL 构建
// --------------------------------------------------

/** 构建完整 canonical URL */
export function buildCanonicalUrl(lang: SupportedLang, slug: string): string {
  return `${SITE_URL}/${lang}/${slug}`;
}

/** 构建 hreflang 列表 */
export function buildHreflangList(slug: string): Array<{ lang: string; url: string }> {
  const list: Array<{ lang: string; url: string }> = [];

  for (const lang of SUPPORTED_LANGS) {
    list.push({
      lang,
      url: buildCanonicalUrl(lang, slug),
    });
  }

  // x-default 指向英文版
  list.push({
    lang: 'x-default',
    url: buildCanonicalUrl(DEFAULT_LANG, slug),
  });

  return list;
}

// --------------------------------------------------
// SEO 元数据
// --------------------------------------------------

export interface SeoMeta {
  title: string;
  description: string;
  canonicalUrl: string;
  ogTitle: string;
  ogDescription: string;
  ogImage: string | null;
  ogType: string;
  twitterCard: string;
  publishedTime: string | null;
  modifiedTime: string | null;
  author: string | null;
  lang: SupportedLang;
  slug: string;
}

export function buildSeoMeta(post: GhostPost, lang: SupportedLang): SeoMeta {
  const title = post.meta_title || post.title;
  const description =
    post.meta_description ||
    post.custom_excerpt ||
    generateExcerptFromHtml(post.html);
  const canonicalUrl = post.canonical_url || buildCanonicalUrl(lang, post.slug);
  const author = post.authors?.[0]?.name || null;

  return {
    title,
    description,
    canonicalUrl,
    ogTitle: title,
    ogDescription: description,
    ogImage: post.feature_image,
    ogType: 'article',
    twitterCard: post.feature_image ? 'summary_large_image' : 'summary',
    publishedTime: post.published_at,
    modifiedTime: post.updated_at,
    author,
    lang,
    slug: post.slug,
  };
}

// --------------------------------------------------
// JSON-LD 结构化数据
// --------------------------------------------------

/** Article JSON-LD（GEO 增强版） */
export function buildArticleJsonLd(
  post: GhostPost,
  lang: SupportedLang,
  blocks?: ContentBlocks
): object {
  const url = buildCanonicalUrl(lang, post.slug);
  const description =
    post.meta_description || post.custom_excerpt || generateExcerptFromHtml(post.html);

  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description,
    abstract: blocks?.summary || description,
    url,
    image: post.feature_image || undefined,
    datePublished: post.published_at,
    dateModified: post.updated_at,
    author: post.authors?.map((a) => ({
      '@type': 'Person',
      name: a.name,
      url: a.url || undefined,
      image: a.profile_image || undefined,
    })),
    publisher: {
      '@type': 'Organization',
      name: '币易家 Biyijia',
      url: SITE_URL,
      logo: {
        '@type': 'ImageObject',
        url: `${SITE_URL}/favicon.svg`,
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': url,
    },
    inLanguage: lang,
    articleSection: blocks?.articleSection || undefined,
    wordCount: blocks?.wordCount || undefined,
    keywords: post.tags
      ?.filter((t) => t.visibility === 'public')
      .map((t) => t.name),
    isAccessibleForFree: true,
    // GEO: Speakable — 告诉 AI/语音引擎哪些内容适合朗读
    speakable: {
      '@type': 'SpeakableSpecification',
      cssSelector: ['.summary-block', '.takeaways-block', '.article-meta'],
    },
  };
}

/** GEO: HowTo JSON-LD（教程类内容） */
export function buildHowToJsonLd(
  post: GhostPost,
  lang: SupportedLang,
  steps: HowToStep[],
  blocks: ContentBlocks
): object | null {
  if (steps.length === 0) return null;

  return {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: post.title,
    description: blocks.summary,
    image: post.feature_image || undefined,
    totalTime: `PT${Math.max(5, blocks.wordCount > 1000 ? 15 : 10)}M`,
    step: steps.map((s, i) => ({
      '@type': 'HowToStep',
      position: i + 1,
      name: s.name,
      text: s.text,
      image: s.image || undefined,
    })),
    inLanguage: lang,
  };
}

/** GEO: Review JSON-LD（评测类内容） */
export function buildReviewJsonLd(
  post: GhostPost,
  lang: SupportedLang,
  review: ReviewData
): object | null {
  if (!review) return null;

  return {
    '@context': 'https://schema.org',
    '@type': 'Review',
    name: post.title,
    reviewBody: review.reviewBody,
    author: {
      '@type': 'Person',
      name: post.authors?.[0]?.name || '币易家 Biyijia',
    },
    datePublished: post.published_at,
    dateModified: post.updated_at,
    itemReviewed: {
      '@type': 'Product',
      name: review.itemName,
      category: 'Cryptocurrency Exchange',
    },
    reviewRating: {
      '@type': 'Rating',
      ratingValue: review.ratingValue,
      bestRating: review.bestRating,
      worstRating: review.worstRating,
    },
    publisher: {
      '@type': 'Organization',
      name: '币易家 Biyijia',
    },
    inLanguage: lang,
  };
}

/** GEO: DefinedTermSet JSON-LD（术语定义） */
export function buildDefinedTermsJsonLd(
  terms: DefinedTermData[],
  lang: SupportedLang
): object | null {
  if (terms.length === 0) return null;

  return {
    '@context': 'https://schema.org',
    '@type': 'DefinedTermSet',
    name: lang === 'zh' ? '加密货币术语' : lang === 'es' ? 'Glosario crypto' : 'Crypto Glossary',
    inLanguage: lang,
    hasDefinedTerm: terms.slice(0, 20).map((t) => ({
      '@type': 'DefinedTerm',
      name: t.term,
      description: t.definition,
    })),
  };
}

/** BreadcrumbList JSON-LD */
export function buildBreadcrumbJsonLd(
  lang: SupportedLang,
  slug: string,
  title: string
): object {
  const homeText = UI_TEXT[lang]?.home || 'Home';

  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: homeText,
        item: `${SITE_URL}/${lang}`,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: title,
        item: buildCanonicalUrl(lang, slug),
      },
    ],
  };
}

/** Organization JSON-LD（E-E-A-T 权威性信号） */
export function buildOrganizationJsonLd(): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: '币易家 Biyijia',
    url: SITE_URL,
    logo: {
      '@type': 'ImageObject',
      url: `${SITE_URL}/favicon.svg`,
    },
    description: '币易家（biyijia.com）— 专业加密货币教育平台，提供交易所教程、区块链指南与数字资产评测。',
    foundingDate: '2024',
    sameAs: [],
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer support',
      email: 'contact@biyijia.com',
      availableLanguage: ['Chinese', 'English', 'Spanish'],
    },
    publishingPrinciples: `${SITE_URL}/en/page/editorial-policy`,
  };
}

/** WebSite JSON-LD（用于首页） */
export function buildWebSiteJsonLd(): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: '币易家 Biyijia',
    url: SITE_URL,
    description: '币易家（biyijia.com）— 专业加密货币教育平台，提供交易所教程、区块链指南与数字资产评测。',
    inLanguage: ['zh', 'es', 'en'],
    publisher: buildOrganizationJsonLd(),
    potentialAction: {
      '@type': 'SearchAction',
      target: `${SITE_URL}/en/?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  };
}

/** FAQPage JSON-LD（从 HTML 中提取 FAQ 区块时使用） */
export function buildFaqJsonLd(
  faqs: Array<{ question: string; answer: string }>
): object | null {
  if (faqs.length === 0) return null;

  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };
}

/** Author ProfilePage JSON-LD（E-E-A-T 作者权威性） */
export function buildAuthorJsonLd(
  author: { name: string; slug: string; bio: string | null; profile_image: string | null; url: string },
  lang: SupportedLang,
  articleCount: number
): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'ProfilePage',
    mainEntity: {
      '@type': 'Person',
      name: author.name,
      url: `${SITE_URL}/${lang}/author/${author.slug}`,
      image: author.profile_image || undefined,
      description: author.bio || undefined,
      jobTitle: lang === 'zh' ? '加密货币分析师' : lang === 'es' ? 'Analista de criptomonedas' : 'Crypto Analyst',
      worksFor: {
        '@type': 'Organization',
        name: '币易家 Biyijia',
        url: SITE_URL,
      },
    },
    inLanguage: lang,
  };
}

/** 通用 Hub 页面面包屑 JSON-LD */
export function buildHubBreadcrumbJsonLd(
  lang: SupportedLang,
  hubSlug: string,
  hubTitle: string
): object {
  const homeText = UI_TEXT[lang]?.home || 'Home';

  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: homeText,
        item: `${SITE_URL}/${lang}`,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: hubTitle,
        item: `${SITE_URL}/${lang}/${hubSlug}`,
      },
    ],
  };
}

// --------------------------------------------------
// 辅助函数
// --------------------------------------------------

/** 从 HTML 生成 excerpt（去掉标签，截断到 160 字符） */
export function generateExcerptFromHtml(html: string, maxLen: number = 160): string {
  const text = html
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen).replace(/\s+\S*$/, '') + '…';
}

/** 估算阅读时长（分钟） */
export function estimateReadingTime(html: string, lang: SupportedLang): number {
  const text = html.replace(/<[^>]*>/g, '');
  // 中文按字符数计算（约 400 字/分钟），其他按词数（约 200 词/分钟）
  if (lang === 'zh') {
    return Math.max(1, Math.ceil(text.length / 400));
  }
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(wordCount / 200));
}

/** 从文章 HTML 中尝试提取 FAQ 数据 */
export function extractFaqsFromHtml(
  html: string
): Array<{ question: string; answer: string }> {
  const faqs: Array<{ question: string; answer: string }> = [];

  // 匹配 <h2> 或 <h3> 中包含 "?" 的标题及其后续内容
  const pattern = /<h[23][^>]*>(.*?\?.*?)<\/h[23]>([\s\S]*?)(?=<h[23]|$)/gi;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(html)) !== null) {
    const question = match[1].replace(/<[^>]*>/g, '').trim();
    const answer = match[2].replace(/<[^>]*>/g, '').trim();
    if (question && answer) {
      faqs.push({ question, answer: answer.slice(0, 500) });
    }
  }

  return faqs;
}

/** 格式化日期为本地格式 */
export function formatDate(dateStr: string, lang: SupportedLang): string {
  try {
    const localeMap: Record<SupportedLang, string> = {
      zh: 'zh-CN',
      es: 'es-VE',
      en: 'en-US',
    };
    return new Date(dateStr).toLocaleDateString(localeMap[lang], {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}
