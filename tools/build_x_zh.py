# -*- coding: utf-8 -*-
"""合并课外阅读（x1，11篇）逐句译文源 -> build/x_reading_zh.json

源为 build/sent_zh_x_src{1,2,3}.py 中的 TRANSLATIONS（人工逐句翻译，
key 严格等于 units.js 里对应句子的英文原文）。输出 en -> zh 字典，
由 tools/build_js.py 合入 data/sentzh.js。禁止手写 data/*.js。
"""
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
BUILD = os.path.join(ROOT, "build")
sys.path.insert(0, BUILD)

import sent_zh_x_src1, sent_zh_x_src2, sent_zh_x_src3  # noqa: E402


def main():
    merged = {}
    seen = {}
    for mod in (sent_zh_x_src1, sent_zh_x_src2, sent_zh_x_src3):
        for tid, pairs in mod.TRANSLATIONS.items():
            for en, zh in pairs:
                en = en.strip()
                zh = (zh or "").strip()
                if not en or not zh:
                    continue
                if en in merged:
                    raise SystemExit("duplicate sentence in sources: %s" % en[:80])
                merged[en] = zh
                seen.setdefault(tid, 0)
                seen[tid] += 1
    out = os.path.join(BUILD, "x_reading_zh.json")
    with open(out, "w", encoding="utf-8") as f:
        json.dump(merged, f, ensure_ascii=False, indent=1)
    print("wrote %s: %d sentences" % (out, len(merged)))
    print("per passage:", ", ".join("%s=%d" % (k, v) for k, v in sorted(seen.items())))


if __name__ == "__main__":
    main()
