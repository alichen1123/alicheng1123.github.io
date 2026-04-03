/**
 * ============================================
 * Ghost Content API 客户端 + 多语言抽象层
 * ============================================
 * 所有 Ghost 数据获取都通过这个文件。
 * 多语言解析逻辑封装在 buildLanguageFilter 中，
 * 后续改方案只需改这一个函数。
 */

import {
  GHOST_API_URL,
  GHOST_CONTENT_API_KEY,
  GHOST_LANG_TAG_PREFIX,
  FALLBACK_LANG,
  SUPPORTED_LANGS,
  NAV_ONLY_TAGS,
  type SupportedLang,
} from './env';

// --------------------------------------------------
// Ghost 数据类型
// --------------------------------------------------

export interface GhostAuthor {
  id: string;
  name: string;
  slug: string;
  profile_image: string | null;
  bio: string | null;
  url: string;
}

export interface GhostTag {
  id: string;
  name: string;
  slug: string;
  visibility: string;
}

export interface GhostPost {
  id: string;
  uuid: string;
  slug: string;
  title: string;
  html: string;
  custom_excerpt: string | null;
  feature_image: string | null;
  published_at: string;
  updated_at: string;
  authors: GhostAuthor[];
  tags: GhostTag[];
  meta_title: string | null;
  meta_description: string | null;
  canonical_url: string | null;
  reading_time: number;
  /** 我们注入的字段：该文章的语言 */
  lang?: SupportedLang;
  /** 我们注入的字段：是否为 AI 翻译结果 */
  isTranslated?: boolean;
}

interface GhostApiResponse<T> {
  posts?: T[];
  meta?: {
    pagination: {
      page: number;
      limit: number;
      pages: number;
      total: number;
      next: number | null;
      prev: number | null;
    };
  };
}

// --------------------------------------------------
// Ghost API 基础请求
// --------------------------------------------------

const API_BASE = `${GHOST_API_URL}/ghost/api/content`;

async function ghostFetch<T>(
  endpoint: string,
  params: Record<string, string> = {}
): Promise<T> {
  const url = new URL(`${API_BASE}${endpoint}`);
  url.searchParams.set('key', GHOST_CONTENT_API_KEY);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }

  const res = await fetch(url.toString(), {
    headers: { Accept: 'application/json' },
  });

  if (!res.ok) {
    throw new Error(`Ghost API 请求失败: ${res.status} ${res.statusText} — ${endpoint}`);
  }

  return res.json() as Promise<T>;
}

// --------------------------------------------------
// 【后续可修改】多语言 tag 抽象层
// 当前方案：internal tag #zh → filter 中写 hash-zh
// 如果以后换成 slug 前缀或其他方案，只改这个函数
// --------------------------------------------------

function buildLanguageFilter(lang: SupportedLang): string {
  return `tag:${GHOST_LANG_TAG_PREFIX}${lang}`;
}

/** 从文章的 tags 中解析出语言 */
export function detectPostLang(tags: GhostTag[]): SupportedLang | null {
  for (const tag of tags) {
    for (const lang of SUPPORTED_LANGS) {
      // internal tag 的 slug 是 hash-zh / hash-es / hash-en
      if (tag.slug === `hash-${lang}` || tag.name === `#${lang}`) {
        return lang;
      }
    }
  }
  return null;
}

// --------------------------------------------------
// 获取单篇文章：按 slug + 语言
// --------------------------------------------------

const POST_FIELDS = [
  'id', 'uuid', 'slug', 'title', 'html', 'custom_excerpt',
  'feature_image', 'published_at', 'updated_at',
  'meta_title', 'meta_description', 'canonical_url', 'reading_time',
].join(',');

const POST_INCLUDE = 'authors,tags';

export async function getPostBySlugAndLang(
  slug: string,
  lang: SupportedLang
): Promise<GhostPost | null> {
  try {
    const data = await ghostFetch<GhostApiResponse<GhostPost>>('/posts/', {
      filter: `slug:${slug}+${buildLanguageFilter(lang)}`,
      fields: POST_FIELDS,
      include: POST_INCLUDE,
      limit: '1',
    });

    if (data.posts && data.posts.length > 0) {
      const post = data.posts[0];
      post.lang = lang;
      return post;
    }
    return null;
  } catch {
    return null;
  }
}

// --------------------------------------------------
// 获取单篇文章：按 slug（不限语言）
// 用于 fallback：当目标语言版本不存在时，找任意语言版本再翻译
// --------------------------------------------------

export async function getPostBySlug(slug: string): Promise<GhostPost | null> {
  try {
    const data = await ghostFetch<GhostApiResponse<GhostPost>>('/posts/', {
      filter: `slug:${slug}`,
      fields: POST_FIELDS,
      include: POST_INCLUDE,
      limit: '1',
    });

    if (data.posts && data.posts.length > 0) {
      const post = data.posts[0];
      post.lang = detectPostLang(post.tags) ?? FALLBACK_LANG;
      return post;
    }
    return null;
  } catch {
    return null;
  }
}

