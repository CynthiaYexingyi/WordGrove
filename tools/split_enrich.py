#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""Step 3: 把 600 精讲词拆成两份撰稿输入，并生成撰稿说明。
输出: build/enrich_a_input.json, build/enrich_b_input.json
"""
import json
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BUILD = os.path.join(ROOT, "build")

words = json.load(open(os.path.join(BUILD, "words.json"), encoding="utf-8"))
core = [w for w in words if w.get("core")]
assert len(core) == 600, len(core)

for fn, part, label in [("enrich_a_input.json", core[:300], "A"),
                        ("enrich_b_input.json", core[300:], "B")]:
    out = [{"w": w["w"], "ipa": w["ipa"], "senses": w["senses"], "mean": w["mean"],
            "ex": w["ex"]["en"], "src": w["ex"]["src"], "unit": w["ex"]["unit"],
            "textId": w["ex"]["textId"]} for w in part]
    with open(os.path.join(BUILD, fn), "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=1)
    print(fn, len(out), part[0]["w"], "->", part[-1]["w"])
