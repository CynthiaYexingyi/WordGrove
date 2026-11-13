#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""生成新题型兜底数据：三选一、15 词匹配、U1-U4 Text A 翻译/paraphrase。
当 build/new_training.json 尚未由编辑交付时，build_js 使用本文件。
"""
import json
import os
import random
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BUILD = os.path.join(ROOT, "build")
random.seed(20261109)

with open(os.path.join(BUILD, "units.json"), encoding="utf-8") as f:
    units = json.load(f)
with open(os.path.join(BUILD, "words.json"), encoding="utf-8") as f:
    words = json.load(f)
wm = {w["w"]: w for w in words}
texts = {t["id"]: t for u in units for t in u["texts"]}
U14A = ["u1a", "u2a", "u3a", "u4a"]

STOP = {"the", "and", "that", "with", "this", "from", "have", "were", "their", "which", "would", "there", "about", "these", "other", "into", "more", "than", "them", "been", "when", "what", "your", "such", "also", "only", "some", "most", "over", "very", "much", "many", "even", "because", "while", "where", "after", "before", "through", "between", "under", "during", "without", "within", "per"}


def word_tokens(s):
    return re.findall(r"[A-Za-z][A-Za-z'’-]*", s)


def candidate_words(sentence):
    out = []
    for tok in word_tokens(sentence):
        low = tok.lower()
        if low in wm and low not in STOP and 4 <= len(low) <= 14:
            out.append((tok, low))
    return out


def replace_once(sentence, target):
    return re.sub(r"\b" + re.escape(target) + r"\b", "___", sentence, count=1, flags=re.I)


# ---------- cloze3 ----------
cloze3 = []
for tid in U14A:
    t = texts[tid]
    made = 0
    for sent in t["sentences"]:
        if made >= 4:
            break
        cands = candidate_words(sent)
        if not cands:
            continue
        # 优先取句中较长的实词，避免选到句首专名
        tok, low = max(cands, key=lambda x: len(x[1]))
        if tok[0].isupper() and sent.find(tok) < 3:
            continue
        if sent.count(tok) > 2:
            continue
        stem = replace_once(sent, tok)
        if "___" not in stem:
            continue
        pool = [x for x in wm if x != low and len(x) >= 4 and abs(len(x) - len(low)) <= 4]
        random.shuffle(pool)
        distract = [x for x in pool if x not in (low,)][:2]
        if len(distract) < 2:
            continue
        opts = [low] + distract
        random.shuffle(opts)
        cloze3.append({
            "id": "c3-" + tid + "-" + str(made + 1),
            "unit": tid[:2],
            "source": t["title"] + " · " + t["label"],
            "stem": stem,
            "options": opts,
            "answer": opts.index(low),
            "explain": low + "：" + (wm[low].get("mean") or wm[low].get("zh") or ""),
        })
        made += 1

# ---------- match15 ----------
match15 = []
for tid in U14A:
    t = texts[tid]
    used = set()
    items = []
    for sent in t["sentences"]:
        if len(items) >= 15:
            break
        cands = candidate_words(sent)
        if not cands:
            continue
        for tok, low in sorted(cands, key=lambda x: -len(x[1])):
            if low in used:
                continue
            stem = replace_once(sent, tok)
            if "___" not in stem:
                continue
            items.append({"no": len(items) + 1, "stem": stem, "answer": low})
            used.add(low)
            break
    if len(items) >= 15:
        match15.append({
            "id": "m15-" + tid,
            "title": t["title"],
            "source": t["title"] + " · " + t["label"],
            "words": [x["answer"] for x in items],
            "items": items,
            "explain": "答案均来自 " + t["title"] + " 原文。",
        })

# ---------- translation U1-U4 Text A ----------
TRANS = [
    ("u1a", "But it was a chance stumbling upon a run-down, yet functional, laboratory in his late grandfather’s home that solidified the young man’s enthusiasm for chemistry."),
    ("u1a", "Not long after that, Perkin made the scientific breakthrough that would bring him both fame and fortune."),
    ("u2a", "Play may look like a carefree and exuberant way to pass the time before the hard work of adulthood comes along, but there’s much more to it than that."),
    ("u2a", "Not only is more of the brain involved in play than was suspected, but it also seems to activate higher cognitive processes."),
    ("u3a", "A critical ingredient in the success of hotels is developing and maintaining superior performance from their employees."),
    ("u3a", "It is therefore essential for hotel management to develop HRM practices that enable them to inspire and retain competent employees."),
    ("u4a", "The conviction that historical relics provide infallible testimony about the past is rooted in the nineteenth and early twentieth centuries, when science was regarded as objective and value free."),
    ("u4a", "Human bias is inevitable, but another source of bias in the representation of history has to do with the transitory nature of the materials themselves."),
]
sent_zh = {}
p = os.path.join(BUILD, "sent_zh_extra.json")
if os.path.exists(p):
    sent_zh.update(json.load(open(p, encoding="utf-8")))
for tid, en in TRANS:
    t = texts[tid]
    zh = sent_zh.get(en)
    if not zh:
        # 用同篇最近的句子译文兜底：保留英文原文作 reference，中文由人工/模型写
        zh = ""
    TRANS_ITEM = {
        "id": "tr-" + tid + "-" + str(len([x for x in TRANS if x[0] == tid and TRANS.index(x) < TRANS.index((tid, en))]) + 1),
        "unit": tid[:2],
        "title": t["title"] + " · 句子翻译",
        "zh": zh,
        "reference": en,
        "source": "Text A · 课件/教材代表句",
    }
    # 空译文会导致题面空，手工补几个关键句
    if not zh:
        fallback = {
            "u1a": "不久之后，珀金便取得了那项将同时带给他名望与财富的科学突破。",
            "u2a": "玩耍也许看起来只是成年后辛苦劳作到来之前，一种无忧无虑、生机勃勃的消磨时光的方式，但它远不止于此。",
            "u3a": "酒店成功的一个关键要素，是培养并维持员工的卓越表现。",
            "u4a": "人们相信历史文物能为过去提供可靠无误的证词，这种信念植根于十九世纪和二十世纪初——那时科学被视为客观且价值中立的。",
        }
        zh = fallback.get(tid, "")
    TRANS_ITEM["zh"] = zh

translation = []
for idx, (tid, en) in enumerate(TRANS, 1):
    t = texts[tid]
    zh = sent_zh.get(en)
    if not zh:
        zh = {
            "u1a": "不久之后，珀金便取得了那项将同时带给他名望与财富的科学突破。",
            "u2a": "玩耍也许看起来只是成年后辛苦劳作到来之前，一种无忧无虑、生机勃勃的消磨时光的方式，但它远不止于此。",
            "u3a": "酒店成功的一个关键要素，是培养并维持员工的卓越表现。",
            "u4a": "人们相信历史文物能为过去提供可靠无误的证词，这种信念植根于十九世纪和二十世纪初——那时科学被视为客观且价值中立的。",
        }.get(tid, "")
    translation.append({
        "id": "tr-" + tid + "-" + str(idx),
        "unit": tid[:2],
        "title": t["title"] + " · 句子翻译",
        "zh": zh,
        "reference": en,
        "source": "Text A · 课件/教材代表句",
    })

# ---------- paraphrase U1-U4 Text A ----------
PP = [
    ("u1a", "But it was a chance stumbling upon a run-down, yet functional, laboratory in his late grandfather’s home that solidified the young man’s enthusiasm for chemistry.",
     "What truly deepened the young man’s passion for chemistry was an accidental discovery: a shabby but still usable laboratory in his late grandfather’s house.",
     "强调句拆开，chance → accidental discovery，solidified → deepened"),
    ("u1a", "Perkin’s scientific gifts soon caught Hofmann’s attention and, within two years, he became Hofmann’s youngest assistant.",
     "Hofmann quickly noticed Perkin’s scientific talent; before two years had passed, the young man had become his youngest assistant.",
     "主动语态 + 时间状语前置，gifts → talent"),
    ("u2a", "Play may look like a carefree and exuberant way to pass the time before the hard work of adulthood comes along, but there’s much more to it than that.",
     "At first glance, play seems merely a light-hearted way to fill the years before adult responsibilities begin; in fact, it serves far more purposes.",
     "转折结构重组，carefree and exuberant → light-hearted，much more → far more purposes"),
    ("u2a", "Not only is more of the brain involved in play than was suspected, but it also seems to activate higher cognitive processes.",
     "Play engages more brain areas than researchers previously expected, and it appears to stimulate higher-level thinking as well.",
     "倒装还原 + 被动改主动，activate → stimulate"),
    ("u3a", "It is therefore essential for hotel management to develop HRM practices that enable them to inspire and retain competent employees.",
     "Hotel managers must therefore create human-resource practices that help them motivate and keep capable staff.",
     "it is essential 改为 must，develop → create，competent → capable"),
    ("u3a", "Significantly, though, just fulfilling these needs does not result in satisfaction, but only in the reduction of dissatisfaction.",
     "Crucially, however, meeting these needs does not produce satisfaction; it merely lessens dissatisfaction.",
     "fulfilling → meeting，result in → produce，only → merely"),
    ("u4a", "The conviction that historical relics provide infallible testimony about the past is rooted in the nineteenth and early twentieth centuries, when science was regarded as objective and value free.",
     "The belief that historical objects offer flawless evidence of the past originated in the nineteenth and early twentieth centuries, an era that treated science as objective and neutral.",
     "同位语从句拆句，infallible → flawless，value free → neutral"),
    ("u4a", "Human bias is inevitable, but another source of bias in the representation of history has to do with the transitory nature of the materials themselves.",
     "Bias is unavoidable in human accounts, yet historical representation is also shaped by a second factor: the materials that survive are themselves temporary.",
     "inevitable → unavoidable，has to do with → is shaped by，transitory → temporary"),
]
paraphrase = []
for idx, (tid, orig, ref, tech) in enumerate(PP, 1):
    t = texts[tid]
    paraphrase.append({
        "id": "pp-" + tid + "-" + str(idx),
        "unit": tid[:2],
        "title": t["title"] + " · Paraphrase",
        "original": orig,
        "reference": ref,
        "technique": tech,
        "source": "Text A · 据课件 paraphrasing 方法改写",
    })

out = {
    "cloze3": cloze3,
    "match15": match15,
    "translation_u14a": translation,
    "paraphrase_u14a": paraphrase,
}
with open(os.path.join(BUILD, "new_training_manual.json"), "w", encoding="utf-8") as f:
    json.dump(out, f, ensure_ascii=False, indent=1)
print("cloze3", len(cloze3), "match15", [(m["id"], len(m["items"])) for m in match15],
      "translation", len(translation), "paraphrase", len(paraphrase))
