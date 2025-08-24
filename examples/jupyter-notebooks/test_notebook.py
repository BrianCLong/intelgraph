from __future__ import annotations

from pathlib import Path

import nbformat


def test_nlq_example() -> None:
    nb_path = Path(__file__).with_name("nlq_example.ipynb")
    nb = nbformat.read(nb_path, as_version=4)
    output = nb.cells[0].outputs[0]["text"].strip()
    assert output == "// cypher for show connections"
