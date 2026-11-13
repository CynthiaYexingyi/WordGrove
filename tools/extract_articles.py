#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Extract clean reading articles for 词林 from CET-6 exam PDFs and press PDFs.

Sources (read-only):
  * 四六级/2025.12六级真题第1/2/3套.pdf   -> 6 Section C Reading passages (真题)
  * 四六级/2025.06六级真题第2套.pdf       -> Section C Reading Passage 1 (真题)
  * 四六级/2025.06六级真题第3套.pdf       -> Section C Reading Passages 1 & 2 (真题)
  * 第三周/Slepian Secrets Article.pdf    -> introduction excerpt (外刊)
  * 第三周/The auditory foreign-language effect ....pdf -> introduction excerpt (外刊)

Skipped sources:
  * 2026年6月英语六级真题及答案速查（共3套）.pdf - no text layer (0 chars on all
    23 pages), so nothing can be extracted without OCR.
  * 2025.06六级真题第1套.pdf - the scan's text layer corrupts quotation marks
    ("u You can figure out...later.J") and merges page numbers into the body
    ("Follow your 6 -1 0 passion"), so its two passages are not used.

Output: build/articles_extra.json
  [{id,title,subtitle,source,kind,level,paragraphs,sentences}, ...]

Only pypdf is used for PDF text extraction.  Every article is located by
content markers (never by hard-coded page numbers), so the script is
reproducible against the same PDFs.

The 2026 PDF (2026年6月英语六级真题及答案速查（共3套）.pdf) has no text
layer at all (0 chars on all 23 pages) and is therefore not used.

Usage:
  python tools/extract_articles.py            # write build/articles_extra.json
  python tools/extract_articles.py --check    # validate only, no write
  python tools/extract_articles.py --dump x1  # print one article for review
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

from pypdf import PdfReader

PROJECT_ROOT = Path(__file__).resolve().parents[1]    # .../词林
WORD_ROOT = PROJECT_ROOT.parent.parent                # .../英语
EXAM_DIR = WORD_ROOT / "四六级"
PRESS_DIR = WORD_ROOT / "第三周"
OUT_PATH = PROJECT_ROOT / "build" / "articles_extra.json"

# ---------------------------------------------------------------------------
# article specifications
# ---------------------------------------------------------------------------
# exam articles: located by the "Questions X to Y are based on the following
# passage." line that precedes the passage; the passage stops at the first
# line starting with question number X.
EXAM_SPECS = [
    dict(id="x1", pdf="2025.12六级真题第1套.pdf", q=46, set_no=1,
         source="2025.12 六级真题 第1套", sec="Reading Passage 1"),
    dict(id="x2", pdf="2025.12六级真题第1套.pdf", q=51, set_no=1,
         source="2025.12 六级真题 第1套", sec="Reading Passage 2"),
    dict(id="x3", pdf="2025.12六级真题第2套.pdf", q=46, set_no=2,
         source="2025.12 六级真题 第2套", sec="Reading Passage 1"),
    dict(id="x4", pdf="2025.12六级真题第2套.pdf", q=51, set_no=2,
         source="2025.12 六级真题 第2套", sec="Reading Passage 2"),
    dict(id="x5", pdf="2025.12六级真题第3套.pdf", q=46, set_no=3,
         source="2025.12 六级真题 第3套", sec="Reading Passage 1"),
    dict(id="x6", pdf="2025.12六级真题第3套.pdf", q=51, set_no=3,
         source="2025.12 六级真题 第3套", sec="Reading Passage 2"),
    # 2025.06 set 1 passages 1/2 were dropped: the scan OCR mangles quotes and
    # merges page numbers into the body (unrecoverable without guessing), so
    # only the two clean 2025.06 sets are used.
    dict(id="x7", pdf="2025.06六级真题第2套.pdf", q=46, set_no=2,
         source="2025.06 六级真题 第2套", sec="Reading Passage 1"),
    dict(id="x8", pdf="2025.06六级真题第3套.pdf", q=46, set_no=3,
         source="2025.06 六级真题 第3套", sec="Reading Passage 1"),
    dict(id="x9", pdf="2025.06六级真题第3套.pdf", q=51, set_no=3,
         source="2025.06 六级真题 第3套", sec="Reading Passage 2"),
]

