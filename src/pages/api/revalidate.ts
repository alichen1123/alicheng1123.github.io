/**
 * ============================================
 * Ghost Webhook → 缓存失效 Endpoint
 * ============================================
 *
 * Ghost 发布/更新文章时调用此 endpoint。
 * 当前策略：依赖 stale-while-revalidate 自动过期（10分钟）。
 * 后续可接入 Vercel Purge API 实现即时清缓存。
 *
 * Ghost Webhook 配置：
 *   URL: https://biyijia.com/api/revalidate
 *   Secret: 与 GHOST_WEBHOOK_SECRET 环境变量相同
 *   Event: 选择 "Post published" 和 "Post updated"
 *
 * Ghost 会在 header 中发送：
 *   x-ghost-signature: sha256=HMAC_HASH, t=TIMESTAMP
 */
import type { APIRoute } from 'astro';
import { GHOST_WEBHOOK_SECRET, SUPPORTED_LANGS, SITE_URL } from '../../lib/env';

// 简单防滥用：记录最近请求时间
let lastRequestTime = 0;
const MIN_INTERVAL_MS = 5000; // 最少 5 秒间隔

export const POST: APIRoute = async ({ request }) => {
  // 1. 防滥用
  const now = Date.now();
  if (now - lastRequestTime < MIN_INTERVAL_MS) {
    return new Response(JSON.stringify({ error: 'Too many requests' }), {
      status: 429,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  lastRequestTime = now;

  // 2. 校验 webhook 密钥
  const signature = request.headers.get('x-ghost-signature') || '';
  const isValid = await verifyGhostSignature(signature, request);
  if (!isValid) {
    return new Response(JSON.stringify({ error: 'Invalid signature' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // 3. 解析请求体
  let body: Record<string, unknown>;
  try {
    body = await request.json() as Record<string, unknown>;
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // 4. 提取受影响的 slug
  const post = extractPost(body);
  const affectedPaths: string[] = [];

  if (post?.slug) {
    for (const lang of SUPPORTED_LANGS) {
      affectedPaths.push(`/${lang}/${post.slug}`);
    }
  }

  // 也清 sitemap 缓存
  affectedPaths.push('/sitemap.xml');

  // 5. 缓存失效
  // 当前策略：只记录日志，依赖 stale-while-revalidate 自动过期
  // 后续可在此处调用 Vercel Purge API
  console.log(`[revalidate] Ghost webhook received. Affected paths:`, affectedPaths);

  // ---- 后续可启用：Vercel On-Demand Revalidation ----
  // 需要 Vercel Pro/Enterprise + VERCEL_REVALIDATE_TOKEN 环境变量
  // for (const path of affectedPaths) {
  //   await fetch(`${SITE_URL}${path}`, {
  //     headers: { 'x-vercel-revalidate': process.env.VERCEL_REVALIDATE_TOKEN || '' },
  //   });
  // }

  return new Response(
    JSON.stringify({
      success: true,
      message: 'Webhook received',
      affectedPaths,
    }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      },
    }
  );
};

// --------------------------------------------------
// Ghost Signature 验证
// Ghost 发送格式：sha256=HMAC_HEX, t=TIMESTAMP
// --------------------------------------------------

async function verifyGhostSignature(
  signatureHeader: string,
  request: Request
): Promise<boolean> {
  if (!GHOST_WEBHOOK_SECRET) {
    // 如果没配置 secret，跳过校验（开发环境）
    console.warn('[revalidate] GHOST_WEBHOOK_SECRET not set, skipping verification');
    return true;
  }

  if (!signatureHeader) {
    return false;
  }

  try {
    // 解析 signature header
    const parts = signatureHeader.split(', ');
    const sigPart = parts.find((p) => p.startsWith('sha256='));
    const tsPart = parts.find((p) => p.startsWith('t='));

    if (!sigPart || !tsPart) return false;

    const receivedSig = sigPart.replace('sha256=', '');
    const timestamp = tsPart.replace('t=', '');

    // 检查时间戳是否在 5 分钟内
    const tsNum = parseInt(timestamp, 10);
    if (isNaN(tsNum) || Math.abs(Date.now() - tsNum) > 300000) {
      return false;
    }

    // 计算 HMAC（使用 Web Crypto API，Vercel 支持）
    const body = await request.clone().text();
    const message = `${body}${timestamp}`;

    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(GHOST_WEBHOOK_SECRET),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(message));
    const hexSig = Array.from(new Uint8Array(sig))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    return hexSig === receivedSig;
  } catch (err) {
    console.error('[revalidate] Signature verification error:', err);
    return false;
  }
}

// --------------------------------------------------
// 从 webhook body 提取文章信息
// --------------------------------------------------

function extractPost(body: Record<string, unknown>): { slug: string } | null {
  // Ghost webhook body 结构：
  // { post: { current: { slug, ... } } }
  const postData = body?.post as Record<string, unknown> | undefined;
  const current = postData?.current as Record<string, unknown> | undefined;

  if (current?.slug && typeof current.slug === 'string') {
    return { slug: current.slug };
  }

  return null;
}
