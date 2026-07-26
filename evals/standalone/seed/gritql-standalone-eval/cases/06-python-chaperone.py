from typing import Any


def load_roll(url: str, headers: dict[str, str], retry: Any):
    first = requests.get(url)
    second = requests.get(url, timeout=5)
    third = requests.get(url, headers=headers, timeout=retry.delay)

    session.get(url)
    requests.post(url)
    text = "requests.get(url)"
    return first, second, third, text