# press articles: located by paragraph-opening marker sentences inside the
# introduction of each paper (academic PDFs lose paragraph indentation in
# text extraction, so paragraph starts are pinned by their first words).
PRESS_SPECS = [
    dict(
        id="x10",
        pdf="Slepian Secrets Article.pdf",
        title="Shame, Guilt, and Secrets on the Mind",
        source="Emotion (APA) · Shame, Guilt, and Secrets on the Mind",
        subtitle="2020 · Emotion, Vol. 20, No. 2 · Introduction excerpt",
        para_starts=[
            "People keep secrets, but secrecy comes with well-being costs.",
            "Self-conscious emotions should have important implications",
            "Guilt and shame are associated with different appraisals",
            "Recent work suggests that having to conceal a secret",
        ],
        stop_marker="This article was published Online First",
    ),
    dict(
        id="x11",
        pdf="The auditory foreign-language effect of moral decision making in highly proficient bilinguals.pdf",
        title="The auditory foreign-language effect of moral decision making",
        source="Journal of Multilingual and Multicultural Development · "
               "The auditory foreign-language effect of moral decision making in highly proficient bilinguals",
        subtitle="2019 · Journal of Multilingual and Multicultural Development, "
                 "Vol. 40, No. 10 · Introduction excerpt",
        para_starts=[
            "Individuals make thousands of decisions every day.",
            "Moral decision making has been defined as",
            "Traditional theories of moral development",
            "Previous research has shown that the relative weight",
            "Although Geipel et al.",
            "Several different L1–L2 language pairs",
        ],
        stop_marker="As it has been shown that amount of emotionality",
    ),
]

# ---------------------------------------------------------------------------
# generic text cleaning
# ---------------------------------------------------------------------------
LIGATURES = {
    "\ufb00": "ff", "\ufb01": "fi", "\ufb02": "fl", "\ufb03": "ffi",
    "\ufb04": "ffl", "\ufb05": "ft", "\ufb06": "st",
}

# OCR/PDF artefacts observed in the source files (token -> replacement).
# These map export-copied glyphs back to the ASCII characters the original
# print used; they never change the words themselves.
TOKEN_FIXES = {
    "^^": '"',
    '""': '"',
    "''": '"',
    ",,''": ',"',
    ".,,": '."',
    ".^^": '."',
    ",^^": ',"',
    ".,5": '."',
    "4t": '"',
    "4th": '"',
    "4s": '"',
    "UI": '"I',
    "UFl": '"I\'ll',
    "Uyou": '"You',
    "UWe": '"We',
    '"nfortunately': '"Unfortunately',
    '"nless': '"Unless',
    '".S.': '"U.S.',
    '".K.': '"U.K.',
    "fbr": "for",
    "Fbr": "For",
    "Wonying": "Worrying",
    "retum": "return",
    "upseHs": "upsells",
    "upseH": "upsell",
    "children^": "children's",
    "self^guiding": "self-guiding",
    "self^critical": "self-critical",
    "one ^s": "one's",
    "beliet's": "beliefs",
    "Thafs": "That's",
    "thafs": "that's",
    "whafs": "what's",
    "Whafs": "What's",
    "Ifs": "It's",
    "ifs": "it's",
    "Lefs": "Let's",
    "lefs": "let's",
    "wonying": "worrying",
    "transfonnation": "transformation",
    "didn,t": "didn't",
    "the one's": "one's",
    ", The Footbridge": ", the Footbridge",
    "up -fast": "up fast",
    "U. S.": "U.S.",
    "一": " — ",
    "€ ": '"',
    "e ﬀ ect": "effect",
    "di ﬀ erent": "different",
    "di ﬀ er-": "differ-",
    "a ﬀ ect": "affect",
    "ﬀ ": "ff",
    "ﬁ ": "fi",
    "ﬂ ": "fl",
    "ﬃ": "ffi",
    "ﬀ": "ff",
    "ﬁ": "fi",
    "ﬂ": "fl",
    "ﬄ": "ffl",
    "\u00ad": "",       # soft hyphen
    "\u2019": "'",
    "\u2018": "'",
    "\u201c": '"',
    "\u201d": '"',
    "\u2013": "-",
    "\u2014": "—",
    "，": ", ",
    "．": ".",
    "；": "; ",
    "：": ": ",
    "（": " (",
    "）": ") ",
}

