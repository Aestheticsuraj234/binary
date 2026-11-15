import {describe, expect, it} from 'vitest';

import {findMentions, roomInputSchema} from './rooms';

const NOVA = {id: '1', name: 'Nova'};
const ADA = {id: '2', name: 'Ada'};
const ADA_L = {id: '3', name: 'Ada Lovelace'};

describe('findMentions', () => {
  it('finds members in the order they are mentioned, once each', () => {
    expect(
      findMentions('@ada first, then @Nova, then @Ada again', [NOVA, ADA]),
    ).toEqual([ADA, NOVA]);
  });

  it('prefers the longest name, and ignores emails and partial words', () => {
    expect(findMentions('Ask @Ada Lovelace', [ADA, ADA_L])).toEqual([ADA_L]);
    expect(findMentions('mail nova@x.com or @Novak', [NOVA])).toEqual([]);
  });
});

describe('roomInputSchema', () => {
  const ids = [
    '8f9c1e2a-1111-4c3d-9a1b-000000000001',
    '8f9c1e2a-1111-4c3d-9a1b-000000000002',
  ];

  it('needs two or more characters, once each, and a lead among them', () => {
    expect(
      roomInputSchema.safeParse({
        name: 'Launch',
        memberIds: ids,
        routingMode: 'auto',
        leadAgentId: ids[0],
      }).success,
    ).toBe(true);
    expect(
      roomInputSchema.safeParse({
        name: 'Launch',
        memberIds: [ids[0]],
        routingMode: 'auto',
        leadAgentId: ids[0],
      }).error?.issues[0]?.message,
    ).toBe('Pick at least two characters.');
    expect(
      roomInputSchema.safeParse({
        name: 'Launch',
        memberIds: [ids[0], ids[0]],
        routingMode: 'auto',
        leadAgentId: ids[0],
      }).success,
    ).toBe(false);
    expect(
      roomInputSchema.safeParse({
        name: 'Launch',
        memberIds: ids,
        routingMode: 'mention',
        leadAgentId: '8f9c1e2a-1111-4c3d-9a1b-000000000009',
      }).error?.issues[0]?.message,
    ).toBe('The lead must be in the room.');
  });
});
