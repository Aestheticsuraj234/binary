# Chapter 11: Controlling your computer with the Runner

We're building **Binary**, a personal AI assistant you run yourself: AI
coworkers that chat with you, use your apps and do work for you. Characters
have tools with risk levels (`read`, `write`, `computer`), approvals for
risky calls, and an optional computer per chat: a cloud sandbox on E2B or a
headless browser.

Now I want characters to work on **my own computer**. Build the **Runner**, a
small local app I pair from a "Your computers" page and start with the
folders I want to share. Through it, a character can read and write files
and run commands there. Two more things come with it: a character can think
with **Claude Code** or **Codex** instead of an API model, run by the Runner
in my shared folder, and there's a **cloud desktop** from **E2B Desktop**
that I can watch live while the model clicks around.

Things I care about:

- Nothing on my computer opens to the network. The Runner asks the API for
  work; the API never connects to it.
- My computer has the final say: the Runner itself refuses any path outside
  the shared folders, whatever the server asks.
- Reading is `read`; writing, running commands and clicking on the desktop
  are `computer`, so they ask first.
- Pairing is safe: a one-time code, and I can pause or remove a Runner at
  any time.

Before writing code, look around the repo, show me your plan, and ask me
anything that's unclear.

Done when:

- [ ] I can pair a Runner, see it online, and watch an approved command run on my computer
- [ ] A path outside the shared folders is refused
- [ ] A Claude Code character streams what it says and does into the chat
- [ ] On a cloud desktop, the model asks to click, and after I approve it sees the new screen
- [ ] Lint, typecheck and tests pass, with fakes instead of real CLIs and desktops
