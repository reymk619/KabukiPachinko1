import { GameSettings } from './settings.js';
import { GamePhase, GameMode, RushTheme, GateOutcome, FlipKind, PushPromptKind, ReserveColor } from './engine.js';

// 字型：pt 換成 px（96 DPI），優先使用 iOS / 各平台內建的繁中字型
const FontFamily = '"Microsoft JhengHei","PingFang TC","Noto Sans TC","Heiti TC",sans-serif';
const font = (pt) => `bold ${(pt * 4 / 3).toFixed(1)}px ${FontFamily}`;
const Fonts = {
  figure: font(44), compactFigure: font(22), hit: font(24), banner: font(20),
  info: font(11), small: font(9), mark: font(7), flower: font(96), watermark: font(50),
};

// 液晶螢幕：花之慶次風格動畫、數字轉輪、城門到達、保留玉、Push提示
export class ScreenView {
  constructor(engine) {
    this.engine = engine;
    this.Width = GameSettings.ScreenRectangle.w;
    this.Height = GameSettings.ScreenRectangle.h;
    this.animationFrame = 0;
    this.petals = [];
    for (let i = 0; i < 36; i++) this.petals.push(this.CreatePetal(true));
  }

  CreatePetal(randomHeight) {
    return {
      x: Math.random() * this.Width,
      y: randomHeight ? Math.random() * this.Height : -10,
      fallSpeed: 0.6 + Math.random() * 1.2,
      swayPhase: Math.random() * 100,
      size: 6 + Math.random() * 6,
    };
  }

  // 每一幀推進動畫
  AdvanceAnimation() {
    this.animationFrame++;
    const speedScale = this.engine.IsHitInProgress ? 2.5 : 1;
    for (const p of this.petals) {
      p.y += p.fallSpeed * speedScale;
      p.x += Math.sin((this.animationFrame + p.swayPhase) * 0.05) * 0.8;
      if (p.y > this.Height + 10) { p.y = -10; p.x = Math.random() * this.Width; }
    }
  }

