const home = document.querySelector('.exercise-section');
const tip = document.querySelector('.tip');
const game = document.querySelector('.game-screen');
const result = document.querySelector('.result-screen');
const memoryScreen = document.querySelector('.memory-screen');
const wordsScreen = document.querySelector('.words-screen');
const changeScreen = document.querySelector('.change-screen');
const lettersScreen = document.querySelector('.letters-screen');
const guessWordScreen = document.querySelector('.guess-word-screen');
const pairsScreen = document.querySelector('.pairs-screen');
const oddScreen = document.querySelector('.odd-screen');
const categoryScreen = document.querySelector('.category-screen');
const sequenceScreen = document.querySelector('.sequence-screen');
const mazeScreen = document.querySelector('.maze-screen');
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
let oddRound = 0, oddMistakes = 0, oddSequence = [], oddHadMistake = false;
let pairsPreview = false;
let activeSession;
let sessionWriteQueue = Promise.resolve();
let countRoundHadMistake = false;
let memoryRoundHadMistake = false;
let wordsRoundHadMistake = false;
let changeRoundHadMistake = false;
let lettersRoundHadMistake = false;
let guessWordRound = 0;
let guessWordMistakes = 0;
let guessWordSequence = [];
let guessWordMissingIndex = 0;
let guessWordRoundHadMistake = false;
let pairsRoundHadMistake = false;
let categoryRound = 0, categoryMistakes = 0, categorySequence = [], categoryRoundHadMistake = false;
let sequenceRound = 0, sequenceMistakes = 0, sequenceItems = [], sequenceRoundHadMistake = false;
let mazeRound = 0, mazeMistakes = 0, mazeItems = [], mazeRoundHadMistake = false;

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
  const progress = activeExercise === 'maze' ? mazeRound : activeExercise === 'category' ? categoryRound : activeExercise === 'sequence' ? sequenceRound : activeExercise === 'odd' ? oddRound : activeExercise === 'memory' ? memoryRound : activeExercise === 'words' ? wordsRound : activeExercise === 'change' ? changeRound : activeExercise === 'letters' ? lettersRound : activeExercise === 'guess-word' ? guessWordRound : activeExercise === 'pairs' ? pairsRound : currentQuestion;
  const errors = activeExercise === 'maze' ? mazeMistakes : activeExercise === 'category' ? categoryMistakes : activeExercise === 'sequence' ? sequenceMistakes : activeExercise === 'odd' ? oddMistakes : activeExercise === 'memory' ? memoryMistakes : activeExercise === 'words' ? wordsMistakes : activeExercise === 'change' ? changeMistakes : activeExercise === 'letters' ? lettersMistakes : activeExercise === 'guess-word' ? guessWordMistakes : activeExercise === 'pairs' ? pairsMistakes : mistakes;
  return closeSession('abandoned', progress, activeSession.successful, errors);
}

