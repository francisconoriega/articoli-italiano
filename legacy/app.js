const WORDS = window.WORDS || [];
const EXPLANATION_RULES = window.EXPLANATION_RULES || {};

const ARTICLE_OPTIONS = ["la", "le", "l'", "il", "lo", "i", "gli"];
const HOTKEYS = {
  "1": "la",
  "2": "le",
  "3": "l'",
  "4": "il",
  "5": "lo",
  "6": "i",
  "7": "gli"
};

const STORAGE_KEY = "articoli-italiano-stats-v3";
const DEFAULT_TIME_LIMIT = 15;
const MIN_TIME_LIMIT = 5;
const MAX_TIME_LIMIT = 15;
const HINT_FADE_TIME_LIMIT = 10;
const HIDE_GRAMMAR_TIME_LIMIT = 8;
const ROUND_SIZE = 20;
const RECENT_MISS_LIMIT = 12;

const elements = {
  sessionAccuracy: document.querySelector("#sessionAccuracy"),
  answeredCount: document.querySelector("#answeredCount"),
  streakCount: document.querySelector("#streakCount"),
  localAccuracy: document.querySelector("#localAccuracy"),
  timerBar: document.querySelector("#timerBar"),
  wordTranslation: document.querySelector("#wordTranslation"),
  wordStage: document.querySelector(".word-stage"),
  articlePreview: document.querySelector("#articlePreview"),
  wordPrompt: document.querySelector("#wordPrompt"),
  wordHint: document.querySelector("#wordHint"),
  timerToggle: document.querySelector("#timerToggle"),
  timeLimit: document.querySelector("#timeLimit"),
  practiceFilter: document.querySelector("#practiceFilter"),
  normalModeButton: document.querySelector("#normalModeButton"),
  inverseModeButton: document.querySelector("#inverseModeButton"),
  skipButton: document.querySelector("#skipButton"),
  dontKnowButton: document.querySelector("#dontKnowButton"),
  resetButton: document.querySelector("#resetButton"),
  answerGrid: document.querySelector("#answerGrid"),
  weakList: document.querySelector("#weakList"),
  reinforceCount: document.querySelector("#reinforceCount"),
  weakRulesList: document.querySelector("#weakRulesList"),
  weakRulesCount: document.querySelector("#weakRulesCount"),
  feedbackBox: document.querySelector("#feedbackBox"),
  wordBankCount: document.querySelector("#wordBankCount"),
  guideDetails: document.querySelector("#guideDetails"),
  roundSummary: document.querySelector("#roundSummary"),
  summaryScore: document.querySelector("#summaryScore"),
  summaryStats: document.querySelector("#summaryStats"),
  summaryArticles: document.querySelector("#summaryArticles"),
  summaryRules: document.querySelector("#summaryRules"),
  summaryWords: document.querySelector("#summaryWords"),
  newRoundButton: document.querySelector("#newRoundButton"),
  continuePracticeButton: document.querySelector("#continuePracticeButton")
};

const cardsByKey = new Map();
const wordProfiles = new Map();
WORDS.forEach((card) => {
  cardsByKey.set(getCardKey(card), { ...card, answer: card.definite });
  const profile = wordProfiles.get(card.word) || { genders: new Set(), numbers: new Set() };
  profile.genders.add(card.gender);
  profile.numbers.add(card.number);
  wordProfiles.set(card.word, profile);
});

let stats = loadStats();
let currentCard = null;
let currentOptions = [];
let acceptingAnswers = true;
let waitingForNext = false;
let timerStartedAt = 0;
let timerFrame = null;
let nextCardTimeout = null;
let adaptiveTimeLimit = DEFAULT_TIME_LIMIT;
let activeFilter = "all";
let practiceMode = "normal";
let guideTouched = false;
let guideProgrammatic = false;
let lastCardKey = null;
let session = createSession();

function createSession() {
  return {
    answered: 0,
    correct: 0,
    streak: 0,
    roundAnswered: 0,
    roundCorrect: 0,
    mistakesByArticle: {},
    mistakesByRule: {},
    mistakesByCard: {}
  };
}

function createStats() {
  return {
    cards: {},
    rules: {},
    recentMisses: [],
    round: null
  };
}

