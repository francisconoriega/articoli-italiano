/**
 * engine/frames.ts — dynamic contextual sentences for verb-conjugation items.
 *
 * The idea (see the design note in chat): the mastery Item stays exactly as the
 * generator built it — same `id` (`verb:presente:fare:io`), same `answer` (`faccio`),
 * same `skills`. We only swap how it is *presented*: instead of the bare frame
 * "io ____", we drop the verb into a randomly-chosen natural sentence with a matching
 * Spanish gloss. Because the id/answer/skills are untouched, the SRS, mastery ladder,
 * and multiple-choice distractors keep working with zero changes — the variety is
 * "presentation only".
 *
 * Grammaticality is kept by construction, NOT by free combination:
 *   - complements belong to the VERB (giocare → "a calcio", pagare → "il conto"),
 *   - subjects are pre-formed and agree with the conjugation's person,
 *   - the Spanish gloss carries its own verb form (`{V}`) so the translation stays
 *     correct; negation ("non …" / "no {V} …") and questions ("…?" / "¿… {V} …?")
 *     are baked into the template, no engine support needed,
 *   - predicate agreement traps are avoided: after essere/stare we only use INVARIABLE
 *     complements ("di Roma", "bene", "a casa"), never subject-agreeing nouns/adjectives
 *     ("studente"/"studenti", "stanco"/"stanchi"), and questions that would force an
 *     agreeing predicate are restricted to single persons via `persons`.
 *
 * Scope: present tense, every verb in the catalog. ES-MX glosses (voi → "ustedes",
 * i.e. the 3rd-person-plural Spanish form, same as loro). Extending = editing the
 * tables below; nothing else changes.
 */
import type { Item, Person } from '../types'
import { PERSONS } from '../types'

/** A pre-formed subject phrase + its ES-MX rendering for the gloss. */
interface Subject {
  it: string
  es: string
}

/** One sentence skeleton: `{S}` = subject, `____` = the blank, `{V}` = ES verb form. */
interface Frame {
  it: string
  es: string
  /** Restrict a frame to certain persons (e.g. questions read best as tú/ustedes). */
  persons?: Person[]
}

interface VerbFrameSet {
  /** Spanish present-tense forms, ES-MX (voi → 3rd-plural "ustedes/ellos" form). */
  esVerb: Record<Person, string>
  frames: Frame[]
}

/**
 * Subject pools by person. io/tu/noi/voi keep their pronoun (exam style); the
 * 3rd persons vary across people so the same item reads fresh each draw. All subjects
 * are human everyday actors, so they fit any human-activity complement below.
 */
const SUBJECTS: Record<Person, Subject[]> = {
  io: [{ it: 'Io', es: 'Yo' }],
  tu: [{ it: 'Tu', es: 'Tú' }],
  noi: [{ it: 'Noi', es: 'Nosotros' }],
  voi: [{ it: 'Voi', es: 'Ustedes' }],
  lui: [
    { it: 'Marco', es: 'Marco' },
    { it: 'Lucia', es: 'Lucía' },
    { it: 'Mia sorella', es: 'Mi hermana' },
    { it: 'Il professore', es: 'El profesor' },
    { it: 'Anna', es: 'Anna' },
    { it: 'Mio fratello', es: 'Mi hermano' },
    { it: 'Paolo', es: 'Paolo' },
  ],
  loro: [
    { it: 'Marco e Lia', es: 'Marco y Lía' },
    { it: 'I ragazzi', es: 'Los muchachos' },
    { it: 'Le mie amiche', es: 'Mis amigas' },
    { it: 'I miei genitori', es: 'Mis papás' },
    { it: 'Anna e Paolo', es: 'Anna y Paolo' },
    { it: 'Gli studenti', es: 'Los estudiantes' },
  ],
}

/** Persons that read naturally as a question (2nd person). */
const ASK: Person[] = ['tu', 'voi']

/**
 * Per-verb frame sets. Each complement is chosen so the verb maps cleanly to its
 * Spanish gloss form. Every verb keeps at least two all-persons frames, so every
 * person always has a contextual sentence available.
 */
