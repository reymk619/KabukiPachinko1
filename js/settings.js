// 遊戲參數集中管理，要調機率或賞球只需要改這裡
export const GameSettings = {
  // 通常時大當り機率 1/205.4（e花之慶次～傾奇一轉規格）
  NormalHitProbability: 1.0 / 319.6,
  // 戰モード、大戰モード、傾奇BURST中的大當り機率 1/62.4
  RushHitProbability: 1.0 / 62.4,
  // 傾奇BURST的轉數（ST 120轉）
  BurstSpinCount: 120,
  // 戰モード每轉的轉落機率，約1/131（連莊率約70%）
  SenDropProbability: 1.0 / 131.0,
  // 大戰モード每轉的轉落機率，約1/223（連莊率約80%）
  DaiSenDropProbability: 1.0 / 223.0,
  // 通常時大當り後的3方向分岐：傾奇BURST突入17.6%／戰モード突入55.9%／時短無26.5%
  // 只有這裡抽中的才會是七七七（最大的傾奇御免BONUS）；其餘都只是普通的御免BONUS
  BurstEntryProbability: 0.176,
  // 沒有直接進BURST時，分到戰モード的比例（55.9 / (55.9+26.5)）
  SenEntryProbability: 0.559 / (0.559 + 0.265),
  // LT（Lucky Trigger）：通常時每轉會額外、獨立地抽一次，和上面的大當判定無關
  // 觸發的話不管原本中獎與否都直接確定大當，並且保證走最強的傾奇BURST路線
  // 資料頁寫LT是1/787.4，但這個數字直接套用，算出來傾奇BURST的總體比例會被拉到約35%，
  // 跟同一頁寫的「17.6%突入BURST」對不起來（1/787.4比17.6%那個分支本身的機率還高，數學上兜不起來）
  // 所以這裡故意調低，讓LT維持「稀有驚喜」的感覺，又不會把BURST總比例拉太高（約20%上下）
  NormalLuckyTriggerProbability: 1.0 / 5000.0,
  // 戰モード或大戰モード大當り時，傾奇者充能決定直接升格傾奇BURST的機率：充能越高機率越高，充滿保證升格
  // 官方資料沒有給實際公式，這是我自己設計的曲線
  KabukiChargeBaseProbability: 0.05,
  KabukiChargeMaxProbability: 0.20,
  KabukiChargeMax: 100,
  KabukiChargeGainMin: 15,
  KabukiChargeGainMax: 25,
  // 戰モード大當り後突破到大戰モード的機率
  DaiSenBreakProbability: 0.70,
  // 七七七中獎時，直接停七七七的比例，其餘會先停別的數字再突然轉成七七七
  BurstDirectDisplayProbability: 0.60,
  // 非七七七中獎時，出現「看有沒有換」但沒換成功的機率
  FakeFlipProbability: 0.25,
  // 戰モード等狀態中，沒中獎但城門到達（城門沒被突破）的機率
  GateReachOnMiss: 0.30,
  // 戰モード城門到達失敗後按下按鈕，成功復活到大戰モード的機率
  GateRescueProbability: 0.30,
  // 通常時リーチ中出現Push演出的機率
  ChanceUpPushProbability: 0.40,
  // Push後出現激アツ的機率（中獎時與沒中獎時）
  ChanceUpHotOnHit: 0.85,
  ChanceUpHotOnMiss: 0.20,
  // プレミアム演出（最強信號）：出現時一定是真的，機率很小、只在對應結果已經確定時才會抽出來顯示
  PremiumScreenBlackoutProbability: 0.12,
  PremiumRainbowLogoProbability: 0.05,
  PremiumMatsukazeProbability: 0.15,
  PremiumKiseruMaxProbability: 0.12,
  // SP Reach／角色Reach（通常時リーチ中顯示的演出名稱），信賴度抓自資料頁
  // 中獎時各演出出現的比例是我自己配的，沒中獎時的出現率由信賴度反推
  ReachKindNames: ['煙管（キセル）演出', '前田慶次專用Reach', '盃（さかずき）Reach', '廻天激三重Reach', '直江兼續Reach', '奧村助右衛門Reach', '松風（愛馬）Reach', '四井主水Reach'],
  ReachKindReliabilities: [0.85, 0.82, 0.81, 0.68, 0.65, 0.50, 0.45, 0.40],
  ReachKindHitWeights: [0.06, 0.05, 0.05, 0.07, 0.08, 0.10, 0.12, 0.15],
  // 強期待度電子音預告：中獎時出現的機率，以及出現後的目標期待度
  // 保留變化（通常時）：保留玉在輪到之前，移動到第3、第2個位置時可能升格顏色（白→青→綠→赤），最多變化兩次
  // 變化的保留最後停在抽中的顏色，所以顏色的期待度不受影響
  ReserveChangeProbability: 0.60,
  ReserveDoubleChangeProbability: 0.35,
  ReserveFlashFrames: 90,
  // 針演出（通常時）：從上方降下一根針戳保留玉，戳中有機會升格顏色，也可能被彈開
  // 有保留還能升格時每一轉出現針的機率；沒有的話針出現了也一定會被彈開，所以機率很低
  NeedleProbabilityWithChange: 0.50,
  NeedleProbabilityWithoutChange: 0.004,
  NeedleTargetUpgradableProbability: 0.85,
  NeedleSuccessProbability: 0.70,
  NeedleDescendFrames: 30,
  NeedleResultFrames: 45,
  // 始動口兩側擋牆離入口邊緣的距離（0到7.5之間，越小越貼近入口、可通過的寬度越窄）
  StartChuckerWallOffset: 4.5,
  // 無珠模式：5000円可以換到的轉數（1:1是60轉，1:2是120轉，其他金額依比例計算）
  BalllessSpinsPer5000Yen1to1: 60,
  BalllessSpinsPer5000Yen1to2: 120,
  // 無珠模式：得分（珠數）換成金額時，每一珠的價值（1:1是4円，1:2是2円）
  BalllessYenPerBall1to1: 4,
  BalllessYenPerBall1to2: 2,
  // 無珠模式的得分珠：每「跳」一次+15珠，一個R共跳10次＝150珠（10R共1500珠、2R共300珠）
  // 跳5次後停1秒再繼續跳，跟官方「大入賞口10カウント」的節奏對齊
  BalllessScorePerJump: 15,
  BalllessJumpsPerPause: 5,
  BalllessPauseFrames: 60,
  // 上保轉每按一次花的金額
  BalllessStepYen: 500,
  // 無珠模式：自動補一個保留的間隔幀數、大當り中每R自動入賞的速度、R與R之間的間隔
  BalllessFeedIntervalFrames: 20,
  BalllessFillFrames: 20,
  BalllessThemeChoiceFillFrames: 24,
  BalllessRoundIntervalFrames: 30,
  // RUSH中的轉要不要消耗保轉（預設不消耗：RUSH中的轉是免費的）
  BalllessRushConsumesSpins: false,
  StrongOmenOnHit: 0.35,
  StrongOmenReliability: 0.75,
  // 一騎驅Mode：戰モード、大戰モード轉落時出現「敵軍急襲」連打演出，連打成功（進度條跳滿）就拉回城門突破
  DropRescueProbability: 0.30,
  // 連打演出的時間（幀），結束後再停留的結果顯示時間
  DropMashWindowFrames: 240,
  DropMashAfterFrames: 60,
  // 每按一下進度條增加的比例、每幀自然下降的比例、沒救回時進度條最多到的比例
  MashPressProgress: 0.045,
  MashDecayPerFrame: 0.0015,
  MashProgressCap: 0.90,
  // 救回時，進度條在連打第幾下跳滿：最少幾下，再隨機多加 0~8 下
  MashMinPressesForJump: 6,
  // 按住PUSH時，自動連打的間隔幀數（6幀約每秒10下）
  MashHoldIntervalFrames: 6,
  // 各狀態下10R大當り的比例：通常時起家的大當一律2R，RUSH（戰／大戰／傾奇BURST）起家的一律10R
  RoundTenProbabilityNormal: 0.0,
  RoundTenProbabilitySen: 1.0,
  RoundTenProbabilityDaiSen: 1.0,
  RoundTenProbabilityBurst: 1.0,
  // 未中獎時的リーチ機率與中獎時有リーチ的機率
  ReachProbabilityOnMiss: 0.22,
  ReachProbabilityOnHit: 0.9,
  // 保留玉期待度，順序：青(7%)、綠(18%)、赤(50%)、金(80%)、虹(確定)、傾奇者保留(特殊,約88%)
  ReserveColorReliabilities: [0.07, 0.18, 0.50, 0.80, 1.0, 0.88],
  // 中獎時各顏色出現的比例（剩下的是白色）
  ReserveColorHitWeights: [0.22, 0.20, 0.15, 0.06, 0.015, 0.025],
  // 保留上限
  ReserveMaximum: 4,
  // 賞球數
  PayoutReserveFull: 1,
  PayoutStartChucker: 3,
  PayoutElectricChucker: 6,
  PayoutAttacker: 15,
  // 大入賞口一個R的最大入賞數（10カウント）與逾時幀數
  AttackerMaximumCount: 10,
  AttackerTimeoutFrames: 1200,
  // 轉動時間倍率：1.0=標準，數字越小轉越快（只影響轉動與停止的時間）
  SpinTimeScale: 1.0,
  Scaled(frames) {
    return Math.max(1, Math.round(frames * GameSettings.SpinTimeScale));
  },
  // 中図柄再回轉預告（通常時）
  FreeSpinOmenOnHit: 0.10,
  FreeSpinOmenHitMultiplier: 1.5,
  FreeSpinDoubleOnHit: 0.03,
  FreeSpinDoubleHitMultiplier: 4.0,
  FreeSpinPushWindowFrames: 150,
  FreeSpinFlowerFrames: 60,
  FreeSpinSpinFrames: 70,
  FreeSpinStopFrames: 40,
  // 各階段幀數（約60幀為1秒）
  NormalSpinFrames: 70,
  NormalReachExtraFrames: 300,
  RushQuickSpinFrames: 60,
  RushSpinFrames: 80,
  ResultStopFrames: 60,
  FlipResultStopFrames: 180,
  FlipEventFrame: 70,
  RescueResultStopFrames: 240,
  GateRescueWindowFrames: 200,
  PushPromptFrames: 150,
  HitOpeningFrames: 150,
  RoundIntervalFrames: 60,
  // 發射間隔幀數（36幀約等於每分鐘100顆）
  LaunchIntervalFrames: 28,
  // 借球：500円借125顆，換金：1顆4円
  RentCostYen: 500,
  RentBallCount: 125,
  YenPerBall: 4,
  // 圖柄種類數（數字1到8），七對應的索引為6
  FigureKindCount: 8,
  SevenFigureIndex: 6,
  // 命釘（始動口上方兩根釘）的半開口，數字越小越難進
  LifeNailHalfGap: 9,
  // 液晶螢幕在盤面上的位置
  ScreenRectangle: { x: 70, y: 80, w: 330, h: 200 },
};
