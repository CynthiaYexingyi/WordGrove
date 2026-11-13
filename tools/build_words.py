#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""Step 2: 解析四级大纲词表，匹配 book 例句，选出精讲词。
输出: build/words.json, build/enrich_input.json, build/stats.json
用法: python tools/build_words.py
"""
import json
import os
import re
from pypdf import PdfReader

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WORKSPACE = os.path.dirname(os.path.dirname(ROOT))
BUILD = os.path.join(ROOT, "build")
WORD_PDF = os.path.join(WORKSPACE, "四六级", "大学英语四级词汇完整版带音标-顺序版.pdf")
CET6_PDF = os.path.join(WORKSPACE, "四六级", "大学英语六级词汇完整版带音标-顺序版.pdf")
HF_PDF = os.path.join(WORKSPACE, "四六级", "四六级翻译必背200个高频词.pdf")

POS_RE = re.compile(r"(?:(?<=^)|(?<=\s))(n|vt|vi|v|adj|adv|ad|prep|conj|pron|num|art|int|aux|abbr)\s*\.", re.I)
POS_MAP = {"n": "n.", "vt": "vt.", "vi": "vi.", "v": "v.", "adj": "adj.", "adv": "adv.", "ad": "adv.",
           "prep": "prep.", "conj": "conj.", "pron": "pron.", "num": "num.", "art": "art.",
           "int": "int.", "aux": "aux.", "abbr": "abbr."}

IRREGULAR = {
    "be": ["is", "are", "was", "were", "been", "being", "am"],
    "have": ["has", "had", "having"], "do": ["does", "did", "done", "doing"],
    "go": ["goes", "went", "gone", "going"], "make": ["makes", "made", "making"],
    "take": ["takes", "took", "taken", "taking"], "give": ["gives", "gave", "given", "giving"],
    "find": ["finds", "found", "finding"], "think": ["thinks", "thought", "thinking"],
    "know": ["knows", "knew", "known", "knowing"], "see": ["sees", "saw", "seen", "seeing"],
    "come": ["comes", "came", "coming"], "get": ["gets", "got", "gotten", "getting"],
    "say": ["says", "said", "saying"], "tell": ["tells", "told", "telling"],
    "become": ["becomes", "became", "becoming"], "begin": ["begins", "began", "begun", "beginning"],
    "bring": ["brings", "brought", "bringing"], "buy": ["buys", "bought", "buying"],
    "choose": ["chooses", "chose", "chosen", "choosing"], "child": ["children", "child's", "children's"],
    "man": ["men"], "woman": ["women"], "person": ["people", "persons"], "life": ["lives"],
    "leaf": ["leaves"], "mouse": ["mice"], "foot": ["feet"], "tooth": ["teeth"],
    "write": ["writes", "wrote", "written", "writing"], "read": ["reads", "reading"],
    "speak": ["speaks", "spoke", "spoken", "speaking"], "teach": ["teaches", "taught", "teaching"],
    "grow": ["grows", "grew", "grown", "growing"], "hold": ["holds", "held", "holding"],
    "keep": ["keeps", "kept", "keeping"], "leave": ["leaves", "left", "leaving"],
    "lose": ["loses", "lost", "losing"], "mean": ["means", "meant", "meaning"],
    "meet": ["meets", "met", "meeting"], "pay": ["pays", "paid", "paying"],
    "run": ["runs", "ran", "running"], "sell": ["sells", "sold", "selling"],
    "send": ["sends", "sent", "sending"], "spend": ["spends", "spent", "spending"],
    "stand": ["stands", "stood", "standing"], "win": ["wins", "won", "winning"],
    "rise": ["rises", "rose", "risen", "rising"], "build": ["builds", "built", "building"],
    "catch": ["catches", "caught", "catching"], "feed": ["feeds", "fed", "feeding"],
    "fight": ["fights", "fought", "fighting"], "feel": ["feels", "felt", "feeling"],
    "hear": ["hears", "heard", "hearing"], "hide": ["hides", "hid", "hidden", "hiding"],
    "lead": ["leads", "led", "leading"], "learn": ["learns", "learnt", "learned", "learning"],
    "light": ["lights", "lit", "lighting"], "sleep": ["sleeps", "slept", "sleeping"],
    "draw": ["draws", "drew", "drawn", "drawing"], "drive": ["drives", "drove", "driven", "driving"],
    "eat": ["eats", "ate", "eaten", "eating"], "fall": ["falls", "fell", "fallen", "falling"],
    "forget": ["forgets", "forgot", "forgotten", "forgetting"],
    "freeze": ["freezes", "froze", "frozen", "freezing"], "hang": ["hangs", "hung", "hanging"],
    "lie": ["lies", "lay", "lain", "lying"], "ride": ["rides", "rode", "ridden", "riding"],
    "ring": ["rings", "rang", "rung", "ringing"], "seek": ["seeks", "sought", "seeking"],
    "shake": ["shakes", "shook", "shaken", "shaking"], "shoot": ["shoots", "shot", "shooting"],
    "sing": ["sings", "sang", "sung", "singing"], "sink": ["sinks", "sank", "sunk", "sinking"],
    "sit": ["sits", "sat", "sitting"], "steal": ["steals", "stole", "stolen", "stealing"],
    "strike": ["strikes", "struck", "striking"], "swim": ["swims", "swam", "swum", "swimming"],
    "throw": ["throws", "threw", "thrown", "throwing"],
    "understand": ["understands", "understood", "understanding"],
    "wake": ["wakes", "woke", "woken", "waking"], "wear": ["wears", "wore", "worn", "wearing"],
}

VOWELS = "aeiou"

# 功能词与极基础词不进入精讲（词表里仍可查）
STOP = set("""a an the of and to in that for as it be is are was were with their they this by or
from have has had not at on but you your we our us he she his her him them i me my mine who whom
whose which what when where why how all any both each few more most other some such no nor only
own same so than too very can will just should now do does did done being been having would could
may might must shall about into over after before under above between during through without
within across against among around because if while although though since until unless whether
either neither there here these those then than also etc one two three four five six seven eight
nine ten first second third many much lot lots another every none nobody nothing something
anything everything someone anyone everyone somebody anybody everybody please thank thanks hi
hello yes no ok okay oh well up down out off again further once ever never always often
sometimes usually really quite rather almost enough still yet even though""".split())
FUNC_POS = {"art.", "prep.", "conj.", "pron.", "aux.", "num.", "int."}

# CET-4 备考者多半已掌握的基础实词（不进精讲，仍可查）
BASIC = set("""time people work life world year day week month night morning new way make use good
great little long big small high low old young help need want know think see look come go get give
take find tell say ask try keep put turn start end part place thing man woman child friend family
home school book word name number water food house room door hand eye head face body heart mind
money car city country side kind sort type group line point case fact idea problem question answer
story play game run walk move live love like hate feel hear sound read write learn study teach
student teacher class test exam school college university study talk speak call show mean become
seem leave bring buy sell pay send build break hold stand sit sleep eat drink sleep wear watch
open close begin finish stop wait stay change grow happen appear believe hope wish thank try
important different difficult easy hard possible sure ready busy free full empty real true wrong
right best better worse worst more less most least many much few little own same other another
such only just also very well really quite rather almost enough still yet even ever never always
often sometimes usually together alone again once twice here there now then today tomorrow
yesterday morning afternoon evening week end start begin stop open close""".split())
ACAD_SUFFIX = re.compile(r"(tion|sion|ment|ity|ous|ive|able|ible|ance|ence|ical|ally|ular|ology)$")


def extract_wordlist(path):
    cache = os.path.join(BUILD, "wordlist_cache_" + ("cet4" if "四级" in os.path.basename(path) else "cet6") + ".json")
    if os.path.exists(cache):
        return json.load(open(cache, encoding="utf-8"))
    reader = PdfReader(path)
    if reader.is_encrypted:
        reader.decrypt("")
    lines = []
    for pg in reader.pages:
        for ln in (pg.extract_text() or "").splitlines():
            s = ln.strip()
            if not s or s.startswith("序号") or re.match(r"^第\s*\d+\s*页", s):
                continue
            lines.append(s)
    entries, cur = [], None
    for s in lines:
        m = re.match(r"^(\d+)\s+(.*)$", s)
        if m:
            if cur:
                entries.append(cur)
            cur = [int(m.group(1)), m.group(2)]
        elif cur:
            cur[1] += " " + s
    if cur:
        entries.append(cur)
    json.dump(entries, open(cache, "w", encoding="utf-8"), ensure_ascii=False)
    return entries


def split_meaning(rest):
    """把 IPA + 释义 拆开，释义按词性切分。"""
    # 找第一个词性标记的位置
    m = POS_RE.search(rest)
    if not m:
        return rest.strip(), []
    ipa = rest[:m.start()].strip(" .")
    meaning = rest[m.start():]
    senses = []
    marks = list(POS_RE.finditer(meaning))
    for i, mk in enumerate(marks):
        pos = POS_MAP.get(mk.group(1).lower(), mk.group(1).lower() + ".")
        end = marks[i + 1].start() if i + 1 < len(marks) else len(meaning)
        defn = meaning[mk.end():end].strip(" .;,，；")
        defn = re.sub(r"\s+", " ", defn)
        defn = defn.replace("（", "(").replace("）", ")")
        if defn:
            senses.append({"pos": pos, "def": defn})
    return ipa, senses


def normalize_cet6(rest):
    """六级词表把形容词写作 a.、副词写作 ad.，且词性后可能缺空格/点，先归一化。"""
    rest = re.sub(r"(?<![A-Za-z])a\.", " adj. ", rest)
    rest = re.sub(r"(?<![A-Za-z])ad\.", " adv. ", rest)
    rest = re.sub(r"(?<![A-Za-z])(n|vt|vi|v|adj|adv|prep|conj|pron|num|art|int|aux)(?=[\u4e00-\u9fff])", r"\1. ", rest)
    rest = re.sub(r"(?<![A-Za-z])(n|vt|vi|v|adj|adv|prep|conj|pron|num|art|int|aux)(?=\.)", r" \1", rest)
    return rest

def normalize_ipa(ipa):
    s = ipa.strip()
    s = s.replace("ә", "ə").replace("Λ", "ʌ").replace("ε", "ɛ")
    s = s.replace("‘", "ˈ").replace("’", "ˈ")
    s = re.sub(r"(?<=\w)'(?=\S)", "ˈ", s)      # 主重音
    s = re.sub(r"(?<=^)\.", "ˌ", s)            # 次重音
    s = re.sub(r"(?<=\s)\.", "ˌ", s)
    s = s.replace(":", "ː")
    s = s.replace("ə'", "əˈ").replace("'", "ˈ")
    return s.strip()


def forms_of(w, senses=None):
    w = w.lower()
    forms = {w}
    if w in IRREGULAR:
        forms.update(IRREGULAR[w])
    pos = {s.get("pos", "") for s in (senses or [])}
    has_n = "n." in pos
    has_v = bool(pos & {"v.", "vt.", "vi."})
    has_adj = "adj." in pos
    has_adv = "adv." in pos
    if not pos:
        has_n = has_v = has_adj = True
    if not re.match(r"^[a-z]+$", w):
        return forms
    # 名词复数
    if has_n:
        if w.endswith(("s", "x", "z", "ch", "sh")):
            forms.add(w + "es")
        elif w.endswith("y") and len(w) > 2 and w[-2] not in VOWELS:
            forms.add(w[:-1] + "ies")
        else:
            forms.add(w + "s")
    # 动词三单/过去/进行
    if has_v:
        if w.endswith(("s", "x", "z", "ch", "sh")):
            forms.add(w + "es")
        elif w.endswith("y") and len(w) > 2 and w[-2] not in VOWELS:
            forms.add(w[:-1] + "ies")
        else:
            forms.add(w + "s")
        if w.endswith("e"):
            forms.add(w + "d")
            forms.add(w[:-1] + "ing")
        else:
            forms.add(w + "ed")
            forms.add(w + "ing")
            if len(w) > 3 and w[-1] not in VOWELS and w[-1] not in "wxy":
                forms.add(w + w[-1] + "ed")
                forms.add(w + w[-1] + "ing")
    # 形容词/副词比较级与派生副词
    if has_adj or has_adv:
        if w.endswith("e"):
            forms.add(w + "r")
            forms.add(w + "st")
        elif w.endswith("y") and len(w) > 2:
            forms.add(w[:-1] + "ier")
            forms.add(w[:-1] + "iest")
        else:
            forms.add(w + "er")
            forms.add(w + "est")
        if has_adj:
            forms.add(w + "ly")
    return forms


def load_hf200():
    tags = set()
    if not os.path.exists(HF_PDF):
        return tags
    r = PdfReader(HF_PDF)
    if r.is_encrypted:
        r.decrypt("")
    txt = "\n".join((pg.extract_text() or "") for pg in r.pages)
    for m in re.finditer(r"\d+\.\s*([A-Za-z][A-Za-z\-]+)\s*[（(]", txt):
        tags.add(m.group(1).lower())
    return tags


def main():
    units = json.load(open(os.path.join(BUILD, "units.json"), encoding="utf-8"))
    sentences = json.load(open(os.path.join(BUILD, "sentences.json"), encoding="utf-8"))
    hf200 = load_hf200()

    # 词典：句子 token 索引
    tok_re = re.compile(r"[A-Za-z][A-Za-z'’-]*")
    sent_tokens = []
    index = {}
    for si, rec in enumerate(sentences):
        toks = [t.lower().strip("'’-") for t in tok_re.findall(rec["text"])]
        sent_tokens.append(toks)
        for t in set(toks):
            index.setdefault(t, []).append(si)

    entries = extract_wordlist(WORD_PDF)
    words = []
    seen = set()
    for idx, body in entries:
        m = re.match(r"^([A-Za-z][A-Za-z'’\-]*)(?:\s+(.*))?$", body)
        if not m:
            continue
        w = m.group(1).lower()
        rest = (m.group(2) or "").strip()
        if w in seen or len(w) < 2:
            continue
        ipa_raw, senses = split_meaning(rest)
        if not senses:
            continue
        seen.add(w)
        word = {
            "id": idx, "w": w, "ipa": normalize_ipa(ipa_raw), "ipaRaw": ipa_raw,
            "senses": senses,
            "mean": "；".join(f"{s['pos']} {s['def']}" for s in senses[:3]),
            "hf": w in hf200,
        }
        words.append(word)

    # 合并六级大纲词汇（与四级去重；level=cet6 表示六级新增）
    for w in words:
        w["cet4"] = True
        w["level"] = "cet4"
    cet6_entries = extract_wordlist(CET6_PDF)
    cet6_set = set()
    for idx, body in cet6_entries:
        m = re.match(r"^([A-Za-z][A-Za-z'’\-\.]*)\s+(.*)$", body)
        if m:
            cet6_set.add(m.group(1).lower().strip("."))
    next_id = max([w["id"] for w in words] + [0]) + 1
    added = 0
    for idx, body in cet6_entries:
        m = re.match(r"^([A-Za-z][A-Za-z'’\-\.]*)\s+(.*)$", body)
        if not m:
            continue
        w = m.group(1).lower().strip(".")
        rest = (m.group(2) or "").strip()
        if len(w) < 2 or w in seen:
            continue
        ipa_raw, senses = split_meaning(normalize_cet6(rest))
        if not senses:
            continue
        seen.add(w)
        words.append({
            "id": next_id, "w": w, "ipa": normalize_ipa(ipa_raw), "ipaRaw": ipa_raw,
            "senses": senses,
            "mean": "；".join(f"{s['pos']} {s['def']}" for s in senses[:3]),
            "hf": w in hf200, "level": "cet6", "cet4": False, "cet6": True
        })
        next_id += 1
        added += 1
    for w in words:
        if w["level"] == "cet4":
            w["cet6"] = w["w"] in cet6_set
    # 六级词表里个别行排版损坏（词条被空格拆开/缺少词性点），人工补录
    fallback = [
        {"w": "b.c", "ipa": "biː siː", "pos": "abbr.", "def": "公元前"},
        {"w": "bulletin", "ipa": "ˈbulitin", "pos": "n.", "def": "告示，公告，公报"},
        {"w": "perfume", "ipa": "ˈpəːfjuːm", "pos": "n.", "def": "香味，芳香；香料"},
        {"w": "successfully", "ipa": "səkˈsesfəli", "pos": "adv.", "def": "成功地"},
        {"w": "hi", "ipa": "hai", "pos": "int.", "def": "嗨（表示问候等）"},
        {"w": "i", "ipa": "ai", "pos": "pron.", "def": "我"}
    ]
    for rec in fallback:
        if rec["w"] in seen:
            continue
        seen.add(rec["w"])
        words.append({
            "id": next_id, "w": rec["w"], "ipa": rec["ipa"], "ipaRaw": rec["ipa"],
            "senses": [{"pos": rec["pos"], "def": rec["def"]}],
            "mean": rec["pos"] + " " + rec["def"], "hf": False,
            "level": "cet6", "cet4": False, "cet6": True
        })
        next_id += 1
    print(f"  cet6 entries: {len(cet6_entries)}, new six-only words: {added + len(fallback)}, cet6 set: {len(cet6_set)}")
    # 清理 PDF 抽词造成的明显残缺/重复词条
    RENAME = {"inser": "insert", "recommendati": "recommendation", "reservior": "reservoir", "dreadfu": "dreadful"}
    DROP = {"ture", "esp"}   # 与 true / especially 重复
    cleaned = []
    for w in words:
        if w["w"] in DROP:
            continue
        if w["w"] in RENAME:
            w["alias"] = w["w"]
            w["w"] = RENAME[w["w"]]
        cleaned.append(w)
    words = cleaned
    print(f"  cleaned malformed entries: dropped {len(DROP)}, renamed {len(RENAME)}")

    # 匹配 book 例句
    matched = 0
    for wi, word in enumerate(words):
        if wi % 500 == 0:
            print(f"  matching {wi}/{len(words)} ...", flush=True)
        cand_forms = forms_of(word["w"], word["senses"])
        base = word["w"]
        best, best_score = None, -1
        for form in cand_forms:
            for si in index.get(form, [])[:80]:
                rec = sentences[si]
                toks = sent_tokens[si]
                wc = len(toks)
                if not (6 <= wc <= 40):
                    continue
                if re.search(r"_{3,}|\.{3,}", rec["text"]):
                    continue
                score = 0.0
                if form == base:
                    score += 2.4
                elif base in toks:
                    score += 1.2
                else:
                    score -= 0.8          # 派生形式（如 -ly）优先级低
                if 8 <= wc <= 28:
                    score += 0.6
                if rec["text"].lower().startswith(base):
                    score += 0.3
                if form != base and form in IRREGULAR.get(base, []):
                    score += 0.5
                # 优先中等长度、避开被动/引用短句
                score -= abs(wc - 18) * 0.02
                if score > best_score:
                    best, best_score = si, score
        if best is not None:
            rec = sentences[best]
            word["ex"] = {"en": rec["text"], "src": rec["src"], "textId": rec["textId"], "unit": rec["unit"]}
            word["freq"] = len(index.get(base, []))
            matched += 1
        else:
            word["freq"] = len(index.get(base, []))

    # 精讲词选择：有例句 + 频次 + 高频标签（排除功能词/极基础词/屈折变体）
    allset = {w["w"] for w in words}
    irr_forms = {}
    for base, forms in IRREGULAR.items():
        for f in forms:
            irr_forms[f] = base

    def variant_of(w):
        s = w
        for suf in ("ed", "ing", "es", "s"):
            if s.endswith(suf) and len(s) >= len(suf) + 2:
                base = s[:-len(suf)]
                if base in allset:
                    return True
                if base + "e" in allset:
                    return True
        if s in irr_forms:
            return True
        return False

    def is_content(w):
        if w["w"] in STOP or len(w["w"]) <= 2 or w["w"] in BASIC:
            return False
        pos = {s["pos"] for s in w["senses"]}
        if pos and pos <= FUNC_POS:
            return False
        if variant_of(w["w"]):
            return False
        return True

    def difficulty(w):
        s = len(w["w"])
        bonus = 0.0
        if s >= 7:
            bonus += 1.3
        if s >= 9:
            bonus += 1.2
        if ACAD_SUFFIX.search(w["w"]):
            bonus += 1.2
        if w.get("hf"):
            bonus += 2.2
        return bonus

    frozen_path = os.path.join(BUILD, "core_list.json")
    if os.path.exists(frozen_path):
        frozen = set(json.load(open(frozen_path, encoding="utf-8")))
        chosen = [w for w in words if w["w"] in frozen]
        missing = frozen - {w["w"] for w in chosen}
        if missing:
            print("  ! frozen core not in wordlist:", len(missing), sorted(missing)[:10])
        per_text = {}
        for w in chosen:
            if w.get("ex"):
                per_text[w["ex"]["textId"]] = per_text.get(w["ex"]["textId"], 0) + 1
        core_ids = {w["w"] for w in chosen}
        print(f"  frozen core: {len(chosen)} / {len(frozen)}")
    else:
        cands = [w for w in words if w.get("ex") and is_content(w)]
        def prio(w):
            return w.get("freq", 0) * 1.5 + difficulty(w)
        cands.sort(key=prio, reverse=True)
        # 控制同一篇文章的密度，让精讲词覆盖 21 篇
        chosen, per_text = [], {}
        for w in cands:
            tid = w["ex"]["textId"]
            if per_text.get(tid, 0) >= 32:
                continue
            chosen.append(w)
            per_text[tid] = per_text.get(tid, 0) + 1
            if len(chosen) >= 600:
                break
        core_ids = {w["w"] for w in chosen}
    for w in words:
        w["core"] = w["w"] in core_ids

    # 精讲词的例句以撰稿输入为准（撰稿人已按这些句子写了中文译文）
    ex_input = {}
    for fn in ("enrich_a_input.json", "enrich_b_input.json"):
        p = os.path.join(BUILD, fn)
        if os.path.exists(p):
            for rec in json.load(open(p, encoding="utf-8")):
                ex_input[rec["w"]] = rec
    for w in words:
        if w["core"] and w["w"] in ex_input:
            rec = ex_input[w["w"]]
            w["ex"] = {"en": rec["ex"], "src": rec["src"], "textId": rec["textId"], "unit": rec["unit"]}
    # 少数例句含练习指令，采用人工替换版本（含译文）
    fix_path = os.path.join(BUILD, "ex_fix.json")
    if os.path.exists(fix_path):
        fixes = json.load(open(fix_path, encoding="utf-8"))
        for w in words:
            f = fixes.get(w["w"])
            if f and w["core"]:
                w["ex"] = {"en": f["ex"], "src": f["src"], "textId": f["textId"], "unit": f["unit"]}
                w["exZhOverride"] = f["exZh"]
                if f.get("note"):
                    w["note"] = f["note"]
        print("  example fixes applied:", len(fixes))
    no_ex = [w["w"] for w in words if w["core"] and not w.get("ex")]
    if no_ex:
        print("  ! core without example:", len(no_ex), no_ex[:10])

    # 输出
    with open(os.path.join(BUILD, "words.json"), "w", encoding="utf-8") as f:
        json.dump(words, f, ensure_ascii=False, indent=0)
    enrich = [{"w": w["w"], "ipa": w["ipa"], "senses": w["senses"],
               "ex": w["ex"]["en"], "src": w["ex"]["src"],
               "unit": w["ex"]["unit"], "textId": w["ex"]["textId"]}
              for w in chosen]
    with open(os.path.join(BUILD, "enrich_input.json"), "w", encoding="utf-8") as f:
        json.dump(enrich, f, ensure_ascii=False, indent=1)

    stats = {
        "entries": len(entries), "words": len(words), "matched": matched,
        "core": sum(1 for w in words if w["core"]),
        "hf200": len(hf200),
        "per_text": per_text,
        "per_unit": {u["id"]: sum(1 for w in chosen if w["ex"]["unit"] == u["id"]) for u in units},
    }
    with open(os.path.join(BUILD, "stats.json"), "w", encoding="utf-8") as f:
        json.dump(stats, f, ensure_ascii=False, indent=1)
    print(json.dumps(stats, ensure_ascii=False, indent=1))
    print("\n精讲词前 20:")
    for w in chosen[:20]:
        print(f"  {w['w']:16s} freq={w.get('freq'):2d} hf={w['hf']} | {w['ex']['src']}")


if __name__ == "__main__":
    main()
