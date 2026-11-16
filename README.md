# 花之慶次 風 小鋼珠（網頁版）

把桌面版（C# WinForms）完整移植成網頁，可以在 iPhone Safari 直接玩，加到主畫面後會像 App 一樣全螢幕。

模擬遊戲，不涉及真實金錢。

## 放上 GitHub Pages
1. 在 GitHub 建一個 repository，把這個資料夾裡的**所有檔案**（`index.html` 要在最上層）上傳。
2. Settings → Pages → Source 選 `Deploy from a branch`，Branch 選 `main` / `(root)`，儲存。
3. 幾分鐘後會得到 `https://你的帳號.github.io/repository名稱/`，用 iPhone Safari 開啟。
4. Safari 的分享按鈕 → 「加入主畫面」。

## 注意
- `music/` 裡的三首 BGM 是原曲，repository 若設為公開，任何人都能下載。不想公開請刪掉 `music/` 資料夾，遊戲沒有 BGM 也能玩（音效是程式合成的）。
- iPhone 要聽到聲音，請先關閉側邊的靜音開關。
- 第一次進入要按「開始遊戲」，這是 iOS 啟動音訊的必要步驟。

## 單機版同步的功能
- 液晶改成橢圓形，打到上方天釘的珠子會順著橢圓滾下來（導軌座標在 `js/layout.js` 最前面64筆）。
- 保留玉改放在轉動畫面下方，最左邊的大顆是目前變動中的保留。
- 通常時保留玉可能變色（白→青→綠→赤，最多兩次），變色時會閃爍；變動途中也可能有針降下來戳保留玉，戳中可能升格、也可能被彈開。
- 始動口兩側有擋牆，只有從上方開口掉進去的珠子才算入賞（距離在 `js/settings.js` 的 `StartChuckerWallOffset`）。

## 無珠模式
在畫面下方「遊戲模式」可以切換 有珠／無珠 1:1／無珠 1:2。無珠模式不發射珠子，自動運轉：
- **開分**：和投幣一樣，投入選擇的面額。
- **上保轉**：錢換成轉數，每次500円，1:1換6轉、1:2換12轉（5000円＝60轉／120轉）。
- **下保轉**：把剩下的轉數換回餘額（四捨五入）。
- **得分下移**：把大當り累積的得分（珠）換成餘額，1:1是1珠4円、1:2是1珠2円。
- **開始／暫停**：運轉中會自動補保留、自動變動；暫停就不會開始新的變動（電腦版空白鍵）。
- 通常時每補一個保留扣1轉保轉，RUSH中是免費轉。大當り每R 150珠，10R共1500珠、2R共300珠，機率和有珠一樣。
- 退卡：餘額、保轉換算金額、得分換算金額一起退還。切換模式前會先把持球、保轉、得分都結算成餘額，大當り中不能切換。
- 數值在 `js/settings.js` 的 `BalllessSpinsPer5000Yen1to1/1to2`、`BalllessYenPerBall1to1/1to2`、`BalllessScorePerJump`、`BalllessJumpsPerPause`、`BalllessPauseFrames`、`BalllessStepYen`，換算邏輯在 `js/ballless.js`。

## 調整數值
- `js/settings.js`：大當り機率、轉動時間、各種預告機率、賞球數等。
- `js/layout.js`：釘子與導軌座標（`Pegs`、`FunnelPegs`、`RailData`）。
- 命釘開口：`js/settings.js` 的 `LifeNailHalfGap`。
- 保留變化與針演出的機率：`js/settings.js` 的 `ReserveChangeProbability`、`NeedleProbabilityWithChange` 等。

## 檔案
```
index.html  style.css  manifest.webmanifest  icon-*.png
js/engine.js     抽選與狀態機
js/physics.js    彈珠物理與入賞判定
js/boardview.js  盤面繪製
js/screen.js     液晶畫面繪製
js/sound.js      音效合成與BGM
js/main.js       操作與遊戲迴圈
```


## 改版：e花之慶次～傾奇一轉 規格
這次把機率、流程、保留色、御免BONUS規則都換成和單機版一樣的新規格，詳細的設計決定（LT機率為何調降、傾奇者充能公式、SP Reach／プレミアム演出的簡化方式）請看單機版的 README.txt，網頁版完全比照同一套邏輯，數值在 `js/settings.js`、流程在 `js/engine.js`、畫面文字與保留球顏色在 `js/screen.js`。

無珠模式的跳分動畫也和單機版一樣修正過：每跳+15珠，間隔約1/3秒，跳5次後停1秒，整個R約4.3秒跳完（原本間隔太短看起來像直接跳到150）。盤面上的「無珠模式」字樣方框也拿掉了。
