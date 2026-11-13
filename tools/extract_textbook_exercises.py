#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""Extract the textbook TRUE / FALSE / NOT GIVEN exercise sets for the Cilin reading module.

Sources (read-only):
  book/Textbook Fall 2026  珠海校區本科英語講義.pdf   -> exercise statements   (pypdf)
  book/The Key to the Exercises of Text B.docx        -> answer keys           (python-docx)

Output:
  四六级/词林/build/textbook_sets.json

Scope: Unit 1-4, Text B / Text C.  Inside that scope the TRUE/FALSE/NOT GIVEN
exercise is "Exercise 1" for U1 Text B, U1 Text C and U3 Text B, but for
U2 Text B, U2 Text C and U4 Text B it is "Exercise 2" (their Exercise 1 is
matching / notes completion / vocabulary).  U3 Text C has no TFNG exercise at
all, and U4 Text C's TFNG exercise only has 3 statements (below the 5-8
requirement), so both are skipped.  Result: 6 sets, 35 items.

Statements are transcribed from the PDF (wrapped lines are re-joined, page
headers / page numbers / question numbers are dropped).  Answers are read from
the key .docx, never typed by hand.  The "explain" strings quote the passage
sentence that decides each answer and are curated in EXPLAIN below.
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

import docx  # python-docx
from pypdf import PdfReader

ROOT = Path(__file__).resolve().parent.parent          # .../四六级/词林
BOOK = ROOT.parent.parent / "book"                      # .../英语/book
PDF_PATH = BOOK / "Textbook Fall 2026  珠海校區本科英語講義.pdf"
KEY_PATH = BOOK / "The Key to the Exercises of Text B.docx"
OUT_PATH = ROOT / "build" / "textbook_sets.json"

# (id, unit, text, exercise number, 1-based PDF pages, title)
SET_SPECS = [
    ("tb-u1b", 1, "B", 1, [10], "Unit 1 · Text B · Exercise 1"),
    ("tb-u1c", 1, "C", 1, [15], "Unit 1 · Text C · Exercise 1"),
    ("tb-u2b", 2, "B", 2, [24], "Unit 2 · Text B · Exercise 2"),
    ("tb-u2c", 2, "C", 2, [28], "Unit 2 · Text C · Exercise 2"),
    ("tb-u3b", 3, "B", 1, [35, 36], "Unit 3 · Text B · Exercise 1"),
    ("tb-u4b", 4, "B", 2, [49], "Unit 4 · Text B · Exercise 2"),
]

