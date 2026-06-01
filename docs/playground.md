# Code Playground

The Pict Playground is a sliding drawer at the bottom of every page in these
docs. Open it from the topbar to get three panes side by side: a code
editor on the left, a captured log in the middle, and a **DOM sandbox** on
the right that runnable examples render into.

The drawer is also a stand-alone reference page at
[`/#/playground/pict`](/#/playground/pict).

Every ```` ```javascript ```` block in these docs has a play button next to it
that loads the block into the editor and runs it. The async IIFE the
playground builds for you receives five parameters:

- `fable` - a fresh Fable instance (a Pict instance in DOM mode, so it has
  fable.log/UUID/etc. as well).
- `pict` - the same fresh Pict instance. Anything you register on it
  (templates, providers, views) is isolated to this run.
- `require` - a curated shim that resolves the names listed in this
  module's `_playground.json` (here: `fable`, `pict`,
  `fable-serviceproviderbase`).
- `console` - captures `console.*` calls into the log panel.
- `sandbox` - the live `<div>` element on the right pane. Reset between
  every run, so each example starts on a clean canvas.

## Try it

```javascript
const libPict = require('pict');
const pict = new libPict({ Product: 'PlaygroundDemo' });

pict.TemplateProvider.addTemplate('Greeting', '<h2 style="margin:0">Hello, {~D:Record.Name~}!</h2>');
const html = pict.parseTemplateByHash('Greeting', { Name: 'World' });

sandbox.innerHTML = html;
console.log('Rendered into the sandbox:', html);
```

Click play and the sandbox pane will show **Hello, World!**. The middle pane
logs the same HTML string so you can see what `parseTemplateByHash`
returned.

## How DOM mode differs from console mode

The fable-family playgrounds (fable-uuid, fable-log, fable-settings, fable
itself) ship a two-pane layout (code + log). Their `_playground.json`
doesn't set `Sandbox`, so the DOM pane stays hidden and the `sandbox`
parameter passed to the IIFE is still a real element - just not visible.

Pict and pict-section-* docs opt into the three-pane layout by adding
`"Sandbox": "dom"` to their `_playground.json`. That single field also
swaps the `pict` IIFE parameter from "the live docuserve pict" (which
fable docs use) to "a fresh, isolated pict bound to a fresh fable"
(which pict docs need to mutate freely without leaking into the
docuserve UI).
