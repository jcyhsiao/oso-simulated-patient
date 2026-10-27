#!/usr/bin/env python3
"""Compatibility entry point using the project's supplied default build selection."""
from pathlib import Path

from pipeline_components import default_activity_ref
from simulation_builder import main as shared_main


def main():
    root = Path(__file__).resolve().parents[1]
    shared_main(default_activity=default_activity_ref(root))


if __name__ == '__main__':
    main()
