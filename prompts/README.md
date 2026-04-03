# AI 内容生成提示词模板

本目录包含用于 AI 生成网站内容的提示词蒙版。
生成的 HTML 结构会被 `src/lib/content.ts` 自动解析提取。

## 文件说明

| 文件 | 用途 |
|------|------|
| `tutorial.md` | 教程类文章（HowTo Schema） |
| `news.md` | 新闻资讯类文章 |
| `glossary.md` | 词汇表/术语解释 |
| `review.md` | 评测对比类文章 |
| `pillar.md` | 支柱页面（Topic Cluster 中心页） |

## 使用方式

1. 复制对应模板的提示词
2. 替换 `{{变量}}` 为实际内容
3. 发送给 AI 生成
4. 将生成的内容粘贴到 Ghost CMS
5. 设置对应的 Tags（内容类型 + 主题 + 难度）
