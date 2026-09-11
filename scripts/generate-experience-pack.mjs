import fs from "node:fs";
import path from "node:path";

const outDir = path.resolve("libraries/experience");
const srcOut = path.resolve("src/experienceData.ts");
const date = "2026-09-10";

function hasKanji(text) {
  return /[\u3400-\u9fff々]/.test(text);
}

function reading(jp, kana) {
  return hasKanji(jp) ? [{ text: jp, kana }] : [];
}

function parseVocab(line, level, index) {
  const [jp, kana, zh, pos, tagsText] = line.split("|");
  const id = `vocab-${level.toLowerCase()}-experience-${String(index + 1).padStart(3, "0")}`;
  const item = {
    id,
    type: "vocab",
    jp,
    kana,
    zh: zh.includes("；") ? zh.split("；") : zh,
    pos,
    level,
    tags: tagsText.split("，"),
    reading: reading(jp, kana),
  };

  if (jp === "人気") {
    item.ambiguities = [
      {
        text: "人気",
        readings: [
          { kana: "にんき", zh: "受欢迎，本词采用" },
          { kana: "ひとけ", zh: "人的气息", note: "不同语境读音不同" },
        ],
      },
    ];
  }

  if (jp === "一人") {
    item.ambiguities = [
      {
        text: "一人",
        readings: [
          { kana: "ひとり", zh: "一个人，本词采用" },
          { kana: "いちにん", zh: "一人，计数读法" },
        ],
      },
    ];
  }

  return item;
}

function library(type, level, title, description, items) {
  return {
    schemaVersion: "1.0",
    id: `${type}-${level.toLowerCase()}-experience`,
    type,
    title,
    description,
    sourceLanguage: "ja",
    license: "Generated sample content for JPexam GitHub experience edition.",
    source: "JPexam generated experience pack",
    createdAt: date,
    [type === "lyrics" ? "lines" : "items"]: items,
  };
}

