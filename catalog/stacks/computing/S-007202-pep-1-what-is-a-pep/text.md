## What is a PEP?

PEP stands for Python Enhancement Proposal. A PEP is a design document providing information to the Python community, or describing a new feature for Python or its processes or environment. The PEP should provide a concise technical specification of the feature and a rationale for the feature.

We intend PEPs to be the primary mechanisms for proposing major new features, for collecting community input on an issue, and for documenting the design decisions that have gone into Python. The PEP author is responsible for building consensus within the community and documenting dissenting opinions.

Because the PEPs are maintained as text files in a versioned repository, their revision history is the historical record of the feature proposal. This historical record is available by the normal git commands for retrieving older revisions, and can also be browsed on GitHub.

## PEP Audience

The typical primary audience for PEPs are the core developers of the CPython reference interpreter and their elected Steering Council, as well as developers of other implementations of the Python language specification.

However, other parts of the Python community may also choose to use the process (particularly for Informational PEPs) to document expected API conventions and to manage complex design coordination problems that require collaboration across multiple projects.

## PEP Types

There are three kinds of PEP:

1. A **Standards Track** PEP describes a new feature or implementation for Python. It may also describe an interoperability standard that will be supported outside the standard library for current Python versions before a subsequent PEP adds standard library support in a future version.

2. An **Informational** PEP describes a Python design issue, or provides general guidelines or information to the Python community, but does not propose a new feature. Informational PEPs do not necessarily represent a Python community consensus or recommendation, so users and implementers are free to ignore Informational PEPs or follow their advice.

3. A **Process** PEP describes a process surrounding Python, or proposes a change to (or an event in) a process. Process PEPs are like Standards Track PEPs but apply to areas other than the Python language itself. They may propose an implementation, but not to Python's codebase; they often require community consensus; unlike Informational PEPs, they are more than recommendations, and users are typically not free to ignore them. Examples include procedures, guidelines, changes to the decision-making process, and changes to the tools or environment used in Python development. Any meta-PEP is also considered a Process PEP.
