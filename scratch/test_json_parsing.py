import json
import re

def _extract_json(text: str) -> str:
    text = text.strip()
    if text.startswith("```"):
        match = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", text)
        if match:
            text = match.group(1).strip()
    start = text.find("{")
    end = text.rfind("}")
    if start == -1 or end == -1:
        start = text.find("[")
        end = text.rfind("]")
    if start != -1 and end != -1 and end > start:
        return text[start : end + 1]
    return text

def _clean_json_string(text: str) -> str:
    # Fix unescaped backslashes that aren't part of a valid escape sequence
    text = re.sub(r'\\(?![nrtbf"\\/])', r"\\\\", text)
    return text

# Test cases
test_cases = [
    # 1. Simple markdown
    '```json\n{"status": "ok"}\n```',
    # 2. Conversational filler
    'Here is the result: {"status": "ok"} Hope that helps!',
    # 3. Invalid escape sequence (the culprit)
    '{"sql": "SELECT * FROM users WHERE name LIKE \'\%admin\'"}', 
    # 4. Multi-line markdown with filler
    'I found the tables.\n```\n{"tables": ["users", "orders"]}\n```\nDone.'
]

for i, case in enumerate(test_cases, 1):
    print(f"\n--- Test Case {i} ---")
    print(f"Original: {case!r}")
    extracted = _extract_json(case)
    print(f"Extracted: {extracted!r}")
    
    try:
        parsed = json.loads(extracted)
        print(f"Success (direct): {parsed}")
    except json.JSONDecodeError as e:
        print(f"Failed (direct): {e}")
        cleaned = _clean_json_string(extracted)
        print(f"Cleaned: {cleaned!r}")
        try:
            parsed = json.loads(cleaned)
            print(f"Success (cleaned): {parsed}")
        except json.JSONDecodeError as e2:
            print(f"Failed (cleaned): {e2}")
