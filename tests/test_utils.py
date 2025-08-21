import importlib.util
from pathlib import Path

spec = importlib.util.spec_from_file_location(
    "utils", Path(__file__).resolve().parents[1] / "ingestion" / "utils.py"
)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
compute_hash = module.compute_hash


def test_hash_stability_newlines():
    text1 = "hello\nworld"
    text2 = "hello\r\nworld"
    assert compute_hash(text1) == compute_hash(text2)


def test_hash_stability_bytes():
    text = "café"
    assert compute_hash(text) == compute_hash(text.encode('utf-8'))
