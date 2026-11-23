#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""从课件内嵌 DOCX 的「难词表 / 词汇讲解」提取条目，生成 build/vocab_notes.json。

挂到词卡：按英文词/搭配的单个词命中词库 headword（小写）建立映射。
表格型：第一列英文、第二列中文、第三列简要说明。
散文型（Unit6/7 Document9 等）："N. word (pos.)" + "Chinese:" + "Meaning:"。
生成物勿手改。
"""
import json, os, re, io, zipfile, glob, html

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WS = os.path.dirname(ROOT)  # 四六级/
COURSEWARE = os.path.join(os.path.dirname(WS), "课件")
DATA = os.path.join(ROOT, "data")
BUILD = os.path.join(ROOT, "build")

# (pptx 文件名, 内嵌 docx, 单元)
SOURCES = [
    ("Unit 1 Biographies.pptx", "Document4", "u1"),
    ("Unit+2+Play.pptx", "Document4", "u2"),
    ("Unit+2+Play.pptx", "Document7", "u2"),
    ("Unit+2+Play.pptx", "Document10", "u2"),
    ("Unit 3 Motivation(7).pptx", "Document3", "u3"),
    ("Unit+3+Motivation.pptx", "Document3", "u3"),
    ("Unit 5 Intelligence(2).pptx", "Document4", "u5"),
    ("Unit 5 Intelligence(2).pptx", "Document7", "u5"),
    ("Unit 5 Intelligence(2).pptx", "Document10", "u5"),
    ("Unit 6 Science(1).pptx", "Document3", "u6"),
    ("Unit 6 Science(1).pptx", "Document6", "u6"),
    ("Unit 6 Science(1).pptx", "Document9", "u6"),
    ("Unit 7 Books(1).pptx", "Document3", "u7"),
    ("Unit 7 Books(1).pptx", "Document6", "u7"),
    ("Unit 7 Books(1).pptx", "Document9", "u7"),
]


def celltext(c):
    return html.unescape("".join(re.findall(r"<w:t(?:\s[^>]*)?>([^<]*)</w:t>", c))).strip()


def paras(xml):
    x = re.sub(r"</w:p>", "\n", xml)
    x = re.sub(r"<w:tab[^>]*/>", " ", x)
    t = html.unescape(re.sub(r"<[^>]+>", "", x))
    return [l.strip() for l in t.split("\n") if l.strip()]


def extract_table(doc):
    """返回 [(term, zh, note)]"""
    zz = zipfile.ZipFile(io.BytesIO(doc))
    xml = zz.read("word/document.xml").decode("utf-8", "ignore")
    rows = re.findall(r"<w:tr[ >].*?</w:tr>", xml, re.S)
    out = []
    for r in rows:
        cells = [celltext(c) for c in re.findall(r"<w:tc[ >].*?</w:tc>", r, re.S)]
        if len(cells) < 2:
            continue
        term = cells[0]
        if not term or len(term) > 60:
            continue
        if re.search(r"詞|词|word|english|term|原詞|原词|释義|釋義|釋義", term, re.I):
            continue  # 表头
        if not re.search(r"[A-Za-z]", term):
            continue
        zh = cells[1] if len(cells) > 1 else ""
        note = cells[2] if len(cells) > 2 else ""
        out.append((term, zh, note))
    return out


def extract_prose(doc):
    """散文型：N. term (pos.) / Chinese: x / Meaning: y"""
    zz = zipfile.ZipFile(io.BytesIO(doc))
    xml = zz.read("word/document.xml").decode("utf-8", "ignore")
    lines = paras(xml)
    out = []
    cur = None
    for l in lines:
        m = re.match(r"^(\d+)[\.、]\s+(.{2,60}?)(?:\s*\((?:n|v|adj|adv|phr)[^)]*\))?\s*$", l)
        if m:
            if cur:
                out.append(cur)
            cur = {"term": m.group(2).strip(), "zh": "", "note": ""}
            continue
        if cur is None:
            continue
        if l.lower().startswith("chinese:"):
            cur["zh"] = l.split(":", 1)[1].strip()
        elif l.lower().startswith("meaning:"):
            cur["note"] = l.split(":", 1)[1].strip()
        elif l.lower().startswith("context:"):
            ctx = l.split(":", 1)[1].strip()
            cur["note"] = (cur["note"] + " " if cur["note"] else "") + ctx
    if cur:
        out.append(cur)
    return [(o["term"], o["zh"], o["note"]) for o in out if o["term"]]


GLOSS_SKIP = re.compile(
    r"^(Quick Gloss|中文翻译|中文讲解|Page\s|Here are|Difficult Phrases|Overview)", re.I
)


def extract_gloss(doc):
    """散文型（Unit1/Document4）：词条行 + Quick Gloss / 中文翻译 / 中文讲解。"""
    zz = zipfile.ZipFile(io.BytesIO(doc))
    xml = zz.read("word/document.xml").decode("utf-8", "ignore")
    lines = paras(xml)
    out, cur = [], None

    def flush():
        if cur and (cur["zh"] or cur["note"] or cur["gloss"]):
            out.append((cur["term"], cur["zh"],
                        " ".join(x for x in (cur["gloss"], cur["note"]) if x)))

    for l in lines:
        if l.lower().startswith("quick gloss:"):
            if cur:
                cur["gloss"] = l.split(":", 1)[1].strip()
            continue
        if l.startswith("中文翻译:"):
            if cur:
                cur["zh"] = l.split(":", 1)[1].strip()
            continue
        if l.startswith("中文讲解:"):
            if cur:
                cur["note"] = l.split(":", 1)[1].strip()
            continue
        if GLOSS_SKIP.match(l) or ":" in l or not re.search(r"[A-Za-z]", l):
            continue
        if len(l) > 60:
            continue
        flush()
        cur = {"term": l.strip(), "zh": "", "note": "", "gloss": ""}
    flush()
    return out


STOP = set("""a an the and or but of in on at to for from by with without into onto over under
between among about as is are was were be been being this that these those it its their his her
not no nor so than then if while when where which who whom what how all any some more most many
much few each every both either neither one two three first last own same such only just also very
can could will would may might must shall should do does did done have has had having get gets got
we you they he she i me him them us our your my there here""".split())


IRREGULAR = {
    "took": "take", "went": "go", "gone": "go", "made": "make", "wrote": "write",
    "written": "write", "built": "build", "felt": "feel", "found": "find",
    "gave": "give", "given": "give", "knew": "know", "known": "know",
    "left": "leave", "lost": "lose", "met": "meet", "paid": "pay",
    "ran": "run", "saw": "see", "seen": "see", "said": "say",
    "thought": "think", "brought": "bring", "bought": "buy", "caught": "catch",
    "taught": "teach", "held": "hold", "kept": "keep", "led": "lead",
    "read": "read", "sold": "sell", "sent": "send", "spent": "spend",
    "stood": "stand", "understood": "understand", "began": "begin",
    "became": "become", "came": "come", "did": "do", "done": "do",
    "had": "have", "was": "be", "were": "be", "been": "be", "is": "be", "are": "be",
}


def lemma_candidates(w):
    """给出可能的词元原形，优先级从高到低。"""
    out = [w]
    if w in IRREGULAR:
        out.append(IRREGULAR[w])
    if w.endswith("ies") and len(w) > 4:
        out.append(w[:-3] + "y")
    if w.endswith("ied") and len(w) > 4:
        out.append(w[:-3] + "y")
    if w.endswith("es") and len(w) > 3:
        out += [w[:-2], w[:-1]]
    if w.endswith("s") and len(w) > 3 and not w.endswith("ss"):
        out.append(w[:-1])
    if w.endswith("ed") and len(w) > 3:
        out += [w[:-1], w[:-2]]
        if len(w) > 4 and w[-3] == w[-4]:
            out.append(w[:-3])
    if w.endswith("ing") and len(w) > 4:
        out += [w[:-3], w[:-3] + "e"]
        if w[-4] == w[-5]:
            out.append(w[:-4])
    return out


def headwords(term, bank):
    """从英文词/搭配里取内容词，还原成词库中的 headword。"""
    words = re.findall(r"[A-Za-z][A-Za-z\-']*", term)
    content = [w.lower() for w in words if len(w) > 2 and w.lower() not in STOP]
    out = []
    for w in content[:6]:
        for c in lemma_candidates(w):
            if c in bank:
                if c not in out:
                    out.append(c)
                break
    # 单个搭配最多挂 4 个 headword，避免噪声
    return out[:4]


def main():
    s = io.open(os.path.join(DATA, "words.js"), encoding="utf-8").read()
    bank = set(w["w"].lower() for w in json.loads(re.search(r"=\s*(\[.*\])\s*;?\s*$", s, re.S).group(1)))
    notes = {}
    seen = set()
    stats = []
    for fname, docname, unit in SOURCES:
        path = os.path.join(COURSEWARE, fname)
        if not os.path.exists(path):
            print("missing", path); continue
        z = zipfile.ZipFile(path)
        key = "ppt/embeddings/%s.docx" % docname
        if key not in z.namelist():
            print("missing embed", fname, docname); continue
        data = z.read(key)
        # 三种版式取「有释义条目」最多的一种：表格 / 编号散文 / Quick Gloss 散文
        cands = [fn(data) for fn in (extract_table, extract_prose, extract_gloss)]
        rows = max(([r for r in c if r[1] or r[2]] for c in cands), key=len)
        hit = 0
        for term, zh, note in rows:
            if not zh and not note:
                continue
            for hw in headwords(term, bank):
                if hw in bank:
                    sig = (hw, term, zh)
                    if sig in seen:
                        continue
                    seen.add(sig)
                    notes.setdefault(hw, []).append({
                        "term": term, "zh": zh, "note": note, "unit": unit,
                        "source": "课件 %s · %s" % (fname, docname),
                    })
                    hit += 1
        stats.append((fname, docname, len(rows), hit))
    path = os.path.join(BUILD, "vocab_notes.json")
    with io.open(path, "w", encoding="utf-8") as f:
        f.write(json.dumps(notes, ensure_ascii=False, indent=2) + "\n")
    print("wrote", path)
    print("headwords with notes:", len(notes), "total note entries:", sum(len(v) for v in notes.values()))
    for fn, dn, r, h in stats:
        print("  %-30s %-12s rows=%3d hits=%3d" % (fn[:28], dn, r, h))
    # 样例
    for k in list(notes)[:6]:
        print(" sample", k, "->", json.dumps(notes[k][0], ensure_ascii=False)[:180])


if __name__ == "__main__":
    main()