const vocabSource = {
  N5: [
    "私|わたし|我|代词|人物，基础", "あなた|あなた|你|代词|人物，基础", "人|ひと|人|名词|人物，基础", "男|おとこ|男人|名词|人物，基础", "女|おんな|女人|名词|人物，基础", "子供|こども|孩子|名词|人物，家庭",
    "先生|せんせい|老师|名词|学校，人物", "学生|がくせい|学生|名词|学校，人物", "友達|ともだち|朋友|名词|人物，日常", "家族|かぞく|家人|名词|家庭，人物", "父|ちち|父亲|名词|家庭，人物", "母|はは|母亲|名词|家庭，人物",
    "名前|なまえ|名字|名词|人物，基础", "国|くに|国家|名词|地点，基础", "日本|にほん|日本|名词|地点，国家", "中国|ちゅうごく|中国|名词|地点，国家", "町|まち|城镇|名词|地点，生活", "家|いえ|家|名词|地点，生活",
    "部屋|へや|房间|名词|地点，生活", "学校|がっこう|学校|名词|学校，地点", "教室|きょうしつ|教室|名词|学校，地点", "図書館|としょかん|图书馆|名词|学校，地点", "駅|えき|车站|名词|交通，地点", "店|みせ|店|名词|购物，地点",
    "銀行|ぎんこう|银行|名词|生活，地点", "病院|びょういん|医院|名词|健康，地点", "公園|こうえん|公园|名词|地点，生活", "会社|かいしゃ|公司|名词|工作，地点", "食堂|しょくどう|食堂|名词|饮食，地点", "空港|くうこう|机场|名词|交通，地点",
    "入口|いりぐち|入口|名词|地点，交通", "出口|でぐち|出口|名词|地点，交通", "前|まえ|前面|名词|位置，基础", "後ろ|うしろ|后面|名词|位置，基础", "右|みぎ|右边|名词|位置，基础", "左|ひだり|左边|名词|位置，基础",
    "上|うえ|上面|名词|位置，基础", "下|した|下面|名词|位置，基础", "中|なか|里面|名词|位置，基础", "外|そと|外面|名词|位置，基础", "今日|きょう|今天|名词|时间，基础", "明日|あした|明天|名词|时间，基础",
    "昨日|きのう|昨天|名词|时间，基础", "朝|あさ|早上|名词|时间，基础", "昼|ひる|中午|名词|时间，基础", "夜|よる|晚上|名词|时间，基础", "毎日|まいにち|每天|名词|时间，习惯", "時間|じかん|时间|名词|时间，基础",
    "休み|やすみ|休息；假日|名词|时间，生活", "天気|てんき|天气|名词|自然，生活", "雨|あめ|雨|名词|天气，自然", "雪|ゆき|雪|名词|天气，自然", "食べる|たべる|吃|二类动词|饮食，动作", "飲む|のむ|喝|一类动词|饮食，动作",
    "見る|みる|看|二类动词|动作，日常", "聞く|きく|听；问|一类动词|动作，沟通", "読む|よむ|读|一类动词|学习，动作", "書く|かく|写|一类动词|学习，动作", "行く|いく|去|一类动词|移动，动作", "来る|くる|来|三类动词|移动，动作",
  ],
  N4: [
    "予定|よてい|计划；预定|名词/サ变动词|时间，计划", "用事|ようじ|事情；要办的事|名词|生活，计划", "準備|じゅんび|准备|名词/サ变动词|行动，计划", "連絡|れんらく|联系|名词/サ变动词|沟通，生活", "説明|せつめい|说明|名词/サ变动词|沟通，学习", "約束|やくそく|约定|名词/サ变动词|人际，生活",
    "経験|けいけん|经验|名词/サ变动词|学习，生活", "必要|ひつよう|必要|名词/形容动词|判断，常用", "安全|あんぜん|安全|名词/形容动词|状态，生活", "危険|きけん|危险|名词/形容动词|状态，生活", "便利|べんり|方便|形容动词|评价，生活", "不便|ふべん|不方便|形容动词|评价，生活",
    "残念|ざんねん|遗憾；可惜|形容动词|情绪，评价", "特別|とくべつ|特别|形容动词|评价，常用", "普通|ふつう|普通|名词/形容动词|评价，常用", "自由|じゆう|自由|名词/形容动词|状态，生活", "簡単|かんたん|简单|形容动词|评价，学习", "複雑|ふくざつ|复杂|形容动词|评价，学习",
    "理由|りゆう|理由|名词|说明，逻辑", "場合|ばあい|场合；情况|名词|说明，逻辑", "方法|ほうほう|方法|名词|学习，说明", "問題|もんだい|问题|名词|学习，工作", "答え|こたえ|答案；回答|名词|学习，沟通", "意見|いけん|意见|名词|沟通，思考",
    "季節|きせつ|季节|名词|自然，时间", "空気|くうき|空气；气氛|名词|自然，状态", "景色|けしき|景色|名词|自然，旅行", "人口|じんこう|人口|名词|社会，数据", "文化|ぶんか|文化|名词|社会，学习", "生活|せいかつ|生活|名词/サ变动词|生活，常用",
    "受付|うけつけ|接待处；受理|名词|服务，地点", "会場|かいじょう|会场|名词|地点，活动", "住所|じゅうしょ|地址|名词|生活，信息", "近所|きんじょ|附近；邻近地区|名词|地点，生活", "以内|いない|以内|名词|范围，时间", "以上|いじょう|以上|名词|范围，数量",
    "以下|いか|以下|名词|范围，数量", "以外|いがい|以外|名词|范围，常用", "最初|さいしょ|最初|名词|时间，顺序", "最後|さいご|最后|名词|时间，顺序", "途中|とちゅう|途中|名词|时间，移动", "将来|しょうらい|将来|名词|时间，人生",
    "比べる|くらべる|比较|二类动词|思考，动作", "調べる|しらべる|调查；查找|二类动词|学习，动作", "始める|はじめる|开始|二类动词|动作，时间", "続ける|つづける|继续|二类动词|动作，学习", "決める|きめる|决定|二类动词|思考，动作", "変える|かえる|改变|二类动词|变化，动作",
    "運ぶ|はこぶ|搬运|一类动词|动作，生活", "直す|なおす|修理；改正|一类动词|动作，生活", "手伝う|てつだう|帮忙|一类动词|人际，动作", "間に合う|まにあう|赶得上；来得及|一类动词|时间，动作", "片付ける|かたづける|收拾；整理|二类动词|生活，动作", "集める|あつめる|收集|二类动词|动作，生活",
    "足りる|たりる|足够|二类动词|数量，状态", "慣れる|なれる|习惯|二类动词|生活，变化", "似る|にる|相似|二类动词|状态，比较", "込む|こむ|拥挤|一类动词|状态，交通", "笑う|わらう|笑|一类动词|情绪，动作", "泣く|なく|哭|一类动词|情绪，动作",
  ],
  N3: [
    "確認|かくにん|确认|名词/サ变动词|工作，沟通", "報告|ほうこく|报告|名词/サ变动词|工作，沟通", "相談|そうだん|商量；咨询|名词/サ变动词|沟通，人际", "判断|はんだん|判断|名词/サ变动词|思考，工作", "改善|かいぜん|改善|名词/サ变动词|工作，变化", "解決|かいけつ|解决|名词/サ变动词|问题，工作",
    "原因|げんいん|原因|名词|说明，逻辑", "結果|けっか|结果|名词|说明，逻辑", "影響|えいきょう|影响|名词/サ变动词|说明，抽象", "状況|じょうきょう|状况|名词|说明，工作", "可能性|かのうせい|可能性|名词|判断，抽象", "関係|かんけい|关系|名词/サ变动词|人际，说明",
    "印象|いんしょう|印象|名词|评价，感受", "努力|どりょく|努力|名词/サ变动词|学习，态度", "変化|へんか|变化|名词/サ变动词|变化，说明", "成長|せいちょう|成长|名词/サ变动词|变化，人生", "成功|せいこう|成功|名词/サ变动词|结果，工作", "失敗|しっぱい|失败|名词/サ变动词|结果，学习",
    "能力|のうりょく|能力|名词|学习，工作", "目的|もくてき|目的|名词|计划，说明", "目標|もくひょう|目标|名词|计划，学习", "課題|かだい|课题；任务|名词|学习，工作", "資料|しりょう|资料|名词|工作，学习", "情報|じょうほう|信息|名词|工作，社会",
    "制度|せいど|制度|名词|社会，规则", "環境|かんきょう|环境|名词|生活，社会", "地域|ちいき|地区|名词|社会，地点", "社会|しゃかい|社会|名词|社会，学习", "経済|けいざい|经济|名词|社会，学习", "技術|ぎじゅつ|技术|名词|工作，学习",
    "特徴|とくちょう|特征|名词|说明，比较", "内容|ないよう|内容|名词|说明，学习", "条件|じょうけん|条件|名词|判断，规则", "程度|ていど|程度|名词|范围，说明", "態度|たいど|态度|名词|人际，评价", "感情|かんじょう|感情|名词|情绪，人际",
    "不安|ふあん|不安|名词/形容动词|情绪，状态", "安心|あんしん|安心|名词/サ变动词|情绪，状态", "余裕|よゆう|余裕；从容|名词|状态，生活", "納得|なっとく|理解并接受；信服|名词/サ变动词|思考，沟通", "遠慮|えんりょ|客气；顾虑|名词/サ变动词|人际，敬语", "我慢|がまん|忍耐|名词/サ变动词|情绪，生活",
    "担当|たんとう|负责；担当|名词/サ变动词|工作，责任", "参加|さんか|参加|名词/サ变动词|活动，人际", "協力|きょうりょく|协助；合作|名词/サ变动词|工作，人际", "集中|しゅうちゅう|集中|名词/サ变动词|学习，状态", "整理|せいり|整理|名词/サ变动词|工作，生活", "保存|ほぞん|保存|名词/サ变动词|工作，工具",
    "追加|ついか|追加|名词/サ变动词|工作，变化", "削除|さくじょ|删除|名词/サ变动词|工作，工具", "選択|せんたく|选择|名词/サ变动词|判断，工具", "入力|にゅうりょく|输入|名词/サ变动词|工具，学习", "表示|ひょうじ|显示|名词/サ变动词|工具，说明", "向上|こうじょう|提高；进步|名词/サ变动词|学习，变化",
    "実行|じっこう|执行；实行|名词/サ变动词|工作，行动", "比較|ひかく|比较|名词/サ变动词|思考，说明", "分析|ぶんせき|分析|名词/サ变动词|学习，工作", "評価|ひょうか|评价|名词/サ变动词|判断，工作", "提案|ていあん|提案；建议|名词/サ变动词|沟通，工作", "理解|りかい|理解|名词/サ变动词|学习，思考",
  ],
};