# word-internal hyphen splits left over from column/line wrapping in the
# press PDFs are repaired while the lines are joined (see press_body_text).

CJK_RE = re.compile(r"[\u2e80-\u2fff\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\uff00-\uffef]")

FOOTER_RES = [
    re.compile(r"^[•·■]\s*20\d\d\s*年.*$"),          # • 2025年 12月六级真题（第一套）• 6
    re.compile(r"^20\d\d\s*年.*真题.*[•·■]\s*\d*$"),  # 5 ■ 2025年 12月六级真题…
    re.compile(r"^\d+\s*[•·・■]\s*\d+$"),            # 6 • 8   /  6 ・9
    re.compile(r"^\d+\s*$"),                          # bare page number
    re.compile(r"^[A-Za-z ,.'&-]*\d{3}\s+[A-Z]\.\s+[A-Z]+$"),  # 866 S. BROUWER
    re.compile(r"20\d\d\s*年"),                       # any line carrying the year footer
    re.compile(r"六级真题"),
]


def looks_like_footer(line: str) -> bool:
    s = line.strip()
    if not s:
        return True
    return any(r.search(s) for r in FOOTER_RES)


def strip_chinese_glosses(text: str) -> str:
    """Remove the exam paper's Chinese glosses, e.g. 韧性 in (韧性) or （管理费用）."""
    text = re.sub(r"[（(][^()（）]*[\u4e00-\u9fff][^()（）]*[）)]", "", text)
    return CJK_RE.sub("", text)


def ocr_repairs(text: str) -> str:
    """Repair the recurring glyph confusions of the 2025.12 exam scan.

    The scan mangles the typographic apostrophe followed by "s" into "fs"
    (That's -> Thafs), renders "you're" as "you5re", and turns some closing
    quotes into ",5"/"5".  Only patterns that cannot occur in real words are
    rewritten here.
    """
    text = re.sub(r"([A-Za-z])5re\b", r"\1're", text)     # You5re -> You're
    text = re.sub(r"([A-Za-z])5(s|t|ll|ve|d|m)\b", r"\1'\2", text)
    text = re.sub(r'([.!?,;])5(?=\s|$)', r'\1"', text)    # reality.,5 -> reality."
    text = re.sub(r'(?<=\w)5(?=")', "'", text)
    text = re.sub(r"'\s+([^']{1,80}?)\s+'", r'"\1"', text)  # ' What do you do? ' -> "..."
    return text


def clean(text: str) -> str:
    text = text.replace("\u2019", "'").replace("\u2018", "'")
    for k, v in TOKEN_FIXES.items():
        text = text.replace(k, v)
    text = ocr_repairs(text)
    text = strip_chinese_glosses(text)
    text = text.replace("\ufffd", "")
    # apostrophes detached by the PDF line wrapper: "one 's" -> "one's"
    text = re.sub(r"(\w) '(s|re|ve|ll|d|m|t)\b", r"\1'\2", text)
    text = re.sub(r"(\w)s ' (?=[a-z])", r"\1s' ", text)
    text = re.sub(r"\s+'([.,;:])", r"'\1", text)
    text = re.sub(r"([\"'])\s+([.,;:!?])", r"\1\2", text)
    text = re.sub(r'"\.(?=\s|$)', '."', text)
    # superscript footnote markers left inside sentences
    text = re.sub(r"(?<=[.!?]) \d{1,2} (?=[A-Z])", " ", text)
    # normalise dashes surrounded by spaces
    text = re.sub(r"\s*—\s*", " — ", text)
    text = re.sub(r"(?:—\s*){2,}", "— ", text)
    text = re.sub(r"\s+-\s+", " — ", text)
    text = re.sub(r"(?<=[A-Za-z])-\s+", " — ", text)
    text = re.sub(r"\s+([,.;:!?])", r"\1", text)
    # fix missing space after sentence-final punctuation ("think.Absence")
    text = re.sub(r"(?<=[a-z])[.](?=[A-Z][a-z])", ". ", text)
    # fix missing space before an opening quote
    text = re.sub(r'(?<=[a-z,.!?])"(?=[A-Z])', ' "', text)
    text = re.sub(r"\(\s+", "(", text)
    text = re.sub(r"\s+\)", ")", text)
    text = re.sub(r"\s+", " ", text).strip()
    text = re.sub(r"\s+t\s+", " t ", text)
    return text