const VERB_FRAMES: Record<string, VerbFrameSet> = {
  // ── Auxiliaries (ser-only / tener-only contexts to dodge ser-vs-estar) ──────────
  essere: {
    esVerb: { io: 'soy', tu: 'eres', lui: 'es', noi: 'somos', voi: 'son', loro: 'son' },
    frames: [
      { it: '{S} ____ di Napoli.', es: '{S} {V} de Nápoles.' },
      { it: '{S} ____ di una piccola città.', es: '{S} {V} de una ciudad pequeña.' },
      { it: '{S} ____ di Roma?', es: '¿{S} {V} de Roma?', persons: ASK },
    ],
  },
  avere: {
    esVerb: { io: 'tengo', tu: 'tienes', lui: 'tiene', noi: 'tenemos', voi: 'tienen', loro: 'tienen' },
    frames: [
      { it: '{S} ____ un cane e un gatto.', es: '{S} {V} un perro y un gato.' },
      { it: '{S} ____ due fratelli.', es: '{S} {V} dos hermanos.' },
      { it: '{S} non ____ tempo oggi.', es: '{S} no {V} tiempo hoy.' },
      { it: '{S} ____ una macchina nuova?', es: '¿{S} {V} un coche nuevo?', persons: ASK },
    ],
  },

  // ── Irregulars ──────────────────────────────────────────────────────────────────
  andare: {
    esVerb: { io: 'voy', tu: 'vas', lui: 'va', noi: 'vamos', voi: 'van', loro: 'van' },
    frames: [
      { it: '{S} ____ a scuola in autobus.', es: '{S} {V} a la escuela en autobús.' },
      { it: '{S} ____ al cinema stasera.', es: '{S} {V} al cine esta noche.' },
      { it: '{S} ____ in vacanza ad agosto.', es: '{S} {V} de vacaciones en agosto.' },
      { it: '{S} ____ al mare questa estate?', es: '¿{S} {V} a la playa este verano?', persons: ASK },
    ],
  },
  venire: {
    esVerb: { io: 'vengo', tu: 'vienes', lui: 'viene', noi: 'venimos', voi: 'vienen', loro: 'vienen' },
    frames: [
      { it: '{S} ____ alla festa con noi.', es: '{S} {V} a la fiesta con nosotros.' },
      { it: '{S} ____ da una famiglia italiana.', es: '{S} {V} de una familia italiana.' },
      { it: '{S} ____ a casa mia stasera?', es: '¿{S} {V} a mi casa esta noche?', persons: ASK },
    ],
  },
  fare: {
    esVerb: { io: 'hago', tu: 'haces', lui: 'hace', noi: 'hacemos', voi: 'hacen', loro: 'hacen' },
    frames: [
      { it: '{S} ____ i compiti dopo cena.', es: '{S} {V} la tarea después de cenar.' },
      { it: '{S} ____ una domanda al professore.', es: '{S} {V} una pregunta al profesor.' },
      { it: '{S} ____ sport ogni settimana.', es: '{S} {V} deporte cada semana.' },
      { it: '{S} ____ la spesa il sabato.', es: '{S} {V} las compras el sábado.' },
    ],
  },
  dare: {
    esVerb: { io: 'doy', tu: 'das', lui: 'da', noi: 'damos', voi: 'dan', loro: 'dan' },
    frames: [
      { it: '{S} ____ un regalo a Maria.', es: '{S} {V} un regalo a María.' },
      { it: '{S} ____ il libro a Paolo.', es: '{S} {V} el libro a Paolo.' },
      { it: '{S} ____ una mano in cucina.', es: '{S} {V} una mano en la cocina.' },
    ],
  },
  sapere: {
    esVerb: { io: 'sé', tu: 'sabes', lui: 'sabe', noi: 'sabemos', voi: 'saben', loro: 'saben' },
    frames: [
      { it: '{S} ____ la verità.', es: '{S} {V} la verdad.' },
      { it: '{S} ____ parlare tre lingue.', es: '{S} {V} hablar tres idiomas.' },
      { it: '{S} non ____ la risposta.', es: '{S} no {V} la respuesta.' },
    ],
  },
  stare: {
    esVerb: { io: 'estoy', tu: 'estás', lui: 'está', noi: 'estamos', voi: 'están', loro: 'están' },
    frames: [
      { it: '{S} ____ a casa oggi.', es: '{S} {V} en casa hoy.' },
      { it: '{S} ____ con la famiglia il weekend.', es: '{S} {V} con la familia el fin de semana.' },
      { it: '{S} ____ bene?', es: '¿{S} {V} bien?', persons: ASK },
    ],
  },
  uscire: {
    esVerb: { io: 'salgo', tu: 'sales', lui: 'sale', noi: 'salimos', voi: 'salen', loro: 'salen' },
    frames: [
      { it: '{S} ____ con gli amici il venerdì.', es: '{S} {V} con los amigos los viernes.' },
      { it: '{S} ____ di casa alle otto.', es: '{S} {V} de casa a las ocho.' },
      { it: '{S} ____ stasera?', es: '¿{S} {V} esta noche?', persons: ASK },
    ],
  },

  // ── Modals (+ infinitive) ────────────────────────────────────────────────────────
  potere: {
    esVerb: { io: 'puedo', tu: 'puedes', lui: 'puede', noi: 'podemos', voi: 'pueden', loro: 'pueden' },
    frames: [
      { it: '{S} ____ venire alla riunione.', es: '{S} {V} venir a la reunión.' },
      { it: '{S} non ____ uscire stasera.', es: '{S} no {V} salir esta noche.' },
      { it: '{S} ____ aiutarmi un attimo?', es: '¿{S} {V} ayudarme un momento?', persons: ASK },
    ],
  },
  volere: {
    esVerb: { io: 'quiero', tu: 'quieres', lui: 'quiere', noi: 'queremos', voi: 'quieren', loro: 'quieren' },
    frames: [
      { it: '{S} ____ partire presto.', es: '{S} {V} salir temprano.' },
      { it: '{S} ____ imparare l’italiano.', es: '{S} {V} aprender italiano.' },
      { it: '{S} ____ un caffè?', es: '¿{S} {V} un café?', persons: ASK },
    ],
  },
  dovere: {
    esVerb: { io: 'debo', tu: 'debes', lui: 'debe', noi: 'debemos', voi: 'deben', loro: 'deben' },
    frames: [
      { it: '{S} ____ studiare per l’esame.', es: '{S} {V} estudiar para el examen.' },
      { it: '{S} ____ finire il lavoro oggi.', es: '{S} {V} terminar el trabajo hoy.' },
      { it: '{S} non ____ arrivare tardi.', es: '{S} no {V} llegar tarde.' },
    ],
  },

  // ── -isc verbs ───────────────────────────────────────────────────────────────────
  finire: {
    esVerb: { io: 'termino', tu: 'terminas', lui: 'termina', noi: 'terminamos', voi: 'terminan', loro: 'terminan' },
    frames: [
      { it: '{S} ____ i compiti prima di cena.', es: '{S} {V} la tarea antes de cenar.' },
      { it: '{S} ____ di lavorare alle sei.', es: '{S} {V} de trabajar a las seis.' },
      { it: '{S} ____ il libro stasera?', es: '¿{S} {V} el libro esta noche?', persons: ASK },
    ],
  },
  capire: {
    esVerb: { io: 'entiendo', tu: 'entiendes', lui: 'entiende', noi: 'entendemos', voi: 'entienden', loro: 'entienden' },
    frames: [
      { it: '{S} ____ bene l’italiano.', es: '{S} {V} bien el italiano.' },
      { it: '{S} non ____ la domanda.', es: '{S} no {V} la pregunta.' },
      { it: '{S} ____ tutto?', es: '¿{S} {V} todo?', persons: ASK },
    ],
  },
  preferire: {
    esVerb: { io: 'prefiero', tu: 'prefieres', lui: 'prefiere', noi: 'preferimos', voi: 'prefieren', loro: 'prefieren' },
    frames: [
      { it: '{S} ____ il tè al caffè.', es: '{S} {V} el té al café.' },
      { it: '{S} ____ studiare di sera.', es: '{S} {V} estudiar de noche.' },
      { it: '{S} ____ il mare o la montagna?', es: '¿{S} {V} el mar o la montaña?', persons: ASK },
    ],
  },
  pulire: {
    esVerb: { io: 'limpio', tu: 'limpias', lui: 'limpia', noi: 'limpiamos', voi: 'limpian', loro: 'limpian' },
    frames: [
      { it: '{S} ____ la cucina ogni giorno.', es: '{S} {V} la cocina todos los días.' },
      { it: '{S} ____ la casa il sabato.', es: '{S} {V} la casa el sábado.' },
      { it: '{S} non ____ mai la camera.', es: '{S} no {V} nunca el cuarto.' },
    ],
  },
  spedire: {
    esVerb: { io: 'envío', tu: 'envías', lui: 'envía', noi: 'enviamos', voi: 'envían', loro: 'envían' },
    frames: [
      { it: '{S} ____ una lettera a Roma.', es: '{S} {V} una carta a Roma.' },
      { it: '{S} ____ il pacco domani.', es: '{S} {V} el paquete mañana.' },
      { it: '{S} ____ una cartolina agli amici.', es: '{S} {V} una postal a los amigos.' },
    ],
  },
  costruire: {
    esVerb: { io: 'construyo', tu: 'construyes', lui: 'construye', noi: 'construimos', voi: 'construyen', loro: 'construyen' },
    frames: [
      { it: '{S} ____ una casa al mare.', es: '{S} {V} una casa en la playa.' },
      { it: '{S} ____ un modello di legno.', es: '{S} {V} un modelo de madera.' },
      { it: '{S} ____ ponti per lavoro.', es: '{S} {V} puentes de trabajo.' },
    ],
  },

  // ── Spelling-special -are verbs ──────────────────────────────────────────────────
  giocare: {
    esVerb: { io: 'juego', tu: 'juegas', lui: 'juega', noi: 'jugamos', voi: 'juegan', loro: 'juegan' },
    frames: [
      { it: '{S} ____ a calcio ogni sabato.', es: '{S} {V} fútbol cada sábado.' },
      { it: '{S} ____ a tennis con gli amici.', es: '{S} {V} tenis con los amigos.' },
      { it: '{S} ____ a carte la domenica.', es: '{S} {V} cartas el domingo.' },
    ],
  },
  pagare: {
    esVerb: { io: 'pago', tu: 'pagas', lui: 'paga', noi: 'pagamos', voi: 'pagan', loro: 'pagan' },
    frames: [
      { it: '{S} ____ il conto al ristorante.', es: '{S} {V} la cuenta en el restaurante.' },
      { it: '{S} ____ il caffè con la carta.', es: '{S} {V} el café con la tarjeta.' },
      { it: '{S} ____ l’affitto ogni mese.', es: '{S} {V} la renta cada mes.' },
    ],
  },
  cercare: {
    esVerb: { io: 'busco', tu: 'buscas', lui: 'busca', noi: 'buscamos', voi: 'buscan', loro: 'buscan' },
    frames: [
      { it: '{S} ____ un nuovo lavoro.', es: '{S} {V} un nuevo trabajo.' },
      { it: '{S} ____ le chiavi della macchina.', es: '{S} {V} las llaves del coche.' },
      { it: '{S} ____ casa in centro?', es: '¿{S} {V} casa en el centro?', persons: ASK },
    ],
  },
  mangiare: {
    esVerb: { io: 'como', tu: 'comes', lui: 'come', noi: 'comemos', voi: 'comen', loro: 'comen' },
    frames: [
      { it: '{S} ____ la pizza il venerdì.', es: '{S} {V} pizza los viernes.' },
      { it: '{S} ____ la frutta a colazione.', es: '{S} {V} fruta en el desayuno.' },
      { it: '{S} non ____ carne.', es: '{S} no {V} carne.' },
    ],
  },
  studiare: {
    esVerb: { io: 'estudio', tu: 'estudias', lui: 'estudia', noi: 'estudiamos', voi: 'estudian', loro: 'estudian' },
    frames: [
      { it: '{S} ____ l’italiano all’università.', es: '{S} {V} italiano en la universidad.' },
      { it: '{S} ____ in biblioteca la sera.', es: '{S} {V} en la biblioteca por la noche.' },
      { it: '{S} ____ per l’esame?', es: '¿{S} {V} para el examen?', persons: ASK },
    ],
  },

  // ── Regular -are verbs ───────────────────────────────────────────────────────────
  parlare: {
    esVerb: { io: 'hablo', tu: 'hablas', lui: 'habla', noi: 'hablamos', voi: 'hablan', loro: 'hablan' },
    frames: [
      { it: '{S} ____ italiano molto bene.', es: '{S} {V} italiano muy bien.' },
      { it: '{S} ____ con il professore.', es: '{S} {V} con el profesor.' },
      { it: '{S} ____ spagnolo?', es: '¿{S} {V} español?', persons: ASK },
    ],
  },
  abitare: {
    esVerb: { io: 'vivo', tu: 'vives', lui: 'vive', noi: 'vivimos', voi: 'viven', loro: 'viven' },
    frames: [
      { it: '{S} ____ a Roma da due anni.', es: '{S} {V} en Roma desde hace dos años.' },
      { it: '{S} ____ in centro città.', es: '{S} {V} en el centro de la ciudad.' },
      { it: '{S} ____ vicino alla stazione.', es: '{S} {V} cerca de la estación.' },
    ],
  },
  lavorare: {
    esVerb: { io: 'trabajo', tu: 'trabajas', lui: 'trabaja', noi: 'trabajamos', voi: 'trabajan', loro: 'trabajan' },
    frames: [
      { it: '{S} ____ in un ufficio.', es: '{S} {V} en una oficina.' },
      { it: '{S} ____ da casa il lunedì.', es: '{S} {V} desde casa los lunes.' },
      { it: '{S} non ____ la domenica.', es: '{S} no {V} los domingos.' },
    ],
  },
  comprare: {
    esVerb: { io: 'compro', tu: 'compras', lui: 'compra', noi: 'compramos', voi: 'compran', loro: 'compran' },
    frames: [
      { it: '{S} ____ il pane al mercato.', es: '{S} {V} pan en el mercado.' },
      { it: '{S} ____ un regalo per Anna.', es: '{S} {V} un regalo para Anna.' },
      { it: '{S} ____ una macchina nuova.', es: '{S} {V} un coche nuevo.' },
    ],
  },
  guardare: {
    esVerb: { io: 'veo', tu: 'ves', lui: 've', noi: 'vemos', voi: 'ven', loro: 'ven' },
    frames: [
      { it: '{S} ____ la TV la sera.', es: '{S} {V} la tele por la noche.' },
      { it: '{S} ____ un film stasera.', es: '{S} {V} una película esta noche.' },
      { it: '{S} ____ la partita allo stadio.', es: '{S} {V} el partido en el estadio.' },
    ],
  },
  aspettare: {
    esVerb: { io: 'espero', tu: 'esperas', lui: 'espera', noi: 'esperamos', voi: 'esperan', loro: 'esperan' },
    frames: [
      { it: '{S} ____ l’autobus alla fermata.', es: '{S} {V} el autobús en la parada.' },
      { it: '{S} ____ un amico al bar.', es: '{S} {V} a un amigo en el bar.' },
      { it: '{S} ____ una telefonata importante.', es: '{S} {V} una llamada importante.' },
    ],
  },
  cantare: {
    esVerb: { io: 'canto', tu: 'cantas', lui: 'canta', noi: 'cantamos', voi: 'cantan', loro: 'cantan' },
    frames: [
      { it: '{S} ____ una canzone italiana.', es: '{S} {V} una canción italiana.' },
      { it: '{S} ____ sotto la doccia.', es: '{S} {V} bajo la regadera.' },
      { it: '{S} ____ nel coro della scuola.', es: '{S} {V} en el coro de la escuela.' },
    ],
  },

  // ── Regular -ere verbs ───────────────────────────────────────────────────────────
  prendere: {
    esVerb: { io: 'tomo', tu: 'tomas', lui: 'toma', noi: 'tomamos', voi: 'toman', loro: 'toman' },
    frames: [
      { it: '{S} ____ un caffè al bar.', es: '{S} {V} un café en el bar.' },
      { it: '{S} ____ l’autobus per il lavoro.', es: '{S} {V} el autobús para el trabajo.' },
      { it: '{S} ____ un taxi stasera?', es: '¿{S} {V} un taxi esta noche?', persons: ASK },
    ],
  },
  leggere: {
    esVerb: { io: 'leo', tu: 'lees', lui: 'lee', noi: 'leemos', voi: 'leen', loro: 'leen' },
    frames: [
      { it: '{S} ____ il giornale ogni mattina.', es: '{S} {V} el periódico cada mañana.' },
      { it: '{S} ____ un romanzo interessante.', es: '{S} {V} una novela interesante.' },
      { it: '{S} non ____ molto.', es: '{S} no {V} mucho.' },
    ],
  },
  scrivere: {
    esVerb: { io: 'escribo', tu: 'escribes', lui: 'escribe', noi: 'escribimos', voi: 'escriben', loro: 'escriben' },
    frames: [
      { it: '{S} ____ una lettera alla nonna.', es: '{S} {V} una carta a la abuela.' },
      { it: '{S} ____ un’email al professore.', es: '{S} {V} un correo al profesor.' },
      { it: '{S} ____ nel diario ogni giorno.', es: '{S} {V} en el diario todos los días.' },
    ],
  },
  vedere: {
    esVerb: { io: 'veo', tu: 'ves', lui: 've', noi: 'vemos', voi: 'ven', loro: 'ven' },
    frames: [
      { it: '{S} ____ un film al cinema.', es: '{S} {V} una película en el cine.' },
      { it: '{S} ____ gli amici il weekend.', es: '{S} {V} a los amigos el fin de semana.' },
      { it: '{S} ____ la differenza?', es: '¿{S} {V} la diferencia?', persons: ASK },
    ],
  },
  chiudere: {
    esVerb: { io: 'cierro', tu: 'cierras', lui: 'cierra', noi: 'cerramos', voi: 'cierran', loro: 'cierran' },
    frames: [
      { it: '{S} ____ la porta a chiave.', es: '{S} {V} la puerta con llave.' },
      { it: '{S} ____ la finestra perché fa freddo.', es: '{S} {V} la ventana porque hace frío.' },
      { it: '{S} ____ il negozio alle otto.', es: '{S} {V} la tienda a las ocho.' },
    ],
  },
  mettere: {
    esVerb: { io: 'pongo', tu: 'pones', lui: 'pone', noi: 'ponemos', voi: 'ponen', loro: 'ponen' },
    frames: [
      { it: '{S} ____ il libro sul tavolo.', es: '{S} {V} el libro en la mesa.' },
      { it: '{S} ____ la macchina in garage.', es: '{S} {V} el coche en el garaje.' },
      { it: '{S} ____ lo zucchero nel caffè.', es: '{S} {V} azúcar en el café.' },
    ],
  },

  // ── Regular -ire (non-isc) verbs ─────────────────────────────────────────────────
  dormire: {
    esVerb: { io: 'duermo', tu: 'duermes', lui: 'duerme', noi: 'dormimos', voi: 'duermen', loro: 'duermen' },
    frames: [
      { it: '{S} ____ otto ore ogni notte.', es: '{S} {V} ocho horas cada noche.' },
      { it: '{S} ____ fino a tardi la domenica.', es: '{S} {V} hasta tarde el domingo.' },
      { it: '{S} non ____ bene quando fa caldo.', es: '{S} no {V} bien cuando hace calor.' },
    ],
  },
  aprire: {
    esVerb: { io: 'abro', tu: 'abres', lui: 'abre', noi: 'abrimos', voi: 'abren', loro: 'abren' },
    frames: [
      { it: '{S} ____ la finestra al mattino.', es: '{S} {V} la ventana en la mañana.' },
      { it: '{S} ____ il negozio alle nove.', es: '{S} {V} la tienda a las nueve.' },
      { it: '{S} ____ la porta agli ospiti.', es: '{S} {V} la puerta a los invitados.' },
    ],
  },
  partire: {
    esVerb: { io: 'salgo', tu: 'sales', lui: 'sale', noi: 'salimos', voi: 'salen', loro: 'salen' },
    frames: [
      { it: '{S} ____ per Roma domani.', es: '{S} {V} para Roma mañana.' },
      { it: '{S} ____ in treno alle sette.', es: '{S} {V} en tren a las siete.' },
      { it: '{S} ____ presto?', es: '¿{S} {V} temprano?', persons: ASK },
    ],
  },
  sentire: {
    esVerb: { io: 'escucho', tu: 'escuchas', lui: 'escucha', noi: 'escuchamos', voi: 'escuchan', loro: 'escuchan' },
    frames: [
      { it: '{S} ____ la musica in cuffia.', es: '{S} {V} música con audífonos.' },
      { it: '{S} ____ la radio in macchina.', es: '{S} {V} la radio en el coche.' },
      { it: '{S} non ____ bene da lontano.', es: '{S} no {V} bien de lejos.' },
    ],
  },
  offrire: {
    esVerb: { io: 'ofrezco', tu: 'ofreces', lui: 'ofrece', noi: 'ofrecemos', voi: 'ofrecen', loro: 'ofrecen' },
    frames: [
      { it: '{S} ____ il caffè agli amici.', es: '{S} {V} el café a los amigos.' },
      { it: '{S} ____ un aiuto ai vicini.', es: '{S} {V} ayuda a los vecinos.' },
      { it: '{S} ____ la cena stasera.', es: '{S} {V} la cena esta noche.' },
    ],
  },

  // ── Irregulars added with the A1–A2 lesson content ───────────────────────────────
  dire: {
    esVerb: { io: 'digo', tu: 'dices', lui: 'dice', noi: 'decimos', voi: 'dicen', loro: 'dicen' },
    frames: [
      { it: '{S} ____ sempre la verità.', es: '{S} {V} siempre la verdad.' },
      { it: '{S} ____ una bugia ogni tanto.', es: '{S} {V} una mentira de vez en cuando.' },
      { it: '{S} non ____ mai di no.', es: '{S} no {V} nunca que no.' },
    ],
  },
  bere: {
    esVerb: { io: 'bebo', tu: 'bebes', lui: 'bebe', noi: 'bebemos', voi: 'beben', loro: 'beben' },
    frames: [
      { it: '{S} ____ un caffè la mattina.', es: '{S} {V} un café en la mañana.' },
      { it: '{S} ____ molta acqua durante il giorno.', es: '{S} {V} mucha agua durante el día.' },
      { it: '{S} ____ una birra con gli amici?', es: '¿{S} {V} una cerveza con los amigos?', persons: ASK },
    ],
  },
  scegliere: {
    esVerb: { io: 'elijo', tu: 'eliges', lui: 'elige', noi: 'elegimos', voi: 'eligen', loro: 'eligen' },
    frames: [
      { it: '{S} ____ un film per stasera.', es: '{S} {V} una película para esta noche.' },
      { it: '{S} ____ sempre il piatto del giorno.', es: '{S} {V} siempre el platillo del día.' },
      { it: '{S} ____ un regalo per Anna.', es: '{S} {V} un regalo para Anna.' },
    ],
  },
  tenere: {
    esVerb: { io: 'tengo', tu: 'tienes', lui: 'tiene', noi: 'tenemos', voi: 'tienen', loro: 'tienen' },
    frames: [
      { it: '{S} ____ le chiavi in tasca.', es: '{S} {V} las llaves en el bolsillo.' },
      { it: '{S} ____ il cane in giardino.', es: '{S} {V} el perro en el jardín.' },
      { it: '{S} ____ molti libri in camera.', es: '{S} {V} muchos libros en el cuarto.' },
    ],
  },
  rimanere: {
    esVerb: { io: 'me quedo', tu: 'te quedas', lui: 'se queda', noi: 'nos quedamos', voi: 'se quedan', loro: 'se quedan' },
    frames: [
      { it: '{S} ____ a casa il weekend.', es: '{S} {V} en casa el fin de semana.' },
      { it: '{S} ____ in ufficio fino a tardi.', es: '{S} {V} en la oficina hasta tarde.' },
      { it: '{S} ____ a letto la domenica mattina.', es: '{S} {V} en la cama el domingo en la mañana.' },
    ],
  },
  salire: {
    esVerb: { io: 'subo', tu: 'subes', lui: 'sube', noi: 'subimos', voi: 'suben', loro: 'suben' },
    frames: [
      { it: '{S} ____ le scale di corsa.', es: '{S} {V} las escaleras corriendo.' },
      { it: '{S} ____ sull’autobus alla fermata.', es: '{S} {V} al autobús en la parada.' },
      { it: '{S} ____ in montagna la domenica.', es: '{S} {V} a la montaña el domingo.' },
    ],
  },
  sedere: {
    esVerb: { io: 'me siento', tu: 'te sientas', lui: 'se sienta', noi: 'nos sentamos', voi: 'se sientan', loro: 'se sientan' },
    frames: [
      { it: '{S} ____ in prima fila a lezione.', es: '{S} {V} en la primera fila en clase.' },
      { it: '{S} ____ al tavolo per cena.', es: '{S} {V} a la mesa para cenar.' },
      { it: '{S} ____ vicino alla finestra.', es: '{S} {V} cerca de la ventana.' },
    ],
  },
  spegnere: {
    esVerb: { io: 'apago', tu: 'apagas', lui: 'apaga', noi: 'apagamos', voi: 'apagan', loro: 'apagan' },
    frames: [
      { it: '{S} ____ la luce prima di dormire.', es: '{S} {V} la luz antes de dormir.' },
      { it: '{S} ____ la TV a mezzanotte.', es: '{S} {V} la tele a medianoche.' },
      { it: '{S} ____ il telefono durante la lezione.', es: '{S} {V} el teléfono durante la clase.' },
    ],
  },
  tradurre: {
    esVerb: { io: 'traduzco', tu: 'traduces', lui: 'traduce', noi: 'traducimos', voi: 'traducen', loro: 'traducen' },
    frames: [
      { it: '{S} ____ un testo dall’italiano.', es: '{S} {V} un texto del italiano.' },
      { it: '{S} ____ le frasi in spagnolo.', es: '{S} {V} las frases al español.' },
      { it: '{S} ____ una poesia difficile.', es: '{S} {V} un poema difícil.' },
    ],
  },
  trarre: {
    esVerb: { io: 'saco', tu: 'sacas', lui: 'saca', noi: 'sacamos', voi: 'sacan', loro: 'sacan' },
    frames: [
      { it: '{S} ____ vantaggio dalla situazione.', es: '{S} {V} provecho de la situación.' },
      { it: '{S} ____ le conclusioni dai dati.', es: '{S} {V} las conclusiones de los datos.' },
      { it: '{S} ____ ispirazione dalla natura.', es: '{S} {V} inspiración de la naturaleza.' },
    ],
  },
  porre: {
    esVerb: { io: 'pongo', tu: 'pones', lui: 'pone', noi: 'ponemos', voi: 'ponen', loro: 'ponen' },
    frames: [
      { it: '{S} ____ fine alla discussione.', es: '{S} {V} fin a la discusión.' },
      { it: '{S} ____ molta attenzione ai dettagli.', es: '{S} {V} mucha atención a los detalles.' },
      { it: '{S} ____ il libro sullo scaffale.', es: '{S} {V} el libro en el estante.' },
    ],
  },
  morire: {
    esVerb: { io: 'me muero', tu: 'te mueres', lui: 'se muere', noi: 'nos morimos', voi: 'se mueren', loro: 'se mueren' },
    frames: [
      { it: '{S} ____ di sonno a mezzanotte.', es: '{S} {V} de sueño a medianoche.' },
      { it: '{S} ____ di fame prima di cena.', es: '{S} {V} de hambre antes de cenar.' },
      { it: '{S} ____ di freddo in inverno.', es: '{S} {V} de frío en invierno.' },
    ],
  },
  // piacere → modelled as ES-MX "caer bien" (person-as-subject "gustar" reads stilted);
  // the "bien" is baked into the template, `esVerb` carries the caer-forms.
  piacere: {
    esVerb: { io: 'caigo', tu: 'caes', lui: 'cae', noi: 'caemos', voi: 'caen', loro: 'caen' },
    frames: [
      { it: '{S} ____ a tutti in classe.', es: '{S} {V} bien a todos en clase.' },
      { it: '{S} ____ molto ai bambini.', es: '{S} {V} muy bien a los niños.' },
      { it: '{S} ____ a Maria e a Luca.', es: '{S} {V} bien a María y a Luca.' },
    ],
  },

  // ── Spelling-special -are verbs added with the lessons ───────────────────────────
  spiegare: {
    esVerb: { io: 'explico', tu: 'explicas', lui: 'explica', noi: 'explicamos', voi: 'explican', loro: 'explican' },
    frames: [
      { it: '{S} ____ la lezione agli studenti.', es: '{S} {V} la lección a los estudiantes.' },
      { it: '{S} ____ la grammatica con esempi.', es: '{S} {V} la gramática con ejemplos.' },
      { it: '{S} ____ il problema al professore.', es: '{S} {V} el problema al profesor.' },
    ],
  },
  cominciare: {
    esVerb: { io: 'empiezo', tu: 'empiezas', lui: 'empieza', noi: 'empezamos', voi: 'empiezan', loro: 'empiezan' },
    frames: [
      { it: '{S} ____ a lavorare alle nove.', es: '{S} {V} a trabajar a las nueve.' },
      { it: '{S} ____ un nuovo corso d’italiano.', es: '{S} {V} un nuevo curso de italiano.' },
      { it: '{S} ____ la giornata con un caffè.', es: '{S} {V} el día con un café.' },
    ],
  },
}

