from finintel import screening

watch = [screening.WatchlistEntry(id="w1", name="Alice Smith")]

def test_screening_decisions():
    subjects = [screening.Subject(id="1", name="Alice Smith"), screening.Subject(id="2", name="Alice S"), screening.Subject(id="3", name="Bob")]
    res = screening.screen(subjects, watch)
    assert res[0].decision == 'HIT'
    assert res[1].decision in {'HIT','REVIEW'}
    assert res[2].decision == 'CLEAR'
