import { GameSettings } from './settings.js';
import { Pegs, FunnelPegs, RailData } from './layout.js';

// 小鋼珠目前所在的區域：外圈導軌、盤面
export const BallMode = { Rail: 'Rail', Field: 'Field' };
// 珠子進入的入賞口種類（給音效使用）
export const TargetKind = { StartChucker: 'StartChucker', ElectricChucker: 'ElectricChucker', Attacker: 'Attacker' };

const BallRadius = 5, PegRadius = 2.5, RailRadius = 2.5;
const Gravity = 0.2, PegRestitution = 0.55, RailRestitution = 0.4;
const WallLeft = 20, WallRight = 465, CeilingTop = 20, OutY = 556, MaximumSpeed = 14;
// 盤面上方兩個圓角的圓心與內縮後的半徑
const CornerCenterY = 130, LeftCornerCenterX = 130, RightCornerCenterX = 355, CornerInsetRadius = 105;
// 外圈導軌：從左下打出口出發，沿左側往上，繞過上方再往右（和實機一樣）
const LaunchStartX = 110, LaunchStartY = 585;
const BottomArcRadius = 105, BottomArcCenterY = 480, BottomArcLength = 164.93;
const LeftRailX = 5, LeftStraightLength = 350;
const RingRadius = 125, QuarterArcLength = 196.35, TopStraightLength = 225;
const RailSpeedPerStep = 8, WeakPowerLimit = 30, RightHitPowerStart = 55;

// 入賞口的位置（x, y, 寬, 高）
export const StartChuckerRect = { x: 205, y: 500, w: 46, h: 16 };
export const ElectricChuckerRect = { x: 430, y: 410, w: 22, h: 14 };
export const AttackerRect = { x: 395, y: 470, w: 64, h: 18 };

// 盤面物理：小鋼珠發射、導軌、釘子碰撞、入賞判定
export class BoardPhysics {
  constructor(engine) {
    this.engine = engine;
    this.balls = [];
    this.obstacleCircles = [];
    this.lifeNails = [];
    this.rails = [];
    this.flashFrames = { start: 0, electric: 0, attacker: 0 };
    this.onPayout = null;        // (n) => void
    this.onBallReturned = null;  // () => void
    this.onTargetEntered = null; // (kind) => void
    this.BuildLayout();
  }

  get ActiveBallCount() { return this.balls.length; }

  // 發射一顆小鋼珠，power為0到100：30以下衝不上去，30到54左打，55以上右打
  LaunchBall(power) {
    const ball = {
      PositionX: LaunchStartX, PositionY: LaunchStartY, PrevX: LaunchStartX, PrevY: LaunchStartY, VelocityX: 0, VelocityY: 0, Mode: BallMode.Rail,
      RailDistance: 0, IsReturning: false, RailLimit: 0, ExitDistance: 0, ExitX: 0, ExitY: 0, ExitVelocityX: 0, ExitVelocityY: 0,
      AgeFrames: 0, StallCount: 0, LastCheckX: 0, LastCheckY: 0, IsRemoved: false,
    };
    if (power < WeakPowerLimit) ball.RailLimit = Math.max(power * 12, 1);
    else this.PrepareRailExit(ball, power);
    this.balls.push(ball);
  }

  ClearBalls() { this.balls.length = 0; }

  // 每一幀推進物理（分兩個子步驟避免穿透）
  StepPhysics() {
    this.UpdateHitEffects();
    for (let i = 0; i < this.balls.length; i++) {
      const ball = this.balls[i];
      ball.PrevX = ball.PositionX;
      ball.PrevY = ball.PositionY;
      this.AdvanceBall(ball, 0.5);
      if (!ball.IsRemoved) this.AdvanceBall(ball, 0.5);
      if (!ball.IsRemoved) this.CheckStall(ball);
    }
    this.balls = this.balls.filter((b) => !b.IsRemoved);
  }