# Curated one-sentence evidence for each item, keyed by set id / item number.
EXPLAIN = {
    "tb-u1b": [
        "The passage says Alexander 'spent much of his childhood in the area' around Press Estate, playing on the beach near Eyemouth and fishing in the streams nearby - he visited often, not rarely.",
        "'Although he never liked the prospect of a business career, he stayed with it to please his family.'",
        "The text only mentions that the two men 'cooperated on experiments with magnesium flares as a source of artificial light in 1865'; it says nothing about their being surprised by the results.",
        "'In spite of their friendship, their styles of photography were quite different.'",
        "The passage says he opened a photographic studio in 1866 but gives no information about where that studio was located.",
        "'From about 1870 he dropped portraiture to specialize in landscape photography and other views.'",
        "In 1875 he was commissioned to record the principal structures 'along the almost-completed line connecting Montreal to Halifax', so the line was not finished.",
        "He held a full-time CPR post until 1897, 'when he retired completely from photography' - the CPR was his last photographic employer.",
    ],
    "tb-u1c": [
        "The 1903 Physics prize was shared with her husband and Becquerel, but for the 1911 Chemistry prize she was 'sole winner', so Pierre was not a joint winner of both.",
        "The passage praises her prodigious childhood memory but never says when her interest in science began.",
        "Her earnings financed Bronia's medical studies 'on the understanding that Bronia would, in turn, later help her to get an education', and 'in 1891 this promise was fulfilled' when Marie went to the Sorbonne.",
        "'The births of Marie's two daughters, Irene and Eve, in 1897 and 1904 failed to interrupt her scientific work.'",
        "In 1906 'she was appointed to the professorship that had been left vacant on her husband's death'.",
        "Bronia is mentioned as a medical student and later as director of the Radium Institute in Warsaw, but not as studying the medical uses of radioactivity.",
    ],
    "tb-u2b": [
        "'the ability to self-regulate has been shown to be a key predictor of academic performance.'",
        "Observing children at play 'can give us important clues about their well-being and can even be useful in the diagnosis of neurodevelopmental disorders like autism.'",
        "The study found children wrote longer, better-structured stories after playing with dolls, but it makes no comparison between girls' and boys' writing.",
        "'With the Lego building, however, not a single child said this through the whole year of the project.'",
        "'Somehow the importance of play has been lost in recent decades, it's regarded as something trivial' - less significant than in the past.",
    ],
    "tb-u2c": [
        "The drive to play is so intense that children play 'in any circumstances, for instance when they have no real toys', so toys are not needed.",
        "'Our society has created a false dichotomy between play and learning.'",
        "The passage lists social, cognitive, physical and emotional benefits and creative problem-solving skills, but never mentions artistic talents.",
        "'Full consensus on a formal definition of play continues to elude the researchers and theorists who study it.'",
        "Play 'has no extrinsically motivated function or goal', whereas work 'is extrinsically motivated (i.e. it is goal oriented)'.",
    ],
    "tb-u3b": [
        "When an organisation is shrinking, 'the best and most mobile workers are prone to leave voluntarily ... those with the highest skills and experience', while the minor employees stay because their options are limited.",
        "The passage contrasts running a small business with a managerial post in a larger organisation, but never compares how easy the two are to manage.",
        "High achievers 'will do best when the job provides moderately challenging goals and where there is independence and feedback'; a bureaucratic manager should have a low need for affiliation.",
        "'If participation and the culture are incongruous, employees are likely to perceive the participation process as manipulative and be negatively affected by it.'",
        "The text requires employees to 'regard the appraisal process as valid' but says nothing about who should design that process.",
        "Rewards should be made more visible by 'eliminating the secrecy surrounding pay by openly communicating everyone's remuneration'.",
    ],
    "tb-u4b": [
        "Ashley's machine made '200 bottles per hour ... more than three times quicker than any previous production method'.",
        "Owens was the 'founder of the Owens Bottle Machine Company', which installed his machine, so he was not hired by a large company to design it.",
        "The passage calls glass making 'big business' in 'a fiercely competitive global market' but never says most glass is made by large international manufacturers.",
        "'with growing consumer concern for green issues, glass bottles and jars are becoming ever more popular.'",
        "'less energy is needed to melt recycled glass than to melt down raw materials, this also saves fuel and production costs' - recycled glass is cheaper, not more expensive.",
    ],
}

TFNG = ("T", "F", "NG")


def read_answers() -> dict[tuple[int, str, int], list[str]]:
    """Parse the key .docx into {(unit, text, exercise_no): [T/F/NG, ...]}."""
    document = docx.Document(str(KEY_PATH))
    answers: dict[tuple[int, str, int], list[str]] = {}
    unit = text = ex = None
    for para in document.paragraphs:
        line = para.text.strip()
        if not line:
            continue
        m = re.match(r"^Unit\s+(\d+)", line)
        if m:
            unit, text, ex = int(m.group(1)), None, None
            continue
        m = re.match(r"^Text\s+([BC])\b", line)
        if m:
            text, ex = m.group(1), None
            continue
        m = re.match(r"^Exercise\s+(\d+)", line)
        if m:
            ex = int(m.group(1))
            continue
        if unit is None or text is None or ex is None:
            continue
        # T/F/NG answer line, e.g. "F   2. T   3. NG   4. F"
        tokens = re.findall(r"(?<![A-Za-z])(NG|T|F)(?![A-Za-z])", line)
        if tokens and len(tokens) > 1:
            answers.setdefault((unit, text, ex), tokens)
    return answers


NUM_STMT = re.compile(r"^(\d+)\s*\.?\s+([A-Z][^\n]{14,})$")


