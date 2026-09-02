/** Pick the singular or plural noun a catalogue supplies for its lives. */
export function plural(n: number, noun: { one: string; many: string }): string {
  return n === 1 ? noun.one : noun.many;
}
