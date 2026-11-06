import { GameSettings } from './settings.js';
import { BallMode, StartChuckerRect, ElectricChuckerRect, AttackerRect } from './physics.js';

const BallRadius = 5, PegRadius = 2.5, RailRadius = 2.5;
const WallLeft = 20, WallRight = 465, CeilingTop = 20, OutY = 556;
const CornerCenterY = 130, LeftCornerCenterX = 130, RightCornerCenterX = 355;
const LaunchStartX = 110, LaunchStartY = 585;
const BottomArcRadius = 105, BottomArcCenterY = 480, LeftRailX = 5, RingRadius = 125;
const KnobCenterX = 470;
const BoardWidth = 520, BoardHeight = 700;
const FontFamily = '"Microsoft JhengHei","PingFang TC","Noto Sans TC","Heiti TC",sans-serif';
const TargetFont = `bold ${(8 * 4 / 3).toFixed(1)}px ${FontFamily}`;
const rad = (deg) => deg * Math.PI / 180;

// 遊戲盤面繪製：仿實機的圓形遊技盤、外圈導軌、右打通道、各入賞口與機台外觀
export class BoardView {
  constructor(engine, physics) {
    this.engine = engine;
    this.physics = physics;
  }

  // 不會動的部分（機台底色、盤面、釘子、導軌、外框）先畫成一張圖，之後每幀只要貼上去，大幅降低 CPU／GPU 負擔
  BuildStaticLayer(dpr) {
    if (typeof document === 'undefined') return;
    const c = document.createElement('canvas');
    c.width = Math.round(BoardWidth * dpr);
    c.height = Math.round(BoardHeight * dpr);
    const sg = c.getContext('2d');
    sg.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.DrawStatic(sg);
    this.staticCanvas = c;
  }

  DrawStatic(g) {
    this.DrawCabinetBackground(g);
    this.DrawField(g);
    this.DrawRailsAndPegs(g);
    this.DrawCabinetFront(g);
    this.DrawLaunchRail(g);
  }

  Draw(g, alpha = 1) {
    if (this.staticCanvas) g.drawImage(this.staticCanvas, 0, 0, BoardWidth, BoardHeight);
    else this.DrawStatic(g);
    this.DrawTargets(g);
    this.DrawBalls(g, alpha);
  }

  // 建立遊技盤的外形（上方兩個大圓角、下方開口讓珠子掉出去）
  FieldPath(g) {
    g.beginPath();
    g.moveTo(WallLeft, OutY);
    g.lineTo(WallLeft, CornerCenterY);
    g.arc(LeftCornerCenterX, CornerCenterY, 110, rad(180), rad(270));
    g.lineTo(RightCornerCenterX, CeilingTop);
    g.arc(RightCornerCenterX, CornerCenterY, 110, rad(270), rad(360));
    g.lineTo(WallRight, OutY);
    g.closePath();
  }

  // 繪製機台外框（紅白裝飾）
  DrawCabinetBackground(g) {
    const grad = g.createLinearGradient(0, 0, 0, BoardHeight);
    grad.addColorStop(0, 'rgb(170,20,35)');
    grad.addColorStop(1, 'rgb(70,0,10)');
    g.fillStyle = grad;
    g.fillRect(0, 0, BoardWidth, BoardHeight);
    g.strokeStyle = 'rgba(255,255,255,0.588)';
    g.lineWidth = 10;
    for (let i = -2; i < 12; i++) {
      g.beginPath(); g.moveTo(i * 50, 0); g.lineTo(i * 50 + 60, 28); g.stroke();
    }
  }

  // 繪製遊技盤底色與外牆
  DrawField(g) {
    const grad = g.createLinearGradient(0, 0, 0, OutY);
    grad.addColorStop(0, 'rgb(235,215,225)');
    grad.addColorStop(1, 'rgb(150,90,130)');
    this.FieldPath(g);
    g.fillStyle = grad;
    g.fill();
    this.FieldPath(g);
    g.strokeStyle = 'gold';
    g.lineWidth = 3;
    g.stroke();
  }

  // 繪製導軌與釘子，命釘用橘色標出來
  DrawRailsAndPegs(g) {
    g.strokeStyle = 'goldenrod';
    g.lineWidth = RailRadius * 2;
    g.lineCap = 'round';
    for (const r of this.physics.rails) {
      g.beginPath(); g.moveTo(r.StartX, r.StartY); g.lineTo(r.EndX, r.EndY); g.stroke();
    }
    g.lineCap = 'butt';
    for (const p of this.physics.obstacleCircles) {
      const isLifeNail = this.physics.lifeNails.includes(p);
      g.fillStyle = isLifeNail ? 'orangered' : 'gold';
      g.beginPath(); g.arc(p.x, p.y, PegRadius, 0, Math.PI * 2); g.fill();
    }
  }

  // 繪製各入賞口
  DrawTargets(g) {
    const e = this.engine;
    this.DrawTarget(g, StartChuckerRect, '始動口', true, 'deepskyblue', 'start');
    this.DrawTarget(g, ElectricChuckerRect, '電チュー', e.IsElectricChuckerOpen, 'limegreen', 'electric');
    this.DrawTarget(g, AttackerRect, '大入賞口', e.IsAttackerOpen, 'orangered', 'attacker');
  }

