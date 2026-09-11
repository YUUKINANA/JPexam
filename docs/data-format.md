# JPexam 数据格式说明

JPexam 使用三类内容库：词汇库、句子库、歌词库。所有内容库都是一个 JSON 对象，导入后在浏览器本地保存。

## 通用顶层字段

- `schemaVersion`: 固定为 `"1.0"`。
- `id`: 内容库唯一标识，稳定且可读，例如 `vocab-n5-core`。
- `type`: `vocab`、`sentence` 或 `lyrics`。
- `title`: 页面上显示的库名。
- `description`: 一句中文说明。
- `sourceLanguage`: 固定为 `"ja"`。
- `license`: 可选，内容授权说明。
- `source`: 可选，来源说明。
- `createdAt` / `updatedAt`: 可选，ISO 日期字符串。
- `items`: 词汇库和句子库使用。
- `lines`: 歌词库使用。

## 题目字段

- `id`: 题目唯一标识。
- `type`: 与顶层类型一致。
- `jp`: 页面显示的日文原文。
- `kana`: 用户需要输入的完整假名答案。
- `zh`: 中文释义。词汇可以是字符串或字符串数组，句子和歌词使用字符串。
- `level`: `N5`、`N4`、`N3`、`N2`、`N1` 或 `custom`。
- `tags`: 可选，简短标签。
- `pos`: 词汇专用，词性。
- `lineNumber`: 歌词专用，行号。
- `source`: 可选，题目来源。
- `note`: 可选，不确定点或补充说明。

## reading 和 kana 的区别

`kana` 是完整答案，用于判对。  
`reading` 是悬停提示，用于标注 `jp` 里每个汉字词或特殊读法。

例如：

```json
{
  "jp": "図書館",
  "kana": "としょかん",
  "reading": [{ "text": "図書館", "kana": "としょかん" }]
}
```

如果只有 `kana` 没有 `reading`，练习仍能判对，但鼠标悬停汉字时不会显示假名。

## 多义与多音

多义或多音信息写入 `ambiguities`。本题采用的正确读音仍然写在 `reading` 中。

```json
{
  "text": "人気",
  "readings": [
    { "kana": "にんき", "zh": "受欢迎" },
    { "kana": "ひとけ", "zh": "人的气息", "note": "本句不采用此读音" }
  ]
}
```

## 本地保存策略

- 用户设置、今日轻量统计：`localStorage`。
- 导入的内容库：IndexedDB。
- 练习历史：IndexedDB，同时保留一份 `localStorage` 兼容数据。
- 当前 demo 不依赖云服务，不需要账号或联网。

每日排题会优先选择没有练过或练习次数较少的题目。这样同一个 N5 词库有 100 个词、每日练 20 个时，第二天会优先安排第一天没练过的词；全部练过后再循环。
