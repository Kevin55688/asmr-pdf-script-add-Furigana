import re

from app.services.furigana import add_furigana


def _contains_japanese(text: str) -> bool:
    """判斷文字中是否包含日文字元（平假名、片假名、漢字、日文標點）"""
    return bool(re.search(r'[\u3040-\u309f\u30a0-\u30ff\u4e00-\u9fff\u3000-\u303f]', text))


def generate_html(pages: list[dict]) -> str:
    """將各頁段落轉換為帶振り仮名的 HTML。

    Args:
        pages: list of {"page_num": int, "paragraphs": list[str]}

    Returns:
        完整 HTML 字串
    """
    html_parts = []

    for page in pages:
        html_parts.append(f'<section class="page" data-page="{page["page_num"]}">')
        html_parts.append(f'<h2>Page {page["page_num"]}</h2>')

        for paragraph in page["paragraphs"]:
            furigana_text = add_furigana(paragraph)
            html_parts.append(f"<p>{furigana_text}</p>")

        html_parts.append("</section>")

    return "\n".join(html_parts)


def generate_html_from_script_txt(text: str) -> str:
    """將 TXT 腳本文字逐行轉換為 HTML，保留原始排版並加入振り仮名。

    規則：
    - 分隔線（三個以上的 -）→ <hr>
    - 含日文字元的行 → 加振り仮名
    - 其他行（英文翻譯等）→ 保留原文
    - 空行 → 略過

    Returns:
        HTML 字串，含 <section class="page" data-page="1">
    """
    html_parts = ['<section class="page" data-page="1">']

    for line in text.splitlines():
        stripped = line.strip()
        if not stripped:
            continue
        if re.match(r'^-{3,}$', stripped):
            html_parts.append('<hr class="script-separator" style="border:none;border-top:1px solid #ccc;margin:4px 0;">')
        elif _contains_japanese(stripped):
            furigana_text = add_furigana(stripped)
            html_parts.append(f'<p class="line-ja">{furigana_text}</p>')
        else:
            html_parts.append(f'<p class="line-en" style="color:#888;font-size:0.85em;">{stripped}</p>')

    html_parts.append('</section>')
    return '\n'.join(html_parts)
