import { GameSettings } from './settings.js';

// 遊戲階段
export const GamePhase = { Idle: 'Idle', Spinning: 'Spinning', ResultStop: 'ResultStop', HitOpening: 'HitOpening', RoundOpen: 'RoundOpen', RoundInterval: 'RoundInterval' };
// RUSH演出主題（可自選）
export const RushTheme = { KabukiRush: 'KabukiRush', IkkiKake: 'IkkiKake' };
// 遊戲狀態：通常、戰モード、大戰モード、傾奇BURST
export const GameMode = { Normal: 'Normal', SenMode: 'SenMode', DaiSenMode: 'DaiSenMode', KabukiBurst: 'KabukiBurst' };
// 保留玉的種類（索引對應 ReserveColorReliabilities 的 i+1）
export const ReserveColor = { White: 0, Blue: 1, Green: 2, Red: 3, Gold: 4, Tiger: 5, HeavenWeak: 6, HeavenStrong: 7, Matsukaze: 8 };
// 演出事件（畫面與音效使用）
export const GameEffect = {
  Reach: 'Reach', GateArrive: 'GateArrive', PushPressed: 'PushPressed', PushHit: 'PushHit', HitReveal: 'HitReveal',
  GateBreak: 'GateBreak', SevenFlip: 'SevenFlip', ModeUp: 'ModeUp', ThemeChoiceOpen: 'ThemeChoiceOpen', StrongOmen: 'StrongOmen',
  MashPress: 'MashPress', FreeSpinOmen: 'FreeSpinOmen', FreeSpinStop: 'FreeSpinStop',
};
// 城門結果：沒到達、被突破、到達但沒突破
export const GateOutcome = { None: 'None', Broken: 'Broken', Held: 'Held' };
// 開獎時的變換演出
export const FlipKind = { None: 'None', SuddenToSeven: 'SuddenToSeven', FakeAttempt: 'FakeAttempt' };
// 目前需要玩家按Push鍵的提示種類
export const PushPromptKind = { None: 'None', ChanceUp: 'ChanceUp', GateRescue: 'GateRescue', DropMash: 'DropMash', FreeSpinPush: 'FreeSpinPush' };

// 預告流程階段
const StageFlower1 = 0, StageReSpin1 = 1, StageStop1 = 2, StageWaitPush = 3, StageFlower2 = 4, StageReSpin2 = 5, StageStop2 = 6, StageDone = 7;

// 抽選與狀態機：負責保留、轉動、大當り、各種模式與連莊
export class GameEngine {
  constructor(random) {
    this.rng = random || Math.random;
    this.reservePlans = [];
    this.hitOriginMode = GameMode.Normal;
    this.nextMode = GameMode.Normal;
    this.isChanceUpPushPlanned = false;
    this.willChanceUpBeHot = false;
    this.willGateRescueSucceed = false;
    this.isFlipResolved = false;
    this.isDropPlanned = false;
    this.isFreeSpinPlanned = false;
    this.freeSpinFinalCenter = 0;
    this.freeSpinEndFrame = 0;
    this.freeSpinStage = StageDone;
    this.freeSpinStageStart = 0;
    this.isDropMashPlanned = false;
    this.willDropRescue = false;
    this.mashJumpPressCount = 0;
    this.isPushHeld = false;
    this.holdRepeatCounter = 0;

    this.onMessage = null; // (string) => void
    this.onEffect = null;  // (effect) => void

    this.Phase = GamePhase.Idle;
    this.PhaseFrame = 0;
    this.Mode = GameMode.Normal;
    this.ModeSpinCount = 0;
    this.RemainingRushSpins = 0;
    this.RushChainCount = 0;
    this.Figures = [0, 1, 2];
    this.IsCurrentSpinHit = false;
    this.IsCurrentSpinReach = false;
    this.IsCurrentSpinBurstHit = false;
    this.CurrentFlipKind = FlipKind.None;
    this.IsFlipDone = false;
    this.IsFlipFailed = false;
    this.CurrentGateOutcome = GateOutcome.None;
    this.GateRescueSucceeded = null;
    this.PushPrompt = PushPromptKind.None;
    this.PushPromptRemainingFrames = 0;
    this.IsStrongOmen = false;
    this.FreeSpinFlowerTotal = 0;
    this.FreeSpinFlowerIndex = 0;
    this.DropRescueSucceeded = null;
    this.MashProgress = 0;
    this.MashPressCount = 0;
    this.IsChanceUpActivated = false;
    this.SpinTotalFrames = GameSettings.NormalSpinFrames;
    this.ResultStopTotalFrames = GameSettings.ResultStopFrames;
    this.CurrentRound = 0;
    this.TotalRounds = 0;
    this.AttackerCount = 0;
    this.TotalSpinCount = 0;
    this.SpinsSinceLastHit = 0;
    this.TotalHitCount = 0;
    this.SelectedTheme = RushTheme.KabukiRush;
    this.LastHitAddedReserve = false;
  }