function loadStats() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved && typeof saved === "object") {
      return {
        cards: saved.cards || {},
        rules: saved.rules || {},
        recentMisses: Array.isArray(saved.recentMisses) ? saved.recentMisses : [],
        round: saved.round || null
      };
    }
  } catch (error) {
    console.warn("No se pudieron leer las estadísticas locales.", error);
  }

  return createStats();
}

function saveStats() {
  stats.round = {
    answered: session.roundAnswered,
    correct: session.roundCorrect,
    filter: activeFilter,
    mode: practiceMode
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
}

function getCardKey(card) {
  return `${card.groupId}:${card.number}`;
}

function getRuleKey(card) {
  return card.rule || "regular";
}

function getCardStats(card) {
  const key = typeof card === "string" ? card : getCardKey(card);

  if (!stats.cards[key]) {
    stats.cards[key] = { seen: 0, correct: 0, wrong: 0, timeouts: 0, dontKnow: 0 };
  }

  return stats.cards[key];
}

function getRuleStats(ruleKey) {
  if (!stats.rules[ruleKey]) {
    stats.rules[ruleKey] = { seen: 0, correct: 0, wrong: 0, timeouts: 0, dontKnow: 0 };
  }

  return stats.rules[ruleKey];
}

function getPool() {
  const allCards = WORDS.map((entry) => ({ ...entry, answer: entry.definite }));

  if (activeFilter === "all") {
    return allCards;
  }

  return allCards.filter((card) => {
    if (activeFilter === "feminine") return card.gender === "f";
    if (activeFilter === "masculine") return card.gender === "m";
    if (activeFilter === "lo-gli") return card.definite === "lo" || card.definite === "gli";
    if (activeFilter === "exceptions") return Boolean(card.rule);
    if (activeFilter === "mistakes") {
      const cardStats = getCardStats(card);
      return cardStats.wrong + cardStats.timeouts + cardStats.dontKnow > 0;
    }
    return true;
  });
}

function getWeight(card) {
  const cardStats = getCardStats(card);
  const mistakes = cardStats.wrong + cardStats.timeouts + cardStats.dontKnow;
  const accuracyPenalty = cardStats.seen > 0 ? 1 - cardStats.correct / cardStats.seen : 0.45;
  const freshBoost = cardStats.seen === 0 ? 2 : 1;

  return freshBoost + mistakes * 1.8 + accuracyPenalty * 4;
}

function chooseCard() {
  const pool = getPool();
  if (pool.length === 0) {
    return null;
  }

  const recent = chooseRecentMiss(pool);
  if (recent) {
    return recent;
  }

  const weighted = pool.map((card) => ({ card, weight: getWeight(card) }));
  const total = weighted.reduce((sum, item) => sum + item.weight, 0);
  let cursor = Math.random() * total;

  for (const item of weighted) {
    cursor -= item.weight;
    if (cursor <= 0) {
      return item.card;
    }
  }

  return weighted[weighted.length - 1].card;
}

function chooseRecentMiss(pool) {
  if (stats.recentMisses.length === 0 || Math.random() > 0.45) {
    return null;
  }

  const poolKeys = new Set(pool.map(getCardKey));
  const candidates = stats.recentMisses
    .filter((item) => item.due <= session.answered && item.key !== lastCardKey && poolKeys.has(item.key));

  if (candidates.length === 0) {
    return null;
  }

  const picked = candidates[0];
  stats.recentMisses = stats.recentMisses.filter((item) => item !== picked);
  return cardsByKey.get(picked.key) || null;
}

function scheduleRecentMiss(card) {
  const key = getCardKey(card);
  stats.recentMisses = stats.recentMisses.filter((item) => item.key !== key);
  stats.recentMisses.unshift({
    key,
    due: session.answered + 2 + Math.floor(Math.random() * 3)
  });
  stats.recentMisses = stats.recentMisses.slice(0, RECENT_MISS_LIMIT);
}

function startCard() {
  window.clearTimeout(nextCardTimeout);
  currentCard = chooseCard();
  currentOptions = [];
  acceptingAnswers = Boolean(currentCard);
  waitingForNext = false;
  clearButtonStates();
  hideFeedback();
  elements.answerGrid.classList.toggle("inverse-grid", practiceMode === "inverse");

  if (!currentCard) {
    showEmptyState();
    renderStats();
    return;
  }

  renderPrompt();
  renderAnswerControls();
  startTimer();
  renderStats();
}

function showEmptyState() {
  cancelAnimationFrame(timerFrame);
  elements.timerBar.style.transform = "scaleX(0)";
  elements.articlePreview.textContent = "";
  elements.wordPrompt.textContent = "Sin tarjetas";
  elements.wordTranslation.textContent = activeFilter === "mistakes"
    ? "Todavía no hay errores guardados para practicar."
    : "No hay palabras disponibles con este filtro.";
  elements.wordHint.textContent = "Cambia el filtro para continuar.";
  elements.answerGrid.replaceChildren();
}

function renderPrompt() {
  if (shouldShowGrammar(currentCard)) {
    const genderText = currentCard.gender === "f" ? "femenino" : "masculino";
    const numberClass = currentCard.number === "plural" ? "grammar-plural" : "grammar-singular";
    elements.wordTranslation.innerHTML = `${currentCard.translation} · ${genderText} · <span class="${numberClass}">${currentCard.number}</span>`;
  } else {
    elements.wordTranslation.textContent = currentCard.translation;
  }

  if (practiceMode === "inverse") {
    elements.articlePreview.textContent = currentCard.definite;
    elements.wordPrompt.textContent = "____";
    elements.wordHint.textContent = "";
    return;
  }

  elements.articlePreview.textContent = "?";
  elements.wordPrompt.textContent = currentCard.word;
  elements.wordHint.textContent = "";
}

function shouldShowGrammar(card) {
  return adaptiveTimeLimit > HIDE_GRAMMAR_TIME_LIMIT || isAmbiguousWord(card);
}

function isAmbiguousWord(card) {
  const profile = wordProfiles.get(card.word);
  if (!profile) return false;
  return profile.genders.size > 1 || profile.numbers.size > 1;
}

function renderAnswerControls() {
  elements.answerGrid.replaceChildren();

  if (practiceMode === "inverse") {
    currentOptions = getInverseOptions(currentCard);
    currentOptions.forEach((option, index) => {
      elements.answerGrid.append(createAnswerButton({
        value: getCardKey(option),
        label: option.word,
        hotkey: String(index + 1),
        kind: "word"
      }));
    });
    return;
  }

  ARTICLE_OPTIONS.forEach((article, index) => {
    elements.answerGrid.append(createAnswerButton({
      value: article,
      label: article,
      hotkey: String(index + 1),
      kind: "article"
    }));
  });
}

function createAnswerButton({ value, label, hotkey, kind }) {
  const button = document.createElement("button");
  button.className = "answer-button";
  button.dataset.answer = value;
  button.dataset.kind = kind;
  button.type = "button";

  const key = document.createElement("kbd");
  key.textContent = hotkey;

  const text = document.createElement("span");
  text.textContent = label;

  button.append(key, text);
  button.addEventListener("click", () => handleAnswer(value));
  return button;
}

function getInverseOptions(card) {
  const sameNumber = WORDS.filter((item) => item.number === card.number && getCardKey(item) !== getCardKey(card));
  const broader = WORDS.filter((item) => getCardKey(item) !== getCardKey(card));
  const distractors = shuffle([...sameNumber, ...broader])
    .filter(uniqueByCardKey())
    .slice(0, 3);

  return shuffle([card, ...distractors]);
}

function uniqueByCardKey() {
  const seen = new Set();
  return (card) => {
    const key = getCardKey(card);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  };
}

function shuffle(items) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function startTimer() {
  cancelAnimationFrame(timerFrame);
  elements.timerBar.style.transform = "scaleX(1)";
  syncTimeLimitControl();

  if (!elements.timerToggle.checked || !currentCard) {
    return;
  }

  timerStartedAt = performance.now();
  const limit = adaptiveTimeLimit * 1000;

  function tick(now) {
    const progress = Math.min((now - timerStartedAt) / limit, 1);
    elements.timerBar.style.transform = `scaleX(${1 - progress})`;

    if (progress >= 1) {
      handleAnswer(null, "timeout");
      return;
    }

    timerFrame = requestAnimationFrame(tick);
  }

  timerFrame = requestAnimationFrame(tick);
}

function handleAnswer(answer, reason = "answered") {
  if (!acceptingAnswers || !currentCard) {
    return;
  }

  acceptingAnswers = false;
  cancelAnimationFrame(timerFrame);

  const correctAnswer = practiceMode === "inverse" ? getCardKey(currentCard) : currentCard.answer;
  const correct = answer === correctAnswer;
  const cardStats = getCardStats(currentCard);
  const ruleStats = getRuleStats(getRuleKey(currentCard));
  const missed = !correct;

  cardStats.seen += 1;
  ruleStats.seen += 1;
  session.answered += 1;
  session.roundAnswered += 1;

  if (correct) {
    cardStats.correct += 1;
    ruleStats.correct += 1;
    session.correct += 1;
    session.roundCorrect += 1;
    session.streak += 1;
  } else {
    const bucket = reason === "timeout" ? "timeouts" : reason === "dontKnow" ? "dontKnow" : "wrong";
    cardStats[bucket] += 1;
    ruleStats[bucket] += 1;
    session.streak = 0;
    session.mistakesByArticle[currentCard.definite] = (session.mistakesByArticle[currentCard.definite] || 0) + 1;
    session.mistakesByRule[getRuleKey(currentCard)] = (session.mistakesByRule[getRuleKey(currentCard)] || 0) + 1;
    session.mistakesByCard[getCardKey(currentCard)] = (session.mistakesByCard[getCardKey(currentCard)] || 0) + 1;
    scheduleRecentMiss(currentCard);
  }

  updateAdaptiveSpeed(correct);
  saveStats();
  showFeedback(answer, correct, reason);
  renderStats();
  lastCardKey = getCardKey(currentCard);

  if (session.roundAnswered >= ROUND_SIZE) {
    waitingForNext = false;
    window.setTimeout(showRoundSummary, correct ? 520 : 0);
    return;
  }

  if (correct) {
    nextCardTimeout = window.setTimeout(startCard, 520);
  } else {
    waitingForNext = true;
  }
}

function updateAdaptiveSpeed(correct) {
  if (correct && session.streak > 0 && session.streak % 3 === 0) {
    adaptiveTimeLimit = Math.max(MIN_TIME_LIMIT, adaptiveTimeLimit - 1);
  } else if (!correct) {
    adaptiveTimeLimit = Math.min(MAX_TIME_LIMIT, adaptiveTimeLimit + 2);
  }

  syncTimeLimitControl();
}

function syncTimeLimitControl() {
  elements.timeLimit.value = String(adaptiveTimeLimit);
  document.documentElement.style.setProperty("--article-hint-alpha", getArticleHintAlpha().toFixed(3));

  if (!guideTouched) {
    guideProgrammatic = true;
    elements.guideDetails.open = adaptiveTimeLimit > HINT_FADE_TIME_LIMIT;
    window.setTimeout(() => {
      guideProgrammatic = false;
    }, 0);
  }
}

function getArticleHintAlpha() {
  const speedRange = MAX_TIME_LIMIT - HINT_FADE_TIME_LIMIT;
  const slowFactor = speedRange === 0 ? 0 : (adaptiveTimeLimit - HINT_FADE_TIME_LIMIT) / speedRange;

  return Math.max(0, Math.min(1, slowFactor)) * 0.16;
}

function showFeedback(answer, correct, reason) {
  if (practiceMode === "inverse") {
    elements.wordPrompt.textContent = currentCard.word;
  } else {
    elements.articlePreview.textContent = currentCard.answer;
  }
  elements.feedbackBox.className = `feedback ${correct ? "correct" : "wrong"}`;

  if (correct) {
    flashCorrect();
    return;
  }

  flashWrong();
  elements.feedbackBox.parentElement.classList.add("is-visible");

  if (reason === "timeout") {
    pulseTimeout();
    showMistakeFeedback(`Tiempo: era ${getCorrectLabel()}.`);
  } else if (reason === "dontKnow") {
    showMistakeFeedback(`Era ${getCorrectLabel()}.`);
  } else {
    showMistakeFeedback(`Casi: elegiste ${getAnswerLabel(answer)}, pero era ${getCorrectLabel()}.`);
  }

  elements.wordHint.textContent = "Toca o presiona una tecla para la siguiente palabra.";
  markAnswerButtons(answer);
}

function getCorrectLabel() {
  return practiceMode === "inverse"
    ? currentCard.word
    : `${currentCard.answer} ${currentCard.word}`;
}

function getAnswerLabel(answer) {
  if (answer === null) return "nada";
  if (practiceMode === "normal") return answer;
  const card = cardsByKey.get(answer);
  return card ? card.word : "otra opción";
}

function markAnswerButtons(answer) {
  const correctAnswer = practiceMode === "inverse" ? getCardKey(currentCard) : currentCard.answer;
  [...elements.answerGrid.querySelectorAll(".answer-button")].forEach((button) => {
    const value = button.dataset.answer;
    if (value === correctAnswer) {
      button.classList.add("correct");
    } else if (value === answer) {
      button.classList.add("wrong", "shake");
    }
  });
}

function flashCorrect() {
  const correctAnswer = practiceMode === "inverse" ? getCardKey(currentCard) : currentCard.answer;
  const button = elements.answerGrid.querySelector(`[data-answer="${cssEscape(correctAnswer)}"]`);
  if (button) {
    button.classList.add("correct", "flash");
  }
  if (elements.wordStage) {
    elements.wordStage.classList.remove("stage-flash", "stage-flash-wrong");
    void elements.wordStage.offsetWidth;
    elements.wordStage.classList.add("stage-flash");
  }
}

function flashWrong() {
  if (elements.wordStage) {
    elements.wordStage.classList.remove("stage-flash", "stage-flash-wrong");
    void elements.wordStage.offsetWidth;
    elements.wordStage.classList.add("stage-flash-wrong");
  }
}

function pulseTimeout() {
  elements.timerBar.classList.remove("timeout-pulse");
  void elements.timerBar.offsetWidth;
  elements.timerBar.classList.add("timeout-pulse");
}

function cssEscape(value) {
  if (window.CSS && typeof window.CSS.escape === "function") {
    return window.CSS.escape(value);
  }
  return String(value).replace(/"/g, '\\"');
}

function hideFeedback() {
  elements.feedbackBox.className = "feedback neutral";
  elements.feedbackBox.textContent = "Elige un artículo para empezar.";
  elements.feedbackBox.parentElement.classList.remove("is-visible");
}

function showMistakeFeedback(message) {
  elements.feedbackBox.replaceChildren();

  const result = document.createElement("strong");
  result.textContent = message;

  const rule = document.createElement("span");
  rule.className = "feedback-rule";
  appendFormattedText(rule, `${getArticleRule(currentCard)} ${getPairText(currentCard)}Toca para seguir.`);

  elements.feedbackBox.append(result, rule);
}

function getPairText(card) {
  const pair = getPairCards(card).find((item) => item.number !== card.number);
  if (!pair) return "";
  return `Pareja: **${card.definite} ${card.word} -> ${pair.definite} ${pair.word}**. `;
}

function getPairCards(card) {
  return WORDS.filter((item) => item.groupId === card.groupId);
}

function getArticleRule(card) {
  if (card.rule && EXPLANATION_RULES[card.rule]) {
    const explanation = EXPLANATION_RULES[card.rule];
    return `${explanation.title}: ${explanation.text}`;
  }

  const rules = {
    il: "Usa **il** con masculino singular que **empieza con consonante común**.",
    lo: "Usa **lo** con masculino singular que **empieza con s + consonante, z, gn, ps, x, y o pn**.",
    "l'": "Usa **l'** con singular que **empieza con vocal**, masculino o femenino.",
    la: "Usa **la** con femenino singular que **empieza con consonante**.",
    i: "Usa **i** para el plural masculino de palabras que en singular llevan **il**.",
    gli: "Usa **gli** para el plural masculino de palabras que en singular llevan **l'** o **lo**.",
    le: "Usa **le** para **femenino plural**."
  };

  return rules[card.answer] || "Revisa género, número y sonido inicial de la palabra.";
}

function appendFormattedText(element, text) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);

  parts.forEach((part) => {
    if (!part) return;

    if (part.startsWith("**") && part.endsWith("**")) {
      const strong = document.createElement("strong");
      strong.textContent = part.slice(2, -2);
      element.append(strong);
      return;
    }

    element.append(document.createTextNode(part));
  });
}

