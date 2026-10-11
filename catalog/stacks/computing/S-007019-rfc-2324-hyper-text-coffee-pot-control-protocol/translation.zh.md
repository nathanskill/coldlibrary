网络工作组 — L. Masinter

征求意见稿（RFC）：2324 — 1998 年 4 月 1 日

类别：信息类

## 超文本咖啡壶控制协议（HTCPCP/1.0）

## 本备忘录的状态

本备忘录为互联网社群提供信息。它不规定任何形式的互联网标准。本备忘录的分发不受限制。

## 版权声明

Copyright (C) The Internet Society (1998). All Rights Reserved.（版权所有 (C) 互联网协会，1998 年。保留所有权利。）

## 摘要

本文档描述 HTCPCP，一种用于控制、监视和诊断咖啡壶的协议。

## 1. 缘由与范围

世界各地都有咖啡。在一个计算无处不在的世界里，搞计算的人想要煮咖啡。煮咖啡是一门艺术，但网络互联世界的分布式智能超越了艺术。因此，存在着一种浓烈、深沉、醇厚的需求：需要一个专为煮咖啡而设计的协议——堪称“浓缩”定制。咖啡是用咖啡壶煮的。联网的咖啡壶如果要被控制，就需要一个控制协议。

越来越多的家用和消费类设备正被接入互联网。早期的网络实验曾把自动售货机接入互联网以监视其状态 [COKE]。最早被接入互联网、可以远程*操作*的机器之一——互联网烤面包机（通过 SNMP 控制）——于 1990 年首次亮相 [RFC2235]。

正是对无处不在的家电联网的需求，在消耗着 IPv4 地址空间。消费者希望远程控制咖啡壶之类的设备，好让自己醒来时就有新煮好的咖啡，或者在晚饭准备完毕之后的某个精确时刻开始煮咖啡。

本文档规定一种超文本咖啡壶控制协议（HTCPCP），它允许完整的请求与响应，足以控制所有能够制作那些流行的含咖啡因热饮的设备。

HTTP 1.1（[RFC2068]）允许把网络对象从源服务器传送到客户端。网络遍布全世界。HTCPCP 以 HTTP 为基础。这是因为 HTTP 无处不在。它如果不好，就不可能如此普及。因此，HTTP 是好的。如果你想要好咖啡，HTCPCP 就必须是好的。要让 HTCPCP 好，把 HTCPCP 建立在 HTTP 之上就是好的。

本协议的未来版本可能会加入对意式浓缩咖啡机及类似设备的扩展。

## 2. HTCPCP 协议

HTCPCP 协议建立在 HTTP 之上，另外加入了若干新的方法、首部字段和返回码。所有 HTCPCP 服务器都应当用“coffee:”URI 方案来指称（第 4 节）。

## 2.1 HTCPCP 新增的方法

## 2.1.1 BREW 方法，以及 POST 的使用

控制咖啡壶的命令由客户端发往咖啡服务器，使用 BREW 或 POST 方法，消息体的 Content-Type 设为“application/coffee-pot-command”。

咖啡壶服务器必须（MUST）同等地接受 BREW 和 POST 两种方法。不过，用 POST 来促使动作发生的做法已不推荐。

咖啡壶用电子装置加热水，所以没有火。因此，不需要防火墙，防火墙控制策略也无关紧要。不过，POST 可能是某种咖啡的商标，所以增加了 BREW 方法。BREW 方法也可以用于其他基于 HTTP 的协议（例如超文本酿酒厂控制协议）。

## 2.1.2 GET 方法

在 HTTP 中，GET 方法的意思是“取回由请求 URI 所标识的任何信息（以实体的形式）”。如果请求 URI 指向一个产生数据的过程，那么作为实体返回的应当是所产生的数据，而不是该过程的源文本，除非那段文本恰好就是该过程的输出。

在 HTCPCP 中，与咖啡壶相关的资源是实物，而不是信息资源。大多数咖啡 URI 的“数据”不含咖啡因。

## 2.1.3 PROPFIND 方法

如果一杯咖啡是数据，那么关于这份冲煮出来的资源的元数据，就用 PROPFIND 方法来发现 [WEBDAV]。

## 2.1.4 WHEN 方法

倒好咖啡、递上牛奶的时候，接受牛奶的人需要在加入的牛奶足够时说一声“when”（够了）。为此，HTCPCP 增加了“WHEN”方法。够了吗？说 WHEN。

## 2.2 咖啡壶首部字段

HTCPCP 推荐若干 HTTP 首部字段，并定义了一些新字段。

## 2.2.1 推荐的首部字段