  // 繪製單一入賞口，開啟時發亮
  DrawTarget(g, r, label, isOpen, openColor, flashKey) {
    let fill = isOpen ? openColor : 'rgb(60,60,60)';
    if (this.physics.flashFrames[flashKey] > 0) fill = 'white';
    g.fillStyle = fill;
    g.fillRect(r.x, r.y, r.w, r.h);
    g.strokeStyle = 'white';
    g.lineWidth = 1;
    g.strokeRect(r.x, r.y, r.w, r.h);
    g.font = TargetFont;
    g.fillStyle = 'black';
    g.textAlign = 'left';
    g.textBaseline = 'top';
    g.fillText(label, r.x - 2, r.y + r.h + 3);
  }

  // 繪製機台下方：紅色面板、喇叭、粉紅發光役物與出珠旋鈕
  DrawCabinetFront(g) {
    const grad = g.createLinearGradient(0, OutY, 0, BoardHeight);
    grad.addColorStop(0, 'rgb(190,25,40)');
    grad.addColorStop(1, 'rgb(70,0,10)');
    g.fillStyle = grad;
    g.fillRect(0, OutY, BoardWidth, BoardHeight - OutY);
    g.fillStyle = 'black';
    g.fillRect(0, 668, BoardWidth, 32);
    g.strokeStyle = 'rgb(230,90,100)';
    g.lineWidth = 3;
    g.beginPath(); g.moveTo(0, OutY + 2); g.lineTo(BoardWidth, OutY + 2); g.stroke();
    g.font = TargetFont;
    g.fillStyle = 'white';
    g.textAlign = 'left';
    g.textBaseline = 'top';
    g.fillText('OUT', 242, OutY - 14);
    this.DrawSpeaker(g, 190, 626, 40);
    this.DrawPinkOrb(g, 355, 600, 46);
    this.DrawLaunchKnob(g, KnobCenterX, 660, 24);
  }

  // 繪製外圈導軌：從左下打出口往上繞過上方
  DrawLaunchRail(g) {
    g.strokeStyle = 'goldenrod';
    g.lineWidth = 4;
    g.beginPath(); g.arc(LeftRailX + BottomArcRadius, BottomArcCenterY, BottomArcRadius, rad(90), rad(180)); g.stroke();
    g.beginPath(); g.moveTo(LeftRailX, BottomArcCenterY); g.lineTo(LeftRailX, CornerCenterY); g.stroke();
    g.beginPath(); g.arc(LeftCornerCenterX, CornerCenterY, RingRadius, rad(180), rad(270)); g.stroke();
    g.beginPath(); g.moveTo(LeftCornerCenterX, 5); g.lineTo(RightCornerCenterX, 5); g.stroke();
    g.beginPath(); g.arc(RightCornerCenterX, CornerCenterY, RingRadius, rad(270), rad(360)); g.stroke();
    g.fillStyle = 'goldenrod';
    g.beginPath(); g.arc(LaunchStartX, LaunchStartY, 7, 0, Math.PI * 2); g.fill();
    g.font = TargetFont;
    g.fillStyle = 'white';
    g.textAlign = 'left';
    g.textBaseline = 'top';
    g.fillText('打出口', LaunchStartX - 16, LaunchStartY + 8);
  }

  DrawSpeaker(g, cx, cy, r) {
    g.fillStyle = 'black';
    g.beginPath(); g.arc(cx, cy, r + 6, 0, Math.PI * 2); g.fill();
    g.strokeStyle = 'crimson'; g.lineWidth = 4;
    g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.stroke();
    g.fillStyle = 'dimgray';
    g.beginPath(); g.arc(cx, cy, 12, 0, Math.PI * 2); g.fill();
  }

  // 繪製粉紅發光役物
  DrawPinkOrb(g, cx, cy, r) {
    const grad = g.createRadialGradient(cx, cy, 0, cx, cy, r);
    grad.addColorStop(0, 'rgb(255,220,240)');
    grad.addColorStop(1, 'rgb(230,60,140)');
    g.fillStyle = grad;
    g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.fill();
    g.strokeStyle = 'white'; g.lineWidth = 1;
    g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.stroke();
  }

  // 繪製出珠旋鈕，小鋼珠從這裡發射
  DrawLaunchKnob(g, cx, cy, r) {
    g.fillStyle = 'black';
    g.beginPath(); g.arc(cx, cy, r + 4, 0, Math.PI * 2); g.fill();
    g.fillStyle = 'dimgray';
    g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.fill();
    g.fillStyle = 'silver';
    g.beginPath(); g.arc(cx, cy, r * 0.55, 0, Math.PI * 2); g.fill();
    g.strokeStyle = 'crimson'; g.lineWidth = 1;
    g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.stroke();
  }

  // 繪製所有小鋼珠
  DrawBalls(g, alpha = 1) {
    for (const b of this.physics.balls) {
      // 在「上一幀」與「這一幀」的位置之間內插（相差太遠代表瞬間移動，就不內插）
      const jump = Math.abs(b.PositionX - b.PrevX) + Math.abs(b.PositionY - b.PrevY);
      const t = jump > 40 ? 1 : alpha;
      const x = b.PrevX + (b.PositionX - b.PrevX) * t;
      const y = b.PrevY + (b.PositionY - b.PrevY) * t;
      g.fillStyle = 'silver';
      g.beginPath(); g.arc(x, y, BallRadius, 0, Math.PI * 2); g.fill();
      g.fillStyle = 'white';
      g.beginPath(); g.arc(x - 0.5, y - 1.5, 1.5, 0, Math.PI * 2); g.fill();
    }
  }
}
