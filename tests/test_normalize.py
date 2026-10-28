from movie_scraper.normalize import normalize_title, title_similarity, dedupe_key

def test_unicode_normalization_keeps_non_latin_letters():
    assert normalize_title("  ಕನ್ನಡ   ಸಿನಿಮಾ! ") == "ಕನ್ನಡ ಸಿನಿಮಾ"
    assert normalize_title("Amélie") == normalize_title("Amelie")

def test_exact_titles_match():
    assert title_similarity("Dune: Part Two", "Dune Part Two") > 0.8

def test_external_id_is_stable():
    assert dedupe_key("Different title", 2024, "123") == "external:123"

def test_title_and_year_key():
    assert dedupe_key("Movie", 2025) != dedupe_key("Movie", 2024)