CITATION_RE = re.compile(
    r"\([^()]*\b(?:19|20)\d{2}[a-z]?\b[^()]*\)"      # (Costa et al. 2014) / (Slepian, 2017)
)


def strip_citations(text: str) -> str:
    """Drop bibliographic parentheses from press excerpts: (e.g. Costa et al. 2014)."""
    return CITATION_RE.sub("", text)


ABBREV = {
    "mr", "mrs", "ms", "dr", "prof", "st", "jr", "sr", "vs", "etc", "e.g",
    "i.e", "al", "vol", "no", "pp", "p", "fig", "ed", "eds", "cf", "ca",
    "u.s", "u.k", "inc", "ltd", "co", "corp", "dept", "univ", "approx",
}


def split_sentences(paragraph: str) -> list[str]:
    parts = re.split(r"(?<=[.!?])\s+", paragraph)
    out: list[str] = []
    buf = ""
    for part in parts:
        cand = (buf + " " + part).strip() if buf else part.strip()
        if not cand:
            continue
        last = cand.split()[-1].rstrip('".').lower()
        initial = re.fullmatch(r"[a-z]\.", last) is not None
        if last in ABBREV or initial or re.fullmatch(r"(?:[a-z]\.)+[a-z]", last):
            buf = cand
            continue
        out.append(cand)
        buf = ""
    if buf:
        if out:
            out[-1] = out[-1] + " " + buf
        else:
            out.append(buf)
    return [s for s in out if s]


# ---------------------------------------------------------------------------
# exam extraction
# ---------------------------------------------------------------------------
def page_lines(pdf: Path, layout: bool = True) -> list[tuple[int, str]]:
    reader = PdfReader(str(pdf))
    mode = "layout" if layout else None
    lines: list[tuple[int, str]] = []
    for pno, page in enumerate(reader.pages, start=1):
        text = page.extract_text(extraction_mode=mode) if layout else (page.extract_text() or "")
        for raw in (text or "").splitlines():
            lines.append((pno, raw))
    return lines


def find_passage(lines: list[tuple[int, str]], q_start: int) -> list[str]:
    start_re = re.compile(
        r"^Questions\s+%d\s+to\s+\d+\s+are\s+based\s+on\s+the\s+following\s+passage\.?$" % q_start
    )
    first_q_re = re.compile(r"^%d\.\s" % q_start)
    start = None
    end = None
    for i, (_, raw) in enumerate(lines):
        s = " ".join(raw.split())
        if start is None:
            if start_re.match(s):
                start = i + 1
        elif first_q_re.match(s):
            end = i
            break
    if start is None or end is None:
        raise RuntimeError("passage markers not found (q=%d)" % q_start)
    return [raw for _, raw in lines[start:end]]


def build_exam_paragraphs(region: list[str]) -> list[str]:
    paras: list[str] = []
    cur = ""
    for raw in region:
        if looks_like_footer(raw):
            continue
        s = " ".join(raw.split())
        if not s:
            continue
        lead = len(raw) - len(raw.lstrip(" "))
        if lead >= 2 and cur:
            paras.append(cur)
            cur = s
        elif cur.endswith(("-", "\u2010", "\u00ad")):
            # word/compound wrapped at the right margin: join keeping one hyphen
            cur = cur.rstrip("\u2010\u00ad-") + "-" + s
        else:
            cur = (cur + " " + s).strip() if cur else s
    if cur:
        paras.append(cur)
    return [p for p in (clean(p) for p in paras) if p]


