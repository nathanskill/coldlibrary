# 冷冻图书馆 Cold Library

**给普通人的冷冻图书馆。** [coldlibrary.com/zh](https://coldlibrary.com/zh) · [English](README.md)

冷冻图书馆是一套开放格式和离线工具，用来写下"联系不上以后该怎么办"：东西在哪、该找谁、该停掉什么、想留下的信，以及每条心愿能约束活着的人多久。你在自己的电脑上写好、封存，把钥匙拆给几个信任的人，再把封好的箱子交给另一方保管。

冷冻图书馆自己什么都不保管，也不替任何人执行。

| | |
|---|---|
| `spec/v0.1/` | 交接清单格式：`COVER.md`、`COLDLIBRARY.md`、`core.json` 及其 JSON Schema（CC0-1.0） |
| `cli/` | `coldlibrary` 命令行工具：init、validate、seal、check-share、open、verify（Apache-2.0） |
| `skills/exit-interview/` | 给任何 AI 助手用的整理谈话技能，以及可打印的问卷 |
| `docs/` | 威胁模型 |
| `catalog/` | 项目馆和开架区，都是普通文件 |
| `site/` | 静态网站，零依赖（`node site/build.mjs`） |
| `api/` | 很小的馆员注册服务（只存邮箱、笔名、编号） |

## 馆规

1. 从不保管钥匙、份额、明文、箱子、资产或钱。
2. 交接清单不是法律遗嘱，财产按法律遗嘱或法定继承处理。
3. 只转述，不扮演。
4. 我们的通知从不带链接，也从不要钱。
5. 每条心愿都有时效：照办、参考、存档。
6. 不是纪念馆，也不是告别工具。如果你现在不太好，请先去[暖房](https://coldlibrary.com/zh/warm-room)。

工具**还没有经过安全审计**，请先用来演练，再决定要不要托付真东西。

如果你要接手维护，请从 [`AGENTS.md`](AGENTS.md) 开始，它就是这个项目自己的交接文档。
