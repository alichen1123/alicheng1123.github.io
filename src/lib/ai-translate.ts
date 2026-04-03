/**
 * ============================================
 * AI 翻译服务（服务端 only）
 * ============================================
 * 当 Ghost 中不存在目标语言版本时，用 AI 翻译兜底。
 * 翻译结果会缓存在内存中，避免重复请求。
 *
 * 使用 https://backendai.internxt.com/
 * 请求格式兼容 OpenAI chat completions。
 *
 * 假设：
 * - API 接受 JSON POST，无需浏览器特定 header
 * - 如果需要认证，通过 AI_API_KEY 环境变量以 Bearer token 发送
 * - 响应格式为 OpenAI 风格：choices[0].message.content
 */

import { AI_API_URL, AI_API_KEY, AI_MODEL, type SupportedLang } from './env';

// --------------------------------------------------
// 翻译缓存（内存级）
// key: `${sourceLang}:${targetLang}:${slug}` → 翻译结果
// Vercel serverless 冷启动后会丢失，但配合 CDN 缓存问题不大
// --------------------------------------------------

const translationCache = new Map<string, TranslatedContent>();

export interface TranslatedContent {
  title: string;
  html: string;
  excerpt: string;
}

// --------------------------------------------------
// 语言名称映射（用于 prompt）
// --------------------------------------------------

const LANG_NAMES: Record<SupportedLang, string> = {
  zh: 'Chinese (Simplified)',
  es: 'Spanish',
  en: 'English',
};

// --------------------------------------------------
// 核心翻译函数
// --------------------------------------------------

export async function translateContent(
  title: string,
  html: string,
  excerpt: string,
  sourceLang: SupportedLang,
  targetLang: SupportedLang,
  slug: string
): Promise<TranslatedContent | null> {
  // 同语言不需要翻译
  if (sourceLang === targetLang) {
    return { title, html, excerpt };
  }

  // 检查缓存
  const cacheKey = `${sourceLang}:${targetLang}:${slug}`;
  const cached = translationCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  // 调用 AI 翻译
  const result = await callTranslationAPI(title, html, excerpt, sourceLang, targetLang);
  if (result) {
    translationCache.set(cacheKey, result);
  }

  return result;
}

// --------------------------------------------------
// AI API 调用
// --------------------------------------------------

async function callTranslationAPI(
  title: string,
  html: string,
  excerpt: string,
  sourceLang: SupportedLang,
  targetLang: SupportedLang
): Promise<TranslatedContent | null> {
  const sourceName = LANG_NAMES[sourceLang];
  const targetName = LANG_NAMES[targetLang];

  const systemPrompt = `You are a professional translator specializing in cryptocurrency, blockchain, and financial content. Translate from ${sourceName} to ${targetName}.

Rules:
- Keep proper nouns unchanged: Bitcoin, Ethereum, Binance, USDT, BTC, ETH, etc.
- Keep ticker symbols unchanged: BTC, ETH, USDT, BNB, etc.
- Keep exchange names unchanged: Binance, Coinbase, OKX, etc.
- Keep blockchain names unchanged: Ethereum, Solana, Polygon, etc.
- Keep URLs unchanged
- Keep HTML tags intact
- Maintain the original meaning and professional tone
- Use locally natural expressions for the target language`;

  const userPrompt = `Translate the following content. Return ONLY a JSON object with these fields: "title", "html", "excerpt". Do not add any explanation.

Title: ${title}

Excerpt: ${excerpt}

HTML Content:
${html}`;

  // 最多重试 2 次
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000); // 30 秒超时

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      // 如果配置了 API Key，以 Bearer token 发送
      // 假设：API 可能不需要认证，如果需要则通过此 header
      if (AI_API_KEY) {
        headers['Authorization'] = `Bearer ${AI_API_KEY}`;
      }

      const res = await fetch(AI_API_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          model: AI_MODEL,
          temperature: 0.3,
          max_tokens: 4096,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!res.ok) {
        console.error(`AI 翻译 API 返回 ${res.status}: ${res.statusText}`);
        continue;
      }

      const data = await res.json();

      // 安全解析 OpenAI 风格响应
      const content = data?.choices?.[0]?.message?.content;
      if (!content || typeof content !== 'string') {
        console.error('AI 翻译 API 响应格式异常:', JSON.stringify(data).slice(0, 200));
        continue;
      }

      // 解析 JSON 结果
      return parseTranslationResult(content, title, html, excerpt);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`AI 翻译请求失败 (第 ${attempt + 1} 次):`, message);
    }
  }

  // 翻译失败，返回 null（调用方会用原文兜底）
  return null;
}

// --------------------------------------------------
// 安全解析翻译结果
// --------------------------------------------------

function parseTranslationResult(
  raw: string,
  fallbackTitle: string,
  fallbackHtml: string,
  fallbackExcerpt: string
): TranslatedContent {
  try {
    // 尝试从 AI 响应中提取 JSON
    // AI 可能返回 ```json ... ``` 包裹的内容
    let jsonStr = raw.trim();
    const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }

    const parsed = JSON.parse(jsonStr);

    return {
      title: typeof parsed.title === 'string' ? parsed.title : fallbackTitle,
      html: typeof parsed.html === 'string' ? parsed.html : fallbackHtml,
      excerpt: typeof parsed.excerpt === 'string' ? parsed.excerpt : fallbackExcerpt,
    };
  } catch {
    // JSON 解析失败，把整个响应当作翻译后的 HTML
    console.error('AI 翻译结果 JSON 解析失败，使用原文兜底');
    return {
      title: fallbackTitle,
      html: fallbackHtml,
      excerpt: fallbackExcerpt,
    };
  }
}
