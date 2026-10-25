import type { PracticeActivity, Question, Style } from './types';

type DemoBlock = { id: string; type: 'text' | 'heading' | 'list' | 'practice'; text: string; activity?: PracticeActivity };
type DemoVariant = { id: string; styles: Style[]; blocks: DemoBlock[] };
type DemoLesson = { title: string; position: number; published: boolean; threshold: number; content: DemoVariant[]; questions: Question[] };

export const DEMO_COURSE: { title: string; description: string; published: boolean; lessons: DemoLesson[] } = {
  title: 'Jak działa Internet? — kurs demonstracyjny',
  description: 'Trzy krótkie lekcje: adresy i DNS, podróż żądania oraz bezpieczne korzystanie z sieci. Każda ma trzy wersje materiału i test.',
  published: true,
  lessons: [
    {
      title: 'Adresy IP i DNS', position: 1, published: true, threshold: 70,
      content: [
        { id: 'dns-visual', styles: ['visual'], blocks: [
          { id: 'dns-v-heading', type: 'heading', text: 'Od nazwy do adresu' },
          { id: 'dns-v-map', type: 'list', text: 'Nazwa domeny (np. example.com) → DNS → adres IP serwera.\nDNS kojarzy nazwę domeny z adresem IP.\nAdres IP wskazuje adres urządzenia w sieci.\nDomena to czytelna nazwa; IP to adres używany w komunikacji.' },
          { id: 'dns-v-text', type: 'text', text: 'Schemat jest uproszczony: przeglądarka może już znać adres z pamięci podręcznej. DNS nie tworzy strony ani nie szyfruje połączenia.' },
        ] },
        { id: 'dns-auditory', styles: ['auditory'], blocks: [
          { id: 'dns-a-heading', type: 'heading', text: 'Scenariusz do czytania na głos — książka adresowa Internetu' },
          { id: 'dns-a-story', type: 'text', text: 'Wyobraź sobie, że szukasz biblioteki. Pamiętasz jej nazwę, ale potrzebujesz adresu. W Internecie nazwa domeny, taka jak example.com, jest nazwą biblioteki. Adres IP jest adresem urządzenia w sieci. DNS kojarzy nazwę domeny z adresem IP. Powiedz: nazwa, DNS, adres IP. Zrób przerwę i wyjaśnij tę drogę własnymi słowami.' },
          { id: 'dns-a-summary', type: 'text', text: 'DNS odpowiada na pytanie o adres. Nie tworzy treści strony i nie szyfruje połączenia. Jeśli adres jest w pamięci podręcznej, ponowne pytanie do DNS może nie być potrzebne.' },
        ] },
        { id: 'dns-kinesthetic', styles: ['kinesthetic'], blocks: [
          { id: 'dns-k-intro', type: 'text', text: 'Napisz na trzech kartkach: domena, DNS, adres IP. Ułóż je jako drogę od czytelnej nazwy do adresu urządzenia. DNS kojarzy nazwę domeny z IP; nie tworzy strony i nie szyfruje połączenia.' },
          { id: 'dns-k-task', type: 'practice', text: 'Sprawdź kolejność kartek. Następnie wskaż kartkę z adresem urządzenia, czyli IP, i wyjaśnij komuś rolę DNS.', activity: { type: 'ordering', options: ['Adres IP', 'Nazwa domeny', 'DNS'], answer: ['Nazwa domeny', 'DNS', 'Adres IP'] } },
        ] },
      ],
      questions: [
        { id: 'dns-single', type: 'single', prompt: 'Jaką rolę pełni DNS?', options: ['Kojarzy nazwę domeny z adresem IP', 'Tworzy treść strony', 'Szyfruje każde połączenie'], answer: 0 },
        { id: 'dns-matching', type: 'matching', prompt: 'Połącz pojęcia z opisami.', options: ['Domena|Czytelna nazwa', 'Adres IP|Adres urządzenia w sieci'], answer: { Domena: 'Czytelna nazwa', 'Adres IP': 'Adres urządzenia w sieci' } },
      ],
    },
    {
      title: 'Przeglądarka i serwer — podróż żądania', position: 2, published: true, threshold: 70,
      content: [
        { id: 'request-visual', styles: ['visual'], blocks: [
          { id: 'request-v-heading', type: 'heading', text: 'Żądanie → odpowiedź → widok' },
          { id: 'request-v-map', type: 'list', text: '1. Przeglądarka wysyła żądanie do serwera.\n2. Serwer odsyła odpowiedź, np. dokument HTML.\n3. Przeglądarka interpretuje odpowiedź i wyświetla stronę.\nPrzeglądarka jest klientem, a serwer odpowiada na żądania.' },
          { id: 'request-v-text', type: 'text', text: 'Przyjmujemy, że adres serwera jest już znany. Strona może wymagać wielu dodatkowych żądań, np. po obrazy. Przeglądarka i serwer nie są tym samym programem.' },
        ] },
        { id: 'request-auditory', styles: ['auditory'], blocks: [
          { id: 'request-a-heading', type: 'heading', text: 'Scenariusz do czytania na głos — rozmowa klienta z serwerem' },
          { id: 'request-a-story', type: 'text', text: 'Znasz już adres serwera. Wyobraź sobie rozmowę: przeglądarka mówi „poproszę stronę”. To żądanie. Serwer mówi „oto dokument HTML”. To odpowiedź. Przeglądarka interpretuje dokument i wyświetla stronę. Powtórz rytmicznie: żądanie, odpowiedź, wyświetlenie. Przeglądarka jest klientem, a serwer odpowiada na jego prośby.' },
          { id: 'request-a-summary', type: 'text', text: 'Przeglądarka i serwer mają różne zadania i nie są tym samym programem. Obrazy czy style mogą wymagać kolejnych żądań. Zatrzymaj się i opowiedz całą drogę bez zaglądania do tekstu.' },
        ] },
        { id: 'request-kinesthetic', styles: ['kinesthetic'], blocks: [
          { id: 'request-k-intro', type: 'text', text: 'Odegraj z drugą osobą przeglądarkę (klienta) i serwer. Klient przekazuje kartkę „żądanie strony”. Serwer zwraca „odpowiedź: HTML”. Klient na jej podstawie rysuje widok strony. To dwa różne zadania, nie ten sam program.' },
          { id: 'request-k-task', type: 'practice', text: 'Ułóż kroki scenki. Powtórz ją, dodając osobne żądanie o obraz. Która osoba wyświetla stronę?', activity: { type: 'ordering', options: ['Wyświetlenie strony', 'Żądanie przeglądarki', 'Odpowiedź serwera'], answer: ['Żądanie przeglądarki', 'Odpowiedź serwera', 'Wyświetlenie strony'] } },
        ] },
      ],
      questions: [
        { id: 'request-ordering', type: 'ordering', prompt: 'Adres serwera jest znany. Uporządkuj kroki otwierania strony.', options: ['Wyświetlenie strony', 'Odpowiedź serwera', 'Żądanie przeglądarki'], answer: ['Żądanie przeglądarki', 'Odpowiedź serwera', 'Wyświetlenie strony'] },
        { id: 'request-boolean', type: 'boolean', prompt: 'Przeglądarka i serwer to ten sam program o identycznym zadaniu.', options: ['Prawda', 'Fałsz'], answer: false },
      ],
    },
    {
      title: 'Bezpieczne korzystanie z sieci', position: 3, published: true, threshold: 70,
      content: [
        { id: 'safety-visual', styles: ['visual'], blocks: [
          { id: 'safety-v-heading', type: 'heading', text: 'Sprawdź → pomyśl → zdecyduj' },
          { id: 'safety-v-checklist', type: 'list', text: 'Sprawdź dokładną domenę przed logowaniem.\nNie podawaj hasła po podejrzanym linku z wiadomości.\nHTTPS szyfruje połączenie, ale nie gwarantuje uczciwości strony.\nWłącz uwierzytelnianie dwuskładnikowe (2FA).\nPhishing to podszywanie się pod zaufanego nadawcę lub stronę, aby wyłudzić dane.' },
        ] },
        { id: 'safety-auditory', styles: ['auditory'], blocks: [
          { id: 'safety-a-heading', type: 'heading', text: 'Scenariusz do czytania na głos — pilna wiadomość' },
          { id: 'safety-a-story', type: 'text', text: 'Słyszysz: „Pilnie zaloguj się przez ten link, inaczej stracisz konto”. Zatrzymaj się. Podszywanie się pod zaufanego nadawcę lub stronę w celu wyłudzenia danych to phishing. Nie podawaj hasła po podejrzanym linku. Sprawdź dokładną domenę i wejdź na znaną stronę samodzielnie.' },
          { id: 'safety-a-summary', type: 'text', text: 'Zapamiętaj: HTTPS szyfruje połączenie, lecz nie gwarantuje uczciwości strony. Dodatkową ochroną konta jest uwierzytelnianie dwuskładnikowe, czyli 2FA. Powiedz na głos trzy działania: sprawdzam domenę, odrzucam podejrzany link, włączam 2FA.' },
        ] },
        { id: 'safety-kinesthetic', styles: ['kinesthetic'], blocks: [
          { id: 'safety-k-intro', type: 'text', text: 'Na kartce zasymuluj wiadomość „Pilne! Podaj hasło pod szkolaa.example”. Porównaj ją ze znaną domeną szkola.example i zaznacz dodatkową literę. Nie otwieraj podejrzanych linków ani nie wpisuj prawdziwych danych. Takie podszywanie w celu wyłudzenia danych to phishing. HTTPS szyfruje połączenie, ale nie potwierdza uczciwości strony. Włączanie 2FA pomaga chronić konto.' },
          { id: 'safety-k-task', type: 'practice', text: 'Wybierz bezpieczną reakcję na przygotowaną wiadomość. Następnie zapisz własną listę kontroli: domena, podejrzany link, 2FA.', activity: { type: 'single', options: ['Wchodzę samodzielnie na znaną stronę i sprawdzam wiadomość', 'Podaję hasło, bo wiadomość jest pilna', 'Ufam każdej stronie z HTTPS'], answer: 0 } },
        ] },
      ],
      questions: [
        { id: 'safety-multiple', type: 'multiple', prompt: 'Wybierz wszystkie działania zwiększające bezpieczeństwo.', options: ['Sprawdzanie dokładnej domeny przed logowaniem', 'Podawanie hasła po każdym pilnym linku', 'Włączenie 2FA', 'Uznawanie każdej strony HTTPS za uczciwą'], answer: [0, 2] },
        { id: 'safety-short', type: 'short', prompt: 'Jak nazywa się podszywanie pod zaufanego nadawcę lub stronę, aby wyłudzić dane? Podaj nazwę z lekcji.', options: [], answer: ['phishing'] },
      ],
    },
  ],
};
