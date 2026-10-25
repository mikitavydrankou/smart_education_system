import type { Style } from './types.ts'

const options = (visual: string, auditory: string, kinesthetic: string): { text: string; style: Style }[] => [
  { text: visual, style: 'visual' },
  { text: auditory, style: 'auditory' },
  { text: kinesthetic, style: 'kinesthetic' },
]

export const educationPlannerQuestionnaire = {
  sourceUrl: 'https://www.educationplanner.org/students/self-assessments/learning-styles',
  version: 'educationplanner-user-provided-pl-v1',
  approved: true,
  questions: [
    {
      id: 'ep-01', sourceIndex: 0,
      prompt: 'Jaką książkę najchętniej przeczytasz dla przyjemności?',
      options: options('Książkę z dużą liczbą ilustracji', 'Książkę z dużą ilością tekstu', 'Książkę z wykreślankami lub krzyżówkami'),
    },
    {
      id: 'ep-02', sourceIndex: 1,
      prompt: 'Co najczęściej robisz, gdy nie masz pewności, jak zapisać jakieś słowo?',
      options: options('Zapisuję je, żeby sprawdzić, czy wygląda poprawnie', 'Literuję je na głos, żeby sprawdzić, czy brzmi poprawnie', 'Kreślę litery palcem w powietrzu'),
    },
    {
      id: 'ep-03', sourceIndex: 2,
      prompt: 'Kupujesz ubrania i czekasz w kolejce do kasy. Co najprawdopodobniej robisz podczas czekania?',
      options: options('Oglądam inne ubrania na wieszakach', 'Rozmawiam z osobą stojącą obok mnie w kolejce', 'Wiercę się lub przestępuję z nogi na nogę'),
    },
    {
      id: 'ep-04', sourceIndex: 3,
      prompt: 'Co robisz najpierw, gdy widzisz słowo „kot”?',
      options: options('Wyobrażam sobie kota', 'Wypowiadam w myślach słowo „kot”', 'Myślę o kontakcie z kotem — głaskaniu go lub słuchaniu jego mruczenia'),
    },
    {
      id: 'ep-05', sourceIndex: 4,
      prompt: 'Jaki sposób przygotowania do sprawdzianu najbardziej Ci odpowiada?',
      options: options('Czytam podręcznik lub notatki oraz przeglądam ilustracje i wykresy', 'Ktoś zadaje mi pytania, na które odpowiadam na głos', 'Przygotowuję fiszki, które mogę potem przeglądać'),
    },
    {
      id: 'ep-06', sourceIndex: 5,
      prompt: 'Jak najlepiej uczysz się, jak coś działa, na przykład komputer lub gra wideo?',
      options: options('Proszę kogoś, żeby mi to pokazał', 'Czytam o tym lub słucham czyjegoś wyjaśnienia', 'Samodzielnie próbuję zrozumieć, jak to działa'),
    },
    {
      id: 'ep-07', sourceIndex: 6,
      prompt: 'Co najprawdopodobniej zapamiętasz następnego dnia po szkolnej zabawie tanecznej?',
      options: options('Twarze osób, które tam były', 'Muzykę, która była grana', 'Wykonywane przeze mnie kroki taneczne i jedzenie, którego próbowałem lub próbowałam'),
    },
    {
      id: 'ep-08', sourceIndex: 7,
      prompt: 'Co najbardziej Cię rozprasza, gdy próbujesz się uczyć?',
      options: options('Przechodzący obok ludzie', 'Głośne dźwięki', 'Niewygodne krzesło'),
    },
    {
      id: 'ep-09', sourceIndex: 8,
      prompt: 'Co najczęściej robisz, kiedy się złościsz?',
      options: options('Pokazuję złość wyrazem twarzy', 'Podnoszę głos i krzyczę', 'Trzaskam drzwiami'),
    },
    {
      id: 'ep-10', sourceIndex: 9,
      prompt: 'Co najczęściej robisz, kiedy się cieszysz?',
      options: options('Uśmiecham się od ucha do ucha', 'Mówię bez przerwy', 'Rozpiera mnie energia i trudno mi usiedzieć w miejscu'),
    },
    {
      id: 'ep-11', sourceIndex: 10,
      prompt: 'Jak odnajdujesz drogę w nowym miejscu?',
      options: options('Szukam mapy lub planu pokazującego, gdzie co się znajduje', 'Pytam kogoś o drogę', 'Zaczynam chodzić po okolicy, aż znajdę to, czego szukam'),
    },
    {
      id: 'ep-12', sourceIndex: 11,
      prompt: 'Które z tych trzech zajęć lubisz najbardziej?',
      options: options('Zajęcia plastyczne', 'Zajęcia muzyczne', 'Wychowanie fizyczne'),
    },
    {
      id: 'ep-13', sourceIndex: 12,
      prompt: 'Co najczęściej robisz, gdy słyszysz piosenkę w radiu?',
      options: options('Wyobrażam sobie jej teledysk', 'Śpiewam lub nucę razem z muzyką', 'Zaczynam tańczyć lub wystukiwać rytm stopą'),
    },
    {
      id: 'ep-14', sourceIndex: 13,
      prompt: 'Co najbardziej rozprasza Cię podczas zajęć?',
      options: options('Zbyt jasne lub zbyt słabe oświetlenie', 'Dźwięki z korytarza lub spoza budynku, na przykład ruch uliczny albo koszenie trawy', 'Zbyt wysoka lub zbyt niska temperatura'),
    },
    {
      id: 'ep-15', sourceIndex: 14,
      prompt: 'Co lubisz robić, żeby się odprężyć?',
      options: options('Czytać', 'Słuchać muzyki', 'Ruszam się: spaceruję, biegam lub uprawiam sport'),
    },
    {
      id: 'ep-16', sourceIndex: 15,
      prompt: 'Jaki sposób najlepiej pomaga Ci zapamiętać numer telefonu znajomej osoby?',
      options: options('Wyobrażam sobie cyfry na telefonie tak, jak podczas wybierania numeru', 'Wielokrotnie powtarzam numer na głos', 'Zapisuję go lub dodaję do kontaktów w telefonie'),
    },
    {
      id: 'ep-17', sourceIndex: 16,
      prompt: 'Jeśli wygrasz w grze, którą z tych trzech nagród wybierzesz?',
      options: options('Plakat na ścianę', 'Kartę podarunkową do serwisu muzycznego', 'Jakąś grę lub piłkę, na przykład do futbolu amerykańskiego albo piłki nożnej'),
    },
    {
      id: 'ep-18', sourceIndex: 17,
      prompt: 'Dokąd najchętniej wybierzesz się z grupą znajomych?',
      options: options('Do kina', 'Na koncert', 'Do parku rozrywki'),
    },
    {
      id: 'ep-19', sourceIndex: 18,
      prompt: 'Co najczęściej zapamiętujesz o nowo poznanych osobach?',
      options: options('Ich twarz, ale nie imię', 'Ich imię, ale nie twarz', 'To, o czym rozmawialiśmy'),
    },
    {
      id: 'ep-20', sourceIndex: 19,
      prompt: 'Jak najczęściej wyjaśniasz komuś drogę do swojego domu?',
      options: options('Opisuję budynki i charakterystyczne miejsca mijane po drodze', 'Podaję nazwy dróg lub ulic, którymi trzeba się poruszać', 'Mówię: „Chodź za mną — łatwiej będzie, jeśli po prostu pokażę Ci drogę”'),
    },
  ],
}
