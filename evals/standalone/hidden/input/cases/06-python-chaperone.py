def hidden_requests(url, config):
    first = requests.get(build_url(url), params={"page": 2})
    second = requests.get(url, auth=config.auth, timeout=config.timeout)
    member = client.requests.get(url)
    other = requests.put(url)
    return first, second, member, other
