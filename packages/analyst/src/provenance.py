import hashlib
from typing import Dict

def manifest_for(html: str, pdf: bytes) -> Dict[str, str]:
    return {
        "html": hashlib.sha256(html.encode()).hexdigest(),
        "pdf": hashlib.sha256(pdf).hexdigest(),
    }
