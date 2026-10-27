#!/usr/bin/env python3
"""Compatibility entry point: learning modes are included in the standard build."""
from pathlib import Path
import runpy

if __name__ == '__main__':
    runpy.run_path(str(Path(__file__).with_name('build-copilot-case.py')), run_name='__main__')
