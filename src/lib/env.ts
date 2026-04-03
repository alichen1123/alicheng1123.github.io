/**
 * ============================================
 * 全站配置与环境变量
 * ============================================
 * 后续需要修改联盟链接、文案、语言等配置，只需改这个文件。
 */

// --------------------------------------------------
// 环境变量读取与校验
// --------------------------------------------------

function requireEnv(name: string): string {
  const value = import.meta.env[name] ?? process.env[name];
  if (!value) {
    // 本地开发时打印警告而不是崩溃，方便你逐步配置
    console.warn(`⚠️  缺少环境变量: ${name}，请在 .env 文件中设置`);
    return '';
  }
  return value;
}

function optionalEnv(name: string, fallback: string): string {
  return import.meta.env[name] ?? process.env[name] ?? fallback;
}

// --------------------------------------------------
// Ghost CMS 配置
// --------------------------------------------------

export const GHOST_API_URL = requireEnv('GHOST_API_URL');
export const GHOST_CONTENT_API_KEY = requireEnv('GHOST_CONTENT_API_KEY');
export const GHOST_WEBHOOK_SECRET = requireEnv('GHOST_WEBHOOK_SECRET');

// --------------------------------------------------
// 站点基础配置
// --------------------------------------------------

export const SITE_URL = requireEnv('SITE_URL');

// --------------------------------------------------
// 【后续可修改】支持的语言列表
// 只需在这里增删语言，其他地方会自动适配
// --------------------------------------------------

export const SUPPORTED_LANGS = ['zh', 'es', 'en'] as const;
export type SupportedLang = (typeof SUPPORTED_LANGS)[number];
export const DEFAULT_LANG: SupportedLang = 'en';
export const FALLBACK_LANG: SupportedLang = 'en';

export function isValidLang(lang: string): lang is SupportedLang {
  return (SUPPORTED_LANGS as readonly string[]).includes(lang);
}

// --------------------------------------------------
// 【后续可修改】Ghost 多语言 tag 前缀
// 当前方案：internal tag #zh / #es / #en
// Ghost API filter 中写作 hash-zh / hash-es / hash-en
// 如果以后换方案，改这里就行
// --------------------------------------------------

export const GHOST_LANG_TAG_PREFIX = 'hash-';

// --------------------------------------------------
// 【后续可修改】Binance 联盟配置
// --------------------------------------------------

export const BINANCE_INVITE_CODE = optionalEnv('BINANCE_INVITE_CODE', 'B2345');
export const BINANCE_GLOBAL_URL = optionalEnv(
  'BINANCE_GLOBAL_URL',
  'https://www.binance.com/en/register?ref=B2345'
);
export const BINANCE_CN_URL = optionalEnv(
  'BINANCE_CN_URL',
  'https://www.binance.com/zh-CN/download?ref=B2345'
);
export const BINANCE_CN_APK_URL = optionalEnv(
  'BINANCE_CN_APK_URL',
  'https://download.binance.com/app/binance.apk'
);

// --------------------------------------------------
// 【后续可修改】联盟 CTA 文案（按语言）
// --------------------------------------------------

export const AFFILIATE_CTA: Record<SupportedLang, { text: string; subtext: string }> = {
  zh: {
    text: '立即注册币安',
    subtext: '使用邀请码 B2345 享手续费返佣',
  },
  es: {
    text: 'Regístrate en Binance',
    subtext: 'Usa el código B2345 para obtener descuentos',
  },
  en: {
    text: 'Sign up on Binance',
    subtext: 'Use referral code B2345 for fee discounts',
  },
};

// --------------------------------------------------
// 【后续可修改】促销活动配置
// 修改这里即可全站更新活动信息
// --------------------------------------------------

export interface PromoItem {
  /** 活动标签 */
  badge: Record<SupportedLang, string>;
  /** 活动标题 */
  title: Record<SupportedLang, string>;
  /** 活动描述 */
  desc: Record<SupportedLang, string>;
  /** 是否显示 */
  active: boolean;
}