  // ---- 亂數工具 ----
  nextDouble() { return this.rng(); }
  nextInt(minOrMax, max) {
    if (max === undefined) return Math.floor(this.rng() * minOrMax);
    return minOrMax + Math.floor(this.rng() * (max - minOrMax));
  }

  // ---- 計算屬性 ----
  get FlipEventFrame() { return (this.isFreeSpinPlanned ? this.freeSpinEndFrame : 0) + GameSettings.FlipEventFrame; }
  get IsFreeSpinOmen() { return this.isFreeSpinPlanned; }
  get IsFreeSpinRunning() { return this.isFreeSpinPlanned && this.Phase === GamePhase.ResultStop && this.freeSpinStage !== StageDone; }
  get IsFlowerShown() { return this.IsFreeSpinRunning && (this.freeSpinStage === StageFlower1 || this.freeSpinStage === StageFlower2); }
  get FlowerProgress() {
    return this.IsFlowerShown ? Math.min(1.0, (this.PhaseFrame - this.freeSpinStageStart) / GameSettings.FreeSpinFlowerFrames) : 0.0;
  }
  get IsCenterReSpinning() { return this.IsFreeSpinRunning && (this.freeSpinStage === StageReSpin1 || this.freeSpinStage === StageReSpin2); }
  get IsDropPinchSpin() { return this.isDropMashPlanned; }
  get ReserveCount() { return this.reservePlans.length; }
  get IsRushActive() { return this.Mode !== GameMode.Normal; }
  get IsChanceUpHot() { return this.IsChanceUpActivated && this.willChanceUpBeHot; }
  get IsHitInProgress() {
    return this.Phase === GamePhase.HitOpening || this.Phase === GamePhase.RoundOpen || this.Phase === GamePhase.RoundInterval;
  }
  // 大當り的倒數第二R，而且這次大當り結束後會進RUSH：開放選擇RUSH演出
  get IsThemeChoiceOpen() {
    const isRoundPhase = this.Phase === GamePhase.RoundOpen || this.Phase === GamePhase.RoundInterval;
    return isRoundPhase && this.TotalRounds >= 2 && this.CurrentRound === this.TotalRounds - 1 && this.nextMode !== GameMode.Normal;
  }
  get IsAttackerOpen() { return this.Phase === GamePhase.RoundOpen && this.AttackerCount < GameSettings.AttackerMaximumCount; }
  get IsElectricChuckerOpen() {
    if (this.Mode === GameMode.Normal || this.IsHitInProgress) return false;
    return !(this.Mode === GameMode.KabukiBurst && this.RemainingRushSpins <= 0);
  }
  GetReserveColor(index) { return this.reservePlans[index].Color; }
  GetThemeName() { return this.SelectedTheme === RushTheme.KabukiRush ? '傾奇RUSH（漢の喧嘩）' : '一騎驅Mode（傾奇者戀歌）'; }
  GetModeName() {
    switch (this.Mode) {
      case GameMode.SenMode: return '戰モード';
      case GameMode.DaiSenMode: return '大戰モード';
      case GameMode.KabukiBurst: return '傾奇BURST';
      default: return '通常';
    }
  }

  // ---- 事件 ----
  RaiseEffect(effect) { if (this.onEffect) this.onEffect(effect); }
  RaiseMessage(message) { if (this.onMessage) this.onMessage(message); }
  ChangePhase(next) { this.Phase = next; this.PhaseFrame = 0; }

