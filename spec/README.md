# Spec — Hebrew/Gregorian Calendar (luach)

Full documentation of the app: **what** it does (functional spec) and **how**
its code should be structured cleanly (architecture spec). These documents
describe the existing state (including everything agreed on/changed during
development so far) and the recommended target architecture — **they don't
require any immediate code change**. Use them as: a basis for future
refactoring, and for anyone who continues developing the app (including
myself, a few months from now).

## Structure

### [`functional/`](functional/) — what the app does
A complete behavior spec, independent of the actual implementation. Each file
covers one feature area.

| File | Content |
|---|---|
| [00-overview.md](functional/00-overview.md) | App purpose, constraints, deployment |
| [01-hebrew-calendar.md](functional/01-hebrew-calendar.md) | Hebrew date, holidays, weekly parsha |
| [02-calendar-views-and-navigation.md](functional/02-calendar-views-and-navigation.md) | Views, month navigation, jump-to-date |
| [03-zmanim.md](functional/03-zmanim.md) | Location, daily zmanim, candle lighting/havdalah |
| [04-google-calendar-integration.md](functional/04-google-calendar-integration.md) | OAuth, fetching events, displaying them |
| [05-ui-and-accessibility.md](functional/05-ui-and-accessibility.md) | RTL/bidi, theme, disclosures, PWA |
| [06-persistence-and-storage.md](functional/06-persistence-and-storage.md) | Every localStorage/sessionStorage key |
| [07-external-dependencies.md](functional/07-external-dependencies.md) | Every external service/CDN and why |

### [`architecture/`](architecture/) — how the code is built
The target architecture per clean-code and SOLID principles — **fully
implemented** in the actual code (`src/`), not just a plan. `index.html` went
from a single monolithic shell + `<script>` to a modular structure
(config/services/state/components/utils) following this exact spec. Note: the
implementation was done in one shot (with a comprehensive automated test suite
+ visual screenshots before pushing), **not** via the gradual strangler-fig
stages originally described in
[06-migration-plan.md](architecture/06-migration-plan.md) — that's documented
there.

| File | Content |
|---|---|
| [00-principles.md](architecture/00-principles.md) | SOLID/clean-code principles as they apply to this app, with examples from the existing code |
| [01-target-file-structure.md](architecture/01-target-file-structure.md) | Proposed folder/file structure (ES modules, no build step) |
| [02-module-responsibilities.md](architecture/02-module-responsibilities.md) | Each module's responsibility, public API, dependencies |
| [03-state-management-pattern.md](architecture/03-state-management-pattern.md) | Store/pub-sub pattern replacing global variables |
| [04-component-design.md](architecture/04-component-design.md) | Breakdown into UI components, each one's render contract |
| [05-coding-standards.md](architecture/05-coding-standards.md) | Naming conventions, types, error handling, testing |
| [06-migration-plan.md](architecture/06-migration-plan.md) | Gradual migration plan from the single file to the new structure, without breaking the live site |

## How to read this

- The functional spec is the **source of truth** for behavior — if the code
  and this document contradict each other, one of them needs to be updated
  (figure out which one is correct).
- The architecture spec is a **proposal**, not gospel — every chapter includes
  the rationale behind the decision so it can be knowingly challenged.
- Both documents are written in English with the same technical terms/names
  the code itself uses.
