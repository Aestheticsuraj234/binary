# States

## A computer (device)

```mermaid
stateDiagram-v2
  [*] --> pairing: Add computer (code shown)
  pairing --> paired: runner pair <CODE> (once, within 15 min)
  pairing --> [*]: Cancel, or the code expires unused
  paired --> online: runner start (hello, then polls)
  online --> offline: no poll for 60 s (Runner stopped)
  offline --> online: runner start
  online --> paused: Pause (kill switch)
  paused --> online: Resume
  online --> [*]: Remove (token revoked, Runner exits)
  paused --> [*]: Remove
```

## A job

```mermaid
stateDiagram-v2
  [*] --> queued: dispatch()
  queued --> running: the device's poll takes it
  queued --> failed: not picked up in 30 s
  running --> done: result {ok}
  running --> failed: result {error} (outside the folders, CLI missing…)
  running --> failed: past its limit (3 min, 30 s, 15 min)
```

Jobs live in the API's memory. One that was queued or running when the
API restarted is lost, and whoever was waiting for it gets an error.

## A desktop step

```mermaid
flowchart LR
  L["desktop_screenshot / desktop_open / desktop_scroll<br/>(read: runs)"] --> I["the model sees the PNG"]
  I --> C["desktop_click / type / key<br/>(computer: asks)"]
  C --> AP{"You approve?"}
  AP -- yes --> D["the action runs → new screen"]
  D --> F["follow-up turn with the screen attached"]
  F --> I
  AP -- no --> X["You rejected …"]
```