  // ---- 每一幀推進一次遊戲狀態 ----
  Tick() {
    this.PhaseFrame++;
    if (this.PushPromptRemainingFrames > 0) {
      this.PushPromptRemainingFrames--;
      if (this.PushPromptRemainingFrames === 0) this.ResolvePush(true);
    }
    if (this.PushPrompt === PushPromptKind.DropMash) {
      this.MashProgress = Math.max(0.0, this.MashProgress - GameSettings.MashDecayPerFrame);
      // 按住PUSH時自動連打
      if (this.isPushHeld) {
        this.holdRepeatCounter++;
        if (this.holdRepeatCounter >= GameSettings.MashHoldIntervalFrames) {
          this.holdRepeatCounter = 0;
          this.RegisterMashPress();
        }
      }
    } else {
      this.holdRepeatCounter = 0;
    }
    switch (this.Phase) {
      case GamePhase.Idle:
        if (this.reservePlans.length > 0) this.StartSpin();
        break;
      case GamePhase.Spinning:
        if (this.PhaseFrame === Math.floor(this.SpinTotalFrames * 60 / 100) && this.IsCurrentSpinReach && !this.IsRushActive) {
          this.RaiseEffect(GameEffect.Reach);
        }
        if (this.PhaseFrame === Math.floor(this.SpinTotalFrames * 85 / 100) && this.CurrentGateOutcome !== GateOutcome.None) {
          this.RaiseEffect(GameEffect.GateArrive);
        }
        if (this.isChanceUpPushPlanned && this.PhaseFrame === Math.floor(this.SpinTotalFrames * 60 / 100)) {
          this.PushPrompt = PushPromptKind.ChanceUp;
          this.PushPromptRemainingFrames = GameSettings.PushPromptFrames;
        }
        if (this.PhaseFrame >= this.SpinTotalFrames) this.EnterResultStop();
        break;
      case GamePhase.ResultStop:
        this.UpdateFreeSpin();
        if (this.CurrentFlipKind !== FlipKind.None && this.IsCurrentSpinHit && !this.isFlipResolved && this.PhaseFrame >= this.FlipEventFrame) {
          this.ResolveFlip();
        }
        if (this.PhaseFrame >= this.ResultStopTotalFrames) this.FinishSpin();
        break;
      case GamePhase.HitOpening:
        if (this.PhaseFrame >= GameSettings.HitOpeningFrames) this.BeginRound();
        break;
      case GamePhase.RoundOpen:
        if (this.AttackerCount >= GameSettings.AttackerMaximumCount || this.PhaseFrame >= GameSettings.AttackerTimeoutFrames) {
          this.ChangePhase(GamePhase.RoundInterval);
        }
        break;
      case GamePhase.RoundInterval:
        if (this.PhaseFrame >= GameSettings.RoundIntervalFrames) {
          if (this.CurrentRound < this.TotalRounds) this.BeginRound();
          else this.FinishHit();
        }
        break;
    }
  }

  // ---- PUSH ----
  PressPush() { return this.ResolvePush(false); }
  SetPushHeld(isHeld) { this.isPushHeld = isHeld; }

  RegisterMashPress() {
    this.MashPressCount++;
    this.RaiseEffect(GameEffect.MashPress);
    if (this.willDropRescue && this.MashPressCount >= this.mashJumpPressCount) {
      this.MashProgress = 1.0;
      this.SucceedDropMash();
      return;
    }
    this.MashProgress = Math.min(GameSettings.MashProgressCap, this.MashProgress + GameSettings.MashPressProgress);
  }

  SucceedDropMash() {
    this.DropRescueSucceeded = true;
    this.isDropPlanned = false;
    this.PushPrompt = PushPromptKind.None;
    this.PushPromptRemainingFrames = 0;
    this.RaiseMessage('連打成功！進度條全滿，拉回城門突破，RUSH繼續！');
    this.RaiseEffect(GameEffect.GateBreak);
    this.PhaseFrame = Math.max(this.PhaseFrame, this.ResultStopTotalFrames - 90);
  }

  FailDropMash() {
    this.DropRescueSucceeded = false;
    this.PushPrompt = PushPromptKind.None;
    this.PushPromptRemainingFrames = 0;
    this.RaiseMessage('紅軍撤退……敗退，RUSH終止');
    this.PhaseFrame = Math.max(this.PhaseFrame, this.ResultStopTotalFrames - 60);
  }

  // 執行Push演出：玩家按下或時間到自動發動，結果一樣（連打演出除外：要按才有機會）
  ResolvePush(isAutomatic) {
    if (this.PushPrompt === PushPromptKind.None) return false;
    if (this.PushPrompt === PushPromptKind.FreeSpinPush) {
      this.StartSecondFlower(isAutomatic);
      return true;
    }
    if (this.PushPrompt === PushPromptKind.DropMash) {
      if (isAutomatic) this.FailDropMash();
      else this.RegisterMashPress();
      return true;
    }
    const suffix = isAutomatic ? '（自動發動）' : '';
    if (this.PushPrompt === PushPromptKind.ChanceUp) {
      this.IsChanceUpActivated = true;
      this.RaiseMessage((this.willChanceUpBeHot ? 'PUSH！激アツ演出發生！' : 'PUSH！出現チャンス演出') + suffix);
      this.RaiseEffect(this.IsCurrentSpinHit ? GameEffect.PushHit : GameEffect.PushPressed);
    } else {
      this.GateRescueSucceeded = this.willGateRescueSucceed;
      this.RaiseEffect(GameEffect.PushPressed);
      if (this.willGateRescueSucceed) {
        this.Mode = GameMode.DaiSenMode;
        this.ModeSpinCount = 0;
        this.RaiseMessage('大戰按鈕！復活成功，進入大戰モード！' + suffix);
        this.RaiseEffect(GameEffect.ModeUp);
      } else {
        this.RaiseMessage('大戰按鈕……可惜沒有復活' + suffix);
      }
      this.PhaseFrame = Math.max(this.PhaseFrame, this.ResultStopTotalFrames - 60);
    }
    this.PushPrompt = PushPromptKind.None;
    this.PushPromptRemainingFrames = 0;
    return true;
  }

