const WORDS = window.WORDS || [];
const EXPLANATION_RULES = window.EXPLANATION_RULES || {};

const HOTKEYS = {
  "1": "la",
  "2": "le",
  "3": "l'",
  "4": "il",
  "5": "lo",
  "6": "i",
  "7": "gli"
};

const STORAGE_KEY = "articoli-italiano-stats-v2";
const DEFAULT_TIME_LIMIT = 15;
const MIN_TIME_LIMIT = 5;
const MAX_TIME_LIMIT = 15;
const HINT_FADE_TIME_LIMIT = 10;

const elements = {
  sessionAccuracy: document.querySelector("#sessionAccuracy"),
  answeredCount: document.querySelector("#answeredCount"),
  streakCount: document.querySelector("#streakCount"),
  localAccuracy: document.querySelector("#localAccuracy"),
  timerBar: document.querySelector("#timerBar"),
  wordTranslation: document.querySelector("#wordTranslation"),
  articlePreview: document.querySelector("#articlePreview"),
  wordPrompt: document.querySelector("#wordPrompt"),
  wordHint: document.querySelector("#wordHint"),
  timerToggle: document.querySelector("#timerToggle"),
  timeLimit: document.querySelector("#timeLimit"),
  skipButton: document.querySelector("#skipButton"),
  resetButton: document.querySelector("#resetButton"),
  answerButtons: [...document.querySelectorAll(".answer-button")],
  weakList: document.querySelector("#weakList"),
  reinforceCount: document.querySelector("#reinforceCount"),
  feedbackBox: document.querySelector("#feedbackBox"),
  wordBankCount: document.querySelector("#wordBankCount")
};

let stats = loadStats();
let currentCard = null;
let acceptingAnswers = true;
let waitingForNext = false;
let timerStartedAt = 0;
let timerFrame = null;
let nextCardTimeout = null;
let adaptiveTimeLimit = DEFAULT_TIME_LIMIT;
let session = {
  answered: 0,
  correct: 0,
  streak: 0
};

function loadStats() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved && typeof saved === "object") {
      return saved;
    }
  } catch (error) {
    console.warn("No se pudieron leer las estadísticas locales.", error);
  }

  return {};
}

function saveStats() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
}

function getCardKey(card) {
  return `${card.groupId}:${card.number}`;
}

function getWordStats(card) {
  const key = typeof card === "string" ? card : getCardKey(card);

  if (!stats[key]) {
    stats[key] = { seen: 0, correct: 0, wrong: 0, timeouts: 0 };
  }

  return stats[key];
}

function getPrompts() {
  return WORDS.map((entry) => ({ ...entry, answer: entry.definite }));
}

function getWeight(card) {
  const wordStats = getWordStats(card);
  const mistakes = wordStats.wrong + wordStats.timeouts;
  const accuracyPenalty = wordStats.seen > 0 ? 1 - wordStats.correct / wordStats.seen : 0.45;
  const freshBoost = wordStats.seen === 0 ? 2 : 1;

  return freshBoost + mistakes * 1.8 + accuracyPenalty * 4;
}