def read_statements(pdf: PdfReader, pages: list[int], exno: int) -> list[str]:
    """Re-join the numbered statements of one exercise from the given PDF pages."""
    chunks = []
    for page_no in pages:
        chunks.append(pdf.pages[page_no - 1].extract_text() or "")
    lines = "\n".join(chunks).splitlines()

    # locate "Exercise N:" (tolerate a trailing colon / spaces)
    start = None
    for i, raw in enumerate(lines):
        if re.match(r"^Exercise\s+%d\s*:" % exno, raw.strip()):
            start = i + 1
            break
    if start is None:
        raise RuntimeError("exercise %d not found on pages %s" % (exno, pages))

    statements: list[str] = []
    cur: str | None = None
    in_list = False
    for raw in lines[start:]:
        s = raw.strip()
        if not s:
            continue
        if re.match(r"^Exercise\s+\d+", s) or re.match(r"^(TEXT\s+[A-C]|Unit\s+\d+)", s, re.I):
            break
        if re.match(r"^List of", s, re.I):
            in_list = True
            continue
        if in_list:
            m = NUM_STMT.match(s)
            if not m:
                continue
            in_list = False
        if re.fullmatch(r"\d+", s):
            continue  # printed page number
        m = NUM_STMT.match(s)
        if m:
            expected = len(statements) + (1 if cur is None else 2)
            if int(m.group(1)) == expected:
                if cur is not None:
                    statements.append(cur)
                cur = m.group(2).strip()
                continue
        if re.match(r"^[A-E]\s", s):
            continue  # list of descriptions / ideas
        if cur is not None:
            if cur.endswith("-") and s[:1].islower():
                cur = cur + s  # keep the compound hyphen, drop the line-break space
            else:
                cur = (cur + " " + s).strip()
    if cur is not None:
        statements.append(cur)
    return [re.sub(r"\s+", " ", s).strip() for s in statements]


def main() -> int:
    if not PDF_PATH.exists():
        print("missing PDF:", PDF_PATH, file=sys.stderr)
        return 1
    if not KEY_PATH.exists():
        print("missing key docx:", KEY_PATH, file=sys.stderr)
        return 1

    pdf = PdfReader(str(PDF_PATH))
    answers = read_answers()

    sets = []
    for set_id, unit, text, exno, pages, title in SET_SPECS:
        key = (unit, text, exno)
        ans = answers.get(key)
        if not ans:
            raise RuntimeError("no answer key for %s %s Exercise %d" % (unit, text, exno))
        stems = read_statements(pdf, pages, exno)
        explain = EXPLAIN[set_id]
        if not (len(stems) == len(ans) == len(explain)):
            raise RuntimeError(
                "%s: stems=%d answers=%d explain=%d" % (set_id, len(stems), len(ans), len(explain))
            )
        items = []
        for i, (stem, answer, why) in enumerate(zip(stems, ans, explain), 1):
            if answer not in TFNG:
                raise RuntimeError("%s item %d: bad answer %r" % (set_id, i, answer))
            items.append({"no": i, "type": "tfng", "stem": stem, "answer": answer, "explain": why})
        sets.append(
            {
                "id": set_id,
                "unit": "u%d" % unit,
                "text": "u%d%s" % (unit, text.lower()),
                "title": title,
                "sourcePages": pages,
                "items": items,
            }
        )

    # ---- self checks ------------------------------------------------------
    assert len(sets) >= 6, "expected at least 6 sets"
    for entry in sets:
        items = entry["items"]
        assert 5 <= len(items) <= 8, "%s has %d items" % (entry["id"], len(items))
        assert all(item["answer"] in TFNG for item in items)
        assert [item["no"] for item in items] == list(range(1, len(items) + 1))
        assert all(item["stem"] and len(item["stem"]) > 20 for item in items)
    ids = [entry["id"] for entry in sets]
    assert len(ids) == len(set(ids))

    payload = {"sets": sets}
    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUT_PATH.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    total = sum(len(entry["items"]) for entry in sets)
    print("wrote %s" % OUT_PATH)
    for entry in sets:
        print("  %-7s %-28s pages=%s items=%d" % (
            entry["id"], entry["title"], entry["sourcePages"], len(entry["items"])))
    print("sets=%d items=%d" % (len(sets), total))
    return 0


if __name__ == "__main__":
    sys.exit(main())