function clearButtonStates() {
  [...elements.answerGrid.querySelectorAll(".answer-button")].forEach((button) => {
    button.classList.remove("correct", "wrong", "shake", "flash");
  });
  elements.timerBar.classList.remove("timeout-pulse");
  if (elements.wordStage) {
    elements.wordStage.classList.remove("stage-flash", "stage-flash-wrong");
  }
}

function renderStats() {
  const sessionAccuracy = session.answered === 0
    ? 0
    : Math.round((session.correct / session.answered) * 100);

  const totals = Object.values(stats.cards).reduce((acc, item) => {
    acc.seen += item.seen || 0;
    acc.correct += item.correct || 0;
    return acc;
  }, { seen: 0, correct: 0 });

  const localAccuracy = totals.seen === 0 ? 0 : Math.round((totals.correct / totals.seen) * 100);
  const weakWords = getWeakWords(5);
  const weakRules = getWeakRules(3);

  elements.sessionAccuracy.textContent = `${sessionAccuracy}%`;
  elements.answeredCount.textContent = `${session.roundAnswered}/${ROUND_SIZE}`;
  elements.streakCount.textContent = session.streak;
  elements.localAccuracy.textContent = `${localAccuracy}%`;
  elements.reinforceCount.textContent = `${weakWords.length} palabras`;
  elements.weakRulesCount.textContent = `${weakRules.length}`;
  elements.wordBankCount.textContent = getPool().length;

  renderWeakWords(weakWords);
  renderWeakRules(weakRules);
}

