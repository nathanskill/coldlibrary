## 摘要

本 PEP 记录与 Python 文档字符串（docstring）相关的语义和惯例。

## 缘由

本 PEP 的目的，是把文档字符串的高层结构标准化：它们应当包含什么，以及怎样表达（不涉及文档字符串内部的任何标记语法）。本 PEP 包含的是惯例，不是法律，也不是语法。

> “一个通用的惯例，能同时带来可维护性、清晰性、一致性，还能为良好的编程习惯打下基础。它不会做的，是强迫你违背自己的意愿去遵守它。这就是 Python！”

> —— Tim Peters，发表于 comp.lang.python，2001-06-16

如果你违反了这些惯例，最坏的结果也不过是招来几个白眼。不过有些软件（例如 Docutils 文档字符串处理系统，见 PEP 256、PEP 258）会识别这些惯例，所以遵守它们会让你得到最好的效果。

## 规范

### 什么是文档字符串？

文档字符串是作为模块、函数、类或方法定义中第一条语句出现的字符串字面量。这样的文档字符串会成为该对象的 __doc__ 特殊属性。

所有模块通常都应当有文档字符串，模块导出的所有函数和类也都应当有文档字符串。公有方法（包括 __init__ 构造方法）也应当有文档字符串。一个包可以在包目录中 __init__.py 文件的模块文档字符串里加以说明。

出现在 Python 代码其他地方的字符串字面量，也可以起到文档的作用。它们不会被 Python 字节码编译器识别，也不能作为运行时的对象属性访问（即不会被赋给 __doc__），但有两类额外的文档字符串可以由软件工具提取：

1. 紧跟在模块、类或 __init__ 方法顶层一条简单赋值语句之后的字符串字面量，称为“属性文档字符串”。

2. 紧跟在另一个文档字符串之后的字符串字面量，称为“附加文档字符串”。

关于属性文档字符串和附加文档字符串的详细说明，请参阅 PEP 258《Docutils 设计规范》。

为了一致，文档字符串两端一律使用 """三个双引号"""。如果文档字符串里用到了反斜杠，就使用 r"""原始三双引号"""。

文档字符串有两种形式：单行的和多行的。

### 单行文档字符串

单行文档字符串用于非常显而易见的情形。它们确实应当写在一行之内。例如：

```
def kos_root():
    """Return the pathname of the KOS root directory."""
    global _kos_root
    if _kos_root: return _kos_root
    ...
```

注意：

- 即使字符串一行就能写下，也使用三引号。这样以后扩展起来很方便。

- 结束的引号和开始的引号在同一行。这对单行文档字符串来说更好看。

- 文档字符串前后都不空行。

- 文档字符串是一个以句号结尾的短语。它以命令的形式（“做这个”“返回那个”）规定函数或方法的作用，而不是描述；例如，不要写“返回路径名……”。

- 单行文档字符串不应当是重复函数或方法参数的“签名”（参数可以通过内省得到）。不要这样写：

```
def function(a, b):
    """function(a, b) -> list"""
```

这种文档字符串只适用于无法内省的 C 函数（例如内置函数）。不过，返回值的*性质*无法通过内省确定，所以应当提到。这样的文档字符串，更好的写法大致是：

```
def function(a, b):
    """Do X and return a list."""
```

（当然，“Do X”应当换成有用的描述！）

### 多行文档字符串

多行文档字符串由一行摘要（与单行文档字符串一样）、一个空行和一段更详细的描述组成。摘要行可能会被自动索引工具使用；重要的是，它要能放在一行之内，并且用一个空行与文档字符串的其余部分隔开。摘要行可以与开始的引号在同一行，也可以在下一行。整个文档字符串的缩进与第一行的引号相同（见下面的例子）。

在所有说明一个类的文档字符串（无论单行还是多行）之后插入一个空行——一般来说，类的各个方法之间用一个空行隔开，而文档字符串需要用一个空行与第一个方法隔开。

脚本（独立程序）的文档字符串，应当可以用作它的“用法”信息，在脚本以错误或缺少参数的方式被调用时（或者也许用“-h”选项请求“帮助”时）打印出来。这样的文档字符串应当说明脚本的功能和命令行语法、环境变量以及文件。用法信息可以相当详尽（好几屏），应当足以让新用户正确使用命令，也足以作为熟练用户查阅所有选项和参数的完整速查手册。

