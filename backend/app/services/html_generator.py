from app.services.furigana import add_furigana


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
