网络工作组 — V. Cerf

征求意见稿（RFC）：2468 — MCI

类别：信息类 — 1998 年 10 月

## 我记得 IANA

1998 年 10 月 17 日

## 本备忘录的状态

本备忘录为互联网社群提供信息。它不规定任何形式的互联网标准。本备忘录的分发不受限制。

## 版权声明

Copyright (C) The Internet Society (1998). All Rights Reserved.（版权所有 (C) 互联网协会，1998 年。保留所有权利。）

## 追忆

很久很久以前，在一个遥远遥远的网络里，发生过一场伟大的冒险！

从通信新构想的一片混沌中，从种种实验、试探性的设计和检验的熔炉里，涌现出了丰饶如角的众多网络。从 ARPANET 开始，网络源源不断地演化，最终彼此相连，成为互联网。总得有人记下所有的协议、标识符、网络和地址，最终还有网络宇宙中万物的名字。也总得有人记下那些以火山喷发般的力量涌出的信息——它们来自三十年来从未停歇的激烈辩论、讨论和无尽的发明。这个人就是 Jonathan B. Postel：我们的互联网号码分配机构（IANA），我们的朋友、工程师、知己、领袖、标志，而如今，他是巨人之中第一个离我们而去的。

Jon，我们敬爱的 IANA，走了。即使在写下这些字的此刻，我仍然无法真正领会这个冷峻的事实。1991 年我们曾经差一点失去他。我们当然知道他处在风险之中，正如我们每个人一样。但他一直是我们的磐石，是我们每一次网页搜索、每一封电子邮件赖以建立的基石；他总在那里，调解偶发的争端，在我们的文档配不上它的主题时提醒我们，以看似从容的姿态做出艰难的决定，并在需要深思熟虑时给出建议。我们会挺过这次失去，我们会记住。他留下了一份不朽的遗产，供所有网民去思量：数十年坚定不移的服务；在别人似乎动弹不得时果断前行；在技术障碍、有时还有政治障碍交织的复杂雷区里，总能找到正确的路。

Jon 和我上的是同一所中学，洛杉矶以北圣费尔南多谷的范奈斯高中。但我们不在同一个年级，那时我其实并不认识他。我们真正相识是在加州大学洛杉矶分校（UCLA），当时我们都加入了一群研究生，在 Leonard Kleinrock 教授手下做 ARPANET 项目。Steve Crocker 是范奈斯那帮人里的另一位，他也是团队成员，并主持开发了 ARPANET 最早的主机对主机协议。当 Steve 发明了“征求意见稿”（RFC）系列这一构想时，Jon 当即成了它的编辑。当我们需要记录所有主机和协议标识符时，Jon 自告奋勇当了“号码沙皇”，后来互联网建成，他又成了 IANA。

Jon 是互联网架构委员会的创始成员，从委员会成立起一直任职到现在。据我所知，他是互联网协会的“第一位”个人会员，因为他和 Steve Wolff 比赛看谁先填好申请表、先付款，结果 Jon 赢了。他担任过互联网协会的理事。他是 .US 域名的托管人，是 Los Nettos 互联网服务的创办者之一，而且顺带一提，他还领导着南加州大学信息科学研究所的网络研究部门。

Jon 热爱户外。我知道他从前喜欢在约塞米蒂一带的内华达山脉高处徒步背包旅行。蓄着胡子、穿着凉鞋，Jon 是我们在 UCLA 的“常驻嬉皮族长”。他是个注重隐私的人，但在一场精彩的工程争论里，他完全能够发射光子鱼雷、进入战斗岗位。而且他可以固执得超出一切预料。我想，他能在与斯芬克斯的对视比赛里熬赢对方。

