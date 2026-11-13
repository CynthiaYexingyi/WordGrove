#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""extract_real_exams.py — 从四级翻译真题 PDF 提取真实题干与参考译文

数据源：四六级/四级翻译真题（202012月-2024年12月）.pdf
产物：  build/real_translations.json（字段见 DATASCHEMA.md 4.4 / 5 节）

流程（可复现）：
  1. pypdf 逐页提取全文；
  2. unicodedata.normalize("NFKC") 清洗 —— 把康熙部首/全角字符归一；
  3. 修补 NFKC 处理不到的「CJK 部首补充区」字符（⻋→车、⻝→食、⺠→民 …）；
  4. 去掉页码装饰（○ ● · 1. 2.）、页眉「参考译文（…）」说明行；
  5. 按行统计汉字/拉丁字母比例判定中/英，合并成自然段；
  6. 按月份标题（24年12月 / 2023年12月翻译 …）归档，中文段 + 英文段成对；
  7. 从 33 组真实篇目中人工策展 12 组，补 id / title / keyPhrases / tips；
  8. 写出 UTF-8 JSON，并用 json.load 自验。

用法：
  python tools/extract_real_exams.py            # 生成 build/real_translations.json
  python tools/extract_real_exams.py --dump     # 打印清洗后的全文（人工校对用）
  python tools/extract_real_exams.py --list     # 只列出识别到的全部中英语对

