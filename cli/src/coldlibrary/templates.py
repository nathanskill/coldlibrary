"""Workspace templates written by ``coldlibrary init`` (English and Chinese).

They follow spec v0.1 §4 (cover), §5 (COLDLIBRARY.md) and §6 (core.json).
Placeholders are marked ``[to fill ...]`` or ``【待填…】``; ``validate`` counts them.
"""

import json
import re
from typing import Any, Dict

_SCALAR_BLOCK_RE = re.compile(r"([\[{])\n[ ]+([^\[\]{}\n][^\[\]{}]*?)\n[ ]*([\]}])")


def pretty_json(data: Any) -> str:
    """JSON with two-space indents, keeping short lists and objects of plain values on one line."""

    def collapse(match: "re.Match[str]") -> str:
        items = [part.strip() for part in match.group(2).split("\n")]
        inner = " ".join(items)
        if len(inner) > 72:
            return match.group(0)
        return f"[{inner}]" if match.group(1) == "[" else f"{{ {inner} }}"

    return _SCALAR_BLOCK_RE.sub(collapse, json.dumps(data, indent=2, ensure_ascii=False)) + "\n"

COVER_EN = """\
# Cold Library cover

This is a sealed box in the Cold Library format, spec v0.1 (coldlibrary/0.1).
Version 1, sealed on [to fill: the date you seal].

It is not a will. Property follows the legal will or statutory inheritance.
Being unreachable is not the same as legal death.

## How it opens

- 2 of 3 shares are needed. Each share is held by a different keeper.
- The box is held by [to fill: a notary / the owner's own account with a platform's after-death tool / a time-lock layer / the keepers].
- Keepers start only after 6 months without a check-in, or when they learn of a serious event.
- 2 keepers must confirm, each on their own, after phoning the owner and an emergency contact.
- Nothing is released for 28 days after that. The owner or a keeper can stop it.

## If this box reaches you

You cannot open it alone, and you do not need to do anything.
Keep it closed and keep it where it is.

## What genuine notices never do

No genuine notice about this box contains a link, asks for money, or asks you
to type, upload or download anything. No one will ask for a share by message.
Cold Library sends no messages at all.

## How to open it

Combine 2 shares with any SLIP-39 tool. The passphrase is "coldlibrary/0.1:"
followed by the base32 form of the master secret. Decrypt core.age with age.
The Cold Library specification, version 0.1, gives every step. It is public
domain and published with the tools:

- https://coldlibrary.com
- https://github.com/nathanskill/coldlibrary
"""

COVER_ZH = """\
# 冷冻图书馆 · 封面

这是一个按冷冻图书馆格式封存的箱子，规范 v0.1（coldlibrary/0.1）。
第 1 版，封存于【待填：封存的日期】。

它不是遗嘱。财产按法律遗嘱或法定继承处理。
联系不上，不等于法律上的死亡。

## 怎样打开

- 需要 3 份份额中的 2 份。每份由不同的开启人保管。
- 箱子由【待填：公证处 / 本人账户里的平台身后功能 / 时间锁层 / 开启人自己】保管。
- 本人连续 6 个月没有签到，或者开启人得知发生了严重的事，开启人才开始行动。
- 先给本人和紧急联系人打电话，再由 2 位开启人各自独立确认。
- 确认之后 28 天内不放出任何内容。本人或开启人可以叫停。

## 如果这个箱子到了你手里

你一个人打不开它，也不需要做任何事。
不要打开，原样保管。

## 真通知从不做的事

关于这个箱子的真通知，从不带链接，从不要钱，从不让你输入、上传或下载任何东西。
没有人会通过消息向你要份额。冷冻图书馆本身不发任何消息。

## 怎样解密

用任何一个 SLIP-39 工具合并 2 份份额。口令是“coldlibrary/0.1:”加上主秘密的 base32 形式。
再用 age 解密 core.age。冷冻图书馆规范 0.1 版写有每一步。规范属于公有领域，和工具一起发布在：

- https://coldlibrary.com
- https://github.com/nathanskill/coldlibrary
"""

