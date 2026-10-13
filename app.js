const home = document.querySelector('.exercise-section');
const tip = document.querySelector('.tip');
const game = document.querySelector('.game-screen');
const result = document.querySelector('.result-screen');
const memoryScreen = document.querySelector('.memory-screen');
const wordsScreen = document.querySelector('.words-screen');
const changeScreen = document.querySelector('.change-screen');
const lettersScreen = document.querySelector('.letters-screen');
const pairsScreen = document.querySelector('.pairs-screen');
const historyScreen = document.querySelector('.history-screen');
const activeExerciseTitle = document.querySelector('#active-exercise-title');
const equation = document.querySelector('.equation');
const answers = document.querySelector('#answers');
const feedback = document.querySelector('#answer-feedback');
const questionNumber = document.querySelector('#question-number');
const mistakesNumber = document.querySelector('#mistakes-number');
const progressBar = document.querySelector('#progress-bar');
const TOTAL_QUESTIONS = 10;
let questions = [];
let currentQuestion = 0;
let mistakes = 0;
let advanceTimer;
let activeExercise = 'count';
let memoryRound = 0;
let memoryMistakes = 0;
let wordsRound = 0;
let wordsMistakes = 0;
let memorySequence = [];
let wordsSequence = [];
let changeRound = 0;
let changeMistakes = 0;
let changeSequence = [];
let lettersRound = 0;
let lettersMistakes = 0;
let lettersSequence = [];
let pairsRound = 0;
let pairsMistakes = 0;
let pairsSequence = [];
let selectedPairCards = [];
let matchedPairs = 0;
let pairsLocked = false;
let pairsPreview = false;
let activeSession;
let sessionWriteQueue = Promise.resolve();
let countRoundHadMistake = false;
let memoryRoundHadMistake = false;
let wordsRoundHadMistake = false;
let changeRoundHadMistake = false;
let lettersRoundHadMistake = false;
let pairsRoundHadMistake = false;

const historyDatabase = new Promise((resolve, reject) => {
  const request = indexedDB.open('agiliko-history', 1);
  request.onupgradeneeded = () => request.result.createObjectStore('sessions', { keyPath: 'id' });
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error);
});

function saveSessionSnapshot(session) {
  const snapshot = { ...session };
  sessionWriteQueue = sessionWriteQueue.then(async () => {
    const db = await historyDatabase;
    await new Promise((resolve, reject) => {
      const transaction = db.transaction('sessions', 'readwrite');
      transaction.objectStore('sessions').put(snapshot);
      transaction.oncomplete = resolve;
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
  });
  return sessionWriteQueue;
}

function beginSession(exercise) {
  const now = new Date().toISOString();
  activeSession = { id: crypto.randomUUID(), exercise, total: TOTAL_QUESTIONS, completed: 0, successful: 0, mistakes: 0, startedAt: now, completedAt: now, status: 'in_progress' };
  return saveSessionSnapshot(activeSession);
}

function updateActiveSession(completed, successful, mistakes) {
  if (!activeSession) return Promise.resolve();
  activeSession = { ...activeSession, completed, successful, mistakes, completedAt: new Date().toISOString() };
  return saveSessionSnapshot(activeSession);
}

function closeSession(status, completed, successful, mistakes) {
  if (!activeSession) return;
  const session = { ...activeSession, completed, successful, mistakes, status, completedAt: new Date().toISOString() };
  activeSession = undefined;
  return saveSessionSnapshot(session);
}

function abandonActiveSession() {
  if (!activeSession) return;
  const progress = activeExercise === 'memory' ? memoryRound : activeExercise === 'words' ? wordsRound : activeExercise === 'change' ? changeRound : activeExercise === 'letters' ? lettersRound : activeExercise === 'pairs' ? pairsRound : currentQuestion;
  const errors = activeExercise === 'memory' ? memoryMistakes : activeExercise === 'words' ? wordsMistakes : activeExercise === 'change' ? changeMistakes : activeExercise === 'letters' ? lettersMistakes : activeExercise === 'pairs' ? pairsMistakes : mistakes;
  return closeSession('abandoned', progress, activeSession.successful, errors);
}

async function showHistory() {
  window.clearTimeout(advanceTimer);
  activeExerciseTitle.hidden = true;
  home.hidden = true; tip.hidden = true; game.hidden = true; result.hidden = true; memoryScreen.hidden = true; wordsScreen.hidden = true; changeScreen.hidden = true; lettersScreen.hidden = true; pairsScreen.hidden = true; historyScreen.hidden = false;
  await sessionWriteQueue;
  const db = await historyDatabase;
  const request = db.transaction('sessions', 'readonly').objectStore('sessions').getAll();
  request.onsuccess = () => {
    const sessions = request.result.sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt));
    const list = document.querySelector('#history-list'); const empty = document.querySelector('#history-empty');
    list.innerHTML = ''; empty.hidden = sessions.length !== 0;
    sessions.forEach(session => {
      const date = new Intl.DateTimeFormat('ru-RU', { dateStyle: 'long', timeStyle: 'short' }).format(new Date(session.completedAt || session.startedAt));
      const item = document.createElement('article'); item.className = 'history-item';
      const status = session.status !== 'completed' && session.status !== undefined ? '<em>Не завершено</em>' : '';
      const completed = session.completed ?? session.successful;
      item.innerHTML = `<div><h2>${session.exercise} ${status}</h2><p>${date}</p></div><div class="history-stats"><span><b>${completed} из ${session.total}</b> пройдено</span><span><b>${session.successful}</b> успешно</span><span><b>${session.mistakes}</b> ошибок</span></div>`;
      list.append(item);
    });
  };
}
const memoryPictures = [
  { icon: '🍎', name: 'яблоко' }, { icon: '🔑', name: 'ключ' }, { icon: '☕', name: 'чашка' },
  { icon: '🌼', name: 'цветок' }, { icon: '⌚', name: 'часы' }, { icon: '☂️', name: 'зонт' },
  { icon: '🐈', name: 'кошка' }, { icon: '🚲', name: 'велосипед' }, { icon: '📘', name: 'книга' },
  { icon: '🥖', name: 'хлеб' }, { icon: '👓', name: 'очки' }, { icon: '⚽', name: 'мяч' },
  { icon: '🍌', name: 'банан' }, { icon: '🍓', name: 'клубника' }, { icon: '🥕', name: 'морковь' },
  { icon: '🧤', name: 'перчатка' }, { icon: '🧢', name: 'кепка' }, { icon: '🧦', name: 'носок' },
  { icon: '🪥', name: 'зубная щётка' }, { icon: '🕯️', name: 'свеча' }, { icon: '🧸', name: 'игрушка' },
  { icon: '🎈', name: 'шарик' }, { icon: '🎁', name: 'подарок' }, { icon: '🧩', name: 'пазл' },
  { icon: '🪴', name: 'растение' }, { icon: '🍽️', name: 'тарелка' }, { icon: '🧼', name: 'мыло' },
  { icon: '🧳', name: 'чемодан' }, { icon: '📞', name: 'телефон' }, { icon: '🔔', name: 'звонок' }
];
let rememberedPictures = [];

