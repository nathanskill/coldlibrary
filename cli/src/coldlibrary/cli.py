"""Command line: ``coldlibrary init | validate | seal | check-share | open | verify``."""

import argparse
import getpass
import sys
from pathlib import Path
from typing import Optional, Sequence, Tuple

from . import SPEC_ID, __version__
from .errors import ColdLibraryError
from .manifest import MANIFEST_NAME, check_manifest, load_manifest
from .shares import ShareError, describe_share, parse_share
from .util import COOLING_DAYS, eprint, read_created_date

_MAX_SHARE_FILE = 64 * 1024


def _read_share_file(path: str) -> str:
    target = Path(path)
    if not target.is_file():
        raise ColdLibraryError(f"No share file at {path}.")
    if target.stat().st_size > _MAX_SHARE_FILE:
        raise ColdLibraryError(f"{path} is too large to be a share file.")
    return target.read_text(encoding="utf-8", errors="replace")


# --------------------------------------------------------------------- init


def cmd_init(args: argparse.Namespace) -> int:
    from .workspace import first_seal_date, init_workspace

    path = Path(args.dir)
    written = init_workspace(path, args.lang)
    created = read_created_date(path)
    print(f"Created a Cold Library workspace in {args.dir}")
    for rel in written:
        print(f"  {rel}")
    print()
    print("This folder holds plaintext. Keep it on a machine you trust and do not sync it.")
    print("Next: fill in core/COLDLIBRARY.md and core/core.json, write letters in letters/,")
    print(f"then run: coldlibrary validate {args.dir}")
    if created is not None:
        print(
            f"The first seal is possible after a {COOLING_DAYS}-day cooling period, "
            f"on or after {first_seal_date(created).isoformat()}."
        )
    print(
        "The template sets the custodian to the keepers. In that mode any quorum of keepers "
        "can open the box at any time, and the silence period and veto window are only "
        "social agreements. A notary, a platform account or a time-lock gives them force."
    )
    print("Cold Library is for adults (18+). This workspace is not a will.")
    return 0


# ----------------------------------------------------------------- validate


def cmd_validate(args: argparse.Namespace) -> int:
    from .validate import validate_workspace

    report = validate_workspace(Path(args.dir), args.dir)
    for line in report.render():
        print(line)
    print(report.summary())
    return 1 if report.errors else 0


# --------------------------------------------------------------------- seal


def cmd_seal(args: argparse.Namespace) -> int:
    from .seal import seal_workspace

    workspace = Path(args.dir)
    result = seal_workspace(
        workspace,
        threshold=args.threshold,
        shares=args.shares,
        bits=args.bits,
        out=Path(args.out) if args.out else None,
        shares_out=Path(args.shares_out) if args.shares_out else None,
        skip_cooling=args.skip_cooling,
        echo=eprint,
        display=args.dir,
    )
    m = result.manifest
    eprint("")
    eprint(f"Sealed box written to {result.out}")
    for rel in result.sealed_files:
        eprint(f"  {rel}")
    eprint(
        f"Version {m['seq']}, sealed on {m['created_at']}. "
        f"Any {m['threshold']} of {m['shares']} shares open it. "
        f"Master secret: {m['master_secret_bits']} bits. age scrypt work factor: {result.work_factor}."
    )
    if result.skipped:
        eprint(f"Not sealed (hidden or system files): {', '.join(result.skipped)}")
    eprint("")

    if result.share_files:
        eprint(f"Shares written to {Path(args.shares_out)}:")
        for path in result.share_files:
            eprint(f"  {path.name}")
        eprint(
            "All shares are now in one folder. Give each one to a different keeper, "
            "then remove that folder yourself."
        )
    else:
        if not sys.stdout.isatty():
            eprint(
                "Note: shares are going to a file or pipe, not a screen. "
                "Remove that copy once each keeper has written theirs down."
            )
        for block in result.share_blocks:
            print(block)
        sys.stdout.flush()

    eprint("")
    eprint("Before you hand anything over:")
    eprint(f"  - Check the box: coldlibrary verify {result.out}")
    eprint("  - You may test-open it once now, on this computer, with the agreed number of shares.")
    eprint("    After the shares are handed out, never gather them to test.")
    eprint("  - Each keeper checks their written share alone: coldlibrary check-share")
    eprint("Copies of shares must never be stored together, or with the box.")
    eprint("This version cannot be taken back once handed over.")
    eprint(
        f"The plaintext workspace {args.dir} is unchanged and still on disk. Once you have "
        "verified the seal, remove the plaintext yourself. Cold Library never deletes your files."
    )
    return 0


# -------------------------------------------------------------- check-share


def _read_one_share_text(args: argparse.Namespace) -> Tuple[str, str]:
    if args.file and args.file != "-":
        return args.file, _read_share_file(args.file)
    if sys.stdin is not None and sys.stdin.isatty() and not args.file:
        return "share", getpass.getpass("Share words (input hidden, press Enter when done): ")
    return "stdin", sys.stdin.read(_MAX_SHARE_FILE + 1)


def cmd_check_share(args: argparse.Namespace) -> int:
    source, text = _read_one_share_text(args)
    try:
        parsed = parse_share(text, source)
    except ShareError as exc:
        print(f"Share: invalid. {exc}")
        return 1
    for line in describe_share(parsed):
        print(line)
    print("This check reads one share. It does not combine shares and cannot show the secret.")
    return 0


# --------------------------------------------------------------------- open


