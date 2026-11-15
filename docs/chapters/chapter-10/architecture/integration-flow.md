# The guard and browser states

## Every request goes through the guard

```mermaid
flowchart TD
  R["A request from any page in the chat's context<br/>(navigation, redirect, form post, image, script, new tab)"] --> P{"data: or blob:?"}
  P -- yes --> OK["continue"]
  P -- no --> C{"Verdict for this origin cached?"}
  C -- no --> G["UrlGuard(url)<br/>http(s) only · every resolved address public"]
  G --> C
  C -- allowed --> OK
  C -- refused --> X["abort('blockedbyclient')"]
  X --> M{"The page's own navigation?"}
  M -- yes --> E["browser_open: error<br/>click / type: result.blocked"]
  M -- no --> S["silently missing (an image, a script)"]
```

## A chat's browser

```mermaid
stateDiagram-v2
  [*] --> none
  none --> open: browser_open (first time)
  open --> open: any browser tool (idle timer restarts)
  open --> closed: Close (chip or Apps), the chat deleted
  open --> closed: 10 idle minutes
  open --> gone: the API restarts
  gone --> closed: noticed on the next use or listing
  closed --> open: browser_open again (a fresh browser, signed out)
  none --> none: browser_read / click / type → "This chat has no browser open"
```

A click or a typed search that you approve after the browser has closed
gets the same "no browser open" answer, and the agent is told to open the
page again.