  // 選擇RUSH演出，只有在開放選擇的時候有效
  ChooseTheme(theme) {
    if (!this.IsThemeChoiceOpen) return false;
    this.SelectedTheme = theme;
    this.RaiseMessage('選擇了 ' + this.GetThemeName());
    this.RaiseEffect(GameEffect.PushPressed);
    return true;
  }

  // ---- 入賞 ----
  NotifyStartChuckerHit() {
    this.LastHitAddedReserve = this.TryAddReserve();
    return this.LastHitAddedReserve ? GameSettings.PayoutStartChucker : GameSettings.PayoutReserveFull;
  }
  NotifyElectricChuckerHit() {
    this.LastHitAddedReserve = this.TryAddReserve();
    return this.LastHitAddedReserve ? GameSettings.PayoutElectricChucker : GameSettings.PayoutReserveFull;
  }
  NotifyAttackerHit() {
    if (this.AttackerCount < GameSettings.AttackerMaximumCount) this.AttackerCount++;
    return GameSettings.PayoutAttacker;
  }

  // ---- 保留 ----
  TryAddReserve() {
    if (this.reservePlans.length >= GameSettings.ReserveMaximum) return false;
    if (this.Mode === GameMode.KabukiBurst && this.RemainingRushSpins <= 0) return false;
    this.reservePlans.push(this.CreatePlan());
    return true;
  }

  CreatePlan() {
    const plan = { IsHit: false, IsRushClass: this.IsRushActive, Color: ReserveColor.White };
    const hitProbability = plan.IsRushClass ? GameSettings.RushHitProbability : GameSettings.NormalHitProbability;
    plan.IsHit = this.nextDouble() < hitProbability;
    plan.Color = this.PickReserveColor(plan.IsHit, hitProbability);
    return plan;
  }

  // 沒中獎時各顏色的比例由期待度反推，讓顏色出現後的實際中獎率等於設定的期待度
  PickReserveColor(isHit, hitProbability) {
    const reliabilities = GameSettings.ReserveColorReliabilities;
    const hitWeights = GameSettings.ReserveColorHitWeights;
    const colorCount = reliabilities.length;
    const missWeights = new Array(colorCount).fill(0);
    let missTotal = 0;
    for (let i = 0; i < colorCount; i++) {
      if (reliabilities[i] < 1.0) {
        missWeights[i] = hitProbability * hitWeights[i] * (1.0 - reliabilities[i]) / ((1.0 - hitProbability) * reliabilities[i]);
      }
      missTotal += missWeights[i];
    }
    const scale = missTotal > 0.95 ? 0.95 / missTotal : 1.0;
    const roll = this.nextDouble();
    let cumulative = 0;
    for (let i = 0; i < colorCount; i++) {
      cumulative += (isHit ? hitWeights[i] : missWeights[i]) * scale;
      if (roll < cumulative) return i + 1;
    }
    return ReserveColor.White;
  }

  // 狀態改變後，把機率類別不同的保留重新抽選
  RerollReserves() {
    for (let i = 0; i < this.reservePlans.length; i++) {
      if (this.reservePlans[i].IsRushClass !== this.IsRushActive) this.reservePlans[i] = this.CreatePlan();
    }
  }

  // ---- 變動 ----
  StartSpin() {
    let plan = this.reservePlans.shift();
    if (plan.IsRushClass !== this.IsRushActive) plan = this.CreatePlan();
    this.TotalSpinCount++;
    this.SpinsSinceLastHit++;
    if (this.IsRushActive) this.ModeSpinCount++;
    if (this.Mode === GameMode.KabukiBurst) this.RemainingRushSpins = Math.max(0, this.RemainingRushSpins - 1);
    this.IsCurrentSpinHit = plan.IsHit;
    this.DecideSpinDetails();
    this.ChangePhase(GamePhase.Spinning);
    if (this.IsStrongOmen) {
      this.RaiseMessage('電子音預告！強期待度！');
      this.RaiseEffect(GameEffect.StrongOmen);
    }
  }

