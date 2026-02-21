import fitz


def _has_vertical_text(blocks: list) -> bool:
    """偵測是否為縦書き（垂直排版）：逐字換行時 newline 比例 > 0.7"""
    for b in blocks:
        if b[6] != 0:
            continue
        text = b[4]
        if len(text.replace("\n", "")) < 5:
            continue
        newlines = text.count("\n")
        chars = len(text.replace("\n", ""))
        if newlines / chars > 0.7:
            return True
    return False


def _extract_vertical(text_blocks: list, avg_char_h: float) -> list[str]:
    """縦書き用：從右欄往左、由上到下排序，合併同欄相鄰 block"""
    COLUMN_THRESHOLD = 20  # px：x0 差距在此範圍內視為同一欄
    gap_threshold = avg_char_h  # 欄內 block 間距 ≤ 平均字高即合併

    # 右欄優先（x 降序），同欄內由上到下（y 升序）
    text_blocks = sorted(text_blocks, key=lambda b: (-b[0], b[1]))

    # 依 x0 分欄
    columns: list[list] = []
    current_col = [text_blocks[0]]
    for block in text_blocks[1:]:
        ref_x0 = current_col[0][0]
        if abs(block[0] - ref_x0) <= COLUMN_THRESHOLD:
            current_col.append(block)
        else:
            columns.append(current_col)
            current_col = [block]
    columns.append(current_col)

    paragraphs: list[str] = []
    for col_blocks in columns:
        col_blocks.sort(key=lambda b: b[1])  # 同欄內依 y0 升序

        current_group = [col_blocks[0]]
        prev_y1 = col_blocks[0][3]

        for block in col_blocks[1:]:
            gap = block[1] - prev_y1
            if gap <= gap_threshold:
                current_group.append(block)
            else:
                text = "".join(
                    b[4].strip().replace("\n", "") for b in current_group
                )
                if text:
                    paragraphs.append(text)
                current_group = [block]
            prev_y1 = block[3]

        text = "".join(b[4].strip().replace("\n", "") for b in current_group)
        if text:
            paragraphs.append(text)

    return paragraphs


def _extract_horizontal(text_blocks: list, avg_height: float) -> list[str]:
    """橫書き用：合併同行（Y 重疊）的 block，再依間距分段"""
    text_blocks = sorted(text_blocks, key=lambda b: (b[1], b[0]))

    # 合併 Y 軸重疊的 block（同一行）
    line_groups: list[list] = []
    current_group = [text_blocks[0]]
    for block in text_blocks[1:]:
        g_y0 = min(b[1] for b in current_group)
        g_y1 = max(b[3] for b in current_group)
        if block[1] < g_y1 and block[3] > g_y0:
            current_group.append(block)
        else:
            line_groups.append(current_group)
            current_group = [block]
    line_groups.append(current_group)

    lines: list[tuple[float, float, str]] = []
    for group in line_groups:
        group_sorted = sorted(group, key=lambda b: b[0])
        text = "".join(b[4].strip().replace("\n", "") for b in group_sorted)
        if text:
            lines.append((
                min(b[1] for b in group),
                max(b[3] for b in group),
                text,
            ))

    if not lines:
        return []

    gap_threshold = avg_height * 0.5
    paragraphs: list[str] = []
    current_para = [lines[0][2]]
    prev_y1 = lines[0][1]

    for y0, y1, text in lines[1:]:
        if y0 - prev_y1 <= gap_threshold:
            current_para.append(text)
        else:
            combined = "".join(current_para)
            if combined:
                paragraphs.append(combined)
            current_para = [text]
        prev_y1 = y1

    combined = "".join(current_para)
    if combined:
        paragraphs.append(combined)

    return paragraphs


def extract_text_by_pages(pdf_path: str) -> list[dict]:
    """從 PDF 逐頁提取文字，保留段落結構。
    自動偵測縦書き（垂直）或橫書き（水平）排版。

    Returns:
        list of {"page_num": int, "paragraphs": list[str]}
    """
    doc = fitz.open(pdf_path)
    pages = []
    for page in doc:
        blocks = page.get_text("blocks")
        text_blocks = [b for b in blocks if b[6] == 0 and b[4].strip()]

        if not text_blocks:
            pages.append({"page_num": page.number + 1, "paragraphs": []})
            continue

        if _has_vertical_text(blocks):
            # 縦書き：計算平均字高（block 高度 ÷ 行數）
            char_heights = []
            for b in text_blocks:
                lines = [ln for ln in b[4].strip().split("\n") if ln]
                if lines:
                    char_heights.append((b[3] - b[1]) / len(lines))
            avg_char_h = sum(char_heights) / len(char_heights) if char_heights else 14.0
            paragraphs = _extract_vertical(text_blocks, avg_char_h)
        else:
            heights = [b[3] - b[1] for b in text_blocks if b[3] - b[1] > 0]
            avg_height = sum(heights) / len(heights) if heights else 12.0
            paragraphs = _extract_horizontal(text_blocks, avg_height)

        pages.append({"page_num": page.number + 1, "paragraphs": paragraphs})
    doc.close()
    return pages