function chooseCard() {
  const prompts = getPrompts();
  const weighted = prompts.map((card) => ({ card, weight: getWeight(card) }));
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

function startCard() {
  window.clearTimeout(nextCardTimeout);
  currentCard = chooseCard();
  acceptingAnswers = true;
  waitingForNext = false;
  clearButtonStates();
  hideFeedback();

  elements.articlePreview.textContent = "?";
  elements.wordPrompt.textContent = currentCard.word;
  elements.wordTranslation.textContent = `${currentCard.translation} · ${currentCard.gender === "f" ? "femenino" : "masculino"} · ${currentCard.number}`;
  elements.wordHint.textContent = "Elige el artículo definido.";

  startTimer();
  renderStats();
}

function startTimer() {
  cancelAnimationFrame(timerFrame);
  elements.timerBar.style.transform = "scaleX(1)";
  syncTimeLimitControl();

  if (!elements.timerToggle.checked) {
    return;
  }

  timerStartedAt = performance.now();
  const limit = adaptiveTimeLimit * 1000;

  function tick(now) {
    const progress = Math.min((now - timerStartedAt) / limit, 1);
    elements.timerBar.style.transform = `scaleX(${1 - progress})`;

    if (progress >= 1) {
      handleAnswer(null, true);
      return;
    }

    timerFrame = requestAnimationFrame(tick);
  }

  timerFrame = requestAnimationFrame(tick);
}

function handleAnswer(answer, timedOut = false) {
  if (!acceptingAnswers || !currentCard) {
    return;
  }

  acceptingAnswers = false;
  cancelAnimationFrame(timerFrame);

  const correct = answer === currentCard.answer;
  const wordStats = getWordStats(currentCard);
  wordStats.seen += 1;

  session.answered += 1;

  if (correct) {
    wordStats.correct += 1;
    session.correct += 1;
    session.streak += 1;
  } else {
    wordStats.wrong += timedOut ? 0 : 1;
    wordStats.timeouts += timedOut ? 1 : 0;
    session.streak = 0;
  }

  updateAdaptiveSpeed(correct);
  saveStats();
  showFeedback(answer, correct, timedOut);
  renderStats();

  if (correct) {
    nextCardTimeout = window.setTimeout(startCard, 760);
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
}

function getArticleHintAlpha() {
  const speedRange = MAX_TIME_LIMIT - HINT_FADE_TIME_LIMIT;
  const slowFactor = speedRange === 0 ? 0 : (adaptiveTimeLimit - HINT_FADE_TIME_LIMIT) / speedRange;

  return Math.max(0, Math.min(1, slowFactor)) * 0.16;
}

function showFeedback(answer, correct, timedOut) {
  elements.articlePreview.textContent = currentCard.answer;
  elements.feedbackBox.className = `feedback ${correct ? "correct" : "wrong"}`;
  elements.feedbackBox.parentElement.classList.add("is-visible");

  if (correct) {
    elements.feedbackBox.textContent = `Correcto: ${currentCard.answer} ${currentCard.word}`;
  } else if (timedOut) {
    showMistakeFeedback(`Tiempo: era ${currentCard.answer} ${currentCard.word}.`);
    elements.wordHint.textContent = "Presiona cualquier tecla para la siguiente palabra.";
  } else {
    showMistakeFeedback(`Casi: elegiste ${answer}, pero era ${currentCard.answer} ${currentCard.word}.`);
    elements.wordHint.textContent = "Presiona cualquier tecla para la siguiente palabra.";
  }

  elements.answerButtons.forEach((button) => {
    const article = button.dataset.article;
    if (article === currentCard.answer) {
      button.classList.add("correct");
    } else if (article === answer) {
      button.classList.add("wrong");
    }
  });
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
  appendFormattedText(rule, `${getArticleRule(currentCard)} Presiona cualquier tecla para seguir.`);

  elements.feedbackBox.append(result, rule);
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
    if (!part) {
      return;
    }

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
  elements.answerButtons.forEach((button) => {
    button.classList.remove("correct", "wrong");
  });
}

function renderStats() {
  const sessionAccuracy = session.answered === 0
    ? 0
    : Math.round((session.correct / session.answered) * 100);

  const totals = Object.values(stats).reduce((acc, item) => {
    acc.seen += item.seen || 0;
    acc.correct += item.correct || 0;
    acc.misses += (item.wrong || 0) + (item.timeouts || 0);
    return acc;
  }, { seen: 0, correct: 0, misses: 0 });

  const localAccuracy = totals.seen === 0 ? 0 : Math.round((totals.correct / totals.seen) * 100);
  const weakWords = WORDS
    .map((word) => ({ ...word, stats: getWordStats(word) }))
    .filter((word) => word.stats.wrong + word.stats.timeouts > 0)
    .sort((a, b) => {
      const missesA = a.stats.wrong + a.stats.timeouts;
      const missesB = b.stats.wrong + b.stats.timeouts;
      return missesB - missesA || b.stats.seen - a.stats.seen;
    })
    .slice(0, 5);

  elements.sessionAccuracy.textContent = `${sessionAccuracy}%`;
  elements.answeredCount.textContent = session.answered;
  elements.streakCount.textContent = session.streak;
  elements.localAccuracy.textContent = `${localAccuracy}%`;
  elements.reinforceCount.textContent = `${weakWords.length} palabras`;
  elements.wordBankCount.textContent = WORDS.length;

  elements.weakList.innerHTML = "";
  if (weakWords.length === 0) {
    const emptyItem = document.createElement("li");
    emptyItem.innerHTML = "<strong>Sin errores todavía</strong><small>Empieza la ronda</small>";
    elements.weakList.append(emptyItem);
    return;
  }

  weakWords.forEach((word) => {
    const misses = word.stats.wrong + word.stats.timeouts;
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

elements.answerButtons.forEach((button) => {
  button.addEventListener("click", () => handleAnswer(button.dataset.article));
});

document.addEventListener("keydown", (event) => {
  if (event.metaKey || event.ctrlKey || event.altKey) {
    return;
  }

  if (waitingForNext) {
    event.preventDefault();
    startCard();
    return;
  }

  const article = HOTKEYS[event.key.toLowerCase()];
  if (article) {
    event.preventDefault();
    handleAnswer(article);
  }

  if (event.key === "Enter") {
    event.preventDefault();
    startCard();
  }
});

document.addEventListener("pointerup", (event) => {
  if (!waitingForNext) {
    return;
  }

  if (event.target.closest("button, select, input, label")) {
    return;
  }

  event.preventDefault();
  startCard();
});

elements.skipButton.addEventListener("click", startCard);

elements.resetButton.addEventListener("click", () => {
  const shouldReset = window.confirm("¿Borrar estadísticas guardadas en este navegador?");
  if (!shouldReset) {
    return;
  }

  stats = {};
  saveStats();
  session = { answered: 0, correct: 0, streak: 0 };
  adaptiveTimeLimit = DEFAULT_TIME_LIMIT;
  syncTimeLimitControl();
  hideFeedback();
  startCard();
});

elements.timerToggle.addEventListener("change", startCard);
elements.timeLimit.addEventListener("change", () => {
  adaptiveTimeLimit = Number(elements.timeLimit.value);
  startCard();
});

syncTimeLimitControl();
renderStats();
startCard();
