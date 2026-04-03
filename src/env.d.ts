/// <reference path="../.astro/types.d.ts" />

/**
 * Astro.locals 类型定义
 * middleware 会在每次请求时注入这些数据
 */
declare namespace App {
  interface Locals {
    /** 联盟分流数据，由 middleware 根据访客国家注入 */
    affiliate: {
      binanceUrl: string;
      showApk: boolean;
      apkUrl: string;
      inviteCode: string;
      ctaText: string;
      ctaSubtext: string;
      countryCode: string;
      isCN: boolean;
    };
  }
}
