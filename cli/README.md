# coldlibrary

The command-line tool for [Cold Library](https://coldlibrary.com), spec v0.1
(`coldlibrary/0.1`). It writes, checks, seals, splits and opens an Ice Core on
your own computer. It works offline, sends nothing, keeps nothing and never
deletes your files.

Status: alpha. The code has not been audited. Use it for drills with fictional
data, and read [Honest limits](#honest-limits) before you rely on it.

## Install

Python 3.9 or newer.

```sh
python3 -m pip install ./cli
coldlibrary --version
python3 -m coldlibrary --version   # the same tool
```

It depends on three packages from PyPI:
[pyrage](https://pypi.org/project/pyrage/) (age encryption, Rust bindings),
[shamir-mnemonic](https://pypi.org/project/shamir-mnemonic/) (the SLIP-39
reference implementation by SatoshiLabs) and
[jsonschema](https://pypi.org/project/jsonschema/).
Install in a virtual environment, then use the tool on an offline computer.

## Commands

| Command | What it does |
|---|---|
| `coldlibrary init DIR [--lang en\|zh]` | Creates a workspace from templates. Refuses a folder that is not empty. |
| `coldlibrary validate DIR` | Checks the workspace. Prints `file:line: error|warning: ...`. Exit status 1 on any error. Changes nothing. |
| `coldlibrary seal DIR [options]` | Validates, encrypts the workspace into a sealed folder and splits the key into shares. |
| `coldlibrary check-share [--file F]` | Checks one share on its own. Never combines shares, never shows a secret. |
| `coldlibrary open SEALED --share-file A --share-file B [...]` | Checks the box, combines shares and decrypts into a new folder. |
| `coldlibrary verify SEALED` | Checks a sealed folder against `MANIFEST.json`. Needs no shares. |

### init

```sh
coldlibrary init my-core            # English templates
coldlibrary init my-core --lang zh  # Chinese templates
```

Writes `COVER.md`, `core/COLDLIBRARY.md` (sections 0 to 9), `core/core.json`
(valid against the schema), `letters/README.md` and a hidden
`.coldlibrary-created` with today's date. Folders are created readable only by
you. The first seal is possible 7 days later.

The template sets the custodian to the keepers. In that mode any quorum of
keepers can open the box at any time. Change it in `core.json` if a notary, a
platform account or a time-lock will hold the box.

### validate

```sh
coldlibrary validate my-core
```

Errors stop a seal; warnings do not. The checks follow spec §17.

Errors include: a missing file; `core.json` that is not valid JSON or fails the
schema (with date format checking on); duplicate ids; unknown keeper ids;
threshold above shares; a bad quorum; a missing or unlisted letter; letter file
names with characters other than `A-Z a-z 0-9 . _ -`; links or special files
inside `core/` or `letters/`; broken stage rules (a `publish` or `irreversible` wish must be at
`public`, a `destroy-private` wish at `after_death`, letters at `after_death`
or `public`); a wish anchor that does not exist; and anything that looks like
a secret in any `.md`, `.json` or `.txt` file:

- 12 or more BIP-39 words in a row (a recovery phrase), 20 or more SLIP-39
  words in a row (a share). Numbered, split across lines or shortened to four
  letters still counts;
- 64 or more hex digits, unless labelled as a hash (`sha256: ...`);
- extended private keys (`xprv`, `yprv`, `zprv`, `tprv` ...), WIF keys, PEM
  private key blocks, age secret keys, a few well-known API token shapes, and a
  Cold Library box passphrase;
- a line that records a secret after a label: `password: ...`, `passphrase = ...`,
  `seed phrase: ...`, `mnemonic: ...`, `private key: ...`, `PIN 1234`,
  `密码：...`, `助记词：...`, `私钥是 ...`. Pointers are fine: "Seed phrase: in the
  safe deposit box", "助记词在保险柜里".

`COVER.md` is public, so it is also checked for email addresses, phone
numbers, currency amounts, and the owner's and keepers' names and contacts
from `core.json`.

Findings show the file and line, never the matched text. The word-list checks
skip fenced code blocks whose info string contains `example-not-a-secret`, so
documentation can show fake examples:

````markdown
```example-not-a-secret
(fake words for a tutorial)
```
````

Warnings include placeholders still to fill (`[to fill`, `【待填`), keepers who
have not agreed yet, signed check-ins without a public key, the keepers-hold-the-box
mode, a quorum that differs from the share settings, missing sections, files in
`core/` that cannot be checked, and a workspace still inside its 7-day cooling period.

### seal

```sh
coldlibrary seal my-core                          # shares are printed
coldlibrary seal my-core --shares-out /media/usb  # share-1.txt ... share-N.txt
```

| Option | Meaning |
|---|---|
| `--threshold T`, `--shares N` | Shares needed and shares made. Default: `crypto` in `core.json` (2 of 3). A value that differs from `core.json` is refused: the sealed core must describe its own seal. |
| `--bits 128\|256` | Master secret size. Default: `core.json` (256). |
| `--out DIR` | The sealed folder to create. Default: `DIR/../sealed`. Must not exist or must be empty, and must be outside the workspace. |
| `--shares-out PATH` | Write `share-1.txt` ... instead of printing. Refused inside the workspace or the sealed folder. Never overwrites. |
| `--skip-cooling` | Skip the 7-day cooling period after `init`. For drills and tests only. |

`seal` runs `validate` first and refuses on any error. It builds everything in
memory, checks that the shares recombine and that `core.age` decrypts, then
writes:

```
sealed/
  COVER.md                 copied unchanged
  core.age                 core/ as a deterministic tar, encrypted with age
  letters/<stem>.age       one per letters/<stem>.md (README.md is never sealed)
  MANIFEST.json            sha256 and size of every sealed file
```

Each share is printed as a block headed `Keeper 1 of 3` with the warning
"Write this down on paper or steel. Do not photograph it. Do not send it in
any chat app." Lines starting with `#` are comments; the numbered word grid
can be copied as it is. Shares are written to standard output and everything
else to standard error, so `> file` captures only the shares.

The workspace is never changed. `seal` reminds you to remove the plaintext
yourself once you have verified the seal, and that copies of shares must never
be stored together.

### check-share

```sh
coldlibrary check-share --file share-2.txt
coldlibrary check-share < share-2.txt
coldlibrary check-share          # asks for the words; input is hidden
```

Reports whether the SLIP-39 checksum is valid, the word count, the secret size,
the set id (the same for every share of one seal), the member index, the
member threshold, the group settings and the extendable flag. Words may be
numbered, upper case, or shortened to their first four letters. On a bad share
it says which word is unknown, or that the checksum does not match. Exit
status 1 if the share is invalid.

### open

```sh
coldlibrary open sealed --share-file share-1.txt --share-file share-3.txt --out opened
coldlibrary open sealed --prompt     # type the shares at a hidden prompt
```

Checks every file against `MANIFEST.json` before it reads any share, and refuses
a box that does not match (`--ignore-manifest` overrides this; age still
authenticates every file). Combines the shares, decrypts `core.age` and every
listed letter in memory, refuses unsafe archive entries (absolute paths, `..`,
links, devices, anything outside `core/`), and only then writes `COVER.md`,
`core/` and `letters/<stem>.md` into a new folder (default `./opened-YYYY-MM-DD`,
refused if not empty). Fewer shares than the threshold, shares from another
seal, or a damaged file stop it with a short message and nothing written.

### verify

```sh
coldlibrary verify sealed
```

Recomputes the SHA-256 and size of every file in `MANIFEST.json` and reports
missing, changed and extra files. `.DS_Store` and similar clutter is ignored.
Exit status 1 on any problem.

## A drill with the fictional example

```sh
drill=$(mktemp -d)
coldlibrary seal spec/v0.1/examples/fictional-indie-dev --skip-cooling \
  --out "$drill/sealed" --shares-out "$drill/shares"
coldlibrary verify "$drill/sealed"
coldlibrary check-share --file "$drill/shares/share-2.txt"
coldlibrary open "$drill/sealed" --share-file "$drill/shares/share-1.txt" \
  --share-file "$drill/shares/share-3.txt" --out "$drill/opened"
diff -r spec/v0.1/examples/fictional-indie-dev/core "$drill/opened/core"
```

Remove the drill folder yourself when you are done.

## Exact cryptography

This is spec §7. Any tool that follows it can open a box made by this one.

- **Master secret.** `secrets.token_bytes(32)` (256 bits), or 16 bytes with
  `--bits 128`. New for every seal. Never written to disk.
- **Passphrase.** `"coldlibrary/0.1:" + base32(master_secret)`, RFC 4648
  alphabet, upper case, `=` padding removed. 68 characters for 256 bits, 42 for
  128. Test vector: master secret `000102...1e1f` (32 bytes) gives
  `coldlibrary/0.1:AAAQEAYEAUDAOCAJBIFQYDIOB4IBCEQTCQKRMFYYDENBWHA5DYPQ`.
- **Encryption.** age v1, binary (not armored), one scrypt recipient stanza,
  through pyrage's passphrase mode. pyrage (rage) picks the scrypt work factor
  so that one decryption takes about a second on the sealing computer; it was
  20 on the computer this tool was tested on. `seal` warns if it is above 22,
  the most the reference age tools accept by default. Sealing the same
  workspace twice gives different bytes.
- **Shares.** SLIP-39 through `shamir_mnemonic.generate_mnemonics`: one group
  (group threshold 1 of 1), member threshold T of N, empty SLIP-39 passphrase,
  extendable backup flag set, iteration exponent 1. 33 words for 256 bits, 20
  for 128.
- **Core archive.** `core/` as a POSIX pax tar, uncompressed: every entry under
  `core/`, sorted by path, mtime 0, uid and gid 0, empty owner names, mode 0755
  for folders and 0644 for files. Hidden files, names ending in `~` and system
  clutter are left out. Links and special files stop the seal. The same folder
  always gives the same archive.
- **Letters.** Each `letters/<stem>.md` (top level only, not `README.md`)
  becomes `letters/<stem>.age`, encrypted with the same passphrase. File names
  show on the box, so keep them neutral: `001.md` or `001-family.md`.
- **MANIFEST.json.** ASCII JSON: `spec`, `seq` (from `version.seq`),
  `created_at` (the day of sealing), `threshold`, `shares`,
  `master_secret_bits`, and `files` with `path`, `sha256` and `bytes` for
  `COVER.md`, `core.age` and each letter. No names and no contact data.

To open a box without this tool, see Appendix A of the spec: combine the shares
with any SLIP-39 tool, build the passphrase, and run `age -d`.

## Honest limits

- **Offline mode has no technical guarantee.** When the keepers hold both the
  shares and the box (custodian `keepers`), any quorum of keepers can open it at
  any time. Nothing stops them.
- **Silence and veto need a custodian.** The silence period and the veto window
  only have force when a notary, a platform's after-death tool or a time-lock
  layer holds the box and releases it on its own conditions. This tool does not
  enforce them, does not apply time-locks and sends no notices.
- **Unaudited.** No one has audited this code or its dependencies. Use it for
  drills. Do not rely on it alone yet.
- **Stages are rules, not keys.** One master secret opens the whole box, and
  `open` decrypts every letter at once. Keepers decide what to hand over and when.
- **MANIFEST.json is not signed.** It detects damage, not someone who can rewrite
  both a file and the manifest. age authenticates each encrypted file; the cover
  is not authenticated.
- **Secrets in memory and on screen.** Python cannot reliably wipe the master
  secret or shares from memory. Shares printed to a terminal may stay in its
  scrollback. Share files written with `--shares-out` sit together until you move
  them. Seal and open on an offline computer you trust.
- **The workspace stays.** The plaintext workspace and any opened folder are the
  most exposed copies. The tool never deletes them. You decide.
- **`validate` finds common mistakes, not every secret.** It looks for known
  patterns. A password written in plain prose can pass.
- **Not a will.** Property follows the legal will or statutory inheritance.

## Development

```sh
cd cli
python3 -m venv .venv
.venv/bin/python -m pip install -e '.[dev]'
.venv/bin/python -m pytest
```

The tests seal and open real boxes, so they take about a minute: each age
encryption runs scrypt for about a second.

`src/coldlibrary/data/core.schema.json` is a copy of
`spec/v0.1/core.schema.json`; a test keeps them identical.

## License and credits

Apache-2.0 (see `LICENSE`). The spec and schema are CC0-1.0.

- BIP-39 English word list (`src/coldlibrary/data/bip39-english.txt`), from
  [bitcoin/bips](https://github.com/bitcoin/bips/blob/master/bip-0039/english.txt),
  MIT License. Used only to detect recovery phrases.
- SLIP-39 word list and implementation: `shamir-mnemonic` by SatoshiLabs, MIT License.
- age encryption: `pyrage` (bindings to rage), MIT License.
- JSON Schema validation: `jsonschema`, MIT License.

## 中文简介

`coldlibrary` 是冷冻图书馆规范 v0.1 的命令行工具。它在你自己的电脑上离线运行，
不联网、不保存任何东西，也从不删除你的文件。目前是测试版，代码没有经过审计，
请先用虚构的内容做演练。

安装：`python3 -m pip install ./cli`（需要 Python 3.9 或更新版本）。

| 命令 | 作用 |
|---|---|
| `coldlibrary init 目录 --lang zh` | 用中文模板新建工作区。目录不为空时拒绝。 |
| `coldlibrary validate 目录` | 检查工作区：Schema、阶段规则，以及像密码、助记词、私钥、份额这样的内容。有错误时退出码为 1。 |
| `coldlibrary seal 目录` | 先检查，再加密成封存的箱子，并把钥匙拆成 SLIP-39 份额。新建工作区 7 天内拒绝封存（演练可加 `--skip-cooling`）。 |
| `coldlibrary check-share --file 份额文件` | 单独检查一份份额。不合并，也不显示任何秘密。 |
| `coldlibrary open 箱子 --share-file A --share-file B` | 先核对 MANIFEST.json，再合并份额、解密到一个新文件夹。 |
| `coldlibrary verify 箱子` | 不需要份额，核对箱子里每个文件的 SHA-256。 |

诚实的限制：

- 由开启人自己保管箱子时，凑齐人数的开启人随时都能打开它。静默期和否决期只是约定。
- 只有公证处、平台的身后功能或时间锁保管箱子时，静默期和否决期才有实际约束。本工具不执行这些规则，也不发送任何通知。
- 一把主秘密打开整个箱子，`open` 会一次解开所有信件。按阶段交付，靠开启人遵守规则。
- 代码没有经过审计，只适合演练。
- 封存后，明文工作区仍在你的电脑上。要不要删除，由你自己决定。
