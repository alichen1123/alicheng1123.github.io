/**
 * 服务端代理：转发 CoinGecko 行情请求
 * 路由：/api/market
 * 解决浏览器直接请求 CoinGecko 的 CORS 问题
 */
import type { APIRoute } from 'astro';

const COINGECKO_URL =
  'https://api.coingecko.com/api/v3/coins/markets' +
  '?vs_currency=usd' +
  '&order=market_cap_desc' +
  '&per_page=100' +
  '&sparkline=false' +
  '&price_change_percentage=24h';

// 简单内存缓存，60 秒内复用同一份数据，避免频繁请求 CoinGecko
let cache: { data: unknown; ts: number } | null = null;
const CACHE_TTL = 60 * 1000; // 60 秒

export const GET: APIRoute = async () => {
  try {
    // 命中缓存直接返回
    if (cache && Date.now() - cache.ts < CACHE_TTL) {
      return new Response(JSON.stringify(cache.data), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=60',
        },
      });
    }

    const res = await fetch(COINGECKO_URL, {
      headers: {
        Accept: 'application/json',
        // CoinGecko 免费版不需要 key，加 User-Agent 避免被屏蔽
        'User-Agent': 'Mozilla/5.0 (compatible; Biyijia/1.0)',
      },
    });

    if (!res.ok) {
      return new Response(JSON.stringify({ error: 'CoinGecko API error', status: res.status }), {
        status: res.status,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const data = await res.json();

    // 写入缓存
    cache = { data, ts: Date.now() };

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=60',
      },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Proxy fetch failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
