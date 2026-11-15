#!/usr/bin/env node
// A stand-in for `codex exec --json`: the JSONL events Codex prints.
let prompt = '';
process.stdin.on('data', (chunk) => (prompt += chunk));
process.stdin.on('end', () => {
  const say = (line) => console.log(JSON.stringify(line));
  say({type: 'thread.started', thread_id: 'x'});
  say({
    type: 'item.started',
    item: {
      id: 'c1',
      type: 'command_execution',
      command: 'ls',
      status: 'in_progress',
    },
  });
  say({
    type: 'item.completed',
    item: {
      id: 'c1',
      type: 'command_execution',
      command: 'ls',
      aggregated_output: 'notes.md\n',
      exit_code: 0,
      status: 'completed',
    },
  });
  say({
    type: 'item.completed',
    item: {
      id: 'm1',
      type: 'agent_message',
      text: `Plan first: ${prompt.startsWith('Only describe') ? 'yes' : 'no'}. Args: ${process.argv.slice(2).join(' ')}`,
    },
  });
  say({type: 'turn.completed', usage: {}});
});
