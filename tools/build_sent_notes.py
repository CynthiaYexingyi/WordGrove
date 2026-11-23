#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""从课件内嵌 DOCX 的「翻译难点 / 难句秒解」表抽取逐句精讲，生成 build/sent_notes.json。

每条：{unit, loc, en, zh, note, words:[词库 headword]}
挂到词卡：按目标词展示在「课文例句」区下方。生成物勿手改。
"""
import io, os, re, json, html, zipfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WS = os.path.dirname(ROOT)
COURSEWARE = os.path.join(os.path.dirname(WS), "课件")
DATA = os.path.join(ROOT, "data")
BUILD = os.path.join(ROOT, "build")

# (pptx, 内嵌 docx, unit, 列格式)  列格式 4=原句定位/英文/参考译文/难点秒解；3=英文/译文/难点
SOURCES = [
    ("Unit 1 Biographies.pptx", "Document2", "u1", "loc4"),
    ("Unit 1 Biographies.pptx", "Document5", "u1", "loc4"),
    ("Unit+2+Play.pptx", "Document12", "u2", "loc4"),
    ("Unit+2+Play.pptx", "Document5", "u2", "plain3"),
    ("Unit+2+Play.pptx", "Document6", "u2", "plain3"),
]

STOP = set("""the a an and or of to in for on with as is are was were be been being by from that this
these those it its into at not but have has had than then so more most many much all any also
will would can could should may might do does did one two three he she they we you his her their
our your its here there how what when where which who whom whose while if because such only just
very each every other another same own""".split())

IRREGULAR = {"took": "take", "went": "go", "made": "make", "felt": "feel", "found": "find",
             "gave": "give", "knew": "know", "left": "leave", "saw": "see", "wrote": "write"}


def cell(c):
    return html.unescape("".join(re.findall(r"<w:t(?:\s[^>]*)?>([^<]*)</w:t>", c))).strip()


def rows(p, dn):
    data = zipfile.ZipFile(p).read("ppt/embeddings/%s.docx" % dn)
    xml = zipfile.ZipFile(io.BytesIO(data)).read("word/document.xml").decode("utf-8", "ignore")
    out = []
    for r in re.findall(r"<w:tr[ >].*?</w:tr>", xml, re.S):
        out.append([cell(c) for c in re.findall(r"<w:tc[ >].*?</w:tc>", r, re.S)])
    return out


def cands(w):
    o = [w]
    if w in IRREGULAR:
        o.append(IRREGULAR[w])
    if w.endswith("ies") and len(w) > 4:
        o.append(w[:-3] + "y")
    if w.endswith("es") and len(w) > 3:
        o += [w[:-2], w[:-1]]
    if w.endswith("s") and len(w) > 3 and not w.endswith("ss"):
        o.append(w[:-1])
    if w.endswith("ed") and len(w) > 3:
        o += [w[:-1], w[:-2]]
        if len(w) > 4 and w[-3] == w[-4]:
            o.append(w[:-3])
    if w.endswith("ing") and len(w) > 4:
        o += [w[:-3], w[:-3] + "e"]
    return o


def to_bank(word, bank):
    lw = word.lower().strip("-'’")
    if len(lw) < 3 or lw in STOP:
        return None
    for c in cands(lw):
        if c in bank:
            return c
    return None


def target_words(note, bank, en):
    """目标词：优先取 'X →' / 'X =' 左侧；不足则补英文原句里出现的词库词。"""
    out = []
    # 左侧目标（箭头或等号左边，取紧邻的最近词/短语）
    for seg in re.split(r"[；;。]", note):
        m = re.search(r"([A-Za-z][A-Za-z\-' ]{1,40}?)\s*(?:→|=>|=|→)", seg)
        if m:
            for w in re.findall(r"[A-Za-z][A-Za-z\-']*", m.group(1)):
                b = to_bank(w, bank)
                if b and b not in out:
                    out.append(b)
        if len(out) >= 3:
            break
    # 补：英文原句里出现的内容词（限高频、非停用）
    if len(out) < 2:
        for w in re.findall(r"[A-Za-z][A-Za-z\-']+", en):
            b = to_bank(w, bank)
            if b and b not in out:
                out.append(b)
            if len(out) >= 2:
                break
    return out[:3]


def norm(t):
    return re.sub(r"[^a-z0-9]+", "", t.lower())


def main():
    s = io.open(os.path.join(DATA, "words.js"), encoding="utf-8").read()
    words = json.loads(re.search(r"=\s*(\[.*\])\s*;?\s*$", s, re.S).group(1))
    bank = set(w["w"].lower() for w in words)
    # 例句精确索引（兜底挂载）
    exidx = {}
    for w in words:
        if w.get("ex") and w["ex"].get("en"):
            exidx.setdefault(norm(w["ex"]["en"]), []).append(w["w"].lower())

    notes, seen = [], set()
    for fname, docname, unit, fmt in SOURCES:
        path = os.path.join(COURSEWARE, fname)
        if not os.path.exists(path):
            print("missing", path); continue
        rs = rows(path, docname)
        for r in rs[1:]:  # 跳表头
            if fmt == "loc4":
                if len(r) < 5: continue
                loc, en, zh, note = r[1], r[2], r[3], r[4]
            else:
                if len(r) < 4: continue
                loc, en, zh, note = "", r[1], r[2], r[3]
            en = en.strip().strip('"“” quotas').strip()
            en = re.sub(r'^\s*["“”"\']+|["“”"\']\s*$', "", en).strip()
            zh = zh.strip(); note = note.strip()
            if not en or not (zh or note):
                continue
            if en in seen:
                continue
            seen.add(en)
            ws = target_words(note, bank, en)
            # 兜底：例句精确匹配的功能词外的词
            if not ws:
                for w in exidx.get(norm(en), []):
                    if w not in STOP:
                        ws.append(w)
            notes.append({"unit": unit, "loc": loc, "en": en, "zh": zh,
                          "note": note, "words": ws[:3],
                          "source": "课件 %s · %s" % (fname, docname)})
    path = os.path.join(BUILD, "sent_notes.json")
    with io.open(path, "w", encoding="utf-8") as f:
        f.write(json.dumps(notes, ensure_ascii=False, indent=2) + "\n")
    covered = sum(1 for n in notes if n["words"])
    mounted = sum(len(n["words"]) for n in notes)
    print("wrote", path)
    print("sentence notes:", len(notes), "with target words:", covered, "total mounts:", mounted)
    for n in notes[:8]:
        print(" ", n["unit"], n["words"], "|", n["en"][:46], "|", n["note"][:40])


if __name__ == "__main__":
    main()