export const PROMO_CONFIG: Record<SupportedLang, {
  /** 底部悬浮条副标题 */
  barHighlight: string;
  /** 文中 CTA 顶部小标签 */
  inlineBadge: string;
  /** 底部 CTA 利益点列表 */
  benefits: string[];
  /** 用户数量（社会认同） */
  userCount: string;
}> = {
  zh: {
    barHighlight: '限时活动：新用户注册即享 100 USDT 交易体验金',
    inlineBadge: '2026 专属福利',
    benefits: [
      '注册即领 100 USDT 体验金',
      '现货交易手续费低至 0.1%',
      '邀请码 B2345 额外返佣 20%',
      '全球 2 亿+ 用户的选择',
    ],
    userCount: '2 亿+',
  },
  es: {
    barHighlight: 'Oferta: Nuevos usuarios obtienen 100 USDT de bono',
    inlineBadge: 'Oferta 2026',
    benefits: [
      'Bono de 100 USDT al registrarte',
      'Comisiones desde 0.1%',
      'Código B2345: 20% extra de descuento',
      'Más de 200M usuarios en el mundo',
    ],
    userCount: '200M+',
  },
  en: {
    barHighlight: 'Limited offer: New users get 100 USDT trading bonus',
    inlineBadge: '2026 Exclusive',
    benefits: [
      '100 USDT welcome bonus for new users',
      'Spot trading fees as low as 0.1%',
      'Code B2345: extra 20% fee kickback',
      'Trusted by 200M+ users worldwide',
    ],
    userCount: '200M+',
  },
};

export const PROMOS: PromoItem[] = [
  {
    badge: { zh: '热门', es: 'Popular', en: 'Hot' },
    title: {
      zh: '新用户专享 100 USDT 体验金',
      es: '100 USDT de bono para nuevos usuarios',
      en: '100 USDT Welcome Bonus for New Users',
    },
    desc: {
      zh: '注册并完成身份认证，即可领取。',
      es: 'Regístrate y verifica tu identidad para reclamar.',
      en: 'Register and complete KYC to claim.',
    },
    active: true,
  },
  {
    badge: { zh: '限时', es: 'Limitado', en: 'Limited' },
    title: {
      zh: '合约交易 0 手续费（首 30 天）',
      es: '0 comisiones en futuros (primeros 30 días)',
      en: 'Zero-Fee Futures Trading (First 30 Days)',
    },
    desc: {
      zh: '使用邀请码 B2345 注册，合约手续费全免。',
      es: 'Usa el código B2345, sin comisiones en futuros.',
      en: 'Use code B2345, futures trading fees waived.',
    },
    active: true,
  },
  {
    badge: { zh: '奖励', es: 'Recompensa', en: 'Reward' },
    title: {
      zh: '充值 & 交易赢最高 600 USDT',
      es: 'Deposita y opera para ganar hasta 600 USDT',
      en: 'Deposit & Trade to Earn Up to 600 USDT',
    },
    desc: {
      zh: '首次充值 + 交易即可解锁阶梯奖励。',
      es: 'Primer depósito + trading desbloquea recompensas.',
      en: 'First deposit + trade unlocks tiered rewards.',
    },
    active: true,
  },
];

// --------------------------------------------------
// 【后续可修改】AI 翻译配置
// --------------------------------------------------

export const AI_API_URL = optionalEnv('AI_API_URL', 'https://backendai.internxt.com/');
export const AI_API_KEY = optionalEnv('AI_API_KEY', '');
export const AI_MODEL = optionalEnv('AI_MODEL', 'gpt-oss-120b');

// --------------------------------------------------
// 【后续可修改】缓存 TTL（秒）
// --------------------------------------------------

export const CACHE_TTL = {
  /** 文章页 CDN 缓存：10 分钟 */
  articleSMaxAge: 600,
  /** 文章页 stale-while-revalidate：24 小时 */
  articleStale: 86400,
  /** 首页 CDN 缓存：5 分钟 */
  homeSMaxAge: 300,
  /** sitemap CDN 缓存：1 小时 */
  sitemapSMaxAge: 3600,
  /** robots.txt CDN 缓存：1 天 */
  robotsSMaxAge: 86400,
};

// --------------------------------------------------
// 【后续可修改】Sitemap 分片大小
// 每个 sitemap 文件最多包含多少个 URL
// --------------------------------------------------

export const SITEMAP_PAGE_SIZE = 5000;

// --------------------------------------------------
// 【后续可修改】列表页每页文章数
// --------------------------------------------------

export const LIST_PAGE_SIZE = 30;