## 2.2.1.1 “safe”响应首部字段

[SAFE] 定义了一个 HTTP 响应首部字段“Safe”，可用来表示重复某个 HTTP 请求是安全的。包含“Safe: Yes”首部字段，就允许客户端在请求结果可以重复时重复先前的请求。

煮咖啡设备的实际安全性差别很大，而且事实上可能取决于客户端的状况，而不仅仅取决于服务器。因此，本协议对“Safe”响应首部做了扩展：

```
Safe                = "Safe" ":" safe-nature
safe-nature         = "yes" | "no" | conditionally-safe
conditionally-safe  = "if-" safe-condition
safe-condition      = "user-awake" | token
```

这一指示将使用户代理能够以更友好的方式处理某些安全请求的重试，特别是安全的 POST 请求。

## 2.2.2 新的首部字段

## 2.2.2.1 Accept-Additions 首部字段

在 HTTP 中，“Accept”请求首部字段用来指定响应中可接受的媒体类型。然而在 HTCPCP 中，响应可能导致自动咖啡壶采取额外的动作。为此，HTCPCP 增加了一个新的首部字段“Accept-Additions”（接受的添加物）：

```
Accept-Additions = "Accept-Additions" ":"
                   #( addition-range [ accept-params ] )
```

```
addition-type   = ( "*"
                  | milk-type
                  | syrup-type
                  | sweetener-type
                  | spice-type
                  | alcohol-type
                  ) *( ";" parameter )
milk-type       = ( "Cream" | "Half-and-half" | "Whole-milk"
                  | "Part-Skim" | "Skim" | "Non-Dairy" )
syrup-type      = ( "Vanilla" | "Almond" | "Raspberry"
                  | "Chocolate" )
alcohol-type    = ( "Whisky" | "Rum" | "Kahlua" | "Aquavit" )
```

## 2.2.3 省略的首部字段

没有为无咖啡因咖啡提供任何选项。那还有什么意思？

## 2.3 HTCPCP 返回码

普通的 HTTP 返回码用来表示 HTCPCP 服务器遇到的困难。本节说明一些特殊的解释和新的返回码。

## 2.3.1 406 Not Acceptable（不可接受）

这个返回码通常被解释为“请求所标识的资源只能生成这样的响应实体：其内容特征不被请求中发送的 accept 首部所接受”。在 HTCPCP 中，如果咖啡壶的操作者无法满足 Accept-Addition 请求，可以（MAY）返回这个响应码。除非请求是 HEAD 请求，否则响应应当（SHOULD）包含一个实体，列出可供选择的咖啡添加物。

实际上，目前大多数自动咖啡壶都提供不了添加物。

## 2.3.2 418 I'm a teapot（我是一把茶壶）

任何试图用茶壶煮咖啡的尝试，都应当得到错误码“418 I'm a teapot”。所产生的实体主体可以（MAY）矮而胖。

## 3. “coffee” URI 方案

因为咖啡是国际性的，所以有国际化的咖啡 URI 方案。所有咖啡 URL 方案都按照 URI 国际化的惯例 [URLI18N]，对 29 种语言中拼写“咖啡”一词的字符的 UTF-8 编码进行 URL 编码后写出。

```
coffee-url  =  coffee-scheme ":" [ "//" host ]
                ["/" pot-designator ] ["?" additions-list ]
```

```
coffee-scheme = ( "koffie"                      ; Afrikaans, Dutch
                  | "q%C3%A6hv%C3%A6"          ; Azerbaijani
                  | "%D9%82%D9%87%D9%88%D8%A9" ; Arabic
               | "akeita"                   ; Basque
               | "koffee"                   ; Bengali
               | "kahva"                    ; Bosnian
               | "kafe"                     ; Bulgarian, Czech
               | "caf%C3%E8"                ; Catalan, French, Galician
                  | "%E5%92%96%E5%95%A1"       ; Chinese
                  | "kava"                     ; Croatian
               | "k%C3%A1va                 ; Czech
               | "kaffe"                    ; Danish, Norwegian, Swedish
               | "coffee"                   ; English
               | "kafo"                     ; Esperanto
                  | "kohv"                     ; Estonian
               | "kahvi"                    ; Finnish
               | "%4Baffee"                 ; German
               | "%CE%BA%CE%B1%CF%86%CE%AD" ; Greek
               | "%E0%A4%95%E0%A5%8C%E0%A4%AB%E0%A5%80" ; Hindi
               | "%E3%82%B3%E3%83%BC%E3%83%92%E3%83%BC" ; Japanese
               | "%EC%BB%A4%ED%94%BC"       ; Korean
               | "%D0%BA%D0%BE%D1%84%D0%B5" ; Russian
               | "%E0%B8%81%E0%B8%B2%E0%B9%81%E0%B8%9F" ; Thai
               )
```

