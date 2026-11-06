import { GameSettings } from './settings.js';
import { GameEngine, GameMode, GameEffect, PushPromptKind, RushTheme } from './engine.js';
import { BoardPhysics, TargetKind } from './physics.js';
import { BoardView } from './boardview.js';
import { ScreenView } from './screen.js';
import { SoundEffects, BackgroundMusicPlayer, SoundKind } from './sound.js';

const $ = (id) => document.getElementById(id);
const canvas = $('board');
const g = canvas.getContext('2d', { alpha: false });
const BoardWidth = 520, BoardHeight = 700;

const engine = new GameEngine();
const physics = new BoardPhysics(engine);
const boardView = new BoardView(engine, physics);
const screenView = new ScreenView(engine);
const sound = new SoundEffects();
const music = new BackgroundMusicPlayer(sound);

const MusicPaths = { kabuki: 'music/kabuki_rush.mp3', hit: 'music/hit_bgm.mp3', ikki: 'music/ikkikake.mp3' };

// ---- 遊戲狀態（持球、卡片、收支）----
let trayBallCount = 0;
let cardBalanceYen = 0;
let totalInvestedYen = 0;
let totalReturnedYen = 0;
let framesSinceLaunch = 0;
let autoFire = false;
let coinValue = 500;
let isKeyHeld = false;
let isPointerHeld = false;
let shakeFramesRemaining = 0;
let shakeStrength = 0;
let displayFrame = 0;
let shakeEnabled = true;
let started = false; // 按下「開始遊戲」之前不跑遊戲迴圈，避免背景白白耗電

// ---- 小工具 ----
const yen = (n) => `${n.toLocaleString('en-US')} 円`;
function setText(el, text) { if (el._t !== text) { el._t = text; el.textContent = text; } }
function setClass(el, name, on) { if (el.classList.contains(name) !== on) el.classList.toggle(name, on); }

function appendLog(message) {
  const li = document.createElement('li');
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  li.textContent = `[${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}] ${message}`;
  const log = $('log');
  log.insertBefore(li, log.firstChild);
  while (log.children.length > 100) log.removeChild(log.lastChild);
}

function showModal(title, body) {
  $('modalTitle').textContent = title;
  $('modalBody').textContent = body;
  $('modal').classList.remove('hidden');
}

// ---- 設定存取（失敗不影響遊戲）----
const StoreKey = 'hanakei-pachinko-settings-v1';
function loadSettings() {
  try { return JSON.parse(localStorage.getItem(StoreKey)) || {}; } catch (e) { return {}; }
}
function saveSettings() {
  try {
    localStorage.setItem(StoreKey, JSON.stringify({
      sound: $('soundCheck').checked, music: $('musicCheck').checked, shake: $('shakeCheck').checked,
      volume: Number($('musicVolume').value), speed: $('speedSelect').value, power: Number($('power').value), coin: coinValue,
    }));
  } catch (e) { /* 忽略 */ }
}

// ---- 事件接線 ----
engine.onMessage = appendLog;
engine.onEffect = onEffect;
physics.onPayout = (n) => { trayBallCount += n; };
physics.onBallReturned = () => { trayBallCount++; };
physics.onTargetEntered = (kind) => {
  if (kind === TargetKind.StartChucker) sound.Play(SoundKind.StartIn);
  else if (kind === TargetKind.ElectricChucker) sound.Play(SoundKind.ElectricIn);
  else sound.Play(SoundKind.AttackerIn);
};

// 演出事件：播放對應音效，中獎相關的演出會讓畫面震動
function onEffect(effect) {
  switch (effect) {
    case GameEffect.Reach:
    case GameEffect.GateArrive: sound.Play(SoundKind.Reach); break;
    case GameEffect.ThemeChoiceOpen:
    case GameEffect.PushPressed: sound.Play(SoundKind.Push); break;
    case GameEffect.PushHit: sound.Play(SoundKind.HitFanfare); startShake(30, 10); break;
    case GameEffect.HitReveal: sound.Play(SoundKind.HitFanfare); startShake(24, 8); break;
    case GameEffect.GateBreak: sound.Play(SoundKind.GateBreak); startShake(30, 10); break;
    case GameEffect.SevenFlip: sound.Play(SoundKind.SevenFlip); startShake(45, 14); break;
    case GameEffect.ModeUp: sound.Play(SoundKind.ModeUp); break;
    case GameEffect.FreeSpinOmen: sound.Play(SoundKind.FreeSpinOmen); break;
    case GameEffect.FreeSpinStop: sound.Play(SoundKind.FreeSpinStop); break;
    case GameEffect.StrongOmen: sound.Play(SoundKind.StrongOmen); break;
    case GameEffect.MashPress: sound.Play(SoundKind.Mash); break;
  }
}

