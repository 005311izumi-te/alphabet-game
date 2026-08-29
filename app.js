const LETTERS = [
  ["A", "エー"], ["B", "ビー"], ["C", "シー"], ["D", "ディー"], ["E", "イー"],
  ["F", "エフ"], ["G", "ジー"], ["H", "エイチ"], ["I", "アイ"], ["J", "ジェー"],
  ["K", "ケー"], ["L", "エル"], ["M", "エム"], ["N", "エヌ"], ["O", "オー"],
  ["P", "ピー"], ["Q", "キュー"], ["R", "アール"], ["S", "エス"], ["T", "ティー"],
  ["U", "ユー"], ["V", "ヴィー"], ["W", "ダブリュー"], ["X", "エックス"], ["Y", "ワイ"],
  ["Z", "ズィー"]
];

const READING = Object.fromEntries(LETTERS);
const ALL_UPPER = LETTERS.map(([letter]) => letter);
const ALL_LOWER = ALL_UPPER.map((letter) => letter.toLowerCase());

const STAGES = {
  upper: [
    { name: "そら", icon: "☁️", letters: "ABCDE".split("") },
    { name: "もり", icon: "🌳", letters: "FGHIJ".split("") },
    { name: "うみ", icon: "🐳", letters: "KLMNO".split("") },
    { name: "ほし", icon: "⭐", letters: "PQRST".split("") },
    { name: "にじ", icon: "🌈", letters: "UVWXYZ".split("") }
  ],
  lower: [
    { name: "そら", icon: "☁️", letters: "abcde".split("") },
    { name: "もり", icon: "🌳", letters: "fghij".split("") },
    { name: "うみ", icon: "🐳", letters: "klmno".split("") },
    { name: "ほし", icon: "⭐", letters: "pqrst".split("") },
    { name: "にじ", icon: "🌈", letters: "uvwxyz".split("") }
  ]
};

const SIMILAR = {
  A: ["H", "V", "M"], B: ["D", "P", "R"], C: ["G", "O", "S"], D: ["B", "O", "P"],
  E: ["F", "B", "L"], F: ["E", "P", "T"], G: ["C", "J", "Q"], H: ["A", "N", "M"],
  I: ["J", "L", "T"], J: ["I", "G", "U"], K: ["X", "R", "Y"], L: ["I", "E", "T"],
  M: ["N", "H", "W"], N: ["M", "H", "K"], O: ["Q", "C", "D"], P: ["R", "B", "F"],
  Q: ["O", "G", "C"], R: ["P", "B", "K"], S: ["C", "Z", "G"], T: ["I", "F", "Y"],
  U: ["V", "J", "O"], V: ["U", "Y", "W"], W: ["M", "V", "U"], X: ["K", "Y", "V"],
  Y: ["V", "T", "X"], Z: ["S", "N", "X"],
  a: ["o", "e", "u"], b: ["d", "p", "q"], c: ["o", "e", "s"], d: ["b", "p", "q"],
  e: ["c", "a", "o"], f: ["t", "l", "i"], g: ["q", "y", "j"], h: ["n", "b", "k"],
  i: ["j", "l", "t"], j: ["i", "g", "y"], k: ["h", "x", "r"], l: ["i", "t", "f"],
  m: ["n", "w", "h"], n: ["m", "h", "r"], o: ["a", "c", "q"], p: ["q", "b", "d"],
  q: ["p", "g", "d"], r: ["n", "v", "p"], s: ["c", "z", "a"], t: ["f", "l", "i"],
  u: ["v", "n", "o"], v: ["u", "w", "y"], w: ["m", "v", "u"], x: ["k", "y", "v"],
  y: ["v", "g", "j"], z: ["s", "x", "n"]
};

const STORAGE_KEY = "alphabet-tankentai-v1";
const DEFAULT_PROGRESS = {
  upper: [false, false, false, false, false],
  lower: [false, false, false, false, false],
  final: false,
  stars: 0
};

const app = document.querySelector("#app");
const backButton = document.querySelector("#backButton");
const brandButton = document.querySelector("#brandButton");
const soundButton = document.querySelector("#soundButton");
const soundIcon = document.querySelector("#soundIcon");
const soundLabel = document.querySelector("#soundLabel");
const toast = document.querySelector("#toast");
const celebration = document.querySelector("#celebration");