# ---------------------------------------------------------------------------
# press extraction
# ---------------------------------------------------------------------------
PRESS_JUNK_RES = [
    re.compile(r"^©\s*20\d\d"),                    # copyright line
    re.compile(r"^This is an Open Access article"),
    re.compile(r"^creativecommons\.org"),
    re.compile(r"^original work is properly cited"),
    re.compile(r"^CONTACT\s"),
    re.compile(r"^JOURNAL OF"),
    re.compile(r"^https?://"),
    re.compile(r"^\d{4},\s*VOL\."),
    re.compile(r"^https://doi\.org"),
    re.compile(r"^Supplemental materials"),
    re.compile(r"^Keywords:"),
    re.compile(r"^ARTICLE HISTORY"),
    re.compile(r"^Received\s"),
    re.compile(r"^Accepted\s"),
    re.compile(r"^KEYWORDS"),
    re.compile(r"^BRIEF REPORT"),
    re.compile(r"^ABSTRACT"),
    re.compile(r"^Introduction"),
]

# compounds whose hyphen must survive the line-wrap join ("dual-" + "process")
PRESS_KEEP_HYPHEN = {("dual-", "process"), ("Korean-", "English,")}

# ligature glyphs in these PDFs are preceded by a stray space ("pro ﬁcient");
# mapped after the ligatures are normalised to ASCII.
PRESS_FIXES = {
    "E ffect": "Effect", "E ffect,": "Effect,",
    "pro ficiency": "proficiency", "pro ficient": "proficient",
    "di fference": "difference", "di fferent": "different",
    "e ffect": "effect", "a ffect": "affect", "a ffected": "affected",
    "bene fits": "benefits", "de fined": "defined", "de flecting": "deflecting",
    "in fluence": "influence", "in fluences": "influences",
    "o fficial": "official", "re flect": "reflect",
    "speci fically,": "specifically,", "speci fied": "specified",
    "Ayçiçe ği": "Ayçiçeği",
}


def press_body_text(pdf: Path) -> str:
    reader = PdfReader(str(pdf))
    lines: list[str] = []
    for page in reader.pages:
        for raw in (page.extract_text() or "").splitlines():
            s = " ".join(raw.split())
            if not s:
                continue
            if any(r.search(s) for r in PRESS_JUNK_RES):
                continue
            lines.append(s)
    # undo column/line wrapping: a hyphen at the end of a printed line is a
    # word break, so it is dropped unless it belongs to a known compound.
    out = ""
    for s in lines:
        if not out:
            out = s
            continue
        tail = out.rsplit(" ", 1)[-1]
        if tail.endswith("-"):
            if (tail, s.split(" ", 1)[0]) in PRESS_KEEP_HYPHEN:
                out += s
            else:
                out = out[:-1] + s
        else:
            out += " " + s
    for lig, ascii_form in LIGATURES.items():
        out = out.replace(lig, ascii_form)
    for k, v in PRESS_FIXES.items():
        out = out.replace(k, v)
    return out


def build_press_paragraphs(spec: dict) -> list[str]:
    text = press_body_text(PRESS_DIR / spec["pdf"])
    # drop everything after the introduction (method section etc.)
    stop = text.find(spec["stop_marker"])
    if stop > 0:
        text = text[:stop]
    starts = spec["para_starts"]
    positions = []
    for marker in starts:
        pos = text.find(marker)
        if pos < 0:
            raise RuntimeError("press paragraph marker not found: %r" % marker)
        positions.append(pos)
    chunks = []
    for i, pos in enumerate(positions):
        end = positions[i + 1] if i + 1 < len(positions) else len(text)
        chunks.append(text[pos:end])
    paras = []
    for chunk in chunks:
        chunk = strip_citations(chunk)
        paras.append(clean(chunk))
    return [p for p in paras if p]


# ---------------------------------------------------------------------------
# assembly + validation
# ---------------------------------------------------------------------------
def word_count(text: str) -> int:
    return len(re.findall(r"[A-Za-z][A-Za-z'\u2019-]*", text))


