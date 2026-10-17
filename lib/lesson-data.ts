export type ConceptId = 'dns' | 'ip' | 'server'
export type Concept = {
  id: ConceptId; title: string; shortTitle: string
  explanation: string; simple: string; example: string; steps: string
}
export type QuestionContent = { prompt: string; options: string[]; answer: number; reason: string }
export type Question = QuestionContent & { id: string; concept: ConceptId; retry: QuestionContent }

export const concepts: Concept[] = [
  {
    id: 'dns', title: 'DNS — od nazwy do adresu', shortTitle: 'DNS',
    explanation: 'DNS to system, który pozwala odnaleźć adresy IP na podstawie nazw domen, takich jak example.com. Przeglądarka może skorzystać z zapamiętanego wyniku; nie każde żądanie wymaga nowego zapytania DNS.',
    simple: 'DNS działa jak książka adresowa: znasz nazwę domeny, a system pomaga znaleźć jej adres IP. Nie pobiera ani nie wyświetla strony.',
    example: 'Wpisujesz biblioteka.example. Jeśli adresu nie ma w pamięci podręcznej, mechanizm rozwiązywania nazw odpytuje DNS. Po uzyskaniu adresu IP przeglądarka może nawiązać połączenie z serwerem.',
    steps: '1. Przeglądarka potrzebuje adresu dla nazwy domeny. 2. Sprawdzana jest pamięć podręczna. 3. Gdy brak aktualnego wpisu, następuje rozwiązanie nazwy przez DNS. 4. Uzyskany adres IP służy do połączenia z serwerem.',
  },
  {
    id: 'ip', title: 'IP — adres w sieci', shortTitle: 'Adresy IP',
    explanation: 'Adres IP identyfikuje interfejs urządzenia w sieci i pomaga kierować pakiety do celu. W tej lekcji wskazuje miejsce, do którego przeglądarka nawiązuje połączenie. Sam adres nie określa jeszcze usługi — istotne są też protokół i port.',
    simple: 'Adres IP to adres sieciowy potrzebny do dostarczenia danych. Nie jest hasłem ani nazwą przeglądarki. Jedna witryna może korzystać z wielu adresów, a wiele witryn z jednego adresu.',
    example: 'W dokumentacji można użyć przykładowego adresu IPv4 192.0.2.10 albo IPv6 2001:db8::10. To adresy z zakresów przeznaczonych do przykładów, a nie adresy działającej tu witryny.',
    steps: '1. Przeglądarka uzyskuje adres IP. 2. Nawiązuje połączenie do właściwej usługi. 3. Routery przekazują pakiety zgodnie z adresem docelowym. 4. Odpowiedź wraca do urządzenia użytkownika.',
  },
  {
    id: 'server', title: 'Serwer i przeglądarka — dwie role', shortTitle: 'Serwer',
    explanation: 'Przeglądarka wysyła żądania HTTP lub HTTPS, a serwer je obsługuje i zwraca odpowiedzi: pliki, wygenerowane dane albo informację o błędzie. Przeglądarka przetwarza HTML, CSS i JavaScript oraz wyświetla stronę.',
    simple: 'Przeglądarka prosi o zasoby i pokazuje wynik. Serwer odbiera żądania i odpowiada. DNS pomaga odnaleźć adres serwera, ale nie zastępuje go w obsłudze strony.',
    example: 'Otwierasz stronę uczelni. Serwer zwraca dokument HTML, a przeglądarka odczytuje go i może poprosić o kolejne zasoby, na przykład zdjęcie. Serwer może też wygenerować aktualny plan zajęć.',
    steps: '1. Przeglądarka wysyła żądanie przez połączenie sieciowe. 2. Serwer odczytuje zasób lub generuje dane. 3. Odsyła odpowiedź HTTP. 4. Przeglądarka przetwarza odpowiedź i wyświetla wynik.',
  },
]

export const knowledgeQuestions: Question[] = [
  { id: 'k-dns', concept: 'dns', prompt: 'Jaką rolę pełni DNS?', options: ['Wyświetla dokument HTML', 'Pomaga ustalić adres IP dla nazwy domeny', 'Szyfruje wszystkie dane strony'], answer: 1, reason: 'DNS służy do rozwiązywania nazw domen na adresy IP.', retry: { prompt: 'Znasz nazwę domeny, ale potrzebujesz jej adresu sieciowego. Co pomoże?', options: ['DNS', 'Arkusz CSS', 'Historia pobrań'], answer: 0, reason: 'DNS pozwala wyszukać adres IP dla domeny.' } },
  { id: 'k-ip', concept: 'ip', prompt: 'Do czego służy adres IP?', options: ['Przechowuje hasło do sieci', 'Określa wygląd strony', 'Pomaga skierować pakiety do celu w sieci'], answer: 2, reason: 'Adres IP jest używany przy adresowaniu i kierowaniu pakietów.', retry: { prompt: 'Czego potrzebuje sieć do kierowania pakietów do serwera?', options: ['Koloru strony', 'Docelowego adresu IP', 'Nazwy zakładki'], answer: 1, reason: 'Adres docelowy wskazuje, gdzie mają trafić pakiety.' } },
  { id: 'k-server', concept: 'server', prompt: 'Które zdanie poprawnie opisuje przeglądarkę i serwer?', options: ['Przeglądarka wysyła żądania, a serwer na nie odpowiada', 'Serwer wyświetla stronę na ekranie użytkownika', 'Przeglądarka i DNS pełnią identyczną funkcję'], answer: 0, reason: 'Serwer obsługuje żądania, a przeglądarka przetwarza odpowiedzi i wyświetla stronę.', retry: { prompt: 'Kto przetwarza otrzymany HTML na widok strony?', options: ['DNS', 'Przeglądarka', 'Adres IP'], answer: 1, reason: 'Przeglądarka interpretuje dokument i wyświetla stronę.' } },
]

