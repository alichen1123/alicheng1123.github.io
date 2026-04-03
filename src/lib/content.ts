/**
 * ============================================
 * 内容处理工具
 * ============================================
 * HTML 清洗、GEO 内容区块提取、图片 alt fallback 等
 */

import type { GhostPost } from './ghost';
import type { SupportedLang } from './env';

// --------------------------------------------------
// 安全渲染：基础 HTML 清洗
// 移除 script 标签和 on* 事件属性，保留正常 HTML
// --------------------------------------------------

export function sanitizeHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/\son\w+\s*=\s*["'][^"']*["']/gi, '')
    .replace(/javascript:/gi, '');
}

// --------------------------------------------------
// 图片 alt fallback
// 给没有 alt 属性的 <img> 添加 fallback alt
// --------------------------------------------------

export function addImageAltFallback(html: string, fallbackAlt: string): string {
  // 匹配没有 alt 属性的 img 标签
  return html.replace(
    /<img(?![^>]*alt=)([^>]*)>/gi,
    `<img alt="${escapeHtmlAttr(fallbackAlt)}"$1>`
  );
}

function escapeHtmlAttr(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

// --------------------------------------------------
// GEO 内容区块提取
// 从文章 HTML 中提取特殊区块（Key Takeaways 等）
// --------------------------------------------------

// --------------------------------------------------
// GEO 内容类型检测（用于自动生成对应的结构化数据）
// --------------------------------------------------

export type ContentType = 'article' | 'howto' | 'review' | 'glossary' | 'news';

export interface HowToStep {
  name: string;
  text: string;
  image?: string;
}

export interface ReviewData {
  itemName: string;
  ratingValue: number;
  bestRating: number;
  worstRating: number;
  reviewBody: string;
}

export interface DefinedTermData {
  term: string;
  definition: string;
}

export interface ContentBlocks {
  /** 页面顶部摘要（custom_excerpt 或自动生成） */
  summary: string;
  /** Key Takeaways 列表（从 HTML 中提取或自动生成） */
  keyTakeaways: string[];
  /** 文章大纲（从 H2 标题提取） */
  outline: string[];
  /** 主体 HTML（清洗后） */
  bodyHtml: string;
  /** FAQ 列表（从 HTML 提取） */
  faqs: Array<{ question: string; answer: string }>;
  /** 是否有结论区块 */
  hasConclusion: boolean;
  /** GEO: 内容类型（用于选择 JSON-LD 类型） */
  contentType: ContentType;
  /** GEO: HowTo 步骤（教程类内容） */
  howToSteps: HowToStep[];
  /** GEO: 评测数据（评测类内容） */
  reviewData: ReviewData | null;
  /** GEO: 术语定义列表（术语类内容） */
  definedTerms: DefinedTermData[];
  /** GEO: 统计数据/引用（AI 可引用的关键数据） */
  statistics: string[];
  /** GEO: 纯文本字数 */
  wordCount: number;
  /** GEO: 文章主题分类 */
  articleSection: string;
}

export function extractContentBlocks(post: GhostPost, lang: SupportedLang): ContentBlocks {
  let bodyHtml = sanitizeHtml(post.html);
  bodyHtml = addImageAltFallback(bodyHtml, post.title);
  // 把 Ghost 源站图片域名替换为 img.biyijia.com，让搜索引擎收录图片归属于 biyijia.com
  bodyHtml = bodyHtml.replace(/https:\/\/474y\.com/g, 'https://img.biyijia.com');

  const plainText = bodyHtml.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();

  // 提取摘要
  const summary =
    post.custom_excerpt || generatePlainExcerpt(bodyHtml, 200);

  // 提取 Key Takeaways
  const keyTakeaways = extractKeyTakeaways(bodyHtml, lang);

  // 提取 H2 大纲
  const outline = extractH2Outline(bodyHtml);

  // 提取 FAQ
  const faqs = extractFaqs(bodyHtml);

  // 检测结论
  const hasConclusion = detectConclusion(bodyHtml, lang);

  // GEO: 检测内容类型
  const contentType = detectContentType(post, bodyHtml, lang);

  // GEO: 提取 HowTo 步骤
  const howToSteps = contentType === 'howto' ? extractHowToSteps(bodyHtml, lang) : [];

  // GEO: 提取评测数据
  const reviewData = contentType === 'review' ? extractReviewData(post, bodyHtml, lang) : null;

  // GEO: 提取术语定义
  const definedTerms = extractDefinedTerms(bodyHtml);

  // GEO: 提取关键统计数据
  const statistics = extractStatistics(bodyHtml);

  // GEO: 字数统计
  const wordCount = lang === 'zh'
    ? plainText.length
    : plainText.split(/\s+/).filter(Boolean).length;

  // GEO: 文章分类
  const articleSection = detectArticleSection(post, lang);

  return {
    summary,
    keyTakeaways,
    outline,
    bodyHtml,
    faqs,
    hasConclusion,
    contentType,
    howToSteps,
    reviewData,
    definedTerms,
    statistics,
    wordCount,
    articleSection,
  };
}

// --------------------------------------------------
// 辅助提取函数
// --------------------------------------------------

function generatePlainExcerpt(html: string, maxLen: number): string {
  const text = html
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen).replace(/\s+\S*$/, '') + '…';
}