// --------------------------------------------------
// 【后续可修改】主导航菜单
// 每个 item 有 label（按语言）和 href（用 {lang} 占位符）
// 支持二级下拉菜单（children）
// 后续增减栏目只需改这里
// --------------------------------------------------

export interface NavItem {
  id: string;
  label: Record<SupportedLang, string>;
  /** 每个语言对应的 Ghost 文章 slug（不同语言 slug 不同） */
  href?: Record<SupportedLang, string>;
  children?: NavItem[];
  /** 是否高亮显示为 CTA 按钮 */
  isCta?: boolean;
}

export const NAV_ITEMS: NavItem[] = [

  // ① 评测 — tag: review / exchange-review / wallet-review / tool-review
  {
    id: 'reviews',
    label: { zh: '评测', es: 'Reseñas', en: 'Reviews' },
    children: [
      {
        id: 'review-all',
        label: { zh: '全部评测', es: 'Todas las reseñas', en: 'All Reviews' },
        href: { zh: '/zh/tag/review', es: '/es/tag/review', en: '/en/tag/review' },
      },
      {
        id: 'exchange-review',
        label: { zh: '交易所评测', es: 'Reseñas de exchanges', en: 'Exchange Reviews' },
        href: { zh: '/zh/tag/exchange-review', es: '/es/tag/exchange-review', en: '/en/tag/exchange-review' },
      },
      {
        id: 'wallet-review',
        label: { zh: '钱包评测', es: 'Reseñas de wallets', en: 'Wallet Reviews' },
        href: { zh: '/zh/tag/wallet-review', es: '/es/tag/wallet-review', en: '/en/tag/wallet-review' },
      },
      {
        id: 'tool-review',
        label: { zh: '工具评测', es: 'Reseñas de herramientas', en: 'Tool Reviews' },
        href: { zh: '/zh/tag/tool-review', es: '/es/tag/tool-review', en: '/en/tag/tool-review' },
      },
    ],
  },

  // ② 教程 — tag: tutorial / buy-crypto / exchange-guide / beginner
  {
    id: 'guides',
    label: { zh: '教程', es: 'Guías', en: 'Guides' },
    children: [
      {
        id: 'tutorial-all',
        label: { zh: '全部教程', es: 'Todos los tutoriales', en: 'All Guides' },
        href: { zh: '/zh/tag/tutorial', es: '/es/tag/tutorial', en: '/en/tag/tutorial' },
      },
      {
        id: 'buy-crypto',
        label: { zh: '买币教程', es: 'Cómo comprar cripto', en: 'How to Buy Crypto' },
        href: { zh: '/zh/tag/buy-crypto', es: '/es/tag/buy-crypto', en: '/en/tag/buy-crypto' },
      },
      {
        id: 'exchange-guide',
        label: { zh: '交易所教程', es: 'Tutoriales de exchanges', en: 'Exchange Guides' },
        href: { zh: '/zh/tag/exchange-guide', es: '/es/tag/exchange-guide', en: '/en/tag/exchange-guide' },
      },
      {
        id: 'beginner',
        label: { zh: '新手入门', es: 'Para principiantes', en: 'Beginner Guides' },
        href: { zh: '/zh/tag/beginner', es: '/es/tag/beginner', en: '/en/tag/beginner' },
      },
    ],
  },

  // ③ 币种 — tag: coin / bitcoin / ethereum / solana / meme / ai-token / price-prediction
  {
    id: 'coins',
    label: { zh: '币种', es: 'Monedas', en: 'Coins' },
    children: [
      {
        id: 'coin-all',
        label: { zh: '全部币种', es: 'Todas las monedas', en: 'All Coins' },
        href: { zh: '/zh/tag/coin', es: '/es/tag/coin', en: '/en/tag/coin' },
      },
      {
        id: 'bitcoin',
        label: { zh: '比特币 BTC', es: 'Bitcoin BTC', en: 'Bitcoin BTC' },
        href: { zh: '/zh/tag/bitcoin', es: '/es/tag/bitcoin', en: '/en/tag/bitcoin' },
      },
      {
        id: 'ethereum',
        label: { zh: '以太坊 ETH', es: 'Ethereum ETH', en: 'Ethereum ETH' },
        href: { zh: '/zh/tag/ethereum', es: '/es/tag/ethereum', en: '/en/tag/ethereum' },
      },
      {
        id: 'meme',
        label: { zh: 'Meme 币', es: 'Meme Coins', en: 'Meme Coins' },
        href: { zh: '/zh/tag/meme', es: '/es/tag/meme', en: '/en/tag/meme' },
      },
      {
        id: 'ai-token',
        label: { zh: 'AI 代币', es: 'Tokens IA', en: 'AI Tokens' },
        href: { zh: '/zh/tag/ai-token', es: '/es/tag/ai-token', en: '/en/tag/ai-token' },
      },
      {
        id: 'price-prediction',
        label: { zh: '价格预测', es: 'Predicción de precios', en: 'Price Predictions' },
        href: { zh: '/zh/tag/price-prediction', es: '/es/tag/price-prediction', en: '/en/tag/price-prediction' },
      },
    ],
  },

  // ④ 资讯 — tag: altcoins / meme / defi / exchanges（无比特币资讯和监管政策）
  {
    id: 'news',
    label: { zh: '资讯', es: 'Noticias', en: 'News' },
    children: [
      {
        id: 'news-altcoins',
        label: { zh: '山寨币', es: 'Altcoins', en: 'Altcoins' },
        href: { zh: '/zh/tag/altcoins', es: '/es/tag/altcoins', en: '/en/tag/altcoins' },
      },
      {
        id: 'news-meme',
        label: { zh: 'Meme 币', es: 'Meme Coins', en: 'Meme Coins' },
        href: { zh: '/zh/tag/meme', es: '/es/tag/meme', en: '/en/tag/meme' },
      },
      {
        id: 'news-defi',
        label: { zh: 'DeFi & 链上', es: 'DeFi & OnChain', en: 'DeFi & On-Chain' },
        href: { zh: '/zh/tag/defi', es: '/es/tag/defi', en: '/en/tag/defi' },
      },
      {
        id: 'news-exchanges',
        label: { zh: '交易所动态', es: 'Noticias de exchanges', en: 'Exchange News' },
        href: { zh: '/zh/tag/exchanges', es: '/es/tag/exchanges', en: '/en/tag/exchanges' },
      },
    ],
  },

  // ⑤ 优惠 — tag: deal
  {
    id: 'deals',
    label: { zh: '优惠', es: 'Ofertas', en: 'Deals' },
    children: [
      {
        id: 'deal-all',
        label: { zh: '全部优惠', es: 'Todas las ofertas', en: 'All Deals' },
        href: { zh: '/zh/tag/deal', es: '/es/tag/deal', en: '/en/tag/deal' },
      },
      {
        id: 'deal-new-user',
        label: { zh: '新人专属', es: 'Nuevos usuarios', en: 'New User Offers' },
        href: { zh: '/zh/tag/new-user-deal', es: '/es/tag/new-user-deal', en: '/en/tag/new-user-deal' },
      },
      {
        id: 'deal-binance',
        label: { zh: '币安优惠', es: 'Ofertas Binance', en: 'Binance Offers' },
        href: { zh: '/zh/tag/binance-deal', es: '/es/tag/binance-deal', en: '/en/tag/binance-deal' },
      },
      {
        id: 'deal-okx',
        label: { zh: 'OKX 优惠', es: 'Ofertas OKX', en: 'OKX Offers' },
        href: { zh: '/zh/tag/okx-deal', es: '/es/tag/okx-deal', en: '/en/tag/okx-deal' },
      },
      {
        id: 'deal-cashback',
        label: { zh: '返佣对比', es: 'Comparar cashback', en: 'Cashback Compare' },
        href: { zh: '/zh/tag/cashback', es: '/es/tag/cashback', en: '/en/tag/cashback' },
      },
    ],
  },

  // CTA 按钮
  {
    id: 'binance-cta',
    label: { zh: '注册币安', es: 'Binance', en: 'Binance' },
    isCta: true,
  },
];