function random(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function shuffle(items) {
  return [...items].sort(() => Math.random() - 0.5);
}

function createNewSequence(storageKey, count) {
  let sequence = shuffle(memoryPictures).slice(0, count);
  const previous = localStorage.getItem(storageKey);
  let signature = sequence.map(item => item.name).join('|');
  while (signature === previous) {
    sequence = shuffle(memoryPictures).slice(0, count);
    signature = sequence.map(item => item.name).join('|');
  }
  localStorage.setItem(storageKey, signature);
  return sequence;
}

function createQuestion(operation) {
  let left, right, answer, symbol;
  if (operation === 'add') {
    left = random(5, 39); right = random(5, 39); answer = left + right; symbol = '+';
  } else if (operation === 'subtract') {
    left = random(18, 70); right = random(3, left - 2); answer = left - right; symbol = '−';
  } else if (operation === 'multiply') {
    left = random(2, 10); right = random(2, 10); answer = left * right; symbol = '×';
  } else {
    right = random(2, 10); answer = random(2, 10); left = right * answer; symbol = '÷';
  }
  const alternatives = new Set([answer]);
  while (alternatives.size < 4) {
    const shift = random(1, Math.max(3, Math.round(answer * .35))) * (Math.random() < .5 ? -1 : 1);
    const option = answer + shift;
    if (option > 0) alternatives.add(option);
  }
  return { text: `${left} ${symbol} ${right}`, answer, options: shuffle([...alternatives]) };
}

function createExercise() {
  const operations = shuffle(['add', 'subtract', 'multiply', 'divide', 'add', 'subtract', 'multiply', 'divide', 'add', 'subtract']);
  return operations.map(createQuestion);
}

function showHome() {
  window.clearTimeout(advanceTimer);
  abandonActiveSession();
  activeExerciseTitle.hidden = true;
  game.hidden = true; result.hidden = true; memoryScreen.hidden = true; wordsScreen.hidden = true; changeScreen.hidden = true; lettersScreen.hidden = true; pairsScreen.hidden = true; historyScreen.hidden = true; home.hidden = false; tip.hidden = false;
}

function startExercise() {
  window.clearTimeout(advanceTimer);
  activeExercise = 'count';
  activeExerciseTitle.textContent = 'Быстрый счёт';
  questions = createExercise(); currentQuestion = 0; mistakes = 0; countRoundHadMistake = false;
  activeExerciseTitle.hidden = false;
  beginSession('Быстрый счёт');
  home.hidden = true; tip.hidden = true; result.hidden = true; memoryScreen.hidden = true; wordsScreen.hidden = true; changeScreen.hidden = true; lettersScreen.hidden = true; game.hidden = false;
  renderQuestion();
}

function renderQuestion() {
  countRoundHadMistake = false;
  const question = questions[currentQuestion];
  equation.textContent = question.text;
  questionNumber.textContent = currentQuestion + 1;
  mistakesNumber.textContent = mistakes;
  progressBar.style.width = `${(currentQuestion / TOTAL_QUESTIONS) * 100}%`;
  feedback.textContent = '';
  feedback.className = 'answer-feedback';
  answers.innerHTML = '';
  answers.classList.remove('is-answered');
  question.options.forEach(option => {
    const button = document.createElement('button');
    button.className = 'answer-button'; button.type = 'button'; button.textContent = option;
    button.addEventListener('click', () => chooseAnswer(button, option));
    answers.append(button);
  });
}

function chooseAnswer(button, option) {
  const question = questions[currentQuestion];
  if (option !== question.answer) {
    if (!button.classList.contains('is-wrong')) mistakes += 1;
    button.classList.add('is-wrong'); button.disabled = true;
    mistakesNumber.textContent = mistakes;
    feedback.textContent = 'Неверно. Попробуйте ещё раз.';
    feedback.className = 'answer-feedback is-wrong';
    countRoundHadMistake = true;
    updateActiveSession(currentQuestion, activeSession.successful, mistakes);
    return;
  }
  answers.querySelectorAll('button').forEach(item => item.disabled = true);
  answers.classList.add('is-answered');
  button.classList.add('is-correct');
  feedback.textContent = 'Верно! Отличная работа.';
  feedback.className = 'answer-feedback is-correct';
  progressBar.style.width = `${((currentQuestion + 1) / TOTAL_QUESTIONS) * 100}%`;
  updateActiveSession(currentQuestion + 1, activeSession.successful + (countRoundHadMistake ? 0 : 1), mistakes);
  advanceTimer = window.setTimeout(() => {
    currentQuestion += 1;
    currentQuestion === TOTAL_QUESTIONS ? finishExercise() : renderQuestion();
  }, 1300);
}

function finishExercise() {
  game.hidden = true; result.hidden = false;
  closeSession('completed', TOTAL_QUESTIONS, activeSession.successful, mistakes);
  const flawless = mistakes === 0;
  document.querySelector('#result-title').textContent = flawless ? 'Прекрасно!' : 'Упражнение пройдено!';
  document.querySelector('#result-description').textContent = flawless
    ? 'Вы решили все 10 примеров без ошибок. Так держать!'
    : 'Вы дошли до конца — это уже отличный результат.';
  document.querySelector('#result-correct-number').textContent = TOTAL_QUESTIONS;
  document.querySelector('#result-mistakes-number').textContent = mistakes;
}

document.querySelector('[data-exercise="fast-count"]')?.addEventListener('click', startExercise);
function startMemoryExercise() {
  window.clearTimeout(advanceTimer);
  activeExercise = 'memory';
  memoryRoundHadMistake = false;
  if (!memoryScreen.hidden && memoryRound === TOTAL_QUESTIONS) {
    finishMemoryExercise();
    return;
  }
  activeExerciseTitle.textContent = 'Предметы и порядок';
  activeExerciseTitle.hidden = false;
  home.hidden = true; tip.hidden = true; game.hidden = true; result.hidden = true; wordsScreen.hidden = true; changeScreen.hidden = true; lettersScreen.hidden = true; memoryScreen.hidden = false;
  rememberedPictures = memorySequence.slice(memoryRound * 3, memoryRound * 3 + 3);
  const memoryItems = document.querySelector('#memory-items');
  memoryItems.classList.remove('is-hidden');
  memoryItems.innerHTML = rememberedPictures.map((item, index) => `<div class="memory-picture"><i>${index + 1}</i><span>${item.icon}</span><b>${item.name}</b></div>`).join('');
  document.querySelector('#memory-ready').hidden = false;
  document.querySelector('#memory-question').hidden = true;
  document.querySelector('#memory-title').textContent = 'Запомните эти картинки';
  document.querySelector('.memory-instruction').hidden = false;
  document.querySelector('#memory-round').textContent = memoryRound + 1;
  document.querySelector('#memory-mistakes').textContent = memoryMistakes;
  document.querySelector('#memory-progress').style.width = `${(memoryRound / TOTAL_QUESTIONS) * 100}%`;
}

function askMemoryQuestion() {
  const options = shuffle([
    ...rememberedPictures,
    ...shuffle(memoryPictures.filter(item => !rememberedPictures.includes(item))).slice(0, 9)
  ]);
  document.querySelector('#memory-items').classList.add('is-hidden');
  document.querySelector('#memory-ready').hidden = true;
  document.querySelector('#memory-question').hidden = false;
  document.querySelector('#memory-title').textContent = 'Выберите предметы по порядку';
  document.querySelector('.memory-instruction').hidden = true;
  const list = document.querySelector('#memory-options');
  const feedback = document.querySelector('#memory-feedback');
  const selection = [];
  feedback.textContent = ''; feedback.className = 'answer-feedback';
  list.classList.remove('is-answered');
  list.innerHTML = '';
  options.forEach(item => {
    const button = document.createElement('button');
    button.className = 'memory-option'; button.type = 'button';
    button.innerHTML = `<span>${item.icon}</span><b>${item.name}</b>`;
    button.addEventListener('click', () => {
      if (button.disabled || selection.length === 3) return;
      const expected = rememberedPictures[selection.length];
      selection.push(item); button.classList.add('is-selected');
      button.insertAdjacentHTML('beforeend', `<i class="selection-order">${selection.length}</i>`);
      if (item !== expected) {
        list.querySelectorAll('button').forEach(choice => choice.disabled = true);
        button.classList.remove('is-selected'); button.classList.add('is-wrong');
        memoryMistakes += 1; document.querySelector('#memory-mistakes').textContent = memoryMistakes;
        memoryRoundHadMistake = true;
        updateActiveSession(memoryRound, activeSession.successful, memoryMistakes);
        feedback.textContent = 'Неверно. Попробуйте ещё раз.'; feedback.className = 'answer-feedback is-wrong';
        advanceTimer = window.setTimeout(askMemoryQuestion, 1800);
        return;
      }
      button.classList.add('is-correct');
      if (selection.length !== 3) return;
      list.querySelectorAll('button').forEach(choice => choice.disabled = true);
      list.classList.add('is-answered');
      feedback.textContent = 'Верно! Отличная память.'; feedback.className = 'answer-feedback is-correct';
      document.querySelector('#memory-progress').style.width = `${((memoryRound + 1) / TOTAL_QUESTIONS) * 100}%`;
      updateActiveSession(memoryRound + 1, activeSession.successful + (memoryRoundHadMistake ? 0 : 1), memoryMistakes);
      advanceTimer = window.setTimeout(() => { memoryRound += 1; memoryRound === TOTAL_QUESTIONS ? finishMemoryExercise() : startMemoryExercise(); }, 1500);
    });
    list.append(button);
  });
}
function beginMemoryExercise() { memoryRound = 0; memoryMistakes = 0; memorySequence = createNewSequence('agiliko-memory-order', TOTAL_QUESTIONS * 3); beginSession('Предметы и порядок'); startMemoryExercise(); }
function finishMemoryExercise() {
  memoryScreen.hidden = true; result.hidden = false;
  closeSession('completed', TOTAL_QUESTIONS, activeSession.successful, memoryMistakes);
  const flawless = memoryMistakes === 0;
  document.querySelector('#result-title').textContent = flawless ? 'Прекрасно!' : 'Упражнение пройдено!';
  document.querySelector('#result-description').textContent = flawless ? 'Вы запомнили все 10 наборов без ошибок. Так держать!' : 'Вы прошли все 10 заданий на память.';
  document.querySelector('#result-correct-number').textContent = TOTAL_QUESTIONS;
  document.querySelector('#result-mistakes-number').textContent = memoryMistakes;
}
document.querySelector('[data-exercise="memory"]')?.addEventListener('click', beginMemoryExercise);
document.querySelector('#memory-ready')?.addEventListener('click', askMemoryQuestion);
function beginWordsExercise() { wordsRound = 0; wordsMistakes = 0; wordsSequence = createNewSequence('agiliko-words-order', TOTAL_QUESTIONS); beginSession('Отгадай предмет'); startWordsRound(); }
function startWordsRound() {
  activeExercise = 'words'; activeExerciseTitle.textContent = 'Отгадай предмет'; activeExerciseTitle.hidden = false;
  wordsRoundHadMistake = false;
  home.hidden = true; tip.hidden = true; game.hidden = true; result.hidden = true; memoryScreen.hidden = true; changeScreen.hidden = true; lettersScreen.hidden = true; wordsScreen.hidden = false;
  const item = wordsSequence[wordsRound];
  const options = shuffle([item, ...shuffle(memoryPictures.filter(other => other !== item)).slice(0, 5)]);
  document.querySelector('#words-round').textContent = wordsRound + 1;
  document.querySelector('#words-mistakes').textContent = wordsMistakes;
  document.querySelector('#words-progress').style.width = `${(wordsRound / TOTAL_QUESTIONS) * 100}%`;
  document.querySelector('#word-picture').innerHTML = `<span>${item.icon}</span>`;
  const list = document.querySelector('#word-options'); const feedback = document.querySelector('#words-feedback');
  feedback.textContent = ''; feedback.className = 'answer-feedback'; list.classList.remove('is-answered'); list.innerHTML = '';
  options.forEach(option => {
    const button = document.createElement('button'); button.type = 'button'; button.className = 'word-option'; button.textContent = option.name;
    button.addEventListener('click', () => {
      if (option !== item) {
        button.disabled = true; button.classList.add('is-wrong'); wordsMistakes += 1;
        document.querySelector('#words-mistakes').textContent = wordsMistakes;
        wordsRoundHadMistake = true;
        updateActiveSession(wordsRound, activeSession.successful, wordsMistakes);
        feedback.textContent = 'Неверно. Попробуйте ещё раз.'; feedback.className = 'answer-feedback is-wrong'; return;
      }
      list.querySelectorAll('button').forEach(choice => choice.disabled = true); list.classList.add('is-answered'); button.classList.add('is-correct');
      feedback.textContent = 'Верно! Отличная работа.'; feedback.className = 'answer-feedback is-correct';
      document.querySelector('#words-progress').style.width = `${((wordsRound + 1) / TOTAL_QUESTIONS) * 100}%`;
      updateActiveSession(wordsRound + 1, activeSession.successful + (wordsRoundHadMistake ? 0 : 1), wordsMistakes);
      advanceTimer = window.setTimeout(() => { wordsRound += 1; wordsRound === TOTAL_QUESTIONS ? finishWordsExercise() : startWordsRound(); }, 1300);
    });
    list.append(button);
  });
}
function finishWordsExercise() {
  wordsScreen.hidden = true; result.hidden = false;
  closeSession('completed', TOTAL_QUESTIONS, activeSession.successful, wordsMistakes);
  const flawless = wordsMistakes === 0;
  document.querySelector('#result-title').textContent = flawless ? 'Прекрасно!' : 'Упражнение пройдено!';
  document.querySelector('#result-description').textContent = flawless ? 'Вы правильно назвали все 10 предметов. Так держать!' : 'Вы прошли все 10 заданий со словами.';
  document.querySelector('#result-correct-number').textContent = TOTAL_QUESTIONS;
  document.querySelector('#result-mistakes-number').textContent = wordsMistakes;
}
document.querySelector('[data-exercise="words"]')?.addEventListener('click', beginWordsExercise);
function createChangeQuestion() {
  const paid = [100, 200, 500][random(0, 2)];
  const prices = paid === 100 ? [25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80] : paid === 200 ? [70, 80, 90, 110, 120, 130, 140, 150, 160, 170] : [150, 200, 250, 300, 350, 400, 450];
  const price = prices[random(0, prices.length - 1)]; const answer = paid - price;
  const values = new Set([answer]);
  while (values.size < 4) { const value = answer + random(-30, 30); if (value >= 0 && value !== answer) values.add(value); }
  return { paid, price, answer, options: shuffle([...values]) };
}
function createChangeSequence() {
  const sequence = []; const used = new Set();
  while (sequence.length < TOTAL_QUESTIONS) {
    const question = createChangeQuestion();
    const key = `${question.price}-${question.paid}`;
    if (!used.has(key)) { used.add(key); sequence.push(question); }
  }
  return sequence;
}
function beginChangeExercise() { changeRound = 0; changeMistakes = 0; changeSequence = createChangeSequence(); beginSession('Сдача в магазине'); startChangeRound(); }
function startChangeRound() {
  activeExercise = 'change'; activeExerciseTitle.textContent = 'Сдача в магазине'; activeExerciseTitle.hidden = false;
  changeRoundHadMistake = false;
  home.hidden = true; tip.hidden = true; game.hidden = true; result.hidden = true; memoryScreen.hidden = true; wordsScreen.hidden = true; lettersScreen.hidden = true; changeScreen.hidden = false;
  const question = changeSequence[changeRound];
  document.querySelector('#change-round').textContent = changeRound + 1; document.querySelector('#change-mistakes').textContent = changeMistakes;
  document.querySelector('#change-progress').style.width = `${(changeRound / TOTAL_QUESTIONS) * 100}%`;
  document.querySelector('#change-story').innerHTML = `<p>Покупка стоит <strong>${question.price} ₽</strong></p><p>Вы заплатили <strong>${question.paid} ₽</strong></p>`;
  const list = document.querySelector('#change-options'); const feedback = document.querySelector('#change-feedback'); list.innerHTML = ''; list.classList.remove('is-answered'); feedback.textContent = ''; feedback.className = 'answer-feedback';
  question.options.forEach(option => { const button = document.createElement('button'); button.className = 'change-option'; button.type = 'button'; button.textContent = `${option} ₽`; button.addEventListener('click', () => {
    if (option !== question.answer) { button.disabled = true; button.classList.add('is-wrong'); changeMistakes += 1; document.querySelector('#change-mistakes').textContent = changeMistakes; feedback.textContent = 'Неверно. Попробуйте ещё раз.'; feedback.className = 'answer-feedback is-wrong'; changeRoundHadMistake = true; updateActiveSession(changeRound, activeSession.successful, changeMistakes); return; }
    list.querySelectorAll('button').forEach(item => item.disabled = true); list.classList.add('is-answered'); button.classList.add('is-correct'); feedback.textContent = 'Верно! Отличная работа.'; feedback.className = 'answer-feedback is-correct'; document.querySelector('#change-progress').style.width = `${((changeRound + 1) / TOTAL_QUESTIONS) * 100}%`; updateActiveSession(changeRound + 1, activeSession.successful + (changeRoundHadMistake ? 0 : 1), changeMistakes); advanceTimer = window.setTimeout(() => { changeRound += 1; changeRound === TOTAL_QUESTIONS ? finishChangeExercise() : startChangeRound(); }, 1300);
  }); list.append(button); });
}
function finishChangeExercise() { changeScreen.hidden = true; result.hidden = false; closeSession('completed', TOTAL_QUESTIONS, activeSession.successful, changeMistakes); const flawless = changeMistakes === 0; document.querySelector('#result-title').textContent = flawless ? 'Прекрасно!' : 'Упражнение пройдено!'; document.querySelector('#result-description').textContent = flawless ? 'Вы правильно посчитали всю сдачу. Так держать!' : 'Вы прошли 10 заданий со сдачей.'; document.querySelector('#result-correct-number').textContent = TOTAL_QUESTIONS; document.querySelector('#result-mistakes-number').textContent = changeMistakes; }
document.querySelector('[data-exercise="change"]')?.addEventListener('click', beginChangeExercise);

const letterGroups = [
  {
    adjectives: ['большой', 'маленький', 'зелёный', 'высокий', 'тёплый', 'холодный', 'новый', 'старый', 'добрый', 'весёлый'],
    nouns: [['д_м', 'о'], ['с_д', 'а'], ['л_с', 'е'], ['ст_л', 'о'], ['к_т', 'о'], ['хл_б', 'е'], ['ч_й', 'а'], ['ш_р', 'а'], ['кл_ч', 'ю'], ['м_ст', 'о']]
  },
  {
    adjectives: ['большая', 'маленькая', 'зелёная', 'высокая', 'тёплая', 'холодная', 'новая', 'старая', 'добрая', 'весёлая'],
    nouns: [['книг_', 'а'], ['р_ка', 'е'], ['л_мпа', 'а'], ['к_шка', 'о'], ['шк_ла', 'о'], ['д_рога', 'о'], ['ч_шка', 'а'], ['с_мка', 'у'], ['з_ма', 'и'], ['н_чь', 'о']]
  },
  {
    adjectives: ['большое', 'маленькое', 'зелёное', 'высокое', 'тёплое', 'холодное', 'новое', 'старое', 'доброе', 'весёлое'],
    nouns: [['м_ре', 'о'], ['п_ле', 'о'], ['_кно', 'о'], ['ябл_ко', 'о'], ['д_рево', 'е'], ['кр_сло', 'е'], ['с_лнце', 'о'], ['_зеро', 'о'], ['пл_тье', 'а'], ['п_сьмо', 'и']]
  }
];

const answerLetters = ['а', 'е', 'и', 'о', 'у', 'ю'];
const letterExamples = letterGroups.flatMap(group => group.adjectives.flatMap(adjective => group.nouns.map(([noun, answer]) => ({
  text: `${adjective} ${noun}`,
  answer,
  options: [answer, ...shuffle(answerLetters.filter(letter => letter !== answer)).slice(0, 3)]
}))));

function createLetterSequence() {
  const previous = JSON.parse(localStorage.getItem('agiliko-letters-previous') || '[]');
  const available = letterExamples.filter(question => !previous.includes(question.text));
  const sequence = shuffle(available.length >= TOTAL_QUESTIONS ? available : letterExamples).slice(0, TOTAL_QUESTIONS);
  localStorage.setItem('agiliko-letters-previous', JSON.stringify(sequence.map(question => question.text)));
  return sequence;
}

function beginLettersExercise() {
  lettersRound = 0; lettersMistakes = 0; lettersRoundHadMistake = false;
  lettersSequence = createLetterSequence();
  beginSession('Вставь букву');
  startLettersRound();
}

function startLettersRound() {
  activeExercise = 'letters'; lettersRoundHadMistake = false;
  activeExerciseTitle.textContent = 'Вставь букву'; activeExerciseTitle.hidden = false;
  home.hidden = true; tip.hidden = true; game.hidden = true; result.hidden = true; memoryScreen.hidden = true; wordsScreen.hidden = true; changeScreen.hidden = true; lettersScreen.hidden = false;
  const question = lettersSequence[lettersRound];
  document.querySelector('#letters-round').textContent = lettersRound + 1;
  document.querySelector('#letters-mistakes').textContent = lettersMistakes;
  document.querySelector('#letters-progress').style.width = `${(lettersRound / TOTAL_QUESTIONS) * 100}%`;
  document.querySelector('#letters-word').textContent = question.text;
  const list = document.querySelector('#letters-options'); const feedback = document.querySelector('#letters-feedback');
  list.innerHTML = ''; list.classList.remove('is-answered'); feedback.textContent = ''; feedback.className = 'answer-feedback';
  shuffle(question.options).forEach(option => {
    const button = document.createElement('button'); button.type = 'button'; button.className = 'letter-option'; button.textContent = option;
    button.addEventListener('click', () => {
      if (option !== question.answer) {
        button.disabled = true; button.classList.add('is-wrong'); lettersMistakes += 1; lettersRoundHadMistake = true;
        document.querySelector('#letters-mistakes').textContent = lettersMistakes;
        feedback.textContent = 'Неверно. Попробуйте ещё раз.'; feedback.className = 'answer-feedback is-wrong';
        updateActiveSession(lettersRound, activeSession.successful, lettersMistakes);
        return;
      }
      list.querySelectorAll('button').forEach(item => item.disabled = true); list.classList.add('is-answered'); button.classList.add('is-correct');
      feedback.textContent = 'Верно! Отличная работа.'; feedback.className = 'answer-feedback is-correct';
      document.querySelector('#letters-progress').style.width = `${((lettersRound + 1) / TOTAL_QUESTIONS) * 100}%`;
      updateActiveSession(lettersRound + 1, activeSession.successful + (lettersRoundHadMistake ? 0 : 1), lettersMistakes);
      advanceTimer = window.setTimeout(() => { lettersRound += 1; lettersRound === TOTAL_QUESTIONS ? finishLettersExercise() : startLettersRound(); }, 1300);
    });
    list.append(button);
  });
}

function finishLettersExercise() {
  lettersScreen.hidden = true; result.hidden = false;
  closeSession('completed', TOTAL_QUESTIONS, activeSession.successful, lettersMistakes);
  const flawless = lettersMistakes === 0;
  document.querySelector('#result-title').textContent = flawless ? 'Прекрасно!' : 'Упражнение пройдено!';
  document.querySelector('#result-description').textContent = flawless ? 'Вы правильно вставили все буквы. Так держать!' : 'Вы прошли 10 заданий со словами.';
  document.querySelector('#result-correct-number').textContent = TOTAL_QUESTIONS;
  document.querySelector('#result-mistakes-number').textContent = lettersMistakes;
}

document.querySelector('[data-exercise="letters"]')?.addEventListener('click', beginLettersExercise);

function beginPairsExercise() {
  pairsRound = 0; pairsMistakes = 0; pairsRoundHadMistake = false;
  pairsSequence = createNewSequence('agiliko-pairs-order', TOTAL_QUESTIONS * 3);
  beginSession('Найди пару');
  startPairsRound();
}

function startPairsRound() {
  activeExercise = 'pairs'; pairsRoundHadMistake = false; selectedPairCards = []; matchedPairs = 0; pairsLocked = false; pairsPreview = true;
  activeExerciseTitle.textContent = 'Найди пару'; activeExerciseTitle.hidden = false;
  home.hidden = true; tip.hidden = true; game.hidden = true; result.hidden = true; memoryScreen.hidden = true; wordsScreen.hidden = true; changeScreen.hidden = true; lettersScreen.hidden = true; pairsScreen.hidden = false;
  document.querySelector('#pairs-round').textContent = pairsRound + 1;
  document.querySelector('#pairs-mistakes').textContent = pairsMistakes;
  document.querySelector('#pairs-progress').style.width = `${(pairsRound / TOTAL_QUESTIONS) * 100}%`;
  const pictures = pairsSequence.slice(pairsRound * 3, pairsRound * 3 + 3);
  const deck = shuffle([...pictures, ...pictures]);
  const grid = document.querySelector('#pairs-grid'); const feedback = document.querySelector('#pairs-feedback');
  document.querySelector('#pairs-status').textContent = 'Запомните, где находятся предметы';
  document.querySelector('#pairs-ready').hidden = false;
  grid.innerHTML = ''; feedback.textContent = ''; feedback.className = 'answer-feedback';
  deck.forEach((picture, index) => {
    const card = document.createElement('button'); card.type = 'button'; card.className = 'pair-card is-open';
    card.dataset.pair = picture.name; card.dataset.index = index; card.innerHTML = `<span>${picture.icon}</span>`;
    card.addEventListener('click', () => choosePairCard(card));
    grid.append(card);
  });
}

function choosePairCard(card) {
  if (pairsPreview || pairsLocked || !card.classList.contains('is-covered')) return;
  card.classList.remove('is-covered'); card.classList.add('is-open'); selectedPairCards.push(card);
  if (selectedPairCards.length !== 2) return;
  pairsLocked = true;
  const [first, second] = selectedPairCards;
  const feedback = document.querySelector('#pairs-feedback');
  if (first.dataset.pair === second.dataset.pair) {
    first.classList.add('is-correct'); second.classList.add('is-correct'); matchedPairs += 1; selectedPairCards = [];
    const remaining = 3 - matchedPairs;
    document.querySelector('#pairs-status').textContent = `Найдено: ${matchedPairs} из 3. Осталось: ${remaining}`;
    feedback.textContent = remaining ? 'Пара найдена. Найдите следующую.' : 'Все пары найдены!'; feedback.className = 'answer-feedback is-correct';
    advanceTimer = window.setTimeout(() => {
      pairsLocked = false;
      if (matchedPairs !== 3) return;
      document.querySelector('#pairs-progress').style.width = `${((pairsRound + 1) / TOTAL_QUESTIONS) * 100}%`;
      updateActiveSession(pairsRound + 1, activeSession.successful + (pairsRoundHadMistake ? 0 : 1), pairsMistakes);
      advanceTimer = window.setTimeout(() => { pairsRound += 1; pairsRound === TOTAL_QUESTIONS ? finishPairsExercise() : startPairsRound(); }, 1100);
    }, 500);
    return;
  }
  first.classList.add('is-wrong'); second.classList.add('is-wrong'); pairsMistakes += 1; pairsRoundHadMistake = true;
  document.querySelector('#pairs-mistakes').textContent = pairsMistakes;
  feedback.textContent = 'Это не пара. Попробуйте ещё раз.'; feedback.className = 'answer-feedback is-wrong';
  updateActiveSession(pairsRound, activeSession.successful, pairsMistakes);
  advanceTimer = window.setTimeout(() => { first.className = 'pair-card is-covered'; second.className = 'pair-card is-covered'; selectedPairCards = []; pairsLocked = false; }, 1250);
}

function beginPairsSearch() {
  pairsPreview = false;
  document.querySelector('#pairs-ready').hidden = true;
  document.querySelector('#pairs-status').textContent = 'Найдено: 0 из 3. Осталось: 3';
  document.querySelectorAll('#pairs-grid .pair-card').forEach(card => { card.className = 'pair-card is-covered'; });
}

function finishPairsExercise() {
  pairsScreen.hidden = true; result.hidden = false;
  closeSession('completed', TOTAL_QUESTIONS, activeSession.successful, pairsMistakes);
  const flawless = pairsMistakes === 0;
  document.querySelector('#result-title').textContent = flawless ? 'Прекрасно!' : 'Упражнение пройдено!';
  document.querySelector('#result-description').textContent = flawless ? 'Вы нашли все пары без ошибок. Так держать!' : 'Вы нашли пары во всех 10 заданиях.';
  document.querySelector('#result-correct-number').textContent = TOTAL_QUESTIONS;
  document.querySelector('#result-mistakes-number').textContent = pairsMistakes;
}

document.querySelector('[data-exercise="pairs"]')?.addEventListener('click', beginPairsExercise);
document.querySelector('#pairs-ready')?.addEventListener('click', beginPairsSearch);
document.querySelectorAll('[data-action="home"]').forEach(button => button.addEventListener('click', showHome));
document.querySelector('[data-action="history"]')?.addEventListener('click', async () => { await abandonActiveSession(); showHistory(); });
document.querySelector('[data-action="restart"]')?.addEventListener('click', () => activeExercise === 'memory' ? beginMemoryExercise() : activeExercise === 'words' ? beginWordsExercise() : activeExercise === 'change' ? beginChangeExercise() : activeExercise === 'letters' ? beginLettersExercise() : activeExercise === 'pairs' ? beginPairsExercise() : startExercise());

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js'));
}
