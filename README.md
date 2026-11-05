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

## 調整數值
- `js/settings.js`：大當り機率、轉動時間、各種預告機率、賞球數等。
- `js/layout.js`：釘子與導軌座標（`Pegs`、`FunnelPegs`、`RailData`）。
- 命釘開口：`js/settings.js` 的 `LifeNailHalfGap`。

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
