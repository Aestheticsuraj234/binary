#!/usr/bin/env node
// A stand-in for `claude -p --output-format stream-json`: reads the prompt
// on stdin, prints what Claude Code would, and echoes its arguments.
let prompt = '';
process.stdin.on('data', (chunk) => (prompt += chunk));
process.stdin.on('end', () => {
  const say = (line) => console.log(JSON.stringify(line));
  say({type: 'system', subtype: 'init'});
  if (prompt.includes('fail')) {
    say({
      type: 'result',
      is_error: true,
      result: 'Claude Code could not do that.',
    });
    process.exit(1);
  }
  say({
    type: 'assistant',
    message: {
      content: [
        {type: 'text', text: 'Let me look. '},
        {type: 'tool_use', id: 't1', name: 'Bash', input: {command: 'ls'}},
      ],
    },
  });
  say({
    type: 'user',
    message: {
      content: [{type: 'tool_result', tool_use_id: 't1', content: 'notes.md'}],
    },
  });
  say({
    type: 'assistant',
    message: {
      content: [
        {
          type: 'text',
          text: `Done in ${process.cwd()} with ${process.argv.slice(2).join(' ')}.`,
        },
      ],
    },
  });
  say({type: 'result', is_error: false, result: 'Done.'});
});
