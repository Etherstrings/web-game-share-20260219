(() => {
  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");

  const ui = {
    langSelect: document.getElementById("lang-select"),
    deviceSelect: document.getElementById("device-select"),
    sfxEnabled: document.getElementById("sfx-enabled"),
    sfxVolume: document.getElementById("sfx-volume"),
    bgmEnabled: document.getElementById("bgm-enabled"),
    bgmVolume: document.getElementById("bgm-volume"),
    labels: {
      lang: document.getElementById("lang-label"),
      device: document.getElementById("device-label"),
      sfxToggle: document.getElementById("sfx-toggle-label"),
      sfxVolume: document.getElementById("sfx-volume-label"),
      bgmToggle: document.getElementById("bgm-toggle-label"),
      bgmVolume: document.getElementById("bgm-volume-label"),
    },
  };

  const I18N = {
    zh: {
      levelNames: ["草地疾行", "激流突进", "风暴场", "碎石坡", "镜像湾", "暗潮岭", "浮空廊", "终极回旋"],
      ui: {
        lang: "语言",
        device: "入口模式",
        deviceAuto: "自动",
        deviceDesktop: "电脑",
        deviceMobile: "手机",
        sfxToggle: "音效开关",
        sfxVolume: "音效音量",
        bgmToggle: "背景音乐开关",
        bgmVolume: "背景音乐音量",
      },
      hud: {
        level: "关卡",
        score: "分数",
        total: "总分",
        health: "生命",
        speed: "速度",
        modeDesktop: "桌面入口",
        modeMobile: "手机入口",
        items: "道具",
        controlsDesktop: "键盘: 方向键/WASD 移动，P/空格暂停，E装备，R重开",
        controlsMobile: "触屏: 按住并拖动移动，双击暂停/继续",
      },
      panels: {
        startTitle: "宝石漂移：8关挑战",
        startLinesDesktop: ["检测到桌面入口", "方向键/WASD 操作", "每通关获得1个加速道具，可按E装备", "按 Enter 开始"],
        startLinesMobile: ["检测到手机入口", "按住屏幕并拖动手指移动", "每通关获得1个加速道具，可选择是否装备", "点击画面开始"],
        pausedTitle: "已暂停",
        pausedLines: ["按 P 或空格继续", "手机端双击画面继续"],
        clearTitle: "关卡完成",
        clearLine1: "完成第 {level} 关：{name}",
        clearLine2: "获得1个加速道具（库存 {items}）",
        clearLine3: "手机: 左半屏装备并继续，右半屏直接继续",
        winTitle: "胜利",
        winLines: ["已完成全部 8 关", "按 Enter 再来一局"],
        loseTitle: "失败",
        loseLines: ["生命耗尽", "按 Enter 重试"],
      },
    },
    en: {
      levelNames: ["Meadow Dash", "River Rush", "Storm Field", "Shard Slope", "Mirror Bay", "Riptide Ridge", "Sky Corridor", "Final Spiral"],
      ui: {
        lang: "Language",
        device: "Entry Mode",
        deviceAuto: "Auto",
        deviceDesktop: "Desktop",
        deviceMobile: "Mobile",
        sfxToggle: "SFX Toggle",
        sfxVolume: "SFX Volume",
        bgmToggle: "BGM Toggle",
        bgmVolume: "BGM Volume",
      },
      hud: {
        level: "Level",
        score: "Score",
        total: "Total",
        health: "Health",
        speed: "Speed",
        modeDesktop: "Desktop Entry",
        modeMobile: "Mobile Entry",
        items: "Items",
        controlsDesktop: "Keyboard: Arrows/WASD move, P/Space pause, E equip, R restart",
        controlsMobile: "Touch: drag to move, double-tap to pause/resume",
      },
      panels: {
        startTitle: "Gem Drift: 8-Level Run",
        startLinesDesktop: ["Desktop mode detected", "Use keyboard to move", "Clear a level to earn 1 speed item, press E to equip", "Press Enter to start"],
        startLinesMobile: ["Mobile mode detected", "Touch and drag on canvas to move", "Clear a level to earn 1 speed item", "Tap the screen to start"],
        pausedTitle: "Paused",
        pausedLines: ["Press P or Space to resume", "Double-tap screen to resume on mobile"],
        clearTitle: "Level Clear",
        clearLine1: "Cleared Level {level}: {name}",
        clearLine2: "Earned 1 speed item (bag {items})",
        clearLine3: "Mobile: left half equip+continue, right half continue",
        winTitle: "You Win",
        winLines: ["All 8 levels completed", "Press Enter to play again"],
        loseTitle: "Game Over",
        loseLines: ["All health depleted.", "Press Enter to retry"],
      },
    },
  };

  function buildLevel(levelIndex) {
    const idx = levelIndex + 1;
    const goal = 3 + levelIndex;
    const enemies = 3 + levelIndex;
    const rewardPerGem = 10 + levelIndex * 7;
    const yA = 210 + ((levelIndex * 17) % 110);
    const yB = 330 - ((levelIndex * 13) % 90);
    const yC = 250 + ((levelIndex * 7) % 120) - 60;
    const level = {
      goal,
      enemies,
      rewardPerGem,
      gems: [
        { x: 240, y: yA },
        { x: 330, y: yB },
        { x: 470, y: 260 },
        { x: 620, y: yC },
        { x: 770, y: 420 - ((levelIndex * 19) % 160) },
        { x: 910, y: 130 + ((levelIndex * 29) % 280) },
      ],
      rare: levelIndex % 2 === 1 ? { x: 560, y: 280 } : null,
    };
    if (levelIndex === 0) {
      // Keep level 1 deterministic for automated tests of clear->equip flow.
      level.gems = [
        { x: 240, y: 245 },
        { x: 360, y: 275 },
        { x: 505, y: 260 },
        { x: 700, y: 180 },
        { x: 910, y: 380 },
      ];
    }
    return level;
  }

  const LEVELS = Array.from({ length: 8 }, (_, i) => buildLevel(i));
  const GEM_MAX_ACTIVE = 3;
  const GEM_LIFETIME_SEC = 7.5;

  function detectDeviceMode() {
    const coarse = window.matchMedia && window.matchMedia("(pointer: coarse)").matches;
    const narrow = window.innerWidth <= 900;
    const ua = navigator.userAgent || "";
    const phoneUA = /Android|iPhone|iPad|iPod|HarmonyOS|Mobile/i.test(ua);
    return coarse || narrow || phoneUA ? "mobile" : "desktop";
  }

  const forcedParam = new URLSearchParams(window.location.search).get("device");
  const deviceOverride = forcedParam === "mobile" || forcedParam === "desktop" ? forcedParam : "auto";

  const state = {
    mode: "start",
    lang: "zh",
    deviceMode: deviceOverride === "auto" ? detectDeviceMode() : deviceOverride,
    player: { x: 140, y: 270, vx: 0, vy: 0, r: 16, baseSpeed: 250, speed: 250 },
    enemies: [],
    gems: [],
    rareOrbs: [],
    levelIndex: 0,
    levelScore: 0,
    totalScore: 0,
    goal: LEVELS[0].goal,
    health: 3,
    maxHealth: 3,
    rareBoosts: 0,
    speedItems: 0,
    speedBoostStacks: 0,
    flashTimer: 0,
    invulnTimer: 0,
    elapsed: 0,
    keys: new Set(),
    touch: { active: false, pointerId: null, targetX: 140, targetY: 270, lastTapAt: 0, lastTapX: 0, lastTapY: 0 },
    fullscreen: false,
    audio: {
      started: false,
      sfxEnabled: true,
      sfxVolume: 0.58,
      bgmEnabled: true,
      bgmVolume: 0.3,
    },
  };

  const audioEngine = {
    ctx: null,
    sfxGain: null,
    bgmGain: null,
    bgmLead: null,
    bgmPad: null,
    bgmStepIdx: 0,
    bgmNextStepAt: 0,
    bgmStepSec: 0.3,
    melody: [392.0, 440.0, 523.25, 659.25, 587.33, 523.25, 493.88, 440.0],
    bass: [130.81, 146.83, 164.81, 196.0, 174.61, 164.81, 146.83, 130.81],
  };

  function tr(path) {
    let node = I18N[state.lang];
    for (const seg of path.split(".")) node = node ? node[seg] : null;
    return node;
  }

  function levelName(index) {
    return I18N[state.lang].levelNames[index] || `Level ${index + 1}`;
  }

  function format(template, vars) {
    return template.replace(/\{(\w+)\}/g, (_, key) => String(vars[key] ?? ""));
  }

  function applyDeviceModeUI() {
    document.body.dataset.deviceMode = state.deviceMode;
  }

  function setDeviceMode(mode) {
    const nextMode = mode === "auto" ? detectDeviceMode() : mode;
    state.deviceMode = nextMode === "mobile" ? "mobile" : "desktop";
    state.touch.active = false;
    state.touch.pointerId = null;
    applyDeviceModeUI();
    draw();
  }

  function applyUIText() {
    ui.labels.lang.childNodes[0].nodeValue = `${tr("ui.lang")} `;
    ui.labels.device.childNodes[0].nodeValue = `${tr("ui.device")} `;
    ui.labels.sfxToggle.childNodes[0].nodeValue = `${tr("ui.sfxToggle")} `;
    ui.labels.sfxVolume.childNodes[0].nodeValue = `${tr("ui.sfxVolume")} `;
    ui.labels.bgmToggle.childNodes[0].nodeValue = `${tr("ui.bgmToggle")} `;
    ui.labels.bgmVolume.childNodes[0].nodeValue = `${tr("ui.bgmVolume")} `;
    ui.deviceSelect.querySelector('option[value="auto"]').textContent = tr("ui.deviceAuto");
    ui.deviceSelect.querySelector('option[value="desktop"]').textContent = tr("ui.deviceDesktop");
    ui.deviceSelect.querySelector('option[value="mobile"]').textContent = tr("ui.deviceMobile");
  }

  function currentLevel() {
    return LEVELS[state.levelIndex];
  }

  function recalcSpeed() {
    state.player.speed = state.player.baseSpeed + state.speedBoostStacks * 32;
  }

  function resetPlayer() {
    state.player.x = 140;
    state.player.y = 270;
    state.player.vx = 0;
    state.player.vy = 0;
    recalcSpeed();
  }

  function ensureAudioContext() {
    if (audioEngine.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;

    const ctxA = new AC();
    const sfxGain = ctxA.createGain();
    const bgmGain = ctxA.createGain();
    sfxGain.gain.value = 0;
    bgmGain.gain.value = 0;
    sfxGain.connect(ctxA.destination);
    bgmGain.connect(ctxA.destination);

    const bgmLead = ctxA.createOscillator();
    const bgmPad = ctxA.createOscillator();
    bgmLead.type = "triangle";
    bgmPad.type = "sine";
    bgmLead.frequency.value = audioEngine.melody[0];
    bgmPad.frequency.value = audioEngine.bass[0];
    bgmLead.connect(bgmGain);
    bgmPad.connect(bgmGain);
    bgmLead.start();
    bgmPad.start();

    audioEngine.ctx = ctxA;
    audioEngine.sfxGain = sfxGain;
    audioEngine.bgmGain = bgmGain;
    audioEngine.bgmLead = bgmLead;
    audioEngine.bgmPad = bgmPad;
    audioEngine.bgmStepIdx = 0;
    audioEngine.bgmNextStepAt = ctxA.currentTime;

    state.audio.started = true;
    updateAudioSettings();
  }

  function updateAudioSettings() {
    if (!audioEngine.ctx) return;
    const now = audioEngine.ctx.currentTime;
    audioEngine.sfxGain.gain.setTargetAtTime(state.audio.sfxEnabled ? state.audio.sfxVolume : 0, now, 0.02);
    audioEngine.bgmGain.gain.setTargetAtTime(state.audio.bgmEnabled ? state.audio.bgmVolume : 0, now, 0.08);
  }

  function updateBgmSequencer() {
    if (!audioEngine.ctx || !state.audio.bgmEnabled) return;
    const ctxA = audioEngine.ctx;
    const now = ctxA.currentTime;
    while (audioEngine.bgmNextStepAt <= now + 0.2) {
      const idx = audioEngine.bgmStepIdx % audioEngine.melody.length;
      const t = audioEngine.bgmNextStepAt;
      audioEngine.bgmLead.frequency.setTargetAtTime(audioEngine.melody[idx], t, 0.02);
      audioEngine.bgmPad.frequency.setTargetAtTime(audioEngine.bass[idx], t, 0.03);
      audioEngine.bgmStepIdx += 1;
      audioEngine.bgmNextStepAt += audioEngine.bgmStepSec;
    }
  }

  function triggerSfx(kind) {
    if (!audioEngine.ctx || !state.audio.sfxEnabled || state.audio.sfxVolume <= 0) return;
    const now = audioEngine.ctx.currentTime;
    const osc = audioEngine.ctx.createOscillator();
    const gain = audioEngine.ctx.createGain();
    osc.connect(gain);
    gain.connect(audioEngine.sfxGain);

    if (kind === "hit") {
      osc.type = "square";
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.exponentialRampToValueAtTime(120, now + 0.14);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
      osc.start(now);
      osc.stop(now + 0.15);
      return;
    }

    if (kind === "rare") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(510, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.2);
      gain.gain.setValueAtTime(0.16, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
      osc.start(now);
      osc.stop(now + 0.25);
      return;
    }

    if (kind === "equip") {
      osc.type = "triangle";
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(740, now + 0.16);
      gain.gain.setValueAtTime(0.17, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
      osc.start(now);
      osc.stop(now + 0.21);
      return;
    }

    osc.type = "triangle";
    osc.frequency.setValueAtTime(630, now);
    osc.frequency.exponentialRampToValueAtTime(850, now + 0.09);
    gain.gain.setValueAtTime(0.13, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.11);
    osc.start(now);
    osc.stop(now + 0.12);
  }

  function startAudioIfNeeded() {
    ensureAudioContext();
    if (audioEngine.ctx && audioEngine.ctx.state === "suspended") audioEngine.ctx.resume().catch(() => {});
    updateAudioSettings();
  }

  function spawnEnemy() {
    const top = 72;
    const bottom = canvas.height - 72;
    let y = top + Math.random() * (bottom - top);
    if (Math.abs(y - 270) < 70) {
      y += y < 270 ? -95 : 95;
      y = Math.max(top, Math.min(bottom, y));
    }
    const vx = (110 + Math.random() * 70 + state.levelIndex * 5) * (Math.random() > 0.5 ? 1 : -1);
    state.enemies.push({ x: 260 + Math.random() * 640, y, r: 17, vx });
  }

  function spawnRareOrb(pos) {
    state.rareOrbs.push({ x: pos.x, y: pos.y, r: 10 });
  }

  function isSpawnPositionSafe(x, y, radius) {
    const minGap = 26;
    if (Math.hypot(x - state.player.x, y - state.player.y) < state.player.r + radius + minGap) return false;
    for (const enemy of state.enemies) {
      if (Math.hypot(x - enemy.x, y - enemy.y) < enemy.r + radius + minGap) return false;
    }
    for (const gem of state.gems) {
      if (Math.hypot(x - gem.x, y - gem.y) < gem.r + radius + minGap) return false;
    }
    return true;
  }

  function spawnOneGem() {
    if (state.levelScore >= state.goal) return false;
    const radius = 11;
    const candidates = [...currentLevel().gems];
    for (let i = candidates.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
    }

    for (const base of candidates) {
      const x = Math.max(radius, Math.min(canvas.width - radius, base.x + (Math.random() * 32 - 16)));
      const y = Math.max(radius, Math.min(canvas.height - radius, base.y + (Math.random() * 32 - 16)));
      if (isSpawnPositionSafe(x, y, radius)) {
        state.gems.push({ x, y, r: radius, ttl: GEM_LIFETIME_SEC });
        return true;
      }
    }

    for (let i = 0; i < 24; i += 1) {
      const x = 220 + Math.random() * 700;
      const y = 80 + Math.random() * 360;
      if (isSpawnPositionSafe(x, y, radius)) {
        state.gems.push({ x, y, r: radius, ttl: GEM_LIFETIME_SEC });
        return true;
      }
    }
    return false;
  }

  function maintainGemPool() {
    if (state.mode !== "playing") return;
    const remainingNeeded = Math.max(0, state.goal - state.levelScore);
    const target = Math.min(GEM_MAX_ACTIVE, remainingNeeded);
    while (state.gems.length < target) {
      if (!spawnOneGem()) break;
    }
  }

  function loadLevel(index, keepHealth) {
    state.levelIndex = index;
    state.goal = currentLevel().goal;
    state.levelScore = 0;
    state.elapsed = 0;
    state.flashTimer = 0;
    state.invulnTimer = 0;

    if (!keepHealth) {
      state.maxHealth = 3;
      state.health = 3;
      state.totalScore = 0;
      state.rareBoosts = 0;
      state.speedItems = 0;
      state.speedBoostStacks = 0;
    } else {
      state.health = Math.min(state.health, state.maxHealth);
    }

    resetPlayer();
    state.enemies = [];
    state.gems = [];
    state.rareOrbs = [];

    for (let i = 0; i < currentLevel().enemies; i += 1) spawnEnemy();
    if (currentLevel().rare) spawnRareOrb(currentLevel().rare);
    maintainGemPool();

    state.mode = "playing";
  }

  function startGame() {
    loadLevel(0, false);
  }

  function hitTest(a, b) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return dx * dx + dy * dy <= (a.r + b.r) * (a.r + b.r);
  }

  function completeLevel() {
    if (state.levelIndex >= LEVELS.length - 1) {
      state.mode = "win";
      return;
    }
    state.speedItems += 1;
    state.mode = "level_clear";
  }

  function equipSpeedItem() {
    if (state.mode !== "level_clear") return;
    if (state.speedItems <= 0) return;
    state.speedItems -= 1;
    state.speedBoostStacks = Math.min(6, state.speedBoostStacks + 1);
    recalcSpeed();
    triggerSfx("equip");
  }

  function update(dt) {
    if (state.mode !== "playing") return;

    const p = state.player;
    let ax = 0;
    let ay = 0;
    if (state.deviceMode === "mobile" && state.touch.active) {
      ax = state.touch.targetX - p.x;
      ay = state.touch.targetY - p.y;
    } else {
      const left = state.keys.has("ArrowLeft") || state.keys.has("a");
      const right = state.keys.has("ArrowRight") || state.keys.has("d");
      const up = state.keys.has("ArrowUp") || state.keys.has("w");
      const down = state.keys.has("ArrowDown") || state.keys.has("s");
      ax = (right ? 1 : 0) - (left ? 1 : 0);
      ay = (down ? 1 : 0) - (up ? 1 : 0);
    }
    const mag = Math.hypot(ax, ay);
    if (mag > 0.001) {
      p.vx = (ax / mag) * p.speed;
      p.vy = (ay / mag) * p.speed;
    } else {
      p.vx = 0;
      p.vy = 0;
    }
    p.x += p.vx * dt;
    p.y += p.vy * dt;

    p.x = Math.max(p.r, Math.min(canvas.width - p.r, p.x));
    p.y = Math.max(p.r, Math.min(canvas.height - p.r, p.y));

    for (const enemy of state.enemies) {
      enemy.x += enemy.vx * dt;
      if (enemy.x < enemy.r || enemy.x > canvas.width - enemy.r) {
        enemy.vx *= -1;
        enemy.x = Math.max(enemy.r, Math.min(canvas.width - enemy.r, enemy.x));
      }
    }

    for (let i = state.gems.length - 1; i >= 0; i -= 1) {
      state.gems[i].ttl -= dt;
      if (state.gems[i].ttl <= 0) {
        state.gems.splice(i, 1);
      }
    }
    maintainGemPool();

    for (let i = state.gems.length - 1; i >= 0; i -= 1) {
      if (hitTest(p, state.gems[i])) {
        state.gems.splice(i, 1);
        state.levelScore += 1;
        state.totalScore += currentLevel().rewardPerGem;
        triggerSfx("gem");
      }
    }
    maintainGemPool();

    for (let i = state.rareOrbs.length - 1; i >= 0; i -= 1) {
      if (hitTest(p, state.rareOrbs[i])) {
        state.rareOrbs.splice(i, 1);
        state.maxHealth = Math.min(10, state.maxHealth + 1);
        state.health = Math.min(state.maxHealth, state.health + 1);
        state.rareBoosts += 1;
        triggerSfx("rare");
      }
    }

    if (state.levelScore >= state.goal) completeLevel();

    if (state.invulnTimer > 0) state.invulnTimer -= dt;
    for (const enemy of state.enemies) {
      if (hitTest(p, enemy) && state.invulnTimer <= 0) {
        state.health -= 1;
        state.invulnTimer = 1.1;
        state.flashTimer = 0.25;
        triggerSfx("hit");
        if (state.health <= 0) state.mode = "lose";
        break;
      }
    }

    if (state.flashTimer > 0) state.flashTimer -= dt;
    state.elapsed += dt;
  }

  function drawBackground() {
    const sky = ctx.createLinearGradient(0, 0, 0, canvas.height);
    sky.addColorStop(0, "#95d5ff");
    sky.addColorStop(1, "#d6f6ff");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "#b5ec90";
    ctx.fillRect(0, canvas.height - 80, canvas.width, 80);

    for (let i = 0; i < 8; i += 1) {
      ctx.fillStyle = i % 2 ? "#6ecf90" : "#80dca0";
      ctx.fillRect(i * 130, canvas.height - 80, 64, 80);
    }
  }

  function drawHud() {
    ctx.fillStyle = "#14395c";
    ctx.font = "bold 22px Trebuchet MS";
    ctx.fillText(`${tr("hud.level")} ${state.levelIndex + 1}/${LEVELS.length}: ${levelName(state.levelIndex)}`, 20, 34);
    ctx.fillText(`${tr("hud.score")} ${state.levelScore}/${state.goal}  ${tr("hud.total")} ${state.totalScore}`, 20, 62);
    ctx.fillText(`${tr("hud.health")} ${state.health}/${state.maxHealth}`, 20, 90);
    ctx.fillText(`${tr("hud.items")}: ${state.speedItems}  ${tr("hud.speed")}: ${Math.round(state.player.speed)}`, 20, 118);

    const modeText = state.deviceMode === "mobile" ? tr("hud.modeMobile") : tr("hud.modeDesktop");
    ctx.font = "16px Trebuchet MS";
    ctx.fillText(modeText, 20, 144);

    if (state.mode === "playing") {
      ctx.font = "14px Trebuchet MS";
      ctx.fillText(state.deviceMode === "mobile" ? tr("hud.controlsMobile") : tr("hud.controlsDesktop"), 20, canvas.height - 20);
    }
  }

  function drawEntities() {
    for (const gem of state.gems) {
      ctx.beginPath();
      ctx.fillStyle = "#f7f35a";
      ctx.arc(gem.x, gem.y, gem.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#9f8b12";
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    for (const orb of state.rareOrbs) {
      ctx.beginPath();
      ctx.fillStyle = "#3b89ff";
      ctx.arc(orb.x, orb.y, orb.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#0f3d9a";
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    for (const enemy of state.enemies) {
      ctx.beginPath();
      ctx.fillStyle = "#e5556f";
      ctx.arc(enemy.x, enemy.y, enemy.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#812236";
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    const p = state.player;
    const blink = state.invulnTimer > 0 && Math.floor(state.invulnTimer * 14) % 2 === 0;
    if (!blink) {
      ctx.beginPath();
      ctx.fillStyle = state.flashTimer > 0 ? "#ffffff" : "#1e42bf";
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#0c1f68";
      ctx.lineWidth = 3;
      ctx.stroke();
    }
  }

  function drawCenterPanel(lines, title, accent) {
    const w = 620;
    const h = 300;
    const x = (canvas.width - w) / 2;
    const y = (canvas.height - h) / 2;

    ctx.fillStyle = "rgba(8, 25, 46, 0.84)";
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = accent;
    ctx.lineWidth = 4;
    ctx.strokeRect(x, y, w, h);

    ctx.fillStyle = "#f0f7ff";
    ctx.font = "bold 42px Trebuchet MS";
    ctx.textAlign = "center";
    ctx.fillText(title, canvas.width / 2, y + 64);

    ctx.font = "21px Trebuchet MS";
    lines.forEach((line, i) => ctx.fillText(line, canvas.width / 2, y + 116 + i * 36));
    ctx.textAlign = "left";
  }

  function draw() {
    drawBackground();
    drawEntities();
    drawHud();

    if (state.mode === "start") {
      drawCenterPanel(
        state.deviceMode === "mobile" ? tr("panels.startLinesMobile") : tr("panels.startLinesDesktop"),
        tr("panels.startTitle"),
        "#7de8ff"
      );
    } else if (state.mode === "paused") {
      drawCenterPanel(tr("panels.pausedLines"), tr("panels.pausedTitle"), "#ffd86e");
    } else if (state.mode === "level_clear") {
      drawCenterPanel(
        [
          format(tr("panels.clearLine1"), { level: state.levelIndex + 1, name: levelName(state.levelIndex) }),
          format(tr("panels.clearLine2"), { items: state.speedItems }),
          tr("panels.clearLine3"),
        ],
        tr("panels.clearTitle"),
        "#79ffb1"
      );
    } else if (state.mode === "win") {
      drawCenterPanel(tr("panels.winLines"), tr("panels.winTitle"), "#75ff9d");
    } else if (state.mode === "lose") {
      drawCenterPanel(tr("panels.loseLines"), tr("panels.loseTitle"), "#ff8ca1");
    }
  }

  function resizeForFullscreen() {
    if (document.fullscreenElement) {
      const ratio = 16 / 9;
      const w = window.innerWidth;
      const h = window.innerHeight;
      let drawW = w;
      let drawH = Math.floor(w / ratio);
      if (drawH > h) {
        drawH = h;
        drawW = Math.floor(h * ratio);
      }
      canvas.style.width = `${drawW}px`;
      canvas.style.height = `${drawH}px`;
      state.fullscreen = true;
    } else {
      canvas.style.width = "100%";
      canvas.style.height = "auto";
      state.fullscreen = false;
    }
  }

  async function toggleFullscreen() {
    if (!document.fullscreenElement) await canvas.requestFullscreen();
    else await document.exitFullscreen();
    resizeForFullscreen();
  }

  function normalizeKey(inputKey) {
    if (inputKey === " " || inputKey === "Space") return "space";
    return inputKey.length === 1 ? inputKey.toLowerCase() : inputKey;
  }

  function onAnyUserAction() {
    startAudioIfNeeded();
  }

  function handleGameKeyDown(rawKey) {
    startAudioIfNeeded();
    const key = normalizeKey(rawKey);
    state.keys.add(key);

    if (key === "Enter") {
      if (state.mode === "start" || state.mode === "win" || state.mode === "lose") {
        startGame();
      } else if (state.mode === "level_clear") {
        loadLevel(state.levelIndex + 1, true);
      }
    }

    if (key === "e" || key === "a") {
      equipSpeedItem();
    }

    if (key === "p" || key === "space") {
      if (state.mode === "playing") state.mode = "paused";
      else if (state.mode === "paused") state.mode = "playing";
    }

    if (key === "r") {
      startGame();
    }

    if (key === "b" && state.mode === "playing") {
      state.health -= 1;
      state.flashTimer = 0.2;
      triggerSfx("hit");
      if (state.health <= 0) state.mode = "lose";
    }

    // Test helper: deterministic level clear for automation.
    if (key === "n" && state.mode === "playing") {
      state.levelScore = state.goal;
      completeLevel();
    }

    if (key === "f") toggleFullscreen().catch(() => {});
  }

  function handleGameKeyUp(rawKey) {
    state.keys.delete(normalizeKey(rawKey));
  }

  function canvasPointFromEvent(ev) {
    const rect = canvas.getBoundingClientRect();
    const px = ((ev.clientX - rect.left) / rect.width) * canvas.width;
    const py = ((ev.clientY - rect.top) / rect.height) * canvas.height;
    return { x: px, y: py };
  }

  function handleMobileTap(x, y) {
    const now = performance.now();
    const dt = now - state.touch.lastTapAt;
    const dist = Math.hypot(x - state.touch.lastTapX, y - state.touch.lastTapY);
    const isDoubleTap = dt < 260 && dist < 26;
    state.touch.lastTapAt = now;
    state.touch.lastTapX = x;
    state.touch.lastTapY = y;

    if (state.mode === "start" || state.mode === "win" || state.mode === "lose") {
      startGame();
      return;
    }
    if (state.mode === "level_clear") {
      if (x < canvas.width / 2) {
        equipSpeedItem();
      }
      loadLevel(state.levelIndex + 1, true);
      return;
    }
    if (state.mode === "paused" && isDoubleTap) {
      state.mode = "playing";
      return;
    }
    if (state.mode === "playing" && isDoubleTap) {
      state.mode = "paused";
    }
  }

  function attachMobileTouchControls() {
    canvas.addEventListener("pointerdown", (ev) => {
      if (state.deviceMode !== "mobile") return;
      startAudioIfNeeded();
      const pt = canvasPointFromEvent(ev);
      handleMobileTap(pt.x, pt.y);
      if (state.mode === "playing") {
        state.touch.active = true;
        state.touch.pointerId = ev.pointerId;
        canvas.setPointerCapture(ev.pointerId);
        state.touch.targetX = pt.x;
        state.touch.targetY = pt.y;
      }
    });

    canvas.addEventListener("pointermove", (ev) => {
      if (state.deviceMode !== "mobile") return;
      if (!state.touch.active || ev.pointerId !== state.touch.pointerId) return;
      const pt = canvasPointFromEvent(ev);
      state.touch.targetX = pt.x;
      state.touch.targetY = pt.y;
    });

    const endTouch = (ev) => {
      if (state.deviceMode !== "mobile") return;
      if (ev.pointerId !== state.touch.pointerId) return;
      state.touch.active = false;
      state.touch.pointerId = null;
    };
    canvas.addEventListener("pointerup", endTouch);
    canvas.addEventListener("pointercancel", endTouch);
  }

  window.addEventListener("pointerdown", onAnyUserAction, { passive: true });

  window.addEventListener("keydown", (e) => {
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(e.key)) e.preventDefault();
    handleGameKeyDown(e.key);
  });

  window.addEventListener("keyup", (e) => handleGameKeyUp(e.key));

  attachMobileTouchControls();

  document.addEventListener("fullscreenchange", resizeForFullscreen);

  ui.langSelect.addEventListener("change", () => {
    state.lang = ui.langSelect.value === "en" ? "en" : "zh";
    applyUIText();
    draw();
  });
  ui.deviceSelect.addEventListener("change", () => {
    setDeviceMode(ui.deviceSelect.value);
  });
  ui.sfxEnabled.addEventListener("change", () => {
    state.audio.sfxEnabled = ui.sfxEnabled.checked;
    updateAudioSettings();
  });
  ui.sfxVolume.addEventListener("input", () => {
    state.audio.sfxVolume = Number(ui.sfxVolume.value);
    updateAudioSettings();
  });
  ui.bgmEnabled.addEventListener("change", () => {
    state.audio.bgmEnabled = ui.bgmEnabled.checked;
    updateAudioSettings();
  });
  ui.bgmVolume.addEventListener("input", () => {
    state.audio.bgmVolume = Number(ui.bgmVolume.value);
    updateAudioSettings();
  });

  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.033, (now - last) / 1000);
    last = now;
    updateBgmSequencer();
    update(dt);
    draw();
    requestAnimationFrame(frame);
  }

  window.advanceTime = (ms) => {
    const step = 1000 / 60;
    const count = Math.max(1, Math.round(ms / step));
    for (let i = 0; i < count; i += 1) {
      updateBgmSequencer();
      update(1 / 60);
    }
    draw();
  };

  window.render_game_to_text = () => {
    const payload = {
      coordSystem: "origin top-left, +x right, +y down, units pixels",
      mode: state.mode,
      language: state.lang,
      deviceMode: state.deviceMode,
      level: {
        current: state.levelIndex + 1,
        total: LEVELS.length,
        name: levelName(state.levelIndex),
        levelScore: state.levelScore,
        goal: state.goal,
        rewardPerGem: currentLevel().rewardPerGem,
      },
      player: {
        x: Number(state.player.x.toFixed(1)),
        y: Number(state.player.y.toFixed(1)),
        vx: Number(state.player.vx.toFixed(1)),
        vy: Number(state.player.vy.toFixed(1)),
        radius: state.player.r,
        speed: Number(state.player.speed.toFixed(1)),
      },
      enemies: state.enemies.map((e) => ({
        x: Number(e.x.toFixed(1)),
        y: Number(e.y.toFixed(1)),
        radius: e.r,
        vx: Number(e.vx.toFixed(1)),
      })),
      gems: state.gems.map((g) => ({
        x: Number(g.x.toFixed(1)),
        y: Number(g.y.toFixed(1)),
        radius: g.r,
        ttl: Number(Math.max(0, g.ttl).toFixed(2)),
      })),
      rareOrbs: state.rareOrbs.map((o) => ({ x: Number(o.x.toFixed(1)), y: Number(o.y.toFixed(1)), radius: o.r })),
      totalScore: state.totalScore,
      health: state.health,
      maxHealth: state.maxHealth,
      rareBoosts: state.rareBoosts,
      speedItems: state.speedItems,
      speedBoostStacks: state.speedBoostStacks,
      audio: {
        started: state.audio.started,
        sfxEnabled: state.audio.sfxEnabled,
        sfxVolume: state.audio.sfxVolume,
        bgmEnabled: state.audio.bgmEnabled,
        bgmVolume: state.audio.bgmVolume,
      },
      timers: {
        elapsed: Number(state.elapsed.toFixed(2)),
        invulnerableFor: Number(Math.max(0, state.invulnTimer).toFixed(2)),
      },
      flags: {
        fullscreen: state.fullscreen,
        canRestart: state.mode !== "playing",
      },
    };
    return JSON.stringify(payload);
  };

  ui.deviceSelect.value = deviceOverride;
  applyDeviceModeUI();
  applyUIText();
  draw();
  requestAnimationFrame(frame);
})();