```
pot-designator = "pot-" integer  ; for machines with multiple pots
additions-list = #( addition )
```

所有不同形式的 coffee-scheme 都是等价的。不过，使用不同语言的 coffee-scheme，可以（MAY）被解读为对该咖啡壶所煮咖啡种类的一种暗示。请注意，虽然 URL 方案名不区分大小写，但大写对德语很重要，因此开头的“K”必须编码。

## 4. “message/coffeepot”媒体类型

POST 或 BREW 请求的实体主体必须（MUST）是 Content-Type 为“message/coffeepot”的内容。由于控制咖啡壶所需的大部分信息都由附加的首部传达，“message/coffeepot”的内容只包含一个 coffee-message-body：

```
coffee-message-body = "start" | "stop"
```

## 5. 运行方面的限制

本节列出广泛部署 HTCPCP 时的一些运行问题。

## 5.1 时间方面的考量

咖啡壶用户与咖啡壶服务之间需要可靠的服务质量。咖啡壶应当（SHOULD）使用网络时间协议 [NTP]，把时钟同步到全球精确的时间标准。

遥控机器人技术一向昂贵。然而，随着剑桥咖啡壶 [CAM] 的出现，用网络（而不是 SNMP）进行远程系统监视和管理已被证明可行。咖啡壶的其他维护工作或许可以由远程机器人完成。

网络数据通常是静态的。因此，为了节省数据传输和时间，网页浏览器程序会把用户取回的每个网页都存储在用户的计算机上。这样，如果用户想回到那个页面，它已存在本地，无需再向服务器请求。而用于机器人控制或监视变化场景的图像是动态的，每次访问都需要从服务器取回新的版本。

## 5.2 穿越防火墙

在大多数机构中，HTTP 流量都能相当容易地穿过防火墙。现代咖啡壶不用火。不过，“防火墙”对于保护任何来源免受任何形式的热都是有用的，不只是火。每个家庭计算机网络都应当（SHOULD）有防火墙保护，免受热源侵扰。然而，从家庭之外远程控制咖啡壶是重要的。因此，HTCPCP 能够轻易穿越防火墙是重要的。

由于 HTCPCP 建立在 HTTP 之上并使用 80 端口，它将获得 HTTP 穿越防火墙的一切优点。当然，家庭防火墙需要重新配置或更换新版本，以容纳 HTCPCP 特有的方法、首部和尾部，但这样的升级很容易做到。大多数家庭网络系统管理员都喝咖啡，也都愿意满足以隧道方式传输 HTCPCP 的需要。

## 6. 系统管理方面的考量

用 HTTP 协议监视咖啡壶，是网络的早期应用之一。在最早的实例中，咖啡壶监视是 ATM 网络的一项早期（而且恰当的）用途 [CAM]。

传统的技术 [CAM] 是给摄像机接上一块图像采集卡，再把图像送给网络服务器。这是 ATM 网络的一项恰当应用。在这个咖啡壶装置中，剑桥大学实验室的特洛伊室被用来提供一个网络界面，监视一把公用的咖啡壶。我们这些从事相关研究的人，作为清贫的学者，大家只有一台咖啡滴滤机，放在特洛伊室外面的走廊里。不过，作为极其敬业、刻苦的学者，我们喝掉了大量咖啡，新煮好的一壶往往撑不了多久。

这项服务是第一个使用剑桥计算机实验室设计的一种新 RPC 机制——MSRPC2——的应用。它运行在 MSNL（多业务网络层）之上，那是一种为 ATM 网络设计的网络层协议。

互联网上的咖啡壶可以用咖啡壶 MIB [CPMIB] 来管理。

## 7. 安全考量

任何挡在我和我的早晨咖啡之间的人，都应该感到不安全。

来自互联网用户的、对未受保护的咖啡壶的无节制访问，可能导致多种“拒绝咖啡服务”攻击。过滤装置使用不当可能放进“特洛伊咖啡渣”。过滤并不是一种好的病毒防护方法。

把咖啡渣倒进互联网管道，可能造成管道堵塞，那就得请一位互联网管道工 [PLUMB]，而他又会需要一个互联网管道工的帮手（皮搋子）。

访问认证将在另一份备忘录中讨论。

## 8. 致谢

非常感谢为本标准做出贡献的许多人，包括 Roy Fielding、Mark Day、Keith Moore、Carl Uno-Manros、Michael Slavitch 和 Martin Duerst。跃马客栈、CMU 可乐机、剑桥咖啡壶、互联网烤面包机以及其他由计算机控制的远程设备所带来的灵感，促成了这一宝贵的创造。

