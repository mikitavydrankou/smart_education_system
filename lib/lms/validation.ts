import { validPracticeActivity } from './practice.ts';

const styles = ['visual', 'auditory', 'kinesthetic'];
const blockTypes = ['text', 'heading', 'list', 'image', 'audio', 'practice', 'pdf'];
const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const nonempty = (value: unknown): value is string => typeof value === 'string' && !!value.trim();

export function validateLesson(value: unknown, publish: boolean): string[] {
  if (!record(value)) return ['Nieprawidłowa lekcja.'];
  const errors: string[] = [];
  if (!nonempty(value.title)) errors.push('Podaj tytuł lekcji.');
  if (!Number.isInteger(value.position) || Number(value.position) < 1) errors.push('Kolejność musi być dodatnią liczbą całkowitą.');
  if (typeof value.threshold !== 'number' || !Number.isFinite(value.threshold) || value.threshold < 1 || value.threshold > 100) errors.push('Próg zaliczenia musi wynosić od 1 do 100.');
  if (!Array.isArray(value.content) || !Array.isArray(value.questions)) return [...errors, 'Nieprawidłowa treść lub test.'];
  if (publish && !value.content.length) errors.push('Dodaj co najmniej jedną wersję treści.');
  if (publish && !value.questions.length) errors.push('Dodaj co najmniej jedno zadanie.');
  const assigned = new Set<string>();
  const identifiers = new Set<string>();
  const checkId = (item: Record<string, unknown>) => {
    if (!nonempty(item.id) || identifiers.has(item.id)) errors.push('Elementy muszą mieć unikalne identyfikatory.');
    else identifiers.add(item.id);
  };
  for (const variant of value.content) {
    if (!record(variant) || !Array.isArray(variant.styles) || !Array.isArray(variant.blocks)) { errors.push('Nieprawidłowa wersja lekcji.'); continue; }
    checkId(variant);
    if (publish && !variant.styles.length) errors.push('Przypisz styl do każdej wersji.');
    for (const style of variant.styles) {
      if (!styles.includes(style) || assigned.has(style)) errors.push('Każdy styl może należeć tylko do jednej wersji.');
      assigned.add(style);
    }
    if (publish && !variant.blocks.length) errors.push('Każda wersja wymaga treści.');
    for (const block of variant.blocks) {
      if (!record(block) || !blockTypes.includes(String(block.type))) { errors.push('Nieprawidłowy blok.'); continue; }
      checkId(block);
      if (!publish) continue;
      if (block.type === 'practice' && block.activity !== undefined && !validPracticeActivity(block.activity)) errors.push('Uzupełnij opcje i poprawną odpowiedź ćwiczenia interaktywnego.');
      if (['image', 'audio', 'pdf'].includes(String(block.type))) {
        if (!nonempty(block.url) || !/^(https:\/\/|\/api\/lms\/files\?path=)/.test(block.url)) errors.push('Dodaj bezpieczny plik do bloku.');
        if (block.type === 'audio' && !nonempty(block.transcript)) errors.push('Nagranie wymaga transkrypcji.');
      } else if (!nonempty(block.text)) errors.push('Uzupełnij treść bloku.');
    }
  }
  for (const question of value.questions) {
    if (!record(question)) { errors.push('Nieprawidłowe zadanie.'); continue; }
    checkId(question);
    if (!['single', 'multiple', 'boolean', 'short', 'matching', 'ordering'].includes(String(question.type))) { errors.push('Nieznany rodzaj zadania.'); continue; }
    if (!publish) continue;
    if (!nonempty(question.prompt)) errors.push('Uzupełnij pytanie.');
    const options = Array.isArray(question.options) ? question.options : [];
    const indexValid = (index: unknown) => typeof index === 'number' && Number.isInteger(index) && index >= 0 && index < options.length;
    let valid = true;
    if (question.type !== 'short' && (options.length < 2 || !options.every(nonempty) || new Set(options).size !== options.length)) valid = false;
    if (question.type === 'single') valid = valid && indexValid(question.answer);
    if (question.type === 'boolean') valid = valid && typeof question.answer === 'boolean' && options.length === 2;
    if (question.type === 'multiple') valid = valid && Array.isArray(question.answer) && question.answer.length > 0 && question.answer.every(indexValid) && new Set(question.answer).size === question.answer.length;
    if (question.type === 'short') valid = Array.isArray(question.answer) && question.answer.length > 0 && question.answer.every(nonempty);
    if (question.type === 'ordering') valid = valid && Array.isArray(question.answer) && question.answer.length === options.length && new Set(question.answer).size === options.length && question.answer.every(answer => options.includes(answer));
    if (question.type === 'matching') {
      const pairs = options.map(option => String(option).split('|'));
      const answer = question.answer;
      valid = valid && record(answer) && pairs.every(pair => pair.length === 2 && pair.every(nonempty) && answer[pair[0]] === pair[1]) && new Set(pairs.map(pair => pair[0])).size === pairs.length && new Set(pairs.map(pair => pair[1])).size === pairs.length;
    }
    if (!valid) errors.push('Uzupełnij poprawne odpowiedzi i opcje zadania.');
  }
  return errors;
}
