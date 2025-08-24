from telecom.cotravel import Event, detect_cotravel


def test_detect_cotravel() -> None:
    events = [
        Event("a", 0, 0.0, 0.0),
        Event("b", 10, 0.0, 0.0001),
        Event("a", 70, 0.001, 0.0),
        Event("b", 80, 0.0011, 0.0001),
    ]
    pairs = detect_cotravel(events, window_secs=30, distance_max_m=200, min_sequential_hits=2)
    assert len(pairs) == 1
    pair = pairs[0]
    assert {pair.a, pair.b} == {"a", "b"}
    assert pair.score == 2
