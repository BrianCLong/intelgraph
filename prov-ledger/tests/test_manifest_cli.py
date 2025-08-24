import pathlib
import subprocess
import sys
import os

sys.path.append(str(pathlib.Path(__file__).resolve().parents[1]))
from app.manifest import generate_manifest, save_manifest, load_manifest, verify_manifest


def test_manifest_roundtrip(tmp_path):
    f = tmp_path / "data.txt"
    f.write_text("hello")
    manifest = generate_manifest([f])
    save_manifest(manifest, tmp_path / "manifest.json")
    loaded = load_manifest(tmp_path / "manifest.json")
    assert verify_manifest(tmp_path, loaded)
    f.write_text("tampered")
    assert not verify_manifest(tmp_path, loaded)


def test_manifest_cli(tmp_path):
    f = tmp_path / "data.txt"
    f.write_text("hello")
    m = tmp_path / "manifest.json"
    env = os.environ | {"PYTHONPATH": str(pathlib.Path(__file__).resolve().parents[1])}
    subprocess.run([sys.executable, "-m", "app.manifest", "generate", str(m), str(f)], check=True, env=env)
    result = subprocess.run([sys.executable, "-m", "app.manifest", "verify", str(m), str(tmp_path)], env=env)
    assert result.returncode == 0
    f.write_text("corrupt")
    result2 = subprocess.run([sys.executable, "-m", "app.manifest", "verify", str(m), str(tmp_path)], env=env)
    assert result2.returncode != 0