  BuildLayout() {
    for (const p of Pegs) this.obstacleCircles.push({ x: p[0], y: p[1] });
    for (const p of FunnelPegs) this.obstacleCircles.push({ x: p[0], y: p[1] });
    const chuckerCenterX = StartChuckerRect.x + StartChuckerRect.w / 2;
    this.lifeNails.push({ x: chuckerCenterX - GameSettings.LifeNailHalfGap, y: 474 });
    this.lifeNails.push({ x: chuckerCenterX + GameSettings.LifeNailHalfGap, y: 474 });
    for (const n of this.lifeNails) this.obstacleCircles.push(n);
    for (const r of RailData) this.rails.push({ StartX: r[0], StartY: r[1], EndX: r[2], EndY: r[3], IsRoof: r[4] > 0.5 });
  }

  // 依力度決定小鋼珠沿外圈導軌跑多遠才進盤面
  PrepareRailExit(ball, power) {
    let exitAngle, arcCenterX;
    const distanceBeforeArc = BottomArcLength + LeftStraightLength;
    if (power < RightHitPowerStart) {
      exitAngle = (150.0 - (power - 30.0) / 25.0 * 40.0) * Math.PI / 180.0;
      arcCenterX = LeftCornerCenterX;
      ball.ExitDistance = distanceBeforeArc + RingRadius * (Math.PI - exitAngle);
    } else {
      exitAngle = (85.0 - (power - 55.0) / 45.0 * 65.0) * Math.PI / 180.0;
      arcCenterX = RightCornerCenterX;
      ball.ExitDistance = distanceBeforeArc + QuarterArcLength + TopStraightLength + RingRadius * (Math.PI / 2.0 - exitAngle);
    }
    const exitSpeed = 7 + (Math.random() - 0.5) * 0.8;
    ball.ExitX = arcCenterX + CornerInsetRadius * Math.cos(exitAngle);
    ball.ExitY = CornerCenterY - CornerInsetRadius * Math.sin(exitAngle);
    ball.ExitVelocityX = Math.sin(exitAngle) * exitSpeed;
    ball.ExitVelocityY = Math.cos(exitAngle) * exitSpeed;
  }

  // 取得外圈導軌上某個距離的位置
  GetRailPoint(distance) {
    if (distance <= BottomArcLength) {
      const a = distance / BottomArcRadius;
      return { x: LaunchStartX - BottomArcRadius * Math.sin(a), y: BottomArcCenterY + BottomArcRadius * Math.cos(a) };
    }
    const afterBottomArc = distance - BottomArcLength;
    if (afterBottomArc <= LeftStraightLength) return { x: LeftRailX, y: BottomArcCenterY - afterBottomArc };
    const afterStraight = afterBottomArc - LeftStraightLength;
    if (afterStraight <= QuarterArcLength) {
      const a = Math.PI - afterStraight / RingRadius;
      return { x: LeftCornerCenterX + RingRadius * Math.cos(a), y: CornerCenterY - RingRadius * Math.sin(a) };
    }
    const afterLeftArc = afterStraight - QuarterArcLength;
    if (afterLeftArc <= TopStraightLength) return { x: LeftCornerCenterX + afterLeftArc, y: 5 };
    const a = Math.PI / 2.0 - (afterLeftArc - TopStraightLength) / RingRadius;
    return { x: RightCornerCenterX + RingRadius * Math.cos(a), y: CornerCenterY - RingRadius * Math.sin(a) };
  }

  AdvanceBall(ball, stepScale) {
    if (ball.Mode === BallMode.Rail) this.AdvanceBallOnRail(ball);
    else this.AdvanceBallInField(ball, stepScale);
  }

  // 小鋼珠沿外圈導軌行進：力道夠就到出口進盤面，力道不足會爬到一半再滑回打出口
  AdvanceBallOnRail(ball) {
    if (ball.IsReturning) {
      ball.RailDistance -= RailSpeedPerStep;
      if (ball.RailDistance <= 0) {
        ball.IsRemoved = true;
        if (this.onBallReturned) this.onBallReturned();
        return;
      }
    } else {
      ball.RailDistance += RailSpeedPerStep;
      if (ball.RailLimit > 0 && ball.RailDistance >= ball.RailLimit) {
        ball.IsReturning = true;
      } else if (ball.RailLimit <= 0 && ball.RailDistance >= ball.ExitDistance) {
        ball.Mode = BallMode.Field;
        ball.PositionX = ball.ExitX;
        ball.PositionY = ball.ExitY;
        ball.VelocityX = ball.ExitVelocityX;
        ball.VelocityY = ball.ExitVelocityY;
        return;
      }
    }
    const p = this.GetRailPoint(ball.RailDistance);
    ball.PositionX = p.x;
    ball.PositionY = p.y;
  }