function extractKeyTakeaways(html: string, lang: SupportedLang): string[] {
  // 尝试找到 Key Takeaways 区块（通常是一个带特定标题的列表）
  const markers: Record<SupportedLang, string[]> = {
    zh: ['重点结论', '核心要点', 'key takeaway'],
    es: ['puntos clave', 'conclusiones clave', 'key takeaway'],
    en: ['key takeaway', 'key point', 'main takeaway'],
  };

  const langMarkers = markers[lang] || markers.en;

  for (const marker of langMarkers) {
    const pattern = new RegExp(
      `<h[23][^>]*>[^<]*${marker}[^<]*</h[23]>\\s*<[uo]l[^>]*>([\\s\\S]*?)</[uo]l>`,
      'i'
    );
    const match = html.match(pattern);
    if (match) {
      const listHtml = match[1];
      const items: string[] = [];
      const liPattern = /<li[^>]*>([\s\S]*?)<\/li>/gi;
      let li: RegExpExecArray | null;
      while ((li = liPattern.exec(listHtml)) !== null) {
        const text = li[1].replace(/<[^>]*>/g, '').trim();
        if (text) items.push(text);
      }
      return items;
    }
  }

  return [];
}

function extractH2Outline(html: string): string[] {
  const titles: string[] = [];
  const pattern = /<h2[^>]*>([\s\S]*?)<\/h2>/gi;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(html)) !== null) {
    const text = match[1].replace(/<[^>]*>/g, '').trim();
    if (text) titles.push(text);
  }
  return titles;
}

function extractFaqs(html: string): Array<{ question: string; answer: string }> {
  const faqs: Array<{ question: string; answer: string }> = [];

  // 策略1（优先）：找到专门的 FAQ 区块标题，提取该区块内的问答对
  const faqSectionMarkers = [
    '常见问答', '常见问题', 'faq', 'preguntas frecuentes',
    'frequently asked', '问答', 'q\\s*&\\s*a',
  ];

  const markerPattern = faqSectionMarkers.join('|');
  const sectionRegex = new RegExp(
    `<h[23][^>]*>[^<]*(${markerPattern})[^<]*</h[23]>([\\s\\S]*?)(?=<h2[^>]*>|$)`,
    'i'
  );
  const sectionMatch = html.match(sectionRegex);

  if (sectionMatch) {
    const faqHtml = sectionMatch[2];
    // 在 FAQ 区块内，提取所有 h3（或 h2）+ 后续段落作为问答对
    const qaPattern = /<h[234][^>]*>([\s\S]*?)<\/h[234]>([\s\S]*?)(?=<h[234][^>]*>|$)/gi;
    let m: RegExpExecArray | null;
    while ((m = qaPattern.exec(faqHtml)) !== null) {
      const question = m[1].replace(/<[^>]*>/g, '').trim();
      const answer = m[2].replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
      if (question && answer && question.length < 200) {
        faqs.push({ question, answer: answer.slice(0, 500) });
      }
    }
    if (faqs.length > 0) return faqs;
  }

  // 策略2（兜底）：只匹配短标题中含 ? 且答案合理长度的 h3 标签
  const fallbackPattern = /<h3[^>]*>([\s\S]*?\?[\s\S]*?)<\/h3>([\s\S]*?)(?=<h[23][^>]*>|$)/gi;
  let match: RegExpExecArray | null;
  while ((match = fallbackPattern.exec(html)) !== null) {
    const question = match[1].replace(/<[^>]*>/g, '').trim();
    const answer = match[2].replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
    // 只取短问题（< 100 字）+ 合理长度答案（> 20 字）
    if (question && answer && question.length < 100 && answer.length > 20) {
      faqs.push({ question, answer: answer.slice(0, 500) });
    }
  }

  return faqs;
}

