import sys, pathlib
sys.path.append(str(pathlib.Path(__file__).resolve().parents[1] / 'src'))
from bayes import update

def test_update():
    posterior = update(0.5, 0.9, 0.1)
    assert round(posterior, 2) == 0.9
