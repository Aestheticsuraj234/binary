/** "Ada Lovelace" → "AL". Used for user and agent avatars. */
export function initialsOf(name: string): string {
  return name
    .split(' ')
    .map((part) => part.charAt(0))
    .join('')
    .slice(0, 2)
    .toUpperCase();
}