  DecideSpinDetails() {
    this.CurrentFlipKind = FlipKind.None;
    this.IsCurrentSpinBurstHit = false;
    this.CurrentGateOutcome = GateOutcome.None;
    this.GateRescueSucceeded = null;
    this.IsChanceUpActivated = false;
    this.isChanceUpPushPlanned = false;
    this.PushPrompt = PushPromptKind.None;
    this.PushPromptRemainingFrames = 0;
    this.isDropPlanned = false;
    this.isFreeSpinPlanned = false;
    this.FreeSpinFlowerTotal = 0;
    this.FreeSpinFlowerIndex = 0;
    this.freeSpinStage = StageDone;
    this.freeSpinEndFrame = 0;
    this.isDropMashPlanned = false;
    this.willDropRescue = false;
    this.DropRescueSucceeded = null;
    this.MashProgress = 0;
    this.MashPressCount = 0;
    this.IsStrongOmen = false;
    this.willGateRescueSucceed = this.nextDouble() < GameSettings.GateRescueProbability;
    const hotProbability = this.IsCurrentSpinHit ? GameSettings.ChanceUpHotOnHit : GameSettings.ChanceUpHotOnMiss;
    this.willChanceUpBeHot = this.nextDouble() < hotProbability;
    if (this.IsCurrentSpinHit) {
      this.DecideHitFigures();
      if (this.IsRushActive) this.CurrentGateOutcome = GateOutcome.Broken;
    } else {
      let wantReach;
      if (this.IsRushActive) {
        const isGateReached = this.nextDouble() < GameSettings.GateReachOnMiss;
        this.CurrentGateOutcome = isGateReached ? GateOutcome.Held : GateOutcome.None;
        wantReach = isGateReached;
      } else {
        wantReach = this.nextDouble() < GameSettings.ReachProbabilityOnMiss;
      }
      this.DecideMissFigures(wantReach);
      this.IsCurrentSpinReach = wantReach;
    }
    this.PlanDrop();
    this.PlanFreeSpinOmen();
    this.IsStrongOmen = this.DecideStrongOmen();
    if (!this.IsRushActive && this.IsCurrentSpinReach && !this.isFreeSpinPlanned) {
      this.isChanceUpPushPlanned = this.nextDouble() < GameSettings.ChanceUpPushProbability;
    }
    if (this.IsRushActive) {
      // RUSH中城門到達（reach）的轉維持原速，其餘的轉比較快
      this.SpinTotalFrames = GameSettings.Scaled(this.CurrentGateOutcome !== GateOutcome.None ? GameSettings.RushSpinFrames : GameSettings.RushQuickSpinFrames);
    } else {
      this.SpinTotalFrames = GameSettings.Scaled(GameSettings.NormalSpinFrames + (this.IsCurrentSpinReach ? GameSettings.NormalReachExtraFrames : 0));
    }
  }

  // 決定這一轉是否轉落；一騎驅Mode的轉落會變成「敵軍急襲」連打演出，連打有機會救回
  PlanDrop() {
    if (this.IsCurrentSpinHit || (this.Mode !== GameMode.SenMode && this.Mode !== GameMode.DaiSenMode)) return;
    const dropProbability = this.Mode === GameMode.SenMode ? GameSettings.SenDropProbability : GameSettings.DaiSenDropProbability;
    if (this.SelectedTheme !== RushTheme.IkkiKake) {
      this.isDropPlanned = this.nextDouble() < dropProbability;
      return;
    }
    // 連打可能救回來，所以先放大出現機率，讓實際轉落率仍然等於官方的轉落率
    const pinchProbability = dropProbability / (1.0 - GameSettings.DropRescueProbability);
    if (this.nextDouble() >= pinchProbability) return;
    this.isDropPlanned = true;
    this.isDropMashPlanned = true;
    this.willDropRescue = this.nextDouble() < GameSettings.DropRescueProbability;
    this.mashJumpPressCount = this.nextInt(GameSettings.MashMinPressesForJump, GameSettings.MashMinPressesForJump + 9);
    this.CurrentGateOutcome = GateOutcome.Held;
    this.DecideMissFigures(true);
    this.IsCurrentSpinReach = true;
  }

  // 決定這一轉有沒有中図柄再回轉預告（只有通常時）
  PlanFreeSpinOmen() {
    if (this.Mode !== GameMode.Normal) return;
    const h = GameSettings.NormalHitProbability;
    const singleProbability = this.GetFreeSpinOmenProbability(h, GameSettings.FreeSpinOmenOnHit, GameSettings.FreeSpinOmenHitMultiplier);
    const doubleProbability = this.GetFreeSpinOmenProbability(h, GameSettings.FreeSpinDoubleOnHit, GameSettings.FreeSpinDoubleHitMultiplier);
    const roll = this.nextDouble();
    if (roll < doubleProbability) this.FreeSpinFlowerTotal = 2;
    else if (roll < doubleProbability + singleProbability) this.FreeSpinFlowerTotal = 1;
    else return;
    this.isFreeSpinPlanned = true;
    if (this.IsCurrentSpinHit) {
      // 突然轉成七七七的變換演出保留：再回轉先轉出一般的中獎圖柄，再回轉結束後才變換
      this.freeSpinFinalCenter = this.Figures[1];
      // 一開始左右同圖柄、中間不同（リーチ）
      this.Figures[1] = this.PickDifferentFigure(this.Figures[0]);
    } else {
      this.DecideMissFigures(true);
      this.freeSpinFinalCenter = this.Figures[1];
    }
    this.IsCurrentSpinReach = true;
  }

  GetFreeSpinOmenProbability(hitProbability, onHit, multiplier) {
    if (this.IsCurrentSpinHit) return onHit;
    return onHit * (1.0 - multiplier * hitProbability) / (multiplier * (1.0 - hitProbability));
  }

  PickDifferentFigure(figure) {
    return (figure + 1 + this.nextInt(GameSettings.FigureKindCount - 1)) % GameSettings.FigureKindCount;
  }

