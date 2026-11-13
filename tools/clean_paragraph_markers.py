#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""清理 词林 数据里残留的旧「分段数字」标记。

背景
----
课文/例句在分句时，原本用于分隔段落的编号（如 "1." "2." "10."）被粘到了
下一句的句首，且数字后的英文句点之后没有空格，例如：
    "...great employees. 2.Some hotels aim to..."
    "...intelligence matter. 1.First, implicit theories..."
    "...drawing board. 10.Although Perkin's fame..."
    "...factories.) 13.Bentham was also..."   （units 里也有）

这些不是正文内容，应删掉数字与句点，仅在前后文之间保留一个空格。

匹配规则（安全、零误伤）
----------------------
    (空白)(1~3位数字).(大写字母)
- 数字前必须有空白（排除 "U.S." "Ph.D." "e.g." 等缩写，以及 "3.14" 小数）
- 数字后必须是「句点 + 大写字母 + 无空格」（正常的编号列表是 "1. Text" 有空格，
  不会被命中；只有被压扁的段落标记才会命中）
- 数字限 1~3 位（年份 "2020." 不会被命中）

对哪些文件生效
--------------
自动扫描每个 词林 根目录下的 data/*.js 与 build/*.json，凡命中即清理并写回；
零命中的文件不动（符合「尽量少改文件」原则）。

用法
----
  python tools/clean_paragraph_markers.py [--dry-run] [根目录1] [根目录2] ...
不传根目录时，默认处理本 tools/ 所在目录（即 词林 自身）。
"""
import os
import re
import sys

PAT = re.compile(r"(\s+)(\d{1,3})\.([A-Z])")
REPL = r"\1\3"


def clean_file(path):
    """返回 (清理处数, 残留处数, 新文本)；未命中返回 (0, 0, 原文)。"""
    with open(path, encoding="utf-8") as f:
        txt = f.read()
    n = len(PAT.findall(txt))
    if n == 0:
        return 0, 0, txt
    new = PAT.sub(REPL, txt)
    remain = len(PAT.findall(new))
    return n, remain, new


def main():
    args = sys.argv[1:]
    dry = "--dry-run" in args
    roots = [a for a in args if a != "--dry-run"]
    if not roots:
        # 默认：tools/ 的上一级（词林 根目录）
        roots = [os.path.dirname(os.path.dirname(os.path.abspath(__file__)))]

    total = 0
    for root in roots:
        if not os.path.isdir(root):
            print("跳过不存在的目录:", root)
            continue
        print(f"== 处理目录: {root} ==")
        for sub, ext in (("data", ".js"), ("build", ".json")):
            d = os.path.join(root, sub)
            if not os.path.isdir(d):
                continue
            for name in sorted(os.listdir(d)):
                if not name.endswith(ext):
                    continue
                p = os.path.join(d, name)
                try:
                    n, remain, new = clean_file(p)
                except Exception as e:
                    print(f"  ! 处理失败 {sub}/{name}: {e}")
                    continue
                if n == 0:
                    continue
                total += n
                verb = "【演练-未写回】" if dry else "已清理"
                print(f"  {verb} {sub}/{name}: 清理 {n} 处，残留 {remain} 处")
                if not dry:
                    with open(p, "w", encoding="utf-8") as f:
                        f.write(new)

    print(f"\n共{'将' if dry else ''}清理 {total} 处残留分段数字。")

    # 自检：两个目录的 data 关键文件是否还有残留
    print("=== 自检 data/{words,sentzh,units}.js 是否还有残留 ===")
    for root in roots:
        for name in ("words.js", "sentzh.js", "units.js"):
            p = os.path.join(root, "data", name)
            if not os.path.exists(p):
                continue
            t = open(p, encoding="utf-8").read()
            print(f"  {os.path.basename(root)}/data/{name}: {len(PAT.findall(t))}")


if __name__ == "__main__":
    main()