## 9. 参考文献

[RFC2068] Fielding, R., Gettys, J., Mogul, J., Frystyk, H., and T. Berners-Lee, "Hypertext Transfer Protocol -- HTTP/1.1", RFC 2068, January 1997.

[RFC2186] Wessels, D., and K. Claffy, "Internet Cache Protocol (ICP), version 2," RFC 2186, September 1997

[CPMIB] Slavitch, M., "Definitions of Managed Objects for Drip-Type Heated Beverage Hardware Devices using SMIv2", RFC 2325, 1 April 1998.

[HTSVMP] Q. Stafford-Fraser, "Hyper Text Sandwich Van Monitoring Protocol, Version 3.2". In preparation.

[RFC2295] Holtman, K., and A. Mutz, "Transparent Content Negotiation in HTTP", RFC 2295, March 1998.

[SAFE] K. Holtman. "The Safe Response Header Field", September 1997.

[CAM] "The Trojan Room Coffee Machine", D. Gordon and M. Johnson, University of Cambridge Computer Lab, ⟨http://www.cl.cam.ac.uk/coffee/coffee.html⟩

[CBIO] "The Trojan Room Coffee Pot, a (non-technical) biography", Q. Stafford-Fraser, University of Cambridge Computer Lab, ⟨http://www.cl.cam.ac.uk/coffee/qsf/coffee.html⟩.

[RFC2235] Zakon, R., "Hobbes' Internet Timeline", FYI 32, RFC 2230, November 1997. See also ⟨http://www.internode.com.au/images/toaster2.jpg⟩

[NTP] Mills, D., "Network Time Protocol (Version 3) Specification, Implementation and Analysis", RFC 1305, March 1992.

[URLI18N] Masinter, L., "Using UTF8 for non-ASCII Characters in Extended URIs" Work in Progress.

[PLUMB] B. Metcalfe, "Internet Plumber of the Year: Jim Gettys", Infoworld, February 2, 1998.

[COKE] D. Nichols, "Coke machine history", C. Everhart, "Interesting uses of networking", ⟨http://www-cse.ucsd.edu/users/bsy/coke.history.txt⟩.

## 10. 作者地址

Larry Masinter, Xerox Palo Alto Research Center, 3333 Coyote Hill Road, Palo Alto, CA 94304

电子邮件：masinter@parc.xerox.com

## 11. 完整版权声明

Copyright (C) The Internet Society (1998). All Rights Reserved.（版权所有 (C) 互联网协会，1998 年。保留所有权利。）

本文档及其译本可以被复制并提供给他人；评论、解释本文档或协助其实施的衍生作品，可以全部或部分地被准备、复制、发表和分发，不受任何种类的限制，前提是上述版权声明和本段文字包含在所有此类副本和衍生作品之中。但是，本文档本身不得以任何方式修改，例如删除版权声明或对互联网协会或其他互联网组织的提及，除非是为制定互联网标准所需——此时必须遵循互联网标准流程中规定的版权程序——或是为将其翻译成英语以外的语言所需。

上述有限许可是永久性的，互联网协会及其继承者或受让人不会撤销。

本文档及其中所含信息按“原样”提供，互联网协会和互联网工程任务组不作任何明示或暗示的担保，包括但不限于对使用此处信息不会侵犯任何权利的担保，或任何关于适销性或特定用途适用性的暗示担保。

以下为版权声明原文：

This document and translations of it may be copied and furnished to others, and derivative works that comment on or otherwise explain it or assist in its implementation may be prepared, copied, published and distributed, in whole or in part, without restriction of any kind, provided that the above copyright notice and this paragraph are included on all such copies and derivative works. However, this document itself may not be modified in any way, such as by removing the copyright notice or references to the Internet Society or other Internet organizations, except as needed for the purpose of developing Internet standards in which case the procedures for copyrights defined in the Internet Standards process must be followed, or as required to translate it into languages other than English.

The limited permissions granted above are perpetual and will not be revoked by the Internet Society or its successors or assigns.

This document and the information contained herein is provided on an "AS IS" basis and THE INTERNET SOCIETY AND THE INTERNET ENGINEERING TASK FORCE DISCLAIMS ALL WARRANTIES, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO ANY WARRANTY THAT THE USE OF THE INFORMATION HEREIN WILL NOT INFRINGE ANY RIGHTS OR ANY IMPLIED WARRANTIES OF MERCHANTABILITY OR FITNESS FOR A PARTICULAR PURPOSE.