  // 小鋼珠在盤面內的運動
  AdvanceBallInField(ball, stepScale) {
    this.ApplyAttraction(ball);
    ball.VelocityY += Gravity * stepScale;
    this.LimitSpeed(ball);
    ball.PositionX += ball.VelocityX * stepScale;
    ball.PositionY += ball.VelocityY * stepScale;
    this.CollideWithWalls(ball);
    for (const c of this.obstacleCircles) this.ResolveCircleCollision(ball, c.x, c.y, PegRadius, PegRestitution);
    for (const r of this.rails) this.CollideWithRail(ball, r);
    this.CheckTargets(ball);
    if (!ball.IsRemoved && ball.PositionY > OutY) ball.IsRemoved = true;
  }

  // 下半盤面的收攏效果，模擬寄釘讓珠子偏向對應的入賞口
  ApplyAttraction(ball) {
    if (ball.PositionY <= 380) return;
    let targetX = -1, strength = 0;
    if (ball.PositionX >= 400) {
      if (this.engine.IsAttackerOpen) targetX = AttackerRect.x + AttackerRect.w / 2;
      else if (this.engine.IsElectricChuckerOpen) targetX = ElectricChuckerRect.x + ElectricChuckerRect.w / 2;
      strength = 0.002;
    } else if (ball.PositionX > 120) {
      targetX = StartChuckerRect.x + StartChuckerRect.w / 2;
      strength = 0.0005;
    }
    if (targetX >= 0) {
      ball.VelocityX += (targetX - ball.PositionX) * strength;
      ball.VelocityX *= 0.985;
    }
  }

  LimitSpeed(ball) {
    const speed = Math.sqrt(ball.VelocityX * ball.VelocityX + ball.VelocityY * ball.VelocityY);
    if (speed > MaximumSpeed) {
      const s = MaximumSpeed / speed;
      ball.VelocityX *= s;
      ball.VelocityY *= s;
    }
  }