COLDLIBRARY_EN = """\
# Cold Library: [to fill: your name]

Spec coldlibrary/0.1 · Version 1 · Written on [to fill: date]

This file is not a will. Property follows the legal will or statutory
inheritance. This file says where things are, who to ask, and what I wish.
Each wish has a half-life: it binds for a while, then it is advice, then archive.

## 0. Read this first

- Order of authority, highest first: me in person or a signed instruction from
  me; the latest valid version of this file; older versions.
- Being unreachable is not the same as legal death. Check the stage before you act.
- Stages: unreachable (say only that I cannot be reached right now; open nothing);
  incapacity (sections 0, 1, 2, 8 and 9: handover and bills, no letters);
  after death (accounts, assets and legal pointers to the executor or
  administrator, and the letters); public (Open Stacks and irreversible wishes,
  at least 180 days later, with two keeper signatures).
- Cite wishes by anchor, such as COLDLIBRARY.md#w1, and other text by section,
  such as COLDLIBRARY.md §2.
- AI help: [to fill: which parts were drafted with AI help and confirmed by me, or "none"]
- Nothing here asks anyone to pay money, to log in as me, or to break the law.
- You may decline anything that would harm the living.

## 1. Who to call

Call in this order. Try to reach me first, then my emergency contact.

1. [to fill: name, relation] (k1 in core.json)
2. [to fill] (k2)
3. [to fill] (k3)

- Emergency contact: [to fill]
- Doctor, lawyer or notary: [to fill: who, and how to reach them]
- Legal documents, and the executor named in my legal will: [to fill: where, and who]
- Where the box is: [to fill]
- If something is released by mistake: [to fill: which keeper contacts the recipients]

## 2. Projects and handover

Stage: incapacity, unless an item says otherwise. For each project: what it is,
who takes over, where the handover notes are, what keeps running, bills and
renewals, and what to tell clients.

- [to fill: project]: handover notes at [to fill: where]. Ask [to fill: keeper id].

## 3. Accounts (official after-death routes only)

Stage: after death. Use each platform's official after-death or
inactive-account process. Do not log in as me. No passwords are written in
this file or in this box.

- [to fill: platform]: [to fill: the official route, and whether it is set up]

## 4. Assets (pointers only: where and who to ask)

Stage: after death. The kind of asset, where the paperwork is, and who to
ask. No amounts, no account numbers, no passwords, no recovery words.
Property follows the legal will. I fill in this section by hand.

- [to fill: kind of asset]: papers at [to fill: where]. Ask [to fill: who].

## 5. Wishes and their half-life

Each wish has an id that matches core.json. Default half-life: binding for
two years, advisory until ten years, archive after that. Wishes that publish
something or cannot be undone wait for the public stage.

<a id="w1"></a>
### w1 · [to fill: one wish in one or two sentences]

Kind: ordinary · Stage: after death · Binding until +2y · Advisory until +10y

## 6. Letters index

Each letter is sealed on its own. Check its stage before you hand it over,
and give it only to its recipient.

| Id | To | Stage | File |
|---|---|---|---|
| l1 | [to fill] | after death | letters/001.md |

## 7. Open Stacks

Stage: public. What I chose, item by item, to make public. Nothing else is
published. Each item has its own wish in section 5, needs at least 180 days
after my death and two keeper signatures. Keepers may decline.

- [to fill, or write "nothing"]

## 8. What I do not want

- No voice or face cloning. No chatbot that speaks as me.
- No account that keeps posting in my name.
- [to fill]

## 9. Rules for agents

An AI agent that reads this file:

- May summarize it for the keepers, with citations, find the section that
  answers a question, and draft checklists for a person to review.
- Must cite the anchor or section it relies on, for example COLDLIBRARY.md#w1.
- Must label its own text as AI-generated, and show each wish's half-life phase.
- Must not speak or write as me, imitate my voice or face, or chat with my family as me.
- Must not write letters, fill in section 4, log in to accounts, move or sell
  assets, sign anything, pay or ask for money, or publish anything not listed
  in section 7.
- Must not act as executor, administrator or trustee. People decide.
"""

