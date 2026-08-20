#!/usr/bin/env python3
"""Validate the static GitHub Pages site before packaging."""

from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path("site")
REQUIRED = (
    "index.html",
    "styles.css",
    "main.js",
    "favicon.svg",
    "404.html",
    "og.png",
    ".nojekyll",
)
ABS_ASSET = re.compile(
    r"""(?:href|src)=["'](/(?!/)[^"']+)["']""",
    re.IGNORECASE,
)
LOCAL_ASSET = re.compile(
    r"""(?:href|src)=["'](\./[^"'#?]+)["']""",
    re.IGNORECASE,
)


def fail(message: str) -> None:
    print(f"::error::{message}")
    raise SystemExit(1)


def main() -> None:
    if not ROOT.is_dir():
        fail("site/ directory is missing")

    missing = [name for name in REQUIRED if not (ROOT / name).is_file()]
    if missing:
        fail("Missing required Pages files: " + ", ".join(missing))

    index = (ROOT / "index.html").read_text(encoding="utf-8")
    for needle, label in (
        ("<title>", "document title"),
        ('name="description"', "meta description"),
        ('rel="canonical"', "canonical URL"),
        ('href="./styles.css"', "stylesheet"),
        ('src="./main.js"', "script"),
        ('href="./favicon.svg"', "favicon"),
        ("npx @baselhusam/daily-hub", "install command"),
    ):
        if needle not in index:
            fail(f"index.html is missing {label}")

    if 'lang="en"' not in index:
        fail("index.html must set lang=\"en\"")

    broken: list[str] = []
    absolute: list[str] = []

    for html in sorted(ROOT.glob("*.html")):
        text = html.read_text(encoding="utf-8")
        for match in ABS_ASSET.finditer(text):
            url = match.group(1)
            if url.startswith("//"):
                continue
            absolute.append(f"{html}: {url}")
        for match in LOCAL_ASSET.finditer(text):
            target = (html.parent / match.group(1)).resolve()
            if not target.exists():
                broken.append(f"{html}: {match.group(1)}")

    if absolute:
        fail(
            "Use relative asset URLs (./file) so project Pages at "
            "/daily-hub/ resolve. Found:\n" + "\n".join(absolute)
        )
    if broken:
        fail("Broken local asset references:\n" + "\n".join(broken))

    print("GitHub Pages site is valid")


if __name__ == "__main__":
    sys.exit(main())