  SetFreeSpinStage(stage) {
    this.freeSpinStage = stage;
    this.freeSpinStageStart = this.PhaseFrame;
  }

  // 中図柄再回轉預告進行中：每一幀推進預告流程
  UpdateFreeSpin() {
    if (!this.isFreeSpinPlanned || this.freeSpinStage === StageDone) return;
    const elapsed = this.PhaseFrame - this.freeSpinStageStart;
    switch (this.freeSpinStage) {
      case StageFlower1:
        if (elapsed >= GameSettings.FreeSpinFlowerFrames) this.SetFreeSpinStage(StageReSpin1);
        break;
      case StageFlower2:
        // 第二次浮水印消失後，出現PUSH演出，按下（或時間到）中間轉輪才再轉
        if (elapsed >= GameSettings.FreeSpinFlowerFrames) {
          this.SetFreeSpinStage(StageWaitPush);
          this.PushPrompt = PushPromptKind.FreeSpinPush;
          this.PushPromptRemainingFrames = GameSettings.FreeSpinPushWindowFrames;
          this.RaiseMessage('浮水印再次出現！快按PUSH！');
        }
        break;
      case StageReSpin1:
      case StageReSpin2:
        if (elapsed >= GameSettings.FreeSpinSpinFrames) {
          this.StopCenterReel();
          this.SetFreeSpinStage(this.freeSpinStage + 1);
        }
        break;
      case StageStop1:
      case StageStop2:
        if (elapsed >= GameSettings.FreeSpinStopFrames) {
          if (this.FreeSpinFlowerIndex < this.FreeSpinFlowerTotal) {
            // 第一次沒中，花的浮水印又出現一次
            this.FreeSpinFlowerIndex = 2;
            this.SetFreeSpinStage(StageFlower2);
            this.RaiseEffect(GameEffect.FreeSpinOmen);
          } else {
            this.FinishFreeSpin();
          }
        }
        break;
    }
  }

  // 中間轉輪停下：最後一次再回轉停在最終結果，第一次（出現兩次浮水印時）一定沒中
  StopCenterReel() {
    if (this.FreeSpinFlowerIndex >= this.FreeSpinFlowerTotal) {
      this.Figures[1] = this.freeSpinFinalCenter;
      if (this.IsCurrentSpinHit) {
        this.RaiseMessage('免費回轉：中間轉輪停住，中獎！');
        this.RaiseEffect(GameEffect.HitReveal);
      } else {
        this.RaiseMessage('免費回轉：可惜沒有中獎……');
        this.RaiseEffect(GameEffect.FreeSpinStop);
      }
    } else {
      this.Figures[1] = this.PickDifferentFigure(this.Figures[0]);
      this.RaiseMessage('免費回轉：沒有中……');
      this.RaiseEffect(GameEffect.FreeSpinStop);
    }
  }

  // 預告結束：決定之後的停留時間（有變換演出時要留給變換）
  FinishFreeSpin() {
    this.freeSpinStage = StageDone;
    this.freeSpinEndFrame = this.PhaseFrame;
    const hasFlip = this.IsCurrentSpinHit && this.CurrentFlipKind !== FlipKind.None;
    this.ResultStopTotalFrames = this.PhaseFrame + (hasFlip ? GameSettings.FlipResultStopFrames : GameSettings.Scaled(GameSettings.ResultStopFrames));
  }

  // 第二次浮水印後的PUSH演出
  StartSecondFlower(isAutomatic) {
    this.PushPrompt = PushPromptKind.None;
    this.PushPromptRemainingFrames = 0;
    this.SetFreeSpinStage(StageReSpin2);
    this.RaiseMessage('PUSH！中間轉輪再轉一次！' + (isAutomatic ? '（自動發動）' : ''));
    this.RaiseEffect(this.IsCurrentSpinHit ? GameEffect.PushHit : GameEffect.PushPressed);
  }

  // 強期待度電子音預告：中獎時固定機率出現，沒中獎時的機率由目標期待度反推
  DecideStrongOmen() {
    if (this.IsCurrentSpinHit) return this.nextDouble() < GameSettings.StrongOmenOnHit;
    const h = this.IsRushActive ? GameSettings.RushHitProbability : GameSettings.NormalHitProbability;
    const r = GameSettings.StrongOmenReliability;
    const missProbability = h * GameSettings.StrongOmenOnHit * (1.0 - r) / ((1.0 - h) * r);
    return this.nextDouble() < missProbability;
  }

