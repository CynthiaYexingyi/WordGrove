#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""Step 1: 从 book 教材 PDF 构建课文语料（单元/文章/句子）。
输出: build/units.json, build/sentences.json
用法: python tools/build_corpus.py
依赖: pypdf（DSH 运行时已内置）
"""
import json
import os
import re
from pypdf import PdfReader

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))      # .../词林
WORKSPACE = os.path.dirname(os.path.dirname(ROOT))                       # .../英语
BOOK_PDF = os.path.join(WORKSPACE, "book", "Textbook Fall 2026  珠海校區本科英語講義.pdf")
BUILD = os.path.join(ROOT, "build")
os.makedirs(BUILD, exist_ok=True)

# 教材结构与标题（人工校对，来自 PDF 目录与正文）
UNITS = [
    {"id": "u1", "title": "Biography", "cn": "传记", "texts": [
        {"id": "u1a", "label": "Text A", "title": "William Henry Perkin",
         "subtitle": "The man who invented synthetic dyes"},
        {"id": "u1b", "label": "Text B", "title": "Alexander Henderson (1831-1913)", "subtitle": ""},
        {"id": "u1c", "label": "Text C", "title": "The Life and Work of Marie Curie", "subtitle": ""},
    ]},
    {"id": "u2", "title": "Play", "cn": "游戏", "texts": [
        {"id": "u2a", "label": "Text A", "title": "Play Is a Serious Business", "subtitle": ""},
        {"id": "u2b", "label": "Text B", "title": "The Importance of Children's Play", "subtitle": ""},
        {"id": "u2c", "label": "Text C", "title": "The Power of Play", "subtitle": ""},
    ]},
    {"id": "u3", "title": "Motivation", "cn": "动机", "texts": [
        {"id": "u3a", "label": "Text A", "title": "Motivational Factors and the Hospitality Industry", "subtitle": ""},
        {"id": "u3b", "label": "Text B", "title": "Motivating Employees under Adverse Conditions", "subtitle": ""},
        {"id": "u3c", "label": "Text C", "title": "Why Being Bored Is Stimulating—and Useful, too?", "subtitle": ""},
    ]},
    {"id": "u4", "title": "History", "cn": "历史", "texts": [
        {"id": "u4a", "label": "Text A", "title": "The Development of Museums", "subtitle": ""},
        {"id": "u4b", "label": "Text B", "title": "The History of Glass", "subtitle": ""},
        {"id": "u4c", "label": "Text C", "title": "The History of the Tortoise", "subtitle": ""},
    ]},
    {"id": "u5", "title": "Intelligence", "cn": "智力", "texts": [
        {"id": "u5a", "label": "Text A", "title": "The Concept of Intelligence", "subtitle": ""},
        {"id": "u5b", "label": "Text B", "title": "A Neuroscientist Reveals How to Think Differently", "subtitle": ""},
        {"id": "u5c", "label": "Text C", "title": "Ant Intelligence", "subtitle": ""},
    ]},
    {"id": "u6", "title": "Science", "cn": "科学", "texts": [
        {"id": "u6a", "label": "Text A", "title": "The Scientific Method", "subtitle": ""},
        {"id": "u6b", "label": "Text B", "title": "Case Study: Tourism New Zealand Website", "subtitle": ""},
        {"id": "u6c", "label": "Text C", "title": "Obtaining Linguistic Data", "subtitle": ""},
    ]},
    {"id": "u7", "title": "Books", "cn": "书籍", "texts": [
        {"id": "u7a", "label": "Text A", "title": "Book Review", "subtitle": ""},
        {"id": "u7b", "label": "Text B", "title": "Preface to ‘How the other half thinks: Adventures in mathematical reasoning’", "subtitle": ""},
        {"id": "u7c", "label": "Text C", "title": "What’s So Funny?", "subtitle": "John McCrone reviews recent research on humour"},
    ]},
]

TEXT_ORDER = [(u["id"], t["id"]) for u in UNITS for t in u["texts"]]

HEAD_UNIT = re.compile(r"^Unit\s+(\d+)\b")
HEAD_TEXT = re.compile(r"^TEXT\s+([ABC])$")
HEAD_EXERCISE = re.compile(r"^(Exercise\s*\d|List of|Step\s*\d|Aexander|Method of|Outcome:)")
WRITING_HEAD = re.compile(r"^Writing$")
# 正文末尾常混入练习指令：从这一行起截断整页
CUT_LINE = re.compile(
    r"^(Exercise\s*\d|List of|Step\s*\d|Do the following statements|Choose\s*ONE WORD|"
    r"Complete the (notes|summary|table|flow-chart)|Write\s*(TRUE|FALSE|the correct)|"
    r"Which (paragraph|section)|Answer the questions)", re.I
)


def cut_exercise(lines):
    for i, ln in enumerate(lines):
        if CUT_LINE.match(ln):
            return lines[:i]
    return lines

# 常见词形还原用的不规则变化（够用即可，匹配不到就放弃该例句）
IRREGULAR = {
    "be": ["is", "are", "was", "were", "been", "being", "am"],
    "have": ["has", "had", "having"],
    "do": ["does", "did", "done", "doing"],
    "go": ["goes", "went", "gone", "going"],
    "make": ["makes", "made", "making"],
    "take": ["takes", "took", "taken", "taking"],
    "give": ["gives", "gave", "given", "giving"],
    "find": ["finds", "found", "finding"],
    "think": ["thinks", "thought", "thinking"],
    "know": ["knows", "knew", "known", "knowing"],
    "see": ["sees", "saw", "seen", "seeing"],
    "come": ["comes", "came", "coming"],
    "get": ["gets", "got", "gotten", "getting"],
    "say": ["says", "said", "saying"],
    "tell": ["tells", "told", "telling"],
    "become": ["becomes", "became", "becoming"],
    "begin": ["begins", "began", "begun", "beginning"],
    "bring": ["brings", "brought", "bringing"],
    "buy": ["buys", "bought", "buying"],
    "choose": ["chooses", "chose", "chosen", "choosing"],
    "child": ["children", "child's", "children's"],
    "man": ["men"],
    "woman": ["women"],
    "person": ["people", "persons"],
    "life": ["lives"],
    "leaf": ["leaves"],
    "mouse": ["mice"],
    "foot": ["feet"],
    "tooth": ["teeth"],
    "write": ["writes", "wrote", "written", "writing"],
    "read": ["reads", "reading"],
    "speak": ["speaks", "spoke", "spoken", "speaking"],
    "teach": ["teaches", "taught", "teaching"],
    "grow": ["grows", "grew", "grown", "growing"],
    "hold": ["holds", "held", "holding"],
    "keep": ["keeps", "kept", "keeping"],
    "leave": ["leaves", "left", "leaving"],
    "lose": ["loses", "lost", "losing"],
    "mean": ["means", "meant", "meaning"],
    "meet": ["meets", "met", "meeting"],
    "pay": ["pays", "paid", "paying"],
    "run": ["runs", "ran", "running"],
    "sell": ["sells", "sold", "selling"],
    "send": ["sends", "sent", "sending"],
    "spend": ["spends", "spent", "spending"],
    "stand": ["stands", "stood", "standing"],
    "win": ["wins", "won", "winning"],
    "rise": ["rises", "rose", "risen", "rising"],
    "rise": ["rises", "rose", "risen", "rising"],
    "build": ["builds", "built", "building"],
    "catch": ["catches", "caught", "catching"],
    "feed": ["feeds", "fed", "feeding"],
    "fight": ["fights", "fought", "fighting"],
    "feel": ["feels", "felt", "feeling"],
    "hear": ["hears", "heard", "hearing"],
    "hide": ["hides", "hid", "hidden", "hiding"],
    "lead": ["leads", "led", "leading"],
    "learn": ["learns", "learnt", "learned", "learning"],
    "light": ["lights", "lit", "lighting"],
    "sleep": ["sleeps", "slept", "sleeping"],
    "draw": ["draws", "drew", "drawn", "drawing"],
    "drive": ["drives", "drove", "driven", "driving"],
    "eat": ["eats", "ate", "eaten", "eating"],
    "fall": ["falls", "fell", "fallen", "falling"],
    "forget": ["forgets", "forgot", "forgotten", "forgetting"],
    "freeze": ["freezes", "froze", "frozen", "freezing"],
    "hang": ["hangs", "hung", "hanging"],
    "lie": ["lies", "lay", "lain", "lying"],
    "ride": ["rides", "rode", "ridden", "riding"],
    "ring": ["rings", "rang", "rung", "ringing"],
    "seek": ["seeks", "sought", "seeking"],
    "shake": ["shakes", "shook", "shaken", "shaking"],
    "shoot": ["shoots", "shot", "shooting"],
    "sing": ["sings", "sang", "sung", "singing"],
    "sink": ["sinks", "sank", "sunk", "sinking"],
    "sit": ["sits", "sat", "sitting"],
    "steal": ["steals", "stole", "stolen", "stealing"],
    "strike": ["strikes", "struck", "striking"],
    "swim": ["swims", "swam", "swum", "swimming"],
    "throw": ["throws", "threw", "thrown", "throwing"],
    "understand": ["understands", "understood", "understanding"],
    "wake": ["wakes", "woke", "woken", "waking"],
    "wear": ["wears", "wore", "worn", "wearing"],
}

ABBREV = ["Mr.", "Mrs.", "Ms.", "Dr.", "Prof.", "St.", "e.g.", "i.e.", "etc.", "vs.",
          "No.", "Fig.", "al.", "a.m.", "p.m.", "U.S.", "U.K.", "A.D.", "B.C."]


def clean_text(s: str) -> str:
    s = s.replace("\u00ad", "")
    s = s.replace("ﬁ", "fi").replace("ﬂ", "fl").replace("ﬀ", "ff")
    s = s.replace("‘", "‘").replace("’", "’")
    s = re.sub(r"(\w)-\s*\n\s*(\w)", r"\1-\2", s)   # 行尾连字符
    s = re.sub(r"[ \t]+", " ", s)
    s = re.sub(r"\s+([,.;:!?])", r"\1", s)
    return s.strip()


def page_lines(pdf_path):
    reader = PdfReader(pdf_path)
    pages = {}
    for i, pg in enumerate(reader.pages):
        txt = pg.extract_text() or ""
        lines = [ln.strip() for ln in txt.splitlines() if ln.strip()]
        pages[i + 1] = lines
    return pages


def split_sentences(block: str):
    """对段落做保守分句：先保护缩写与编号，再按句末标点切。"""
    s = clean_text(block)
    # 段落编号与正文粘连的情况："4.At the time" -> "4. At the time"
    s = re.sub(r"(?<!\d)(\d{1,2})\.(?=[A-Z“'‘])", r"\1. ", s)
    # 上一句句末 + 段号："…chemistry. 2.As a student" -> "…chemistry. As a student"
    s = re.sub(r"(?<=[.!?])\s+\d{1,2}\.\s*(?=[A-Z“'‘])", " ", s)
    # 去掉页眉残留的孤立数字（"…find. 6"）
    s = re.sub(r"(?<=[.?!])\s+\d{1,3}\s*$", "", s)
    # 保护很短的句号用法
    tokens = {}
    for i, ab in enumerate(ABBREV):
        key = f"@@{i}@@"
        tokens[key] = ab
        s = s.replace(ab, key)
    s = re.sub(r"\b([A-Z])\.\s*(?=[A-Z])", r"\1@@INIT@@", s)  # 缩写式大写字母
    # 编号（1. 2.）不作为句号
    s = re.sub(r"(?<!\d)(\d{1,2})\.\s+(?=[A-Z])", r"\1@@NUM@@", s)
    parts = re.split(r"(?<=[.!?])\s+(?=[A-Z‘“\"'])", s)
    out = []
    for p in parts:
        p = p.strip()
        for key, ab in tokens.items():
            p = p.replace(key, ab)
        p = p.replace("@@INIT@@", ".").replace("@@NUM@@", ".")
        if p:
            out.append(p)
    return out


def assemble_text(lines):
    """按教材段落编号（1. 2. 3. ...）还原段落；无编号时按句群近似分组。"""
    cleaned = []
    for ln in lines:
        t = ln.strip()
        if not t:
            continue
        if re.fullmatch(r"\d{1,3}", t):
            continue
        if re.match(r"^(TEXT\s+[ABC]|Unit\s+\d+)\s*$", t):
            continue
        cleaned.append(t)
    paras, cur, expected, markers = [], [], 1, 0
    for t in cleaned:
        m = re.match(r"^(\d{1,2})[.)]?\s+(.*)$", t)
        if m and int(m.group(1)) == expected and m.group(2).strip():
            markers += 1
            if cur:
                paras.append(" ".join(cur))
            cur = [m.group(2).strip()]
            expected += 1
        else:
            cur.append(t)
    if cur:
        paras.append(" ".join(cur))
    paras = [re.sub(r"\s+", " ", p).strip() for p in paras if p.strip()]
    # 编号不足：退化为按句群分组
    if markers < 2:
        joined = clean_text(" ".join(cleaned))
        sents = [x for x in split_sentences(joined)]
        paras, cur, wc = [], [], 0
        for x in sents:
            cur.append(x)
            wc += len(x.split())
            if wc >= 90 or len(cur) >= 5:
                paras.append(" ".join(cur))
                cur, wc = [], 0
        if cur:
            paras.append(" ".join(cur))
    # 段落内分句，并去掉段首/句中残留的段落编号
    para_list, sents_out = [], []
    for p in paras:
        p = re.sub(r"^\d{1,2}[.)]?\s+(?=[A-Z\"‘’'])", "", p)
        p = re.sub(r"\s+\d{1,2}[.)]?\s+(?=[A-Z\"‘’']{2,})", " ", p)
        p = clean_text(p)
        ss = split_sentences(p)
        ss = [re.sub(r"^\d{1,2}[.)]?\s*", "", x).strip() for x in ss]
        ss = [x for x in ss if x]
        if ss:
            para_list.append(" ".join(ss))
            sents_out.extend(ss)
    return para_list, sents_out, markers


def build_corpus():
    pages = page_lines(BOOK_PDF)
    # 扫描页面，定位每篇文章的页码范围
    state = None            # {"unit": u1, "text": u1a}
    exercise = False
    texts = {t["id"]: {"pages": [], "paragraph_lines": []} for _, t in
             [(u["id"], t) for u in UNITS for t in u["texts"]]}
    order = []

    for pno in sorted(pages):
        raw = pages[pno]
        if not raw:
            continue
        # 去掉页码行（页面顶部/底部的纯数字）
        lines = [ln for ln in raw if not re.fullmatch(r"\d{1,3}", ln)]
        if not lines:
            continue
        if WRITING_HEAD.match(lines[0]) or lines[0].startswith("Writing"):
            break
        head = lines[:6]
        m_unit = None
        for ln in head:
            mm = HEAD_UNIT.match(ln)
            if mm:
                m_unit = mm
                break
        m_text = None
        for ln in head:
            mm = HEAD_TEXT.match(ln)
            if mm:
                m_text = mm
                break
        if m_text:
            # 新 Text 开始（可能同页给出 Unit 标题）
            if m_unit:
                unit_no = int(m_unit.group(1))
            elif state:
                unit_no = state["unit_no"]
            else:
                unit_no = 1
            letter = m_text.group(1)
            unit = UNITS[unit_no - 1]
            text = unit["texts"]["ABC".index(letter)]
            state = {"unit_id": unit["id"], "unit_no": unit_no, "text_id": text["id"]}
            exercise = False
            cur = texts[text["id"]]
            cur["pages"].append(pno)
            order.append(text["id"])
            # 记录标题行之后的内容
            idx = lines.index(m_text.group(0))
            body = lines[idx + 1:]
            # 去掉标题/副标题行、以及同页重复的 Unit 行
            while body:
                ln = body[0]
                norm = re.sub(r"\W", "", ln.lower())
                if norm == re.sub(r"\W", "", text["title"].lower()) or \
                   (text["subtitle"] and norm == re.sub(r"\W", "", text["subtitle"].lower())) or \
                   HEAD_UNIT.match(ln):
                    body = body[1:]
                    continue
                break
            cur["paragraph_lines"].extend(cut_exercise(body))
            continue

        if state is None:
            continue
        if HEAD_EXERCISE.match(lines[0]):
            exercise = True
        if exercise:
            continue
        texts[state["text_id"]]["pages"].append(pno)
        texts[state["text_id"]]["paragraph_lines"].extend(cut_exercise(lines))

    # 组装文本 + 分句
    units_out = []
    sentences = []
    for unit in UNITS:
        u_rec = {"id": unit["id"], "title": unit["title"], "cn": unit["cn"], "texts": []}
        for text in unit["texts"]:
            rec = texts.get(text["id"], {"paragraph_lines": []})
            # 只保留正文行：句子以大写/数字/引号开头
            paras, raw_sents, markers = assemble_text(rec["paragraph_lines"])
            clean_paras, uniq, seen = [], [], set()
            for p in paras:
                kept = []
                for x in split_sentences(p):
                    x = re.sub(r"^\d{1,2}[.)]?\s*", "", x).strip()
                    x = re.sub(r"\s+\d{1,3}$", "", x)
                    x = re.sub(r"\s{2,}", " ", x).strip()
                    wc = len(re.findall(r"[A-Za-z][A-Za-z'’-]*", x))
                    if not (4 <= wc <= 45 and re.search(r"[a-z]", x) and not re.search(r"\.{3,}", x)):
                        continue
                    if re.match(r"^[A-Z]\.[A-Z]", x) or re.search(r"\b[A-Z]\.[A-Z]", x):
                        continue
                    if x[0].islower():
                        x = x[0].upper() + x[1:]
                    x = re.sub(r"^(KEY POINT [A-Z]+|THE CHALLENGE|Exercise\s*\d+:?)\s+", "", x)
                    k = re.sub(r"\W+", "", x.lower())[:120]
                    if k in seen:
                        continue
                    seen.add(k)
                    kept.append(x)
                    uniq.append(x)
                if kept:
                    clean_paras.append(" ".join(kept))
            if not clean_paras and uniq:
                clean_paras = [" ".join(uniq)]
            block = " ".join(clean_paras)
            t_rec = {"id": text["id"], "label": text["label"], "title": text["title"],
                     "subtitle": text["subtitle"], "unit": unit["id"],
                     "unitTitle": unit["title"], "unitCn": unit["cn"],
                     "pages": rec.get("pages", []), "words": len(re.findall(r"[A-Za-z][A-Za-z'’-]*", block)),
                     "paragraphs": paras,
                     "sentences": uniq, "markers": markers}
            u_rec["texts"].append(t_rec)
            for s in uniq:
                sentences.append({"text": s, "textId": text["id"], "unit": unit["id"],
                                  "src": f"{unit['cn']} Unit {unit['id'][1]} · {text['label']} · {text['title']}"})
        units_out.append(u_rec)

    with open(os.path.join(BUILD, "units.json"), "w", encoding="utf-8") as f:
        json.dump(units_out, f, ensure_ascii=False, indent=1)
    with open(os.path.join(BUILD, "sentences.json"), "w", encoding="utf-8") as f:
        json.dump(sentences, f, ensure_ascii=False, indent=0)
    print("texts:", sum(len(u['texts']) for u in units_out))
    for u in units_out:
        for t in u["texts"]:
            print(f"  {t['id']}: {t['title'][:44]:44s} pages={t['pages'][:1]}..{t['pages'][-1:] if t['pages'] else '?'} words={t['words']:5d} sents={len(t['sentences'])}")
    print("total sentences", len(sentences))


if __name__ == "__main__":
    build_corpus()
