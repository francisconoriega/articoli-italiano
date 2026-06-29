import type { Person } from '../types';

/**
 * stress.ts — DISPLAY-ONLY stressed-vowel ("sílaba tónica") helper for the
 * present-tense cheat-sheet.
 *
 * This module is intentionally ISOLATED from the answer catalog and answer
 * validation: it only tells a renderer WHICH character of a conjugated form is
 * the stressed vowel, so the UI can underline it. It never produces, mutates,
 * or checks answers.
 *
 * The data is a hand-curated table (`STRESS_INDEX`) keyed by
 * `` `${infinitive}:${person}` `` whose value is the 0-based index of the
 * stressed-vowel CHARACTER inside that EXACT form string from content/verbs.ts.
 * Indices were counted by hand against each form and verified by
 * scripts/stress-harness.ts.
 */

export interface StressSplit {
  pre: string;
  vowel: string;
  post: string;
}

/** Vowels that may carry primary stress, including written-accent variants. */
const VOWELS = new Set([
  'a', 'e', 'i', 'o', 'u',
  'à', 'è', 'é', 'ì', 'î', 'ò', 'ó', 'ù',
]);

/**
 * 0-based index of the stressed-vowel character within each present-tense form,
 * keyed by `${infinitive}:${person}`. Hand-authored for all 41 verbs × 6 persons.
 *
 * Rules applied (see prompt):
 *  - noi (-iamo): stress the `a` of -iamo.
 *  - voi (-ate/-ete/-ite): stress that ending vowel (a/e/i) before "te".
 *  - io/tu/lui/loro: STEM-stressed; the -o/-i/-a/-e/-ano/-ono/-iscono ending is
 *    unstressed, so the stressed vowel is the stem vowel (for -isc- verbs the
 *    `i` of -isc-).
 *  - Monosyllables: the single/primary vowel (first vowel of a diphthong).
 *  - Written-accent forms (è, dà, può): the accented vowel itself.
 */
