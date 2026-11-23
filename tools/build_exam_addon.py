#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""期末备考增量：Part I B 同义替换 20 题（build/exam_addon.json 的 synonym_u14）。

数据来源：data/words.js 的 syn[] 与课文例句（ex.en，src 标注 U1-U4）。
每题：从课文中挑一个实词，用其英文同义词替换划线部分；四个选项 = 正确同义词 + 3 个
来自同词表其它词条、语义明显不同的干扰词。生成物勿手改，改脚本后重跑。
"""
import json, os, re, io, random

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BUILD = os.path.join(ROOT, "build")
DATA = os.path.join(ROOT, "data")


def load_words():
    s = io.open(os.path.join(DATA, "words.js"), encoding="utf-8").read()
    m = re.search(r"=\s*(\[.*\])\s*;?\s*$", s, re.S)
    return json.loads(m.group(1))


# (headword, 出现在例句中的确切形式, 正确同义词, [3 个干扰项], 单元, 标题)
# 例句须在 src 含 Unit N 且 ex.en 含确切形式；正确同义词须在 syn[] 中。
ITEMS = [
    ("curiosity", "curiosity", "inquisitiveness", ["courage", "caution", "vanity"], "u1", "珀金的好奇心"),
    ("enthusiasm", "enthusiasm", "passion", ["reluctance", "doubt", "leisure"], "u1", "对化学的热情"),
    ("synthetic", "synthetic", "artificial", ["natural", "genuine", "organic"], "u1", "合成染料"),
    ("fortune", "fortune", "wealth", ["poverty", "misfortune", "honor"], "u1", "名利双收"),
    ("obtain", "obtain", "acquire", ["abandon", "discard", "lose"], "u1", "难以获得"),
    ("abandon", "abandoned", "desert", ["keep", "guard", "enjoy"], "u2", "放弃城堡"),
    ("absorb", "absorb", "take in", ["give out", "release", "reject"], "u2", "吸收语言"),
    ("amount", "amount", "quantity", ["quality", "shortage", "density"], "u2", "大脑激活量"),
    ("argument", "argument", "reason", ["contradiction", "denial", "rebuttal"], "u2", "有力的论据"),
    ("decline", "decline", "decrease", ["increase", "peak", "expand"], "u2", "玩耍减少"),
    ("affect", "affected", "influence", ["ignore", "measure", "resist"], "u2", "影响大脑"),
    ("acquire", "acquire", "obtain", ["dismiss", "train", "evaluate"], "u3", "招揽优秀员工"),
    ("retain", "retain", "keep", ["dismiss", "release", "lose"], "u3", "留住员工"),
    ("inspire", "inspire", "motivate", ["discourage", "dismiss", "restrain"], "u3", "激励员工"),
    ("adequate", "adequate", "sufficient", ["scarce", "brief", "insufficient"], "u3", "充足的休息"),
    ("intrinsic", "intrinsic", "inherent", ["external", "superficial", "accidental"], "u3", "内在激励"),
    ("beneficial", "beneficial", "helpful", ["harmful", "useless", "critical"], "u3", "有益的做法"),
    ("inevitable", "inevitable", "unavoidable", ["preventable", "avoidable", "optional"], "u4", "偏见难免"),
    ("testimony", "testimony", "evidence", ["opinion", "legend", "fiction"], "u4", "文物的证词"),
    ("bias", "bias", "prejudice", ["accuracy", "balance", "objectivity"], "u4", "叙述偏见"),
]

EXPECT_UNIT = {"u1": "Unit 1", "u2": "Unit 2", "u3": "Unit 3", "u4": "Unit 4"}


def form_in_sentence(word, form, sent):
    # 词形还原：确切 token（含屈折）优先，大小写/标点边界
    pat = re.compile(r"(?<![A-Za-z])" + re.escape(form) + r"(?![A-Za-z])", re.I)
    return pat.search(sent) is not None


def main():
    words = load_words()
    byw = {w["w"]: w for w in words}
    out = []
    errors = []
    for head, form, correct, distract, unit, title in ITEMS:
        w = byw.get(head)
        if not w:
            errors.append("no word " + head); continue
        syn = [x.lower() for x in (w.get("syn") or [])]
        if correct.lower() not in syn:
            errors.append("syn mismatch %s: %s not in %s" % (head, correct, syn)); continue
        ex = w.get("ex") or {}
        en = ex.get("en", "") or ""
        src = ex.get("src", "") or ""
        if EXPECT_UNIT[unit] not in src:
            errors.append("src unit mismatch %s: %s" % (head, src)); continue
        if not form_in_sentence(head, form, en):
            errors.append("form not in sentence %s: %s" % (head, en)); continue
        # 正确项需语义可替换：用 correct 的词典同义覆盖检查（syn 已保证）
        opts = [correct] + list(distract)
        if len(set(o.lower() for o in opts)) != 4:
            errors.append("dup options " + head); continue
        # 保证干扰词不是该词的同义词
        bad = [d for d in distract if d.lower() in syn]
        if bad:
            errors.append("distractor is synonym %s: %s" % (head, bad)); continue
        # 下划线标记：把例句中的目标形式用 «» 包起来（渲染层转成 <u>）
        marked = re.sub(r"(?<![A-Za-z])(" + re.escape(form) + r")(?![A-Za-z])",
                        r"«\1»", en, count=1, flags=re.I)
        zh = w.get("zh", "") or ""
        out.append({
            "id": "syn-" + unit + "-" + head,
            "unit": unit,
            "title": title + " · " + head,
            "stem": marked,
            "options": opts,
            "answer": 0,
            "explain": "划线词 “%s” 意为「%s」；%s 是其同义词，代入后句意不变。" % (
                form, zh.split("；")[0].strip() or zh.strip()[:24], correct),
            "source": "课本 %s Text A/B/C · 词库 syn[] 同义替换（%s）" % (EXPECT_UNIT[unit], src[:40]),
        })
    if errors:
        raise SystemExit("BUILD FAILED:\n" + "\n".join(errors))
    if len(out) != 20:
        raise SystemExit("expect 20 items, got %d" % len(out))
    path = os.path.join(BUILD, "exam_addon.json")
    with io.open(path, "w", encoding="utf-8") as f:
        f.write(json.dumps({"synonym_u14": out}, ensure_ascii=False, indent=2) + "\n")
    print("wrote", path, "synonym_u14", len(out))
    for x in out:
        print(" ", x["id"], "|", x["options"], "|", x["stem"][:70])


if __name__ == "__main__":
    main()