模块的文档字符串，一般应当列出该模块导出的类、异常和函数（以及其他任何对象），每个附一行摘要。（这些摘要通常比对象自身文档字符串中的摘要行更简略。）包的文档字符串（即包的 __init__.py 模块的文档字符串）也应当列出该包导出的模块和子包。

函数或方法的文档字符串，应当概述它的行为，并说明它的参数、返回值、副作用、引发的异常，以及对何时可以调用它的限制（凡适用者皆应说明）。可选参数应当注明。是否把关键字参数作为接口的一部分，也应当写明。

类的文档字符串应当概述它的行为，并列出公有方法和实例变量。如果这个类打算被继承，并且为子类提供了额外的接口，这个接口应当（在文档字符串中）单独列出。类的构造方法应当在它的 __init__ 方法的文档字符串中说明。各个方法应当由它们自己的文档字符串说明。

如果一个类继承自另一个类，而且它的行为大多继承自那个类，它的文档字符串就应当提到这一点，并概述两者的区别。用动词“override”（覆盖）表示子类方法取代了超类方法、并且不调用超类方法；用动词“extend”（扩展）表示子类方法在自身行为之外还调用了超类方法。

*不要*采用 Emacs 的惯例，在行文中用大写字母提及函数或方法的参数。Python 区分大小写，参数名可以用作关键字参数，所以文档字符串应当写出正确的参数名。最好每个参数单独列一行。例如：

```
def complex(real=0.0, imag=0.0):
    """Form a complex number.

    Keyword arguments:
    real -- the real part (default 0.0)
    imag -- the imaginary part (default 0.0)
    """
    if imag == 0.0 and real == 0.0:
        return complex_zero
    ...
```

除非整个文档字符串可以放在一行之内，否则把结束的引号单独放在一行。这样就可以对它使用 Emacs 的 fill-paragraph 命令。

### 处理文档字符串的缩进

文档字符串处理工具会从文档字符串的第二行及以后各行中去掉统一数量的缩进，这个数量等于第一行之后所有非空行的最小缩进。第一行中的任何缩进（即第一个换行符之前的部分）都无关紧要，会被去掉。后面各行之间的相对缩进会保留。文档字符串开头和结尾的空行应当去掉。

代码比文字精确得多，所以这里给出这个算法的一个实现：

```
def trim(docstring):
    if not docstring:
        return ''
    # Convert tabs to spaces (following the normal Python rules)
    # and split into a list of lines:
    lines = docstring.expandtabs().splitlines()
    # Determine minimum indentation (first line doesn't count):
    indent = sys.maxsize
    for line in lines[1:]:
        stripped = line.lstrip()
        if stripped:
            indent = min(indent, len(line) - len(stripped))
    # Remove indentation (first line is special):
    trimmed = [lines[0].strip()]
    if indent < sys.maxsize:
        for line in lines[1:]:
            trimmed.append(line[indent:].rstrip())
    # Strip off trailing and leading blank lines:
    while trimmed and not trimmed[-1]:
        trimmed.pop()
    while trimmed and not trimmed[0]:
        trimmed.pop(0)
    # Return a single string:
    return '\n'.join(trimmed)
```

下面这个例子中的文档字符串含有两个换行符，因此有 3 行。第一行和最后一行是空的：

```
def foo():
    """
    This is the second line of the docstring.
    """
```

举例说明：

```
>>> print repr(foo.__doc__)
'\n    This is the second line of the docstring.\n    '
>>> foo.__doc__.splitlines()
['', '    This is the second line of the docstring.', '    ']
>>> trim(foo.__doc__)
'This is the second line of the docstring.'
```

去掉缩进之后，下面这两个文档字符串是等价的：

```
def foo():
    """A multi-line
    docstring.
    """

def bar():
    """
    A multi-line
    docstring.
    """
```

## 版权

本文档已置于公有领域。

## 致谢

“规范”部分的文字大多一字不差地取自 Guido van Rossum 的 PEP 8。

本文档借鉴了 Python Doc-SIG 存档中的想法。感谢过去和现在的所有成员。