def build_articles() -> list[dict]:
    articles: list[dict] = []
    cache: dict[str, list[tuple[int, str]]] = {}
    for spec in EXAM_SPECS:
        key = spec["pdf"]
        if key not in cache:
            cache[key] = page_lines(EXAM_DIR / key)
        region = find_passage(cache[key], spec["q"])
        paras = build_exam_paragraphs(region)
        articles.append(dict(
            id=spec["id"],
            title="Passage 1" if spec["q"] == 46 else "Passage 2",
            subtitle=f"2025.{spec['pdf'][5:7]} CET-6 · Set {spec['set_no']} · {spec['sec']}",
            source=spec["source"],
            kind="exam",
            level="cet6",
            paragraphs=paras,
        ))
    for spec in PRESS_SPECS:
        paras = build_press_paragraphs(spec)
        articles.append(dict(
            id=spec["id"],
            title=spec["title"],
            subtitle=spec["subtitle"],
            source=spec["source"],
            kind="press",
            level="cet6",
            paragraphs=paras,
        ))
    for art in articles:
        art["sentences"] = [s for p in art["paragraphs"] for s in split_sentences(p)]
    return articles


BAD_RESIDUE_RES = [
    re.compile(r"^Directions:", re.I),
    re.compile(r"^Questions\s+\d+\s+to\s+\d+"),
    re.compile(r"^Passage\s+(One|Two)\s*$"),
    re.compile(r"^Section\s+[A-C]\b"),
    re.compile(r"^[A-D]\)\s"),
    re.compile(r"^\d{2}\.\s"),
]


def validate(articles: list[dict]) -> list[str]:
    errors: list[str] = []
    if not (8 <= len(articles) <= 12):
        errors.append("article count %d not in 8..12" % len(articles))
    ids = set()
    for art in articles:
        aid = art.get("id", "?")
        for field in ("id", "title", "subtitle", "source", "kind", "level", "paragraphs", "sentences"):
            if not art.get(field):
                errors.append(f"{aid}: missing/empty {field}")
        if aid in ids:
            errors.append(f"{aid}: duplicated id")
        ids.add(aid)
        if art.get("kind") not in ("exam", "press"):
            errors.append(f"{aid}: bad kind")
        paras = art.get("paragraphs") or []
        if not (3 <= len(paras) <= 12):
            errors.append(f"{aid}: paragraph count {len(paras)} not in 3..12")
        n_words = sum(word_count(p) for p in paras)
        if not (250 <= n_words <= 1300):
            errors.append(f"{aid}: word count {n_words} not in 250..1300")
        if art.get("sentences") and len(art["sentences"]) < len(paras):
            errors.append(f"{aid}: too few sentences")
        for pi, para in enumerate(paras):
            if CJK_RE.search(para):
                errors.append(f"{aid} para{pi}: contains CJK: {CJK_RE.search(para).group(0)!r}")
            if "\ufffd" in para:
                errors.append(f"{aid} para{pi}: replacement char")
            if re.search(r"[\^~]{1}", para.replace("'", "")):
                errors.append(f"{aid} para{pi}: stray ^/~: {para[:90]!r}")
            for bad in BAD_RESIDUE_RES:
                if bad.search(para):
                    errors.append(f"{aid} para{pi}: residue {bad.pattern!r}: {para[:70]!r}")
            ratio = len(re.findall(r"[A-Za-z]", para)) / max(len(para), 1)
            if ratio < 0.6:
                errors.append(f"{aid} para{pi}: low latin ratio {ratio:.2f}")
        joined = " ".join(paras)
        for token in ("A) ", "B) ", "C) ", "D) "):
            if joined.count(token) > 1:
                errors.append(f"{aid}: option residue {token!r} x{joined.count(token)}")
    return errors


def main(argv: list[str]) -> int:
    articles = build_articles()
    errors = validate(articles)
    if "--dump" in argv:
        target = argv[argv.index("--dump") + 1]
        for art in articles:
            if art["id"] == target:
                print(json.dumps(art, ensure_ascii=False, indent=2))
                return 0
        print("no such id", target)
        return 2
    if errors:
        print("VALIDATION FAILED (%d):" % len(errors))
        for e in errors:
            print("  -", e)
        if "--check" in argv:
            return 1
    else:
        print("validation OK: %d articles" % len(articles))
        for art in articles:
            n = sum(word_count(p) for p in art["paragraphs"])
            print(f"  {art['id']:>4} {art['kind']:<5} {n:>4} words  {len(art['paragraphs']):>2} paras  {art['title'][:60]}")
    if "--check" in argv:
        return 1 if errors else 0
    if errors:
        return 1
    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUT_PATH.write_text(json.dumps(articles, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print("wrote", OUT_PATH)
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