// ---- 畫面震動（取代桌面版的視窗震動）----
function startShake(frames, strength) {
  if (!shakeEnabled) return;
  shakeFramesRemaining = Math.max(shakeFramesRemaining, frames);
  shakeStrength = Math.max(shakeStrength, strength);
}
function updateShake() {
  if (shakeFramesRemaining <= 0) return;
  shakeFramesRemaining--;
  const box = $('shakeBox');
  if (shakeFramesRemaining === 0) { box.style.transform = ''; box.style.willChange = ''; shakeStrength = 0; return; }
  box.style.willChange = 'transform';
  const s = shakeStrength * 0.6;
  box.style.transform = `translate(${((Math.random() * 2 - 1) * s).toFixed(1)}px, ${((Math.random() * 2 - 1) * s).toFixed(1)}px)`;
}

// ---- 操作 ----
function insertCoin() {
  cardBalanceYen += coinValue;
  totalInvestedYen += coinValue;
  appendLog(`投入 ${coinValue} 円，卡片餘額 ${cardBalanceYen} 円`);
}
function rentBalls() {
  if (cardBalanceYen < GameSettings.RentCostYen) { appendLog('卡片餘額不足，請先投幣'); return; }
  cardBalanceYen -= GameSettings.RentCostYen;
  trayBallCount += GameSettings.RentBallCount;
  appendLog(`借球 ${GameSettings.RentBallCount} 顆`);
}
// 退卡：退還卡片餘額，持球換算成現金，機台狀態保留給下一位
function returnCard() {
  if (engine.IsHitInProgress) { showModal('退卡', '大當り中無法退卡，請先打完。'); return; }
  if (cardBalanceYen === 0 && trayBallCount === 0 && physics.ActiveBallCount === 0) { showModal('退卡', '卡片內沒有餘額，也沒有持球。'); return; }
  setAutoFire(false);
  const ballCashYen = trayBallCount * GameSettings.YenPerBall;
  const returnedYen = cardBalanceYen + ballCashYen;
  const summary =
    `退還卡片餘額：${yen(cardBalanceYen)}\n持球 ${trayBallCount.toLocaleString('en-US')} 顆換金：${yen(ballCashYen)}\n合計退還：${yen(returnedYen)}\n\n` +
    `本次累計投入 ${yen(totalInvestedYen)}，累計收回 ${yen(totalReturnedYen + returnedYen)}`;
  totalReturnedYen += returnedYen;
  cardBalanceYen = 0;
  trayBallCount = 0;
  physics.ClearBalls();
  appendLog(`退卡，退還 ${yen(returnedYen)}`);
  showModal('退卡完成', summary);
}
function setAutoFire(on) {
  autoFire = on;
  const b = $('autoButton');
  b.setAttribute('aria-pressed', String(on));
  b.textContent = `自動發射　${on ? '開' : '關'}`;
}
// 自動發射：依間隔從持球扣一顆打出去
function handleAutoFire() {
  if (!autoFire) { framesSinceLaunch = GameSettings.LaunchIntervalFrames; return; }
  framesSinceLaunch++;
  if (framesSinceLaunch < GameSettings.LaunchIntervalFrames) return;
  if (trayBallCount <= 0) { setAutoFire(false); appendLog('持球用完了，請投幣並借球'); return; }
  trayBallCount--;
  physics.LaunchBall(Number($('power').value));
  framesSinceLaunch = 0;
}
function updatePowerLabel() {
  const power = Number($('power').value);
  let d;
  if (power < 30) d = '太弱，回流';
  else if (power < 55) d = '左打';
  else if (power < 80) d = '右打';
  else d = '右打（強）';
  setText($('powerText'), `${power}　${d}`);
}

// 依狀態切換背景音樂：大當り進行中播大當り專用的歌，直到進入RUSH才換成RUSH的歌，回到通常就不播
function updateBackgroundMusic() {
  let desired = null;
  if (engine.IsHitInProgress) desired = MusicPaths.hit;
  else if (engine.IsRushActive) desired = engine.SelectedTheme === RushTheme.KabukiRush ? MusicPaths.kabuki : MusicPaths.ikki;
  music.SetTrack(desired);
}