const people = [
  ["私", "わたし", "我"], ["友達", "ともだち", "朋友"], ["先生", "せんせい", "老师"], ["母", "はは", "母亲"], ["父", "ちち", "父亲"],
];
const places = [
  ["学校", "がっこう", "学校"], ["図書館", "としょかん", "图书馆"], ["駅", "えき", "车站"], ["店", "みせ", "店"], ["家", "いえ", "家"],
];
const objects = [
  ["日本語", "にほんご", "日语"], ["本", "ほん", "书"], ["手紙", "てがみ", "信"], ["写真", "しゃしん", "照片"], ["映画", "えいが", "电影"],
];
const actions = [
  ["勉強します", "べんきょうします", "学习"], ["読みます", "よみます", "读"], ["書きます", "かきます", "写"], ["見ます", "みます", "看"], ["待ちます", "まちます", "等"],
];

function readingParts(parts) {
  return parts.filter((part) => hasKanji(part[0])).map((part) => ({ text: part[0], kana: part[1] }));
}

function sentence(id, jp, kana, zh, level, tags, parts) {
  return { id, type: "sentence", jp, kana, zh, level, tags, reading: readingParts(parts) };
}

function generateN5Sentences() {
  const items = [];
  for (let index = 0; index < 30; index += 1) {
    const person = people[index % people.length];
    const place = places[index % places.length];
    const object = objects[index % objects.length];
    const action = actions[index % actions.length];
    items.push(sentence(
      `sentence-n5-experience-${String(index + 1).padStart(3, "0")}`,
      `${person[0]}は${place[0]}で${object[0]}を${action[0]}。`,
      `${person[1]}は${place[1]}で${object[1]}を${action[1]}。`,
      `${person[2]}在${place[2]}${action[2]}${object[2]}。`,
      "N5",
      ["日常", "基础"],
      [person, place, object, action]
    ));
  }
  return items;
}