def cmd_open(args: argparse.Namespace) -> int:
    from .opener import open_box

    sources = [(path, _read_share_file(path)) for path in (args.share_file or [])]
    if not sources and not args.prompt:
        raise ColdLibraryError("Give shares with --share-file (repeat it), or use --prompt.")
    prompt = getpass.getpass if args.prompt else None
    result = open_box(
        Path(args.sealed),
        sources,
        out=Path(args.out) if args.out else None,
        ignore_manifest=args.ignore_manifest,
        prompt=prompt,
        echo=eprint,
    )
    keepers = ", ".join(str(p.share.index + 1) for p in result.used_shares)
    print(f"Opened with the shares of keepers {keepers}.")
    if result.check is not None:
        print(f"{MANIFEST_NAME}: {len(result.check.ok)} files match.")
    print(f"Written to {result.out}")
    for rel in result.written:
        print(f"  {rel}")
    print()
    print("Each letter has a stage in core/core.json. Read the stage before you hand a letter over.")
    print("This folder holds plaintext. Keep it offline and remove it yourself when you are done.")
    return 0


# ------------------------------------------------------------------- verify


def cmd_verify(args: argparse.Namespace) -> int:
    sealed = Path(args.sealed)
    if not sealed.is_dir():
        raise ColdLibraryError(f"No sealed folder at {args.sealed}.")
    manifest = load_manifest(sealed)
    check = check_manifest(sealed, manifest)
    print(f"Checking {args.sealed}")
    for rel in check.ok:
        print(f"  ok        {rel}")
    for rel in check.mismatched:
        print(f"  CHANGED   {rel}")
    for rel in check.missing:
        print(f"  MISSING   {rel}")
    for rel in check.extra:
        print(f"  EXTRA     {rel}")
    for rel in check.ignored:
        print(f"  ignored   {rel}")
    for text in check.invalid:
        print(f"  MANIFEST  {text}")
    print(
        f"Spec {manifest.get('spec')}, version {manifest.get('seq')}, sealed on "
        f"{manifest.get('created_at')}, opens with {manifest.get('threshold')} of "
        f"{manifest.get('shares')} shares, {manifest.get('master_secret_bits')}-bit master secret."
    )
    if check.problems:
        print(f"Problems: {check.problems}. Do not rely on this box until they are explained.")
        return 1
    print("OK: every file matches MANIFEST.json.")
    return 0


# ------------------------------------------------------------------- parser


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="coldlibrary",
        description=(
            "Offline tools for Cold Library. Write an Ice Core, check it, seal it with "
            "age, split the key into SLIP-39 shares, and open it again."
        ),
        epilog="Cold Library keeps nothing and executes nothing. https://coldlibrary.com",
    )
    parser.add_argument(
        "--version", action="version", version=f"coldlibrary {__version__} (spec {SPEC_ID})"
    )
    sub = parser.add_subparsers(dest="command", metavar="COMMAND")

    p = sub.add_parser("init", help="create a new workspace from templates")
    p.add_argument("dir", metavar="DIR", help="new or empty folder")
    p.add_argument("--lang", choices=("en", "zh"), default="en", help="template language (default en)")
    p.set_defaults(func=cmd_init)

    p = sub.add_parser("validate", help="check a workspace for schema errors and secrets")
    p.add_argument("dir", metavar="DIR", help="workspace folder")
    p.set_defaults(func=cmd_validate)

    p = sub.add_parser("seal", help="encrypt a workspace and split the key into shares")
    p.add_argument("dir", metavar="DIR", help="workspace folder (never changed)")
    p.add_argument("--threshold", type=int, help="shares needed to open (default: core.json, 2)")
    p.add_argument("--shares", type=int, help="number of shares (default: core.json, 3)")
    p.add_argument("--bits", type=int, choices=(128, 256), help="master secret size (default: core.json, 256)")
    p.add_argument("--out", metavar="DIR", help="sealed folder to create (default: DIR/../sealed)")
    p.add_argument(
        "--shares-out",
        metavar="PATH",
        help="write share-1.txt ... to this folder instead of printing them",
    )
    p.add_argument(
        "--skip-cooling",
        action="store_true",
        help=f"skip the {COOLING_DAYS}-day cooling period (drills and tests only)",
    )
    p.set_defaults(func=cmd_seal)

    p = sub.add_parser("check-share", help="check one share without combining")
    p.add_argument("--file", metavar="F", help="share file (default: read stdin or ask)")
    p.set_defaults(func=cmd_check_share)

    p = sub.add_parser("open", help="combine shares and decrypt a sealed box")
    p.add_argument("sealed", metavar="SEALED", help="sealed folder")
    p.add_argument(
        "--share-file", action="append", metavar="FILE", help="a share file; repeat for each share"
    )
    p.add_argument("--prompt", action="store_true", help="type shares at a hidden prompt")
    p.add_argument("--out", metavar="DIR", help="output folder (default: ./opened-YYYY-MM-DD)")
    p.add_argument(
        "--ignore-manifest",
        action="store_true",
        help="open even if files do not match MANIFEST.json",
    )
    p.set_defaults(func=cmd_open)

    p = sub.add_parser("verify", help="check a sealed box against MANIFEST.json")
    p.add_argument("sealed", metavar="SEALED", help="sealed folder")
    p.set_defaults(func=cmd_verify)
    return parser


def main(argv: Optional[Sequence[str]] = None) -> int:
    parser = build_parser()
    args = parser.parse_args(list(argv) if argv is not None else None)
    if not getattr(args, "func", None):
        parser.print_help()
        return 2
    try:
        return int(args.func(args))
    except ColdLibraryError as exc:
        sys.stdout.flush()
        eprint(f"error: {exc}")
        return 1
    except OSError as exc:
        sys.stdout.flush()
        eprint(f"error: {exc.strerror or exc} ({exc.filename or 'file system'})")
        return 1
    except KeyboardInterrupt:
        eprint("Stopped.")
        return 130
