"""Jupyter extension for Intelgraph."""

from IPython.core.interactiveshell import InteractiveShell

from .magics import IntelGraphMagics


def load_ipython_extension(ip: InteractiveShell) -> None:  # pragma: no cover - IPython protocol
    ip.register_magics(IntelGraphMagics)


__all__ = ["IntelGraphMagics", "load_ipython_extension"]