COLDLIBRARY_ZH = """\
# 冷冻图书馆：【待填：你的名字】

规范 coldlibrary/0.1 · 第 1 版 · 写于【待填：日期】

这份文件不是遗嘱。财产按法律遗嘱或法定继承处理。
这里写的是：东西在哪里、该找谁、我希望怎样。
每条心愿都有时效：先照办，再参考，最后存档。

## 0. 先读这一节

- 权威顺序，从高到低：我本人或我签名的指示；这份文件的最新有效版本；旧版本。
- 联系不上，不等于法律上的死亡。行动前先看阶段。
- 阶段：联系不上（只说“暂时联系不上某某”，什么都不打开）；失能（第 0、1、2、8、9 节：交接和账单，不交信）；身后（把账户、财产线索和法律文件线索交给遗嘱执行人或遗产管理人，并交付信件）；公开（公开文集和不可逆的心愿，至少 180 天以后，需要两位开启人签字）。
- 引用心愿时写锚点，例如 COLDLIBRARY.md#w1；引用其他内容时写章节，例如 COLDLIBRARY.md §2。
- AI 协助：【待填：哪些部分由 AI 协助起草、已经由我确认；没有就写“无”】
- 这里没有任何内容要求别人付钱、用我的身份登录，或做违法的事。
- 会伤害在世的人的事，你们可以不做。

## 1. 先联系谁

按顺序联系。先设法联系我，再联系我的紧急联系人。

1. 【待填：名字、关系】（core.json 里的 k1）
2. 【待填】（k2）
3. 【待填】（k3）

- 紧急联系人：【待填】
- 医生、律师或公证处：【待填：是谁，怎么联系】
- 法律文件在哪里，法律遗嘱写明的遗嘱执行人是谁：【待填】
- 箱子在哪里：【待填】
- 如果误放出了内容：【待填：由哪位开启人联系收到的人】

## 2. 项目和交接

阶段：失能（条目另有说明的除外）。每个项目写清楚：是什么、谁接手、交接说明在哪里、哪些继续运行、账单和续费、要告诉客户什么。

- 【待填：项目】：交接说明在【待填：哪里】。问【待填：开启人编号】。

## 3. 账户（只走官方身后流程）

阶段：身后。每个平台都按它官方的身后流程或长期不活跃流程处理。
不要用我的身份登录。这份文件和这个箱子里都没有写任何密码。

- 【待填：平台】：【待填：官方流程，以及是否已经设置】

## 4. 财产（只写线索：在哪里、问谁）

阶段：身后。只写财产的种类、文件放在哪里、该问谁。不写金额、账号、密码、助记词。
财产按法律遗嘱处理。这一节由我亲手填写。

- 【待填：财产种类】：文件在【待填：哪里】。问【待填：谁】。

## 5. 心愿和时效

每条心愿都有编号，和 core.json 对应。默认时效：两年内照办，十年内参考，之后存档。
要公开某样东西、或者做了就无法挽回的心愿，要等到“公开”阶段。

<a id="w1"></a>
### w1 · 【待填：一条心愿，一两句话】

类型：普通 · 阶段：身后 · 照办到 +2y · 参考到 +10y

## 6. 信件索引

每封信单独封存。交出之前，先看它的阶段，并且只交给收信人本人。

| 编号 | 写给 | 阶段 | 文件 |
|---|---|---|---|
| l1 | 【待填】 | 身后 | letters/001.md |

## 7. 公开文集

阶段：公开。我逐项选定、可以公开的内容。其他内容一律不公开。
每一项在第 5 节都有自己的心愿，至少要在我去世 180 天之后，并且有两位开启人签字。开启人可以拒绝。

- 【待填，或写“无”】

## 8. 我不想要的

- 不要克隆我的声音或面容。不要做以我口吻说话的聊天机器人。
- 不要用我的名义继续发帖。
- 【待填】

## 9. 给 AI 代理的规则

读到这份文件的 AI 代理：

- 可以：为开启人做带引用的摘要，找到回答问题的那一节，起草清单交给人审核。
- 必须注明依据的锚点或章节，例如 COLDLIBRARY.md#w1。
- 必须标明自己写的内容是 AI 生成的，并标出每条心愿当前的时效阶段。
- 不得以我的身份说话或写字，不得模仿我的声音或面容，不得以我的身份和家人聊天。
- 不得代写信件、填写第 4 节、登录账户、转移或出售财产、签署任何东西、付钱或要钱，不得公开第 7 节以外的内容。
- 不得充当遗嘱执行人、遗产管理人或受托人。由人来决定。
"""

LETTERS_README_EN = """\
# Letters

One file per letter. A number alone is safest: 001.md, 002.md. A number and
a neutral word is fine: 001-family.md. File names show on the sealed box, so
never put a person's name in them. Who a letter is for goes in core.json.

List each letter in core/core.json under "letters", with its stage:
after_death or public. No letter is released at unreachable or incapacity.

Write as yourself, to one person. Do not ask anyone for money.
No passwords and no recovery words in letters.

If AI helped with a passage, set "ai_assisted" to true and put this line
before each such passage, so the reader sees it:

[AI-assisted passage, confirmed by the owner]

This README is not sealed.
"""