// ---- 顯示更新 ----
function stateText() {
  if (engine.IsHitInProgress) return `大當り中 第${engine.CurrentRound}/${engine.TotalRounds}R　入賞 ${engine.AttackerCount}/${GameSettings.AttackerMaximumCount}（請右打）`;
  switch (engine.Mode) {
    case GameMode.SenMode: return `戰モード（右打）經過 ${engine.ModeSpinCount} 轉　連莊 ${engine.RushChainCount}`;
    case GameMode.DaiSenMode: return `大戰モード（右打）經過 ${engine.ModeSpinCount} 轉　連莊 ${engine.RushChainCount}`;
    case GameMode.KabukiBurst: return `傾奇BURST（右打）残り ${Math.max(0, engine.RemainingRushSpins)} 轉　連莊 ${engine.RushChainCount}`;
    default: return '通常（左打）';
  }
}
function updatePushButton() {
  const b = $('pushButton');
  let text, cls = '', enabled = true;
  switch (engine.PushPrompt) {
    case PushPromptKind.ChanceUp:
    case PushPromptKind.FreeSpinPush: text = 'PUSH!!'; cls = 'ready'; break;
    case PushPromptKind.DropMash: text = '連打!! PUSH（可按住）'; cls = 'mash'; break;
    case PushPromptKind.GateRescue: text = '大戰按鈕!!'; cls = 'rescue'; break;
    default: text = 'PUSH（待機中）'; enabled = false;
  }
  setText(b, text);
  if (b.disabled === enabled) b.disabled = !enabled;
  setClass(b, 'ready', cls === 'ready');
  setClass(b, 'mash', cls === 'mash');
  setClass(b, 'rescue', cls === 'rescue');
}
function updateDisplay() {
  setText($('cardBalance'), yen(cardBalanceYen));
  setText($('trayBalls'), `${trayBallCount.toLocaleString('en-US')} 顆`);
  const profit = totalReturnedYen + cardBalanceYen + trayBallCount * GameSettings.YenPerBall - totalInvestedYen;
  setText($('statusState'), stateText());
  setText($('statusReserve'), `${engine.ReserveCount}/${GameSettings.ReserveMaximum}`);
  setText($('statusSpins'), engine.TotalSpinCount.toLocaleString('en-US'));
  setText($('statusHits'), String(engine.TotalHitCount));
  setText($('statusSince'), String(engine.SpinsSinceLastHit));
  setText($('statusInvest'), yen(totalInvestedYen));
  setText($('statusProfit'), yen(profit));
  const open = engine.IsThemeChoiceOpen;
  $('themeKabuki').disabled = !open;
  $('themeIkki').disabled = !open;
  setClass($('themeKabuki'), 'selected', engine.SelectedTheme === RushTheme.KabukiRush);
  setClass($('themeIkki'), 'selected', engine.SelectedTheme === RushTheme.IkkiKake);
}

// ---- 繪製：盤面＋液晶 ----
function setupCanvas() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(BoardWidth * dpr);
  canvas.height = Math.round(BoardHeight * dpr);
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  boardView.BuildStaticLayer(dpr);
}
function render(alpha = 1) {
  g.save();
  boardView.Draw(g, alpha);
  g.translate(GameSettings.ScreenRectangle.x, GameSettings.ScreenRectangle.y);
  screenView.Draw(g);
  g.restore();
}

// ---- 每一幀的遊戲迴圈（邏輯固定 60 次／秒，不受螢幕更新率影響）----
function tick() {
  handleAutoFire();
  updateShake();
  updateBackgroundMusic();
  physics.StepPhysics();
  engine.SetPushHeld(isKeyHeld || isPointerHeld);
  engine.Tick();
  screenView.AdvanceAnimation();
  displayFrame++;
  if (displayFrame % 4 === 0) updateDisplay();
  updatePushButton();
}
const StepMs = 1000 / 60;
// 容許的時間誤差：60Hz 螢幕每幀的間隔會有些微抖動，沒有容許的話會偶爾「這幀不動、下幀動兩步」造成抖動
const StepTolerance = 2;
let lastTime = performance.now();
let accumulator = 0;
const perf = { frames: 0, ticks: 0, zeroStepFrames: 0, multiStepFrames: 0 };
function frame(now) {
  if (!started) { lastTime = now; accumulator = 0; requestAnimationFrame(frame); return; }
  accumulator += Math.min(now - lastTime, 250);
  lastTime = now;
  let steps = 0;
  while (accumulator >= StepMs - StepTolerance && steps < 5) { tick(); accumulator -= StepMs; steps++; }
  if (steps >= 5) accumulator = 0;
  if (accumulator < 0) accumulator = 0;
  perf.frames++; perf.ticks += steps;
  if (steps === 0) perf.zeroStepFrames++;
  if (steps > 1) perf.multiStepFrames++;
  // 每個畫面更新都繪製一次，小鋼珠位置依「距離下一次邏輯更新的時間比例」內插，高更新率螢幕也順
  render(Math.min(1, accumulator / StepMs));
  requestAnimationFrame(frame);
}

