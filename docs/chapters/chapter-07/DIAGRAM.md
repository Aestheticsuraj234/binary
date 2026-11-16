# Chapter 7 diagram

Three things can start a run, and one job runner decides where it happens:
on Trigger.dev when it's set up, inside the API when it isn't. Either way the
run goes through the same chat pipeline and leaves a transcript.

```mermaid
flowchart LR
  subgraph Starts["What starts a run"]
    RN["Run now<br/>Routines page"]
    WH["Webhook<br/>URL + secret"]
    CR["Schedule<br/>cron, your time zone"]
  end

  API["API<br/>routines + hooks routes"]
  JR{"Job runner"}

  subgraph TD["Trigger.dev (optional)"]
    T1["run-routine task"]
    T2["routine-schedule"]
  end

  IN["Inside the API<br/>no schedules"]
  RUN["Run the routine<br/>runs once, never twice"]
  CP["Chat pipeline<br/>model + tools"]
  DB[("Postgres<br/>routines, triggers,<br/>runs, transcripts")]

  RN --> API
  WH -- "secret checked" --> API
  API --> JR
  JR -- "key set" --> T1
  JR -- "no key" --> IN
  CR --> T2
  T1 --> RUN
  T2 --> RUN
  IN --> RUN
  RUN --> CP --> DB
  API --> DB
```
