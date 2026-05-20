# Template Expressions

Pict uses "jellyfish templates" - template expressions wrapped in `{~` and `~}` delimiters. These expressions can access data, format values, render other templates, and perform logic.

A second, complementary form - the "inline template" - is delimited with `{<` and `>}`. It captures its contents verbatim and re-parses them as a template at runtime. See [Inline Template](#inline-template) below.

## Data and Template Representation

### Data

Access data from the state address space using `Data` or the shorthand `D`:

```javascript
{~Data:AppData.User.name~}
{~D:AppData.User.name~}
```

Both forms are equivalent. The address can point to any location in the state:

```javascript
{~D:AppData.Settings.theme~}      // Application data
{~D:Bundle.Config.version~}       // Bundle data
{~D:Record.id~}                   // Current record in a set
{~D:Context[0].value~}            // Context array
```

### Data With Template Fallback

If the data is empty or undefined, render a fallback template instead:

```javascript
{~DataWithTemplateFallback:AppData.User.name:DefaultName-Template~}
{~DWTF:AppData.User.name:DefaultName-Template~}
```

### Data With Absolute Fallback

If the data is empty, use a literal fallback value:

```javascript
{~DataWithAbsoluteFallback:AppData.User.name^Anonymous~}
{~DWAF:AppData.User.name^Anonymous~}
```

## Data Formatting

### Numbers

Format a value as a number with specified decimal places:

```javascript
{~Digits:AppData.Price:2~}    // "99.99"
{~Digits:AppData.Value:0~}    // "100"
```

### Dollars

Format a value as US currency:

```javascript
{~Dollars:AppData.Total~}     // "$1,234.56"
```

### Date YYYYMMDD

Format a date in YYYYMMDD format:

```javascript
{~DateYMD:AppData.Date~}      // "20250615"
```

### Date and Time Format

Format a date and time:

```javascript
{~DateTimeFormat:AppData.Timestamp~}
```

### Date and Time in YMD Sortable Format

Format date/time in a sortable format:

```javascript
{~DateTimeYMD:AppData.Timestamp~}
```

### Generate a Pascal Case Browser-Safe Identifier from a Value

Convert a value to PascalCase for use as an identifier:

```javascript
{~PascalCaseIdentifier:AppData.Title~}
// "my product name" -> "MyProductName"
```

### Join a Set

Join array elements with a separator:

```javascript
{~Join:AppData.Tags:, ~}
// ["red", "green", "blue"] -> "red, green, blue"
```

### Join Unique Entries in a Set

Join only unique array elements:

```javascript
{~JoinUnique:AppData.Items:, ~}
// ["a", "b", "a", "c"] -> "a, b, c"
```

### Pluck a Value Set from an Array of Objects and Uniquify, then Join

Extract a property from each object, unique, then join:

```javascript
{~PluckJoinUnique:AppData.Users:name:, ~}
// [{name:"John"}, {name:"Jane"}, {name:"John"}] -> "John, Jane"
```

## HTML Formatting

### HTML Comment Start on Condition

Output `<!--` if a condition is falsy (to comment out content):

```javascript
{~HtmlCommentStart:AppData.ShowSection~}
{~HCS:AppData.ShowSection~}
```

### HTML Comment End on Condition

Output `-->` if a condition is falsy:

```javascript
{~HtmlCommentEnd:AppData.ShowSection~}
{~HCE:AppData.ShowSection~}
```

Usage example:

```html
{~HCS:AppData.ShowBanner~}
<div class="banner">Special Offer!</div>
{~HCE:AppData.ShowBanner~}
```

## Other Templates

### Template

Render another template by hash:

```javascript
{~Template:UserCard~}
{~T:UserCard~}
```

### Template By Data Address

Render a template whose hash is stored in data:

```javascript
{~TemplateByDataAddress:AppData.SelectedTemplate~}
{~TBDA:AppData.SelectedTemplate~}
```

### Template By Reference

Render a template with data from an address:

```javascript
{~TemplateByReference:UserCard:AppData.CurrentUser~}
{~TBR:UserCard:AppData.CurrentUser~}
```

### Template From Map

Select a template based on a key from a map:

```javascript
{~TemplateFromMap:AppData.Status:StatusTemplates~}
{~TFM:AppData.Status:StatusTemplates~}
```

### Addressed Template

Render a template whose body is stored at a data address. The body is looked up at runtime and parsed against the current `Record` / `Context` / `Scope` / `State`, so any expressions inside it resolve in the surrounding scope.

Delimiters: `{[` to open, `]}` to close.

```javascript
// _Pict.AppData.MyTemplate = "TEMPLATED CONTENT HERE, {~D:AppData.SomeValue~}."
// _Pict.AppData.SomeValue = "CHOCOLATE"
{[AppData.MyTemplate]}
// -> "TEMPLATED CONTENT HERE, CHOCOLATE."
```

The address resolves through the standard roots - `AppData.X`, `Bundle.X`, `Record.X`, `Context[0].X`, `Scope.X`, `TempData.X`, etc. Array indexing works (`{[AppData.Templates[1]]}`), and the resolved body can itself contain any other pict expressions (including nested `{[...]}`, `{~T:~}`, `{~TS:~}`, `{~D:~}`, ...).

This pairs with the inline template `{<...>}`:

|                 | Where the body lives                                            |
|-----------------|-----------------------------------------------------------------|
| `{<body>}`      | Inline in the outer template, captured verbatim and re-parsed. |
| `{[Address]}`   | At a data address; looked up at runtime and parsed.             |
| `{~T:Hash~}`    | Registered in `pict.TemplateProvider` under a hash.             |

If the address does not resolve, or resolves to a non-string, the engine logs a warning that names the address and the full expression, and renders an empty string:

```
Pict: Addressed Template Render: Address [AppData.Missing.Path] did not resolve for expression [{[AppData.Missing.Path]}]
```

An address that resolves to an empty string renders empty silently (no warning) - empty bodies are a valid degenerate case, not a missing data condition.

### Inline Template

Define a template literal at the point of use - no need to register it with `pict.TemplateProvider.addTemplate()` first. The body between `{<` and `>}` is captured verbatim during the outer parse, then re-parsed as a template when this expression renders. The surrounding `Record`, `Context`, `Scope`, and `State` are passed through unchanged, so nested expressions resolve against the same scope they would at the outer level.

Delimiters: `{<` to open, `>}` to close.

```javascript
{<TEMPLATED CONTENT HERE, {~D:AppData.SomeValue~}.>}
```

If `AppData.SomeValue` is `"CHOCOLATE"`, this renders as `TEMPLATED CONTENT HERE, CHOCOLATE.`

Any other jellyfish expression can nest inside it - the body is just a template string. Examples:

```javascript
// Data + literal text
{<Hello, {~D:AppData.User.Name~}.  You are {~D:AppData.User.Age~} years old.>}

// HTML in the body, with iteration
{<<ul>{~TS:Cereal-Row:AppData.Cereals~}</ul>>}

// Inside a {~TS:~} row -- per-row Record is available
{~TS:Row-Template:AppData.Cereals~}
// ...where Row-Template = '<li>{<{~D:Record.Name~} #{~D:Record.Year~}>}</li>'

// With a formatting filter
{<Total: {~Dollars:AppData.Invoice.Amount~}>}

// With a registered child template
{<Section: {~T:GreetingChild:AppData.Guest~} -- end.>}
```

**When to reach for it** - prefer the inline form when:
- You want a one-shot template literal that would clutter `Templates: [...]` for a single use.
- You need to compose a small chunk of template syntax inline in a JS string (utilities, tests, or string-builder helpers).
- You're stitching together fragments and want the surrounding scope preserved without manually threading `Record` / `Context` through.

For repeated content, register a named template with `pict.TemplateProvider.addTemplate()` and use `{~T:...~}` instead - named templates are easier to discover, cache better, and surface in template auditing.

Direct nesting of `{<...>}` inside `{<...>}` is not supported (the first `>}` closes the outer block); wrap the inner literal in a registered template hash and reference it with `{~T:Hash~}` if you need that.

## Other Templates Multiplied by a Data Set

### Template Set

Render a template for each item in a collection:

```javascript
{~TemplateSet:UserRow:AppData.Users~}
{~TS:UserRow:AppData.Users~}
```

Within the template, `Record` refers to the current item.

### Template Set From Map

Render templates from a map for each item:

```javascript
{~TemplateSetFromMap:AppData.Items:TypeTemplates~}
{~TSFM:AppData.Items:TypeTemplates~}
```

### Template Set With Payload

Render a template set with additional payload data:

```javascript
{~TemplateSetWithPayload:ItemRow:AppData.Items:AppData.Config~}
{~TSWP:ItemRow:AppData.Items:AppData.Config~}
```

Within the template, each record is wrapped as `{ Data: <item>, Payload: <payload> }`:
- `Record.Data` refers to the current item
- `Record.Payload` refers to the payload object

### Template Value Set

Render a template for each value in an object:

```javascript
{~TemplateValueSet:PropertyRow:AppData.Settings~}
{~TVS:PropertyRow:AppData.Settings~}
```

## Functions

### Function

Call a function resolved from an address, passing values resolved from other addresses as its arguments. The first `:`-separated parameter is the function's address; each subsequent parameter is an address whose resolved value becomes an argument. Arity is dynamic.

```javascript
{~Function:Pict.providers.Geometry.area:Record.X:Record.Y~}
{~F:Pict.providers.Geometry.area:Record.X:Record.Y~}
```

If `Pict.providers.Geometry.area` is `(pW, pH) => pW * pH` and the record is `{ X: 6, Y: 7 }`, this renders `42`.

The function is invoked with `this` bound to its owner object (everything before the final `.` in the address), so instance methods that rely on `this` work naturally:

```javascript
testPict.services.Counter = {
    base: 1000,
    offsetBy: function (pDelta) { return this.base + pDelta; }
};
// {~F:Pict.services.Counter.offsetBy:Record.Delta~}   ->   1023  (for Delta=23)
```

Arguments resolve from any of the standard address roots - `Record.X`, `AppData.X.Y`, `Scope.X`, `Context[0].X`, `Bundle.X`, etc.  Zero arguments is fine:

```javascript
{~F:Pict.services.Time.now~}
```

If the address does not resolve to a function (missing, or resolves to a non-function value), the engine logs a warning naming the address and the full template expression, and renders an empty string. The same handling applies if the function throws.

```
Pict: Function Render: Function not found at address [Pict.services.Nope.notThere] for template [{~Function:Pict.services.Nope.notThere:Record.X~}]
```

## Logic

### Show Content if Truthy

Render literal content if a value is truthy:

```javascript
{~NotEmpty:AppData.HasPermission^<button>Delete</button>~}
{~NE:AppData.HasPermission^<button>Delete</button>~}
```

### Conditional If (Relative)

Conditionally render a template by comparing two data addresses. Both sides of the comparison are resolved from state:

```javascript
{~TemplateIf:SuccessMessage:Record:AppData.Status^==^AppData.ExpectedStatus~}
{~TIf:SuccessMessage:Record:AppData.Status^==^AppData.ExpectedStatus~}
```

Available operators:
- `==` - Equal (loose)
- `===` - Equal (strict)
- `!=` - Not equal (loose)
- `!==` - Not equal (strict)
- `>` - Greater than
- `>=` - Greater than or equal
- `<` - Less than
- `<=` - Less than or equal
- `TRUE` - Left value is true
- `FALSE` - Left value is false
- `LNGT` / `LENGTH_GREATER_THAN` - Left value's length is greater than right
- `LNLT` / `LENGTH_LESS_THAN` - Left value's length is less than right

### Conditional If with Absolute Value

Compare a data address against a literal value:

```javascript
{~TemplateIfAbsolute:AdminPanel:Record:AppData.UserRole^==^admin~}
{~TIfAbs:AdminPanel:Record:AppData.UserRole^==^admin~}
```

## Meadow Entities

### Entity

Load and render an entity from the entity provider:

```javascript
{~Entity:Book^AppData.BookID^BookCard~}
{~E:Book^AppData.BookID^BookCard~}
```

Format: `Entity:EntityType^IDAddress^TemplateHash`

## Pict Classes

### Pict Self Reference

Get the browser address for the pict instance:

```javascript
{~Pict~}
{~P~}
// Returns something like "window._Pict"
```

### View

Render a view's default renderable:

```javascript
{~View:UserProfile~}
{~V:UserProfile~}
```

## Solver

### Solve

Evaluate a mathematical expression:

```javascript
{~Solve:10 * 5~}
{~S:10 * 5~}
```

### Solve By Reference

Evaluate an expression stored in data:

```javascript
{~SolveByReference:AppData.Formula:AppData:AppData~}
{~SBR:AppData.Formula:AppData:AppData~}
```

## Debugging

### Set a Javascript Breakpoint

Insert a debugger statement:

```javascript
{~Breakpoint~}
```

### Output a Data Value Tree

Output a JSON representation of a data tree:

```javascript
{~DataTree:AppData.User~}
{~DT:AppData.User~}
```

### Log a Hard-Coded Debugger Statement

Log a static message:

```javascript
{~LogStatement:Processing user data~}
{~LS:Processing user data~}
```

### Log a Value

Log a value to the console:

```javascript
{~LogValue:AppData.User.name~}
{~LV:AppData.User.name~}
```

### Log a Value Tree

Log an entire object tree:

```javascript
{~LogValueTree:AppData.User~}
{~LVT:AppData.User~}
```

## Quick Reference

| Expression | Shorthand | Description |
| ---------- | --------- | ----------- |
| `Data` | `D` | Access data by address |
| `DataWithTemplateFallback` | `DWTF` | Data with template fallback |
| `DataWithAbsoluteFallback` | `DWAF` | Data with literal fallback |
| `DataJson` | `DJ` | Output data as JSON |
| `DataValueByKey` | `DVBK` | Access data value by a dynamic key |
| `DataEncodeJavascriptString` | `DEJS` | Encode data for JS string |
| `Template` | `T` | Render template by hash |
| `TemplateByReference` | `TBR` | Render template with data from address |
| `TemplateByDataAddress` | `TBDA` | Render template whose hash is in data |
| (inline body) | `{<...>}` | Inline template literal - body is parsed as a template at runtime |
| (addressed body) | `{[...]}` | Resolve an address to a template string and render it |
| `Function` | `F` | Call a resolved function with addressed arguments |
| `TemplateFromMap` | `TFM` | Select template by key from map |
| `TemplateFromAddress` | `TFA` | Render template from address |
| `TemplateByType` | `TBT` | Render template by type |
| `TemplateSet` | `TS` | Render template for each item |
| `TemplateSetFromMap` | `TSFM` | Render templates from map for each item |
| `TemplateSetWithPayload` | `TSWP` | Render template set with payload |
| `TemplateValueSet` | `TVS` | Render template for each value in object |
| `TemplateIf` | `TIf` | Conditional (both sides are addresses) |
| `TemplateIfAbsolute` | `TIfAbs` | Conditional with literal compare |
| `NotEmpty` | `NE` | Show content if truthy |
| `Digits` | - | Format as number |
| `Dollars` | - | Format as currency |
| `PascalCaseIdentifier` | - | Convert to PascalCase |
| `Join` | `J` | Join array |
| `JoinUnique` | `JU` | Join unique array values |
| `PluckJoinUnique` | `PJU` | Pluck, unique, then join |
| `Entity` | `E` | Load and render entity |
| `View` | `V` | Render view |
| `ViewRetainingScope` | `VRS` | Render view retaining scope |
| `Solve` | `S` | Evaluate expression |
| `SolveByReference` | `SBR` | Evaluate expression from data |
| `Breakpoint` | - | Insert debugger |
| `DataTree` | `DT` | Output data value tree |
| `LogStatement` | `LS` | Log a static message |
| `LogValue` | `LV` | Log value to console |
| `LogValueTree` | `LVT` | Log object tree |
| `RandomNumber` | `RN` | Generate random number |
| `RandomNumberString` | `RNS` | Generate random number string |
| `HtmlCommentStart` | `HCS` | Conditional HTML comment open |
| `HtmlCommentEnd` | `HCE` | Conditional HTML comment close |
| `DateTimeFormat` | - | Format date/time |
| `DateTimeYMD` | - | Format date/time (YMD sortable) |
| `DateOnlyFormat` | - | Format date only |
| `DateOnlyYMD` | - | Format date only (YMD) |
