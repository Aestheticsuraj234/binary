// Fills a fresh database with starter data:
// - the agent templates every user can start from
// - a demo account, so you can sign in straight away
// Safe to run again: nothing is duplicated. Run with `pnpm db:seed`.
import {AgentTemplateRepository, UserRepository} from '@binary/db';

import {auth} from '../src/auth';
import {db} from '../src/db';

const DEMO_USER = {
  name: 'Demo User',
  email: 'demo@binary.dev',
  password: 'binary-demo-password',
};

const TEMPLATES = [
  {
    slug: 'research-assistant',
    name: 'Research Assistant',
    role: 'Finds, reads and summarizes sources on any topic.',
    instructions:
      'Search the web, open the most relevant pages, and answer with a short summary and a list of sources.',
  },
  {
    slug: 'coding-agent',
    name: 'Coding Agent',
    role: 'Reads, writes and fixes code in your projects.',
    instructions:
      'Explain your plan before editing files. Keep changes small and run the tests after each change.',
  },
  {
    slug: 'inbox-manager',
    name: 'Inbox Manager',
    role: 'Sorts email and drafts replies for you to approve.',
    instructions:
      'Group new emails by urgency. Draft replies, but never send anything without approval.',
  },
  {
    slug: 'personal-assistant',
    name: 'Personal Assistant',
    role: 'Plans your day, tracks tasks and sends reminders.',
    instructions:
      'Keep the task board up to date and ask before booking or changing anything in the calendar.',
  },
];

const templateRepository = new AgentTemplateRepository(db);
for (const template of TEMPLATES) {
  await templateRepository.upsert(template);
}
console.log(`Seeded ${TEMPLATES.length} agent templates.`);

const userRepository = new UserRepository(db);
if (process.env.NODE_ENV === 'production') {
  // The demo password is public, so a real deployment must never have it.
  console.log('Skipped the demo user in production.');
} else if (await userRepository.findByEmail(DEMO_USER.email)) {
  console.log(`Demo user ${DEMO_USER.email} already exists.`);
} else {
  // Better Auth creates the user so the password is hashed the normal way.
  await auth.api.signUpEmail({body: DEMO_USER});
  console.log(`Created demo user ${DEMO_USER.email} / ${DEMO_USER.password}`);
}

await db.$client.end();