function generateN4Sentences() {
  const topics = [
    ["予定", "よてい", "计划"], ["約束", "やくそく", "约定"], ["宿題", "しゅくだい", "作业"], ["資料", "しりょう", "资料"], ["部屋", "へや", "房间"],
  ];
  const verbs = [
    ["確認します", "かくにんします", "确认"], ["準備します", "じゅんびします", "准备"], ["片付けます", "かたづけます", "整理"], ["調べます", "しらべます", "查询"], ["説明します", "せつめいします", "说明"],
  ];
  const items = [];
  for (let index = 0; index < 30; index += 1) {
    const topic = topics[index % topics.length];
    const verb = verbs[index % verbs.length];
    const time = index % 2 === 0 ? ["明日", "あした", "明天"] : ["授業の前", "じゅぎょうのまえ", "上课前"];
    items.push(sentence(
      `sentence-n4-experience-${String(index + 1).padStart(3, "0")}`,
      `${time[0]}までに${topic[0]}を${verb[0]}。`,
      `${time[1]}までに${topic[1]}を${verb[1]}。`,
      `在${time[2]}之前${verb[2]}${topic[2]}。`,
      "N4",
      ["计划", "动作"],
      [time, topic, verb]
    ));
  }
  return items;
}

function generateN3Sentences() {
  const causes = [
    ["練習を続けた結果", "れんしゅうをつづけたけっか", "持续练习的结果"], ["説明を聞いたことで", "せつめいをきいたことで", "通过听说明"], ["状況を確認した上で", "じょうきょうをかくにんしたうえで", "在确认状况之后"], ["資料を整理したため", "しりょうをせいりしたため", "因为整理了资料"], ["意見を比べた結果", "いけんをくらべたけっか", "比较意见的结果"],
  ];
  const results = [
    ["問題を解決できました", "もんだいをかいけつできました", "解决了问题"], ["内容を理解できました", "ないようをりかいできました", "理解了内容"], ["入力速度が向上しました", "にゅうりょくそくどがこうじょうしました", "输入速度提高了"], ["不安が少なくなりました", "ふあんがすくなくなりました", "不安减少了"], ["次の目標が決まりました", "つぎのもくひょうがきまりました", "确定了下一个目标"],
  ];
  const items = [];
  for (let index = 0; index < 30; index += 1) {
    const cause = causes[index % causes.length];
    const result = results[index % results.length];
    items.push(sentence(
      `sentence-n3-experience-${String(index + 1).padStart(3, "0")}`,
      `${cause[0]}、${result[0]}。`,
      `${cause[1]}、${result[1]}。`,
      `${cause[2]}，${result[2]}。`,
      "N3",
      ["说明", "结果"],
      [cause, result]
    ));
  }
  return items;
}