export const UI_TEXT: Record<SupportedLang, Record<string, string>> = {
  zh: {
    home: '首页',
    readingTime: '分钟阅读',
    keyTakeaways: '重点结论',
    whatThisCovers: '本文涵盖',
    conclusion: '总结',
    faq: '常见问题',
    relatedPosts: '相关文章',
    publishedAt: '发布于',
    updatedAt: '更新于',
    by: '作者',
    notFound: '页面未找到',
    notFoundDesc: '您访问的页面不存在',
    backHome: '返回首页',
    apkDownload: '下载币安 APK',
    closeBtn: '关闭',
    page: '第',
    totalArticles: '篇文章',
    categories: '分类标签',
    recentArticles: '最近内容',
    viewAllArticles: '阅读更多内容，狠戳这里',
    tagPageTitle: '标签',
    // 频道页
    tutorials: '教程中心',
    tutorialsDesc: '从入门到进阶，手把手带你玩转加密货币',
    news: '资讯频道',
    newsDesc: '最新加密货币市场动态、监管政策与行业热点',
    reviews: '评测对比',
    reviewsDesc: '交易所、钱包、DeFi 协议的真实评测与对比',
    glossary: '词汇表',
    glossaryDesc: '区块链与加密货币核心术语详解',
    about: '关于我们',
    // 难度标签
    beginner: '新手入门',
    intermediate: '进阶操作',
    advanced: '高级策略',
    allLevels: '全部难度',
    // Newsletter
    newsletterTitle: '订阅加密资讯',
    newsletterDesc: '每周精选加密货币教程、市场分析与独家优惠',
    newsletterPlaceholder: '输入邮箱地址',
    newsletterBtn: '订阅',
    newsletterSuccess: '订阅成功！请查收确认邮件。',
    // TOC
    tableOfContents: '目录',
    // 法律页面
    disclaimer: '免责声明',
    privacyPolicy: '隐私政策',
    cookiePolicy: 'Cookie 政策',
    editorialPolicy: '编辑政策',
    // Footer
    legalLinks: '法律信息',
    quickLinks: '快速链接',
    followUs: '关注我们',
    searchPlaceholder: '搜索文章...',
    searchBtn: '搜索',
    searchTitle: '搜索',
    searchNoResults: '未找到相关文章',
    searchResultCount: '找到 {count} 篇相关文章',
  },
  es: {
    home: 'Inicio',
    readingTime: 'min de lectura',
    keyTakeaways: 'Puntos clave',
    whatThisCovers: 'Lo que cubre este artículo',
    conclusion: 'Conclusión',
    faq: 'Preguntas frecuentes',
    relatedPosts: 'Artículos relacionados',
    publishedAt: 'Publicado el',
    updatedAt: 'Actualizado el',
    by: 'Por',
    notFound: 'Página no encontrada',
    notFoundDesc: 'La página que buscas no existe',
    backHome: 'Volver al inicio',
    apkDownload: 'Descargar APK de Binance',
    closeBtn: 'Cerrar',
    page: 'Página',
    totalArticles: 'artículos',
    categories: 'Categorías',
    recentArticles: 'Contenido reciente',
    viewAllArticles: 'Ver más artículos',
    tagPageTitle: 'Etiqueta',
    tutorials: 'Tutoriales',
    tutorialsDesc: 'Guías paso a paso para dominar las criptomonedas',
    news: 'Noticias',
    newsDesc: 'Últimas noticias del mercado cripto, regulaciones y tendencias',
    reviews: 'Reseñas',
    reviewsDesc: 'Reseñas y comparaciones reales de exchanges, wallets y DeFi',
    glossary: 'Glosario',
    glossaryDesc: 'Términos clave de blockchain y criptomonedas explicados',
    about: 'Sobre nosotros',
    beginner: 'Principiante',
    intermediate: 'Intermedio',
    advanced: 'Avanzado',
    allLevels: 'Todos los niveles',
    newsletterTitle: 'Suscríbete',
    newsletterDesc: 'Tutoriales semanales, análisis de mercado y ofertas exclusivas',
    newsletterPlaceholder: 'Tu correo electrónico',
    newsletterBtn: 'Suscribirse',
    newsletterSuccess: '¡Suscripción exitosa! Revisa tu correo.',
    tableOfContents: 'Contenido',
    disclaimer: 'Aviso legal',
    privacyPolicy: 'Política de privacidad',
    cookiePolicy: 'Política de cookies',
    editorialPolicy: 'Política editorial',
    legalLinks: 'Legal',
    quickLinks: 'Enlaces rápidos',
    followUs: 'Síguenos',
    searchPlaceholder: 'Buscar artículos...',
    searchBtn: 'Buscar',
    searchTitle: 'Buscar',
    searchNoResults: 'No se encontraron artículos',
    searchResultCount: '{count} artículos encontrados',
  },
  en: {
    home: 'Home',
    readingTime: 'min read',
    keyTakeaways: 'Key Takeaways',
    whatThisCovers: 'What this article covers',
    conclusion: 'Conclusion',
    faq: 'FAQ',
    relatedPosts: 'Related Articles',
    publishedAt: 'Published on',
    updatedAt: 'Updated on',
    by: 'By',
    notFound: 'Page Not Found',
    notFoundDesc: 'The page you are looking for does not exist',
    backHome: 'Back to Home',
    apkDownload: 'Download Binance APK',
    closeBtn: 'Close',
    page: 'Page',
    totalArticles: 'articles',
    categories: 'Categories',
    recentArticles: 'Recent Articles',
    viewAllArticles: 'Read more articles',
    tagPageTitle: 'Tag',
    tutorials: 'Tutorials',
    tutorialsDesc: 'Step-by-step guides to master cryptocurrency',
    news: 'News',
    newsDesc: 'Latest crypto market updates, regulations, and industry trends',
    reviews: 'Reviews',
    reviewsDesc: 'Real reviews and comparisons of exchanges, wallets, and DeFi',
    glossary: 'Glossary',
    glossaryDesc: 'Key blockchain and cryptocurrency terms explained',
    about: 'About Us',
    beginner: 'Beginner',
    intermediate: 'Intermediate',
    advanced: 'Advanced',
    allLevels: 'All Levels',
    newsletterTitle: 'Subscribe to Crypto Updates',
    newsletterDesc: 'Weekly tutorials, market analysis, and exclusive offers',
    newsletterPlaceholder: 'Enter your email',
    newsletterBtn: 'Subscribe',
    newsletterSuccess: 'Subscribed! Please check your email for confirmation.',
    tableOfContents: 'Table of Contents',
    disclaimer: 'Disclaimer',
    privacyPolicy: 'Privacy Policy',
    cookiePolicy: 'Cookie Policy',
    editorialPolicy: 'Editorial Policy',
    legalLinks: 'Legal',
    quickLinks: 'Quick Links',
    followUs: 'Follow Us',
    searchPlaceholder: 'Search articles...',
    searchBtn: 'Search',
    searchTitle: 'Search',
    searchNoResults: 'No articles found',
    searchResultCount: '{count} articles found',
  },
};