function detectConclusion(html: string, lang: SupportedLang): boolean {
  const markers: Record<SupportedLang, string[]> = {
    zh: ['总结', '结论', '最后'],
    es: ['conclusión', 'resumen', 'en resumen'],
    en: ['conclusion', 'summary', 'final thought'],
  };

  const langMarkers = markers[lang] || markers.en;
  const lowerHtml = html.toLowerCase();

  return langMarkers.some((m) => lowerHtml.includes(m));
}

// --------------------------------------------------
// GEO: 内容类型检测
// 根据标题、标签、正文关键词判断文章类型
// --------------------------------------------------

function detectContentType(post: GhostPost, html: string, lang: SupportedLang): ContentType {
  const title = post.title.toLowerCase();
  const tagSlugs = post.tags?.map((t) => t.slug.toLowerCase()) ?? [];
  const lowerHtml = html.toLowerCase();

  // 教程/指南类
  const howtoMarkers: Record<SupportedLang, string[]> = {
    zh: ['教程', '怎么', '如何', '步骤', '指南', '方法', '攻略'],
    es: ['cómo', 'guía', 'tutorial', 'paso a paso', 'pasos'],
    en: ['how to', 'guide', 'tutorial', 'step by step', 'step-by-step'],
  };

  const isHowTo = (howtoMarkers[lang] || howtoMarkers.en).some(
    (m) => title.includes(m) || lowerHtml.slice(0, 500).includes(m)
  );
  if (isHowTo) return 'howto';

  // 评测/对比类
  const reviewMarkers: Record<SupportedLang, string[]> = {
    zh: ['评测', '对比', '排名', '推荐', '最佳', 'top'],
    es: ['comparación', 'ranking', 'mejores', 'review', 'top'],
    en: ['review', 'comparison', 'ranking', 'best', 'top', 'vs'],
  };

  const isReview = (reviewMarkers[lang] || reviewMarkers.en).some(
    (m) => title.includes(m)
  );
  if (isReview) return 'review';

  // 术语/词汇类
  const glossaryMarkers: Record<SupportedLang, string[]> = {
    zh: ['词汇', '术语', '科普', '什么是', '是什么'],
    es: ['glosario', 'qué es', 'términos'],
    en: ['glossary', 'what is', 'explained', 'definition'],
  };

  const isGlossary = (glossaryMarkers[lang] || glossaryMarkers.en).some(
    (m) => title.includes(m)
  );
  if (isGlossary) return 'glossary';

  return 'article';
}

// --------------------------------------------------
// GEO: HowTo 步骤提取
// 从有序列表 <ol> 或 "Step N" 格式中提取步骤
// --------------------------------------------------