let progress = loadProgress();
let soundOn = localStorage.getItem("alphabet-sound") !== "off";
let current = {
  screen: "home",
  mode: null,
  stageIndex: null,
  phase: null,
  order: [],
  index: 0,
  options: [],
  wrongChoices: [],
  score: 0,
  combo: 0,
  maxCombo: 0,
  ink: 0,
  finalTasks: []
};

let audioContext = null;
let toastTimer = null;
let transitionTimer = null;

function loadProgress() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!saved) return structuredClone(DEFAULT_PROGRESS);
    return {
      upper: Array.isArray(saved.upper) ? saved.upper.slice(0, 5).map(Boolean).concat(Array(5).fill(false)).slice(0, 5) : [...DEFAULT_PROGRESS.upper],
      lower: Array.isArray(saved.lower) ? saved.lower.slice(0, 5).map(Boolean).concat(Array(5).fill(false)).slice(0, 5) : [...DEFAULT_PROGRESS.lower],
      final: Boolean(saved.final),
      stars: Number(saved.stars) || 0
    };
  } catch {
    return structuredClone(DEFAULT_PROGRESS);
  }
}

function saveProgress() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
}

function modeLabel(mode) {
  return mode === "upper" ? "おおもじ" : "こもじ";
}

function readingFor(letter) {
  return READING[letter.toUpperCase()];
}