// --------------------------------------------------
// 【后续可修改】页脚链接配置
// --------------------------------------------------

export const FOOTER_LEGAL_LINKS = [
  { slug: 'disclaimer', labelKey: 'disclaimer' },
  { slug: 'privacy-policy', labelKey: 'privacyPolicy' },
  { slug: 'editorial-policy', labelKey: 'editorialPolicy' },
] as const;

export const FOOTER_QUICK_LINKS = [
  { path: 'tutorials', labelKey: 'tutorials' },
  { path: 'news', labelKey: 'news' },
  { path: 'reviews', labelKey: 'reviews' },
  { path: 'glossary', labelKey: 'glossary' },
] as const;

// --------------------------------------------------
// 【后续可修改】内容类型标签映射
// Ghost 内部标签 → 频道页路由
// --------------------------------------------------

export const CONTENT_TYPE_TAGS: Record<string, string> = {
  'hash-tutorial': 'tutorials',
  'hash-news': 'news',
  'hash-review': 'reviews',
  'hash-glossary': 'glossary',
};

export const DIFFICULTY_TAGS = ['beginner', 'intermediate', 'advanced'] as const;
export type DifficultyLevel = (typeof DIFFICULTY_TAGS)[number];

// --------------------------------------------------
// 【后续可修改】导航专用 tag 黑名单
// 这些 tag 只用于导航过滤，不在侧边栏「分类标签」中显示
// --------------------------------------------------

export const NAV_ONLY_TAGS = new Set([
  // 评测类
  'review', 'exchange-review', 'wallet-review', 'tool-review',
  // 教程类
  'tutorial', 'buy-crypto', 'exchange-guide', 'beginner',
  // 币种类
  'coin', 'bitcoin', 'ethereum', 'meme', 'ai-token', 'price-prediction',
  // 资讯类
  'altcoins', 'defi', 'exchanges',
  // 优惠类
  'deal', 'new-user-deal', 'binance-deal', 'okx-deal', 'cashback',
]);

