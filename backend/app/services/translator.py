import json
import os

import anthropic
import httpx

# DeepL target_lang 對應表
_DEEPL_LANG_MAP = {
    "zh-TW": "ZH-HANT",
    "zh-CN": "ZH",
    "en": "EN-US",
    "ko": "KO",
}


async def translate(
    texts: list[str],
    provider: str,
    target_lang: str,
    source_lang: str = "ja",
) -> list[str]:
    """翻譯段落列表，回傳翻譯結果列表（順序對應）。"""
    if not texts:
        return []

    if provider == "deepl":
        return await _translate_deepl(texts, target_lang, source_lang)
    elif provider == "google":
        return await _translate_google(texts, target_lang, source_lang)
    elif provider == "claude":
        return await _translate_claude(texts, target_lang, source_lang)
    else:
        raise ValueError(f"不支援的翻譯供應商：{provider}")


async def _translate_deepl(
    texts: list[str], target_lang: str, source_lang: str
) -> list[str]:
    api_key = os.getenv("DEEPL_API_KEY")
    if not api_key:
        raise ValueError("未設定 DEEPL_API_KEY")

    deepl_target = _DEEPL_LANG_MAP.get(target_lang, target_lang.upper())

    async with httpx.AsyncClient() as client:
        response = await client.post(
            "https://api-free.deepl.com/v2/translate",
            headers={"Authorization": f"DeepL-Auth-Key {api_key}"},
            json={
                "text": texts,
                "source_lang": source_lang.upper(),
                "target_lang": deepl_target,
            },
        )
        response.raise_for_status()

    data = response.json()
    return [item["text"] for item in data["translations"]]


async def _translate_google(
    texts: list[str], target_lang: str, source_lang: str
) -> list[str]:
    api_key = os.getenv("GOOGLE_API_KEY")
    if not api_key:
        raise ValueError("未設定 GOOGLE_API_KEY")

    async with httpx.AsyncClient() as client:
        response = await client.post(
            "https://translation.googleapis.com/language/translate/v2",
            params={"key": api_key},
            json={"q": texts, "source": source_lang, "target": target_lang},
        )
        response.raise_for_status()

    data = response.json()
    return [item["translatedText"] for item in data["data"]["translations"]]


async def _translate_claude(
    texts: list[str], target_lang: str, source_lang: str
) -> list[str]:
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        raise ValueError("未設定 ANTHROPIC_API_KEY")

    lang_names = {
        "zh-TW": "繁體中文",
        "zh-CN": "簡體中文",
        "en": "English",
        "ko": "한국어",
    }
    target_name = lang_names.get(target_lang, target_lang)

    prompt = (
        f"請將以下日文段落翻譯為{target_name}。\n"
        "以 JSON 陣列格式回傳，每個元素對應一個段落的翻譯，不要加任何說明。\n\n"
        f"段落：\n{json.dumps(texts, ensure_ascii=False)}"
    )

    client = anthropic.AsyncAnthropic(api_key=api_key)
    message = await client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=4096,
        messages=[{"role": "user", "content": prompt}],
    )

    raw = message.content[0].text.strip()
    # 去除可能的 markdown code block
    if raw.startswith("```"):
        raw = raw.split("\n", 1)[1].rsplit("```", 1)[0].strip()

    return json.loads(raw)
