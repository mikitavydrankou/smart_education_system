import type { Style } from './types.ts';

export function buildVariantGroups(styles: readonly Style[], assignments: Partial<Record<Style, number | undefined>>): { styles: Style[] }[] {
  if (!styles.length || new Set(styles).size !== styles.length) throw new Error('Wybierz co najmniej jeden niepowtarzający się styl.');
  const groups = new Map<number, { styles: Style[] }>();
  for (const style of styles) {
    const group = assignments[style];
    if (!['visual', 'auditory', 'kinesthetic'].includes(style) || !Number.isInteger(group) || !group || group < 1 || group > 3) throw new Error('Każdy styl musi należeć do wersji od 1 do 3.');
    if (!groups.has(group)) groups.set(group, { styles: [] });
    groups.get(group)!.styles.push(style);
  }
  return [...groups.values()];
}