function randomItem(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function shuffle(items) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function uniq(items) {
  return [...new Set(items)];
}

function makeOptions(correct, pool) {
  const preferred = SIMILAR[correct] || [];
  const extras = shuffle(pool.filter((item) => item !== correct));
  return shuffle(uniq([correct, ...preferred, ...extras]).slice(0, 4));
}

function setScreen(name) {
  current.screen = name;
  backButton.hidden = name === "home";
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function focusApp() {
  requestAnimationFrame(() => app.focus({ preventScroll: true }));
}

function showToast(message, kind = "") {
  clearTimeout(toastTimer);
  toast.textContent = message;
  toast.className = `toast show ${kind}`.trim();
  toastTimer = setTimeout(() => {
    toast.className = "toast";
  }, 1200);
}

function updateSoundButton() {
  soundButton.setAttribute("aria-pressed", String(soundOn));
  soundIcon.textContent = soundOn ? "🔊" : "🔇";
  soundLabel.textContent = soundOn ? "おと あり" : "おと なし";
}

function speak(text) {
  if (!soundOn || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "ja-JP";
  utterance.rate = 0.82;
  utterance.pitch = 1.06;
  utterance.volume = 1;
  window.speechSynthesis.speak(utterance);
}

function speakLetter(letter, withMode = false) {
  const lead = withMode ? `${letter === letter.toUpperCase() ? "おおもじ" : "こもじ"}、` : "";
  speak(`${lead}${readingFor(letter)}`);
}

function ensureAudioContext() {
  if (!audioContext) {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (AudioCtx) audioContext = new AudioCtx();
  }
  if (audioContext?.state === "suspended") audioContext.resume();
}

function tone(frequency, start, duration, volume = 0.06) {
  if (!soundOn) return;
  ensureAudioContext();
  if (!audioContext) return;
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  oscillator.type = "sine";
  oscillator.frequency.value = frequency;
  gain.gain.setValueAtTime(volume, audioContext.currentTime + start);
  gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + start + duration);
  oscillator.connect(gain);
  gain.connect(audioContext.destination);
  oscillator.start(audioContext.currentTime + start);
  oscillator.stop(audioContext.currentTime + start + duration);
}

function goodSound() {
  tone(523.25, 0, 0.12);
  tone(659.25, 0.1, 0.12);
  tone(783.99, 0.2, 0.18);
}

function finishSound() {
  [523.25, 659.25, 783.99, 1046.5].forEach((freq, index) => tone(freq, index * 0.12, 0.22, 0.08));
}

function badSound() {
  tone(180, 0, 0.14, 0.045);
}

function burst(amount = 28) {
  celebration.innerHTML = "";
  celebration.setAttribute("aria-hidden", "false");
  const symbols = ["★", "●", "▲", "◆", "♥"];
  for (let i = 0; i < amount; i += 1) {
    const bit = document.createElement("span");
    bit.className = "confetti-bit";
    bit.textContent = randomItem(symbols);
    bit.style.left = `${Math.random() * 100}%`;
    bit.style.setProperty("--fall", `${2.1 + Math.random() * 1.8}s`);
    bit.style.setProperty("--delay", `${Math.random() * 0.45}s`);
    bit.style.setProperty("--spin", `${180 + Math.random() * 540}deg`);
    celebration.appendChild(bit);
  }
  setTimeout(() => {
    celebration.innerHTML = "";
    celebration.setAttribute("aria-hidden", "true");
  }, 4200);
}

function starsFor(mode) {
  return progress[mode].filter(Boolean).length;
}

function allModeDone(mode) {
  return starsFor(mode) === STAGES[mode].length;
}

function bothModesDone() {
  return allModeDone("upper") && allModeDone("lower");
}

function renderHome() {
  setScreen("home");
  const upperDone = starsFor("upper");
  const lowerDone = starsFor("lower");
  const finalReady = bothModesDone();

  app.innerHTML = `
    <section class="screen home-screen">
      <div class="hero-card">
        <div class="hero-mascot" aria-hidden="true">
          <span class="mascot-a">A</span>
          <span class="mascot-star">★</span>
          <span class="mascot-a mascot-a--small">a</span>
        </div>
        <p class="eyebrow">40ぷんくらいで ぜんぶ たんけん！</p>
        <h1>アルファベット<br><span>たんけんたい</span></h1>
        <p class="hero-copy">きいて　えらんで　かいて<br>26この なかまと なかよくなろう！</p>
      </div>

      <div class="mode-grid" aria-label="あそびを えらぶ">
        ${modeCard("upper", "ABC", "おおもじ", upperDone)}
        ${modeCard("lower", "abc", "こもじ", lowerDone)}
      </div>

      <button class="final-card ${finalReady ? "is-ready" : ""}" id="finalButton" type="button" ${finalReady ? "" : "disabled"}>
        <span class="final-icon" aria-hidden="true">${progress.final ? "🏆" : "🚀"}</span>
        <span class="final-copy">
          <strong>${progress.final ? "ぜんぶ できた！" : "さいごの ちょうせん"}</strong>
          <small>${finalReady ? "おおもじと こもじを まぜて あそぼう！" : "ふたつ できたら あそべるよ"}</small>
        </span>
        <span class="final-lock" aria-hidden="true">${finalReady ? "▶" : "🔒"}</span>
      </button>

      <div class="home-tip">
        <span aria-hidden="true">🔊</span>
        <p>カタカナを おすと<br>よみかたが きけるよ</p>
      </div>

      <button id="resetButton" class="text-button" type="button">さいしょから やりなおす</button>
    </section>
  `;

  document.querySelectorAll("[data-mode]").forEach((button) => {
    button.addEventListener("click", () => renderMap(button.dataset.mode));
  });
  document.querySelector("#finalButton").addEventListener("click", () => {
    if (finalReady) startFinal();
  });
  document.querySelector("#resetButton").addEventListener("click", resetProgress);
  focusApp();
}

function modeCard(mode, sample, label, done) {
  const percent = Math.round((done / 5) * 100);
  return `
    <button class="mode-card mode-card--${mode}" type="button" data-mode="${mode}">
      <span class="mode-sample">${sample}</span>
      <strong>${label}</strong>
      <span class="mode-progress" aria-label="${done}こ できた">
        <span class="mode-progress-bar"><span style="width:${percent}%"></span></span>
        <span>${done}/5 ★</span>
      </span>
    </button>
  `;
}

function renderMap(mode) {
  current.mode = mode;
  setScreen("map");

  const cards = STAGES[mode].map((stage, index) => {
    const done = progress[mode][index];
    const unlocked = index === 0 || progress[mode][index - 1] || done;
    const range = `${stage.letters[0]}〜${stage.letters.at(-1)}`;
    return `
      <button class="stage-card ${done ? "is-done" : ""} ${unlocked ? "" : "is-locked"}"
        type="button"
        data-stage="${index}"
        ${unlocked ? "" : "disabled"}>
        <span class="stage-icon" aria-hidden="true">${unlocked ? stage.icon : "🔒"}</span>
        <span class="stage-number">${index + 1}</span>
        <span class="stage-copy">
          <strong>${stage.name}</strong>
          <small>${range}</small>
        </span>
        <span class="stage-star" aria-hidden="true">${done ? "★" : "☆"}</span>
      </button>
    `;
  }).join("");

  app.innerHTML = `
    <section class="screen map-screen">
      <div class="screen-title">
        <span class="title-bubble ${mode}">${mode === "upper" ? "ABC" : "abc"}</span>
        <div>
          <p>${modeLabel(mode)}</p>
          <h1>どこへ いく？</h1>
        </div>
      </div>

      <div class="map-path">${cards}</div>

      <div class="map-footer">
        <div class="star-count"><span aria-hidden="true">⭐</span> ${starsFor(mode)}/5</div>
        <p>${allModeDone(mode) ? "ぜんぶ できた！" : "うえから じゅんに すすもう"}</p>
      </div>
    </section>
  `;

  document.querySelectorAll("[data-stage]").forEach((button) => {
    button.addEventListener("click", () => startStage(mode, Number(button.dataset.stage)));
  });
  focusApp();
}

function startStage(mode, stageIndex) {
  current.mode = mode;
  current.stageIndex = stageIndex;
  current.phase = "intro";
  current.index = 0;
  current.score = 0;
  current.combo = 0;
  current.maxCombo = 0;
  current.wrongChoices = [];
  current.ink = 0;
  renderIntro();
}

function stage() {
  return STAGES[current.mode][current.stageIndex];
}

function renderIntro() {
  setScreen("stage");
  const s = stage();
  const letterCards = s.letters.map((letter) => `
    <button class="learn-letter" type="button" data-say="${letter}">
      <span class="learn-glyph">${letter}</span>
      <span class="learn-reading">🔊 ${readingFor(letter)}</span>
    </button>
  `).join("");

  app.innerHTML = `
    <section class="screen lesson-screen">
      ${stageHeader(0, s.letters.length * 2)}
      <div class="lesson-heading">
        <span class="lesson-world" aria-hidden="true">${s.icon}</span>
        <div>
          <p>${s.name}の なかま</p>
          <h1>よみかたを きこう！</h1>
        </div>
      </div>
      <p class="lesson-note">カタカナを おして きいてね</p>
      <div class="learn-grid">${letterCards}</div>
      <button id="startPickButton" class="big-button" type="button">
        えらぶ ゲームへ <span aria-hidden="true">→</span>
      </button>
    </section>
  `;

  document.querySelectorAll("[data-say]").forEach((button) => {
    button.addEventListener("click", () => {
      speakLetter(button.dataset.say);
      button.classList.remove("is-speaking");
      requestAnimationFrame(() => button.classList.add("is-speaking"));
      setTimeout(() => button.classList.remove("is-speaking"), 420);
    });
  });
  document.querySelector("#startPickButton").addEventListener("click", startPickRound);
  focusApp();
}

function stageHeader(done, total) {
  const percent = total ? Math.round((done / total) * 100) : 0;
  return `
    <div class="stage-header">
      <div class="stage-tag">${modeLabel(current.mode)} ${current.stageIndex + 1}/5</div>
      <div class="stage-progress" aria-label="${done}/${total}">
        <span style="width:${percent}%"></span>
      </div>
      <div class="combo-pill">★ ${current.score}</div>
    </div>
  `;
}

function startPickRound() {
  current.phase = "pick";
  current.order = shuffle(stage().letters);
  current.index = 0;
  current.wrongChoices = [];
  preparePick();
}

function preparePick() {
  const letter = current.order[current.index];
  const pool = current.mode === "upper" ? ALL_UPPER : ALL_LOWER;
  current.options = makeOptions(letter, pool);
  current.wrongChoices = [];
  renderPick();
}

function renderPick() {
  setScreen("stage");
  const letter = current.order[current.index];
  const total = stage().letters.length * 2;
  const done = current.index;
  const choices = current.options.map((option) => `
    <button class="choice-button ${current.wrongChoices.includes(option) ? "is-wrong" : ""}"
      type="button"
      data-choice="${option}"
      ${current.wrongChoices.includes(option) ? "disabled" : ""}>
      ${option}
    </button>
  `).join("");

  app.innerHTML = `
    <section class="screen game-screen">
      ${stageHeader(done, total)}
      <div class="question-card">
        <span class="question-kicker">どれかな？</span>
        <button id="promptSound" class="reading-prompt" type="button">
          <span aria-hidden="true">🔊</span>
          <strong>${readingFor(letter)}</strong>
        </button>
        <p>${readingFor(letter)} は どれ？</p>
      </div>
      <div class="choice-grid">${choices}</div>
      <p class="mini-help">よく みて えらんでね</p>
    </section>
  `;

  document.querySelector("#promptSound").addEventListener("click", () => speakLetter(letter));
  document.querySelectorAll("[data-choice]").forEach((button) => {
    button.addEventListener("click", () => answerPick(button.dataset.choice));
  });
  focusApp();
  setTimeout(() => speakLetter(letter), 180);
}

function answerPick(choice) {
  if (transitionTimer) return;
  const correct = current.order[current.index];
  if (choice !== correct) {
    current.combo = 0;
    current.wrongChoices.push(choice);
    badSound();
    showToast("おしい！ もういっかい", "try");
    renderPick();
    return;
  }

  current.score += 1;
  current.combo += 1;
  current.maxCombo = Math.max(current.maxCombo, current.combo);
  goodSound();
  showToast(current.combo >= 3 ? `${current.combo}かい れんぞく！` : "せいかい！", "good");

  document.querySelectorAll("[data-choice]").forEach((button) => {
    button.disabled = true;
    if (button.dataset.choice === correct) button.classList.add("is-correct");
  });

  transitionTimer = setTimeout(() => {
    transitionTimer = null;
    current.index += 1;
    if (current.index >= current.order.length) {
      startWriteRound();
    } else {
      preparePick();
    }
  }, 620);
}

function startWriteRound() {
  current.phase = "write";
  current.order = shuffle(stage().letters);
  current.index = 0;
  current.ink = 0;
  renderWrite();
}

function renderWrite() {
  setScreen("stage");
  const letter = current.order[current.index];
  const total = stage().letters.length * 2;
  const done = stage().letters.length + current.index;

  app.innerHTML = `
    <section class="screen write-screen">
      ${stageHeader(done, total)}
      <div class="write-heading">
        <span class="question-kicker">かいてみよう！</span>
        <button id="writeSound" class="reading-prompt compact" type="button">
          <span aria-hidden="true">🔊</span>
          <strong>${readingFor(letter)}</strong>
        </button>
        <p>${readingFor(letter)} を かこう！</p>
      </div>

      <div class="canvas-wrap" id="canvasWrap">
        <span class="trace-letter" aria-hidden="true">${letter}</span>
        <canvas id="writeCanvas" aria-label="${readingFor(letter)}を かく ところ"></canvas>
        <div class="pencil-dot" aria-hidden="true">✏️</div>
      </div>

      <div class="write-actions">
        <button id="clearCanvas" class="soft-button" type="button">↻ けす</button>
        <button id="doneWrite" class="big-button small" type="button" disabled>できた！ →</button>
      </div>
      <p class="mini-help">うすい おてほんを なぞってね</p>
    </section>
  `;

  document.querySelector("#writeSound").addEventListener("click", () => speakLetter(letter));
  document.querySelector("#clearCanvas").addEventListener("click", clearCanvas);
  document.querySelector("#doneWrite").addEventListener("click", finishWrite);
  setupCanvas();
  focusApp();
  setTimeout(() => speakLetter(letter), 160);
}

function setupCanvas() {
  const canvas = document.querySelector("#writeCanvas");
  const wrap = document.querySelector("#canvasWrap");
  const doneButton = document.querySelector("#doneWrite");
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const rect = wrap.getBoundingClientRect();
  canvas.width = Math.round(rect.width * dpr);
  canvas.height = Math.round(rect.height * dpr);
  canvas.style.width = `${rect.width}px`;
  canvas.style.height = `${rect.height}px`;

  const ctx = canvas.getContext("2d");
  ctx.scale(dpr, dpr);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = "#5147d9";
  ctx.lineWidth = Math.max(8, Math.min(rect.width, rect.height) * 0.035);

  current.ink = 0;
  let drawing = false;
  let previous = null;

  function position(event) {
    const bounds = canvas.getBoundingClientRect();
    return {
      x: event.clientX - bounds.left,
      y: event.clientY - bounds.top
    };
  }

  function start(event) {
    drawing = true;
    previous = position(event);
    canvas.setPointerCapture?.(event.pointerId);
    ctx.beginPath();
    ctx.moveTo(previous.x, previous.y);
    event.preventDefault();
  }

  function move(event) {
    if (!drawing || !previous) return;
    const next = position(event);
    ctx.lineTo(next.x, next.y);
    ctx.stroke();
    current.ink += Math.hypot(next.x - previous.x, next.y - previous.y);
    previous = next;
    if (current.ink > Math.max(90, rect.width * 0.32)) {
      doneButton.disabled = false;
      wrap.classList.add("has-ink");
    }
    event.preventDefault();
  }

  function end(event) {
    if (!drawing) return;
    drawing = false;
    previous = null;
    canvas.releasePointerCapture?.(event.pointerId);
    event.preventDefault();
  }

  canvas.addEventListener("pointerdown", start);
  canvas.addEventListener("pointermove", move);
  canvas.addEventListener("pointerup", end);
  canvas.addEventListener("pointercancel", end);
}

function clearCanvas() {
  const canvas = document.querySelector("#writeCanvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  current.ink = 0;
  document.querySelector("#doneWrite").disabled = true;
  document.querySelector("#canvasWrap").classList.remove("has-ink");
}

function finishWrite() {
  const button = document.querySelector("#doneWrite");
  if (button?.disabled) {
    showToast("もうすこし かいてみよう", "try");
    return;
  }

  current.score += 1;
  current.combo += 1;
  current.maxCombo = Math.max(current.maxCombo, current.combo);
  goodSound();
  showToast("かけた！", "good");
  button.disabled = true;

  transitionTimer = setTimeout(() => {
    transitionTimer = null;
    current.index += 1;
    if (current.index >= current.order.length) {
      completeStage();
    } else {
      renderWrite();
    }
  }, 580);
}

function completeStage() {
  const wasDone = progress[current.mode][current.stageIndex];
  progress[current.mode][current.stageIndex] = true;
  if (!wasDone) progress.stars += 1;
  saveProgress();
  finishSound();
  burst(34);
  setScreen("stage");

  const s = stage();
  const nextExists = current.stageIndex < STAGES[current.mode].length - 1;
  app.innerHTML = `
    <section class="screen complete-screen">
      <div class="complete-rays" aria-hidden="true"></div>
      <div class="big-star" aria-hidden="true">⭐</div>
      <p class="eyebrow">${s.name} クリア！</p>
      <h1>やったね！</h1>
      <p class="complete-copy">${s.letters.join("　")}<br>ぜんぶ できたよ！</p>
      <div class="result-row">
        <div><strong>${current.score}</strong><span>できた</span></div>
        <div><strong>${current.maxCombo}</strong><span>れんぞく</span></div>
        <div><strong>${starsFor(current.mode)}</strong><span>★</span></div>
      </div>
      ${
        nextExists
          ? `<button id="nextStage" class="big-button" type="button">つぎへ すすむ →</button>
             <button id="backMap" class="soft-button wide" type="button">ちずへ もどる</button>`
          : `<button id="backHome" class="big-button" type="button">${bothModesDone() ? "さいごの ちょうせんへ →" : "おうちへ →"}</button>`
      }
    </section>
  `;

  if (nextExists) {
    document.querySelector("#nextStage").addEventListener("click", () => startStage(current.mode, current.stageIndex + 1));
    document.querySelector("#backMap").addEventListener("click", () => renderMap(current.mode));
  } else {
    document.querySelector("#backHome").addEventListener("click", () => {
      if (bothModesDone()) startFinal();
      else renderHome();
    });
  }
  focusApp();
}

function makeFinalTasks() {
  const letters = shuffle([...ALL_UPPER, ...ALL_LOWER]);
  const readTasks = letters.slice(0, 8).map((letter) => ({
    kind: "pick",
    letter,
    mode: letter === letter.toUpperCase() ? "upper" : "lower"
  }));

  const pairLetters = shuffle(ALL_UPPER).slice(0, 6);
  const pairTasks = pairLetters.map((letter) => ({
    kind: "pair",
    letter,
    answer: letter.toLowerCase()
  }));

  const writeTasks = shuffle([...ALL_UPPER, ...ALL_LOWER]).slice(0, 5).map((letter) => ({
    kind: "write",
    letter
  }));

  return shuffle([...readTasks, ...pairTasks, ...writeTasks]);
}

function startFinal() {
  if (!bothModesDone()) {
    renderHome();
    return;
  }
  current.mode = null;
  current.stageIndex = null;
  current.phase = "final";
  current.finalTasks = makeFinalTasks();
  current.index = 0;
  current.score = 0;
  current.combo = 0;
  current.maxCombo = 0;
  current.wrongChoices = [];
  current.options = [];
  renderFinalTask(true);
}

function renderFinalTask(newTask = false) {
  setScreen("final");
  const task = current.finalTasks[current.index];
  if (!task) {
    completeFinal();
    return;
  }

  if (task.kind === "write") {
    renderFinalWrite(task);
    return;
  }

  if (newTask || current.options.length === 0) {
    if (task.kind === "pair") {
      current.options = makeOptions(task.answer, ALL_LOWER);
    } else {
      const pool = task.mode === "upper" ? ALL_UPPER : ALL_LOWER;
      current.options = makeOptions(task.letter, pool);
    }
    current.wrongChoices = [];
  }

  const answer = task.kind === "pair" ? task.answer : task.letter;
  const prompt = task.kind === "pair"
    ? `${task.letter} の こもじは どれ？`
    : `${modeLabel(task.mode)}の ${readingFor(task.letter)} は どれ？`;

  const choices = current.options.map((option) => `
    <button class="choice-button ${current.wrongChoices.includes(option) ? "is-wrong" : ""}"
      type="button"
      data-final-choice="${option}"
      ${current.wrongChoices.includes(option) ? "disabled" : ""}>
      ${option}
    </button>
  `).join("");

  app.innerHTML = `
    <section class="screen game-screen final-screen">
      ${finalHeader()}
      <div class="boss-badge"><span aria-hidden="true">🚀</span> さいごの ちょうせん</div>
      <div class="question-card">
        <span class="question-kicker">${task.kind === "pair" ? "ペアを みつけよう！" : "どれかな？"}</span>
        ${task.kind === "pick" ? `
          <button id="finalSound" class="reading-prompt" type="button">
            <span aria-hidden="true">🔊</span><strong>${readingFor(task.letter)}</strong>
          </button>` : `<div class="pair-glyph">${task.letter}</div>`}
        <p>${prompt}</p>
      </div>
      <div class="choice-grid">${choices}</div>
    </section>
  `;

  if (task.kind === "pick") {
    document.querySelector("#finalSound").addEventListener("click", () => speakLetter(task.letter, true));
    setTimeout(() => speakLetter(task.letter, true), 150);
  }

  document.querySelectorAll("[data-final-choice]").forEach((button) => {
    button.addEventListener("click", () => answerFinalChoice(button.dataset.finalChoice, answer));
  });
  focusApp();
}

function finalHeader() {
  const done = current.index;
  const total = current.finalTasks.length;
  const percent = Math.round((done / total) * 100);
  return `
    <div class="stage-header final">
      <div class="stage-tag">ラスト</div>
      <div class="stage-progress" aria-label="${done}/${total}"><span style="width:${percent}%"></span></div>
      <div class="combo-pill">★ ${current.score}</div>
    </div>
  `;
}

function answerFinalChoice(choice, answer) {
  if (transitionTimer) return;
  if (choice !== answer) {
    current.combo = 0;
    current.wrongChoices.push(choice);
    badSound();
    showToast("おしい！ もういっかい", "try");
    renderFinalTask(false);
    return;
  }

  current.score += 1;
  current.combo += 1;
  current.maxCombo = Math.max(current.maxCombo, current.combo);
  goodSound();
  showToast("せいかい！", "good");

  document.querySelectorAll("[data-final-choice]").forEach((button) => {
    button.disabled = true;
    if (button.dataset.finalChoice === answer) button.classList.add("is-correct");
  });

  transitionTimer = setTimeout(() => {
    transitionTimer = null;
    current.index += 1;
    current.options = [];
    renderFinalTask(true);
  }, 600);
}

function renderFinalWrite(task) {
  current.ink = 0;
  const mode = task.letter === task.letter.toUpperCase() ? "upper" : "lower";

  app.innerHTML = `
    <section class="screen write-screen final-screen">
      ${finalHeader()}
      <div class="boss-badge"><span aria-hidden="true">🚀</span> さいごの ちょうせん</div>
      <div class="write-heading">
        <span class="question-kicker">さいごまで かこう！</span>
        <button id="writeSound" class="reading-prompt compact" type="button">
          <span aria-hidden="true">🔊</span>
          <strong>${readingFor(task.letter)}</strong>
        </button>
        <p>${modeLabel(mode)}の ${readingFor(task.letter)}を かこう！</p>
      </div>
      <div class="canvas-wrap" id="canvasWrap">
        <span class="trace-letter" aria-hidden="true">${task.letter}</span>
        <canvas id="writeCanvas" aria-label="${readingFor(task.letter)}を かく ところ"></canvas>
        <div class="pencil-dot" aria-hidden="true">✏️</div>
      </div>
      <div class="write-actions">
        <button id="clearCanvas" class="soft-button" type="button">↻ けす</button>
        <button id="doneWrite" class="big-button small" type="button" disabled>できた！ →</button>
      </div>
    </section>
  `;

  document.querySelector("#writeSound").addEventListener("click", () => speakLetter(task.letter, true));
  document.querySelector("#clearCanvas").addEventListener("click", clearCanvas);
  document.querySelector("#doneWrite").addEventListener("click", finishFinalWrite);
  setupCanvas();
  focusApp();
  setTimeout(() => speakLetter(task.letter, true), 150);
}

function finishFinalWrite() {
  const button = document.querySelector("#doneWrite");
  if (button?.disabled) {
    showToast("もうすこし かいてみよう", "try");
    return;
  }
  current.score += 1;
  current.combo += 1;
  current.maxCombo = Math.max(current.maxCombo, current.combo);
  goodSound();
  showToast("かけた！", "good");
  button.disabled = true;

  transitionTimer = setTimeout(() => {
    transitionTimer = null;
    current.index += 1;
    current.options = [];
    renderFinalTask(true);
  }, 560);
}

function completeFinal() {
  progress.final = true;
  saveProgress();
  finishSound();
  setTimeout(finishSound, 550);
  burst(64);
  setScreen("final");

  app.innerHTML = `
    <section class="screen master-screen">
      <div class="master-crown" aria-hidden="true">👑</div>
      <p class="eyebrow">A から Z まで</p>
      <h1>ぜんぶ<br>できた！</h1>
      <div class="master-badge" aria-hidden="true">
        <span>A</span><strong>★</strong><span>a</span>
      </div>
      <p>おおもじも こもじも<br>とっても よく がんばったね！</p>
      <div class="result-row master-results">
        <div><strong>${current.score}</strong><span>できた</span></div>
        <div><strong>${current.maxCombo}</strong><span>れんぞく</span></div>
        <div><strong>10</strong><span>★</span></div>
      </div>
      <button id="homeAfterFinal" class="big-button" type="button">おうちへ →</button>
    </section>
  `;

  speak("ぜんぶ できた！ とっても よく がんばったね！");
  document.querySelector("#homeAfterFinal").addEventListener("click", renderHome);
  focusApp();
}

function resetProgress() {
  const ok = window.confirm("ほんとうに さいしょから やりなおす？");
  if (!ok) return;
  progress = structuredClone(DEFAULT_PROGRESS);
  saveProgress();
  renderHome();
  showToast("さいしょから はじめよう！");
}

function goBack() {
  clearTimeout(transitionTimer);
  transitionTimer = null;
  window.speechSynthesis?.cancel();

  if (current.screen === "map") {
    renderHome();
    return;
  }
  if (current.screen === "stage") {
    renderMap(current.mode);
    return;
  }
  if (current.screen === "final") {
    renderHome();
    return;
  }
  renderHome();
}

backButton.addEventListener("click", goBack);
brandButton.addEventListener("click", renderHome);
soundButton.addEventListener("click", () => {
  soundOn = !soundOn;
  localStorage.setItem("alphabet-sound", soundOn ? "on" : "off");
  updateSoundButton();
  if (soundOn) {
    goodSound();
    speak("おと あり");
  } else {
    window.speechSynthesis?.cancel();
  }
});

document.addEventListener("visibilitychange", () => {
  if (document.hidden) window.speechSynthesis?.cancel();
});

if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  });
}

updateSoundButton();
renderHome();
