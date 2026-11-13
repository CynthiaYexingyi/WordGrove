#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""备选：从六级真题 PDF 中提取 Section C 阅读文章（Lead 手动兜底）。
输出 build/articles_manual.json
"""
import json
import os
import re
from pypdf import PdfReader

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WORKSPACE = os.path.dirname(os.path.dirname(ROOT))
BUILD = os.path.join(ROOT, "build")
BASE = os.path.join(WORKSPACE, "四六级")

SOURCES = [
    ("2025.12六级真题第1套.pdf", "2025.12 六级真题 第1套"),
    ("2025.12六级真题第2套.pdf", "2025.12 六级真题 第2套"),
    ("2025.12六级真题第3套.pdf", "2025.12 六级真题 第3套"),
    ("2025.06六级真题第1套.pdf", "2025.06 六级真题 第1套"),
    ("2025.06六级真题第2套.pdf", "2025.06 六级真题 第2套"),
    ("2025.06六级真题第3套.pdf", "2025.06 六级真题 第3套"),
]

HEADER = re.compile(
    r"(六级真题|大学英语|Directions|Section [A-C]|^Part\s+(I|II|III|IV|V)\b|Reading Comprehension|"
    r"Questions?\s+\d+|^\s*Passage (One|Two)\s*$|Answer Sheet|^\d{1,3}\s*$)", re.I
)
OPTION = re.compile(r"^\s*[A-D][).]\s")
QNUM = re.compile(r"\n\s*(4[6-9]|5[0-5])\.\s")
SENT_SPLIT = re.compile(r"(?<=[.!?])\s+(?=[A-Z\"'‘“])")


def clean_text(t):
    t = t.replace("— —", "—").replace("——", "—")
    t = t.replace("^^", '"').replace("“", '"').replace("”", '"')
    t = t.replace("o f", "of").replace("fo r", "for").replace("in to", "into")
    t = t.replace("Thafs", "That's").replace("thafs", "that's").replace("Ifs", "It's").replace("lefs", "let's")
    t = t.replace("fbr", "for").replace("UI believe", "I believe")
    t = re.sub(r"\b([A-Za-z]+)\.,5", r'\1."', t)
    t = re.sub(r"[ \t]+", " ", t)
    t = re.sub(r"\n\s*\n+", "\n", t)
    return t.strip()


def extract(path):
    r = PdfReader(path)
    if r.is_encrypted:
        r.decrypt("")
    pages = [(p.extract_text() or "") for p in r.pages]
    text = clean_text("\n".join(pages))
    # 从阅读部分开始找（避免听力 Section C）
    start_reading = max(text.find("Reading Comprehension"), text.find("Part JU Reading"))
    scan_from = start_reading if start_reading >= 0 else 0
    out = []
    for m in re.finditer(r"Passage\s+(One|Two)", text[scan_from:]):
        marker_pos = scan_from + m.start()
        start = scan_from + m.end()
        # 跳过 Questions ... are based on ... 行，定位 following passage
        fm = re.search(r"following passage[.!]?", text[start:start + 300], re.I)
        if fm:
            start += fm.end()
        # 结束：下一道题的编号行（46. / 51.）
        qm = QNUM.search(text, start)
        end = qm.start() if qm else len(text)
        # 不能越过下一个 Passage
        nm = re.search(r"Passage\s+(One|Two)", text[start:])
        if nm:
            end = min(end, start + nm.start())
        block = clean_text(text[start:end])
        # 按行去掉页眉页脚/选项
        lines = []
        for ln in block.splitlines():
            s = ln.strip()
            if not s:
                continue
            if HEADER.search(s):
                continue
            if OPTION.match(s):
                continue
            lines.append(s)
        body = " ".join(lines)
        body = re.sub(r"\s{2,}", " ", body).strip()
        if len(body.split()) < 200:
            continue
        # 段落：按句子分组，约 3–5 句
        sents = [s.strip() for s in SENT_SPLIT.split(body) if len(s.strip().split()) >= 4]
        if len(sents) < 4:
            continue
        paras, cur, wc = [], [], 0
        for s in sents:
            cur.append(s)
            wc += len(s.split())
            if wc >= 85 or len(cur) >= 5:
                paras.append(" ".join(cur))
                cur, wc = [], 0
        if cur:
            paras.append(" ".join(cur))
        out.append({
            "title": "Passage " + m.group(1),
            "paragraphs": paras,
            "sentences": sents,
            "words": len(body.split()),
        })
    return out


def main():
    articles = []
    idx = 0
    for fn, label in SOURCES:
        path = os.path.join(BASE, fn)
        if not os.path.exists(path):
            print("missing", fn)
            continue
        try:
            arr = extract(path)
            print(fn, "passages", len(arr), [(a["title"], a["words"]) for a in arr])
        except Exception as e:
            print("ERR", fn, e)
            continue
        for a in arr:
            idx += 1
            articles.append({
                "id": "m" + str(idx),
                "title": a["title"],
                "subtitle": label + " · " + a["title"],
                "source": label,
                "kind": "exam",
                "level": "cet6",
                "paragraphs": a["paragraphs"],
                "sentences": a["sentences"],
            })
    with open(os.path.join(BUILD, "articles_manual.json"), "w", encoding="utf-8") as f:
        json.dump(articles, f, ensure_ascii=False, indent=1)
    print("wrote", len(articles), "articles")


if __name__ == "__main__":
    main()