// ---- 事件綁定 ----
function bindControls() {
  // 投幣面額
  for (const chip of document.querySelectorAll('.chip')) {
    chip.addEventListener('click', () => {
      coinValue = Number(chip.dataset.coin);
      for (const c of document.querySelectorAll('.chip')) {
        const on = c === chip;
        c.classList.toggle('selected', on);
        c.setAttribute('aria-checked', String(on));
      }
      saveSettings();
    });
  }
  $('coinButton').addEventListener('click', insertCoin);
  $('rentButton').addEventListener('click', rentBalls);
  $('returnButton').addEventListener('click', returnCard);
  $('autoButton').addEventListener('click', () => setAutoFire(!autoFire));
  $('power').addEventListener('input', () => { updatePowerLabel(); saveSettings(); });
  $('themeKabuki').addEventListener('click', () => engine.ChooseTheme(RushTheme.KabukiRush));
  $('themeIkki').addEventListener('click', () => engine.ChooseTheme(RushTheme.IkkiKake));
  $('modalClose').addEventListener('click', () => $('modal').classList.add('hidden'));

  // PUSH：按下算一下，按住時由引擎自動連打
  const push = $('pushButton');
  push.addEventListener('pointerdown', (e) => {
    if (push.disabled) return;
    e.preventDefault();
    isPointerHeld = true;
    engine.PressPush();
  });
  const release = () => { isPointerHeld = false; };
  window.addEventListener('pointerup', release);
  window.addEventListener('pointercancel', release);
  push.addEventListener('contextmenu', (e) => e.preventDefault());

  // 設定
  $('soundCheck').addEventListener('change', (e) => { sound.IsEnabled = e.target.checked; saveSettings(); });
  $('musicCheck').addEventListener('change', (e) => { music.SetEnabled(e.target.checked); saveSettings(); });
  $('shakeCheck').addEventListener('change', (e) => { shakeEnabled = e.target.checked; saveSettings(); });
  $('musicVolume').addEventListener('input', (e) => { music.SetVolumePercent(Number(e.target.value)); saveSettings(); });
  $('speedSelect').addEventListener('change', (e) => { GameSettings.SpinTimeScale = Number(e.target.value); saveSettings(); });

  // 電腦鍵盤：空白鍵自動發射、Enter 按 PUSH（可按住）、1／2 選擇演出
  document.addEventListener('keydown', (e) => {
    if (e.code === 'Space') { e.preventDefault(); if (!e.repeat) setAutoFire(!autoFire); return; }
    if (e.code === 'Digit1' || e.code === 'Numpad1') { engine.ChooseTheme(RushTheme.KabukiRush); return; }
    if (e.code === 'Digit2' || e.code === 'Numpad2') { engine.ChooseTheme(RushTheme.IkkiKake); return; }
    if (e.code === 'Enter') {
      e.preventDefault();
      if (!isKeyHeld) { isKeyHeld = true; engine.PressPush(); }
    }
  });
  document.addEventListener('keyup', (e) => { if (e.code === 'Enter') isKeyHeld = false; });
  window.addEventListener('blur', () => { isKeyHeld = false; isPointerHeld = false; });

  // 回到前景時恢復音訊
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      if (sound.Context && sound.Context.state === 'suspended') sound.Context.resume();
      lastTime = performance.now();
      accumulator = 0;
    }
  });

  // 開始遊戲：iOS 要求音訊必須由點擊啟動
  $('startButton').addEventListener('click', () => {
    started = true;
    sound.Unlock();
    music.Init();
    $('startOverlay').classList.add('hidden');
    appendLog('歡迎光臨！請先投幣，再按「借球」，最後打開自動發射。演出出現PUSH時按PUSH按鈕（連打時可按住）');
  });

  // iOS 防止雙擊放大與長按選取
  document.addEventListener('gesturestart', (e) => e.preventDefault());
}

function restoreSettings() {
  const s = loadSettings();
  if (typeof s.sound === 'boolean') { $('soundCheck').checked = s.sound; sound.IsEnabled = s.sound; }
  if (typeof s.music === 'boolean') { $('musicCheck').checked = s.music; music.isEnabled = s.music; }
  if (typeof s.shake === 'boolean') { $('shakeCheck').checked = s.shake; shakeEnabled = s.shake; }
  if (typeof s.volume === 'number') { $('musicVolume').value = s.volume; music.volumePercent = s.volume; }
  if (typeof s.speed === 'string') { $('speedSelect').value = s.speed; GameSettings.SpinTimeScale = Number(s.speed) || 1; }
  if (typeof s.power === 'number') $('power').value = s.power;
  if ([100, 500, 1000].includes(s.coin)) {
    coinValue = s.coin;
    for (const c of document.querySelectorAll('.chip')) {
      const on = Number(c.dataset.coin) === coinValue;
      c.classList.toggle('selected', on);
      c.setAttribute('aria-checked', String(on));
    }
  }
}

restoreSettings();
setupCanvas();
bindControls();
updatePowerLabel();
updateDisplay();
updatePushButton();
render();
requestAnimationFrame(frame);

// 除錯用：在瀏覽器主控台輸入 hanakei.engine 可以看到內部狀態
window.hanakei = { engine, physics, screenView, boardView, GameSettings, g, perf, music, sound };