// --------------------------------------------------
// 获取相关文章：按 tag 相似度
// --------------------------------------------------

export async function getRelatedPosts(
  currentPost: GhostPost,
  lang: SupportedLang,
  limit: number = 4
): Promise<GhostPost[]> {
  // 用文章的非语言 tag 来找相关文章
  const contentTags = currentPost.tags
    .filter((t) => t.visibility === 'public')
    .map((t) => `tag:${t.slug}`)
    .slice(0, 3);

  if (contentTags.length === 0) {
    return [];
  }

  const tagFilter = contentTags.join(',');
  const langFilter = buildLanguageFilter(lang);

  try {
    const data = await ghostFetch<GhostApiResponse<GhostPost>>('/posts/', {
      filter: `(${tagFilter})+${langFilter}+id:-${currentPost.id}`,
      fields: 'id,slug,title,custom_excerpt,feature_image,published_at,reading_time',
      include: 'tags',
      limit: String(limit),
    });

    return data.posts ?? [];
  } catch {
    return [];
  }
}

// --------------------------------------------------
// 获取文章列表（分页）
// 用于 sitemap、列表页等
// --------------------------------------------------

export interface PostListOptions {
  lang?: SupportedLang;
  page?: number;
  limit?: number;
  tag?: string;
  fields?: string;
  include?: string;
}

export interface PostListResult {
  posts: GhostPost[];
  total: number;
  pages: number;
  currentPage: number;
}

export async function getPostList(options: PostListOptions = {}): Promise<PostListResult> {
  const {
    lang,
    page = 1,
    limit = 15,
    tag,
    fields = 'id,slug,title,custom_excerpt,feature_image,published_at,updated_at,reading_time',
    include = 'tags',
  } = options;

  const filters: string[] = [];
  if (lang) {
    filters.push(buildLanguageFilter(lang));
  }
  if (tag) {
    filters.push(`tag:${tag}`);
  }

  const params: Record<string, string> = {
    fields,
    include,
    page: String(page),
    limit: String(limit),
    order: 'published_at desc',
  };

  if (filters.length > 0) {
    params.filter = filters.join('+');
  }

  try {
    const data = await ghostFetch<GhostApiResponse<GhostPost>>('/posts/', params);
    const pagination = data.meta?.pagination;

    return {
      posts: data.posts ?? [],
      total: pagination?.total ?? 0,
      pages: pagination?.pages ?? 0,
      currentPage: pagination?.page ?? page,
    };
  } catch {
    return { posts: [], total: 0, pages: 0, currentPage: page };
  }
}

// --------------------------------------------------
// 获取所有文章的 slug + lang（用于 sitemap）
// 自动处理分页
// --------------------------------------------------

// --------------------------------------------------
// 获取公开标签列表（用于侧边栏分类导航）
// --------------------------------------------------

export interface GhostTagWithCount extends GhostTag {
  count?: { posts: number };
}

interface GhostTagApiResponse {
  tags?: GhostTagWithCount[];
}

export async function getPublicTags(lang?: SupportedLang): Promise<GhostTagWithCount[]> {
  try {
    // 先获取该语言下的所有文章，收集其中出现的 tag slug
    const langTagSlugs = new Set<string>();

    if (lang) {
      const data = await ghostFetch<GhostApiResponse<GhostPost>>('/posts/', {
        filter: buildLanguageFilter(lang),
        fields: 'id',
        include: 'tags',
        limit: 'all',
      });
      for (const post of data.posts ?? []) {
        for (const tag of post.tags ?? []) {
          if (tag.visibility === 'public') {
            langTagSlugs.add(tag.slug);
          }
        }
      }
    }

    const params: Record<string, string> = {
      limit: 'all',
      include: 'count.posts',
      order: 'count.posts desc',
      filter: 'visibility:public',
    };

    const data = await ghostFetch<GhostTagApiResponse>('/tags/', params);
    const tags = data.tags ?? [];

    return tags.filter((t) => {
      if ((t.count?.posts ?? 0) === 0) return false;
      // 过滤导航专用 tag，不在侧边栏显示
      if (NAV_ONLY_TAGS.has(t.slug)) return false;
      // 如果指定了语言，只返回该语言文章中出现过的标签
      if (lang && langTagSlugs.size > 0) return langTagSlugs.has(t.slug);
      return true;
    });
  } catch {
    return [];
  }
}

// --------------------------------------------------
// 获取最近发布的文章（用于侧边栏）
// --------------------------------------------------

export async function getRecentPosts(
  lang: SupportedLang,
  limit: number = 5,
  excludeSlug?: string
): Promise<GhostPost[]> {
  try {
    const filters = [buildLanguageFilter(lang)];
    if (excludeSlug) {
      filters.push(`slug:-${excludeSlug}`);
    }

    const data = await ghostFetch<GhostApiResponse<GhostPost>>('/posts/', {
      filter: filters.join('+'),
      fields: 'id,slug,title,published_at,reading_time,feature_image',
      include: 'tags',
      limit: String(limit),
      order: 'published_at desc',
    });

    return data.posts ?? [];
  } catch {
    return [];
  }
}

