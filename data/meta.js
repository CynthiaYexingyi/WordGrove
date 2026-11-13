/* 词林 · 静态文案与成长体系（手工维护） */
window.CILIN_META = {
  appName: "词林",
  appEn: "WORD GROVE",
  tagline: "一条向内走的路",

  chapters: [
    { id: "persona", name: "人格面具", en: "PERSONA", range: [1, 4],
      line: "在众人面前，你戴上什么表情；在词语面前，你摘下它。" },
    { id: "shadow", name: "阴影", en: "SHADOW", range: [5, 8],
      line: "你遗忘的词，是尚未照见的自己。回头，它就在那里。" },
    { id: "anima", name: "阿尼玛与阿尼姆斯", en: "ANIMA / ANIMUS", range: [9, 12],
      line: "心里住着另一个自己，它替你读懂另一种语气。" },
    { id: "self", name: "自性", en: "SELBST", range: [13, 15],
      line: "成为你自己——这句话本身，就是一条长路。" }
  ],

  /* 等级：累计经验阈值 + 称号（荣格/黑塞意象） */
  levels: [
    { lv: 1, xp: 0, title: "提灯者", chapter: "persona" },
    { lv: 2, xp: 40, title: "采集者", chapter: "persona" },
    { lv: 3, xp: 110, title: "林中旅人", chapter: "persona" },
    { lv: 4, xp: 210, title: "面具之后", chapter: "persona" },
    { lv: 5, xp: 340, title: "影子学徒", chapter: "shadow" },
    { lv: 6, xp: 500, title: "夜行者", chapter: "shadow" },
    { lv: 7, xp: 700, title: "照见者", chapter: "shadow" },
    { lv: 8, xp: 940, title: "与影同行", chapter: "shadow" },
    { lv: 9, xp: 1220, title: "渡河人", chapter: "anima" },
    { lv: 10, xp: 1540, title: "织梦者", chapter: "anima" },
    { lv: 11, xp: 1910, title: "阿尼玛之友", chapter: "anima" },
    { lv: 12, xp: 2330, title: "玻璃球玩家", chapter: "anima" },
    { lv: 13, xp: 2800, title: "守林人", chapter: "self" },
    { lv: 14, xp: 3330, title: "自性学徒", chapter: "self" },
    { lv: 15, xp: 3920, title: "自性", chapter: "self" }
  ],

  achievements: [
    { id: "first-word", title: "初见", desc: "遇见第一个词。", icon: "seed" },
    { id: "words-10", title: "十枚种子", desc: "累计遇见 10 个词。", icon: "leaf" },
    { id: "words-100", title: "百词之林", desc: "累计遇见 100 个词。", icon: "tree" },
    { id: "words-300", title: "半林", desc: "累计遇见 300 个词。", icon: "tree" },
    { id: "streak-3", title: "三日不辍", desc: "连续学习 3 天。", icon: "flame" },
    { id: "streak-7", title: "七日之林", desc: "连续学习 7 天。", icon: "flame" },
    { id: "streak-30", title: "月下长行", desc: "连续学习 30 天。", icon: "moon" },
    { id: "shadow-1", title: "初次照见", desc: "整合第一个影子词。", icon: "shadow" },
    { id: "shadow-10", title: "与影同行", desc: "整合 10 个影子词。", icon: "shadow" },
    { id: "quiz-10", title: "静水", desc: "连续答对 10 题。", icon: "ring" },
    { id: "level-5", title: "第五章", desc: "抵达 Lv5 影子学徒。", icon: "star" },
    { id: "level-10", title: "织梦", desc: "抵达 Lv10 织梦者。", icon: "star" },
    { id: "units-all", title: "走遍七境", desc: "在七个单元都留下足迹。", icon: "river" },
    { id: "translation-1", title: "渡河", desc: "完成第一次翻译。", icon: "pen" },
    { id: "writing-1", title: "落笔", desc: "完成第一篇写作。", icon: "pen" },
    { id: "listening-1", title: "听见", desc: "完成第一次听力。", icon: "ear" },
    { id: "journal-3", title: "三夜手记", desc: "写下三则今日之问。", icon: "book" },
    { id: "daily-first", title: "一日之始", desc: "第一次完成今日目标。", icon: "key" }
  ],

  quotes: [
    "你走向词语，也是在走向自己。",
    "遗忘不是终点，是尚未照见的自己。",
    "一条河不需要被催促，它自会抵达。",
    "林中没有捷径，只有你的脚步。",
    "先把今天这一小段路走完。",
    "每个词都是一粒种子，落在你心里。",
    "你不需要一次成为谁，只需今天向前一寸。",
    "影子不追赶你，它等你回头。",
    "语言是桥，渡向另一个人的心。",
    "安静地记，慢慢地长。",
    "世界很吵，词林很轻。",
    "读完一个词，像在林中遇见一盏灯。"
  ],

  moods: [
    { id: "gather", name: "采集", line: "今天适合在词林里拾几枚词。", action: "今日十词", icon: "leaf" },
    { id: "read", name: "阅读", line: "今天适合读一段课文，让句子带你走。", action: "去词林", icon: "book" },
    { id: "forge", name: "试炼", line: "今天适合做一组题，看看水有多深。", action: "去训练", icon: "ring" }
  ],

  reflections: [
    "哪一个词，让你想起最近的生活？",
    "今天遇到的哪个词，像你此刻的状态？",
    "把这个词写进一句只属于你的话里。",
    "如果给今天起一个英文标题，会是哪个词？",
    "有没有一个词，你一直记不住？它让你想到什么？"
  ]
};