const vocabLibraries = Object.entries(vocabSource).map(([level, rows]) =>
  library("vocab", level, `${level} 体验词汇`, `GitHub 体验版 ${level} 常用词汇，共 ${rows.length} 条。`, rows.map((line, index) => parseVocab(line, level, index)))
);

const sentenceLibraries = [
  library("sentence", "N5", "N5 体验句子", "GitHub 体验版 N5 基础句子，共 30 条。", generateN5Sentences()),
  library("sentence", "N4", "N4 体验句子", "GitHub 体验版 N4 常用句子，共 30 条。", generateN4Sentences()),
  library("sentence", "N3", "N3 体验句子", "GitHub 体验版 N3 表达句子，共 30 条。", generateN3Sentences()),
];

const libraries = [...vocabLibraries, ...sentenceLibraries];

fs.mkdirSync(outDir, { recursive: true });
for (const item of libraries) {
  fs.writeFileSync(path.join(outDir, `${item.id}.json`), `${JSON.stringify(item, null, 2)}\n`, "utf8");
}

fs.writeFileSync(
  path.join(outDir, "README.md"),
  `# JPexam GitHub Experience Pack\n\nThis directory contains generated, importable experience libraries for JPexam.\n\n- Vocabulary: ${vocabLibraries.reduce((sum, item) => sum + item.items.length, 0)} items across N5/N4/N3.\n- Sentences: ${sentenceLibraries.reduce((sum, item) => sum + item.items.length, 0)} items across N5/N4/N3.\n\nThese files are intended as a first public demo pack. Expand them by level and topic before treating them as a complete JLPT learning set.\n`,
  "utf8"
);

fs.writeFileSync(
  srcOut,
  `import type { PracticeLibrary } from "./types";\n\nexport const experienceLibraries: PracticeLibrary[] = ${JSON.stringify(libraries, null, 2)};\n`,
  "utf8"
);

console.log(`Generated ${libraries.length} libraries in ${outDir}`);
