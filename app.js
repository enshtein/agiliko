const home = document.querySelector('.exercise-section');
const tip = document.querySelector('.tip');
const game = document.querySelector('.game-screen');
const result = document.querySelector('.result-screen');
const memoryScreen = document.querySelector('.memory-screen');
const wordsScreen = document.querySelector('.words-screen');
const changeScreen = document.querySelector('.change-screen');
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
  activeExerciseTitle.hidden = true;
  game.hidden = true; result.hidden = true; memoryScreen.hidden = true; wordsScreen.hidden = true; changeScreen.hidden = true; home.hidden = false; tip.hidden = false;
}

function startExercise() {
  window.clearTimeout(advanceTimer);
  activeExercise = 'count';
  activeExerciseTitle.textContent = 'Быстрый счёт';
  questions = createExercise(); currentQuestion = 0; mistakes = 0;
  activeExerciseTitle.hidden = false;
  home.hidden = true; tip.hidden = true; result.hidden = true; memoryScreen.hidden = true; wordsScreen.hidden = true; changeScreen.hidden = true; game.hidden = false;
  renderQuestion();
}

function renderQuestion() {
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
    return;
  }
  answers.querySelectorAll('button').forEach(item => item.disabled = true);
  answers.classList.add('is-answered');
  button.classList.add('is-correct');
  feedback.textContent = 'Верно! Отличная работа.';
  feedback.className = 'answer-feedback is-correct';
  progressBar.style.width = `${((currentQuestion + 1) / TOTAL_QUESTIONS) * 100}%`;
  advanceTimer = window.setTimeout(() => {
    currentQuestion += 1;
    currentQuestion === TOTAL_QUESTIONS ? finishExercise() : renderQuestion();
  }, 1300);
}

