# JPexam 日本語タイピング

一个面向日语学习者的本地网页打字训练 Demo。练习目标不是输入罗马音，而是直接输入正确的假名读音；页面同时显示日语原文、中文释义、训练进度和必要的汉字读音提示。

## 当前功能

- 词汇、句子、歌词三种练习模式
- 已加载库按模式分开展示，可搜索、预览、加入本轮练习
- 支持导入本地 JSON/TXT，适合补充个性化词库、句库或合法获得的歌词文本
- 输入完整假名后判对，词汇/句子答对后自动进入下一题，歌词模式答对后立即滚动到下一句
- 提示模式下可悬停日语原文中的汉字查看假名
- 可设置难度、每日目标、本轮数量、练习顺序、判定模式
- 本地保存今日进度、练习历史和已导入题库
- 附带 GitHub 体验版题库：N5/N4/N3 词汇 180 条，句子 90 条

## 快速开始

```bash
pnpm install
pnpm dev
```

开发服务器启动后，打开终端显示的本地地址，通常是：

```text
http://127.0.0.1:5173/
```

构建生产版本：

```bash
pnpm build
```

本项目使用 Vite、React 和 TypeScript。当前设计为纯前端本地应用，不依赖后端服务。

## 使用方式

1. 在顶部选择词汇、句子或歌词模式。
2. 在「已加载库」中搜索或预览题库。
3. 点击「加入」，或把库卡片拖到右侧「本轮」区域。
4. 调整难度、每日目标、本轮数量、练习顺序和判定模式。
5. 点击「开始练习」进入独立练习页。
6. 按页面提示输入完整假名读音，答对后自动推进。

## 数据目录

```text
libraries/
  experience/      GitHub 体验版内置题库
lyrics/
  processed/       已转换为训练格式的歌词库
schemas/           词汇、句子、歌词 JSON Schema
docs/prompts/      用于让大模型生成或转换题库的提示词约束
scripts/           题库生成与处理脚本
src/               前端源码
```

## 数据格式

题库使用 JSON 文件。词汇和句子使用 `items` 字段，歌词使用 `lines` 字段。每条练习内容的核心字段如下：

- `jp`：日语原文，页面展示给用户
- `kana`：标准假名答案，用于判定输入
- `zh`：中文解释或译文
- `level`：难度，例如 `N5`、`N4`、`N3`
- `reading`：汉字到假名的提示映射，用于悬停显示
- `ambiguities`：可选，多义或多音提示

更完整的规则见：

- `docs/data-format.md`
- `schemas/vocab.schema.json`
- `schemas/sentence.schema.json`
- `schemas/lyrics.schema.json`

## 用大模型生成题库

项目内置了三份提示词模板：

- `docs/prompts/vocab-generation.md`：生成词汇库
- `docs/prompts/sentence-generation.md`：生成句子库
- `docs/prompts/lyrics-conversion.md`：把合法获得的歌词文本转换为训练库

建议生成流程：

1. 先阅读 `docs/prompts/schema-rules.md`。
2. 将对应生成提示词复制给大模型。
3. 补充你的需求，例如「生成 N3 词汇 100 条」或「把以下歌词转换为训练文件」。
4. 保存模型输出的 JSON。
5. 在页面右侧「内容导入」导入 JSON 文件。

## 关于歌词

请只导入你有权使用的歌词文本，例如自己创作、已授权、公共领域，或仅在个人本地学习中合法取得并使用的文本。本仓库不建议提交未经授权的完整商业歌词。

## 本地数据

练习进度、历史记录和导入库会保存在浏览器本地存储与 IndexedDB 中。清理浏览器站点数据会重置这些内容。

## 体验包体量

当前 GitHub 体验版包含：

- `vocab-n5-experience.json`：60 条
- `vocab-n4-experience.json`：60 条
- `vocab-n3-experience.json`：60 条
- `sentence-n5-experience.json`：30 条
- `sentence-n4-experience.json`：30 条
- `sentence-n3-experience.json`：30 条

这是一版公开体验用内容，目标是展示练习流程、数据格式和交互体验；正式学习库可以继续按 JLPT 分级和主题扩展。