  // 決定中獎時的三個圖柄與是否七七七、是否有變換演出
  DecideHitFigures() {
    const sevenIndex = GameSettings.SevenFigureIndex;
    if (this.Mode === GameMode.KabukiBurst) {
      this.IsCurrentSpinBurstHit = true;
      this.SetAllFigures(sevenIndex);
      this.IsCurrentSpinReach = true;
      return;
    }
    const burstProbability = this.Mode === GameMode.Normal ? GameSettings.BurstEntryProbability : GameSettings.BurstFromRushProbability;
    this.IsCurrentSpinBurstHit = this.nextDouble() < burstProbability;
    if (this.IsCurrentSpinBurstHit && this.nextDouble() < GameSettings.BurstDirectDisplayProbability) {
      this.SetAllFigures(sevenIndex);
    } else {
      this.SetAllFigures(this.PickNonSevenFigure());
      if (this.IsCurrentSpinBurstHit) this.CurrentFlipKind = FlipKind.SuddenToSeven;
      else if (this.nextDouble() < GameSettings.FakeFlipProbability) this.CurrentFlipKind = FlipKind.FakeAttempt;
    }
    this.IsCurrentSpinReach = this.IsRushActive || this.CurrentFlipKind !== FlipKind.None || this.nextDouble() < GameSettings.ReachProbabilityOnHit;
  }

  // 決定沒中獎時的三個圖柄
  DecideMissFigures(wantReach) {
    const n = GameSettings.FigureKindCount;
    const baseFigure = this.nextInt(n);
    const differentFigure = (baseFigure + 1 + this.nextInt(n - 1)) % n;
    if (wantReach) {
      this.Figures[0] = baseFigure;
      this.Figures[2] = baseFigure;
      this.Figures[1] = differentFigure;
    } else {
      this.Figures[0] = baseFigure;
      this.Figures[2] = differentFigure;
      this.Figures[1] = this.nextInt(n);
    }
  }

  SetAllFigures(figureIndex) { this.Figures[0] = figureIndex; this.Figures[1] = figureIndex; this.Figures[2] = figureIndex; }

  PickNonSevenFigure() {
    const candidates = [0, 1, 2, 3, 4, 5, 7];
    return candidates[this.nextInt(candidates.length)];
  }

  // 轉動結束，進入停止階段並決定停止時間與是否出現按鈕
  EnterResultStop() {
    this.ChangePhase(GamePhase.ResultStop);
    this.PushPrompt = PushPromptKind.None;
    this.PushPromptRemainingFrames = 0;
    this.isFlipResolved = false;
    this.IsFlipDone = false;
    this.IsFlipFailed = false;
    this.ResultStopTotalFrames = GameSettings.Scaled(GameSettings.ResultStopFrames);
    if (this.IsCurrentSpinHit && this.CurrentFlipKind !== FlipKind.None) this.ResultStopTotalFrames = GameSettings.FlipResultStopFrames;
    if (this.IsCurrentSpinHit && !this.isFreeSpinPlanned) {
      this.RaiseEffect(this.IsRushActive ? GameEffect.GateBreak : GameEffect.HitReveal);
    }
    if (this.isFreeSpinPlanned) {
      // 花的浮水印 → 中間轉輪免費再回轉一次 →（第二次浮水印：PUSH → 再回轉一次）；結束時間由預告流程決定
      this.freeSpinEndFrame = 100000;
      this.ResultStopTotalFrames = 100000;
      this.FreeSpinFlowerIndex = 1;
      this.SetFreeSpinStage(StageFlower1);
      this.RaiseMessage('花的浮水印出現！中間的轉輪免費再轉一次！');
      this.RaiseEffect(GameEffect.FreeSpinOmen);
    }
    if (this.isDropMashPlanned) {
      this.PushPrompt = PushPromptKind.DropMash;
      this.PushPromptRemainingFrames = GameSettings.DropMashWindowFrames;
      this.ResultStopTotalFrames = GameSettings.DropMashWindowFrames + GameSettings.DropMashAfterFrames;
      this.MashProgress = 0;
      this.MashPressCount = 0;
      this.holdRepeatCounter = 0;
      this.RaiseMessage('敵軍急襲！紅軍撤退就轉落，快連打PUSH（也可以按住）！');
    } else if (this.Mode === GameMode.SenMode && !this.IsCurrentSpinHit && this.CurrentGateOutcome === GateOutcome.Held) {
      this.PushPrompt = PushPromptKind.GateRescue;
      this.PushPromptRemainingFrames = GameSettings.GateRescueWindowFrames;
      this.ResultStopTotalFrames = GameSettings.RescueResultStopFrames;
      this.RaiseMessage('城門到達但沒突破！快按下大戰按鈕');
    }
  }

  // 開獎時的變換：突然轉成七七七或變換失敗
  ResolveFlip() {
    this.isFlipResolved = true;
    if (this.CurrentFlipKind === FlipKind.SuddenToSeven) {
      this.SetAllFigures(GameSettings.SevenFigureIndex);
      this.IsFlipDone = true;
      this.RaiseMessage('チェンジ！！突然轉成七七七 傾奇御免BONUS！');
      this.RaiseEffect(GameEffect.SevenFlip);
    } else {
      this.IsFlipFailed = true;
    }
  }

