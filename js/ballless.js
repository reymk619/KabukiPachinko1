import { GameSettings } from './settings.js';

// 無珠模式的比例：1:1是1珠4円，1:2是1珠2円（同樣的錢，1:2可以轉的轉數是1:1的兩倍）
export const BalllessRatio = { OneToOne: 'OneToOne', OneToTwo: 'OneToTwo' };

// 無珠模式的帳務：保轉（還能轉幾次）與得分（大當り得到的珠數）。金額（餘額）由主程式保管
export class BalllessAccount {
  constructor() {
    this.Spins = 0;   // 保轉：已經用錢換成、還沒轉掉的轉數
    this.Score = 0;   // 得分：大當り累積的珠數，按「得分下移」才會換成餘額
    this.Ratio = BalllessRatio.OneToTwo;
  }
  get IsOneToOne() { return this.Ratio === BalllessRatio.OneToOne; }
  // 5000円可以換到幾轉
  get SpinsPer5000Yen() { return this.IsOneToOne ? GameSettings.BalllessSpinsPer5000Yen1to1 : GameSettings.BalllessSpinsPer5000Yen1to2; }
  // 得分每一珠換多少円
  get YenPerBall() { return this.IsOneToOne ? GameSettings.BalllessYenPerBall1to1 : GameSettings.BalllessYenPerBall1to2; }
  // 上保轉：一次花 BalllessStepYen 円可以換到幾轉
  get SpinsPerStep() { return Math.trunc(GameSettings.BalllessStepYen * this.SpinsPer5000Yen / 5000); }
  // 下保轉：轉數換回金額（四捨五入到整數円）
  SpinsToYen(spins) { return Math.round(spins * 5000 / this.SpinsPer5000Yen); }
  // 得分下移：得分（珠）換成金額
  ScoreToYen(score) { return score * this.YenPerBall; }
  get CostPerSpinYen() { return 5000 / this.SpinsPer5000Yen; }
  get RatioText() { return this.IsOneToOne ? '1:1（1珠4円）' : '1:2（1珠2円）'; }
}