function getWeakWords(limit) {
  return WORDS
    .map((word) => ({ ...word, stats: getCardStats(word) }))
    .filter((word) => word.stats.wrong + word.stats.timeouts + word.stats.dontKnow > 0)
    .sort((a, b) => {
      const missesA = a.stats.wrong + a.stats.timeouts + a.stats.dontKnow;
      const missesB = b.stats.wrong + b.stats.timeouts + b.stats.dontKnow;
      return missesB - missesA || b.stats.seen - a.stats.seen;
    })
    .slice(0, limit);
}

function getWeakRules(limit) {
  return Object.entries(stats.rules)
    .map(([rule, ruleStats]) => ({
      rule,
      stats: ruleStats,
      misses: (ruleStats.wrong || 0) + (ruleStats.timeouts || 0) + (ruleStats.dontKnow || 0)
    }))
    .filter((item) => item.misses > 0)
    .sort((a, b) => b.misses - a.misses || b.stats.seen - a.stats.seen)
    .slice(0, limit);
}

function renderWeakWords(weakWords) {
  elements.weakList.innerHTML = "";
  if (weakWords.length === 0) {
    const emptyItem = document.createElement("li");
    emptyItem.innerHTML = "<strong>Sin errores todavía</strong><small>Empieza la ronda</small>";
    elements.weakList.append(emptyItem);
    return;
  }

  weakWords.forEach((word) => {
    const misses = word.stats.wrong + word.stats.timeouts + word.stats.dontKnow;
    const item = document.createElement("li");
    item.innerHTML = `
      <span>
        <strong>${word.definite} ${word.word}</strong>
        <small>${word.translation}</small>
      </span>
      <small>${misses} error${misses === 1 ? "" : "es"}</small>
    `;
    elements.weakList.append(item);
  });
}