function finishExercise() {
  game.hidden = true; result.hidden = false;
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
  if (!memoryScreen.hidden && memoryRound === TOTAL_QUESTIONS) {
    finishMemoryExercise();
    return;
  }
  activeExerciseTitle.textContent = 'Запомни картинку';
  activeExerciseTitle.hidden = false;
  home.hidden = true; tip.hidden = true; game.hidden = true; result.hidden = true; wordsScreen.hidden = true; changeScreen.hidden = true; memoryScreen.hidden = false;
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
      advanceTimer = window.setTimeout(() => { memoryRound += 1; memoryRound === TOTAL_QUESTIONS ? finishMemoryExercise() : startMemoryExercise(); }, 1500);
    });
    list.append(button);
  });
}
function beginMemoryExercise() { memoryRound = 0; memoryMistakes = 0; memorySequence = createNewSequence('agiliko-memory-order', TOTAL_QUESTIONS * 3); startMemoryExercise(); }
function finishMemoryExercise() {
  memoryScreen.hidden = true; result.hidden = false;
  const flawless = memoryMistakes === 0;
  document.querySelector('#result-title').textContent = flawless ? 'Прекрасно!' : 'Упражнение пройдено!';
  document.querySelector('#result-description').textContent = flawless ? 'Вы запомнили все 10 наборов без ошибок. Так держать!' : 'Вы прошли все 10 заданий на память.';
  document.querySelector('#result-correct-number').textContent = TOTAL_QUESTIONS;
  document.querySelector('#result-mistakes-number').textContent = memoryMistakes;
}
document.querySelector('[data-exercise="memory"]')?.addEventListener('click', beginMemoryExercise);
document.querySelector('#memory-ready')?.addEventListener('click', askMemoryQuestion);
function beginWordsExercise() { wordsRound = 0; wordsMistakes = 0; wordsSequence = createNewSequence('agiliko-words-order', TOTAL_QUESTIONS); startWordsRound(); }
function startWordsRound() {
  activeExercise = 'words'; activeExerciseTitle.textContent = 'Слово за словом'; activeExerciseTitle.hidden = false;
  home.hidden = true; tip.hidden = true; game.hidden = true; result.hidden = true; memoryScreen.hidden = true; changeScreen.hidden = true; wordsScreen.hidden = false;
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
        feedback.textContent = 'Неверно. Попробуйте ещё раз.'; feedback.className = 'answer-feedback is-wrong'; return;
      }
      list.querySelectorAll('button').forEach(choice => choice.disabled = true); list.classList.add('is-answered'); button.classList.add('is-correct');
      feedback.textContent = 'Верно! Отличная работа.'; feedback.className = 'answer-feedback is-correct';
      document.querySelector('#words-progress').style.width = `${((wordsRound + 1) / TOTAL_QUESTIONS) * 100}%`;
      advanceTimer = window.setTimeout(() => { wordsRound += 1; wordsRound === TOTAL_QUESTIONS ? finishWordsExercise() : startWordsRound(); }, 1300);
    });
    list.append(button);
  });
}
function finishWordsExercise() {
  wordsScreen.hidden = true; result.hidden = false;
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
function beginChangeExercise() { changeRound = 0; changeMistakes = 0; changeSequence = createChangeSequence(); startChangeRound(); }
function startChangeRound() {
  activeExercise = 'change'; activeExerciseTitle.textContent = 'Сдача в магазине'; activeExerciseTitle.hidden = false;
  home.hidden = true; tip.hidden = true; game.hidden = true; result.hidden = true; memoryScreen.hidden = true; wordsScreen.hidden = true; changeScreen.hidden = false;
  const question = changeSequence[changeRound];
  document.querySelector('#change-round').textContent = changeRound + 1; document.querySelector('#change-mistakes').textContent = changeMistakes;
  document.querySelector('#change-progress').style.width = `${(changeRound / TOTAL_QUESTIONS) * 100}%`;
  document.querySelector('#change-story').innerHTML = `<p>Покупка стоит <strong>${question.price} ₽</strong></p><p>Вы заплатили <strong>${question.paid} ₽</strong></p>`;
  const list = document.querySelector('#change-options'); const feedback = document.querySelector('#change-feedback'); list.innerHTML = ''; list.classList.remove('is-answered'); feedback.textContent = ''; feedback.className = 'answer-feedback';
  question.options.forEach(option => { const button = document.createElement('button'); button.className = 'change-option'; button.type = 'button'; button.textContent = `${option} ₽`; button.addEventListener('click', () => {
    if (option !== question.answer) { button.disabled = true; button.classList.add('is-wrong'); changeMistakes += 1; document.querySelector('#change-mistakes').textContent = changeMistakes; feedback.textContent = 'Неверно. Попробуйте ещё раз.'; feedback.className = 'answer-feedback is-wrong'; return; }
    list.querySelectorAll('button').forEach(item => item.disabled = true); list.classList.add('is-answered'); button.classList.add('is-correct'); feedback.textContent = 'Верно! Отличная работа.'; feedback.className = 'answer-feedback is-correct'; document.querySelector('#change-progress').style.width = `${((changeRound + 1) / TOTAL_QUESTIONS) * 100}%`; advanceTimer = window.setTimeout(() => { changeRound += 1; changeRound === TOTAL_QUESTIONS ? finishChangeExercise() : startChangeRound(); }, 1300);
  }); list.append(button); });
}
function finishChangeExercise() { changeScreen.hidden = true; result.hidden = false; const flawless = changeMistakes === 0; document.querySelector('#result-title').textContent = flawless ? 'Прекрасно!' : 'Упражнение пройдено!'; document.querySelector('#result-description').textContent = flawless ? 'Вы правильно посчитали всю сдачу. Так держать!' : 'Вы прошли 10 заданий со сдачей.'; document.querySelector('#result-correct-number').textContent = TOTAL_QUESTIONS; document.querySelector('#result-mistakes-number').textContent = changeMistakes; }
document.querySelector('[data-exercise="change"]')?.addEventListener('click', beginChangeExercise);
document.querySelectorAll('[data-action="home"]').forEach(button => button.addEventListener('click', showHome));
document.querySelector('[data-action="restart"]')?.addEventListener('click', () => activeExercise === 'memory' ? beginMemoryExercise() : activeExercise === 'words' ? beginWordsExercise() : activeExercise === 'change' ? beginChangeExercise() : startExercise());

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js'));
}
