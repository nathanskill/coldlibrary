# Examples

Everything in this folder is fictional. The people, projects, companies,
places, email addresses, keys and dates are invented. Domains use the reserved
`.example` suffix and email addresses use `example.org` and `example.net`. The
`signing_pubkey` values are public keys whose private halves were thrown away.
No real person, company, exchange or broker appears here.

| Folder | Language | Owner (fictional) |
|---|---|---|
| `fictional-indie-dev/` | English | Wren Halloway, an independent developer with two small projects |
| `fictional-indie-dev-zh/` | 中文 | 林小舟，一位独立开发者，有两个小项目 |

Each folder is a complete plaintext workspace (spec §3.1), except for the
hidden `.coldlibrary-created` file that `coldlibrary init` writes:

```
COVER.md               public cover: no names, no assets, no accounts (§4)
core/COLDLIBRARY.md    sections 0 to 9, for people and agents (§5)
core/core.json         machine-checkable part, valid against core.schema.json (§6)
letters/001-family.md  one file per letter; the file name is neutral (§3.4)
letters/002-project.md marked ai_assisted, with the AI passage labelled (§6.16)
```

Things to notice:

- Asset entries are pointers only: what kind, where the papers are, who to ask.
  They never hold amounts, passwords or recovery words.
- Each wish has an anchor in COLDLIBRARY.md, a kind, a stage and a half-life.
  The wishes that publish something or cannot be undone wait for the `public`
  stage. The `destroy-private` wish is at `after_death`.
- The box is held by a notary, so the silence period and the veto window have
  force. With the keepers as custodian they would only be agreements.

## Try a drill

Install the command-line tool, then work in a temporary folder. Both examples
pass `validate` with no findings. `seal` needs `--skip-cooling` here, because
these folders have no creation date and the first seal normally waits 7 days.

```sh
python3 -m pip install ./cli
coldlibrary validate spec/v0.1/examples/fictional-indie-dev

drill=$(mktemp -d)
coldlibrary seal spec/v0.1/examples/fictional-indie-dev --skip-cooling \
  --out "$drill/sealed" --shares-out "$drill/shares"
coldlibrary verify "$drill/sealed"
coldlibrary check-share --file "$drill/shares/share-2.txt"
coldlibrary open "$drill/sealed" \
  --share-file "$drill/shares/share-1.txt" \
  --share-file "$drill/shares/share-3.txt" \
  --out "$drill/opened"
diff -r spec/v0.1/examples/fictional-indie-dev/core "$drill/opened/core"
```

`seal` never changes the example folder. When you are done, remove the drill
folder yourself. In a real seal, never keep the shares in one folder and never
keep them with the box.

The Chinese example works the same way: replace `fictional-indie-dev` with
`fictional-indie-dev-zh`.

## 中文说明

这里的一切都是虚构的：人物、项目、机构、地点、邮箱、密钥和日期都是编造的。
`signing_pubkey` 是公钥，对应的私钥已经丢弃。
财产条目只写线索：是什么、文件在哪里、该问谁。不写金额、密码或助记词。

演练方法同上：在临时文件夹里依次运行 `seal --skip-cooling`、`verify`、
`check-share` 和 `open`。演练结束后，请自己删除临时文件夹。
真实使用时，份额不要放在一起，也不要和箱子放在一起。