function renderWeakRules(weakRules) {
  elements.weakRulesList.innerHTML = "";
  if (weakRules.length === 0) {
    const emptyItem = document.createElement("li");
    emptyItem.innerHTML = "<strong>Sin reglas débiles</strong><small>Buen inicio</small>";
    elements.weakRulesList.append(emptyItem);
    return;
  }

  weakRules.forEach((item) => {
    const li = document.createElement("li");
    li.innerHTML = `
      <span>
        <strong>${getRuleTitle(item.rule)}</strong>
        <small>${item.stats.seen} vistas</small>
      </span>
      <small>${item.misses} error${item.misses === 1 ? "" : "es"}</small>
    `;
    elements.weakRulesList.append(li);
  });
}

function getRuleTitle(ruleKey) {
  if (ruleKey === "regular") return "Regular";
  return EXPLANATION_RULES[ruleKey]?.title || ruleKey;
}

function showRoundSummary() {
  cancelAnimationFrame(timerFrame);
  const accuracy = session.roundAnswered === 0 ? 0 : Math.round((session.roundCorrect / session.roundAnswered) * 100);
  elements.summaryScore.textContent = `${accuracy}%`;
  elements.summaryStats.innerHTML = `
    <div><strong>${session.roundAnswered}</strong><small>respondidas</small></div>
    <div><strong>${session.roundCorrect}</strong><small>correctas</small></div>
    <div><strong>${ROUND_SIZE - session.roundCorrect}</strong><small>errores</small></div>
  `;
  renderSummaryList(elements.summaryArticles, Object.entries(session.mistakesByArticle), ([article, count]) => `${article}: ${count}`);
  renderSummaryList(elements.summaryRules, Object.entries(session.mistakesByRule), ([rule, count]) => `${getRuleTitle(rule)}: ${count}`);
  renderSummaryList(elements.summaryWords, Object.entries(session.mistakesByCard), ([key, count]) => {
    const card = cardsByKey.get(key);
    return card ? `${card.definite} ${card.word}: ${count}` : `${key}: ${count}`;
  });
  elements.roundSummary.classList.add("is-visible");
  elements.roundSummary.setAttribute("aria-hidden", "false");
}

