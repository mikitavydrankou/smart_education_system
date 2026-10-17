export const sourceText = 'Fotosynteza zachodzi w chloroplastach. Rośliny wykorzystują energię światła do wytwarzania związków organicznych.\n\nChlorofil pochłania światło. Zielony barwnik znajduje się w błonach tylakoidów chloroplastów.\n\nDwutlenek węgla i woda są substratami fotosyntezy. Podczas tego procesu powstaje tlen.'

export const courseFixture = {
  title: 'Jak rośliny wykorzystują światło?',
  introduction: 'Poznaj podstawy fotosyntezy na podstawie przesłanego materiału.',
  concepts: [
    ['chloroplasty', 'Chloroplasty', 'Fotosynteza zachodzi w chloroplastach.', 'b1'],
    ['chlorofil', 'Chlorofil', 'Chlorofil pochłania światło.', 'b2'],
    ['substraty', 'Substraty', 'Dwutlenek węgla i woda są substratami fotosyntezy.', 'b3'],
  ].map(([id, title, quote, blockId]) => ({
    id, title, explanation: `${quote} To główna informacja z tego fragmentu materiału.`,
    simple: quote, example: `Przeczytaj stwierdzenie „${quote}” i wskaż opisany w nim element.`,
    steps: ['Przeczytaj fragment źródłowy.', `Znajdź informację: ${quote}`, 'Wyjaśnij ją własnymi słowami.'],
    evidence: [{ blockId, quote }],
    question: { prompt: `Które stwierdzenie dotyczy pojęcia „${title}”?`, options: [quote, 'Źródło nie opisuje tego pojęcia.', 'To proces niezwiązany ze światłem.'], answer: 0, reason: quote },
    retry: { prompt: `W notatkach zapisano „${quote}”. Który temat należy z nimi połączyć?`, options: ['Brak związku z materiałem.', title, 'Inny proces.'], answer: 1, reason: quote },
  })),
}

export const richCourseFixture = {
  ...courseFixture, mediaVersion: 2 as const,
  concepts: courseFixture.concepts.map((c, i) => ({ ...c, media: {
    diagram: { title: `Jak działa: ${c.title}`, nodes: [
      { id: 'light', label: 'Światło', detail: 'Światło dostarcza energię do procesu.', evidenceIndex: 0 },
      { id: 'plant', label: c.title, detail: c.simple, evidenceIndex: 0 },
      { id: 'products', label: 'Związki organiczne', detail: 'Roślina wytwarza związki organiczne.', evidenceIndex: 0 },
    ], edges: [{ from: 'light', to: 'plant', label: 'dostarcza energię', evidenceIndex: 0 }, { from: 'plant', to: 'products', label: 'umożliwia wytwarzanie', evidenceIndex: 0 }] },
    narration: `${c.title}. ${c.explanation} ${c.example} Podsumujmy: ${c.simple}`,
    activity: i === 0 ? {
      kind: 'order' as const, prompt: 'Ułóż etapy wykorzystania światła w roślinie.',
      items: [{ id: 'light', label: 'Dostarczenie światła', explanation: 'Światło dostarcza energię.' }, { id: 'absorb', label: 'Pochłonięcie światła przez chlorofil', explanation: 'Chlorofil pochłania światło.' }, { id: 'produce', label: 'Wytworzenie związków organicznych', explanation: 'Roślina wykorzystuje energię.' }],
      targets: [], solution: ['light', 'absorb', 'produce'], reason: 'Najpierw potrzebne jest światło, a jego energia umożliwia wytwarzanie związków organicznych.',
    } : i === 1 ? {
      kind: 'match' as const, prompt: 'Połącz elementy z ich rolą w fotosyntezie.',
      items: [{ id: 'chlorofil', label: 'Chlorofil', explanation: 'Pochłania światło.' }, { id: 'chloroplast', label: 'Chloroplast', explanation: 'Miejsce fotosyntezy.' }, { id: 'light', label: 'Światło', explanation: 'Dostarcza energię.' }],
      targets: [{ id: 'energy', label: 'Źródło energii' }, { id: 'place', label: 'Miejsce fotosyntezy' }, { id: 'pigment', label: 'Barwnik pochłaniający światło' }], solution: ['pigment', 'place', 'energy'], reason: 'Każdy z tych elementów pełni inną rolę opisaną w źródle.',
    } : {
      kind: 'classify' as const, prompt: 'Przyporządkuj substancje do substratów lub produktów.',
      items: [{ id: 'water', label: 'Woda', explanation: 'Jest substratem.' }, { id: 'oxygen', label: 'Tlen', explanation: 'Powstaje w procesie.' }, { id: 'co2', label: 'Dwutlenek węgla', explanation: 'Jest substratem.' }],
      targets: [{ id: 'input', label: 'Substraty' }, { id: 'output', label: 'Produkty' }], solution: ['input', 'output', 'input'], reason: 'Woda i dwutlenek węgla są substratami, a tlen jest produktem.',
    },
  } })),
}