  // 與圓角外牆、直牆與天花板碰撞
  CollideWithWalls(ball) {
    let isInCorner = false;
    if (ball.PositionY < CornerCenterY) {
      let cornerCenterX = 0;
      if (ball.PositionX < LeftCornerCenterX) { cornerCenterX = LeftCornerCenterX; isInCorner = true; }
      else if (ball.PositionX > RightCornerCenterX) { cornerCenterX = RightCornerCenterX; isInCorner = true; }
      if (isInCorner) {
        const dx = ball.PositionX - cornerCenterX;
        const dy = ball.PositionY - CornerCenterY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance > CornerInsetRadius) {
          const nx = dx / distance, ny = dy / distance;
          ball.PositionX = cornerCenterX + nx * CornerInsetRadius;
          ball.PositionY = CornerCenterY + ny * CornerInsetRadius;
          const dot = ball.VelocityX * nx + ball.VelocityY * ny;
          if (dot > 0) {
            ball.VelocityX -= 1.5 * dot * nx;
            ball.VelocityY -= 1.5 * dot * ny;
          }
        }
      }
    }
    if (!isInCorner && ball.PositionY < CeilingTop + BallRadius) {
      ball.PositionY = CeilingTop + BallRadius;
      ball.VelocityY = Math.abs(ball.VelocityY) * 0.5;
    }
    if (ball.PositionX < WallLeft + BallRadius) {
      ball.PositionX = WallLeft + BallRadius;
      ball.VelocityX = Math.abs(ball.VelocityX) * 0.6;
    }
    if (ball.PositionX > WallRight - BallRadius) {
      ball.PositionX = WallRight - BallRadius;
      ball.VelocityX = -Math.abs(ball.VelocityX) * 0.6;
    }
  }

  // 與線段導軌碰撞（找線段上離小鋼珠最近的點當成圓形障礙物）
  CollideWithRail(ball, rail) {
    const sx = rail.EndX - rail.StartX, sy = rail.EndY - rail.StartY;
    const lengthSquared = sx * sx + sy * sy;
    let projection = 0;
    if (lengthSquared > 0) projection = ((ball.PositionX - rail.StartX) * sx + (ball.PositionY - rail.StartY) * sy) / lengthSquared;
    projection = Math.max(0, Math.min(1, projection));
    const cx = rail.StartX + projection * sx;
    const cy = rail.StartY + projection * sy;
    const normalY = this.ResolveCircleCollision(ball, cx, cy, RailRadius, RailRestitution);
    if (normalY !== null && rail.IsRoof && normalY < -0.7 && Math.abs(ball.VelocityX) < 1) {
      ball.VelocityX += ball.PositionX >= 235 ? 0.6 : -0.6;
    }
  }

  // 小鋼珠與圓形障礙物的碰撞處理，有碰到回傳法線的Y分量，沒碰到回傳null
  ResolveCircleCollision(ball, ox, oy, obstacleRadius, restitution) {
    const minimumDistance = BallRadius + obstacleRadius;
    let dx = ball.PositionX - ox;
    let dy = ball.PositionY - oy;
    const distanceSquared = dx * dx + dy * dy;
    if (distanceSquared >= minimumDistance * minimumDistance) return null;
    let distance = Math.sqrt(distanceSquared);
    if (distance < 0.001) { dx = 0; dy = -1; distance = 1; }
    const nx = dx / distance;
    const ny = dy / distance;
    ball.PositionX = ox + nx * minimumDistance;
    ball.PositionY = oy + ny * minimumDistance;
    const dot = ball.VelocityX * nx + ball.VelocityY * ny;
    if (dot < 0) {
      ball.VelocityX -= (1 + restitution) * dot * nx;
      ball.VelocityY -= (1 + restitution) * dot * ny;
      ball.VelocityX += (Math.random() - 0.5) * 0.6;
    }
    return ny;
  }

  // 判斷小鋼珠是否進入各入賞口，進去時讓入賞口閃一下
  CheckTargets(ball) {
    const px = Math.trunc(ball.PositionX);
    const py = Math.trunc(ball.PositionY);
    const contains = (r) => px >= r.x && px < r.x + r.w && py >= r.y && py < r.y + r.h;
    let payout = 0;
    let kind = TargetKind.StartChucker;
    let flashKey = 'start';
    if (contains(StartChuckerRect)) {
      payout = this.engine.NotifyStartChuckerHit();
    } else if (this.engine.IsElectricChuckerOpen && contains(ElectricChuckerRect)) {
      payout = this.engine.NotifyElectricChuckerHit();
      kind = TargetKind.ElectricChucker;
      flashKey = 'electric';
    } else if (this.engine.IsAttackerOpen && contains(AttackerRect)) {
      payout = this.engine.NotifyAttackerHit();
      kind = TargetKind.Attacker;
      flashKey = 'attacker';
    }
    if (payout > 0) {
      ball.IsRemoved = true;
      this.flashFrames[flashKey] = 15;
      if (this.onTargetEntered) this.onTargetEntered(kind);
      if (this.onPayout) this.onPayout(payout);
    }
  }

  // 每一幀更新入賞閃光
  UpdateHitEffects() {
    for (const key of Object.keys(this.flashFrames)) {
      if (this.flashFrames[key] > 0) this.flashFrames[key]--;
    }
  }

  // 防卡珠：每半秒檢查一次，幾乎沒移動就推一把，連續多次沒用就當成回收
  CheckStall(ball) {
    ball.AgeFrames++;
    if (ball.Mode !== BallMode.Field || ball.AgeFrames % 30 !== 0) return;
    const mx = ball.PositionX - ball.LastCheckX;
    const my = ball.PositionY - ball.LastCheckY;
    if (Math.sqrt(mx * mx + my * my) < 4.0) {
      ball.VelocityX += (Math.random() - 0.5) * 5;
      ball.VelocityY -= 1.5;
      ball.StallCount++;
      if (ball.StallCount >= 4) ball.IsRemoved = true;
    }
    ball.LastCheckX = ball.PositionX;
    ball.LastCheckY = ball.PositionY;
  }
}
