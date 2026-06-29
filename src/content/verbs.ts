import type { VerbEntry } from '../types';

export const verbs: VerbEntry[] = [
  // ── Auxiliaries ─────────────────────────────────────────────────────────────
  {
    id: 'essere',
    infinitive: 'essere',
    gloss: 'ser/estar',
    class: 'essere',
    tenses: {
      presente: { io: 'sono', tu: 'sei', lui: 'è', noi: 'siamo', voi: 'siete', loro: 'sono' },
    },
    unit: 1,
    examWeight: 3,
  },
  {
    id: 'avere',
    infinitive: 'avere',
    gloss: 'tener',
    class: 'avere',
    tenses: {
      presente: { io: 'ho', tu: 'hai', lui: 'ha', noi: 'abbiamo', voi: 'avete', loro: 'hanno' },
    },
    unit: 1,
    examWeight: 3,
  },

  // ── Irregulars ───────────────────────────────────────────────────────────────
  {
    id: 'andare',
    infinitive: 'andare',
    gloss: 'ir',
    class: 'irregular',
    tenses: {
      presente: { io: 'vado', tu: 'vai', lui: 'va', noi: 'andiamo', voi: 'andate', loro: 'vanno' },
    },
    unit: 2,
    examWeight: 3,
  },
  {
    id: 'venire',
    infinitive: 'venire',
    gloss: 'venir',
    class: 'irregular',
    tenses: {
      presente: { io: 'vengo', tu: 'vieni', lui: 'viene', noi: 'veniamo', voi: 'venite', loro: 'vengono' },
    },
    unit: 2,
    examWeight: 3,
  },
  {
    id: 'fare',
    infinitive: 'fare',
    gloss: 'hacer',
    class: 'irregular',
    tenses: {
      presente: { io: 'faccio', tu: 'fai', lui: 'fa', noi: 'facciamo', voi: 'fate', loro: 'fanno' },
    },
    unit: 2,
    examWeight: 3,
  },
  {
    id: 'dare',
    infinitive: 'dare',
    gloss: 'dar',
    class: 'irregular',
    tenses: {
      presente: { io: 'do', tu: 'dai', lui: 'dà', noi: 'diamo', voi: 'date', loro: 'danno' },
    },
    unit: 2,
    examWeight: 2,
  },
  {
    id: 'sapere',
    infinitive: 'sapere',
    gloss: 'saber',
    class: 'irregular',
    tenses: {
      presente: { io: 'so', tu: 'sai', lui: 'sa', noi: 'sappiamo', voi: 'sapete', loro: 'sanno' },
    },
    unit: 2,
    examWeight: 2,
  },
  {
    id: 'stare',
    infinitive: 'stare',
    gloss: 'estar',
    class: 'irregular',
    tenses: {
      presente: { io: 'sto', tu: 'stai', lui: 'sta', noi: 'stiamo', voi: 'state', loro: 'stanno' },
    },
    unit: 2,
    examWeight: 2,
  },
  {
    id: 'uscire',
    infinitive: 'uscire',
    gloss: 'salir',
    class: 'irregular',
    tenses: {
      presente: { io: 'esco', tu: 'esci', lui: 'esce', noi: 'usciamo', voi: 'uscite', loro: 'escono' },
    },
    unit: 2,
    examWeight: 2,
  },

  // ── Modals ───────────────────────────────────────────────────────────────────
  {
    id: 'potere',
    infinitive: 'potere',
    gloss: 'poder',
    class: 'modal',
    modal: true,
    tenses: {
      presente: { io: 'posso', tu: 'puoi', lui: 'può', noi: 'possiamo', voi: 'potete', loro: 'possono' },
    },
    unit: 2,
    examWeight: 3,
  },
  {
    id: 'volere',
    infinitive: 'volere',
    gloss: 'querer',
    class: 'modal',
    modal: true,
    tenses: {
      presente: { io: 'voglio', tu: 'vuoi', lui: 'vuole', noi: 'vogliamo', voi: 'volete', loro: 'vogliono' },
    },
    unit: 2,
    examWeight: 3,
  },
  {
    id: 'dovere',
    infinitive: 'dovere',
    gloss: 'deber / tener que',
    class: 'modal',
    modal: true,
    tenses: {
      presente: { io: 'devo', tu: 'devi', lui: 'deve', noi: 'dobbiamo', voi: 'dovete', loro: 'devono' },
    },
    unit: 2,
    examWeight: 3,
  },

  // ── -isc verbs ───────────────────────────────────────────────────────────────
  {
    id: 'finire',
    infinitive: 'finire',
    gloss: 'terminar',
    class: 'ire-isc',
    tenses: {
      presente: { io: 'finisco', tu: 'finisci', lui: 'finisce', noi: 'finiamo', voi: 'finite', loro: 'finiscono' },
    },
    unit: 1,
    examWeight: 3,
  },
  {
    id: 'capire',
    infinitive: 'capire',
    gloss: 'entender',
    class: 'ire-isc',
    tenses: {
      presente: { io: 'capisco', tu: 'capisci', lui: 'capisce', noi: 'capiamo', voi: 'capite', loro: 'capiscono' },
    },
    unit: 1,
    examWeight: 2,
  },
  {
    id: 'preferire',
    infinitive: 'preferire',
    gloss: 'preferir',
    class: 'ire-isc',
    tenses: {
      presente: { io: 'preferisco', tu: 'preferisci', lui: 'preferisce', noi: 'preferiamo', voi: 'preferite', loro: 'preferiscono' },
    },
    unit: 1,
    examWeight: 2,
  },
  {
    id: 'pulire',
    infinitive: 'pulire',
    gloss: 'limpiar',
    class: 'ire-isc',
    tenses: {
      presente: { io: 'pulisco', tu: 'pulisci', lui: 'pulisce', noi: 'puliamo', voi: 'pulite', loro: 'puliscono' },
    },
    unit: 1,
    examWeight: 2,
  },
  {
    id: 'spedire',
    infinitive: 'spedire',
    gloss: 'enviar',
    class: 'ire-isc',
    tenses: {
      presente: { io: 'spedisco', tu: 'spedisci', lui: 'spedisce', noi: 'spediamo', voi: 'spedite', loro: 'spediscono' },
    },
    unit: 1,
    examWeight: 2,
  },
  {
    id: 'costruire',
    infinitive: 'costruire',
    gloss: 'construir',
    class: 'ire-isc',
    tenses: {
      presente: { io: 'costruisco', tu: 'costruisci', lui: 'costruisce', noi: 'costruiamo', voi: 'costruite', loro: 'costruiscono' },
    },
    unit: 1,
    examWeight: 2,
  },

  // ── Spelling-special -are verbs ──────────────────────────────────────────────
  {
    id: 'giocare',
    infinitive: 'giocare',
    gloss: 'jugar',
    class: 'are',
    tenses: {
      presente: { io: 'gioco', tu: 'giochi', lui: 'gioca', noi: 'giochiamo', voi: 'giocate', loro: 'giocano' },
    },
    unit: 1,
    examWeight: 3,
    tags: ['spelling'],
  },
  {
    id: 'pagare',
    infinitive: 'pagare',
    gloss: 'pagar',
    class: 'are',
    tenses: {
      presente: { io: 'pago', tu: 'paghi', lui: 'paga', noi: 'paghiamo', voi: 'pagate', loro: 'pagano' },
    },
    unit: 1,
    examWeight: 3,
    tags: ['spelling'],
  },
  {
    id: 'cercare',
    infinitive: 'cercare',
    gloss: 'buscar',
    class: 'are',
    tenses: {
      presente: { io: 'cerco', tu: 'cerchi', lui: 'cerca', noi: 'cerchiamo', voi: 'cercate', loro: 'cercano' },
    },
    unit: 1,
    tags: ['spelling'],
  },
  {
    id: 'mangiare',
    infinitive: 'mangiare',
    gloss: 'comer',
    class: 'are',
    tenses: {
      presente: { io: 'mangio', tu: 'mangi', lui: 'mangia', noi: 'mangiamo', voi: 'mangiate', loro: 'mangiano' },
    },
    unit: 1,
    tags: ['spelling'],
  },
  {
    id: 'studiare',
    infinitive: 'studiare',
    gloss: 'estudiar',
    class: 'are',
    tenses: {
      presente: { io: 'studio', tu: 'studi', lui: 'studia', noi: 'studiamo', voi: 'studiate', loro: 'studiano' },
    },
    unit: 1,
    tags: ['spelling'],
  },

  // ── Clean regular -are verbs ─────────────────────────────────────────────────
  {
    id: 'parlare',
    infinitive: 'parlare',
    gloss: 'hablar',
    class: 'are',
    tenses: {
      presente: { io: 'parlo', tu: 'parli', lui: 'parla', noi: 'parliamo', voi: 'parlate', loro: 'parlano' },
    },
    unit: 1,
  },
  {
    id: 'abitare',
    infinitive: 'abitare',
    gloss: 'vivir/habitar',
    class: 'are',
    tenses: {
      presente: { io: 'abito', tu: 'abiti', lui: 'abita', noi: 'abitiamo', voi: 'abitate', loro: 'abitano' },
    },
    unit: 1,
  },
  {
    id: 'lavorare',
    infinitive: 'lavorare',
    gloss: 'trabajar',
    class: 'are',
    tenses: {
      presente: { io: 'lavoro', tu: 'lavori', lui: 'lavora', noi: 'lavoriamo', voi: 'lavorate', loro: 'lavorano' },
    },
    unit: 1,
  },
  {
    id: 'comprare',
    infinitive: 'comprare',
    gloss: 'comprar',
    class: 'are',
    tenses: {
      presente: { io: 'compro', tu: 'compri', lui: 'compra', noi: 'compriamo', voi: 'comprate', loro: 'comprano' },
    },
    unit: 1,
  },
  {
    id: 'guardare',
    infinitive: 'guardare',
    gloss: 'mirar/ver',
    class: 'are',
    tenses: {
      presente: { io: 'guardo', tu: 'guardi', lui: 'guarda', noi: 'guardiamo', voi: 'guardate', loro: 'guardano' },
    },
    unit: 1,
  },
  {
    id: 'aspettare',
    infinitive: 'aspettare',
    gloss: 'esperar',
    class: 'are',
    tenses: {
      presente: { io: 'aspetto', tu: 'aspetti', lui: 'aspetta', noi: 'aspettiamo', voi: 'aspettate', loro: 'aspettano' },
    },
    unit: 1,
  },
  {
    id: 'cantare',
    infinitive: 'cantare',
    gloss: 'cantar',
    class: 'are',
    tenses: {
      presente: { io: 'canto', tu: 'canti', lui: 'canta', noi: 'cantiamo', voi: 'cantate', loro: 'cantano' },
    },
    unit: 1,
  },

  // ── Clean regular -ere verbs ─────────────────────────────────────────────────
  {
    id: 'prendere',
    infinitive: 'prendere',
    gloss: 'tomar/agarrar',
    class: 'ere',
    tenses: {
      presente: { io: 'prendo', tu: 'prendi', lui: 'prende', noi: 'prendiamo', voi: 'prendete', loro: 'prendono' },
    },
    unit: 1,
  },
  {
    id: 'leggere',
    infinitive: 'leggere',
    gloss: 'leer',
    class: 'ere',
    tenses: {
      presente: { io: 'leggo', tu: 'leggi', lui: 'legge', noi: 'leggiamo', voi: 'leggete', loro: 'leggono' },
    },
    unit: 1,
  },
  {
    id: 'scrivere',
    infinitive: 'scrivere',
    gloss: 'escribir',
    class: 'ere',
    tenses: {
      presente: { io: 'scrivo', tu: 'scrivi', lui: 'scrive', noi: 'scriviamo', voi: 'scrivete', loro: 'scrivono' },
    },
    unit: 1,
  },
  {
    id: 'vedere',
    infinitive: 'vedere',
    gloss: 'ver',
    class: 'ere',
    tenses: {
      presente: { io: 'vedo', tu: 'vedi', lui: 'vede', noi: 'vediamo', voi: 'vedete', loro: 'vedono' },
    },
    unit: 1,
  },
  {
    id: 'chiudere',
    infinitive: 'chiudere',
    gloss: 'cerrar',
    class: 'ere',
    tenses: {
      presente: { io: 'chiudo', tu: 'chiudi', lui: 'chiude', noi: 'chiudiamo', voi: 'chiudete', loro: 'chiudono' },
    },
    unit: 1,
  },
  {
    id: 'mettere',
    infinitive: 'mettere',
    gloss: 'poner',
    class: 'ere',
    tenses: {
      presente: { io: 'metto', tu: 'metti', lui: 'mette', noi: 'mettiamo', voi: 'mettete', loro: 'mettono' },
    },
    unit: 1,
  },

  // ── Clean regular -ire (non-isc) verbs ──────────────────────────────────────
  {
    id: 'dormire',
    infinitive: 'dormire',
    gloss: 'dormir',
    class: 'ire',
    tenses: {
      presente: { io: 'dormo', tu: 'dormi', lui: 'dorme', noi: 'dormiamo', voi: 'dormite', loro: 'dormono' },
    },
    unit: 1,
  },
  {
    id: 'aprire',
    infinitive: 'aprire',
    gloss: 'abrir',
    class: 'ire',
    tenses: {
      presente: { io: 'apro', tu: 'apri', lui: 'apre', noi: 'apriamo', voi: 'aprite', loro: 'aprono' },
    },
    unit: 1,
  },
  {
    id: 'partire',
    infinitive: 'partire',
    gloss: 'partir/salir',
    class: 'ire',
    tenses: {
      presente: { io: 'parto', tu: 'parti', lui: 'parte', noi: 'partiamo', voi: 'partite', loro: 'partono' },
    },
    unit: 1,
  },
  {
    id: 'sentire',
    infinitive: 'sentire',
    gloss: 'oír/sentir',
    class: 'ire',
    tenses: {
      presente: { io: 'sento', tu: 'senti', lui: 'sente', noi: 'sentiamo', voi: 'sentite', loro: 'sentono' },
    },
    unit: 1,
  },
  {
    id: 'offrire',
    infinitive: 'offrire',
    gloss: 'ofrecer',
    class: 'ire',
    tenses: {
      presente: { io: 'offro', tu: 'offri', lui: 'offre', noi: 'offriamo', voi: 'offrite', loro: 'offrono' },
    },
    unit: 1,
  },

  // ── Más irregulares de alta frecuencia (brief §3) ────────────────────────────
  {
    id: 'dire',
    infinitive: 'dire',
    gloss: 'decir',
    class: 'irregular',
    tenses: {
      presente: { io: 'dico', tu: 'dici', lui: 'dice', noi: 'diciamo', voi: 'dite', loro: 'dicono' },
    },
    unit: 2,
    examWeight: 3,
  },
  {
    id: 'bere',
    infinitive: 'bere',
    gloss: 'beber/tomar',
    class: 'irregular',
    tenses: {
      presente: { io: 'bevo', tu: 'bevi', lui: 'beve', noi: 'beviamo', voi: 'bevete', loro: 'bevono' },
    },
    unit: 2,
    examWeight: 3,
  },
  // Familia -go/-gono (io/loro): aprende una, las demás siguen el patrón.
  {
    id: 'scegliere',
    infinitive: 'scegliere',
    gloss: 'elegir/escoger',
    class: 'irregular',
    tenses: {
      presente: { io: 'scelgo', tu: 'scegli', lui: 'sceglie', noi: 'scegliamo', voi: 'scegliete', loro: 'scelgono' },
    },
    unit: 2,
    examWeight: 2,
  },
  {
    id: 'tenere',
    infinitive: 'tenere',
    gloss: 'tener/sostener',
    class: 'irregular',
    tenses: {
      presente: { io: 'tengo', tu: 'tieni', lui: 'tiene', noi: 'teniamo', voi: 'tenete', loro: 'tengono' },
    },
    unit: 2,
    examWeight: 2,
  },
  {
    id: 'rimanere',
    infinitive: 'rimanere',
    gloss: 'quedarse/permanecer',
    class: 'irregular',
    tenses: {
      presente: { io: 'rimango', tu: 'rimani', lui: 'rimane', noi: 'rimaniamo', voi: 'rimanete', loro: 'rimangono' },
    },
    unit: 2,
    examWeight: 2,
  },
  {
    id: 'salire',
    infinitive: 'salire',
    gloss: 'subir',
    class: 'irregular',
    tenses: {
      presente: { io: 'salgo', tu: 'sali', lui: 'sale', noi: 'saliamo', voi: 'salite', loro: 'salgono' },
    },
    unit: 2,
    examWeight: 2,
  },
  {
    id: 'sedere',
    infinitive: 'sedere',
    gloss: 'sentarse',
    class: 'irregular',
    tenses: {
      presente: { io: 'siedo', tu: 'siedi', lui: 'siede', noi: 'sediamo', voi: 'sedete', loro: 'siedono' },
    },
    unit: 2,
    examWeight: 2,
  },
  {
    id: 'spegnere',
    infinitive: 'spegnere',
    gloss: 'apagar',
    class: 'irregular',
    tenses: {
      presente: { io: 'spengo', tu: 'spegni', lui: 'spegne', noi: 'spegniamo', voi: 'spegnete', loro: 'spengono' },
    },
    unit: 2,
    examWeight: 2,
  },
  // Familia tradurre (produrre, ridurre) y porre (proporre, esporre).
  {
    id: 'tradurre',
    infinitive: 'tradurre',
    gloss: 'traducir',
    class: 'irregular',
    tenses: {
      presente: { io: 'traduco', tu: 'traduci', lui: 'traduce', noi: 'traduciamo', voi: 'traducete', loro: 'traducono' },
    },
    unit: 2,
    examWeight: 2,
  },
  {
    id: 'trarre',
    infinitive: 'trarre',
    gloss: 'sacar/extraer',
    class: 'irregular',
    tenses: {
      presente: { io: 'traggo', tu: 'trai', lui: 'trae', noi: 'traiamo', voi: 'traete', loro: 'traggono' },
    },
    unit: 2,
    examWeight: 2,
  },
  {
    id: 'porre',
    infinitive: 'porre',
    gloss: 'poner/colocar',
    class: 'irregular',
    tenses: {
      presente: { io: 'pongo', tu: 'poni', lui: 'pone', noi: 'poniamo', voi: 'ponete', loro: 'pongono' },
    },
    unit: 2,
    examWeight: 2,
  },
  {
    id: 'morire',
    infinitive: 'morire',
    gloss: 'morir',
    class: 'irregular',
    tenses: {
      presente: { io: 'muoio', tu: 'muori', lui: 'muore', noi: 'moriamo', voi: 'morite', loro: 'muoiono' },
    },
    unit: 2,
    examWeight: 2,
  },
  {
    id: 'piacere',
    infinitive: 'piacere',
    gloss: 'gustar',
    class: 'irregular',
    tenses: {
      presente: { io: 'piaccio', tu: 'piaci', lui: 'piace', noi: 'piacciamo', voi: 'piacete', loro: 'piacciono' },
    },
    unit: 2,
    examWeight: 2,
  },

  // ── Más verbos ortográficos (brief §2) ───────────────────────────────────────
  {
    id: 'spiegare',
    infinitive: 'spiegare',
    gloss: 'explicar',
    class: 'are',
    tenses: {
      presente: { io: 'spiego', tu: 'spieghi', lui: 'spiega', noi: 'spieghiamo', voi: 'spiegate', loro: 'spiegano' },
    },
    unit: 1,
    examWeight: 2,
    tags: ['spelling'],
  },
  {
    id: 'cominciare',
    infinitive: 'cominciare',
    gloss: 'empezar/comenzar',
    class: 'are',
    tenses: {
      presente: { io: 'comincio', tu: 'cominci', lui: 'comincia', noi: 'cominciamo', voi: 'cominciate', loro: 'cominciano' },
    },
    unit: 1,
    examWeight: 2,
    tags: ['spelling'],
  },
];
