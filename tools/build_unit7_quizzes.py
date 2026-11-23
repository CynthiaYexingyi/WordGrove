#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""从课件/Unit 7 Books(1).pptx 内嵌 DOCX 提取三套 U1-U6 复习题，生成 build/unit7_quizzes.json。

- Document10 + Document11：100 道四选一（section × 10，答案逐条 A-D）
- Document12 + Document13：100 道填空（section × 10，答案为单词/短语）
- Document14：100 道判断（section × 10，答案在末尾 key 按 1-10..91-100 给出）

源为教材配套讲义练习题（非真题试卷、非官方范文），生成物勿手改。
"""
import json, os, re, io, zipfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WORKSPACE = os.path.dirname(ROOT)  # 四六级/
PPTX = os.path.join(os.path.dirname(WORKSPACE), "课件", "Unit 7 Books(1).pptx")
BUILD = os.path.join(ROOT, "build")

SEC_RE = re.compile(r"^(Unit\s+\d|Mixed Review|Vocabulary|Critical|Final Stretch)", re.I)


def doctext(data):
    zz = zipfile.ZipFile(io.BytesIO(data))
    x = zz.read("word/document.xml").decode("utf-8", "ignore")
    x = re.sub(r"</w:p>", "\n", x)
    t = re.sub(r"<[^>]+>", "", x)
    t = (t.replace("&amp;", "&").replace("&lt;", "<").replace("&gt;", ">")
           .replace("&#39;", "'").replace("&quot;", '"'))
    return [l.strip() for l in t.split("\n") if l.strip()]


def sections(lines, skip_prefix=0):
    """按分节标题切成 10 段，每段恰好 10 题的原文行。"""
    idxs = [i for i, l in enumerate(lines) if SEC_RE.match(l)]
    assert len(idxs) == 10, "expect 10 sections, got %d" % len(idxs)
    out = []
    for n, start in enumerate(idxs):
        end = idxs[n + 1] if n + 1 < len(idxs) else len(lines)
        body = lines[start + 1:end]
        # 去掉尾部说明行（如 Answer Key / Let me know ...）
        body = [l for l in body if not re.match(r"^(Answer Key|Let me know|T = True)", l, re.I)]
        out.append((lines[start], body))
    return out


def parse_mcq(qdoc, adoc):
    qlines, alines = doctext(qdoc), doctext(adoc)
    qsecs = sections(qlines)
    asegs = sections(alines)
    assert len(asegs) == 10
    out = []
    gno = 0
    for (qtitle, qbody), (atitle, abody) in zip(qsecs, asegs):
        # qbody: 每题 5 行（题干 + A/B/C/D）
        assert len(qbody) % 5 == 0, (qtitle, len(qbody))
        n = len(qbody) // 5
        answers = [a for a in abody if re.fullmatch(r"[A-D]", a)]
        assert len(answers) == n, (qtitle, n, len(answers), abody[:6])
        for i in range(n):
            stem = qbody[i * 5]
            opts = [re.sub(r"^[-–—]\s*", "", o) for o in qbody[i * 5 + 1:i * 5 + 5]]
            assert all(re.match(r"^[A-D][.、)]", o) for o in opts), (qtitle, opts)
            gno += 1
            out.append({
                "id": "rq-mcq-%03d" % gno,
                "section": qtitle,
                "no": gno,
                "stem": stem,
                "options": [o[2:].strip() if len(o) > 2 and o[1] in ".、)" else o for o in opts],
                "answer": "ABCD".index(answers[i]),
                "source": "Unit 7 Books 课件 · Document10/11 · U1–6 复习选择题",
            })
    assert len(out) == 100, len(out)
    return out


def parse_cloze(qdoc, adoc):
    qlines, alines = doctext(qdoc), doctext(adoc)
    qsecs = sections(qlines)
    asegs = sections(alines)
    out = []
    gno = 0
    for (qtitle, qbody), (atitle, abody) in zip(qsecs, asegs):
        answers = [l for l in abody if l and not re.match(r"^(Answer Key|Let me know|T = True)", l, re.I)]
        assert len(answers) == len(qbody), (qtitle, len(qbody), len(answers))
        for stem, ans in zip(qbody, answers):
            gno += 1
            out.append({
                "id": "rq-cloze-%03d" % gno,
                "section": qtitle,
                "no": gno,
                "stem": stem,
                "answer": ans,
                "source": "Unit 7 Books 课件 · Document12/13 · U1–6 复习填空",
            })
    assert len(out) == 100, len(out)
    return out


def parse_tf(doc):
    lines = doctext(doc)
    qsecs = sections(lines)
    # 答案段在最后一个 section（Answer Key）里
    ans_lines = [l for l in lines if re.match(r"^(\d+)-(\d+)\s+[TF]", l)]
    key = {}
    for l in ans_lines:
        m = re.match(r"^(\d+)-(\d+)\s+([TF\s]+)$", l)
        assert m, l
        lo, hi = int(m.group(1)), int(m.group(2))
        vals = m.group(3).split()
        assert hi - lo + 1 == len(vals), l
        for k, v in zip(range(lo, hi + 1), vals):
            key[k] = v
    assert len(key) == 100, len(key)
    out = []
    gno = 0
    for qtitle, qbody in qsecs:
        # 末尾 Answer Key 段被并进最后一节，剔除答案行与非题干行
        qbody = [l for l in qbody if not re.match(r"^(\d+)-(\d+)\s+[TF]", l)
                 and not re.match(r"^(Answer Key|T = True|T =|Each statement)", l, re.I)]
        assert len(qbody) == 10, (qtitle, len(qbody), qbody)
        for stem in qbody:
            gno += 1
            out.append({
                "id": "rq-tf-%03d" % gno,
                "section": qtitle,
                "no": gno,
                "stem": stem,
                "answer": key[gno],
                "source": "Unit 7 Books 课件 · Document14 · U1–6 复习判断",
            })
    assert len(out) == 100, len(out)
    return out


def main():
    z = zipfile.ZipFile(PPTX)
    emb = lambda n: z.read("ppt/embeddings/Document%d.docx" % n)
    mcq = parse_mcq(emb(10), emb(11))
    cloze = parse_cloze(emb(12), emb(13))
    tf = parse_tf(emb(14))
    path = os.path.join(BUILD, "unit7_quizzes.json")
    with io.open(path, "w", encoding="utf-8") as f:
        f.write(json.dumps({"review_mcq": mcq, "review_cloze": cloze, "review_tf": tf},
                           ensure_ascii=False, indent=2) + "\n")
    print("wrote", path)
    for k, v in [("review_mcq", mcq), ("review_cloze", cloze), ("review_tf", tf)]:
        print(" ", k, len(v))
        print("    first:", json.dumps(v[0], ensure_ascii=False)[:150])
        print("    last :", json.dumps(v[-1], ensure_ascii=False)[:150])


if __name__ == "__main__":
    main()