function extractHowToSteps(html: string, lang: SupportedLang): HowToStep[] {
  const steps: HowToStep[] = [];

  // 策略1：查找带有步骤关键词的 H2/H3 后紧跟的段落
  const stepMarkers: Record<SupportedLang, string> = {
    zh: '(?:步骤|第)\\s*\\d',
    es: '(?:paso|step)\\s*\\d',
    en: '(?:step)\\s*\\d',
  };

  const stepPattern = new RegExp(
    `<h[23][^>]*>([^<]*(?:${stepMarkers[lang] || stepMarkers.en})[^<]*)</h[23]>([\\s\\S]*?)(?=<h[23]|$)`,
    'gi'
  );

  let match: RegExpExecArray | null;
  while ((match = stepPattern.exec(html)) !== null) {
    const name = match[1].replace(/<[^>]*>/g, '').trim();
    const text = match[2].replace(/<[^>]*>/g, '').trim().slice(0, 500);
    // 尝试提取步骤中的图片
    const imgMatch = match[2].match(/<img[^>]*src=["']([^"']+)["']/i);
    if (name && text) {
      steps.push({ name, text, image: imgMatch?.[1] });
    }
  }

  // 策略2：如果没找到步骤标题，查找第一个有序列表
  if (steps.length === 0) {
    const olMatch = html.match(/<ol[^>]*>([\s\S]*?)<\/ol>/i);
    if (olMatch) {
      const liPattern = /<li[^>]*>([\s\S]*?)<\/li>/gi;
      let li: RegExpExecArray | null;
      let stepNum = 1;
      while ((li = liPattern.exec(olMatch[1])) !== null) {
        const text = li[1].replace(/<[^>]*>/g, '').trim();
        if (text && text.length > 10) {
          const shortName = text.length > 80 ? text.slice(0, 80) + '…' : text;
          steps.push({ name: `${lang === 'zh' ? '步骤' : 'Step'} ${stepNum}`, text, });
          stepNum++;
        }
      }
    }
  }

  return steps.slice(0, 20); // 最多 20 步
}

// --------------------------------------------------
// GEO: 评测数据提取
// 从标题和内容中提取评测对象和评分
// --------------------------------------------------

function extractReviewData(post: GhostPost, html: string, lang: SupportedLang): ReviewData | null {
  // 从标题中提取评测对象
  const title = post.title;

  // 尝试匹配评分（如 4.5/5, 8/10, ★★★★☆ 等）
  const ratingPattern = /(\d+\.?\d*)\s*[\/\/]\s*(\d+)/;
  const ratingMatch = html.match(ratingPattern);

  let ratingValue = 4.5;
  let bestRating = 5;

  if (ratingMatch) {
    ratingValue = parseFloat(ratingMatch[1]);
    bestRating = parseInt(ratingMatch[2], 10);
  }

  // 从标题中提取被评测的产品/服务名
  let itemName = title;

  // 去掉常见标题后缀
  const suffixPatterns = [
    /[:\-–—]\s*.+$/,
    /\s+(?:review|评测|评价|comparación|ranking|对比|排名).*/i,
  ];
  for (const p of suffixPatterns) {
    itemName = itemName.replace(p, '').trim();
  }

  const reviewBody = post.custom_excerpt || generatePlainExcerpt(html, 300);

  return {
    itemName: itemName || title,
    ratingValue,
    bestRating,
    worstRating: 1,
    reviewBody,
  };
}

// --------------------------------------------------
// GEO: 术语定义提取
// 从 <strong>Term</strong>: definition 或 <dt>/<dd> 格式中提取
// --------------------------------------------------

function extractDefinedTerms(html: string): DefinedTermData[] {
  const terms: DefinedTermData[] = [];

  // 策略1：<dt>/<dd> 定义列表
  const dlPattern = /<dt[^>]*>([\s\S]*?)<\/dt>\s*<dd[^>]*>([\s\S]*?)<\/dd>/gi;
  let dlMatch: RegExpExecArray | null;
  while ((dlMatch = dlPattern.exec(html)) !== null) {
    const term = dlMatch[1].replace(/<[^>]*>/g, '').trim();
    const def = dlMatch[2].replace(/<[^>]*>/g, '').trim();
    if (term && def && term.length < 100) {
      terms.push({ term, definition: def.slice(0, 500) });
    }
  }

  // 策略2：<strong>Term</strong> — definition / <strong>Term</strong>: definition
  const strongPattern = /<strong>([^<]{2,60})<\/strong>\s*[:\-–—]\s*([^<]{10,})/gi;
  let sMatch: RegExpExecArray | null;
  while ((sMatch = strongPattern.exec(html)) !== null) {
    const term = sMatch[1].trim();
    const def = sMatch[2].trim().slice(0, 500);
    // 避免重复
    if (term && def && !terms.some((t) => t.term === term)) {
      terms.push({ term, definition: def });
    }
  }

  return terms.slice(0, 50);
}

