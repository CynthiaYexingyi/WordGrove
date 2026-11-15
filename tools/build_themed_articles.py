#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""生成 3 篇 CET 阅读理解风格的主题精读文章（build/articles_themed.json）。

内容约定：
- 正文句子逐字复用 data/words.js 里各词的 ex.en；词卡点开仍是同一句，中文译文由
  tools/build_js.py 自动写入 data/sentzh.js（ex.en -> exZh）。
- 每段开头的过渡句为本脚本新写，其译文写入 build/sent_zh_extra.json。
- 目标词优先取「32 篇阅读文章未覆盖」的高频词 / 六级词，兼收屈折形式刚修复的词。
源数据是生成物，请勿手改 data/*.js 或 build/articles_themed.json。
用法: python tools/build_themed_articles.py
"""
import io
import json
import os

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
DATA = os.path.join(ROOT, "data")
BUILD = os.path.join(ROOT, "build")


def load_js(name):
    text = io.open(os.path.join(DATA, name), encoding="utf-8-sig").read()
    return json.loads(text[text.index("=") + 1:].strip().rstrip(";"))


# 过渡句：en -> zh。键供 SPECS 引用，英文会原样进入正文与 sentzh。
TRANS = {
    "T1": ("When prices rise faster than wages, households do not simply spend less; they change what they count as necessary.",
           "当物价涨得比工资快时，家庭并不只是少花钱，而是重新界定什么才算必需品。"),
    "T2": ("Economists note that such adjustments rarely happen at once, because contracts and budgets are signed months in advance.",
           "经济学家指出，这类调整很少一次到位，因为合同与预算往往提前数月就已签定。"),
    "T3": ("Governments, for their part, tend to respond with rules meant to steady the market rather than replace it.",
           "政府方面则倾向于用意在稳定市场、而非取代市场的规则来应对。"),
    "T4": ("Inside organisations, the same pressure appears in quieter ways: a postponed hire, a rewritten job description, a moved desk.",
           "在组织内部，同样的压力以更安静的方式显现：推迟的招聘、改写的岗位说明、被挪动的办公桌。"),
    "T5": ("Yet the evidence is mixed, and some firms report that a period of restraint can sharpen rather than weaken their routines.",
           "但证据并不一致：一些企业反映，一段收缩期反而让常规流程更精炼，而不是更松散。"),
    "T6": ("What survives, most observers agree, is less a set of prices than a habit of checking assumptions before committing to them.",
           "多数观察者同意，最终留下来的不是一套价格，而是在作出承诺前先核对假设的习惯。"),
    "U1": ("Public health researchers have long argued that a city's wellbeing is measured as much by its water and air as by its hospitals.",
           "公共卫生研究者早就指出，衡量一座城市的健康，水与空气和医院同样重要。"),
    "U2": ("The difficulty is that environmental damage is usually gradual, and those who notice it first are rarely those who cause it.",
           "难点在于环境损害通常是渐进的，而最先注意到它的人往往并不是造成它的人。"),
    "U3": ("Laboratory work helps, but only when its results can be translated into decisions that ordinary residents actually make.",
           "实验室工作有帮助，但前提是结果能转化成普通居民真正会做的决定。"),
    "U4": ("Everyday routines, from what people eat to how they clean a room, carry more weight than most surveys predict.",
           "从吃什么到怎样打扫房间，日常习惯的分量比多数调查预估的更重。"),
    "U5": ("Small accidents, too, reveal how little margin a busy household has when a single routine is interrupted.",
           "小意外同样说明，一旦某个日常环节被打断，忙碌家庭的余量有多么少。"),
    "U6": ("For that reason, the most effective programmes tend to be modest, local, and easy to repeat without specialist equipment.",
           "因此，最有效的项目往往朴素、本地化，而且不需要专业设备就能反复执行。"),
    "V1": ("Educational psychologists distinguish between what a student knows and what a student believes a task is allowed to cost.",
           "教育心理学把「学生知道什么」与「学生认为一项任务允许付出多少代价」区分开来。"),
    "V2": ("A single ambiguous comment, repeated often enough, can quietly redefine what a learner thinks is possible.",
           "一句含糊的评语，只要重复得够多，就能悄悄改写学习者对「可能」的边界。"),
    "V3": ("Teachers therefore watch not only marks but also the atmosphere in which those marks are handed back.",
           "因此教师关注的不只是分数，还有发还分数时的气氛。"),
    "V4": ("Family life adds another layer, since expectations travel home in ways no timetable records.",
           "家庭生活又添一层，因为期待回到家的方式，是任何课程表都记录不下来的。"),
    "V5": ("Longitudinal studies suggest that acknowledgement of effort predicts persistence better than praise of talent.",
           "纵向研究显示，对努力的认同比对天赋的称赞更能预测一个人能否坚持。"),
    "V6": ("The conclusion is not that confidence can be taught directly, but that it can be protected from unnecessary damage.",
           "结论并不是自信可以被直接教会，而是它可以被保护，免于不必要的损伤。"),
    "V7": ("A short conversation after class, by contrast, often does more than a long lecture on confidence.",
           "相比之下，课后一次简短的谈话，往往比一堂关于自信的长课更有用。"),
}

# 段内位置 -> (英文衔接词, 中文衔接词)。只给部分例句加，避免每段都像模板。
LINKERS = {
    1: ("For example, ", "例如，"),
    3: ("In another case, ", "在另一个案例中，"),
    5: ("Meanwhile, ", "与此同时，"),
    7: ("Similarly, ", "同样，"),
}

# ("w", 词) = 取该词 ex.en（可加衔接词）；("t", 键) = 插入过渡句
SPECS = [
    {
        "id": "t1",
        "title": "When Prices Rise, Everyday Work Changes",
        "subtitle": "CET 阅读风格 · 经济与工作 · 主题精读 1",
        "source": "主题精读 · 本站原创（例句取自站内词库）",
        "kind": "theme", "level": "cet6",
        "paras": [
            [("t", "T1"), ("w", "inflation"), ("w", "recession"), ("w", "estimate"), ("w", "quarter"), ("w", "consumption")],
            [("t", "T2"), ("w", "deficit"), ("w", "tariff"), ("w", "fluctuate"), ("w", "subsidy"), ("w", "monopoly"), ("w", "equilibrium"), ("w", "mortgage")],
            [("t", "T3"), ("w", "entrepreneur"), ("w", "commerce"), ("w", "corporate"), ("w", "contract"), ("w", "negotiate"), ("t", "T5")],
            [("t", "T4"), ("w", "administration"), ("w", "secretary"), ("w", "transfer"), ("w", "regulation"), ("w", "authority"), ("t", "T6")],
        ],
    },
    {
        "id": "t2",
        "title": "What Makes a City Healthy",
        "subtitle": "CET 阅读风格 · 环境与健康 · 主题精读 2",
        "source": "主题精读 · 本站原创（例句取自站内词库）",
        "kind": "theme", "level": "cet6",
        "paras": [
            [("t", "U1"), ("w", "compound"), ("w", "density"), ("w", "contaminate"), ("w", "immune"), ("w", "nutrition"), ("w", "diagnose"), ("w", "pose")],
            [("t", "U2"), ("w", "hinder"), ("w", "severe"), ("w", "freeze"), ("w", "therapy"), ("t", "U3")],
            [("t", "U4"), ("w", "appetite"), ("w", "portion"), ("w", "cancel"), ("w", "reserve"), ("w", "resident"), ("w", "furniture"), ("w", "item"), ("w", "sheet"), ("w", "stick")],
            [("t", "U5"), ("w", "tobacco"), ("w", "bury"), ("w", "dip"), ("w", "rub"), ("w", "splash"), ("w", "sprinkle"), ("w", "rip"), ("w", "intensify"), ("t", "U6")],
        ],
    },
    {
        "id": "t3",
        "title": "How Classrooms Shape Confidence",
        "subtitle": "CET 阅读风格 · 教育与心理 · 主题精读 3",
        "source": "主题精读 · 本站原创（例句取自站内词库）",
        "kind": "theme", "level": "cet4",
        "paras": [
            [("t", "V1"), ("w", "appeal"), ("w", "assignment"), ("w", "atmosphere"), ("w", "adolescent"), ("w", "acknowledge")],
            [("t", "V2"), ("w", "excellent"), ("w", "journal"), ("w", "margin"), ("w", "marvelous"), ("w", "stereotype"), ("w", "literacy"), ("t", "V5")],
            [("t", "V3"), ("w", "relieve"), ("w", "spouse"), ("w", "divorce"), ("w", "undermine"), ("t", "V7")],
            [("t", "V4"), ("w", "integrity"), ("w", "correlate"), ("w", "spur"), ("w", "rally"), ("t", "V6")],
        ],
    },
]


def main():
    words = load_js("words.js")
    by = {w["w"]: w for w in words}
    out, used, linked_zh = [], [], {}
    for a in SPECS:
        paragraphs, sentences, count = [], [], 0
        for para in a["paras"]:
            lines = []
            for idx, (kind, key) in enumerate(para):
                if kind == "w":
                    rec = by.get(key)
                    if not rec or not rec.get("ex") or not rec["ex"].get("en"):
                        raise SystemExit("missing ex.en for " + key)
                    if not rec.get("exZh"):
                        raise SystemExit("missing exZh for " + key)
                    en, zh = rec["ex"]["en"].strip(), rec["exZh"].strip()
                    linker = LINKERS.get(idx)
                    if linker and en[:1].isalpha():
                        en = linker[0] + en[0].lower() + en[1:]
                        linked_zh[en] = linker[1] + zh
                    used.append(key)
                else:
                    en = TRANS[key][0].strip()
                count += 1
                lines.append(en)
                sentences.append(en)
            paragraphs.append(" ".join(lines))
        wc = sum(len(p.split()) for p in paragraphs)
        if not (300 <= wc <= 700):
            print("  ! %s words=%d (CET passage 建议 300-700)" % (a["id"], wc))
        out.append({
            "id": a["id"], "title": a["title"], "subtitle": a["subtitle"],
            "source": a["source"], "kind": a["kind"], "level": a["level"],
            "paragraphs": paragraphs, "sentences": sentences,
        })
        print("%s: %d 段 / %d 句 / %d 词" % (a["id"], len(paragraphs), count, wc))

    dup = [w for w in set(used) if used.count(w) > 1]
    if dup:
        raise SystemExit("duplicate target words: " + ",".join(dup))

    p1 = os.path.join(BUILD, "articles_themed.json")
    with io.open(p1, "w", encoding="utf-8") as f:
        f.write(json.dumps(out, ensure_ascii=False, indent=2) + "\n")

    # 本脚本的译文单独放一份，绝不污染人工补译基线 sent_zh_extra.json；可重复运行
    themed_zh = {en: zh for en, zh in TRANS.values()}
    themed_zh.update(linked_zh)
    p2 = os.path.join(BUILD, "sent_zh_themed.json")
    with io.open(p2, "w", encoding="utf-8") as f:
        f.write(json.dumps(themed_zh, ensure_ascii=False, indent=2) + "\n")
    print("target words %d -> %s" % (len(used), p1))
    print("sent_zh_themed %d entries (过渡句 %d / 加衔接词的例句 %d)" % (len(themed_zh), len(TRANS), len(linked_zh)))


if __name__ == "__main__":
    main()