async function showHistory() {
  window.clearTimeout(advanceTimer);
  activeExerciseTitle.hidden = true;
  home.hidden = true; tip.hidden = true; game.hidden = true; result.hidden = true; memoryScreen.hidden = true; wordsScreen.hidden = true; changeScreen.hidden = true; lettersScreen.hidden = true; guessWordScreen.hidden = true; pairsScreen.hidden = true; oddScreen.hidden = true; categoryScreen.hidden = true; sequenceScreen.hidden = true; mazeScreen.hidden = true; historyScreen.hidden = false;
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
  { icon: '🧳', name: 'чемодан' }, { icon: '📞', name: 'телефон' }, { icon: '🔔', name: 'звонок' },
  { icon: '🍐', name: 'груша' }, { icon: '🍊', name: 'апельсин' }, { icon: '🍋', name: 'лимон' },
  { icon: '🍇', name: 'виноград' }, { icon: '🍉', name: 'арбуз' }, { icon: '🍒', name: 'вишня' },
  { icon: '🍍', name: 'ананас' }, { icon: '🍅', name: 'помидор' }, { icon: '🥔', name: 'картофель' },
  { icon: '🥒', name: 'огурец' }, { icon: '🧅', name: 'лук' }, { icon: '🧄', name: 'чеснок' },
  { icon: '🌽', name: 'кукуруза' }, { icon: '🥬', name: 'капуста' }, { icon: '🥦', name: 'брокколи' },
  { icon: '🫑', name: 'перец' }, { icon: '🥄', name: 'ложка' }, { icon: '🍴', name: 'вилка' },
  { icon: '🔪', name: 'нож' }, { icon: '🫖', name: 'чайник' }, { icon: '🥛', name: 'молоко' },
  { icon: '📷', name: 'фотоаппарат' }, { icon: '💡', name: 'лампа' }, { icon: '🔦', name: 'фонарик' },
  { icon: '🪞', name: 'зеркало' }, { icon: '🛏️', name: 'кровать' }, { icon: '🪑', name: 'стул' },
  { icon: '🛋️', name: 'диван' }, { icon: '🚪', name: 'дверь' }, { icon: '🪟', name: 'окно' },
  { icon: '🧹', name: 'метла' }, { icon: '🪣', name: 'ведро' }, { icon: '🧺', name: 'корзина' },
  { icon: '🧻', name: 'бумага' }, { icon: '🧽', name: 'губка' }, { icon: '👕', name: 'футболка' },
  { icon: '👖', name: 'брюки' }, { icon: '👗', name: 'платье' }, { icon: '👒', name: 'шляпа' },
  { icon: '👟', name: 'кроссовки' }, { icon: '👢', name: 'сапоги' }, { icon: '👜', name: 'сумка' },
  { icon: '🎒', name: 'рюкзак' }, { icon: '🧣', name: 'шарф' }, { icon: '👔', name: 'галстук' },
  { icon: '🔨', name: 'молоток' }, { icon: '🪚', name: 'пила' }, { icon: '🪛', name: 'отвёртка' },
  { icon: '🪜', name: 'лестница' }, { icon: '✂️', name: 'ножницы' }, { icon: '🖊️', name: 'ручка' },
  { icon: '📏', name: 'линейка' }, { icon: '🔒', name: 'замок' }, { icon: '🔑', name: 'ключик' },
  { icon: '📎', name: 'скрепка' }, { icon: '🚗', name: 'машина' }, { icon: '🚌', name: 'автобус' },
  { icon: '🚕', name: 'такси' }, { icon: '🚂', name: 'поезд' }, { icon: '🚢', name: 'корабль' },
  { icon: '🚜', name: 'трактор' }, { icon: '🚚', name: 'грузовик' }, { icon: '🛴', name: 'самокат' },
  { icon: '🎸', name: 'гитара' }, { icon: '🎹', name: 'пианино' }, { icon: '🥁', name: 'барабан' },
  { icon: '🎻', name: 'скрипка' }, { icon: '🔋', name: 'батарейка' }, { icon: '🧭', name: 'компас' }
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
  game.hidden = true; result.hidden = true; memoryScreen.hidden = true; wordsScreen.hidden = true; changeScreen.hidden = true; lettersScreen.hidden = true; guessWordScreen.hidden = true; pairsScreen.hidden = true; oddScreen.hidden = true; categoryScreen.hidden = true; sequenceScreen.hidden = true; mazeScreen.hidden = true; historyScreen.hidden = true; home.hidden = false; tip.hidden = false;
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

const guessWordExamples = Array.from(new Set(`
ромашка карандаш самолёт бабочка телефон клубника велосипед календарь варежка черепаха помидоры пылесос
тарелка кастрюля сковорода чайник стакан кружка ложка вилка ножик салфетка полотенце скатерть поднос сахарница хлебница
будильник лампочка розетка выключатель батарея холодильник морозилка духовка плита раковина кран табурет шкафчик комод диван
кровать матрас подушка одеяло простыня наволочка зеркало расчёска щётка мыло шампунь мочалка халат тапочки корзина
картина полка ковёр штора занавеска вешалка ключница дверца окно балкон коридор прихожая спальня кухня ванная кладовка
тетрадь учебник словарь альбом открытка конверт карандаш фломастер линейка точилка закладка газета журнал письмо марка
книга рассказ сказка загадка пословица букварь чернила бумага папка файл кнопка скрепка клеёнка ножницы калькулятор
яблоко груша банан лимон апельсин мандарин абрикос персик слива вишня черешня малина смородина крыжовник виноград
арбуз дыня ананас гранат киви манго папайя финики изюм орехи миндаль фундук семечки чернослив курага
картофель морковь свёкла капуста огурец помидор редиска репа тыква кабачок баклажан горошек фасоль чеснок петрушка
укроп салат шпинат щавель редька кукуруза грибочек шампиньон лисичка опёнок картошка брокколи сельдерей кинза базилик
молоко кефир ряженка творог сметана масло сырок йогурт сливки мороженое колбаса сосиска котлета пельмени вареники
хлеб батон булочка баранка сухарик пирожок ватрушка печенье пряник конфета карамель шоколад мармелад зефир пастила
супчик борщ рассольник окрошка каша омлет яичница макароны лапша гречка рисинка овсянка пшено манка сырники
воробей голубь ласточка синица снегирь сорока ворона скворец соловей дятел чайка утка гусь петух индюк
кошка собака щенок котёнок корова лошадь ослик коза овечка свинья кролик белка ёжик лиса волк
медведь заяц олень кабан барсук бобр выдра хорёк мышка крыса хомяк сурок лось рысь тигр
слон жираф зебра обезьяна кенгуру верблюд бегемот носорог леопард гепард панда коала дельфин китёнок тюлень
карась окунь плотва щука сомик лещ форель сазан судак налим треска килька сельдь креветка кальмар
муравей комарик стрекоза кузнечик божьякоровка гусеница паучок жучок пчела шмель бабочка мотылёк таракан сверчок
берёза осина рябина калина тополь клён дубок сосна ельник ива липа яблоня вишня сирень жасмин
ромашка василёк одуванчик тюльпан гвоздика ландыш колокольчик фиалка незабудка пион астра георгин ирис нарцисс
земля небо облако солнце месяц звезда радуга дождик снегопад ветерок туман гроза молния иней лужица
весна лето осень зима январь февраль март апрель май июнь июль август сентябрь октябрь ноябрь декабрь
утро вечер полдень ночь неделя месяц годик минута секунда праздник выходной каникулы прогулка поездка дорога
машина автобус трамвай троллейбус метро поезд вагон самолёт кораблик лодка такси велосипед самокат трактор грузовик
улица площадь проспект переулок мостик тоннель вокзал аэропорт станция остановка светофор переход тротуар парковка гараж
больница аптека магазин рынок почта школа библиотека музей театр цирк стадион бассейн парк сквер фонтан
доктор медсестра аптекарь учитель повар водитель продавец почтальон садовник строитель маляр портной столяр рыбак
пальто куртка рубашка футболка юбочка платье брюки джинсы шорты носочки чулки шапочка шляпа кепка шарфик
перчатки варежки сапоги ботинки туфли тапки сандалии ремень сумочка рюкзак кошелёк зонтик платочек брошь
рука ладонь палец локоть плечо спина живот голова волосы брови ресницы глаза уши носик губы
зубы язык шея колено пятка стопа ноготь сердце лёгкие желудок печень кровь кость кожа мышца
улыбка смех радость грусть покой забота надежда дружба семья мама папа бабушка дедушка внучка внук
сосед знакомый товарищ подруга коллега гость хозяин семья супруг супруга брат сестра дядя тётя племянник
цифра буква слово фраза вопрос ответ задача пример число счёт сумма разница таблица правило урок
цвет белый чёрный красный синий зелёный жёлтый оранжевый фиолетовый розовый серый коричневый золотой серебряный
круг квадрат треугольник прямоугольник линия точка угол сторона вершина середина размер форма длина ширина высота
иголка нитка пуговица ткань шерсть хлопок лента тесьма напёрсток спица крючок клубок выкройка карман воротник
молоток отвёртка плоскогубцы пила топор лопата грабли тяпка ведро метёлка совок фонарик замочек цепочка
сад огород клумба грядка теплица рассада семена росток листочек веточка корешок ягода урожай яблоко груша
река озеро море берег остров гора холм долина поле луг лес роща тропинка пещера водопад
песок камень глина земля почва уголь железо медь золото серебро алмаз янтарь жемчуг ракушка коралл
утюг стиралка сушилка швейнаямашина вентилятор обогреватель радиатор телевизор приёмник магнитофон колонка наушники зарядка
компьютер клавиатура мышка экран принтер флешка пароль сайт почта сообщение звонок фотография видеоролик приложение
футбол хоккей теннис шахматы шашки домино лото кроссворд пазл мячик ракетка лыжи коньки санки
зарядка гимнастика прогулка плавание рыбалка охота поход танец песня музыка мелодия оркестр артист певец
часики календарик записнаякнижка кошелёк очки ключи паспорт билет квитанция рецепт тонометр градусник пластырь бинтик
подарок сюрприз свечка открытка букет игрушка кукла мишка кубики барабан дудочка свисток кораблик мельница
погода тепло холод мороз жара солнце дождь снег ветер облачность рассвет закат сумерки полночь
пельмени ватрушка оладьи блины пироги кексик рулет пирожное варенье повидло джем сироп мёд сахар
праздник юбилей свадьба встреча беседа разговор новость совет помощь просьба благодарность пожелание приглашение
билетик маршрут карта адрес номер подъезд этаж квартира лифт лестница звонок домофон почтовыйящик
будка кормушка поводок ошейник клетка аквариум террариум гнездо норка берлога муравейник паутина перо клюв
зерно мука крупа соль перец лаврушка гвоздика корица ваниль дрожжи уксус соус горчица кетчуп
корабль парус якорь штурвал маяк причал гавань волна шторм компас карта глобус капитан матрос
утёнок цыплёнок жеребёнок телёнок козлёнок ягнёнок поросёнок котик пёсик белочка лисёнок медвежонок
зеркальце расчёска зубочистка зубнаящётка полотенчико салфеточка мочалочка шампунь кремик духи помада пудра
светильник люстра торшер бра ночник подсвечник свеча лампа абажур выключатель провод розетка батарейка
магазинчик булочная пекарня столовая кафе ресторан парикмахерская мастерская прачечная химчистка поликлиника санаторий
племянница крестница крестник родственник одноклассник однокурсник земляк знакомая незнакомец прохожий пассажир покупатель
тележка корзинка упаковка ценник кассир чек сдача очередь витрина прилавок продавщица покупка доставка
пирог булочка крендель бублик ватрушка рогалик пончик слойка калач пряник печенье сухарик
гвоздь шуруп болтик гайка доска брусок кирпич цемент краска кисточка валик шпатель рулетка уровень
ремонт уборка стирка глажка готовка покупка готовность чистота порядок уют тишина отдых сон
снеговик сосулька сугроб метель вьюга оттепель капель проталина снежинка ледок каток варежка шубка
грибница черника брусника земляника ежевика облепиха шиповник морошка клюква рябина черёмуха орешник
путешествие чемодан сумка путёвка гостиница номерок пляж купание экскурсия сувенир фотография открытка
сосиска котлета отбивная тефтеля голубец запеканка салатик винегрет бутерброд сырник кашица омлетик
косынка платочек фартук жилетка пижама рубаха сарафан кофта свитер кардиган плащ дождевик
библиотекарь писатель художник поэт музыкант фотограф пожарный полицейский машинист лётчик капитан
профессор инженер бухгалтер экономист секретарь диспетчер оператор кассир кондитер парикмахер сапожник
мороженщик почтальон дворник сторож охранник уборщица нянечка воспитатель библиотекарь экскурсовод переводчик
обед завтрак ужин перекус чаепитие сервировка посуда салфетка тарелочка ложечка вилочка чашечка
палатка костёр спички термос котелок рюкзак компас бинокль удочка наживка поплавок рыболов
фотография портрет пейзаж натюрморт рисунок краски кисти карандашик альбомчик рамочка выставка
космос планета спутник ракета комета астероид телескоп космонавт созвездие галактика орбита
малыш ребёнок школьник ученик студент учительница воспитанник отличник первоклассник выпускник
медаль кубок грамота награда победа рекорд чемпион турнир команда игрок тренер судья
театр сцена занавес артистка актёр спектакль комедия трагедия балет опера концерт аплодисменты
пальма кактус фикус герань бегония орхидея фиалочка алоэ рассада горшочек лейка удобрение
домик избушка дача сарай погреб чердак крыльцо веранда калитка забор дорожка беседка
воздух кислород здоровье лекарство таблетка микстура мазь сироп капсула укол повязка рецепт
полотнище простынка одеяльце наволочка матрасик пододеяльник кроватка тумбочка комодик шкафчик
пылинка соринка пятнышко тряпочка губочка щёточка веничек швабра тазик ведёрко порошок
государство столица область район деревня посёлок городок улица площадь граница страна народ
музейчик экспонат памятник монумент скульптура фреска картина портрет галерея выставка художество
капуста морковка картошка свёкла огурчик помидорчик перчик редиска тыковка кабачочек баклажанчик
соловей кукушка попугай канарейка фламинго пеликан страус павлин лебедь журавль аист
автобусик трамвайчик троллейбусик электропоезд тепловоз паровозик маршрутка самосвал экскаватор бульдозер
цветочек лепесток бутон стебелёк тычинка пыльца аромат клумбочка букетик веночек
мастер ключник часовщик стекольщик плотник каменщик электрик сварщик крановщик грузчик
сказочник волшебник принцесса королева король рыцарь дракон русалка богатырь герой
хозяйка хозяйство соседство знакомство приглашение поздравление угощение настроение воспоминание
тетенька дяденька бабуля дедуля внученька внучек семейство родня поколение фамилия имя
беседка скамейка качели горка песочница фонарик клумба дорожка газон аллея парк
троллейбус маршрут автобус остановка билет контролёр водитель кондуктор пассажир чемодан
погребок чердак гаражик сарайчик теплица банька колодец скважина насос труба крыша
плед покрывало подушка одеяло матрас простыня наволочка кровать диван кресло табуретка
чистка стирка глаженье мытьё поливка посадка прополка уборка готовка починка штопка
воротник рукав пуговка кармашек молния подошва каблук шнурок застёжка ремешок пряжка
кувшин бутылка баночка коробочка пакетик мешочек контейнер тарелка чашка блюдечко
звонок гудок сигнал будильник таймер секундомер календарь дневник блокнот напоминание
паучок комарик мошкара кузнечик стрекоза бабочка пчёлка шмель муха жужелица
свёкор свекровь тёща тесть зять невестка свояк свояченица крестница крестник
загадка ребус головоломка считалка скороговорка поговорка стихотворение песенка мелодия
чемпионка спортсменка гимнастка пловчиха фигуристка лыжница бегунья шахматистка
пирожочек булочка печеньице конфетка шоколадка мороженое карамелька мармеладка
капелька снежинка сосулька льдинка тучка облачко ветерок солнышко радуга
креслице диванчик столик шкафчик полочка тумбочка коврик шторка дверца
светофор переход остановка тротуар обочина перекрёсток шлагбаум заправка парковка
помощник советчик собеседник соседушка попутчик товарищ знакомец приятель наставник
поляна опушка чаща овраг ручеёк родник водоём болото трясина кочка
пальчик ладошка локоток коленка пяточка носочек ресничка бровинка щёчка
голубика брусника малина черника смородина крыжовник земляника ежевика клюква
сервант буфет этажерка комод тумба трюмо шкаф купе стеллаж вешалка
прихватка ситечко дуршлаг тёрка лопаточка шумовка половник кастрюлька
зернышко росточек листочек веточка корешок стебелёк лепесточек шишечка
путёвочка сувенирчик магнитик брелок открытка ракушка песочек камушек
врачиха санитарка лаборант терапевт окулист хирург стоматолог медик фельдшер
троллейбус автобус маршрутка трамвай метро поезд самолёт такси кораблик
`.trim().split(/\s+/))).filter(word => [...word].length >= 6 && [...word].length <= 9).slice(0, 500);
const guessWordAlphabet = ['а', 'б', 'в', 'г', 'д', 'е', 'и', 'к', 'л', 'м', 'н', 'о', 'п', 'р', 'с', 'т', 'у', 'ч', 'ш', 'я'];

function createGuessWordSequence() {
  return shuffle(guessWordExamples).slice(0, TOTAL_QUESTIONS).map(word => {
    const missingCount = word.length >= 8 ? 4 : 3;
    const missing = selectMissingLetters(word.length, missingCount);
    const requiredLetters = missing.map(index => word[index]);
    const distractors = shuffle(guessWordAlphabet.filter(letter => !requiredLetters.includes(letter))).slice(0, 2);
    return { word, missing, requiredLetters, options: shuffle([...requiredLetters, ...distractors]) };
  });
}

function selectMissingLetters(wordLength, count) {
  const positions = [...Array(wordLength).keys()];
  let missing;
  do {
    missing = shuffle(positions).slice(0, count).sort((a, b) => a - b);
  } while (missing.some((position, index) => index > 1 && position === missing[index - 1] + 1 && position === missing[index - 2] + 2));
  return missing;
}

function beginGuessWordExercise() {
  guessWordRound = 0; guessWordMistakes = 0; guessWordRoundHadMistake = false;
  guessWordSequence = createGuessWordSequence(); beginSession('Угадай слово'); startGuessWordRound();
}

function startGuessWordRound() {
  activeExercise = 'guess-word'; guessWordMissingIndex = 0; guessWordRoundHadMistake = false;
  activeExerciseTitle.textContent = 'Угадай слово'; activeExerciseTitle.hidden = false;
  home.hidden = true; tip.hidden = true; game.hidden = true; result.hidden = true; memoryScreen.hidden = true; wordsScreen.hidden = true; changeScreen.hidden = true; lettersScreen.hidden = true; pairsScreen.hidden = true; oddScreen.hidden = true; guessWordScreen.hidden = false;
  const question = guessWordSequence[guessWordRound];
  document.querySelector('#guess-word-round').textContent = guessWordRound + 1;
  document.querySelector('#guess-word-mistakes').textContent = guessWordMistakes;
  document.querySelector('#guess-word-progress').style.width = `${(guessWordRound / TOTAL_QUESTIONS) * 100}%`;
  document.querySelector('#guess-word-feedback').textContent = '';
  renderGuessWordSlots(question);
  const list = document.querySelector('#guess-word-options'); list.innerHTML = '';
  question.options.forEach(letter => {
    const button = document.createElement('button'); button.type = 'button'; button.className = 'guess-letter-option'; button.textContent = letter;
    button.addEventListener('click', () => chooseGuessWordLetter(button, letter)); list.append(button);
  });
}

function renderGuessWordSlots(question) {
  const activePosition = question.missing[guessWordMissingIndex];
  document.querySelector('#word-slots').innerHTML = [...question.word].map((letter, index) => {
    const missingIndex = question.missing.indexOf(index);
    const isFilled = missingIndex !== -1 && missingIndex < guessWordMissingIndex;
    const state = index === activePosition ? ' is-empty is-active' : missingIndex !== -1 && !isFilled ? ' is-empty' : '';
    return `<span class="word-slot${state}">${isFilled || missingIndex === -1 ? letter : ''}</span>`;
  }).join('');
}

function chooseGuessWordLetter(button, letter) {
  if (button.disabled) return;
  const question = guessWordSequence[guessWordRound]; const expected = question.requiredLetters[guessWordMissingIndex];
  const feedback = document.querySelector('#guess-word-feedback');
  if (letter !== expected) {
    button.disabled = true; button.classList.add('is-wrong'); guessWordMistakes += 1; guessWordRoundHadMistake = true;
    document.querySelector('#guess-word-mistakes').textContent = guessWordMistakes;
    feedback.textContent = 'Эта буква не подходит. Попробуйте ещё раз.'; feedback.className = 'answer-feedback is-wrong';
    updateActiveSession(guessWordRound, activeSession.successful, guessWordMistakes); return;
  }
  button.disabled = true; button.classList.add('is-correct', 'is-used'); guessWordMissingIndex += 1; renderGuessWordSlots(question);
  if (guessWordMissingIndex < question.missing.length) {
    feedback.textContent = 'Верно! Теперь заполните выделенную клетку.'; feedback.className = 'answer-feedback is-correct'; return;
  }
  document.querySelectorAll('#guess-word-options button').forEach(item => item.disabled = true);
  feedback.textContent = 'Слово угадано! Отличная работа.'; feedback.className = 'answer-feedback is-correct';
  document.querySelector('#guess-word-progress').style.width = `${((guessWordRound + 1) / TOTAL_QUESTIONS) * 100}%`;
  updateActiveSession(guessWordRound + 1, activeSession.successful + (guessWordRoundHadMistake ? 0 : 1), guessWordMistakes);
  advanceTimer = window.setTimeout(() => { guessWordRound += 1; guessWordRound === TOTAL_QUESTIONS ? finishGuessWordExercise() : startGuessWordRound(); }, 1400);
}

function finishGuessWordExercise() {
  guessWordScreen.hidden = true; result.hidden = false; closeSession('completed', TOTAL_QUESTIONS, activeSession.successful, guessWordMistakes);
  const flawless = guessWordMistakes === 0;
  document.querySelector('#result-title').textContent = flawless ? 'Прекрасно!' : 'Упражнение пройдено!';
  document.querySelector('#result-description').textContent = flawless ? 'Вы угадали все слова без ошибок. Так держать!' : 'Вы прошли все задания со словами.';
  document.querySelector('#result-correct-number').textContent = TOTAL_QUESTIONS; document.querySelector('#result-mistakes-number').textContent = guessWordMistakes;
}

document.querySelector('[data-exercise="guess-word"]')?.addEventListener('click', beginGuessWordExercise);

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
const oddQuestions = [
  ['🍎','🍐','🍌','🚗'], ['🐈','🐕','🐇','📘'], ['☕','🍽️','🥄','⚽'], ['🌷','🌹','🌻','⌚'], ['🧤','🧦','🧢','🚲'], ['🥖','🧀','🍓','🔑'], ['📞','💻','📺','🥕'], ['🪥','🧼','🧴','🎈'], ['🚕','🚌','🚲','🍎'], ['🛏️','🪑','🛋️','☂️']
].map(items => ({ items, answer: items[3] }));
function beginOddExercise() { oddRound = 0; oddMistakes = 0; oddSequence = shuffle(oddQuestions); beginSession('Лишний предмет'); startOddRound(); }
function startOddRound() { activeExercise = 'odd'; oddHadMistake = false; home.hidden = true; tip.hidden = true; result.hidden = true; oddScreen.hidden = false; activeExerciseTitle.textContent = 'Лишний предмет'; activeExerciseTitle.hidden = false; const q = oddSequence[oddRound]; document.querySelector('#odd-round').textContent = oddRound + 1; document.querySelector('#odd-mistakes').textContent = oddMistakes; document.querySelector('#odd-progress').style.width = `${oddRound * 10}%`; const list = document.querySelector('#odd-options'); list.innerHTML = ''; list.classList.remove('is-answered'); document.querySelector('#odd-feedback').textContent = ''; shuffle(q.items).forEach(item => { const b = document.createElement('button'); b.className = 'letter-option'; b.textContent = item; b.onclick = () => { if (item !== q.answer) { b.disabled = true; b.classList.add('is-wrong'); oddMistakes++; oddHadMistake = true; document.querySelector('#odd-mistakes').textContent = oddMistakes; document.querySelector('#odd-feedback').textContent = 'Неверно. Попробуйте ещё раз.'; updateActiveSession(oddRound, activeSession.successful, oddMistakes); return; } list.querySelectorAll('button').forEach(x => x.disabled = true); list.classList.add('is-answered'); b.classList.add('is-correct'); document.querySelector('#odd-feedback').textContent = 'Верно!'; updateActiveSession(oddRound + 1, activeSession.successful + (oddHadMistake ? 0 : 1), oddMistakes); advanceTimer = setTimeout(() => { oddRound++; oddRound === 10 ? finishOdd() : startOddRound(); }, 1300); }; list.append(b); }); }
function finishOdd() { oddScreen.hidden = true; result.hidden = false; closeSession('completed', 10, activeSession.successful, oddMistakes); document.querySelector('#result-title').textContent = 'Упражнение пройдено!'; document.querySelector('#result-description').textContent = 'Вы нашли лишние предметы.'; document.querySelector('#result-correct-number').textContent = 10; document.querySelector('#result-mistakes-number').textContent = oddMistakes; }
document.querySelector('[data-exercise="odd"]')?.addEventListener('click', beginOddExercise);

const categoryQuestions = createCategoryQuestionBank();

function createCategoryQuestionBank() {
  const groups = [
    ['Фрукты', ['яблоко', 'груша', 'банан', 'лимон', 'слива']],
    ['Овощи', ['морковь', 'капуста', 'огурец', 'помидор', 'свёкла']],
    ['Одежда', ['пальто', 'рубашка', 'юбка', 'шапка', 'ботинки']],
    ['Мебель', ['диван', 'кровать', 'стол', 'шкаф', 'кресло']],
    ['Транспорт', ['автобус', 'поезд', 'трамвай', 'самолёт', 'корабль']],
    ['Посуда', ['чашка', 'тарелка', 'ложка', 'кастрюля', 'чайник']],
    ['Птицы', ['синица', 'воробей', 'голубь', 'ласточка', 'соловей']],
    ['Домашние животные', ['кошка', 'собака', 'корова', 'лошадь', 'кролик']],
    ['Цветы', ['ромашка', 'тюльпан', 'роза', 'василёк', 'пион']],
    ['Инструменты', ['молоток', 'пила', 'лопата', 'грабли', 'отвёртка']],
    ['Деревья', ['берёза', 'дуб', 'сосна', 'клён', 'липа']],
    ['Части тела', ['рука', 'нога', 'глаз', 'ухо', 'нос']],
    ['Канцелярия', ['карандаш', 'ручка', 'тетрадь', 'линейка', 'конверт']],
    ['Бытовая техника', ['холодильник', 'телевизор', 'утюг', 'пылесос', 'стиральная машина']],
    ['Сладости', ['конфета', 'печенье', 'шоколад', 'зефир', 'пряник']],
    ['Ягоды', ['малина', 'клубника', 'черника', 'смородина', 'вишня']],
    ['Рыбы', ['щука', 'окунь', 'карась', 'лещ', 'форель']],
    ['Профессии', ['врач', 'учитель', 'повар', 'водитель', 'садовник']],
    ['Времена года', ['весна', 'лето', 'осень', 'зима', 'межсезонье']],
    ['Геометрические фигуры', ['круг', 'квадрат', 'треугольник', 'овал', 'прямоугольник']]
  ];
  return groups.flatMap(([title, words], groupIndex) => words.map((answer, wordIndex) => {
    const distractors = [1, 7, 13].map(offset => groups[(groupIndex + offset) % groups.length][1][wordIndex]);
    return { id: `category-${groupIndex + 1}-${wordIndex + 1}`, title, answer, options: [answer, ...distractors] };
  }));
}

function createCategoryExercise() {
  const previousIds = JSON.parse(localStorage.getItem('agiliko-category-previous') || '[]');
  const available = categoryQuestions.filter(question => !previousIds.includes(question.id));
  const selected = shuffle(available.length >= TOTAL_QUESTIONS ? available : categoryQuestions).slice(0, TOTAL_QUESTIONS);
  localStorage.setItem('agiliko-category-previous', JSON.stringify(selected.map(question => question.id)));
  return selected;
}

const sequenceQuestions = createSequenceQuestionBank();

function createSequenceQuestionBank() {
  const questions = [];
  const addCycle = (items, fallback, count = items.length) => {
    for (let index = 0; index < count; index += 1) {
      const answer = items[(index + 3) % items.length];
      const options = [answer, items[(index + 4) % items.length], items[(index + 5) % items.length], fallback];
      questions.push({ pattern: `${items[index % items.length]} · ${items[(index + 1) % items.length]} · ${items[(index + 2) % items.length]} · ?`, options: [...new Set(options)], answer });
    }
  };
  const addNumbers = (start, step, count) => {
    for (let index = 0; index < count; index += 1) {
      const first = start + index * Math.abs(step) * 4;
      const answer = first + step * 3;
      questions.push({ pattern: `${first} · ${first + step} · ${first + step * 2} · ?`, options: shuffle([answer, answer + step, answer - step, answer + step * 2]), answer });
    }
  };

  addCycle(['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'], 'Январь');
  addCycle(['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'], 'Понедельник');
  addCycle(['Весна', 'Лето', 'Осень', 'Зима'], 'Ночь');
  addCycle(['Утро', 'День', 'Вечер', 'Ночь'], 'Весна');
  addNumbers(1, 1, 10);
  addNumbers(2, 2, 10);
  addNumbers(1, 2, 10);
  addNumbers(20, -2, 10);
  addNumbers(3, 3, 8);
  addNumbers(5, 5, 8);
  addCycle(['Круг', 'Квадрат', 'Треугольник'], 'Линия', 8);
  addCycle(['Красный', 'Жёлтый', 'Зелёный'], 'Синий', 5);
  addCycle(['Завтрак', 'Обед', 'Ужин', 'Сон'], 'Прогулка', 4);

  return questions.map((question, index) => ({ ...question, id: `sequence-${index + 1}` }));
}

function createSequenceExercise() {
  const previousIds = JSON.parse(localStorage.getItem('agiliko-sequence-previous') || '[]');
  const available = sequenceQuestions.filter(question => !previousIds.includes(question.id));
  const selected = shuffle(available.length >= TOTAL_QUESTIONS ? available : sequenceQuestions).slice(0, TOTAL_QUESTIONS);
  localStorage.setItem('agiliko-sequence-previous', JSON.stringify(selected.map(question => question.id)));
  return selected;
}

function beginChoiceExercise(kind) {
  const isCategory = kind === 'category';
  if (isCategory) { categoryRound = 0; categoryMistakes = 0; categorySequence = createCategoryExercise(); beginSession('Слово по категории'); }
  else { sequenceRound = 0; sequenceMistakes = 0; sequenceItems = createSequenceExercise(); beginSession('Что дальше?'); }
  startChoiceRound(kind);
}

function startChoiceRound(kind) {
  const isCategory = kind === 'category';
  activeExercise = kind;
  if (isCategory) categoryRoundHadMistake = false; else sequenceRoundHadMistake = false;
  const round = isCategory ? categoryRound : sequenceRound;
  const errors = isCategory ? categoryMistakes : sequenceMistakes;
  const question = isCategory ? categorySequence[round] : sequenceItems[round];
  const prefix = isCategory ? 'category' : 'sequence';
  activeExerciseTitle.textContent = isCategory ? 'Слово по категории' : 'Что дальше?'; activeExerciseTitle.hidden = false;
  home.hidden = true; tip.hidden = true; game.hidden = true; result.hidden = true; memoryScreen.hidden = true; wordsScreen.hidden = true; changeScreen.hidden = true; lettersScreen.hidden = true; guessWordScreen.hidden = true; pairsScreen.hidden = true; oddScreen.hidden = true; categoryScreen.hidden = !isCategory; sequenceScreen.hidden = isCategory; mazeScreen.hidden = true; historyScreen.hidden = true;
  document.querySelector(`#${prefix}-round`).textContent = round + 1;
  document.querySelector(`#${prefix}-mistakes`).textContent = errors;
  document.querySelector(`#${prefix}-progress`).style.width = `${(round / TOTAL_QUESTIONS) * 100}%`;
  document.querySelector(`#${prefix}-title`).textContent = isCategory ? question.title : question.pattern;
  const list = document.querySelector(`#${prefix}-options`); const message = document.querySelector(`#${prefix}-feedback`);
  list.innerHTML = ''; list.classList.remove('is-answered'); message.textContent = ''; message.className = 'answer-feedback';
  shuffle(question.options).forEach(option => {
    const button = document.createElement('button'); button.type = 'button'; button.className = 'category-option'; button.textContent = option;
    button.addEventListener('click', () => chooseChoiceAnswer(kind, button, option)); list.append(button);
  });
}

function chooseChoiceAnswer(kind, button, option) {
  const isCategory = kind === 'category'; const round = isCategory ? categoryRound : sequenceRound;
  const question = isCategory ? categorySequence[round] : sequenceItems[round]; const prefix = isCategory ? 'category' : 'sequence';
  const list = document.querySelector(`#${prefix}-options`); const message = document.querySelector(`#${prefix}-feedback`);
  if (option !== question.answer) {
    button.disabled = true; button.classList.add('is-wrong');
    if (isCategory) { categoryMistakes += 1; categoryRoundHadMistake = true; } else { sequenceMistakes += 1; sequenceRoundHadMistake = true; }
    const errors = isCategory ? categoryMistakes : sequenceMistakes; document.querySelector(`#${prefix}-mistakes`).textContent = errors;
    message.textContent = 'Пока неверно. Попробуйте ещё раз.'; message.className = 'answer-feedback is-wrong'; updateActiveSession(round, activeSession.successful, errors); return;
  }
  list.querySelectorAll('button').forEach(item => item.disabled = true); list.classList.add('is-answered'); button.classList.add('is-correct');
  const hadMistake = isCategory ? categoryRoundHadMistake : sequenceRoundHadMistake; const errors = isCategory ? categoryMistakes : sequenceMistakes;
  message.textContent = 'Верно! Отличная работа.'; message.className = 'answer-feedback is-correct'; document.querySelector(`#${prefix}-progress`).style.width = `${((round + 1) / TOTAL_QUESTIONS) * 100}%`;
  updateActiveSession(round + 1, activeSession.successful + (hadMistake ? 0 : 1), errors);
  advanceTimer = window.setTimeout(() => { if (isCategory) categoryRound += 1; else sequenceRound += 1; (isCategory ? categoryRound : sequenceRound) === TOTAL_QUESTIONS ? finishChoiceExercise(kind) : startChoiceRound(kind); }, 1300);
}

function finishChoiceExercise(kind) {
  const isCategory = kind === 'category'; const errors = isCategory ? categoryMistakes : sequenceMistakes;
  categoryScreen.hidden = true; sequenceScreen.hidden = true; result.hidden = false;
  closeSession('completed', TOTAL_QUESTIONS, activeSession.successful, errors);
  document.querySelector('#result-title').textContent = errors === 0 ? 'Прекрасно!' : 'Упражнение пройдено!';
  document.querySelector('#result-description').textContent = isCategory ? 'Вы нашли слова из всех категорий.' : 'Вы продолжили все последовательности.';
  document.querySelector('#result-correct-number').textContent = TOTAL_QUESTIONS; document.querySelector('#result-mistakes-number').textContent = errors;
}

document.querySelector('[data-exercise="category"]')?.addEventListener('click', () => beginChoiceExercise('category'));
document.querySelector('[data-exercise="sequence"]')?.addEventListener('click', () => beginChoiceExercise('sequence'));

const mazeQuestions = Array.from({ length: 100 }, (_, index) => {
  const correct = (index % 4) + 1;
  const optionCount = index % 3 === 0 ? Math.max(3, correct) : 4;
  return { id: `maze-${index + 1}`, correct, optionCount, variant: index % 10 };
});

function createMazeExercise() {
  const previousIds = JSON.parse(localStorage.getItem('agiliko-maze-previous') || '[]');
  const available = mazeQuestions.filter(question => !previousIds.includes(question.id));
  const selected = shuffle(available.length >= TOTAL_QUESTIONS ? available : mazeQuestions).slice(0, TOTAL_QUESTIONS);
  localStorage.setItem('agiliko-maze-previous', JSON.stringify(selected.map(question => question.id)));
  return selected;
}

function beginMazeExercise() {
  mazeRound = 0; mazeMistakes = 0; mazeRoundHadMistake = false; mazeItems = createMazeExercise(); beginSession('Дорожка к сыру'); startMazeRound();
}

function startMazeRound() {
  activeExercise = 'maze'; mazeRoundHadMistake = false;
  activeExerciseTitle.textContent = 'Дорожка к сыру'; activeExerciseTitle.hidden = false;
  home.hidden = true; tip.hidden = true; game.hidden = true; result.hidden = true; memoryScreen.hidden = true; wordsScreen.hidden = true; changeScreen.hidden = true; lettersScreen.hidden = true; guessWordScreen.hidden = true; pairsScreen.hidden = true; oddScreen.hidden = true; categoryScreen.hidden = true; sequenceScreen.hidden = true; mazeScreen.hidden = false; historyScreen.hidden = true;
  const question = mazeItems[mazeRound];
  document.querySelector('#maze-round').textContent = mazeRound + 1; document.querySelector('#maze-mistakes').textContent = mazeMistakes; document.querySelector('#maze-progress').style.width = `${(mazeRound / TOTAL_QUESTIONS) * 100}%`;
  renderMaze(question);
  const list = document.querySelector('#maze-options'); const feedback = document.querySelector('#maze-feedback');
  list.innerHTML = ''; list.classList.remove('is-answered'); feedback.textContent = ''; feedback.className = 'answer-feedback';
  shuffle(Array.from({ length: question.optionCount }, (_, index) => index + 1)).forEach(option => {
    const button = document.createElement('button'); button.type = 'button'; button.className = 'maze-option'; button.textContent = `Дорожка ${option}`;
    button.addEventListener('click', () => chooseMazeAnswer(button, option)); list.append(button);
  });
}

function renderMaze(question) {
  const startY = [62, 145, 228, 311];
  const endY = [58, 132, 278, 352];
  const routeOrder = [0, 1, 2, 3].map(index => (index + question.variant) % 4);
  const paths = Array.from({ length: question.optionCount }, (_, index) => {
    const number = index + 1; const targetY = number === question.correct ? 205 : endY[routeOrder[index]];
    const firstX = 210 + ((question.variant * 31 + index * 77) % 170);
    const secondX = 495 + ((question.variant * 43 + index * 59) % 155);
    const path = `M 92 ${startY[index]} H ${firstX} V ${targetY} H ${secondX} V ${targetY} H ${number === question.correct ? 805 : 735}`;
    return `<text x="42" y="${startY[index] + 10}" class="maze-number">${number}</text><path class="maze-path" d="${path}"/>`;
  }).join('');
  document.querySelector('#maze-board').innerHTML = `<svg viewBox="0 0 920 410" role="img" aria-label="Проследите дорожку от номера до сыра.">${paths}<text x="830" y="228" font-size="70">🧀</text></svg>`;
}

function chooseMazeAnswer(button, option) {
  const question = mazeItems[mazeRound]; const list = document.querySelector('#maze-options'); const feedback = document.querySelector('#maze-feedback');
  if (option !== question.correct) {
    button.disabled = true; button.classList.add('is-wrong'); mazeMistakes += 1; mazeRoundHadMistake = true; document.querySelector('#maze-mistakes').textContent = mazeMistakes;
    feedback.textContent = 'Эта дорожка не ведёт к сыру. Попробуйте ещё раз.'; feedback.className = 'answer-feedback is-wrong'; updateActiveSession(mazeRound, activeSession.successful, mazeMistakes); return;
  }
  list.querySelectorAll('button').forEach(item => item.disabled = true); list.classList.add('is-answered'); button.classList.add('is-correct');
  feedback.textContent = 'Верно! Мышка добралась до сыра.'; feedback.className = 'answer-feedback is-correct'; document.querySelector('#maze-progress').style.width = `${((mazeRound + 1) / TOTAL_QUESTIONS) * 100}%`;
  updateActiveSession(mazeRound + 1, activeSession.successful + (mazeRoundHadMistake ? 0 : 1), mazeMistakes);
  advanceTimer = window.setTimeout(() => { mazeRound += 1; mazeRound === TOTAL_QUESTIONS ? finishMazeExercise() : startMazeRound(); }, 1400);
}

function finishMazeExercise() {
  mazeScreen.hidden = true; result.hidden = false; closeSession('completed', TOTAL_QUESTIONS, activeSession.successful, mazeMistakes);
  document.querySelector('#result-title').textContent = mazeMistakes === 0 ? 'Прекрасно!' : 'Упражнение пройдено!';
  document.querySelector('#result-description').textContent = 'Вы нашли дорожки к сыру.';
  document.querySelector('#result-correct-number').textContent = TOTAL_QUESTIONS; document.querySelector('#result-mistakes-number').textContent = mazeMistakes;
}

document.querySelector('[data-exercise="maze"]')?.addEventListener('click', beginMazeExercise);
document.querySelector('#pairs-ready')?.addEventListener('click', beginPairsSearch);
document.querySelectorAll('[data-exercise]').forEach(button => button.addEventListener('click', () => {
  if (button.dataset.exercise !== 'guess-word') guessWordScreen.hidden = true;
}));
document.querySelectorAll('[data-action="home"]').forEach(button => button.addEventListener('click', showHome));
document.querySelector('[data-action="history"]')?.addEventListener('click', async () => { await abandonActiveSession(); showHistory(); });
document.querySelector('[data-action="restart"]')?.addEventListener('click', () => activeExercise === 'maze' ? beginMazeExercise() : activeExercise === 'category' ? beginChoiceExercise('category') : activeExercise === 'sequence' ? beginChoiceExercise('sequence') : activeExercise === 'odd' ? beginOddExercise() : activeExercise === 'memory' ? beginMemoryExercise() : activeExercise === 'words' ? beginWordsExercise() : activeExercise === 'change' ? beginChangeExercise() : activeExercise === 'letters' ? beginLettersExercise() : activeExercise === 'guess-word' ? beginGuessWordExercise() : activeExercise === 'pairs' ? beginPairsExercise() : startExercise());

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js'));
}