LETTERS_README_ZH = """\
# 信件

一封信一个文件。只用编号最安全：001.md、002.md。编号加一个中性的英文词也可以：001-family.md。
文件名会显示在封好的箱子上，所以文件名里不要出现任何人的名字。
信写给谁，写在 core.json 里。（文件名只能用英文字母、数字和 . _ -）

每封信都要在 core/core.json 的 "letters" 里登记，并写明阶段：after_death 或 public。
“联系不上”和“失能”阶段不交付任何信件。

用你自己的口吻，写给一个人。不要向任何人要钱。
信里不写密码，也不写助记词。

如果某一段用了 AI 帮忙，把 "ai_assisted" 设为 true，并在每一段这样的文字前面加上这一行，让读信的人看到：

【AI 协助起草，经本人确认】

这个 README 不会被封存。
"""


def core_document(lang: str, today: str) -> Dict[str, Any]:
    zh = lang == "zh"
    fill = "【待填】" if zh else "[to fill]"
    keepers = []
    for number in (1, 2, 3):
        keepers.append(
            {
                "id": f"k{number}",
                "name": fill,
                "contact": fill,
                "role": "contact",
                "consented_at": None,
                "can_veto": True,
                "can_decline": ["publish", "shutdown", "irreversible"],
            }
        )
    return {
        "spec": "coldlibrary/0.1",
        "owner": {
            "display_name": "【待填：你的名字】" if zh else "[to fill: your name]",
            "languages": ["zh" if zh else "en"],
            "signing_pubkey": None,
        },
        "version": {"seq": 1, "signed_at": today, "supersedes": None, "cosigned_by": None},
        "crypto": {
            "cipher": "age-scrypt",
            "split": "SLIP-39",
            "master_secret_bits": 256,
            "threshold": 2,
            "shares": 3,
        },
        "precedence": (
            ["本人当面或签名的指示", "最新的有效版本", "旧版本"]
            if zh
            else [
                "The owner in person or by signed instruction",
                "The latest valid version",
                "Older versions",
            ]
        ),
        "property_follows_legal_will": True,
        "legal_docs": [
            {
                "form": "【待填：例如经过公证的遗嘱】" if zh else "[to fill: e.g. notarized will]",
                "where": "【待填：原件放在哪里，问谁】" if zh else "[to fill: where the original is kept, and who to ask]",
            }
        ],
        "keepers": keepers,
        "box": {
            "custodian": "keepers",
            "custodian_note": (
                "【待填：谁保管封好的箱子。如果由开启人自己保管，请写明你知道：凑齐人数的开启人随时都能打开它】"
                if zh
                else "[to fill: who holds the sealed box. If the keepers hold it, write that you understand any quorum can open it at any time]"
            ),
            "timelock": None,
            "revocable": True,
        },
        "liveness": {
            "silence_months": 6,
            "reminder_days": 30,
            "checkin": "signed",
            "quorum": "2-of-3",
            "veto_window_days": 28,
            "single_keeper_path": False,
        },
        "wishes": [
            {
                "id": "w1",
                "text_ref": "COLDLIBRARY.md#w1",
                "kind": "ordinary",
                "stage": "after_death",
                "half_life": {"binding_until": "+2y", "advisory_until": "+10y"},
            }
        ],
        "assets": [],
        "accounts": [],
        "projects": [],
        "letters": [],
        "commons": {"items": [], "stage": "public", "per_item_consent": True},
        "agent_policy": {
            "may": (
                ["为开启人做带引用的摘要", "指出回答问题的章节", "起草清单交给人审核"]
                if zh
                else [
                    "Summarize this core for the keepers, with citations",
                    "Point to the section that answers a question",
                    "Draft checklists for a person to review",
                ]
            ),
            "must_not": (
                ["以本人的身份说话或写字", "代写信件", "登录任何账户", "转移或出售财产", "向任何人要钱", "公开 commons 以外的内容"]
                if zh
                else [
                    "Speak or write as the owner",
                    "Write letters",
                    "Log in to any account",
                    "Move or sell any asset",
                    "Ask anyone for money",
                    "Publish anything not listed in commons",
                ]
            ),
            "must_cite": True,
            "label_ai": True,
        },
    }


def workspace_files(lang: str, today: str) -> Dict[str, str]:
    """Relative path -> text for a new workspace."""
    if lang not in ("en", "zh"):
        raise ValueError("lang must be 'en' or 'zh'")
    zh = lang == "zh"
    core_json = pretty_json(core_document(lang, today))
    return {
        "COVER.md": COVER_ZH if zh else COVER_EN,
        "core/COLDLIBRARY.md": COLDLIBRARY_ZH if zh else COLDLIBRARY_EN,
        "core/core.json": core_json,
        "letters/README.md": LETTERS_README_ZH if zh else LETTERS_README_EN,
    }