  // ---- 繪圖小工具（對應 GDI+ 的寫法）----
  fillRect(g, color, x, y, w, h) { g.fillStyle = color; g.fillRect(x, y, w, h); }
  strokeRect(g, color, lw, x, y, w, h) { g.strokeStyle = color; g.lineWidth = lw; g.strokeRect(x, y, w, h); }
  line(g, color, lw, x1, y1, x2, y2) { g.strokeStyle = color; g.lineWidth = lw; g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke(); }
  fillEllipse(g, color, x, y, w, h) { g.fillStyle = color; g.beginPath(); g.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2); g.fill(); }
  strokeEllipse(g, color, lw, x, y, w, h) { g.strokeStyle = color; g.lineWidth = lw; g.beginPath(); g.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2); g.stroke(); }
  drawString(g, text, f, color, x, y) {
    g.font = f; g.fillStyle = color; g.textAlign = 'left'; g.textBaseline = 'top'; g.fillText(text, x, y + 1);
  }
  // 在指定矩形置中繪製文字
  drawCentered(g, text, f, color, r) {
    g.font = f; g.fillStyle = color; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(text, r.x + r.w / 2, r.y + r.h / 2 + 1);
  }
  rgba(r, gC, b, a) { return `rgba(${r},${gC},${b},${a / 255})`; }

  // ---- 繪製整個液晶畫面（原點在液晶左上角）----
  Draw(g) {
    const e = this.engine;
    g.save();
    g.beginPath(); g.rect(0, 0, this.Width, this.Height); g.clip();
    const isRushScene = e.IsRushActive && !e.IsHitInProgress;
    this.DrawBackground(g);
    if (isRushScene) {
      this.DrawThemeBackdrop(g);
      this.DrawGateScene(g);
    }
    this.DrawPetals(g);
    this.DrawModeTitle(g, isRushScene);
    this.DrawReserveBalls(g, isRushScene);
    if (e.IsHitInProgress) {
      this.DrawHitLayer(g);
    } else {
      this.DrawReels(g, isRushScene);
      if (isRushScene) this.DrawRushBanner(g);
      else this.DrawNormalBanner(g);
    }
    this.DrawPushPrompt(g);
    this.DrawStrongOmen(g);
    this.DrawFlowerWatermark(g);
    this.DrawThemeChoicePrompt(g);
    this.DrawFlipFlash(g);
    g.restore();
    this.strokeRect(g, 'gold', 1, 0.5, 0.5, this.Width - 1, this.Height - 1);
  }

  // 依狀態取得背景漸層顏色
  GetBackgroundColors() {
    const e = this.engine;
    let top = 'rgb(255,200,220)', bottom = 'rgb(120,60,130)';
    if (e.IsHitInProgress) {
      const flashing = Math.floor(this.animationFrame / 6) % 2 === 0;
      return [flashing ? 'rgb(255,215,0)' : 'rgb(220,40,40)', 'rgb(120,0,0)'];
    }
    const isKabuki = e.SelectedTheme === RushTheme.KabukiRush;
    switch (e.Mode) {
      case GameMode.SenMode:
        top = isKabuki ? 'rgb(170,10,30)' : 'rgb(15,25,80)';
        bottom = isKabuki ? 'rgb(30,0,10)' : 'rgb(60,20,100)';
        break;
      case GameMode.DaiSenMode:
        top = isKabuki ? 'rgb(120,0,90)' : 'rgb(50,10,110)';
        bottom = isKabuki ? 'rgb(20,0,40)' : 'rgb(10,10,50)';
        break;
      case GameMode.KabukiBurst: {
        const flashing = Math.floor(this.animationFrame / 10) % 2 === 0;
        top = flashing ? 'rgb(255,230,120)' : 'rgb(255,190,60)';
        bottom = 'rgb(200,90,0)';
        break;
      }
    }
    return [top, bottom];
  }

  DrawBackground(g) {
    const [top, bottom] = this.GetBackgroundColors();
    const grad = g.createLinearGradient(0, 0, 0, this.Height);
    grad.addColorStop(0, top);
    grad.addColorStop(1, bottom);
    g.fillStyle = grad;
    g.fillRect(0, 0, this.Width, this.Height);
  }

  DrawPetals(g) {
    for (const p of this.petals) this.fillEllipse(g, 'rgba(255,182,193,0.667)', p.x, p.y, p.size, p.size * 0.6);
  }

  DrawThemeBackdrop(g) {
    if (this.engine.SelectedTheme === RushTheme.KabukiRush) this.DrawKabukiBurst(g);
    else this.DrawNightSky(g);
  }

  // 傾奇RUSH演出：放射光線與傾奇浮水印
  DrawKabukiBurst(g) {
    const cx = this.Width / 2, cy = this.Height / 2;
    for (let i = 0; i < 16; i++) {
      const a = i * Math.PI / 8 + this.animationFrame * 0.01;
      this.line(g, 'rgba(255,215,0,0.275)', 3, cx, cy, cx + Math.cos(a) * 400, cy + Math.sin(a) * 400);
    }
    this.drawString(g, '傾奇', Fonts.watermark, 'rgba(255,215,0,0.157)', 10, 70);
  }

  // 一騎驅Mode演出：夜空星星與奔跑時的速度線
  DrawNightSky(g) {
    const e = this.engine;
    for (let i = 0; i < 20; i++) {
      const sx = (i * 53) % this.Width;
      const sy = (i * 37) % 70 + 4;
      let alpha = 120 + Math.trunc(100 * Math.sin((this.animationFrame + i * 9) * 0.08));
      alpha = Math.max(20, Math.min(220, alpha));
      this.fillEllipse(g, this.rgba(255, 255, 255, alpha), sx, sy, 3, 3);
    }
    if (e.Phase === GamePhase.Spinning && e.CurrentGateOutcome !== GateOutcome.None) {
      for (let i = 0; i < 6; i++) {
        const lx = (this.animationFrame * 14 + i * 61) % this.Width;
        const ly = 100 + i * 14;
        this.line(g, 'rgba(255,255,255,0.47)', 2, lx, ly, lx + 30, ly);
      }
    }
  }

  // 城門到達演出：騎馬衝向城門，突破時城門爆開，沒突破時城門搖晃
  DrawGateScene(g) {
    const e = this.engine;
    const gateLeft = this.Width - 84;
    const isBroken = e.Phase === GamePhase.ResultStop && e.CurrentGateOutcome === GateOutcome.Broken;
    const isHeld = e.Phase === GamePhase.ResultStop && e.CurrentGateOutcome === GateOutcome.Held;
    const shake = isHeld ? Math.sin(this.animationFrame * 0.8) * 2 : 0;
    this.line(g, 'saddlebrown', 1, 0, 190, this.Width, 190);
    if (!isBroken) {
      this.fillRect(g, 'rgba(70,35,25,0.82)', gateLeft + shake, 100, 70, 86);
      this.strokeRect(g, 'gold', 1, gateLeft + shake, 100, 70, 86);
      this.line(g, 'gold', 1, gateLeft + 35 + shake, 100, gateLeft + 35 + shake, 186);
    }
    g.fillStyle = 'rgba(140,20,20,0.9)';
    g.beginPath(); g.moveTo(gateLeft - 12, 102); g.lineTo(gateLeft + 35, 74); g.lineTo(gateLeft + 82, 102); g.closePath(); g.fill();
    const progress = this.GetHorseProgress();
    const horseX = 10 + progress * (gateLeft - 100);
    this.DrawHorseRider(g, horseX, 172);
    if (isBroken) {
      for (let i = 0; i < 12; i++) {
        const a = i * Math.PI / 6 + this.animationFrame * 0.05;
        this.line(g, 'yellow', 3, gateLeft + 35, 145, gateLeft + 35 + Math.cos(a) * 55, 145 + Math.sin(a) * 55);
      }
    }
  }

  // 取得馬的前進進度，0是起點，1是城門前
  GetHorseProgress() {
    const e = this.engine;
    const isGateReached = e.CurrentGateOutcome !== GateOutcome.None;
    if (e.Phase === GamePhase.Spinning) {
      const ratio = e.PhaseFrame / e.SpinTotalFrames;
      return isGateReached ? Math.min(ratio / 0.85, 1) : Math.min(ratio, 0.55);
    }
    if (e.Phase === GamePhase.ResultStop) return isGateReached ? 1 : 0.55;
    return 0;
  }

  // 繪製騎著馬的慶次
  DrawHorseRider(g, x, y) {
    const swing = Math.sin(this.animationFrame * 0.4) * 8;
    const leg = 'rgb(90,50,20)';
    this.line(g, leg, 3, x + 8, y, x + 8 + swing, y + 18);
    this.line(g, leg, 3, x + 14, y, x + 14 - swing, y + 18);
    this.line(g, leg, 3, x + 38, y, x + 38 - swing, y + 18);
    this.line(g, leg, 3, x + 44, y, x + 44 + swing, y + 18);
    this.fillEllipse(g, 'rgb(110,60,25)', x, y - 20, 52, 24);
    this.fillEllipse(g, 'rgb(110,60,25)', x + 44, y - 34, 20, 13);
    this.fillEllipse(g, 'navajowhite', x + 18, y - 46, 11, 11);
    this.line(g, leg, 3, x + 23, y - 35, x + 23, y - 18);
    this.line(g, 'white', 2, x + 12, y - 46, x + 12, y - 76);
    this.fillRect(g, 'crimson', x - 6, y - 76, 18, 24);
    this.drawString(g, '慶', Fonts.small, 'white', x - 7, y - 73);
  }

  // 繪製狀態名稱與說明文字
  DrawModeTitle(g, isRushScene) {
    const e = this.engine;
    let title, detail = '';
    if (e.IsHitInProgress) title = '花の慶次';
    else if (e.Mode === GameMode.Normal) title = '花の慶次　通常 1/399.9';
    else if (e.Mode === GameMode.KabukiBurst) {
      title = '傾奇BURST';
      detail = `残り ${e.RemainingRushSpins} 轉　連莊 ${e.RushChainCount}`;
    } else {
      title = e.GetModeName();
      detail = `經過 ${e.ModeSpinCount} 轉　連莊 ${e.RushChainCount}`;
    }
    this.drawString(g, title, Fonts.info, 'white', 8, 6);
    if (isRushScene) this.drawString(g, detail, Fonts.small, 'white', 8, 26);
  }

  // 繪製保留玉，顏色與圖案代表期待度（參考真・花の慶次3）
  DrawReserveBalls(g, isRushScene) {
    const e = this.engine;
    const ballY = isRushScene ? 46 : 34;
    for (let i = 0; i < GameSettings.ReserveMaximum; i++) {
      const r = { x: 10 + i * 22, y: ballY, w: 18, h: 18 };
      if (i < e.ReserveCount) this.DrawReserveBall(g, e.GetReserveColor(i), r);
      this.strokeEllipse(g, 'white', 1, r.x, r.y, r.w, r.h);
    }
  }

  // 單顆保留玉：青、綠、赤、金是單色，虎柄有條紋，天激珠有「天」字，松風有「松」字
  DrawReserveBall(g, color, r) {
    let base = 'white', mark = null, markColor = 'white';
    switch (color) {
      case ReserveColor.Blue: base = 'deepskyblue'; break;
      case ReserveColor.Green: base = 'limegreen'; break;
      case ReserveColor.Red: base = 'red'; break;
      case ReserveColor.Gold: base = 'gold'; break;
      case ReserveColor.Tiger: base = 'orange'; break;
      case ReserveColor.HeavenWeak: base = 'rgb(190,235,255)'; mark = '天'; markColor = 'midnightblue'; break;
      case ReserveColor.HeavenStrong: base = 'rgb(200,60,220)'; mark = '天'; markColor = 'gold'; break;
      case ReserveColor.Matsukaze: base = 'rgb(150,90,40)'; mark = '松'; markColor = 'white'; break;
    }
    this.fillEllipse(g, base, r.x, r.y, r.w, r.h);
    if (color === ReserveColor.Tiger) {
      this.line(g, 'black', 2, r.x + 4, r.y + 7, r.x + 10, r.y + 3);
      this.line(g, 'black', 2, r.x + 8, r.y + 15, r.x + 15, r.y + 8);
      this.line(g, 'black', 2, r.x + 3, r.y + 13, r.x + 7, r.y + 10);
    }
    if (mark !== null) this.drawCentered(g, mark, Fonts.mark, markColor, r);
    else this.fillEllipse(g, 'white', r.x + 4, r.y + 3, 4, 4);
  }

  // 繪製三個數字轉輪（1到8），RUSH中縮小放在右上角
  DrawReels(g, isCompact) {
    const e = this.engine;
    for (let i = 0; i < 3; i++) {
      const r = isCompact ? { x: 172 + i * 52, y: 4, w: 48, h: 48 } : { x: 27 + i * 96, y: 62, w: 84, h: 96 };
      const figure = this.GetDisplayedFigure(i);
      const isSeven = figure === GameSettings.SevenFigureIndex;
      this.fillRect(g, 'rgba(255,255,255,0.863)', r.x, r.y, r.w, r.h);
      const hot = isSeven && e.Phase !== GamePhase.Spinning;
      this.strokeRect(g, hot ? 'gold' : 'goldenrod', hot ? 3 : 1, r.x, r.y, r.w, r.h);
      this.drawCentered(g, String(figure + 1), isCompact ? Fonts.compactFigure : Fonts.figure, isSeven ? 'red' : 'midnightblue', r);
    }
  }

  // 取得某個轉輪目前顯示的圖柄
  GetDisplayedFigure(reelIndex) {
    const e = this.engine;
    // 中図柄再回轉預告：只有中間的轉輪再轉
    if (reelIndex === 1 && e.IsCenterReSpinning) return (Math.floor(this.animationFrame / 3) + 3) % GameSettings.FigureKindCount;
    if (e.Phase !== GamePhase.Spinning) return e.Figures[reelIndex];
    if (e.PhaseFrame >= this.GetReelStopFrame(reelIndex)) return e.Figures[reelIndex];
    return (Math.floor(this.animationFrame / 3) + reelIndex * 3) % GameSettings.FigureKindCount;
  }

  // 取得某個轉輪停止的幀數（左35%、右60%、中最後）
  GetReelStopFrame(reelIndex) {
    const total = this.engine.SpinTotalFrames;
    if (reelIndex === 0) return Math.floor(total * 35 / 100);
    if (reelIndex === 2) return Math.floor(total * 60 / 100);
    return total;
  }

  // 通常時下方的文字：リーチ、Push激アツ、開獎結果
  DrawNormalBanner(g) {
    const e = this.engine;
    const r = { x: 0, y: 160, w: this.Width, h: 38 };
    if (e.IsFreeSpinRunning) {
      if (!e.IsFlowerShown && e.PushPrompt === PushPromptKind.None) this.drawCentered(g, '免費回轉', Fonts.banner, 'hotpink', r);
      return;
    }
    if (e.Phase === GamePhase.ResultStop && e.IsCurrentSpinHit) { this.DrawHitResultText(g, r); return; }
    if (e.Phase !== GamePhase.Spinning || e.PushPrompt !== PushPromptKind.None) return;
    if (e.IsChanceUpActivated) {
      const hot = e.IsChanceUpHot;
      this.drawCentered(g, hot ? '激アツ!!' : 'チャンス', Fonts.banner, hot ? 'red' : 'white', r);
      return;
    }
    const reachVisible = e.IsCurrentSpinReach && e.PhaseFrame >= this.GetReelStopFrame(2);
    if (reachVisible && Math.floor(this.animationFrame / 8) % 2 === 0) this.drawCentered(g, 'リーチ!!', Fonts.banner, 'yellow', r);
  }

  // RUSH中上方的文字：城門到達、突破結果、復活結果
  DrawRushBanner(g) {
    const e = this.engine;
    const r = { x: 0, y: 58, w: this.Width, h: 32 };
    if (e.Phase === GamePhase.Spinning) {
      const arrived = e.CurrentGateOutcome !== GateOutcome.None && e.PhaseFrame >= Math.floor(e.SpinTotalFrames * 85 / 100);
      if (arrived && Math.floor(this.animationFrame / 6) % 2 === 0) this.drawCentered(g, '城門到達!!', Fonts.banner, 'yellow', r);
      return;
    }
    if (e.Phase !== GamePhase.ResultStop) return;
    if (e.IsCurrentSpinHit) {
      if (e.CurrentFlipKind === FlipKind.None && !e.IsCurrentSpinBurstHit) this.drawCentered(g, '城門突破!!', Fonts.banner, 'gold', r);
      else this.DrawHitResultText(g, r);
      return;
    }
    if (e.IsDropPinchSpin) {
      if (e.DropRescueSucceeded === true) this.drawCentered(g, '城門突破!! 拉回!!', Fonts.banner, 'gold', r);
      else if (e.DropRescueSucceeded === false) this.drawCentered(g, '紅軍撤退…RUSH終止', Fonts.banner, 'lightgray', r);
      else if (Math.floor(this.animationFrame / 6) % 2 === 0) this.drawCentered(g, '敵軍急襲!!', Fonts.banner, 'orangered', r);
      return;
    }
    if (e.CurrentGateOutcome !== GateOutcome.Held) return;
    if (e.GateRescueSucceeded === true) this.drawCentered(g, '復活!! 大戰モード', Fonts.banner, 'gold', r);
    else if (e.GateRescueSucceeded === false) this.drawCentered(g, '復活ならず…', Fonts.banner, 'lightgray', r);
    else this.drawCentered(g, '城門突破ならず…', Fonts.banner, 'lightgray', r);
  }

  // 開獎時的文字，包含看有沒有換與突然轉成七七七
  DrawHitResultText(g, r) {
    const e = this.engine;
    let text, color = 'gold';
    if (e.CurrentFlipKind === FlipKind.None) {
      text = e.IsCurrentSpinBurstHit ? '傾奇御免BONUS!!' : '大當り!!';
    } else if (e.PhaseFrame < e.FlipEventFrame) {
      text = 'チェンジ…？'; color = 'white';
    } else if (e.IsFlipDone) {
      text = '七七七!! 傾奇御免'; color = 'red';
    } else {
      text = '大當り!!（沒有換）';
    }
    this.drawCentered(g, text, Fonts.banner, color, r);
  }

  // 開獎變換瞬間的白光
  DrawFlipFlash(g) {
    const e = this.engine;
    if (e.Phase !== GamePhase.ResultStop || e.CurrentFlipKind === FlipKind.None || !e.IsCurrentSpinHit || e.IsFreeSpinRunning) return;
    const since = e.PhaseFrame - e.FlipEventFrame;
    if (since < 0 || since >= 10) return;
    const alpha = 220 - since * 22;
    this.fillRect(g, this.rgba(255, 255, 255, alpha), 0, 0, this.Width, this.Height);
  }

  // Push提示：激アツ前兆或城門沒突破後的大戰按鈕
  DrawPushPrompt(g) {
    const e = this.engine;
    if (e.PushPrompt === PushPromptKind.None) return;
    const flashing = Math.floor(this.animationFrame / 6) % 2 === 0;
    if (e.PushPrompt === PushPromptKind.ChanceUp || e.PushPrompt === PushPromptKind.FreeSpinPush) {
      const r = { x: 50, y: 160, w: 230, h: 34 };
      this.fillRect(g, 'rgba(0,0,0,0.784)', r.x, r.y, r.w, r.h);
      this.drawCentered(g, 'PUSH!!', Fonts.banner, flashing ? 'gold' : 'white', r);
      return;
    }
    if (e.PushPrompt === PushPromptKind.DropMash) {
      this.fillRect(g, 'rgba(0,0,0,0.804)', 25, 94, 280, 94);
      this.drawCentered(g, '紅軍撤退就轉落！', Fonts.info, 'white', { x: 25, y: 96, w: 280, h: 22 });
      this.drawCentered(g, '連打 PUSH!!（可按住）', Fonts.banner, flashing ? 'yellow' : 'orangered', { x: 25, y: 118, w: 280, h: 34 });
      const bar = { x: 45, y: 160, w: 240, h: 18 };
      this.fillRect(g, 'dimgray', bar.x, bar.y, bar.w, bar.h);
      const fillWidth = Math.trunc(bar.w * e.MashProgress);
      if (fillWidth > 0) this.fillRect(g, e.MashProgress >= 0.7 ? 'gold' : 'orangered', bar.x, bar.y, fillWidth, bar.h);
      this.strokeRect(g, 'white', 1, bar.x, bar.y, bar.w, bar.h);
      return;
    }
    this.fillRect(g, 'rgba(0,0,0,0.784)', 25, 96, 280, 64);
    this.drawCentered(g, '城門突破ならず…', Fonts.info, 'white', { x: 25, y: 98, w: 280, h: 24 });
    this.drawCentered(g, '大戰按鈕!!', Fonts.banner, flashing ? 'yellow' : 'orangered', { x: 25, y: 122, w: 280, h: 34 });
  }

  // 花的浮水印：閃一下後淡出消失
  DrawFlowerWatermark(g) {
    const e = this.engine;
    if (!e.IsFlowerShown) return;
    const progress = e.FlowerProgress;
    let alpha = Math.trunc(200 * Math.sin(Math.PI * progress));
    if (Math.floor(this.animationFrame / 3) % 2 === 0) alpha = Math.trunc(alpha * 2 / 3);
    alpha = Math.max(0, Math.min(255, alpha));
    this.drawCentered(g, '花', Fonts.flower, this.rgba(255, 110, 170, alpha), { x: 0, y: 0, w: this.Width, h: 200 });
  }

  // 強期待度電子音預告：變動開始時閃爍文字（關掉音效也看得到）
  DrawStrongOmen(g) {
    const e = this.engine;
    if (!e.IsStrongOmen || e.Phase !== GamePhase.Spinning || e.PhaseFrame > 90 || Math.floor(this.animationFrame / 4) % 2 !== 0) return;
    const r = { x: 6, y: 6, w: 160, h: 30 };
    this.fillRect(g, 'rgba(0,0,0,0.784)', r.x, r.y, r.w, r.h);
    this.drawCentered(g, '電子音預告!!', Fonts.banner, 'red', r);
  }

  // 大當り倒數第二R的RUSH演出選擇提示
  DrawThemeChoicePrompt(g) {
    const e = this.engine;
    if (!e.IsThemeChoiceOpen) return;
    const r = { x: 35, y: 170, w: 260, h: 26 };
    this.fillRect(g, 'rgba(0,0,0,0.843)', r.x, r.y, r.w, r.h);
    const flashing = Math.floor(this.animationFrame / 8) % 2 === 0;
    this.drawCentered(g, 'RUSH演出：請選擇 傾奇／一騎驅', Fonts.small, flashing ? 'gold' : 'white', r);
  }

  // 繪製大當り中畫面
  DrawHitLayer(g) {
    const e = this.engine;
    const headline = e.IsCurrentSpinBurstHit ? '傾奇御免BONUS!!' : '大當り!!';
    this.drawCentered(g, headline, Fonts.hit, 'white', { x: 0, y: 50, w: this.Width, h: 50 });
    const detail = e.Phase === GamePhase.HitOpening ? '慶次參上！' : `ROUND ${e.CurrentRound}/${e.TotalRounds}　入賞 ${e.AttackerCount}/${GameSettings.AttackerMaximumCount}`;
    this.drawCentered(g, detail, Fonts.info, 'white', { x: 0, y: 110, w: this.Width, h: 28 });
    const guide = e.IsCurrentSpinBurstHit ? '結束後進入 傾奇BURST！請右打' : '請把力度調到右打區間';
    this.drawCentered(g, guide, Fonts.info, 'yellow', { x: 0, y: 145, w: this.Width, h: 28 });
  }
}