const STRESS_INDEX: Record<string, number> = {
  // ── essere ── io:'sono' tu:'sei' lui:'è' noi:'siamo' voi:'siete' loro:'sono'
  'essere:io': 1,   // s[o]no → s,o,n,o → first 'o' at index 1
  'essere:tu': 1,   // s[e]i
  'essere:lui': 0,  // [è]
  'essere:noi': 2,  // si[a]mo
  'essere:voi': 2,  // si[e]te → s,i,e,t,e → 'e' before "te" at index 2
  'essere:loro': 1, // s[o]no → first 'o' at index 1

  // ── avere ── io:'ho' tu:'hai' lui:'ha' noi:'abbiamo' voi:'avete' loro:'hanno'
  'avere:io': 1,    // h[o]
  'avere:tu': 1,    // h[a]i
  'avere:lui': 1,   // h[a]
  'avere:noi': 4,   // abbi[a]mo
  'avere:voi': 2,   // av[e]te
  'avere:loro': 1,  // h[a]nno

  // ── andare ── io:'vado' tu:'vai' lui:'va' noi:'andiamo' voi:'andate' loro:'vanno'
  'andare:io': 1,   // v[a]do
  'andare:tu': 1,   // v[a]i
  'andare:lui': 1,  // v[a]
  'andare:noi': 4,  // andi[a]mo → a,n,d,i,a,m,o → 'a' of -iamo at index 4
  'andare:voi': 3,  // and[a]te
  'andare:loro': 1, // v[a]nno

  // ── venire ── io:'vengo' tu:'vieni' lui:'viene' noi:'veniamo' voi:'venite' loro:'vengono'
  'venire:io': 1,   // v[e]ngo
  'venire:tu': 2,   // vi[e]ni
  'venire:lui': 2,  // vi[e]ne
  'venire:noi': 4,  // veni[a]mo
  'venire:voi': 3,  // ven[i]te
  'venire:loro': 1, // v[e]ngono

  // ── fare ── io:'faccio' tu:'fai' lui:'fa' noi:'facciamo' voi:'fate' loro:'fanno'
  'fare:io': 1,     // f[a]ccio
  'fare:tu': 1,     // f[a]i
  'fare:lui': 1,    // f[a]
  'fare:noi': 5,    // facci[a]mo
  'fare:voi': 1,    // f[a]te
  'fare:loro': 1,   // f[a]nno

  // ── dare ── io:'do' tu:'dai' lui:'dà' noi:'diamo' voi:'date' loro:'danno'
  'dare:io': 1,     // d[o]
  'dare:tu': 1,     // d[a]i
  'dare:lui': 1,    // d[à]
  'dare:noi': 2,    // di[a]mo
  'dare:voi': 1,    // d[a]te
  'dare:loro': 1,   // d[a]nno

  // ── sapere ── io:'so' tu:'sai' lui:'sa' noi:'sappiamo' voi:'sapete' loro:'sanno'
  'sapere:io': 1,   // s[o]
  'sapere:tu': 1,   // s[a]i
  'sapere:lui': 1,  // s[a]
  'sapere:noi': 5,  // sappi[a]mo
  'sapere:voi': 3,  // sap[e]te → s,a,p,e,t,e → 'e' before "te" at index 3
  'sapere:loro': 1, // s[a]nno

  // ── stare ── io:'sto' tu:'stai' lui:'sta' noi:'stiamo' voi:'state' loro:'stanno'
  'stare:io': 2,    // st[o]
  'stare:tu': 2,    // st[a]i
  'stare:lui': 2,   // st[a]
  'stare:noi': 3,   // sti[a]mo
  'stare:voi': 2,   // st[a]te
  'stare:loro': 2,  // st[a]nno

  // ── uscire ── io:'esco' tu:'esci' lui:'esce' noi:'usciamo' voi:'uscite' loro:'escono'
  'uscire:io': 0,   // [e]sco
  'uscire:tu': 0,   // [e]sci
  'uscire:lui': 0,  // [e]sce
  'uscire:noi': 4,  // usci[a]mo
  'uscire:voi': 3,  // usc[i]te
  'uscire:loro': 0, // [e]scono

  // ── potere ── io:'posso' tu:'puoi' lui:'può' noi:'possiamo' voi:'potete' loro:'possono'
  'potere:io': 1,   // p[o]sso
  'potere:tu': 1,   // p[u]oi  → diphthong 'uo', stress first vowel u
  'potere:lui': 2,  // pu[ò]
  'potere:noi': 5,  // possi[a]mo
  'potere:voi': 3,  // pot[e]te → p,o,t,e,t,e → 'e' before "te" at index 3
  'potere:loro': 1, // p[o]ssono

  // ── volere ── io:'voglio' tu:'vuoi' lui:'vuole' noi:'vogliamo' voi:'volete' loro:'vogliono'
  'volere:io': 1,   // v[o]glio
  'volere:tu': 1,   // v[u]oi
  'volere:lui': 1,  // v[u]ole
  'volere:noi': 5,  // vogli[a]mo
  'volere:voi': 3,  // vol[e]te → v,o,l,e,t,e → 'e' before "te" at index 3
  'volere:loro': 1, // v[o]gliono

  // ── dovere ── io:'devo' tu:'devi' lui:'deve' noi:'dobbiamo' voi:'dovete' loro:'devono'
  'dovere:io': 1,   // d[e]vo
  'dovere:tu': 1,   // d[e]vi
  'dovere:lui': 1,  // d[e]ve
  'dovere:noi': 5,  // dobbi[a]mo
  'dovere:voi': 3,  // dov[e]te → d,o,v,e,t,e → 'e' before "te" at index 3
  'dovere:loro': 1, // d[e]vono

  // ── finire ── io:'finisco' tu:'finisci' lui:'finisce' noi:'finiamo' voi:'finite' loro:'finiscono'
  'finire:io': 3,   // fin[i]sco
  'finire:tu': 3,   // fin[i]sci
  'finire:lui': 3,  // fin[i]sce
  'finire:noi': 4,  // fini[a]mo
  'finire:voi': 3,  // fin[i]te
  'finire:loro': 3, // fin[i]scono

  // ── capire ── io:'capisco' tu:'capisci' lui:'capisce' noi:'capiamo' voi:'capite' loro:'capiscono'
  'capire:io': 3,   // cap[i]sco
  'capire:tu': 3,   // cap[i]sci
  'capire:lui': 3,  // cap[i]sce
  'capire:noi': 4,  // capi[a]mo
  'capire:voi': 3,  // cap[i]te
  'capire:loro': 3, // cap[i]scono

  // ── preferire ── io:'preferisco' tu:'preferisci' lui:'preferisce' noi:'preferiamo' voi:'preferite' loro:'preferiscono'
  'preferire:io': 6,   // prefer[i]sco
  'preferire:tu': 6,   // prefer[i]sci
  'preferire:lui': 6,  // prefer[i]sce
  'preferire:noi': 7,  // preferi[a]mo
  'preferire:voi': 6,  // prefer[i]te
  'preferire:loro': 6, // prefer[i]scono

  // ── pulire ── io:'pulisco' tu:'pulisci' lui:'pulisce' noi:'puliamo' voi:'pulite' loro:'puliscono'
  'pulire:io': 3,   // pul[i]sco
  'pulire:tu': 3,   // pul[i]sci
  'pulire:lui': 3,  // pul[i]sce
  'pulire:noi': 4,  // puli[a]mo
  'pulire:voi': 3,  // pul[i]te
  'pulire:loro': 3, // pul[i]scono

  // ── spedire ── io:'spedisco' tu:'spedisci' lui:'spedisce' noi:'spediamo' voi:'spedite' loro:'spediscono'
  'spedire:io': 4,   // sped[i]sco
  'spedire:tu': 4,   // sped[i]sci
  'spedire:lui': 4,  // sped[i]sce
  'spedire:noi': 5,  // spedi[a]mo
  'spedire:voi': 4,  // sped[i]te
  'spedire:loro': 4, // sped[i]scono

  // ── costruire ── io:'costruisco' tu:'costruisci' lui:'costruisce' noi:'costruiamo' voi:'costruite' loro:'costruiscono'
  'costruire:io': 6,   // costru[i]sco
  'costruire:tu': 6,   // costru[i]sci
  'costruire:lui': 6,  // costru[i]sce
  'costruire:noi': 7,  // costrui[a]mo
  'costruire:voi': 6,  // costru[i]te
  'costruire:loro': 6, // costru[i]scono

  // ── giocare ── io:'gioco' tu:'giochi' lui:'gioca' noi:'giochiamo' voi:'giocate' loro:'giocano'
  'giocare:io': 2,   // gi[o]co
  'giocare:tu': 2,   // gi[o]chi
  'giocare:lui': 2,  // gi[o]ca
  'giocare:noi': 6,  // giochi[a]mo
  'giocare:voi': 4,  // gioc[a]te
  'giocare:loro': 2, // gi[o]cano

  // ── pagare ── io:'pago' tu:'paghi' lui:'paga' noi:'paghiamo' voi:'pagate' loro:'pagano'
  'pagare:io': 1,   // p[a]go
  'pagare:tu': 1,   // p[a]ghi
  'pagare:lui': 1,  // p[a]ga
  'pagare:noi': 5,  // paghi[a]mo
  'pagare:voi': 3,  // pag[a]te
  'pagare:loro': 1, // p[a]gano

  // ── cercare ── io:'cerco' tu:'cerchi' lui:'cerca' noi:'cerchiamo' voi:'cercate' loro:'cercano'
  'cercare:io': 1,   // c[e]rco
  'cercare:tu': 1,   // c[e]rchi
  'cercare:lui': 1,  // c[e]rca
  'cercare:noi': 6,  // cerchi[a]mo
  'cercare:voi': 4,  // cerc[a]te
  'cercare:loro': 1, // c[e]rcano

  // ── mangiare ── io:'mangio' tu:'mangi' lui:'mangia' noi:'mangiamo' voi:'mangiate' loro:'mangiano'
  'mangiare:io': 1,   // m[a]ngio
  'mangiare:tu': 1,   // m[a]ngi
  'mangiare:lui': 1,  // m[a]ngia
  'mangiare:noi': 5,  // mangi[a]mo
  'mangiare:voi': 5,  // mangi[a]te
  'mangiare:loro': 1, // m[a]ngiano

  // ── studiare ── io:'studio' tu:'studi' lui:'studia' noi:'studiamo' voi:'studiate' loro:'studiano'
  'studiare:io': 2,   // st[u]dio → 'studio' = s,t,u,d,i,o → stress on stem 'u' (index 2)
  'studiare:tu': 2,   // st[u]di
  'studiare:lui': 2,  // st[u]dia
  'studiare:noi': 5,  // studi[a]mo
  'studiare:voi': 5,  // studi[a]te
  'studiare:loro': 2, // st[u]diano

  // ── parlare ── io:'parlo' tu:'parli' lui:'parla' noi:'parliamo' voi:'parlate' loro:'parlano'
  'parlare:io': 1,   // p[a]rlo
  'parlare:tu': 1,   // p[a]rli
  'parlare:lui': 1,  // p[a]rla
  'parlare:noi': 5,  // parli[a]mo
  'parlare:voi': 4,  // parl[a]te → p,a,r,l,a,t,e → 'a' before "te" at index 4
  'parlare:loro': 1, // p[a]rlano

  // ── abitare ── io:'abito' tu:'abiti' lui:'abita' noi:'abitiamo' voi:'abitate' loro:'abitano'
  'abitare:io': 0,   // [a]bito → a,b,i,t,o → stress first 'a' at index 0 (àbito)
  'abitare:tu': 0,   // [a]biti
  'abitare:lui': 0,  // [a]bita
  'abitare:noi': 5,  // abiti[a]mo → a,b,i,t,i,a,m,o → 'a' of -iamo at index 5
  'abitare:voi': 4,  // abit[a]te → a,b,i,t,a,t,e → 'a' before "te" at index 4
  'abitare:loro': 0, // [a]bitano

  // ── lavorare ── io:'lavoro' tu:'lavori' lui:'lavora' noi:'lavoriamo' voi:'lavorate' loro:'lavorano'
  'lavorare:io': 3,   // lav[o]ro
  'lavorare:tu': 3,   // lav[o]ri
  'lavorare:lui': 3,  // lav[o]ra
  'lavorare:noi': 6,  // lavori[a]mo
  'lavorare:voi': 5,  // lavor[a]te
  'lavorare:loro': 3, // lav[o]rano

  // ── comprare ── io:'compro' tu:'compri' lui:'compra' noi:'compriamo' voi:'comprate' loro:'comprano'
  'comprare:io': 1,   // c[o]mpro
  'comprare:tu': 1,   // c[o]mpri
  'comprare:lui': 1,  // c[o]mpra
  'comprare:noi': 6,  // compri[a]mo
  'comprare:voi': 5,  // compr[a]te
  'comprare:loro': 1, // c[o]mprano

  // ── guardare ── io:'guardo' tu:'guardi' lui:'guarda' noi:'guardiamo' voi:'guardate' loro:'guardano'
  'guardare:io': 2,   // gu[a]rdo
  'guardare:tu': 2,   // gu[a]rdi
  'guardare:lui': 2,  // gu[a]rda
  'guardare:noi': 6,  // guardi[a]mo
  'guardare:voi': 5,  // guard[a]te
  'guardare:loro': 2, // gu[a]rdano

  // ── aspettare ── io:'aspetto' tu:'aspetti' lui:'aspetta' noi:'aspettiamo' voi:'aspettate' loro:'aspettano'
  'aspettare:io': 3,   // asp[e]tto
  'aspettare:tu': 3,   // asp[e]tti
  'aspettare:lui': 3,  // asp[e]tta
  'aspettare:noi': 7,  // aspetti[a]mo
  'aspettare:voi': 6,  // aspett[a]te
  'aspettare:loro': 3, // asp[e]ttano

  // ── cantare ── io:'canto' tu:'canti' lui:'canta' noi:'cantiamo' voi:'cantate' loro:'cantano'
  'cantare:io': 1,   // c[a]nto
  'cantare:tu': 1,   // c[a]nti
  'cantare:lui': 1,  // c[a]nta
  'cantare:noi': 5,  // canti[a]mo
  'cantare:voi': 4,  // cant[a]te → c,a,n,t,a,t,e → 'a' before "te" at index 4
  'cantare:loro': 1, // c[a]ntano

  // ── prendere ── io:'prendo' tu:'prendi' lui:'prende' noi:'prendiamo' voi:'prendete' loro:'prendono'
  'prendere:io': 2,   // pr[e]ndo
  'prendere:tu': 2,   // pr[e]ndi
  'prendere:lui': 2,  // pr[e]nde
  'prendere:noi': 6,  // prendi[a]mo
  'prendere:voi': 5,  // prend[e]te
  'prendere:loro': 2, // pr[e]ndono

  // ── leggere ── io:'leggo' tu:'leggi' lui:'legge' noi:'leggiamo' voi:'leggete' loro:'leggono'
  'leggere:io': 1,   // l[e]ggo
  'leggere:tu': 1,   // l[e]ggi
  'leggere:lui': 1,  // l[e]gge
  'leggere:noi': 5,  // leggi[a]mo
  'leggere:voi': 4,  // legg[e]te
  'leggere:loro': 1, // l[e]ggono

  // ── scrivere ── io:'scrivo' tu:'scrivi' lui:'scrive' noi:'scriviamo' voi:'scrivete' loro:'scrivono'
  'scrivere:io': 3,   // scr[i]vo
  'scrivere:tu': 3,   // scr[i]vi
  'scrivere:lui': 3,  // scr[i]ve
  'scrivere:noi': 6,  // scrivi[a]mo → s,c,r,i,v,i,a,m,o → 'a' of -iamo at index 6
  'scrivere:voi': 5,  // scriv[e]te
  'scrivere:loro': 3, // scr[i]vono

  // ── vedere ── io:'vedo' tu:'vedi' lui:'vede' noi:'vediamo' voi:'vedete' loro:'vedono'
  'vedere:io': 1,   // v[e]do
  'vedere:tu': 1,   // v[e]di
  'vedere:lui': 1,  // v[e]de
  'vedere:noi': 4,  // vedi[a]mo
  'vedere:voi': 3,  // ved[e]te
  'vedere:loro': 1, // v[e]dono

  // ── chiudere ── io:'chiudo' tu:'chiudi' lui:'chiude' noi:'chiudiamo' voi:'chiudete' loro:'chiudono'
  'chiudere:io': 3,   // chi[u]do
  'chiudere:tu': 3,   // chi[u]di
  'chiudere:lui': 3,  // chi[u]de
  'chiudere:noi': 6,  // chiudi[a]mo → c,h,i,u,d,i,a,m,o → 'a' of -iamo at index 6
  'chiudere:voi': 5,  // chiud[e]te → c,h,i,u,d,e,t,e → 'e' before "te" at index 5
  'chiudere:loro': 3, // chi[u]dono

  // ── mettere ── io:'metto' tu:'metti' lui:'mette' noi:'mettiamo' voi:'mettete' loro:'mettono'
  'mettere:io': 1,   // m[e]tto
  'mettere:tu': 1,   // m[e]tti
  'mettere:lui': 1,  // m[e]tte
  'mettere:noi': 5,  // metti[a]mo
  'mettere:voi': 4,  // mett[e]te
  'mettere:loro': 1, // m[e]ttono

  // ── dormire ── io:'dormo' tu:'dormi' lui:'dorme' noi:'dormiamo' voi:'dormite' loro:'dormono'
  'dormire:io': 1,   // d[o]rmo
  'dormire:tu': 1,   // d[o]rmi
  'dormire:lui': 1,  // d[o]rme
  'dormire:noi': 5,  // dormi[a]mo
  'dormire:voi': 4,  // dorm[i]te → d,o,r,m,i,t,e → 'i' before "te" at index 4
  'dormire:loro': 1, // d[o]rmono

  // ── aprire ── io:'apro' tu:'apri' lui:'apre' noi:'apriamo' voi:'aprite' loro:'aprono'
  'aprire:io': 0,   // [a]pro
  'aprire:tu': 0,   // [a]pri
  'aprire:lui': 0,  // [a]pre
  'aprire:noi': 4,  // apri[a]mo
  'aprire:voi': 3,  // apr[i]te
  'aprire:loro': 0, // [a]prono

  // ── partire ── io:'parto' tu:'parti' lui:'parte' noi:'partiamo' voi:'partite' loro:'partono'
  'partire:io': 1,   // p[a]rto
  'partire:tu': 1,   // p[a]rti
  'partire:lui': 1,  // p[a]rte
  'partire:noi': 5,  // parti[a]mo
  'partire:voi': 4,  // part[i]te → p,a,r,t,i,t,e → 'i' before "te" at index 4
  'partire:loro': 1, // p[a]rtono

  // ── sentire ── io:'sento' tu:'senti' lui:'sente' noi:'sentiamo' voi:'sentite' loro:'sentono'
  'sentire:io': 1,   // s[e]nto
  'sentire:tu': 1,   // s[e]nti
  'sentire:lui': 1,  // s[e]nte
  'sentire:noi': 5,  // senti[a]mo
  'sentire:voi': 4,  // sent[i]te → s,e,n,t,i,t,e → 'i' before "te" at index 4
  'sentire:loro': 1, // s[e]ntono

  // ── offrire ── io:'offro' tu:'offri' lui:'offre' noi:'offriamo' voi:'offrite' loro:'offrono'
  'offrire:io': 0,   // [o]ffro → 'offro' = o,f,f,r,o → stem vowel is first 'o' (index 0)
  'offrire:tu': 0,   // [o]ffri
  'offrire:lui': 0,  // [o]ffre
  'offrire:noi': 5,  // offri[a]mo → o,f,f,r,i,a,m,o → 'a' of -iamo at index 5
  'offrire:voi': 4,  // offr[i]te → o,f,f,r,i,t,e → 'i' before "te" at index 4
  'offrire:loro': 0, // [o]ffrono → stem vowel is first 'o' at index 0
};

/**
 * Split a present-tense `form` of `infinitive`/`person` around its STRESSED
 * VOWEL, so a renderer can underline `vowel`. Returns null when the form isn't
 * in the curated table (graceful: the caller then shows the form with no
 * underline). pre + vowel + post === form, and vowel is exactly ONE character.
 */
export function stressSplit(
  infinitive: string,
  person: Person,
  form: string,
): StressSplit | null {
  const index = STRESS_INDEX[`${infinitive}:${person}`];
  if (index === undefined) return null;
  if (index < 0 || index >= form.length) return null;

  const vowel = form[index];
  if (!VOWELS.has(vowel)) return null;

  return {
    pre: form.slice(0, index),
    vowel,
    post: form.slice(index + 1),
  };
}