依赖：pypdf（Python 3.9+）
"""

from __future__ import annotations

import argparse
import json
import re
import sys
import unicodedata
from pathlib import Path

try:
    import pypdf
except ImportError:  # pragma: no cover
    sys.exit("缺少依赖：pypdf。请先 pip install pypdf")

# --- 路径：脚本位于 <词林>/tools/，素材 PDF 位于上级 <四六级>/ ---------------
TOOLS_DIR = Path(__file__).resolve().parent
ROOT = TOOLS_DIR.parent                                   # 四六级/词林
SRC_PDF = ROOT.parent / "四级翻译真题（202012月-2024年12月）.pdf"
OUT_JSON = ROOT / "build" / "real_translations.json"
LEVEL = "cet4"

# --- NFKC 后仍残留的 CJK 部首补充区字符 -------------------------------------
# 这些码位（U+2E80–U+2EFF）在 NFKC 下不会映射到统一汉字，只能手工补齐。
RADICAL_MAP = {
    "⺠": "民",  # U+2EA0
    "⻁": "虎",  # U+2EC1
    "⻄": "西",  # U+2EC4
    "⻅": "见",  # U+2EC5
    "⻆": "角",  # U+2EC6
    "⻋": "车",  # U+2ECB
    "⻓": "长",  # U+2ED3
    "⻔": "门",  # U+2ED4
    "⻛": "风",  # U+2EDB
    "⻜": "飞",  # U+2EDC
    "⻝": "食",  # U+2EDD
    "⻥": "鱼",  # U+2EE5
    "⻩": "黄",  # U+2EE9
    "⻰": "龙",  # U+2EF0
}
RADICAL_RANGES = ((0x2E80, 0x2EFF), (0x2F00, 0x2FDF))

CJK = re.compile(r"[\u3400-\u9fff]")
LATIN = re.compile(r"[A-Za-z]")
PERIOD_RE = re.compile(r"^\s*(\d{2,4})年(\d{1,2})月(?:翻译)?\s*$")
# Directions 指令块（PDF 排版会折成两行，第二行不含 "Directions"）
DIRECTIONS_RE = re.compile(
    r"Directions:|For this part|translate a passage|from Chinese into English"
    r"|You should write your answer|Answer Sheet",
    re.IGNORECASE,
)
# 纯装饰行：项目符号、页码、单独编号
DECOR_RE = re.compile(r"^[○●◯◆◇·•\s]+$")


def load_pdf_text(pdf_path: Path) -> str:
    """逐页提取文本并拼接。"""
    reader = pypdf.PdfReader(str(pdf_path))
    pages = []
    for page in reader.pages:
        pages.append(page.extract_text() or "")
    return "\n".join(pages)


def normalize_text(raw: str) -> str:
    """NFKC 归一 + 修补 CJK 部首字符。"""
    text = unicodedata.normalize("NFKC", raw)
    for bad, good in RADICAL_MAP.items():
        text = text.replace(bad, good)
    return text


def leftover_radicals(text: str) -> set[str]:
    """找出仍落在部首区、未修补的字符（用于自检，正常应为空集）。"""
    bad = set()
    for ch in text:
        code = ord(ch)
        if any(lo <= code <= hi for lo, hi in RADICAL_RANGES):
            bad.add(ch)
    return bad


def strip_front_matter(text: str) -> str:
    """去掉正文前的「出题规律/模板句/备考策略」讲义部分，从第一处月份标题开始。"""
    lines = text.split("\n")
    for i, line in enumerate(lines):
        if PERIOD_RE.match(line):
            return "\n".join(lines[i:])
    return text


def classify(line: str) -> str | None:
    """按汉字与拉丁字母数量判定行类型：zh / en / None（噪声行）。"""
    han = len(CJK.findall(line))
    lat = len(LATIN.findall(line))
    if han == 0 and lat == 0:
        return None
    return "zh" if han >= lat else "en"


def join_lines(lines: list[str]) -> str:
    """把 PDF 的硬换行合并成自然段；中文之间不补空格。"""
    out = ""
    for line in lines:
        if not out:
            out = line
        elif CJK.search(out[-1]) or CJK.search(line[0]):
            out += line
        else:
            out += " " + line
    return re.sub(r"\s+", " ", out).strip()


def split_blocks(text: str) -> list[tuple[str, str]]:
    """把清洗后的正文切成 [(kind, text), ...]，并吞掉月份标题。

    月份标题单独返回成 ("period", "2024-12") 形式，供归档使用。
    """
    blocks: list[list] = []          # [kind, [line, ...]] 或 ["period", "YYYY-MM"]
    for raw_line in text.split("\n"):
        line = raw_line.strip()
        if not line or DECOR_RE.match(line):
            continue
        m = PERIOD_RE.match(line)
        if m:
            year, month = m.group(1), m.group(2)
            if len(year) == 2:
                year = "20" + year
            blocks.append(["period", f"{year}-{int(month):02d}"])
            continue
        if re.fullmatch(r"\d{1,2}[.、]?", line):     # 单独的 "1." "2."
            continue
        if line.startswith("参考译文"):
            continue                                 # 「参考译文（本译文仅供参考…）」
        if DIRECTIONS_RE.search(line):
            continue                                 # 每篇的英文指令（含被折行的后半句）
        kind = classify(line)
        if kind is None:
            continue
        if blocks and blocks[-1][0] == kind:
            blocks[-1][1].append(line)
        else:
            blocks.append([kind, [line]])

    out: list[tuple[str, str]] = []
    for kind, payload in blocks:
        if kind == "period":
            out.append(("period", payload))
        else:
            out.append((kind, join_lines(payload)))
    return out


def build_pairs(blocks: list[tuple[str, str]]) -> list[dict]:
    """把段流配成 [{'period','zh','reference'}]。中文段开启一组，其后英文段归入。"""
    pairs: list[dict] = []
    period = ""
    current: dict | None = None
    for kind, text in blocks:
        if kind == "period":
            period = text
            current = None
            continue
        if kind == "zh":
            current = {"period": period, "zh": text, "en": []}
            pairs.append(current)
        elif kind == "en" and current is not None:
            current["en"].append(text)
        # 若 current 为空（首组的 Directions 引导语），直接丢弃
    for pair in pairs:
        pair["reference"] = join_lines_plain(pair.pop("en"))
        pair["reference"] = pretty_reference(pair["reference"])
    return [p for p in pairs if p["zh"] and p["reference"]]


def join_lines_plain(parts: list[str]) -> str:
    """英文参考译文多段合并（跨页时会被切段）。"""
    return re.sub(r"\s+", " ", " ".join(parts)).strip()


# 逐字符校对：NFKC 把中文逗号/冒号/括号统一成了半角，这里按上下文还原。
ASCII_TO_FULLWIDTH = {",": "，", ";": "；", ":": "：", "?": "？", "!": "！",
                      "(": "（", ")": "）"}
ZH_PUNCT = "，。；：、！？（）"


def _neighbor(chars: list[str], i: int, step: int) -> str:
    """取相邻语境字符：跳过空格与半角标点，避免标点互相「挡住」判断。"""
    j = i + step
    while 0 <= j < len(chars) and (chars[j] == " " or chars[j] in ",;:?!"):
        j += step
    return chars[j] if 0 <= j < len(chars) else ""


def _is_zh_context(ch: str) -> bool:
    return bool(CJK.search(ch) or (ch and ch in ZH_PUNCT))


def pretty_zh(text: str) -> str:
    """中文题干排版整理：去中文间空格、半角标点还原为全角。"""
    # 1) 汉字与汉字之间的换行空格去掉
    text = re.sub(r"(?<=[\u3400-\u9fff])\s+(?=[\u3400-\u9fff])", "", text)
    # 2) 按上下文把半角标点还原成中文全角
    chars = list(text)
    n = len(chars)
    for i, ch in enumerate(chars):
        if ch not in ASCII_TO_FULLWIDTH:
            continue
        prev = _neighbor(chars, i, -1)
        nxt = _neighbor(chars, i, 1)
        prev_zh, nxt_zh = _is_zh_context(prev), _is_zh_context(nxt)
        if ch == "(":
            if prev_zh:
                chars[i] = "（"
        elif ch == ")":
            if nxt_zh or prev_zh:
                chars[i] = "）"
        elif prev_zh or nxt_zh:
            chars[i] = ASCII_TO_FULLWIDTH[ch]
    text = "".join(chars)
    # 3) 全角标点前后的冗余空格去掉
    text = re.sub(r"(?<=[" + ZH_PUNCT + r"])\s+", "", text)
    text = re.sub(r"\s+(?=[" + ZH_PUNCT + r"])", "", text)
    # 4) 肉眼校对：源 PDF 的 OCR 错字（逐处记录在 data_report.md）
    for bad, good in ZH_TEXT_FIXES.items():
        text = text.replace(bad, good)
    return text.strip()


# 参考译文中明显的排版/OCR 讹误（非重写，仅逐字符校对），修改处均记录在 data_report.md
REFERENCE_FIXES = {
    "Sileyuan": "Siheyuan",                       # 2024-06 四合院，原文误排
    "calendar, As an integral part": "calendar. As an integral part",  # 2024-06 农历，逗号误作句号
    "world. and it is deeply loved": "world, and it is deeply loved",  # 2022-09 太极拳，句号误作逗号
}

# 中文题干 OCR/录入错字（肉眼校对结果；均属明显的字形/同音误录）
ZH_TEXT_FIXES = {
    "大远河": "大运河",        # 2021-12 大运河
    "城市游客收益": "城市游客受益",  # 2023-03 乡村旅游
}


def pretty_reference(text: str) -> str:
    for bad, good in REFERENCE_FIXES.items():
        text = text.replace(bad, good)
    return text


# --- 人工策展：12 组真实真题（33 组里挑选，全部来自 PDF 原文） ----------------
# key 为中文题干中的唯一片段，用于和自动提取结果对位；id/title/考点为人工补写。
CURATION = [
    {
        "key": "中国新能源汽车产业发展迅速",
        "id": "trans-2024-12-nev",
        "title": "2024年12月 新能源汽车",
        "source": "2024年12月四级翻译真题",
        "keyPhrases": [
            {"en": "new energy vehicles", "zh": "新能源汽车"},
            {"en": "annual output", "zh": "年产量"},
            {"en": "account for", "zh": "占（比例）"},
            {"en": "global market share", "zh": "全球市场份额"},
            {"en": "reach new highs", "zh": "创出新高"},
            {"en": "capital investment", "zh": "资金投入"},
            {"en": "policy guidance", "zh": "政策引导"},
            {"en": "competitiveness", "zh": "竞争力"},
        ],
        "tips": [
            "数据表达：reached nearly 10 million units / accounting for more than 60 percent；现在分词作伴随状语。",
            "「通过加大资金投入和政策引导，鼓励……」用 by doing 结构；not only … but also 承接两个并列贡献。",
        ],
    },
    {
        "key": "数字展示中心于2014年开放启用",
        "id": "trans-2024-12-mogao",
        "title": "2024年12月 敦煌莫高窟数字展示中心",
        "source": "2024年12月四级翻译真题",
        "keyPhrases": [
            {"en": "Digital Exhibition Center", "zh": "数字展示中心"},
            {"en": "protection and utilization project", "zh": "保护利用工程"},
            {"en": "digital technology", "zh": "数字技术"},
            {"en": "multimedia display", "zh": "多媒体展示"},
            {"en": "artistic classics", "zh": "艺术经典"},
            {"en": "world cultural heritage", "zh": "世界文化遗产"},
            {"en": "properly protected", "zh": "得到妥善保护"},
        ],
        "tips": [
            "「……于2014年开放启用，是……重要组成部分」用过去分词短语 opened in 2014 作后置定语。",
            "「使游客……了解……鉴赏……」用 enable sb. to do；「减少／缩短／减轻」三个动词并列，注意形式一致。",
        ],
    },
    {
        "key": "中国政府十分重视环境保护",
        "id": "trans-2024-12-env",
        "title": "2024年12月 环境保护",
        "source": "2024年12月四级翻译真题",
        "keyPhrases": [
            {"en": "attach great importance to", "zh": "十分重视"},
            {"en": "soil pollution", "zh": "土壤污染"},
            {"en": "clean energy", "zh": "清洁能源"},
            {"en": "public transportation", "zh": "公共交通"},
            {"en": "bicycle-sharing", "zh": "共享单车"},
            {"en": "garbage sorting", "zh": "垃圾分类"},
            {"en": "urban and rural areas", "zh": "城市和农村"},
            {"en": "international cooperation", "zh": "国际合作"},
        ],
        "tips": [
            "总分结构：首句总述态度，后面用 including 列举四项措施，注意动名词并列。",
            "「正在绿起来、美起来」用 are becoming greener and more beautiful，比较级表变化，不用进行时。",
        ],
    },
    {
        "key": "四合院",
        "id": "trans-2024-06-siheyuan",
        "title": "2024年6月 四合院",
        "source": "2024年6月四级翻译真题",
        "keyPhrases": [
            {"en": "residential building", "zh": "住宅建筑"},
            {"en": "be characterized by", "zh": "其特点是"},
            {"en": "enclose", "zh": "合围"},
            {"en": "warm in winter and cool in summer", "zh": "冬暖夏凉"},
            {"en": "architectural style", "zh": "建筑风格"},
            {"en": "preservation of culture", "zh": "文化传承"},
            {"en": "the study of history", "zh": "历史研究"},
        ],
        "tips": [
            "定义句用同位语：Siheyuan, a kind of traditional Chinese residential building, is characterized by …。",
            "「冬暖夏凉，环境舒适」可用形容词短语 Usually warm in winter and cool in summer 作状语；转折用 However, due to …。",
        ],
    },
    {
        "key": "农历",
        "id": "trans-2024-06-lunar",
        "title": "2024年6月 农历",
        "source": "2024年6月四级翻译真题",
        "keyPhrases": [
            {"en": "lunar calendar", "zh": "农历"},
            {"en": "originate in", "zh": "起源于"},
            {"en": "movement patterns", "zh": "运行规律"},
            {"en": "agricultural production", "zh": "农业生产"},
            {"en": "yield and quality", "zh": "产量和质量"},
            {"en": "traditional festivals", "zh": "传统节日"},
            {"en": "integral part", "zh": "重要组成部分"},
        ],
        "tips": [
            "「起源于……，根据……制定」用非限制性定语从句 which originated in … was formulated based on …。",
            "「以便……」用 in order to；「从而提高」用 thereby + 现在分词，串成结果链。",
        ],
    },
    {
        "key": "健康饮食",
        "id": "trans-2023-12-diet",
        "title": "2023年12月 健康饮食",
        "source": "2023年12月四级翻译真题",
        "keyPhrases": [
            {"en": "lay great emphasis on", "zh": "十分重视"},
            {"en": "healthy diet", "zh": "健康饮食"},
            {"en": "proper nutrition", "zh": "合理营养"},
            {"en": "sense of happiness", "zh": "幸福感"},
            {"en": "food industry", "zh": "食品产业"},
            {"en": "governments at all levels", "zh": "各级政府"},
            {"en": "healthy China", "zh": "健康中国"},
        ],
        "tips": [
            "「对……有了更深刻的认识」用 have a deeper understanding of；「是……，也是……」两个表语并列。",
            "「确保人民饮食健康」用 ensure that 从句，宾语从句里注意代词与主谓一致。",
        ],
    },
    {
        "key": "终身教育",
        "id": "trans-2023-06-lifelong",
        "title": "2023年6月 终身教育",
        "source": "2023年6月四级翻译真题",
        "keyPhrases": [
            {"en": "lifelong education", "zh": "终身教育"},
            {"en": "continuing education", "zh": "继续教育"},
            {"en": "an effective way", "zh": "有效途径"},
            {"en": "talent cultivation", "zh": "人才培养"},
            {"en": "teaching resources", "zh": "教学资源"},
            {"en": "cater to social needs", "zh": "适应社会需求"},
            {"en": "national development strategy", "zh": "国家发展战略"},
        ],
        "tips": [
            "「作为人才培养的基地」用 As the base for … 作状语；「理应成为」用 should become，不用 must。",
            "「探索一条符合中国国情的……新路」用 explore a new path … that suits China's specific conditions，定语从句后置。",
        ],
    },
    {
        "key": "乡村旅游",
        "id": "trans-2023-03-rural",
        "title": "2023年3月 乡村旅游",
        "source": "2023年3月四级翻译真题",
        "keyPhrases": [
            {"en": "urban residents", "zh": "城市居民"},
            {"en": "rural idyllic scenery", "zh": "田园风光"},
            {"en": "farmhouse meals", "zh": "农家饭菜"},
            {"en": "relieve stress", "zh": "舒缓压力"},
            {"en": "physical and mental health", "zh": "身心健康"},
            {"en": "increase farmers' incomes", "zh": "增加农民收入"},
            {"en": "rural economic development", "zh": "乡村经济发展"},
        ],
        "tips": [
            "「为……所吸引」用被动 be attracted by；「住在……品尝……」用两个并列谓语。",
            "「不仅……同时也能……」用 not only … but also，注意 benefit 与 increase 的形式平衡。",
        ],
    },
    {
        "key": "冬至",
        "id": "trans-2022-12-winter-solstice",
        "title": "2022年12月 冬至",
        "source": "2022年12月四级翻译真题",
        "keyPhrases": [
            {"en": "Winter Solstice", "zh": "冬至"},
            {"en": "shortest daytime", "zh": "白昼最短"},
            {"en": "mark the beginning of", "zh": "标志着……的开始"},
            {"en": "outdoor activities", "zh": "户外活动"},
            {"en": "irrigation system", "zh": "灌溉系统"},
            {"en": "protect crops from freezing", "zh": "农作物防冻"},
            {"en": "folk custom", "zh": "民间习俗"},
        ],
        "tips": [
            "「是……的一天，标志着……」用现在分词 marking the beginning of … 作伴随状语，避免两个谓语并列。",
            "「北方人……南方人……」用 while 对比；「忙于」用 be busy with，后接名词或动名词。",
        ],
    },
    {
        "key": "太极拳",
        "id": "trans-2022-09-taiji",
        "title": "2022年9月 太极拳",
        "source": "2022年9月四级翻译真题",
        "keyPhrases": [
            {"en": "Taijiquan", "zh": "太极拳"},
            {"en": "martial arts", "zh": "武术"},
            {"en": "self-defense", "zh": "自卫"},
            {"en": "physical and mental health", "zh": "身心健康"},
            {"en": "flexibility and balance", "zh": "灵活性和平衡力"},
            {"en": "reduce stress and anxiety", "zh": "减少压力和焦虑"},
            {"en": "gentle and smooth movements", "zh": "轻柔流畅的动作"},
        ],
        "tips": [
            "「起源于……，是……分支」用现在分词 stemming from ancient China 作状语，主句用 is an important branch of …。",
            "「最初是为了自卫，现在是……」用 Originally practiced for self-defense, now it is …，过去分词 + 时间对比。",
        ],
    },
    {
        "key": "大运河",
        "id": "trans-2021-12-canal",
        "title": "2021年12月 大运河",
        "source": "2021年12月四级翻译真题",
        "keyPhrases": [
            {"en": "man-made river", "zh": "人工河"},
            {"en": "stretch from … to …", "zh": "从……延伸到……"},
            {"en": "be hailed as", "zh": "被誉为"},
            {"en": "grain transportation", "zh": "粮食运输"},
            {"en": "industrial and commercial hubs", "zh": "工商业中心"},
            {"en": "personnel exchanges", "zh": "人员往来"},
            {"en": "cultural interaction", "zh": "文化交流"},
        ],
        "tips": [
            "「世界上最长的……」用同位语 the longest man-made river the world has ever seen，或定语从句 that the world has ever seen。",
            "「长久以来一直发挥……」用现在完成进行时 has been playing；「有力地促进了」用现在分词 greatly enhancing 表结果。",
        ],
    },
    {
        "key": "生活在中国不同地区",
        "id": "trans-2020-12-diets",
        "title": "2020年12月 饮食差异",
        "source": "2020年12月四级翻译真题",
        "keyPhrases": [
            {"en": "a variety of diets", "zh": "饮食多样"},
            {"en": "made of flour", "zh": "面食"},
            {"en": "freshwater aquatic products", "zh": "淡水水产品"},
            {"en": "account for a considerable proportion", "zh": "占相当大比例"},
            {"en": "dairy products", "zh": "奶制品"},
            {"en": "spicy food", "zh": "辛辣食物"},
            {"en": "cooking methods", "zh": "烹饪方式"},
        ],
        "tips": [
            "南北、沿海与内陆的对比用 while / whereas 引出，注意前后分句主语不同。",
            "「占相当大比例」用 account for a considerable proportion of；food 作「食物」不可数，sweets 才用复数。",
        ],
    },
]


def extract() -> list[dict]:
    """完整流水线：读 PDF → 清洗 → 切段 → 配对。"""
    raw = load_pdf_text(SRC_PDF)
    text = normalize_text(raw)
    bad = leftover_radicals(text)
    if bad:
        print(f"[警告] 仍有未修补的部首字符：{sorted(bad)}", file=sys.stderr)
    body = strip_front_matter(text)
    blocks = split_blocks(body)
    pairs = build_pairs(blocks)
    return pairs


def curate(pairs: list[dict]) -> list[dict]:
    """按 CURATION 对位真实语对，输出 schema 4.4 结构。"""
    used: set[int] = set()
    entries: list[dict] = []
    for spec in CURATION:
        hit = None
        for idx, pair in enumerate(pairs):
            if idx in used:
                continue
            if spec["key"] in pair["zh"]:
                hit = idx
                break
        if hit is None:
            raise SystemExit(f"[错误] 未在 PDF 中找到策展条目：{spec['key']}")
        used.add(hit)
        pair = pairs[hit]
        entries.append({
            "id": spec["id"],
            "level": LEVEL,
            "title": spec["title"],
            "zh": pretty_zh(pair["zh"]),
            "reference": pretty_reference(pair["reference"]),
            "keyPhrases": spec["keyPhrases"],
            "tips": spec["tips"],
            "source": spec["source"],
        })
    return entries


def validate(entries: list[dict]) -> None:
    """结构自检：字段齐全、条数足够、考点数量合规、无残留部首。"""
    if len(entries) < 10:
        raise SystemExit(f"[错误] 条数不足 10：{len(entries)}")
    ids = [e["id"] for e in entries]
    if len(ids) != len(set(ids)):
        raise SystemExit("[错误] id 有重复")
    for e in entries:
        for field in ("id", "level", "title", "zh", "reference", "source"):
            if not isinstance(e.get(field), str) or not e[field].strip():
                raise SystemExit(f"[错误] {e.get('id')} 字段缺失/为空：{field}")
        if e["level"] != "cet4":
            raise SystemExit(f"[错误] {e['id']} level 应为 cet4")
        if not CJK.search(e["zh"]):
            raise SystemExit(f"[错误] {e['id']} zh 不含中文")
        if not LATIN.search(e["reference"]):
            raise SystemExit(f"[错误] {e['id']} reference 不含英文")
        if not 5 <= len(e["keyPhrases"]) <= 8:
            raise SystemExit(f"[错误] {e['id']} keyPhrases 应为 5–8 条")
        if not 2 <= len(e["tips"]) <= 3:
            raise SystemExit(f"[错误] {e['id']} tips 应为 2–3 条")
        for kp in e["keyPhrases"]:
            if not (kp.get("en") and kp.get("zh")):
                raise SystemExit(f"[错误] {e['id']} keyPhrases 缺 en/zh")
        bad = leftover_radicals(e["zh"] + e["reference"])
        if bad:
            raise SystemExit(f"[错误] {e['id']} 残留部首：{bad}")


def main() -> None:
    parser = argparse.ArgumentParser(description="提取四级翻译真题题干与参考译文")
    parser.add_argument("--dump", action="store_true", help="打印清洗后全文（校对用）")
    parser.add_argument("--list", action="store_true", help="只列出识别到的中英语对")
    args = parser.parse_args()

    pairs = extract()
    if args.dump:
        for pair in pairs:
            print(f"\n===== {pair['period']} =====")
            print("【中】", pretty_zh(pair["zh"]))
            print("【英】", pair["reference"])
        return
    if args.list:
        for i, pair in enumerate(pairs, 1):
            print(f"{i:02d}. {pair['period']} | {pretty_zh(pair['zh'])[:36]}…")
        print(f"共 {len(pairs)} 组")
        return

    entries = curate(pairs)
    validate(entries)
    OUT_JSON.parent.mkdir(parents=True, exist_ok=True)
    OUT_JSON.write_text(
        json.dumps(entries, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    # 写后自验：重新读一次，确认是合法 JSON
    reloaded = json.loads(OUT_JSON.read_text(encoding="utf-8"))
    assert len(reloaded) == len(entries)
    print(f"[OK] 识别真实语对 {len(pairs)} 组，写入 {len(entries)} 条 → {OUT_JSON}")
    print(f"[OK] 自验通过：json.load 成功，{len(reloaded)} 条")


if __name__ == "__main__":
    main()
