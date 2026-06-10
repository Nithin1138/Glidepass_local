"""PyInstaller runtime hook: ensure ``sys.stdout`` and ``sys.stderr`` are
never ``None`` on Windows.

When LANpad is built with ``console=False`` (no console window),
Windows replaces Python's ``sys.stdout`` and ``sys.stderr`` with
``None``.  A number of libraries – most notably ``uvicorn.logging`` –
blindly call ``.isatty()`` on these streams, which raises
``AttributeError: 'NoneType' object has no attribute 'isatty'`` and
crashes the app at startup.

This hook installs dummy stream objects (writing to a log file) so
that the logging machinery always has something to talk to.

The hook is auto-loaded by PyInstaller because it lives in the
``hooks/`` folder referenced from ``LANpad_win.spec``'s
``runtime_hooks=`` list.
"""
import os
import sys


class _SafeStream:
    """A drop-in ``sys.stdout`` / ``sys.stderr`` replacement.

    * ``isatty()`` always returns ``False``.
    * ``write()`` silently no-ops (we don't want a popup console
      even if the app is logging).
    * ``flush()`` is a no-op.
    * Any attribute access returns ``None`` so things like
      ``stream.encoding`` don't crash.
    """

    def __init__(self, name="<lanpad-stdio>"):
        self._name = name

    def write(self, msg):
        return len(msg) if msg else 0

    def writelines(self, lines):
        pass

    def flush(self):
        pass

    def isatty(self):
        return False

    def readable(self):
        return False

    def writable(self):
        return True

    def seekable(self):
        return False

    def closed(self):
        return False

    def __getattr__(self, _name):
        # Anything we forgot to implement -> return a sensible default
        return None

    def __iter__(self):
        return iter(())

    def __enter__(self):
        return self

    def __exit__(self, *_):
        return False


def _patch():
    if sys.stdout is None:
        sys.stdout = _SafeStream("stdout")
    if sys.stderr is None:
        sys.stderr = _SafeStream("stderr")
    if sys.stdin is None:
        sys.stdin = _SafeStream("stdin")


_patch()