// --------------------------------------------------
// 获取作者信息（用于作者档案页）
// --------------------------------------------------

interface GhostAuthorApiResponse {
  authors?: GhostAuthor[];
}

export async function getAuthorBySlug(slug: string): Promise<GhostAuthor | null> {
  try {
    const data = await ghostFetch<GhostAuthorApiResponse>('/authors/slug/' + slug + '/', {
      include: 'count.posts',
    });
    if (data.authors && data.authors.length > 0) {
      return data.authors[0];
    }
    return null;
  } catch {
    return null;
  }
}

export async function getAllAuthors(): Promise<GhostAuthor[]> {
  try {
    const data = await ghostFetch<GhostAuthorApiResponse>('/authors/', {
      limit: 'all',
      include: 'count.posts',
    });
    return data.authors ?? [];
  } catch {
    return [];
  }
}

/** 获取某个作者的文章列表 */
export async function getPostsByAuthor(
  authorSlug: string,
  lang: SupportedLang,
  page: number = 1,
  limit: number = 15
): Promise<PostListResult> {
  const filters = [`authors:${authorSlug}`, buildLanguageFilter(lang)];

  try {
    const data = await ghostFetch<GhostApiResponse<GhostPost>>('/posts/', {
      filter: filters.join('+'),
      fields: 'id,slug,title,custom_excerpt,feature_image,published_at,updated_at,reading_time',
      include: 'tags',
      page: String(page),
      limit: String(limit),
      order: 'published_at desc',
    });
    const pagination = data.meta?.pagination;
    return {
      posts: data.posts ?? [],
      total: pagination?.total ?? 0,
      pages: pagination?.pages ?? 0,
      currentPage: pagination?.page ?? page,
    };
  } catch {
    return { posts: [], total: 0, pages: 0, currentPage: page };
  }
}

// --------------------------------------------------
// 获取 Ghost Pages（用于静态页面如免责声明等）
// --------------------------------------------------

export interface GhostPage {
  id: string;
  slug: string;
  title: string;
  html: string;
  custom_excerpt: string | null;
  feature_image: string | null;
  published_at: string;
  updated_at: string;
  meta_title: string | null;
  meta_description: string | null;
}

interface GhostPageApiResponse {
  pages?: GhostPage[];
}

export async function getPageBySlug(slug: string): Promise<GhostPage | null> {
  try {
    const data = await ghostFetch<GhostPageApiResponse>('/pages/slug/' + slug + '/', {
      fields: 'id,slug,title,html,custom_excerpt,feature_image,published_at,updated_at,meta_title,meta_description',
    });
    if (data.pages && data.pages.length > 0) {
      return data.pages[0];
    }
    return null;
  } catch {
    return null;
  }
}

// --------------------------------------------------
// 搜索文章：按关键词匹配标题和摘要
// --------------------------------------------------

export async function searchPosts(
  query: string,
  lang: SupportedLang,
  limit: number = 20
): Promise<GhostPost[]> {
  if (!query.trim()) return [];

  try {
    // Ghost Content API 不支持全文搜索，加载最近文章后在服务端过滤
    const data = await ghostFetch<GhostApiResponse<GhostPost>>('/posts/', {
      filter: buildLanguageFilter(lang),
      fields: 'id,slug,title,custom_excerpt,feature_image,published_at,reading_time',
      include: 'tags',
      limit: '200',
      order: 'published_at desc',
    });

    const posts = data.posts ?? [];
    const q = query.toLowerCase();

    return posts
      .filter((p) => {
        const title = (p.title || '').toLowerCase();
        const excerpt = (p.custom_excerpt || '').toLowerCase();
        return title.includes(q) || excerpt.includes(q);
      })
      .slice(0, limit);
  } catch {
    return [];
  }
}

// --------------------------------------------------
// 获取所有文章的 slug + lang（用于 sitemap）
// 自动处理分页
// --------------------------------------------------

export async function getAllPostSlugs(): Promise<Array<{ slug: string; lang: SupportedLang; updatedAt: string }>> {
  const results: Array<{ slug: string; lang: SupportedLang; updatedAt: string }> = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const data = await ghostFetch<GhostApiResponse<GhostPost>>('/posts/', {
      fields: 'slug,updated_at',
      include: 'tags',
      page: String(page),
      limit: '100',
      order: 'published_at desc',
    });

    if (!data.posts || data.posts.length === 0) {
      break;
    }

    for (const post of data.posts) {
      const lang = detectPostLang(post.tags);
      if (lang) {
        results.push({
          slug: post.slug,
          lang,
          updatedAt: post.updated_at,
        });
      }
    }

    hasMore = data.meta?.pagination?.next !== null;
    page++;
  }

  return results;
}
