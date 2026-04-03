/**
 * ============================================
 * 联盟分流逻辑
 * ============================================
 * 根据访客国家生成对应的联盟数据。
 * 这里只处理 country-based affiliate routing，
 * 与 GEO（Generative Engine Optimization）无关。
 */

import {
  BINANCE_INVITE_CODE,
  BINANCE_GLOBAL_URL,
  BINANCE_CN_URL,
  BINANCE_CN_APK_URL,
  AFFILIATE_CTA,
  type SupportedLang,
} from './env';

// --------------------------------------------------
// 联盟数据类型（与 env.d.ts 中的 Locals 一致）
// --------------------------------------------------

export interface AffiliateData {
  binanceUrl: string;
  showApk: boolean;
  apkUrl: string;
  inviteCode: string;
  ctaText: string;
  ctaSubtext: string;
  countryCode: string;
  isCN: boolean;
}

// --------------------------------------------------
// 根据国家码生成联盟数据
// --------------------------------------------------

export function buildAffiliateData(countryCode: string, lang: SupportedLang): AffiliateData {
  const isCN = countryCode === 'CN';

  // 【后续可修改】可以在这里添加更多国家的特殊规则
  // 比如 VE 用户显示不同的文案等

  const cta = AFFILIATE_CTA[lang] || AFFILIATE_CTA.en;

  return {
    binanceUrl: isCN ? BINANCE_CN_URL : BINANCE_GLOBAL_URL,
    showApk: isCN,
    apkUrl: BINANCE_CN_APK_URL,
    inviteCode: BINANCE_INVITE_CODE,
    ctaText: cta.text,
    ctaSubtext: cta.subtext,
    countryCode,
    isCN,
  };
}

// --------------------------------------------------
// 改写 HTML 中的交易所链接
// 把文章 HTML 中的 Binance 链接替换为带联盟码的版本
// --------------------------------------------------

/** 通用 Binance 域名匹配模式 */
const BINANCE_URL_PATTERN = /https?:\/\/(www\.)?binance\.com[^\s"']*/g;

export function rewriteAffiliateLinks(html: string, affiliate: AffiliateData): string {
  return html.replace(BINANCE_URL_PATTERN, affiliate.binanceUrl);
}