// --------------------------------------------------
// GEO: 统计数据/关键数字提取
// AI 搜索引擎喜欢引用具体的数据和统计
// --------------------------------------------------

function extractStatistics(html: string): string[] {
  const stats: string[] = [];
  const plainText = html.replace(/<[^>]*>/g, '');

  // 匹配包含具体数字 + 单位/百分比的句子片段
  const patterns = [
    /[^.!?]*\d+\.?\d*\s*%[^.!?]*/g,  // 百分比
    /[^.!?]*\$\s*\d[\d,.]*\s*(?:billion|million|万|亿|mil)[^.!?]*/gi,  // 金额
    /[^.!?]*\d[\d,.]*\s*(?:users|用户|usuarios|transactions|交易)[^.!?]*/gi,  // 用户/交易量
  ];

  for (const pattern of patterns) {
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(plainText)) !== null) {
      const stat = match[0].trim();
      if (stat.length > 15 && stat.length < 200 && !stats.includes(stat)) {
        stats.push(stat);
      }
    }
  }

  return stats.slice(0, 10);
}

// --------------------------------------------------
// GEO: 文章分类检测
// 从标签中推断主题分类
// --------------------------------------------------

function detectArticleSection(post: GhostPost, lang: SupportedLang): string {
  const publicTags = post.tags?.filter((t) => t.visibility === 'public') ?? [];

  if (publicTags.length > 0) {
    return publicTags[0].name;
  }

  // 从标题关键词推断
  const title = post.title.toLowerCase();
  const sectionMap: Record<string, Record<SupportedLang, string>> = {
    exchange: { zh: '交易所', es: 'Exchanges', en: 'Exchanges' },
    wallet: { zh: '钱包', es: 'Billeteras', en: 'Wallets' },
    defi: { zh: 'DeFi', es: 'DeFi', en: 'DeFi' },
    bitcoin: { zh: '比特币', es: 'Bitcoin', en: 'Bitcoin' },
    trading: { zh: '交易', es: 'Trading', en: 'Trading' },
  };

  for (const [key, labels] of Object.entries(sectionMap)) {
    if (title.includes(key) || title.includes(labels[lang]?.toLowerCase() || '')) {
      return labels[lang];
    }
  }

  return lang === 'zh' ? '加密货币' : lang === 'es' ? 'Criptomonedas' : 'Cryptocurrency';
}

// --------------------------------------------------
// 自动内部链接：将术语自动链接到词汇表页面
// --------------------------------------------------

