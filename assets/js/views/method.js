/* 词林 · 方法讲义 */
(function () {
  const CILIN = (window.CILIN = window.CILIN || {});
  const ui = CILIN.ui;

  /* 内容依据《能力》课程材料与各单元课件重编，按「讲清 → 分步 → 完整示例 → 自测 → 自查」组织。
     这是通用写作 / 阅读方法论讲义，纯查阅，不写存档、不升 state.v、不引依赖。 */
  const GUIDE = [
    {
      id: "essay", tab: "写作结构", en: "ARGUMENTATIVE ESSAY", title: "第一讲 · 议论文的结构",
      lead: [
        "议论文不是把观点堆上去，而是为一条立场建立基于证据的论证。大学里绝大多数文章本质上都是论证——连文学、修辞分析也是在「对文本提出主张」。这一讲学完，你应该能看出一篇文章的骨架，也能把自己的文章搭出同样的骨架。"
      ],
      blocks: [
        { title: "1. 先搞清：什么是议论文、题目在问什么", kind: "steps", items: [
          { t: "它不是摘要，也不是报告", d: "摘要只是复述别人说了什么；议论文要表明你的立场并说服读者。它围绕「一条中心论点（thesis）」展开，通篇只服务这一条。" },
          { t: "两种题目都要给出立场", d: "双边题（two-sided）：题目里出现 argue / argument，或问 A 还是 B，如「互联网的净影响是正还是负」。开放题（open-ended）：范围更宽，但同样要提出一个可辩护的主张，如「当代青年最大的挑战是什么」。" },
          { t: "三段各司其职，别串位", d: "引言负责把读者从宽处引到论点；正文负责论证；结论负责收束与提升。每一部分只做自己的事。" }
        ]},
        { title: "2. 引言是一个漏斗：四步由宽到窄", kind: "steps", items: [
          { t: "Hook / General statement", d: "用 1–2 句抓人：惊人事实、场景、问句都行。例：Millions of students start their day in a uniform — a practice that sparks both support and controversy." },
          { t: "Background", d: "给理解问题所需的最少背景——历史、关键定义或一个事实，顺势把范围收窄。" },
          { t: "Controversy", d: "点出分歧所在。例：For some, uniforms mean unity; for others, a restriction on self-expression." },
          { t: "Thesis（最后一句）", d: "你的立场 + 三条理由预告。后面的每一句都必须支撑这一句，这就是你与读者订下的「合同」。" }
        ]},
        { title: "3. Thesis 的写法：立场 + 蓝图", kind: "example", lines: [
          ["公式", "Topic（谈什么）+ Claim（你的精确立场）+ Reasoning blueprint（用哪几条理由辩护）", "三样缺一不可；blueprint 就是正文三段的顺序。"],
          ["示范", "Mandatory school uniforms should be implemented in public schools because A, B, C.", "A = reduce peer pressure；B = foster community；C = improve academic focus。"],
          ["合同", "Thesis 之后的每一段都要兑现它承诺过的理由；兑现不了的，就是跑题，删掉。", "这就是英文里说的 the contract — 读者会拿它逐条验收。"]
        ]},
        { title: "4. 好 thesis 的五问（每稿都过一遍）", kind: "checklist", groups: [
          ["五问", ["清晰具体吗？——用具体词，不用空泛的 good things", "可争论吗？——是主张而非事实，明明摆着的事实不需要论证", "聚焦吗？——一个想法，不要贪多或过大", "扣题吗？——真的回答了题目、对读者有意义", "有新意吗？——换一个角度，而不是复述常识"]]
        ]},
        { title: "5. 看一段真实的引言，把四步认出来", kind: "example", lines: [
          ["Hook", "Many people in areas of the former Soviet Union… live to be well over a hundred years old.", "用一个惊人事实开篇，先抓住读者。"],
          ["Background", "Being 115 or even 125 is not considered unusual there, and they do productive work right up until they die.", "扩大语境：在那里高寿是正常的、有生产力的，读者才明白事情的分量。"],
          ["Controversy", "While many argue the United States offers a higher quality of life, the country is arguably not such a healthy place for older people.", "制造张力：美国更富有，但对老人更健康吗？信号已经放出。"],
          ["Thesis", "In a country with more resources… many older citizens nevertheless find themselves physically, mentally, and emotionally debilitated as they age.", "明确立场：资源更多，美国老人却在身心三方面衰退——全文就论证这一条。"]
        ]},
        { title: "6. 范文拆解：一篇校服议论文是怎么搭起来的", kind: "example", note: "下面只摘关键句并标注功能，用来看清骨架；请在自己的文章里用自己的话写。", lines: [
          ["引言", "以 80% 学生感到穿着压力的数据开篇 → 交代背景 → 摆出分歧（平等 vs 限制表达）→ thesis：校服是有益政策，因为能带来自信、纪律与平等。", "对应 Hook → BG → Controversy → Thesis 四步。"],
          ["正文 1", "主张：校服减少干扰、让学生专注学习。证据：Yogman (2018) 说校服减少无关交谈。让步：有人说是限制表达。反驳：学生仍可用发型、配饰表达个性 (Johnson, 2020)。", "标准六步段：主张 → 证据 → 解释 → 让步 → 反驳 → 收束。"],
          ["正文 2", "主张：校服通过自律改善行为。证据：英国研究发现有校服的学校不良行为更少 (Thompson, 2018)。让步：便装更舒服。反驳：「舒服」与「暴露」界限不清 (Parker, 2022)。", "让步挑对方最强的一点，再驳。"],
          ["正文 3", "主张：校服带来平等与团结。证据：有校服的学校争执更少 (Johnson, 2020)。让步：增加家庭负担。反驳：校服更耐用、学校有助学金 (Davis, 2021)。", "三段各自对应 thesis 里的一条理由。"],
          ["结论", "总结纪律、专注、平等三点 → 让步：表达与花费的顾虑合理，但被收益压倒 → final thought：What is school, if not for learning?", "总结 + 意义 + 收尾金句，没有引入新证据。"]
        ]},
        { title: "7. 10 分制评分表（交稿前对一对）", kind: "table", rows: [
          ["引言", "2.0", "Hook、背景、争议、含立场与三条理由的 thesis"],
          ["正文 ×3", "5.0", "每段一个理由 + 逻辑支撑 + 相关充分的证据 + 反论与驳斥"],
          ["结论", "2.0", "重申立场与理由/意义 + final thought"],
          ["语言", "1.0", "语法、词汇、清晰与衔接"]
        ]},
        { title: "8. 20 点结构清单 · 写完逐项对照", kind: "checklist", groups: [
          ["引言", ["Hook 抓住读者", "背景只给理解问题所需的语境", "清楚点出争议/问题", "thesis 一句、可争论", "thesis 列出（或暗示）三条分论点", "自然过渡到第一段正文"]],
          ["正文（每段重复）", ["主题句先行，对应 thesis 的一条立场", "至少一处可信证据并注明来源", "证据相关、具体、支撑主张", "解释证据如何证明主张（warrant & reasoning）", "承认反方观点或反证（concession）", "用证据或逻辑驳斥（refutation）", "段末小结，必要时过渡下一段"]],
          ["结论", ["换句话总结三条分论点，不照抄 thesis", "说明意义：为何对读者/社会重要", "用新措辞重申中心立场", "以难忘洞见、行动号召或更广含义收尾"]],
          ["整体", ["段落顺序与 thesis 承诺一致", "段间过渡形成逻辑流", "无语法、标点、格式错误"]]
        ]},
        { title: "9. 写前自测：这条论证站得住吗", kind: "quiz", items: [
          ["我在这篇文章里立场清楚吗？", "清楚", "含糊其辞、两边都不得罪，等于没论证。"],
          ["我在正文里回应了反方主张吗？", "回应了", "回避反方会让读者觉得你不敢面对。"],
          ["我用「逻辑推理 + 证据」双重支撑了吗？", "都有", "只有理由显得空，只有数据显得散。"],
          ["证据到主张的联系我说破了吗？", "说破了", "把证据摆上就以为完事，是最常见的失分点。"],
          ["我用限定词、具体词给观点留了余地吗？", "用了", "绝对化措辞（always / never）容易被一个反例推翻。"]
        ]}
      ]
    },
    {
      id: "voice", tab: "开头结尾", en: "HOOK & FINAL THOUGHT", title: "第二讲 · 开头与结尾",
      lead: [
        "开头负责让人愿意读下去，结尾负责让人读完记住。这两处也是阅卷印象分最集中的地方。这一讲给你可直接套用的句式，也给出判断好坏的标准——套句式之前，先想清楚它是否真的贴合你的主题。"
      ],
      blocks: [
        { title: "1. Hook 是什么、好在哪", kind: "concept", text: "Hook 是引言的头 1–2 句：抓住注意力、扣住主题、且不太笼统。它可以是惊人的事实、修辞问句、短小的场景、引言或反差。注意——Hook 只负责引人，不要把 thesis 提前写出来。" },
        { title: "2. 好 Hook 的五条标准", kind: "bullets", items: [
          "抓人：激发好奇，而不是人人皆知的废话（避开 Since the beginning of time…）",
          "相关：与主题和 thesis 明确相连，别放无关的名言或数据",
          "简洁：通常 1–2 句，不铺陈",
          "语气得当：学术写作要正式，记叙文可以更鲜活",
          "不下结论：论点留给引言最后一句"
        ]},
        { title: "3. 十种开头句式 · 例句", kind: "pairs", items: [
          ["1 惊人数据", "According to the U.S. Department of Education, 21% of public schools now require uniforms—almost triple the figure in 2000."],
          ["2 意外事实", "Students at America's first uniformed public high school had to wear military-style khakis because the principal was a retired Marine colonel."],
          ["3 修辞问句", "What would happen to adolescent creativity if every teenager woke up wearing the same outfit 200 days a year?"],
          ["4 名人名言", "“Education is not the filling of a pail, but the lighting of a fire,” wrote W. B. Yeats."],
          ["5 小故事", "When eighth-grader Maya Gomez swapped her band T-shirt for a mandatory polo, the morning bullying on the bus vanished overnight."],
          ["6 悖论", "Ironically, the very garment designed to erase class distinctions now fuels a $1.7-billion retail market that divides parents by price."],
          ["7 场景速写", "At 7:05 a.m. the subway doors slide open and a wave of crimson blazers floods the platform."],
          ["8 历史回闪", "In 16th-century England, charity schools invented the uniform to brand poor pupils as “objects of pity.”"],
          ["9 常见误解", "Most parents assume uniforms save money, yet a 2022 study found the average family spends $330 more per child on logo items."],
          ["10 未来假设", "Imagine a district where AI-embedded polos track heart rate and posture: the uniform becomes both garment and surveillance device."]
        ]},
        { title: "4. 想更朴素一点？这五句也够用", kind: "numbered", items: [
          "Every year, millions of young people give up reading for short videos, losing the quiet power of deep thinking.",
          "What if the habits we think are relaxing are slowly hurting our ability to focus?",
          "“Education is not the filling of a pail, but the lighting of a fire,” wrote the poet W. B. Yeats.",
          "Unlike popular belief, failure is not always a sign of weakness.",
          "On rainy afternoons, many people realize how little time they spend talking face-to-face."
        ]},
        { title: "5. 弱 Hook 的红旗", kind: "bullets", items: [
          "陈词滥调：Since the beginning of time… 之类人人皆知的开场",
          "与主题无关的名言或数据",
          "太笼统、太长——控制在 1–2 句",
          "直接宣布 This essay will talk about…",
          "提前把 thesis 说掉，后文失去悬念"
        ]},
        { title: "6. Final thought 的四要素", kind: "concept", text: "Final thought 是结论的最后一句：回扣 thesis、给读者留下可琢磨的东西、且绝不引入新证据。四个要素——Forward tilt（向前看，不回头复述）、Stakes（暗示后果或机会）、Resonance（措辞有画面、记得住）、Brevity（15–25 词以内）。" },
        { title: "7. 五个简单结尾句", kind: "numbered", items: [
          "Only by choosing slow, focused reading can we protect our minds in a fast-paced digital world.",
          "Perhaps the first step toward better mental health is simply learning to pause.",
          "If schools value curiosity over scores, they will truly light the fire of learning for every student.",
          "Instead of fearing failure, we can treat it as valuable guidance for future growth.",
          "True connection will always matter more than quick messages on a screen."
        ]},
        { title: "8. 15 句结尾模板 · 填空即用", kind: "numbered", items: [
          "Ultimately, what matters most is not ___, but ___—a truth we ignore at our own peril.",
          "If we can embrace this insight today, tomorrow we may wake to a world already changed.",
          "The next move is ours: we can either ___ or ___, and history will judge the choice we make.",
          "In the quiet moment after the last page is turned, the real question still lingers: “What will I do now?”",
          "Ideas, like seeds, only bloom when someone is brave enough to plant them—let that someone be us.",
          "Until we confront the discomfort this issue demands, its shadow will keep lengthening across our future.",
          "The story does not end here; it pauses, waiting for the next voice willing to continue the sentence.",
          "Perhaps the true measure of our generation will be whether we leave the next one answers or excuses.",
          "When the dust settles, only one thing is certain: the cost of forgetting this lesson is a price we cannot afford to pay twice.",
          "So, as the final period lands, let it be a starting gun rather than a finish line.",
          "Time will forgive many mistakes, but it rarely forgives silence—let ours break before it’s too late.",
          "The horizon is not a wall but an invitation; accepting it begins with the courage to take one more step.",
          "If these paragraphs have done their job, the echo you hear next is your own resolve answering the call.",
          "In the end, the choice is refreshingly simple: we can repeat yesterday or author tomorrow—pen in hand, we decide.",
          "And long after the ink has dried, the question that remains is not whether change is possible, but whether we are."
        ]},
        { title: "9. 弱结尾的红旗", kind: "bullets", items: [
          "塞进全新的支持细节",
          "原样重复 thesis",
          "落在一个琐碎事实上",
          "突然转成无关或随意的语气",
          "夸大不实的宏大宣称"
        ]}
      ]
    },
    {
      id: "paragraph", tab: "段落写作", en: "PARAGRAPH DEVELOPMENT", title: "第三讲 · 段落写作",
      lead: [
        "段落是写作的基本单位：一组围绕同一个中心意思展开的句子。判断标准只有一句——这一段里的每句话，能不能都连到同一个中心？这一讲从主题句写到连贯性，还给你两个「找毛病」的练习。"
      ],
      blocks: [
        { title: "1. 一个正文段落的骨架", kind: "concept", text: "主题句（点明主旨）→ 支持句（解释、展开、举例）→ 结句/过渡句（收束或引出下一段）。好用的配比：1 个主题句 + 3–5 个支持句 + 1 个结句。" },
        { title: "2. 主题句公式：Topic + Controlling idea", kind: "example", lines: [
          ["公式", "主题句 = 谈论对象 + 关于它的具体观点", " Controlling idea 决定这一段要讲什么，也决定了哪些句子必须被删掉。"],
          ["示例", "Gold, a precious metal, is prized for two important characteristics.", "Topic = gold；Controlling idea = two important characteristics。"],
          ["反例", "San Francisco is a great place.", "太笼统；改成 San Francisco is famous for many tourist attractions. 才有得写。"]
        ]},
        { title: "3. 好主题句的三条标准", kind: "steps", items: [
          { t: "Complete 完整", d: "是完整句子，不是碎片或标题。× How to change a tire → √ There is a safe way to change a tire." },
          { t: "Focused 聚焦", d: "不太宽也不太窄，一段能讲清。太宽要好几段，太窄只有一句可说。问自己：够展开、又不需要拆成几段吗？" },
          { t: "Unified 统一", d: "只含一个中心思想，别把两个观点挤进一句。" }
        ]},
        { title: "4. 主题句放在哪", kind: "bullets", items: [
          "可在段首、段末或中间，有时首尾都点，偶尔隐含",
          "初学者放段首最清晰——先亮观点，读者好跟上"
        ]},
        { title: "5. 先练手：给主题句贴标签", kind: "quiz", note: "B = 太宽，N = 太窄，F = 句子碎片，✓ = 刚好。先自己判断，再点开答案。", items: [
          ["Learning English.", "F", "只是词组，不是句子。可改写为：Learning a second language opens many doors for students."],
          ["Studying abroad changes students in many ways.", "✓", "完整、聚焦、可展开。"],
          ["There are many kinds of sports in the world.", "B", "太宽。可改写为：Team sports teach young people two valuable life skills."],
          ["My school starts at 8:00 a.m.", "N", "一个事实，没什么可展开。"],
          ["Social media can harm teenagers' mental health for two reasons.", "✓", "有对象、有观点、预告了两条理由。"]
        ]},
        { title: "6. 找毛病：这段为什么不合格", kind: "example", note: "先看原文，再对照右边的诊断——这就是自学时「拿标准量段落」的方法。", lines: [
          ["原文", "Dogs are nice. My uncle has a dog. The dog is brown. I went to the park last weekend. Also, dogs need food and water every day. Some dogs are big. My favorite food is pizza.", "出自课堂练习，故意写坏。"],
          ["诊断 1", "没有清晰的主题句和控制性观点。", "开头一句只是宽泛评价，没预告要讲什么。"],
          ["诊断 2", "统一性被破坏。", "公园、披萨离题，与「狗很好」无关。"],
          ["诊断 3", "缺乏连贯性。", "句子随意堆叠，没有逻辑顺序，也没有过渡词。"],
          ["诊断 4", "没有结句。", "写到哪算哪，段落没有收束。"]
        ]},
        { title: "7. 再看一个更隐蔽的坏例子", kind: "example", note: "这段读起来通顺，问题更值得学。", lines: [
          ["原文", "Summer is the best season because everyone feels happier, and there are many fun activities like swimming, going to the beach, eating ice-cream, and having barbecues. I love summer holidays because I can travel with my family… I once saw a dolphin while I was on vacation. Summer is just great and nobody can argue with that.", "典型的学生段落。"],
          ["问题 1", "主题句抛出了主张，却没预告用哪些论点支持。", "后面列举的活动没有形成清晰路线。"],
          ["问题 2", "统一性被破坏：看海豚、去西班牙虽有趣，却无助于论证。", "细节要服务主张，否则删。"],
          ["问题 3", "连贯性弱：句子随意堆叠，未按 天气→活动→自由→结论 铺陈。", "调整顺序就能救回一大半。"],
          ["问题 4", "概括未经证实：everyone feels happier、nobody can argue。", "主观断言要换成证据或解释。"],
          ["问题 5", "结句陈词滥调，只重复主张。", "应总结证据、强化论点。"]
        ]},
        { title: "8. 支持句的三个动作", kind: "pairs", items: [
          ["Explain 解释", "给出理由或细节，说明为什么"],
          ["Develop 展开", "补充主要、次要支撑，把观点说厚"],
          ["Illustrate 举例", "必要时用具体例子说明"]
        ]},
        { title: "9. 连贯：让句子排成一条线", kind: "pairs", items: [
          ["Meaning 意义", "句子按逻辑顺序排列，层层引导"],
          ["Linking words 连接词", "增补 first, also, furthermore, in addition；转折 however, in contrast, on the other hand；总结 therefore, in conclusion, as a result"],
          ["选词原则", "过渡词要匹配句间真实的逻辑关系，不能为了用而用"]
        ]},
        { title: "10. 段落自查 + 同伴互评", kind: "checklist", groups: [
          ["自己查", ["意思清楚、能读懂", "主题句清晰（完整/聚焦/统一）", "每句都扣主旨（unity）", "顺序合理、层层引导（coherence）", "有至少一个过渡词", "有结句", "句子长短有变化", "用词准确、简洁、新鲜", "校对过语法与拼写"]]
        ]}
      ]
    },
    {
      id: "reasoning", tab: "论证思维", en: "REASONING & EVIDENCE", title: "第四讲 · 论证思维",
      lead: [
        "论证最容易失分的地方，是「有观点、没推理」。这一讲帮你分清主张、理由、证据，学会用正确的推理把读者从证据带到结论。记住一句话：理由解释为什么，证据表明确实如此，两者都要有。"
      ],
      blocks: [
        { title: "1. 四组必须分清的概念", kind: "pairs", items: [
          ["事实 Fact", "可核实的客观陈述，如「海平面下水在 100℃ 沸腾」，是证据的基石。"],
          ["主张 Claim", "你想证明的立场，如在说「每日锻炼改善心理健康」。主张本身不够，必须被支撑。"],
          ["理由 Reason", "逻辑上的「为什么」，如「锻炼释放内啡肽」。它让观点显得合理，但单独不能证明什么。"],
          ["证据 Evidence", "可观察、可验证的具体信息，如「研究发现六周后压力下降 20%」。理由说可能为真，证据表明确实为真。"],
          ["证明 Proof", "在特定语境下确定无疑；标准因学科而异。学术写作追求「强有力的证据」，不追求绝对证明。"],
          ["逻辑 vs 理性", "逻辑是评估陈述有效性的形式系统（数学、哲学）；理性是日常论证中形成判断的心智能力，更灵活、更个人化。"]
        ]},
        { title: "2. 同一个主张，三种写法", kind: "example", lines: [
          ["主张", "Daily exercise improves mental health.", "这是 thesis 或主题句，不能单独站着。"],
          ["理由", "Exercise releases endorphins, which are known as feel-good chemicals. These help reduce stress and improve mood.", "解释了「为什么可能有用」，但没有直接证明。"],
          ["证据", "A study published in the Journal of Health Psychology found that individuals who exercised for 30 minutes a day reported a 20% decrease in stress levels over six weeks.", "有出处、有数值、可验证——这才叫证据。"],
          ["分析", "把证据和主张的联系说破：这组数据如何证明锻炼确实改善心理健康。", "缺了这一步，前面的证据等于白摆。"]
        ]},
        { title: "3. 理由 vs 证据 · 一表看清", kind: "table", rows: [
          ["它是什么", "对「为什么可能为真」的逻辑解释", "表明「确实为真」的可观察信息"],
          ["回答什么", "Why might this be true?", "How do we know this is true?"],
          ["语言类型", "概括、抽象、理论性", "具体、确凿、数据驱动"],
          ["例子", "Exercise releases endorphins…", "A 2022 study found a 20% decrease…"],
          ["要引用吗", "一般推理即可，引用后更有力", "一律注明来源"]
        ]},
        { title: "4. 三段式黄金链：Claim → Reason → Evidence → Analysis", kind: "concept", text: "把这四个动作装进每个正文段落：先亮主张，再给逻辑理由，然后上可验证的证据，最后解释证据如何支撑主张。任何一段少了 Analysis，读者都会觉得「你说了，但没说服我」。" },
        { title: "5. 三种核心推理（从证据到结论）", kind: "pairs", items: [
          ["演绎 Deductive", "一般 → 具体；前提为真则结论确定。适合数学、逻辑、形式论证。"],
          ["归纳 Inductive", "具体 → 一般；基于模式，结论是或然的。适合社科、文学、案例研究。"],
          ["溯因 Abductive", "不完整数据 → 最佳猜测；最合理的解释。适合诊断与假设生成。"],
          ["类比 Analogical", "比较两个事物来解释或预测：「正如计算机处理数据，大脑处理经验。」"],
          ["因果 Cause-Effect", "指出一个事件直接导致另一个：「气温上升导致冰川融化。」"],
          ["批判性 / 分解", "质疑假设与证据，或把复杂问题拆成小块逐步解决。"]
        ]},
        { title: "6. 证据强弱阶梯（强 → 弱）", kind: "numbered", items: [
          "事实：客观可验证，最坚实的基础",
          "统计数据：研究、调查、官方数值，极具说服力",
          "专家意见：领域权威，资质合格则有力",
          "事例 / 案例研究：让抽象概念具体化",
          "个人经历：第一手，单独最弱，但能增加人情味",
          "最佳实践：组合使用——事实 + 统计 + 专家意见最强。"
        ]},
        { title: "7. 小练习：这是理由还是证据", kind: "quiz", items: [
          ["给学龄前儿童朗读能培养词汇量，因为他们每分钟听到的单词更多。", "理由", "给出「为什么」的逻辑解释，没有数据。"],
          ["2022 年对 1,200 名儿童的研究发现，每天大声朗读使词汇成绩提高 34%。", "证据", "具体、可验证的研究数据。"],
          ["锻炼减轻压力，因为它释放内啡肽——身体的天然情绪增强剂。", "理由", "解释机制，属于逻辑依据。"],
          ["《健康心理学杂志》报告：每天锻炼 30 分钟、持续六周后压力下降 20%。", "证据", "有出处、有数值的可验证结果。"],
          ["远程工作提高生产力，因为员工受到的办公室干扰更少。", "理由", "因果解释，未给测量结果。"],
          ["斯坦福大学研究发现，远程工作者生产力比办公室同事高 13%。", "证据", "带机构与数值的实证数据。"]
        ]},
        { title: "8. 写进论文前，记住这六条", kind: "bullets", items: [
          "主张需要支撑——绝不要让它孤立无援",
          "每个正文段落都要同时有理由和证据",
          "证据比纯理由有力，且一律注明来源",
          "多种证据组合使用：事实 + 统计 + 专家意见 + 事例",
          "证据是支持性的，证明是确定性的——追求强证据而非绝对证明",
          "选对推理类型：演绎用于逻辑，归纳用于模式，溯因用于最佳猜测"
        ]}
      ]
    },
    {
      id: "counter", tab: "反驳让步", en: "COUNTERARGUMENT", title: "第五讲 · 反驳与让步",
      lead: [
        "只讲自己有理的文章，说服力有限。主动请出反方、公平地承认它对的地方、再用证据回应——这反而让你的立场更稳，也让你显得是个讲理的人。这是课程里专门花 15 页讲的一块，也是从「像学生」到「像学者」的分水岭。"
      ],
      blocks: [
        { title: "1. 什么是反论，为什么要写", kind: "concept", text: "反论（counterargument）是挑战你主主张的对立观点，提供更不同的解释或证据。两类常见写法：质疑对方的事实（disputing the facts——检查其事实是否有误或无效），以及从伦理角度质疑（ethical dispute）。承认并回应反论，能强化你自己的立场、提升可信度（读者看到你尊重不同观点），也体现学术讨论的礼貌。" },
        { title: "2. 怎么找到反论：在读者之前先反驳自己", kind: "steps", items: [
          { t: "做研究", d: "你觉得没人会反对，多半只是还没查到——很可能已经有人反对过，而且说得有理。" },
          { t: "找人聊", d: "同学或老师常能指出你从没想到的漏洞。" },
          { t: "挑战自己", d: "对着你的 thesis 和每条分论点各问一句：谁会反对这一条？为什么？" }
        ]},
        { title: "3. 四种论证模式（本课采用 Rogerian）", kind: "pairs", items: [
          ["省略模式 Omission", "单边论证，最弱；把反方当稻草人或敌人，不回应其内容。"],
          ["对话模式 Dialogic", "先摆反论再回应，论点放到中段或末段出现，逐步化解抵抗。"],
          ["罗杰斯模式 Rogerian", "把论证视为开放沟通，目标是共同理解而非赢；先找共同点、表同理心，再呈现新理解，最后综合多方立场。本课采用。"],
          ["古典模式 Classical", "把反论和反驳合在一步处理，适合中立或未决的读者。"],
          ["结构 A/B/C/D", "A：论点→理由1→理由2→反论反驳→结论；B：论点→反论反驳→理由→结论；C：论点→反论1反驳→反论2反驳→反论3反驳→结论（本课用）；D：论点→反论反驳×2→理由→结论。原则：先陈述自己的论证，再处理反论。"]
        ]},
        { title: "4. 两步法：先承认，再反驳", kind: "steps", items: [
          { t: "Step 1 · Acknowledge 承认", d: "尊重地承认不同的证据或立场，并如实陈述——不要歪曲对方。" },
          { t: "Step 2 · Refute 反驳", d: "用 although / however 等词转折，说明为什么你的立场更站得住。公平让步会让反驳更有力。" }
        ]},
        { title: "5. 三种驳法", kind: "pairs", items: [
          ["Incorrect 不正确", "对方的推理建立在错误或误导性的信息上。"],
          ["Irrelevant 不相干", "对方的观点没有切中关键问题，答非所问。"],
          ["Insufficient 不充分", "对方依据的信息不足或忽略了重要信息；可部分同意，但总体上证明其薄弱。"]
        ]},
        { title: "6. 四部分结构：陈述 → 让步 → 反驳 → 收束", kind: "example", lines: [
          ["① Statement 陈述", "It is often argued that… / Opposing views claim… / Some disagree, saying…", "公开、诚实地引出反方观点。"],
          ["② Concession 让步", "Admittedly… / Certainly… / Of course… / One cannot deny that…", "承认对方站得住的部分，把自己的强项与对方的弱项对照。"],
          ["③ Refutation 反驳", "But… is not completely accurate. / Nevertheless, / However, / On the other hand,", "指出对方主张不正确、不重要或不充分。"],
          ["④ Conclusion 收束", "Thus, / Therefore, / As a result,", "小结为什么这条反论不足以构成替代方案。"]
        ]},
        { title: "7. 直接可用的句式", kind: "pairs", items: [
          ["引出反论", "Critics claim that… / Some people contend that… / It is argued that… / Those who believe… claim that…"],
          ["转折反驳", "Nonetheless, / Although true to a certain extent,… / Contrary to this opinion,… / While this may be the case,… / Even though this is true,…"]
        ]},
        { title: "8. 看一段范文里的让步与反驳", kind: "example", lines: [
          ["让步", "“Nevertheless, Spiros claims that ‘the purpose of education is to help us prepare for the future…’”", "反方观点被公平地陈述出来。"],
          ["反驳", "“Although opponents of ‘edutainment’ view it as an unnecessary and harmful diversion…, this approach actually introduces students to the value of innovation…”", "先承认对方怎么看，再用你的理由回应。"],
          ["要点", "让步用 Although / While 引导，主句给出你的立场。", "这样一句里就完成了「承认 + 反驳」两个动作。"]
        ]}
      ]
    },
    {
      id: "summary", tab: "摘要", en: "SUMMARY", title: "第六讲 · 摘要写作",
      lead: [
        "摘要是把长文压成要点的能力：它考验你是否真的读懂了，也考验你能不能忍住不加入自己的意见。好的摘要，让没读过原文的人也能准确知道作者说了什么——简短、客观、用自己的话。"
      ],
      blocks: [
        { title: "1. 三条铁律", kind: "pairs", items: [
          ["自己的话 Your own words", "凭记忆重述；只有原文精确措辞加引号，否则算抄袭"],
          ["客观 Stay objective", "报告作者的观点和语气；把说服、评论、己见留到 analysis，不进摘要"],
          ["约四分之一 One quarter", "长度一般约为原文 1/4，作业以老师要求为准"]
        ]},
        { title: "2. 三步法，按序做", kind: "steps", items: [
          { t: "Review the piece · 读", d: "先通读一遍不做标记，真正读懂；命名贯穿全文的主旨，记下明示的 thesis 和关键引语；再读并记主要论点（看重复、意外之处、每章首尾句）；略过支撑证据，故事只留主要情节和动机。" },
          { t: "Write in your words · 写", d: "以作者与标题开头（如 George Shaw's Pygmalion is a play about class and culture）；放下笔记凭记忆写，像讲给朋友听；保持作者视角与语气，不加己见；用 the author argues… / the article claims… 提醒读者这是别人的观点。" },
          { t: "Revise it · 改", d: "对照笔记补回漏掉的重要点；按时间顺序排列；消除重复；加过渡；改语法拼写（拼写检查抓不到 there / their）；查长度约 1/4；请人读一遍——仅凭你的摘要应能看懂全文。" }
        ]},
        { title: "3. Do / Don't 对照", kind: "contrast", good: [
          "用自己的话重述，引号只标精确引文",
          "客观报告作者的语气",
          "覆盖要点与核心动机",
          "按时间顺序推进"
        ], bad: [
          "直接抄句子——那是抄袭",
          "辩论、说服、加入自己的观点",
          "复述每个事件、例子、小细节",
          "在章节和情节间跳来跳去"
        ]},
        { title: "4. 示例：居里夫人（Unit 1 Text C）摘要抓哪些点", kind: "example", lines: [
          ["贡献", "发现镭和钋两种放射性元素，开创放射性研究领域。", "对应「主旨」——全文围绕她展开。"],
          ["历程", "早年求学克服经济困难，到实验室历经数年艰苦提炼，始终专注坚持。", "按时间顺序串起主要情节。"],
          ["荣誉", "两度获诺贝尔奖——1903 年物理学奖、1911 年化学奖。", "关键事实，保留。"],
          ["品格", "淡泊名利，视研究为纯粹的科学探索。", "作者的语气与评价，客观转述。"]
        ]},
        { title: "5. 一句话记住", kind: "note", text: "Brief（约 1/4）、Objective（报告而非说服）、Your own words（凭记忆改述，精确原话才加引号）——做到这三点，任何文章你都能摘要。" }
      ]
    },
    {
      id: "paraphrase", tab: "改写", en: "PARAPHRASE", title: "第七讲 · 改写",
      lead: [
        "改写是把别人的意思用自己的话重新说一遍，同时保留原意。它不是换几个同义词——那恰恰是最容易被判抄袭的做法。这一讲用一组真实错例和正例，把「怎么算改到位」讲清楚。"
      ],
      blocks: [
        { title: "1. 什么是改写、为何改写", kind: "concept", text: "改写 = 保留原意，换掉措辞和句子结构，达到更清晰、带出自己的声音。相比直接引用，改写显示你读懂了、行文更顺、你自己的声音更突出——但每次都要标注来源。记住：直接引用的比例一般不超过全文 10%。" },
        { title: "2. 五步法，每次照做", kind: "steps", items: [
          { t: "Read & Understand 读懂", d: "仔细读原文直到完全理解，查清生词。看不懂就谈不上改写。" },
          { t: "Set Aside & Write 放下写", d: "把原文收起来，凭记忆用自己的话写——不要看着原文改。" },
          { t: "Change Structure 换结构", d: "调整句子顺序、换个切入角度、合并或拆分句子。" },
          { t: "Replace Words 换词", d: "适当用同义词，但保留关键术语——换了会改变意思的术语别动。" },
          { t: "Compare & Cite 对照并引用", d: "和原文比对，确认意思准确；补上文内引用（APA / MLA / Chicago 均可，按老师要求）。" }
        ]},
        { title: "3. 关键规则：不要连续 5 个词与原文相同", kind: "note", text: "这是判断「改没改到位」的常用尺子。若某句有连续 5 个词和原文一样，就把那几个词加引号；关键术语保留时也要加引号。改写之后照样要引用——「用了自己的话」不等于「可以不注来源」。" },
        { title: "4. 错误改写 vs 正确改写 · 逐条拆", kind: "example", note: "同一段原文，两种改法，差别在哪一看就懂。", lines: [
          ["原文 (Barnett, 2022)", "Like other marine animals living near heavily populated coasts, horse conchs have lost considerable habitat to development and pollution…", "面前提。"],
          ["✗ 只换词", "Like other sea creatures inhabiting the vicinity of highly populated coasts, horse conchs have lost substantial territory to advancement and contamination…", "结构与词序几乎没动；advancement and contamination 词不达意；inhabiting the vicinity of 啰嗦；语气变随意——仍太贴近原文，有抄袭风险。"],
          ["✓ 正确改写", "Scientists believe that temperature rises resulting from climate change are negatively impacting horse conchs living in the Gulf of Mexico. Development and pollution have also deprived them of important breeding grounds (Barnett, 2022).", "换了切入点（先说气候变化）；用信号词引入；保留关键术语 development and pollution；句式完全不同；只留相关信息；有引用。"],
          ["为什么对", "改动了措辞「和」结构；术语没乱换；篇幅更短；标注了来源。", "五步法全都用上了。"]
        ]},
        { title: "5. 六种改写技巧", kind: "bullets", items: [
          "同义替换：considerable → significant；lost habitat → deprived of habitat",
          "转换词性：名词↔动词（development → developing）",
          "改句式：主动↔被动、合并或拆分句子、重排从句",
          "调信息顺序：结果先行、一般到特殊或反过来",
          "用引导语：Scientists argue that… / According to…",
          "压缩聚焦：只留与你论证相关的信息"
        ]},
        { title: "6. 四种处理来源的方式，别混", kind: "pairs", items: [
          ["Quote 引用", "逐字照抄并加引号。用于精确定义、评论作者语言风格、提供有力证据或批判某主张时。"],
          ["Paraphrase 改写", "把某一段用自己的话说，长度与原段相近或略短。"],
          ["Summary 摘要", "把长文压缩成要点，结果远短于原文。讲全篇主旨时用摘要。"],
          ["Plagiarism 抄袭", "与原文太像（整句或短语相同）或没标来源——有意无意都算，都很严重。"]
        ]},
        { title: "7. 小练习：对照答案看你改得像不像", kind: "example", lines: [
          ["原题", "The dye was bold and fast, and the public clamoured for more.", "要求：换措辞和结构，保留原意。"],
          ["参考 A", "The colour was bright and didn't fade, so people wanted more of it.", "换词 + 拆句，意思准确。"],
          ["参考 B", "Public demand for the dye grew rapidly because its color was both vibrant and long-lasting.", "换成因果结构，更学术。"],
          ["原题 2", "A critical ingredient in the success of hotels is developing and maintaining superior performance from their employees.", "Unit 3 的句子。"],
          ["参考", "For a hotel to thrive, it is essential to foster and uphold high-level performance in its staff.", "起点和结构都变了，关键意思保留。"]
        ]},
        { title: "8. 提交前五问", kind: "quiz", items: [
          ["我同时改了措辞和句子结构吗？", "改了", "只换词不算改写。"],
          ["有连续 5 个词和原文一样吗？", "没有", "有就加引号。"],
          ["每个改写的观点都标注来源了吗？", "标了", "用自己的话也要引用。"],
          ["意思和原文一致吗？", "一致", "别无意中增减信息。"],
          ["我是自己先读、先改的吗？", "是", "改写工具只作灵感，别直接依赖。"]
        ]}
      ]
    },
    {
      id: "translation", tab: "翻译", en: "TRANSLATION", title: "第八讲 · 翻译",
      lead: [
        "英译中最常见的毛病不是查词不够，而是句子结构照搬。这一讲用一套「3-2-1」口诀拆长句：先找骨架，再按中文语序重排，最后读顺。每个技巧都配了课件里的真例句。"
      ],
      blocks: [
        { title: "1. 3-2-1 口诀", kind: "example", lines: [
          ["3 步拆句", "找骨架 → 把修饰成分先甩后补 → 把英文动词换成中文说法。", "先别急着逐字翻，先看清主谓宾。"],
          ["2 种调序", "被动、定语从句、状语、强调句，按中文语序重排。", "中文习惯人做主语、修饰语前置。"],
          ["1 次成句", "中文里不重复「被」字，一遍读通。", "译完读出声，拗口就还没改完。"]
        ]},
        { title: "2. 八类句式 · 口诀 + 原句 + 译文", kind: "pairs", items: [
          ["强调句 it was…that", "① 找强调骨架 ② 括号内容先甩后补 ③ solidified →「让…更坚定」。原：But it was a chance (stumbling upon a run-down, yet functional, laboratory in his late grandfather's home) that solidified the young man's enthusiasm for chemistry. 译：正是这次偶然——在祖父旧屋发现一间破旧却能用的实验室——让少年对化学的热情彻底坚定。"],
          ["被动 was perceived by", "英文被动 → 让中文「人」做主语。原：His talent and devotion… were perceived by his teacher, Thomas Hall, who encouraged him to attend a series of lectures… 译：他的老师 Thomas Hall 一眼看出他的天赋，并鼓励他去听 Faraday 的系列讲座。"],
          ["定语从句 that", "that 从句 →「这 + 动词」提前。译：不久，Perkin 取得一项科学突破，这为他带来名声与财富。"],
          ["现在分词作条件状语", "-ing 条件 →「把 A、B 加进 C 后」。译：把重铬酸钾和酒精分阶段加进苯胺后，他终于得到深紫色。"],
          ["强调句 + 被动", "强调 →「正是…才…」；被动 → 隐藏「被」。译：正是在这种背景下，Perkin 完成了这项发现。"],
          ["多从句 who / that / if", "who →「后者」；that 从句 → 逗号内说条件。译：他请教苏格兰染厂老板 Robert Pullar，后者向他保证：只要颜色不褪、成本够低，就值得一试。"],
          ["绝对结构 + 结果状语", "「-, allowing」→「使」。译：这些染料被用来给原本看不见的微生物上色，使研究者得以辨认结核、霍乱、炭疽等杆菌。"],
          ["介词 + what 从句", "「in what…」→「让…欣慰的是」，直接提前，不必管虚拟语气。译：令 Perkin 欣慰的是，这些染料如今被用于抗疟疫苗的研发。"]
        ]},
        { title: "3. 怎么练", kind: "checklist", groups: [
          ["课堂练法", ["英译中：挑 Unit 2 Text A 难句 2 个，用口诀拆", "中译英：用强调句 / 被动 / 分词结构回译", "计时 5 分钟 → 同桌互换 → 投影 2 份点评"]],
          ["回家练法", ["用「3-2-1」重译 8 句，一行原文一行译文", "读圈继续 Unit 2 Text A，标出 3 处需用口诀的地方"]]
        ]}
      ]
    },
    {
      id: "citation", tab: "学术引用", en: "APA CITATION", title: "第九讲 · 学术引用",
      lead: [
        "引用不是格式杂务，而是让读者找到每个主张背后的确切来源、并自行核查。用了别人的文字、数据或想法却不署名，就是抄袭——代价可能是分数、课程甚至学位。这一讲把 APA 的两层结构和一套工作流讲清。"
      ],
      blocks: [
        { title: "1. 两层结构，缺一不可", kind: "concept", text: "APA 是作者-年份制，社科、教育、护理等领域通用。每个来源要留下两处互相呼应的标记：正文里的文内引用（in-text citation），和文末按字母排序的参考文献列表（Reference list）。引用任何引用、改写或摘要过的来源。" },
        { title: "2. 先找对地方：可信数据库", kind: "pairs", items: [
          ["Google Scholar", "期刊、学位论文、书籍——学术论文与同行评议文章"],
          ["JSTOR", "大量期刊、书籍、一手史料——人文社科"],
          ["PubMed Central", "免费生物医学与生命科学文献"],
          ["ERIC", "美国教育部研究库——教育与心理"],
          ["Project Gutenberg", "6 万+ 公版电子书——文学与历史"],
          ["MIT OpenCourseWare", "免费讲义、试题、作业——理工科"],
          ["ScienceDirect", "全文科学数据库——科技与医学"]
        ]},
        { title: "3. 用之前先判断可信度 · 四问", kind: "checklist", groups: [
          ["信源评估", ["先读摘要：几秒内判断是否值得读全文，决定用了再复制链接", "作者与出版方：有无具名、合格的作者？是大学出版社/期刊/知名机构，还是匿名网站？", "是否同行评议：期刊经同行评审，学术数据库会标注", "日期：科学与时事优先新近成果；历史一手史料例外——年代久远正是价值"]]
        ]},
        { title: "4. 文内引用 · 四种常见情形", kind: "pairs", items: [
          ["括号式", "放在句末：(Smith, 2019)"],
          ["叙述式", "把作者织进句子：Smith (2019) argues that…"],
          ["多人作者", "三位及以上缩为第一作者 + et al.：(Lee et al., 2021)"],
          ["直接引用", "还要加页码：(Smith, 2019, p. 14)"]
        ]},
        { title: "5. 参考文献列表 · 四段骨架", kind: "example", lines: [
          ["四部分", "Author. → (Year). → Title. → Source.", "每条都回答这四个问题。"],
          ["期刊文章", "Smith, J. (2019). Title of the article. Journal Name, 12(3), 45-60.", "期刊名与卷号斜体，文章标题不斜体。"],
          ["网页", "Lee, A. (2021). Title of the page. Site Name. https://example.org/page", "有 URL 时照实附上。"],
          ["排序", "按第一作者姓氏 A-B-C；忽略标题里的 The。", "悬挂缩进：首行顶格，其余行缩进。"]
        ]},
        { title: "6. 引用生成器 7 步工作流", kind: "numbered", items: [
          "用 Google Scholar 等数据库按清晰关键词检索",
          "读摘要；决定采用后复制链接",
          "搜索 APA 引用生成器，打开可信的一个（如 Purdue OWL 向导、Scribbr、MyBib）",
          "把链接粘进生成器，点搜索/生成",
          "点开生成的引用结果",
          "复制到剪贴板",
          "粘贴到 References 页，再按 A-B-C 重排"
        ]},
        { title: "7. 别盲信生成器", kind: "bullets", items: [
          "生成器常漏中间首字母、后缀或第二作者",
          "斜体易错：期刊名与卷号斜体，文章标题不斜体",
          "日期与页码范围可能被猜或留空，对照原文核实",
          "粘贴会破坏悬挂缩进、把行距变双——格式最后修",
          "拿不准就查官方 APA 指南或学校图书馆范例"
        ]},
        { title: "8. 五分钟课堂任务", kind: "checklist", groups: [
          ["当堂练", ["用第 2 节的数据库，就你的主题找一条可信来源", "读摘要并复制链接，粘进引用生成器", "粘贴生成结果，然后亲手改掉它的一处错误", "交：一条格式正确的 APA 参考文献 + 一句用 (Author, Year) 的文内引用"]]
        ]}
      ]
    },
    {
      id: "reading", tab: "阅读圈", en: "READING CIRCLES", title: "第十讲 · 阅读圈",
      lead: [
        "阅读圈是把「读完一篇文章」变成「读懂一篇」的小组方法：5–6 人一组，每人戴一顶不同的帽子，从各自角度读，再凑在一起互相补充。即使独自学习，也可以按这六种角色轮流提问自己。"
      ],
      blocks: [
        { title: "1. 怎么运作", kind: "steps", items: [
          { t: "分组与轮换", d: "5–6 人一组，选组长；角色每周轮换，人人都要尝试不同视角。" },
          { t: "会前各做准备", d: "先略读全文（约 10 分钟），再按自己的角色准备（约 15 分钟）——务必在开会前做完，否则浪费聚会时间。" },
          { t: "会上按序发言", d: "讨论引导者先开问、自问自答，再点下一位；每人展示自己的准备、提问与回答，其余人听、记、追问，全程约 30 分钟以上。" },
          { t: "节奏建议", d: "建议每周读一个 Text，但期末考涵盖全部单元——别只顾眼前一篇。" }
        ]},
        { title: "2. 六种角色 · 各管什么", kind: "pairs", items: [
          ["讨论引导 Discussion Leader", "读两遍，准备至少 5 个问题；开场提问，确保人人发言，控制节奏并决定谁接着讲。"],
          ["摘要 Summarizer", "记人物、事件、观点；提炼人人必须知道的关键点；用 1–2 分钟自己的话复述。"],
          ["联结 Connector", "把文本联结到自己的生活、其他读物、世界事件或普遍主题，并说明为何重要。"],
          ["词汇 Word Master", "挑有趣/难/重要的词，记录词义、页码行号、选择理由，准备讲给小组听。"],
          ["段落 Passage Person", "选 3 段有趣/重要/费解的段落，记页码行号与理由，各写一个讨论问题。"],
          ["文化 Culture Collector", "记录习俗、传统、食物、服饰、节日、信念、社会规范、史实、地理细节，注明页码与文化意义。"]
        ]},
        { title: "3. 独自学习也能用", kind: "note", text: "一个人读时，依次问自己这六类问题：这段话的主旨是什么（摘要）？哪个词是关键（词汇）？哪句最重要（段落）？和我已知的什么相连（联结）？背后有什么文化背景（文化）？我要怎么向别人讲清（引导）？" }
      ]
    }
  ];

  const ESC = function (s) { return ui.esc(String(s == null ? "" : s)); };

  function guideBlock(b) {
    let h = `<div class="mt16"><div class="ws-label" style="font-size:11px;letter-spacing:.18em;color:var(--gold)">${ESC(b.title)}</div>`;
    if (b.kind === "table") {
      h += `<div class="kv-list mt8">` + b.rows.map(function (r) {
        return `<div><span class="k">${ESC(r[0])} · <b style="color:var(--gold)">${ESC(r[1])}</b></span><span class="v">${ESC(r[2])}</span></div>`;
      }).join("") + `</div>`;
    } else if (b.kind === "pairs") {
      h += `<div class="kv-list mt8">` + b.items.map(function (it) {
        if (typeof it === "string") return `<div><span class="v">· ${ESC(it)}</span></div>`;
        return `<div><span class="k">${ESC(it[0])}</span><span class="v">${ESC(it[1])}</span></div>`;
      }).join("") + `</div>`;
    } else if (b.kind === "numbered") {
      h += `<ol class="small muted" style="margin:8px 0 0;padding-left:20px;line-height:1.85">` +
        b.items.map(function (x) { return `<li>${ESC(x)}</li>`; }).join("") + `</ol>`;
    } else if (b.kind === "bullets") {
      h += `<div class="small muted mt8" style="line-height:1.9">` +
        b.items.map(function (x) { return "· " + ESC(x); }).join("<br>") + `</div>`;
    } else if (b.kind === "checklist") {
      h += b.groups.map(function (g) {
        return `<div class="mt8 small muted"><b style="color:var(--ink)">${ESC(g[0])}</b><div style="line-height:1.95">` +
          g[1].map(function (x) { return "☐ " + ESC(x); }).join("<br>") + `</div></div>`;
      }).join("");
    } else if (b.kind === "quiz") {
      if (b.note) h += `<div class="small faint" style="margin-top:6px">${ESC(b.note)}</div>`;
      h += b.items.map(function (it) {
        return `<details class="mt8 small" style="cursor:pointer"><summary>${ESC(it[0])}</summary>` +
          `<div class="muted" style="padding:6px 0 0 16px"><b>${ESC(it[1])}</b> · ${ESC(it[2])}</div></details>`;
      }).join("");
    } else if (b.kind === "concept") {
      h += `<div class="small muted mt8" style="line-height:1.9">${ESC(b.text)}</div>`;
    } else if (b.kind === "steps") {
      h += `<div class="mt8">` + b.items.map(function (it, i) {
        return `<div style="display:flex;gap:10px;margin-top:10px;align-items:flex-start">` +
          `<span style="flex:0 0 22px;height:22px;border-radius:50%;border:1px solid var(--gold-dim);color:var(--gold);font-size:11px;display:flex;align-items:center;justify-content:center">${i + 1}</span>` +
          `<div class="small"><b style="color:var(--ink)">${ESC(it.t)}</b><div class="muted" style="line-height:1.85;margin-top:2px">${ESC(it.d)}</div></div>` +
          `</div>`;
      }).join("") + `</div>`;
    } else if (b.kind === "example") {
      if (b.note) h += `<div class="small faint" style="margin-top:6px;line-height:1.7">${ESC(b.note)}</div>`;
      h += `<div class="mt8" style="border-left:2px solid var(--gold-dim);background:var(--panel);padding:10px 12px;border-radius:0 8px 8px 0">` +
        b.lines.map(function (ln) {
          if (typeof ln === "string") return `<div class="small muted" style="line-height:1.85">${ESC(ln)}</div>`;
          const tag = ln[0], text = ln[1], note = ln[2];
          return `<div class="small" style="margin:6px 0;line-height:1.8">` +
            `<span style="color:var(--gold);font-weight:600">${ESC(tag)}　</span>` +
            `<span style="color:var(--ink-2)">${ESC(text)}</span>` +
            (note ? `<div class="faint" style="padding-left:2px;margin-top:2px">${ESC(note)}</div>` : "") +
            `</div>`;
        }).join("") + `</div>`;
    } else if (b.kind === "contrast") {
      h += `<div class="mt8" style="display:grid;grid-template-columns:1fr 1fr;gap:10px">` +
        `<div style="background:var(--panel);padding:10px 12px;border-radius:8px"><div class="small" style="color:var(--gold);font-weight:600;margin-bottom:4px">✓ 该做</div><div class="small muted" style="line-height:1.85">` +
        b.good.map(function (x) { return "· " + ESC(x); }).join("<br>") + `</div></div>` +
        `<div style="background:var(--panel);padding:10px 12px;border-radius:8px"><div class="small" style="color:var(--muted);font-weight:600;margin-bottom:4px">✗ 别做</div><div class="small muted" style="line-height:1.85">` +
        b.bad.map(function (x) { return "· " + ESC(x); }).join("<br>") + `</div></div>` +
        `</div>`;
    } else if (b.kind === "note") {
      h += `<div class="small" style="margin-top:8px;padding:10px 12px;border:1px dashed var(--gold-dim);border-radius:8px;color:var(--gold);line-height:1.85">${ESC(b.text)}</div>`;
    }
    return h + `</div>`;
  }

  function render(root) {
    const tabs = GUIDE.map(function (g) {
      return `<button class="pill" data-m-tab="${g.id}" style="cursor:pointer">${ESC(g.tab)}</button>`;
    }).join(" ");
    root.innerHTML = `<div class="page">
      <div class="page-head">
        <div>
          <div class="eyebrow">METHOD · 方法讲义</div>
          <h1>方法讲义</h1>
          <div class="sub">从写作到阅读，十讲自学讲义：讲清概念、拆开步骤、看完整例子、动手自测。</div>
        </div>
        <div class="head-side"><span class="pill">${GUIDE.length} 讲</span></div>
      </div>
      <div class="chip-row" style="margin-bottom:16px;flex-wrap:wrap">${tabs}</div>
      <div id="methodBody"></div>
      <div class="mt24 small faint">内容重编自《能力》课程材料与课件：Essay Essentials、Argumentative Essay、Paragraph Development、Reasoning &amp; Evidence、Counterargument、Summarizing、Paraphrasing、Translation、APA Style、Reading Circles。本页纯查阅，不影响学习进度。</div>
    </div>`;
    const body = root.querySelector("#methodBody");
    function paint(id) {
      const g = GUIDE.find(function (x) { return x.id === id; }) || GUIDE[0];
      root.querySelectorAll("[data-m-tab]").forEach(function (btn) {
        const on = btn.getAttribute("data-m-tab") === g.id;
        btn.style.borderColor = on ? "var(--gold)" : "";
        btn.style.color = on ? "var(--gold)" : "";
      });
      const lead = (g.lead || []).map(function (x) {
        return `<div style="border-left:2px solid var(--gold);padding:2px 0 2px 12px;color:var(--ink-2);line-height:1.85;font-size:13px;margin-bottom:4px">${ESC(x)}</div>`;
      }).join("");
      body.innerHTML = `<div class="card card-pad">
        <div class="eyebrow">${ESC(g.en)}</div>
        <h2 style="font-size:20px;margin:6px 0 10px">${ESC(g.title)}</h2>
        ${lead}
        ${g.blocks.map(guideBlock).join("")}
      </div>`;
    }
    root.querySelectorAll("[data-m-tab]").forEach(function (btn) {
      btn.onclick = function () { paint(btn.getAttribute("data-m-tab")); };
    });
    paint(GUIDE[0].id);
  }

  /* 手机轻量版按需加载本文件，直接复用同一份讲义数据，不另存副本 */
  CILIN.METHOD_GUIDE = GUIDE;
  CILIN.views = CILIN.views || {};
  CILIN.views.method = { render: render };
})();