Jon 在朋友和同事中激发出忠诚与坚定的投入。对我来说，他是“无私奉献”这几个字的化身。近三十年来，Jon 为我们所有人服务，所取甚少，有时甚至在本该得到我们最深切感激的时候受到指责。在日内瓦举行的上一次互联网协会会议上，看到 Jon 获得国际电信联盟的银质奖章，令人格外欣慰。这一奖项通常是颁给国家元首的，但我想不出还有谁比他更配得上全世界对其贡献的认可。

虽然似乎很难避免一种巨大的失落感，仿佛我们的网络宇宙裂开了一道深渊，吞没了我们的朋友，但我必须告诉你们：当我想到 Jon 所成就的一切，我感到了安慰。他留下了一整份经他编辑的文献，讲述了我们共同的互联网故事，其中不仅有技术的部分，也有诗意的和异想天开的部分。他完成了 IANA 服务继任机构的组建，在这个职位上为社群留下了持久的服务遗产。对他的记忆丰富而鲜活，不会从我们的集体意识中褪去。“换了 Jon 会怎么做？”——在今后的日子里，当我们与那些被 Jon 多年来驯服得服服帖帖的问题搏斗时，我们会这样想。

纪念 Jon 为互联网社群所做的不朽服务的活动，几乎肯定会有很多。作为互联网协会的现任主席，我承诺以 Jon 的名字设立一个奖项，表彰长期为社群服务的人——乔纳森·B·波斯特尔服务奖，并将追授 Jon 为它的第一位获奖者。

如果 Jon 在这里，我确信他会劝我们不要哀悼他的离去，而要庆祝他的一生和他的贡献。他会提醒我们：还有许多工作要做，而我们现在有责任、也有机会去尽自己的一份力。我怀疑有谁能够复制他的纪录，但它屹立在那里，衡量着一个人对他所熟知和热爱的社群所做出的惊人贡献。

## 安全考量

安全问题与这篇追忆无关。

## 作者地址

Vinton G. Cerf, MCI

电子邮件：vcerf@mci.net

## 完整版权声明

Copyright (C) The Internet Society (1998). All Rights Reserved.（版权所有 (C) 互联网协会，1998 年。保留所有权利。）

本文档及其译本可以被复制并提供给他人；评论、解释本文档或协助其实施的衍生作品，可以全部或部分地被准备、复制、发表和分发，不受任何种类的限制，前提是上述版权声明和本段文字包含在所有此类副本和衍生作品之中。但是，本文档本身不得以任何方式修改，例如删除版权声明或对互联网协会或其他互联网组织的提及，除非是为制定互联网标准所需——此时必须遵循互联网标准流程中规定的版权程序——或是为将其翻译成英语以外的语言所需。（原文：This document and translations of it may be copied and furnished to others, and derivative works that comment on or otherwise explain it or assist in its implementation may be prepared, copied, published and distributed, in whole or in part, without restriction of any kind, provided that the above copyright notice and this paragraph are included on all such copies and derivative works. However, this document itself may not be modified in any way, such as by removing the copyright notice or references to the Internet Society or other Internet organizations, except as needed for the purpose of developing Internet standards in which case the procedures for copyrights defined in the Internet Standards process must be followed, or as required to translate it into languages other than English.）

上述有限许可是永久性的，互联网协会及其继承者或受让人不会撤销。（原文：The limited permissions granted above are perpetual and will not be revoked by the Internet Society or its successors or assigns.）

本文档及其中所含信息按“原样”提供，互联网协会和互联网工程任务组不作任何明示或暗示的担保，包括但不限于对使用此处信息不会侵犯任何权利的担保，或任何关于适销性或特定用途适用性的暗示担保。（原文：This document and the information contained herein is provided on an "AS IS" basis and THE INTERNET SOCIETY AND THE INTERNET ENGINEERING TASK FORCE DISCLAIMS ALL WARRANTIES, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO ANY WARRANTY THAT THE USE OF THE INFORMATION HEREIN WILL NOT INFRINGE ANY RIGHTS OR ANY IMPLIED WARRANTIES OF MERCHANTABILITY OR FITNESS FOR A PARTICULAR PURPOSE.）
