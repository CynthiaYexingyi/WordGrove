#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""Step 4: 把 build/*.json 合成 data/*.js（内嵌数据，file:// 可直接打开）。
用法: python tools/build_js.py
"""
import glob
import re
import json
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BUILD = os.path.join(ROOT, "build")
DATA = os.path.join(ROOT, "data")
os.makedirs(DATA, exist_ok=True)


def load_json(path, default):
    if not os.path.exists(path):
        return default
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def merge_enrich():
    merged = {}
    files = [p for p in sorted(glob.glob(os.path.join(BUILD, "enrich_[ab]_*.json")))
             if "_input" not in os.path.basename(p)]
    for p in files:
        try:
            arr = load_json(p, [])
        except Exception as e:
            print("  ! skip", os.path.basename(p), e)
            continue
        for rec in arr:
            w = (rec.get("w") or "").strip().lower()
            if w:
                merged[w] = rec
    return merged, files


def clean_endef(s):
    """部分撰稿批次带了词性前缀，统一去掉。"""
    s = s.strip()
    s = re.sub(r"^(n|vt|vi|v|adj|adv|ad|prep|conj|pron|num|art|int|aux)\.?\s+", "", s, flags=re.I)
    return s.strip()


def merge_endef():
    merged = {}
    files = [p for p in sorted(glob.glob(os.path.join(BUILD, "endef_*.json")))
             if "_input" not in os.path.basename(p)]
    for p in files:
        try:
            arr = load_json(p, [])
        except Exception as e:
            print("  ! skip", os.path.basename(p), e)
            continue
        for rec in arr:
            w = (rec.get("w") or "").strip().lower()
            if w and rec.get("enDef"):
                merged[w] = clean_endef(rec["enDef"])
    return merged, files


def _sent_norm(s):
    return re.sub(r"[^a-z]", "", s.lower())[:120]


def resolve_sent_zh(s, table, norm_index):
    if s in table:
        return table[s]
    n = _sent_norm(s)
    if n in norm_index:
        return norm_index[n]
    s2 = re.sub(r"^\d{1,2}[.)]?\s*", "", s).strip()
    if s2 in table:
        return table[s2]
    if _sent_norm(s2) in norm_index:
        return norm_index[_sent_norm(s2)]
    return None


def merge_sent_zh():
    """把 447 句补译合并成 en -> zh；已有精讲卡译文也并入。"""
    inp = load_json(os.path.join(BUILD, "sent_zh_input.json"), [])
    by_id = {r["id"]: r["en"] for r in inp}
    out = {}
    for p in sorted(glob.glob(os.path.join(BUILD, "sent_zh_*.json"))):
        if "_input" in os.path.basename(p) or "extra" in os.path.basename(p):
            continue
        for rec in load_json(p, []):
            en = by_id.get(rec.get("id"))
            zh = (rec.get("zh") or "").strip()
            if en and zh:
                out[en] = zh
    return out


def merge_lex():
    """合并全词表 4946 个词的 zh + mnemonic。"""
    merged = {}
    files = [p for p in sorted(glob.glob(os.path.join(BUILD, "lex_batch_*_*.json")))
             if "_input" not in os.path.basename(p)]
    for p in files:
        for rec in load_json(p, []):
            w = (rec.get("w") or "").strip().lower()
            if w and rec.get("zh") and rec.get("mnemonic"):
                merged[w] = rec
    return merged, files


def merge_syn():
    """合并全词表同义词；无记录给空数组。"""
    out = {}
    files = [p for p in sorted(glob.glob(os.path.join(BUILD, "syn_batch_*_*.json")))
             if "_input" not in os.path.basename(p)]
    for p in files:
        for rec in load_json(p, []):
            w = (rec.get("w") or "").strip().lower()
            syn = rec.get("syn")
            if w and isinstance(syn, list):
                out[w] = [x.strip() for x in syn if isinstance(x, str) and x.strip()]
    return out, files


def merge_examples():
    """合并全词表补齐的自写例句。"""
    out = {}
    files = [p for p in sorted(glob.glob(os.path.join(BUILD, "eg_batch_*_*.json")))
             if "_input" not in os.path.basename(p)]
    for p in files:
        for rec in load_json(p, []):
            w = (rec.get("w") or "").strip().lower()
            en = (rec.get("en") or "").strip()
            zh = (rec.get("zh") or "").strip()
            if w and en and zh:
                out[w] = {"en": en, "zh": zh}
    return out, files


def main():
    words = load_json(os.path.join(BUILD, "words.json"), [])
    units = load_json(os.path.join(BUILD, "units.json"), [])
    enrich, efiles = merge_enrich()
    endef, endef_files = merge_endef()
    lex, lfiles = merge_lex()
    syn, synfiles = merge_syn()
    extra_ex, exfiles = merge_examples()
    extra_articles = load_json(os.path.join(BUILD, "articles_extra.json"), [])
    if not extra_articles:
        extra_articles = load_json(os.path.join(BUILD, "articles_fallback.json"), [])
        manual_articles = load_json(os.path.join(BUILD, "articles_manual.json"), [])
        seen_src = {a.get("source", "") for a in extra_articles}
        for a in manual_articles:
            if a.get("source", "") not in seen_src:
                extra_articles.append(a)
        if not extra_articles:
            extra_articles = manual_articles

    # 词库合并精讲字段
    for w in words:
        rec = enrich.get(w["w"])
        if rec:
            w["zh"] = rec.get("zh", "")
            w["exZh"] = w.get("exZhOverride") or rec.get("exZh", "")
            w["colloc"] = rec.get("colloc", [])
            w["mnemonic"] = rec.get("mnemonic", "")
            if rec.get("note"):
                w["note"] = rec["note"]
            w["rich"] = True
        else:
            w["rich"] = False
        if w["w"] in endef:
            w["enDef"] = endef[w["w"]]
        elif w.get("alias") and w["alias"] in endef:
            w["enDef"] = endef[w["alias"]]
        rec2 = lex.get(w["w"])
        if rec2 and not w.get("rich"):
            w["zh"] = rec2["zh"]
            w["mnemonic"] = rec2["mnemonic"]
        w["syn"] = syn.get(w["w"], [])
        if not w.get("ex") and w["w"] in extra_ex:
            w["ex"] = {"en": extra_ex[w["w"]]["en"], "src": "自写例句"}
            w["exZh"] = extra_ex[w["w"]]["zh"]

    # 课文句子中文翻译：已有译文 + 补译，写 data/sentzh.js
    sent_zh = merge_sent_zh()
    extras = load_json(os.path.join(BUILD, "sent_zh_extra.json"), {})
    for k, v in extras.items():
        sent_zh[k] = v
    norm_index = {}
    for k, v in sent_zh.items():
        norm_index.setdefault(_sent_norm(k), v)
    # 让新段落里的同义句（编号/标点差异）也能命中译文
    for u in units:
        for t in u["texts"]:
            for sent in t.get("sentences", []):
                if sent not in sent_zh:
                    zh = resolve_sent_zh(sent, sent_zh, norm_index)
                    if zh:
                        sent_zh[sent] = zh
    for w in words:
        if w.get("ex") and w.get("exZh") and w["ex"]["en"] not in sent_zh:
            sent_zh[w["ex"]["en"]] = w["exZh"]
        elif w.get("ex") and not w.get("exZh"):
            zh = resolve_sent_zh(w["ex"]["en"], sent_zh, norm_index)
            if zh:
                w["exZh"] = zh
    for u in units:
        for t in u["texts"]:
            for sent in t.get("sentences", []):
                if sent not in sent_zh:
                    zh = resolve_sent_zh(sent, sent_zh, norm_index)
                    if zh:
                        sent_zh[sent] = zh
    # 所有别名补齐后，再回填一次例句译文
    for w in words:
        if w.get("ex") and not w.get("exZh"):
            zh = resolve_sent_zh(w["ex"]["en"], sent_zh, norm_index)
            if zh:
                w["exZh"] = zh
    missing_zh = sum(1 for w in words if w.get("ex") and not w.get("exZh"))
    raw_sent = json.dumps(sent_zh, ensure_ascii=False, separators=(",", ":"))
    with open(os.path.join(DATA, "sentzh.js"), "w", encoding="utf-8") as f:
        f.write("/* generated by tools/build_js.py — do not edit by hand */\n")
        f.write("window.CILIN_SENT_ZH=" + raw_sent + ";\n")
    print(f"sentzh {len(sent_zh)} sentences, words exZh missing {missing_zh}")

    q = {}
    for key in ["reading", "cloze", "matching", "translation", "writing", "listening"]:
        arr = load_json(os.path.join(BUILD, f"q_{key}.json"), [])
        q[key] = arr
    nt = load_json(os.path.join(BUILD, "new_training.json"), {})
    if not nt or not any(nt.get(k) for k in ["cloze3", "match15", "translation_u14a", "paraphrase_u14a"]):
        nt = load_json(os.path.join(BUILD, "new_training_manual.json"), {})
    q["cloze3"] = nt.get("cloze3", [])
    q["match15"] = nt.get("match15", [])
    q["translation_u14a"] = nt.get("translation_u14a", [])
    q["paraphrase_u14a"] = nt.get("paraphrase_u14a", [])
    tb = load_json(os.path.join(BUILD, "textbook_sets.json"), {})
    q["textbook"] = tb.get("sets", [])
    # 语料员提取的真题素材可并入（题库编辑未全写时兜底）
    rt = load_json(os.path.join(BUILD, "real_translations.json"), [])
    if rt and not q["translation"]:
        q["translation"] = rt
    wt = load_json(os.path.join(BUILD, "writing_topics.json"), [])
    if wt and not q["writing"]:
        q["writing"] = wt

    # 课外阅读（真题 / 外刊）并入 units，作为「课外」单元
    if extra_articles:
        import re
        ext = {"id": "x1", "title": "课外阅读", "cn": "课外", "extra": True, "texts": []}
        for i, a in enumerate(extra_articles):
            paras = [re.sub(r"\s+([.,;:!?])", r"\1", p.strip()) for p in (a.get("paragraphs") or []) if p and p.strip()]
            if not paras:
                continue
            if not a.get("sentences"):
                joined = " ".join(paras)
                a["sentences"] = [x.strip() for x in re.split(r"(?<=[.!?])\s+(?=[A-Z\"‘’'\u201c])", joined) if len(x.strip()) > 12]
            text = {
                "id": a.get("id") or ("x1t" + str(i + 1)),
                "label": "真题" if a.get("kind") == "exam" else "外刊",
                "title": a.get("title") or "Passage " + str(i + 1),
                "subtitle": a.get("subtitle") or "",
                "unit": "x1", "unitTitle": "Extra Reading", "unitCn": "课外",
                "pages": [], "words": len(" ".join(paras).split()),
                "paragraphs": paras, "sentences": a.get("sentences") or [],
                "source": a.get("source") or ""
            }
            ext["texts"].append(text)
        if ext["texts"]:
            units.append(ext)
            print(f"extra articles {len(ext['texts'])}")

    def dump(name, varname, obj):
        raw = json.dumps(obj, ensure_ascii=False, separators=(",", ":"))
        with open(os.path.join(DATA, name), "w", encoding="utf-8") as f:
            f.write("/* generated by tools/build_js.py — do not edit by hand */\n")
            f.write(f"window.{varname}={raw};\n")
        return len(raw)

    s1 = dump("words.js", "CILIN_WORDS", words)
    s2 = dump("units.js", "CILIN_UNITS", units)
    s3 = dump("questions.js", "CILIN_QUESTIONS", q)

    rich = sum(1 for w in words if w.get("rich"))
    print(f"words {len(words)} (rich {rich}, enDef {sum(1 for w in words if w.get('enDef'))}) -> data/words.js {s1/1024:.0f}KB")
    print(f"units {len(units)} -> data/units.js {s2/1024:.0f}KB")
    print("questions:", {k: len(v) for k, v in q.items()}, f"-> {s3/1024:.0f}KB")
    if efiles:
        print("enrich files:", [os.path.basename(p) for p in efiles])
    missing = [w["w"] for w in words if w.get("core") and not w.get("rich")]
    if missing:
        print("core without enrich:", len(missing), missing[:10])


if __name__ == "__main__":
    main()