export const practiceQuestions: Question[] = [
  { id: 'p-dns', concept: 'dns', prompt: 'Wpisujesz adres uczelnia.example. Nie ma go w pamięci podręcznej. Po co potrzebne jest DNS?', options: ['Aby pobrać całą stronę HTML', 'Aby ustalić adres IP dla tej domeny', 'Aby wybrać kolor strony'], answer: 1, reason: 'DNS dostarcza adres IP dla nazwy domeny. Zasoby strony pobiera następnie przeglądarka z serwera.', retry: { prompt: 'Aplikacja zna nazwę api.example, lecz nie jej adres IP. Który mechanizm rozwiązuje ten problem?', options: ['Wyświetlenie HTML', 'Zmiana hasła', 'Rozwiązanie nazwy przez DNS'], answer: 2, reason: 'Rozwiązanie nazwy przez DNS pozwala uzyskać adres IP. Nie jest pobieraniem zasobów aplikacji.' } },
  { id: 'p-ip', concept: 'ip', prompt: 'Router przekazuje pakiet do serwera. Która informacja pomaga wybrać trasę do celu?', options: ['Docelowy adres IP', 'Tytuł strony', 'Hasło użytkownika'], answer: 0, reason: 'Routery wykorzystują docelowy adres IP przy kierowaniu pakietów przez sieć.', retry: { prompt: 'Serwer ma adres 192.0.2.10 w przykładzie dokumentacyjnym. Co oznacza ten zapis?', options: ['Hasło dostępu do witryny', 'Adres sieciowy w formacie IPv4', 'Nazwę przeglądarki'], answer: 1, reason: 'To przykład adresu IPv4, czyli adresu używanego do komunikacji w sieci, a nie hasła.' } },
  { id: 'p-server', concept: 'server', prompt: 'Przeglądarka wysyła żądanie pobrania zdjęcia. Jaką rolę pełni serwer?', options: ['Zmienia domenę na adres IP', 'Wyświetla zdjęcie na ekranie użytkownika', 'Obsługuje żądanie i zwraca plik lub odpowiedź o błędzie'], answer: 2, reason: 'Serwer odpowiada na żądania zasobów. Przeglądarka przetwarza odpowiedź i wyświetla zdjęcie.', retry: { prompt: 'Strona pyta o aktualny plan zajęć. Kto może odczytać dane i przygotować odpowiedź HTTP?', options: ['Serwer aplikacji', 'Sam adres IP', 'DNS odpowiedzialny za nazwy'], answer: 0, reason: 'Serwer aplikacji może wygenerować odpowiedź z danymi. DNS rozwiązuje nazwy, a adres IP wskazuje cel komunikacji.' } },
  { id: 'p-cache', concept: 'dns', prompt: 'Przeglądarka ma aktualny adres domeny w pamięci podręcznej. Czy musi wysłać nowe zapytanie DNS przed każdym żądaniem?', options: ['Tak, zawsze', 'Nie, może użyć zapamiętanego adresu', 'Nie, bo adres IP nie jest już potrzebny'], answer: 1, reason: 'Aktualny wpis w pamięci podręcznej pozwala ponownie użyć adresu IP bez nowego zapytania DNS.', retry: { prompt: 'Dwie kolejne prośby dotyczą tej samej domeny, a wpis DNS jest nadal ważny. Dlaczego druga może pominąć nowe rozwiązywanie nazwy?', options: ['Serwer zastępuje wtedy DNS', 'Pakiety nie korzystają wtedy z adresów', 'Wynik rozwiązania nazwy jest już zapamiętany'], answer: 2, reason: 'Pamięć podręczna przechowuje wynik DNS przez określony czas. Adres IP jest nadal używany.' } },
  { id: 'p-browser', concept: 'server', prompt: 'Serwer zwrócił HTML i CSS. Co robi z nimi przeglądarka?', options: ['Przetwarza je i wyświetla stronę', 'Zamienia je na rekordy DNS', 'Używa ich jako adresu IP'], answer: 0, reason: 'Przeglądarka interpretuje dokument HTML i style CSS, aby wyświetlić stronę.', retry: { prompt: 'Odpowiedź HTTP dotarła do urządzenia użytkownika. Kto odpowiada za pokazanie treści strony w oknie?', options: ['System DNS', 'Przeglądarka', 'Router na trasie'], answer: 1, reason: 'Przeglądarka działa po stronie użytkownika i przedstawia otrzymane treści. Serwer przygotowuje odpowiedź.' } },
]
