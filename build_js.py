#!/usr/bin/env python3
"""
AgroPrix frontend JS build pipeline.

Context
-------
The frontend ships as static files via Vercel (vercel.json has
buildCommand=null, outputDirectory="."). Some JS modules exist in two
forms:
  - `<module>.js.src` : human-readable source (edit this)
  - `<module>.js`     : minified artefact served in production (generated)

Historically both were maintained by hand, which led to drift: edits
landed in `.src` but the stale `.js` was shipped. This script is the
single source of truth that regenerates every `.js` from its `.src`.

Usage
-----
    python build_js.py          # rebuild all
    python build_js.py --check  # verify in-sync (CI-friendly; nonzero on drift)

Policy
------
- Files that have a `.src` sibling are rebuilt by minification of that
  source (using rjsmin).
- Files that have NO `.src` sibling (hevea.js, plantain.js, carte.js)
  are considered authoritative and left untouched.
- A banner is prepended to each generated `.js` so it's obvious at a
  glance which files are generated vs hand-written.

Run this script before every deployment. CI can gate PRs with --check.
"""

from __future__ import annotations

import argparse
import hashlib
import os
import sys
from datetime import datetime, timezone

import rjsmin

HERE = os.path.dirname(os.path.abspath(__file__))
JS_DIR = os.path.join(HERE, "js")

BANNER_TMPL = (
    "/*! AgroPrix {name} - generated from {src_name} on {ts} - DO NOT EDIT; "
    "edit the .src file and run `python build_js.py` */\n"
)


def rebuild_one(src_path: str) -> tuple[str, int, int]:
    """Minify src_path → its sibling .js. Returns (name, src_size, js_size)."""
    assert src_path.endswith(".js.src")
    js_path = src_path[:-4]  # strip ".src"
    name = os.path.basename(js_path)
    src_name = os.path.basename(src_path)

    with open(src_path, "r", encoding="utf-8") as f:
        source = f.read()

    minified = rjsmin.jsmin(source, keep_bang_comments=True)
    ts = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    banner = BANNER_TMPL.format(name=name, src_name=src_name, ts=ts)
    output = banner + minified

    with open(js_path, "w", encoding="utf-8", newline="\n") as f:
        f.write(output)

    return name, len(source), len(output)


def check_one(src_path: str) -> tuple[str, bool]:
    """Check whether src_path and its .js sibling are in sync."""
    js_path = src_path[:-4]
    name = os.path.basename(js_path)
    if not os.path.exists(js_path):
        return name, False

    with open(src_path, "r", encoding="utf-8") as f:
        source = f.read()
    minified = rjsmin.jsmin(source, keep_bang_comments=True)

    with open(js_path, "r", encoding="utf-8") as f:
        current = f.read()

    # strip banner from current before comparing
    if current.startswith("/*! AgroPrix"):
        newline = current.find("\n")
        current = current[newline + 1 :] if newline != -1 else current

    # Compare hashes to avoid holding huge strings in memory
    expected = hashlib.sha256(minified.encode()).hexdigest()
    actual = hashlib.sha256(current.encode()).hexdigest()
    return name, expected == actual


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true",
                        help="Verify .js files are up-to-date; exit 1 on drift")
    args = parser.parse_args()

    srcs = sorted(
        os.path.join(JS_DIR, f)
        for f in os.listdir(JS_DIR)
        if f.endswith(".js.src")
    )

    if not srcs:
        print("No .js.src files found.", file=sys.stderr)
        return 1

    if args.check:
        drift = []
        for src in srcs:
            name, ok = check_one(src)
            status = "OK  " if ok else "DRIFT"
            print(f"  {status}  {name}")
            if not ok:
                drift.append(name)
        if drift:
            print(f"\n{len(drift)} file(s) out of sync. Run: python build_js.py",
                  file=sys.stderr)
            return 1
        print(f"\nAll {len(srcs)} files in sync.")
        return 0

    print(f"Rebuilding {len(srcs)} JS module(s) from .src ...")
    total_in = total_out = 0
    for src in srcs:
        name, in_sz, out_sz = rebuild_one(src)
        ratio = (out_sz / in_sz * 100) if in_sz else 100
        print(f"  {name:<22} {in_sz:>7} -> {out_sz:>7} bytes  ({ratio:5.1f}%)")
        total_in += in_sz
        total_out += out_sz

    ratio = (total_out / total_in * 100) if total_in else 100
    print(f"\nTotal: {total_in} -> {total_out} bytes ({ratio:.1f}%).")
    print("Done. Remember to commit the regenerated .js files.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