function renderSummaryList(element, entries, format) {
  element.innerHTML = "";
  const sorted = entries.sort((a, b) => b[1] - a[1]).slice(0, 5);
  if (sorted.length === 0) {
    const li = document.createElement("li");
    li.textContent = "Sin errores";
    element.append(li);
    return;
  }
  sorted.forEach((entry) => {
    const li = document.createElement("li");
    li.textContent = format(entry);
    element.append(li);
  });
}

function startNewRound({ resetSpeed = false } = {}) {
  session = createSession();
  if (resetSpeed) {
    adaptiveTimeLimit = DEFAULT_TIME_LIMIT;
  }
  hideRoundSummary();
  syncTimeLimitControl();
  startCard();
}

function hideRoundSummary() {
  elements.roundSummary.classList.remove("is-visible");
  elements.roundSummary.setAttribute("aria-hidden", "true");
}

function setPracticeMode(mode) {
  practiceMode = mode;
  elements.normalModeButton.classList.toggle("active", mode === "normal");
  elements.inverseModeButton.classList.toggle("active", mode === "inverse");
  startCard();
}

document.addEventListener("keydown", (event) => {
  if (event.metaKey || event.ctrlKey || event.altKey) return;

  if (waitingForNext) {
    event.preventDefault();
    startCard();
    return;
  }

  if (practiceMode === "normal") {
    const article = HOTKEYS[event.key.toLowerCase()];
    if (article) {
      event.preventDefault();
      handleAnswer(article);
    }
  } else if (/^[1-4]$/.test(event.key)) {
    const option = currentOptions[Number(event.key) - 1];
    if (option) {
      event.preventDefault();
      handleAnswer(getCardKey(option));
    }
  }

  if (event.key === "Enter") {
    event.preventDefault();
    startCard();
  }
});

