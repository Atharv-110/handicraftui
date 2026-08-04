# Contributing to Handicraft UI

Thanks for being here. This document covers how to get the project running, the standard a change has
to meet, and how to sign your work.

Before you write code, read [`.claude/doctrine/CODE-CONTRACT.md`](.claude/doctrine/CODE-CONTRACT.md).
It describes the component authoring pattern as it actually exists, and following it is the difference
between a patch that merges quickly and one that goes round three times.

## Setup

```bash
corepack enable pnpm
pnpm install
pnpm --filter @handicraft/core build
pnpm --filter @handicraft/playground dev   # http://localhost:4321
```

The playground is the harness for every visual change. Its state is URL-addressable:

```
?fidelity=lite|high  &dark=1  &texture=0  &stress=1
&hand=steady|natural|loose|hurried  &ink=plain|layered
&fill=no|low|med|high  &drawOn=1  &drawMs=<n>
```

**One trap that will cost you an hour.** The playground consumes `@handicraft/core` as built `dist`,
not as source. Rebuilding core under a running dev server leaves the server on the old JavaScript, and
because CSS hot-reloads while JS does not, it presents as "tier 2 renders nothing" rather than as a
cache problem. After any core rebuild:

```bash
lsof -ti:4321 | xargs kill -9
rm -rf apps/playground/.next-dev
```

## Gates

All six must pass before a pull request is ready. Run them from the repository root.

```bash
pnpm test            # vitest
pnpm typecheck
pnpm lint
pnpm build
pnpm registry:build
pnpm format:check    # prettier
```

## What a change has to clear

This is the floor. It is not negotiable, and it is the same floor the maintainer's own changes meet.

- All gates green.
- New behaviour has a test, and that test is **mutation-verified**: break the invariant it guards,
  confirm that test and only that test fails, revert, confirm green again. A test that cannot fail is
  decoration. Verify the revert with `git diff` rather than assuming it landed — prettier reformatting
  a mutated value has silently defeated a revert on this project before.
- Renders correctly at **375, 768, 1280 and 1920** pixels wide, with no horizontal overflow at any
  width. 375 is an iPhone SE and it is a hard floor.
- **44px minimum touch target** on anything interactive.
- Keyboard reachable, focus visible, and zero critical axe violations.
- Correct at `fidelity=lite` and `fidelity=high`, in both light and blackboard dark mode.
- Every visual claim verified in a browser. Not asserted from reading the code.

## Things that will get a patch sent back

- **Adding a dependency.** The registry derives each component's user-facing `dependencies` by
  scanning its imports, so a single stray import becomes an install requirement for everyone who uses
  that component. Anything beyond `react` and `@handicraft/core` in `registry/default/**` needs to be
  discussed in an issue first.
- **Introducing `cva` or `tailwind-variants`.** Variants here are plain `as const` objects with types
  derived via `keyof typeof`. This is deliberate.
- **Changing an engine invariant** — `preserveVertices`, base roughness, bowing, stroke width, seed
  pool size. These are load-bearing for the entire aesthetic and each one has measured evidence behind
  it in `.claude/doctrine/PRINCIPLES.md`. Open an issue.
- **Comments that describe what a line does.** The convention here is to explain the choice and what
  was rejected. These files are copied into other people's repositories; the comments are part of the
  product.

## Sign your work

Contributions are accepted under the [Developer Certificate of Origin](https://developercertificate.org)
version 1.1. There is no CLA to sign and no paperwork — you keep the copyright in your contribution.

Add a sign-off to each commit:

```bash
git commit -s -m "your message"
```

which appends:

```
Signed-off-by: Your Name <your.email@example.com>
```

By doing that you certify the following.

```
Developer Certificate of Origin
Version 1.1

Copyright (C) 2004, 2006 The Linux Foundation and its contributors.

Everyone is permitted to copy and distribute verbatim copies of this license
document, but changing it is not allowed.


Developer's Certificate of Origin 1.1

By making a contribution to this project, I certify that:

(a) The contribution was created in whole or in part by me and I have the right
    to submit it under the open source license indicated in the file; or

(b) The contribution is based upon previous work that, to the best of my
    knowledge, is covered under an appropriate open source license and I have
    the right under that license to submit that work with modifications,
    whether created in whole or in part by me, under the same open source
    license (unless I am permitted to submit under a different license), as
    indicated in the file; or

(c) The contribution was provided directly to me by some other person who
    certified (a), (b) or (c) and I have not modified it.

(d) I understand and agree that this project and the contribution are public
    and that a record of the contribution (including all personal information I
    submit with it, including my sign-off) is maintained indefinitely and may
    be redistributed consistent with this project or the open source license(s)
    involved.
```

If you forgot, `git commit --amend -s` fixes the last commit and
`git rebase --signoff HEAD~<n>` fixes a range.

## Licence and naming

Your contributions are licensed under the [MIT License](LICENSE), the same as the rest of the project.

The Handicraft UI name and logo are **not** covered by that licence — see [TRADEMARK.md](TRADEMARK.md).
Forking is welcome and MIT permits it; give your fork its own name.

## Reporting a bug

A report without a reproduction cannot be acted on. Please include:

- What you expected and what actually happened
- The narrowest reproduction you can manage, ideally a URL against the playground with the relevant
  parameters set
- Viewport width, browser, and whether it happens at `fidelity=lite`, `fidelity=high` or both

Screenshots help a great deal for anything visual, which here is most things.
