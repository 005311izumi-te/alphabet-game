// まちがえた もじを、すこし あとで もういちど だす おさらいきのう

function reviewTaskKey(task) {
  return `${task.kind}:${task.letter}:${task.answer || ""}`;
}

function uniqueReviewTasks(tasks) {
  const seen = new Set();
  return tasks.filter((task) => {
    const key = reviewTaskKey(task);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function copyFinalReviewTask(task) {
  return {
    kind: task.kind,
    letter: task.letter,
    ...(task.mode ? { mode: task.mode } : {}),
    ...(task.answer ? { answer: task.answer } : {}),
    review: true
  };
}

startPickRound = function () {
  current.phase = "pick";
  current.order = shuffle(stage().letters);
  current.index = 0;
  current.wrongChoices = [];
  current.reviewQueue = [];
  current.reviewNext = [];
  current.missedThisQuestion = false;
  preparePick();
};

preparePick = function () {
  const letter = current.order[current.index];
  const pool = current.mode === "upper" ? ALL_UPPER : ALL_LOWER;
  current.options = makeOptions(letter, pool);
  current.wrongChoices = [];
  current.missedThisQuestion = false;
  renderPick();
};

renderPick = function () {
  setScreen("stage");
  const letter = current.order[current.index];
  const isReview = current.phase === "review";
  const total = stage().letters.length * 2;
  const done = isReview ? stage().letters.length : Math.min(current.index, stage().letters.length);
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
        <span class="question-kicker">${isReview ? "おさらい！" : "どれかな？"}</span>
        <button id="promptSound" class="reading-prompt" type="button">
          <span aria-hidden="true">🔊</span>
          <strong>${readingFor(letter)}</strong>
        </button>
        <p>${readingFor(letter)} は どれ？</p>
      </div>
      <div class="choice-grid">${choices}</div>
      <p class="mini-help">${isReview ? "こんどは いっぱつで できるかな？" : "よく みて えらんでね"}</p>
    </section>
  `;

  document.querySelector("#promptSound").addEventListener("click", () => speakLetter(letter));
  document.querySelectorAll("[data-choice]").forEach((button) => {
    button.addEventListener("click", () => answerPick(button.dataset.choice));
  });
  focusApp();
  setTimeout(() => speakLetter(letter), 180);
};

function queueStageReview(letter) {
  if (current.missedThisQuestion) return;
  current.missedThisQuestion = true;
  if (current.phase === "review") {
    current.reviewNext.push(letter);
  } else {
    current.reviewQueue.push(letter);
  }
}

answerPick = function (choice) {
  if (transitionTimer) return;
  const correct = current.order[current.index];

  if (choice !== correct) {
    current.combo = 0;
    current.wrongChoices.push(choice);
    queueStageReview(correct);
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

    if (current.index < current.order.length) {
      preparePick();
      return;
    }

    if (current.phase === "review") {
      if (current.reviewNext.length > 0) {
        current.reviewQueue = uniq(current.reviewNext);
        current.reviewNext = [];
        renderStageReviewIntro(true);
      } else {
        renderStageReviewDone();
      }
      return;
    }

    if (current.reviewQueue.length > 0) {
      current.reviewQueue = uniq(current.reviewQueue);
      renderStageReviewIntro(false);
    } else {
      startWriteRound();
    }
  }, 620);
};

function renderStageReviewIntro(again = false) {
  setScreen("stage");
  const count = current.reviewQueue.length;
  app.innerHTML = `
    <section class="screen complete-screen">
      <div class="big-star" aria-hidden="true">🔁</div>
      <p class="eyebrow">おさらいタイム！</p>
      <h1>${again ? "あと すこし！" : "もういちど！"}</h1>
      <p class="complete-copy">
        ${again ? "もういちど やってみよう" : "さっき まよった もじが"}<br>
        <strong>${count}こ</strong> あるよ
      </p>
      <button id="startReviewButton" class="big-button" type="button">おさらいする →</button>
    </section>
  `;

  document.querySelector("#startReviewButton").addEventListener("click", startStageReviewRound);
  focusApp();
  speak(again ? `あと ${count}こ。もういちど やってみよう` : `おさらいタイム。${count}こ もういちど やってみよう`);
}

function startStageReviewRound() {
  current.phase = "review";
  current.order = shuffle(uniq(current.reviewQueue));
  current.reviewQueue = [];
  current.reviewNext = [];
  current.index = 0;
  preparePick();
}

function renderStageReviewDone() {
  setScreen("stage");
  app.innerHTML = `
    <section class="screen complete-screen">
      <div class="big-star" aria-hidden="true">🌟</div>
      <p class="eyebrow">おさらい できた！</p>
      <h1>ばっちり！</h1>
      <p class="complete-copy">まちがえた もじも<br>ちゃんと できたよ！</p>
      <button id="goWriteButton" class="big-button" type="button">かく ゲームへ →</button>
    </section>
  `;

  goodSound();
  document.querySelector("#goWriteButton").addEventListener("click", startWriteRound);
  focusApp();
  speak("おさらい できた。ばっちり！");
}

const startFinalBeforeReview = startFinal;
startFinal = function () {
  current.finalReviewQueue = [];
  current.finalInReview = false;
  return startFinalBeforeReview();
};

const answerFinalChoiceBeforeReview = answerFinalChoice;
answerFinalChoice = function (choice, answer) {
  const task = current.finalTasks[current.index];
  if (task && choice !== answer && !task.reviewQueued) {
    task.reviewQueued = true;
    current.finalReviewQueue.push(copyFinalReviewTask(task));
  }
  return answerFinalChoiceBeforeReview(choice, answer);
};

const completeFinalBeforeReview = completeFinal;
completeFinal = function () {
  if (current.finalReviewQueue && current.finalReviewQueue.length > 0) {
    current.finalTasks = shuffle(uniqueReviewTasks(current.finalReviewQueue));
    current.finalReviewQueue = [];
    current.finalInReview = true;
    current.index = 0;
    current.options = [];
    current.wrongChoices = [];
    renderFinalReviewIntro();
    return;
  }

  return completeFinalBeforeReview();
};

function renderFinalReviewIntro() {
  setScreen("final");
  const count = current.finalTasks.length;
  app.innerHTML = `
    <section class="screen complete-screen">
      <div class="big-star" aria-hidden="true">🔁</div>
      <p class="eyebrow">さいごの おさらい！</p>
      <h1>もういちど！</h1>
      <p class="complete-copy">まちがえた もんだいを<br><strong>${count}こ</strong> もういちど やろう！</p>
      <button id="startFinalReviewButton" class="big-button" type="button">おさらいする →</button>
    </section>
  `;

  document.querySelector("#startFinalReviewButton").addEventListener("click", () => renderFinalTask(true));
  focusApp();
  speak(`さいごの おさらい。${count}こ もういちど やろう`);
}