/** Parse a generated present-tense verb item id → its infinitive + person, or null. */
function parseVerbItem(item: Item): { infinitive: string; person: Person } | null {
  if (item.kind !== 'verb-conjugation') return null
  const parts = item.id.split(':') // verb:presente:fare:io
  if (parts.length !== 4 || parts[0] !== 'verb' || parts[1] !== 'presente') return null
  const person = parts[3] as Person
  if (!PERSONS.includes(person)) return null
  return { infinitive: parts[2], person }
}

function pick<T>(arr: T[], random: () => number): T {
  return arr[Math.floor(random() * arr.length)]
}

/**
 * The contextual presentation for an item, or null when no frame applies (not a
 * present-tense verb, or a verb without authored frames). Pure: pass a seeded `random`
 * for deterministic tests.
 */
export function frameTextFor(
  item: Item,
  random: () => number = Math.random,
): { text: string; gloss: string } | null {
  const parsed = parseVerbItem(item)
  if (!parsed) return null
  const set = VERB_FRAMES[parsed.infinitive]
  if (!set) return null

  const applicable = set.frames.filter((f) => !f.persons || f.persons.includes(parsed.person))
  if (!applicable.length) return null

  const frame = pick(applicable, random)
  const subject = pick(SUBJECTS[parsed.person], random)
  const text = frame.it.replace('{S}', subject.it)
  const gloss = frame.es.replace('{S}', subject.es).replace('{V}', set.esVerb[parsed.person])
  return { text, gloss }
}

/**
 * Return a presentation-decorated COPY of the item (new `prompt.text` + `gloss`),
 * or the item unchanged when no frame applies. Never mutates the shared catalog item,
 * and never touches `id`/`answer`/`skills`/`topic` — so mastery, SRS, and the MC
 * distractors are unaffected.
 */
export function decorateItem(item: Item, random: () => number = Math.random): Item {
  const frame = frameTextFor(item, random)
  if (!frame) return item
  return { ...item, prompt: { ...item.prompt, text: frame.text }, gloss: frame.gloss }
}

/** Whether the catalog verb (by infinitive) has contextual frames. */
export function hasFrames(infinitive: string): boolean {
  return infinitive in VERB_FRAMES
}

/** All infinitives that have authored frames (for coverage checks / harnesses). */
export function framedVerbs(): string[] {
  return Object.keys(VERB_FRAMES)
}
