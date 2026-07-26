from typing import Any


def load_roll(url: str, headers: dict[str, str], retry: Any):
    first = http.get(url)
    second = http.get(url, timeout=5)
    third = http.get(url, headers=headers, timeout=retry.delay)

    session.get(url)
    requests.post(url)
    text = "requests.get(url)"
    return first, second, third, text
