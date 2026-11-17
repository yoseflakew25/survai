from app.core.text_cleanup import collapse_repetitive_text


def test_collapse_repeated_amharic_paragraphs():
    para = (
        "በአዲስ አበባ ከተማ የሚኖሩ ከ15-45 ዓመት የሆኑ ሴቶች የዲጂታል እውቀት ደረጃ "
        "ለመለየት እና የስልጠና ይዘት ለማስተካከል ነው።"
    )
    looped = "\n\n".join([para] * 5)
    cleaned = collapse_repetitive_text(looped)
    assert cleaned == para
    assert cleaned.count("አዲስ አበባ") == 1


def test_collapse_caps_length():
    text = ("ይህ ረጅም ዓረፍተ ነገር ነው። " * 40).strip()
    cleaned = collapse_repetitive_text(text, max_chars=120)
    assert len(cleaned) <= 121


def test_collapse_keeps_unique_sentences():
    text = "ሰላም። ግብዎ ግልጽ ነው። ማን መሞከር አለበት?"
    assert collapse_repetitive_text(text) == text
