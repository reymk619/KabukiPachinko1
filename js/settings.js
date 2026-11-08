// 遊戲參數集中管理，要調機率或賞球只需要改這裡
export const GameSettings = {
  // 通常時大當り機率 1/399.9
  NormalHitProbability: 1.0 / 399.9,
  // 戰モード、大戰モード、傾奇BURST中的大當り機率（參考傾奇一転 RUSH中 1/62.36）
  RushHitProbability: 1.0 / 62.36,
  // 傾奇BURST的轉數（119轉）
  BurstSpinCount: 119,
  // 戰モード每轉的轉落機率，約1/131（連莊率約70%）
  SenDropProbability: 1.0 / 131.0,
  // 大戰モード每轉的轉落機率，約1/223（連莊率約80%）
  DaiSenDropProbability: 1.0 / 223.0,
  // 通常時初當り中，直接走傾奇御免BONUS（七七七）進傾奇BURST的機率
  BurstEntryProbability: 0.20,
  // 戰モード或大戰モード大當り時，昇格七七七進傾奇BURST的機率
  BurstFromRushProbability: 0.08,
  // 通常時初當り非七七七時，進戰モード的機率
  SenEntryProbability: 0.66,
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
  // 各狀態下10R大當り的比例
  RoundTenProbabilityNormal: 0.5,
  RoundTenProbabilitySen: 0.8,
  RoundTenProbabilityDaiSen: 0.9,
  RoundTenProbabilityBurst: 1.0,
  // 未中獎時的リーチ機率與中獎時有リーチ的機率
  ReachProbabilityOnMiss: 0.22,
  ReachProbabilityOnHit: 0.9,
  // 保留玉期待度，順序：青、綠、赤、金(慶次)、虎柄、天激珠(弱)、天激珠(強)、松風
  ReserveColorReliabilities: [0.004, 0.086, 0.539, 0.842, 1.0, 0.052, 0.583, 0.112],
  // 中獎時各顏色出現的比例（剩下的是白色）
  ReserveColorHitWeights: [0.15, 0.20, 0.18, 0.08, 0.02, 0.05, 0.05, 0.07],
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
  NormalSpinFrames: 300,
  NormalReachExtraFrames: 240,
  RushQuickSpinFrames: 80,
  RushSpinFrames: 130,
  ResultStopFrames: 60,
  FlipResultStopFrames: 180,
  FlipEventFrame: 70,
  RescueResultStopFrames: 240,
  GateRescueWindowFrames: 200,
  PushPromptFrames: 150,
  HitOpeningFrames: 150,
  RoundIntervalFrames: 60,
  // 發射間隔幀數（36幀約等於每分鐘100顆）
  LaunchIntervalFrames: 36,
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