document.addEventListener("pointerup", (event) => {
  if (!waitingForNext) return;
  if (event.target.closest("button, select, input, label, summary")) return;

  event.preventDefault();
  startCard();
});

elements.skipButton.addEventListener("click", startCard);
elements.dontKnowButton.addEventListener("click", () => handleAnswer(null, "dontKnow"));
elements.resetButton.addEventListener("click", () => {
  const shouldReset = window.confirm("¿Borrar estadísticas guardadas en este navegador?");
  if (!shouldReset) return;

  stats = createStats();
  saveStats();
  session = createSession();
  adaptiveTimeLimit = DEFAULT_TIME_LIMIT;
  syncTimeLimitControl();
  hideFeedback();
  startCard();
});

elements.practiceFilter.addEventListener("change", () => {
  activeFilter = elements.practiceFilter.value;
  startNewRound();
});

elements.normalModeButton.addEventListener("click", () => setPracticeMode("normal"));
elements.inverseModeButton.addEventListener("click", () => setPracticeMode("inverse"));
elements.timerToggle.addEventListener("change", startCard);
elements.timeLimit.addEventListener("change", () => {
  adaptiveTimeLimit = Number(elements.timeLimit.value);
  guideTouched = false;
  startCard();
});
elements.guideDetails.addEventListener("toggle", () => {
  if (guideProgrammatic) return;
  guideTouched = true;
});
elements.newRoundButton.addEventListener("click", () => startNewRound({ resetSpeed: true }));
elements.continuePracticeButton.addEventListener("click", () => startNewRound());

syncTimeLimitControl();
renderStats();
startCard();
