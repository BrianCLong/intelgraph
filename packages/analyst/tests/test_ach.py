import sys, pathlib
sys.path.append(str(pathlib.Path(__file__).resolve().parents[1] / 'src'))
from ach import run_ach

def test_run_ach():
    hyps = [{'id': 'h1'}, {'id': 'h2'}]
    ev = [
        {'weight': 1.0, 'consistency': {'h1': 1, 'h2': -1}},
    ]
    res = run_ach(hyps, ev)
    assert res['ranking'][0][0] == 'h1'
