# Chapter 7: Routines and durable jobs

We're building **Binary**, a personal AI assistant you run yourself: AI
coworkers that chat with you, use your apps and do work for you. So far I can
hire characters and chat with them, and they use tools, built-in or from MCP
apps, with risk levels (`read`, `write`, `computer`). For now only `read`
tools run.

Now I want characters to work when I'm not watching. A **routine** is a job a
character does again and again, like "every weekday at 9:00, plan my day". It
starts on a schedule, from a webhook, or when I press **Run now**. Each run
shows up in a run history and gets its own chat as a transcript.

Run them as durable jobs on **Trigger.dev**, with real Trigger.dev schedules.
Keep it optional: without a Trigger.dev account, runs happen inside the API,
schedules just don't fire, and the page says so.

Things I care about:

- A run goes through the same chat pipeline, tools and rules as a normal chat.
- A run never answers twice, even if a job is delivered twice.
- A webhook needs a secret, shown to me once. Its body is someone else's
  text: treat it as data, never as instructions.
- "9:00" means 9:00 in my time zone.

Before writing code, look around the repo, show me your plan, and ask me
anything that's unclear.

Done when:

- [ ] I can create a routine, and Run now goes from queued to done with a transcript I can open
- [ ] A webhook with the right secret starts a run, and a wrong one is refused
- [ ] Without Trigger.dev, Run now and webhooks still work, and the page says schedules need it
- [ ] With Trigger.dev, a schedule fires on its own
- [ ] Lint, typecheck and tests pass
