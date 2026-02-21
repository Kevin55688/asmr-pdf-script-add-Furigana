import pytest
from unittest.mock import AsyncMock, patch, MagicMock


# ── DeepL ──────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_deepl_translates_texts():
    from app.services.translator import translate
    mock_response = MagicMock()
    mock_response.json.return_value = {
        "translations": [{"text": "東京"}, {"text": "大阪"}]
    }
    mock_response.raise_for_status = MagicMock()

    with patch("app.services.translator.httpx.AsyncClient") as MockClient:
        MockClient.return_value.__aenter__.return_value.post = AsyncMock(
            return_value=mock_response
        )
        with patch.dict("os.environ", {"DEEPL_API_KEY": "test-key"}):
            result = await translate(["東京です", "大阪です"], "deepl", "zh-TW")

    assert result == ["東京", "大阪"]


@pytest.mark.asyncio
async def test_deepl_raises_when_no_api_key():
    from app.services.translator import translate
    import os
    with patch.dict("os.environ", {}, clear=True):
        os.environ.pop("DEEPL_API_KEY", None)
        with pytest.raises(ValueError, match="DEEPL_API_KEY"):
            await translate(["テスト"], "deepl", "zh-TW")


# ── Google ─────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_google_translates_texts():
    from app.services.translator import translate
    mock_response = MagicMock()
    mock_response.json.return_value = {
        "data": {"translations": [{"translatedText": "東京"}, {"translatedText": "大阪"}]}
    }
    mock_response.raise_for_status = MagicMock()

    with patch("app.services.translator.httpx.AsyncClient") as MockClient:
        MockClient.return_value.__aenter__.return_value.post = AsyncMock(
            return_value=mock_response
        )
        with patch.dict("os.environ", {"GOOGLE_API_KEY": "test-key"}):
            result = await translate(["東京です", "大阪です"], "google", "zh-TW")

    assert result == ["東京", "大阪"]


@pytest.mark.asyncio
async def test_google_raises_when_no_api_key():
    from app.services.translator import translate
    import os
    with patch.dict("os.environ", {}, clear=True):
        os.environ.pop("GOOGLE_API_KEY", None)
        with pytest.raises(ValueError, match="GOOGLE_API_KEY"):
            await translate(["テスト"], "google", "zh-TW")


# ── Claude ─────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_claude_translates_texts():
    from app.services.translator import translate
    mock_client = MagicMock()
    mock_message = MagicMock()
    mock_message.content = [MagicMock(text='["東京", "大阪"]')]
    mock_client.messages.create = AsyncMock(return_value=mock_message)

    with patch("app.services.translator.anthropic.AsyncAnthropic", return_value=mock_client):
        with patch.dict("os.environ", {"ANTHROPIC_API_KEY": "test-key"}):
            result = await translate(["東京です", "大阪です"], "claude", "zh-TW")

    assert result == ["東京", "大阪"]


@pytest.mark.asyncio
async def test_claude_raises_when_no_api_key():
    from app.services.translator import translate
    import os
    with patch.dict("os.environ", {}, clear=True):
        os.environ.pop("ANTHROPIC_API_KEY", None)
        with pytest.raises(ValueError, match="ANTHROPIC_API_KEY"):
            await translate(["テスト"], "claude", "zh-TW")


# ── 共用 ───────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_invalid_provider_raises():
    from app.services.translator import translate
    with pytest.raises(ValueError, match="不支援的翻譯供應商"):
        await translate(["テスト"], "unknown", "zh-TW")


@pytest.mark.asyncio
async def test_empty_texts_returns_empty():
    from app.services.translator import translate
    result = await translate([], "deepl", "zh-TW")
    assert result == []
