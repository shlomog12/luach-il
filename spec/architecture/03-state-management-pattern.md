# State Management Pattern: Store + Pub/Sub

## The problem in the pre-refactor code

State like `VIEW_MODE`, `LOCATION`, `current`, `hebCursor` were global
(`let`) variables any function could mutate directly. Every place that
changed them had to **remember on its own** to call `renderCalendarGrid()`
(or a similar function) afterward — there was no mechanism enforcing that.
This is, for example, why bugs like "I forgot to refresh X after changing
Y" become easy to hit as an app grows.

## The solution: a small Store with `subscribe`

Without a framework (Redux/MobX/Zustand) — a minimal pattern, natural to
vanilla JS, that each store implements itself (~15 lines of code):

```js
// Conceptual example — not final code
export function createStore(initialValue, { persist } = {}) {
  let value = persist?.load() ?? initialValue;
  const listeners = new Set();

  return {
    get: () => value,
    set(newValue) {
      value = newValue;
      persist?.save(newValue);
      listeners.forEach(fn => fn(value));
    },
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn); // unsubscribe
    },
  };
}
```

Every `state/*Store.js` (see [02](02-module-responsibilities.md)) is a thin
wrapper around `createStore`, with its own persistence logic (if any) and
sometimes extra domain-specific API (e.g. `CalendarNavigationStore` also
needs `navigateMonth(direction)`, not just `set`).

## Data flow: one-directional

```
User action (click an arrow/cell/button)
        │
        ▼
  Component calls Store.set(...) or a Service
        │
        ▼
  Store updates its internal value + (if persisted) saves to localStorage
        │
        ▼
  Store calls every registered listener (subscribe)
        │
        ▼
  Every registered Component updates/re-renders itself
```

**A component never calls another component's render function directly.**
The only communication between components is **through shared state**
(a store) both are subscribed to, or through an explicit injected callback
(see [04-component-design.md](04-component-design.md)).

## Example: how this solves the potential bug

Before: `setViewMode('heb')` had to "remember" to call
`updateModeButtons()` **and** `renderCalendarGrid()` **and** (once
`syncJumpDefaults` was added) update the jump controls. Three manual calls,
in a specific order, and it's easy to forget one of them when a fourth
feature is added.

In the store-based structure: `ModeToggle` only calls
`ViewModeStore.set('heb')`. `CalendarGrid`, `NavControls`, and
`JumpToDatePanel` **each subscribe themselves** to `ViewModeStore` at
startup (in `main.js`), and refresh themselves when the value changes —
without `ModeToggle` needing to know they exist at all. Adding a fourth
component that depends on the view mode = one more `subscribe` call in its
own place, zero changes to existing code (this is exactly OCP, see
[00](00-principles.md)).

## When **not** to use a store

State that's "entirely local" to one component and doesn't affect any other
component (e.g. which option is currently selected in a `<select>` inside
the location dialog, before "Save" is clicked) — stays a regular variable
inside the component itself, **no** dedicated store needed. A store is only
for state that's **shared** across multiple parts of the app.