  // 停止結束後判斷是否大當り，沒中則判斷轉落或傾奇BURST結束
  FinishSpin() {
    if (this.IsCurrentSpinHit) { this.StartHit(); return; }
    const wasRescued = this.GateRescueSucceeded === true;
    if (!wasRescued) this.CheckModeEnd();
    this.ChangePhase(GamePhase.Idle);
  }

  CheckModeEnd() {
    switch (this.Mode) {
      case GameMode.SenMode:
        if (this.isDropPlanned) this.DropToNormal('戰モード轉落，回到通常');
        break;
      case GameMode.DaiSenMode:
        if (this.isDropPlanned) this.DropToNormal('大戰モード轉落，回到通常');
        break;
      case GameMode.KabukiBurst:
        if (this.RemainingRushSpins <= 0 && this.reservePlans.length === 0) this.DropToNormal(`傾奇BURST 結束，連莊數 ${this.RushChainCount}`);
        break;
    }
  }

  DropToNormal(message) {
    this.RaiseMessage(message);
    this.Mode = GameMode.Normal;
    this.RushChainCount = 0;
    this.ModeSpinCount = 0;
    this.RemainingRushSpins = 0;
    this.RerollReserves();
  }

  // 開始大當り，並先決定結束後會進入哪個狀態
  StartHit() {
    this.TotalHitCount++;
    this.SpinsSinceLastHit = 0;
    this.hitOriginMode = this.Mode;
    this.nextMode = this.DecideNextMode();
    let p = GameSettings.RoundTenProbabilityNormal;
    if (this.hitOriginMode === GameMode.SenMode) p = GameSettings.RoundTenProbabilitySen;
    else if (this.hitOriginMode === GameMode.DaiSenMode) p = GameSettings.RoundTenProbabilityDaiSen;
    else if (this.hitOriginMode === GameMode.KabukiBurst) p = GameSettings.RoundTenProbabilityBurst;
    this.TotalRounds = this.nextDouble() < p ? 10 : 2;
    this.CurrentRound = 0;
    this.AttackerCount = 0;
    if (this.IsCurrentSpinBurstHit) {
      this.RaiseMessage(`傾奇御免BONUS！七七七 ${this.TotalRounds}R 請右打（結束後進傾奇BURST）`);
    } else {
      this.RaiseMessage(`${this.hitOriginMode === GameMode.Normal ? '初當り' : this.GetModeName() + '中大當り'}！${this.TotalRounds}R 請右打`);
    }
    this.ChangePhase(GamePhase.HitOpening);
  }

  DecideNextMode() {
    if (this.IsCurrentSpinBurstHit) return GameMode.KabukiBurst;
    switch (this.hitOriginMode) {
      case GameMode.Normal:
        return this.nextDouble() < GameSettings.SenEntryProbability ? GameMode.SenMode : GameMode.Normal;
      case GameMode.SenMode:
        return this.nextDouble() < GameSettings.DaiSenBreakProbability ? GameMode.DaiSenMode : GameMode.SenMode;
      default:
        return GameMode.DaiSenMode;
    }
  }

  BeginRound() {
    this.CurrentRound++;
    this.AttackerCount = 0;
    this.ChangePhase(GamePhase.RoundOpen);
    if (this.IsThemeChoiceOpen) {
      this.RaiseMessage('請選擇RUSH演出（傾奇RUSH 或 一騎驅Mode）');
      this.RaiseEffect(GameEffect.ThemeChoiceOpen);
    }
  }

  FinishHit() {
    const previousMode = this.hitOriginMode;
    this.Mode = this.nextMode;
    this.ModeSpinCount = 0;
    if (this.Mode === GameMode.Normal) {
      this.RushChainCount = 0;
      this.RaiseMessage('大當り結束，沒有進入RUSH，回到通常');
    } else {
      this.RushChainCount = previousMode === GameMode.Normal ? 1 : this.RushChainCount + 1;
      if (this.Mode === GameMode.KabukiBurst) {
        this.RemainingRushSpins = GameSettings.BurstSpinCount;
        this.RaiseMessage(`傾奇BURST 開始！${GameSettings.BurstSpinCount}轉（連莊 ${this.RushChainCount}）`);
      } else if (this.Mode === GameMode.DaiSenMode && previousMode === GameMode.SenMode) {
        this.RaiseMessage('大戰モード突破成功！');
      } else if (this.Mode === GameMode.SenMode && previousMode === GameMode.SenMode) {
        this.RaiseMessage('大戰モード突破失敗，繼續戰モード');
      } else {
        this.RaiseMessage(`${this.GetModeName()} 開始（連莊 ${this.RushChainCount}）`);
      }
    }
    if (this.Mode !== GameMode.Normal && this.Mode !== previousMode) this.RaiseEffect(GameEffect.ModeUp);
    this.RerollReserves();
    this.ChangePhase(GamePhase.Idle);
  }
}
