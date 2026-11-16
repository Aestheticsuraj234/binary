# Chapter 14: Mobile app and voice

We're building **Binary**, a personal AI assistant you run yourself: AI
coworkers that chat with you, use your apps and do work for you. The web app
has it all now: characters with tools, memory and computers, approvals in a
Today inbox, routines, and rooms. But the **Expo** app from chapter 1 can
still only sign in.

Now I want Binary in my pocket. The app gets four tabs: **Crew** (my
characters and recent chats), **Rooms**, **Today** (approvals and routine
runs) and **You** (account and sign out). Chats and rooms work like on the
web: answers stream in, tool calls show, and I can approve or reject right
there. The characters look the same as on the web, from one shared drawing
rather than a copy.

And I want **voice input**: tap the mic, speak, and the words land in the
message box. The API transcribes the audio with my own OpenAI key, using my
characters' names as a hint so they're spelled right.

Things I care about:

- API keys never reach the phone. The app only talks to our API.
- Spoken text lands in the box without being sent, so I can fix a misheard word.
- Decisions made on the phone are saved as coming from mobile.
- Hiring, apps, keys and routines stay on the web.

Before writing code, look around the repo, check the docs for the Expo SDK
version the app uses, show me your plan, and ask me anything that's unclear.

Done when:

- [ ] On my phone I can see my crew, my rooms and Today
- [ ] A chat or room streams answers, and I can approve or reject a tool call
- [ ] I speak a message, the words land in the box, and names are spelled right
- [ ] Without an OpenAI key, voice shows a clear message
- [ ] Lint, typecheck and tests pass, and the app bundles for iOS and Android