/** 术语到链接的映射表（可扩展） */
const GLOSSARY_TERMS: Record<string, Record<SupportedLang, string>> = {
  'Bitcoin': { zh: 'bitcoin-btc-shi-shenme', es: 'que-es-bitcoin-btc', en: 'what-is-bitcoin-btc' },
  'BTC': { zh: 'bitcoin-btc-shi-shenme', es: 'que-es-bitcoin-btc', en: 'what-is-bitcoin-btc' },
  'Ethereum': { zh: 'ethereum-eth-shi-shenme', es: 'que-es-ethereum-eth', en: 'what-is-ethereum-eth' },
  'ETH': { zh: 'ethereum-eth-shi-shenme', es: 'que-es-ethereum-eth', en: 'what-is-ethereum-eth' },
  'USDT': { zh: 'usdt-taidabi-quanmian-jieshao', es: 'que-es-usdt-tether-guia', en: 'what-is-usdt-tether-guide' },
  'DeFi': { zh: 'defi-qu-zhong-xin-hua-jin-rong', es: 'que-es-defi', en: 'what-is-defi' },
  'NFT': { zh: 'nft-shi-shenme', es: 'que-es-nft', en: 'what-is-nft' },
  'Layer2': { zh: 'layer2-shi-shenme', es: 'que-es-layer2', en: 'what-is-layer2' },
  'KYC': { zh: 'kyc-shi-shenme', es: 'que-es-kyc', en: 'what-is-kyc' },
  'P2P': { zh: 'p2p-mai-usdt-jiaocheng-2026', es: 'comprar-usdt-p2p-2026', en: 'buy-usdt-p2p-guide-2026' },
  '比特币': { zh: 'bitcoin-btc-shi-shenme', es: 'que-es-bitcoin-btc', en: 'what-is-bitcoin-btc' },
  '以太坊': { zh: 'ethereum-eth-shi-shenme', es: 'que-es-ethereum-eth', en: 'what-is-ethereum-eth' },
  '泰达币': { zh: 'usdt-taidabi-quanmian-jieshao', es: 'que-es-usdt-tether-guia', en: 'what-is-usdt-tether-guide' },
  '去中心化金融': { zh: 'defi-qu-zhong-xin-hua-jin-rong', es: 'que-es-defi', en: 'what-is-defi' },
};

/**
 * 在文章正文中自动将已知术语替换为内链
 * 每个术语最多链接一次，避免过度内链
 * 只在 <p> 文本中替换，不会破坏已有链接和标签
 */
export function autoLinkGlossaryTerms(html: string, lang: SupportedLang, currentSlug: string): string {
  let result = html;
  const linked = new Set<string>();

  for (const [term, slugs] of Object.entries(GLOSSARY_TERMS)) {
    const targetSlug = slugs[lang] || slugs.en;
    // 不要链接到自身
    if (targetSlug === currentSlug || linked.has(term.toLowerCase())) continue;

    // 只替换第一次出现，且不在已有的 <a> 标签内
    // 使用一个简单但安全的方式：只替换 <p>...</p> 内的文本
    const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = new RegExp(
      `(<p[^>]*>(?:(?!<\\/p>).)*?)\\b(${escapedTerm})\\b`,
      'i'
    );

    if (pattern.test(result) && !linked.has(term.toLowerCase())) {
      result = result.replace(pattern, (match, before, foundTerm) => {
        // 检查是否已在 <a> 标签内
        const lastOpenA = before.lastIndexOf('<a');
        const lastCloseA = before.lastIndexOf('</a>');
        if (lastOpenA > lastCloseA) return match; // 在 <a> 内部，不替换

        linked.add(term.toLowerCase());
        return `${before}<a href="/${lang}/${targetSlug}" class="auto-link" title="${foundTerm}">${foundTerm}</a>`;
      });
    }
  }

  return result;
}

// --------------------------------------------------
// 处理完整文章内容管道
// --------------------------------------------------

export interface ProcessedPost {
  post: GhostPost;
  blocks: ContentBlocks;
  readingTime: number;
}

export function processPostContent(post: GhostPost, lang: SupportedLang): ProcessedPost {
  // 替换特色图片域名
  if (post.feature_image) {
    post.feature_image = post.feature_image.replace(
      /https:\/\/474y\.com/g,
      'https://img.biyijia.com'
    );
  }

  const blocks = extractContentBlocks(post, lang);

  // 注入 H2 heading IDs（用于 TOC 跳转）
  let headingIndex = 0;
  blocks.bodyHtml = blocks.bodyHtml.replace(/<h2([^>]*)>/gi, (match, attrs) => {
    const id = `heading-${headingIndex++}`;
    // 如果已有 id 属性则不覆盖
    if (/id\s*=/i.test(attrs)) return match;
    return `<h2${attrs} id="${id}">`;
  });

  // 阅读时长
  const text = post.html.replace(/<[^>]*>/g, '');
  const readingTime =
    lang === 'zh'
      ? Math.max(1, Math.ceil(text.length / 400))
      : Math.max(1, Math.ceil(text.split(/\s+/).filter(Boolean).length / 200));

  return {
    post,
    blocks,
    readingTime,
  };
}
