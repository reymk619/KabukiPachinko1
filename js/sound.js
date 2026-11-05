// 音效：不需要外部檔案，直接用程式合成簡單的電子音；BGM 用 <audio> 循環播放
export const SoundKind = {
  StartIn: 'StartIn', ElectricIn: 'ElectricIn', AttackerIn: 'AttackerIn', Reach: 'Reach', Push: 'Push', HitFanfare: 'HitFanfare',
  SevenFlip: 'SevenFlip', GateBreak: 'GateBreak', ModeUp: 'ModeUp', StrongOmen: 'StrongOmen', Mash: 'Mash',
  FreeSpinOmen: 'FreeSpinOmen', FreeSpinStop: 'FreeSpinStop',
};

const SampleRate = 22050;
const tone = (start, end, ms, vol) => ({ start, end, ms, vol, noise: false });
const noise = (ms, vol) => ({ start: 0, end: 0, ms, vol, noise: true });

const Definitions = {
  [SoundKind.StartIn]: [tone(988, 988, 70, 0.35)],
  [SoundKind.ElectricIn]: [tone(1319, 1319, 60, 0.3)],
  [SoundKind.AttackerIn]: [tone(1568, 1568, 35, 0.25)],
  [SoundKind.Reach]: [tone(660, 660, 90, 0.4), tone(880, 880, 140, 0.4)],
  [SoundKind.Push]: [tone(900, 1500, 120, 0.45)],
  [SoundKind.HitFanfare]: [tone(523, 523, 90, 0.45), tone(659, 659, 90, 0.45), tone(784, 784, 90, 0.45), tone(1047, 1047, 90, 0.45), tone(1319, 1319, 350, 0.45)],
  [SoundKind.SevenFlip]: [tone(300, 1800, 350, 0.5), tone(1568, 1568, 120, 0.5), tone(2093, 2093, 300, 0.5)],
  [SoundKind.GateBreak]: [noise(180, 0.6), tone(220, 80, 250, 0.5)],
  // 強期待度電子音預告：四聲往上爬的急促電子音，最後拉長
  [SoundKind.StrongOmen]: [tone(1568, 1568, 70, 0.45), tone(0, 0, 40, 0), tone(1760, 1760, 70, 0.45), tone(0, 0, 40, 0), tone(1976, 1976, 70, 0.45), tone(0, 0, 40, 0), tone(2349, 2349, 260, 0.5)],
  // 花的預告：柔和的三聲上行鈴音；再回轉每次停止的短音
  [SoundKind.FreeSpinOmen]: [tone(988, 988, 110, 0.35), tone(1319, 1319, 110, 0.35), tone(1568, 1568, 300, 0.4)],
  [SoundKind.FreeSpinStop]: [tone(660, 520, 130, 0.3)],
  // 連打時每按一下的短音
  [SoundKind.Mash]: [tone(1200, 1500, 45, 0.3)],
  [SoundKind.ModeUp]: [tone(784, 784, 100, 0.45), tone(988, 988, 100, 0.45), tone(1175, 1175, 100, 0.45), tone(1568, 1568, 300, 0.45)],
};

export class SoundEffects {
  constructor() {
    this.IsEnabled = true;
    this.ctx = null;
    this.buffers = {};
    this.masterGain = null;
  }

  // iOS 必須在使用者點擊後才能啟動音訊，所以要在第一次點擊時呼叫
  Unlock() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.connect(this.ctx.destination);
      for (const kind of Object.keys(Definitions)) this.buffers[kind] = this.BuildBuffer(Definitions[kind]);
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }

  get Context() { return this.ctx; }

  // 把音符合成成音訊緩衝（和桌面版同一套波形）
  BuildBuffer(steps) {
    const total = steps.reduce((sum, s) => sum + Math.floor(SampleRate * s.ms / 1000), 0);
    const buffer = this.ctx.createBuffer(1, Math.max(1, total), SampleRate);
    const data = buffer.getChannelData(0);
    let offset = 0;
    for (const step of steps) {
      const count = Math.floor(SampleRate * step.ms / 1000);
      let phase = 0;
      for (let i = 0; i < count; i++) {
        const progress = i / count;
        const envelope = Math.min(1.0, i / (SampleRate * 0.004)) * (1.0 - progress);
        let value;
        if (step.noise) {
          value = (Math.random() * 2 - 1) * step.vol * envelope;
        } else {
          const frequency = step.start + (step.end - step.start) * progress;
          phase += 2 * Math.PI * frequency / SampleRate;
          value = Math.sin(phase) * step.vol * envelope;
        }
        data[offset + i] = value;
      }
      offset += count;
    }
    return buffer;
  }

  // 播放音效，播放失敗時不影響遊戲
  Play(kind) {
    if (!this.IsEnabled || !this.ctx || !this.buffers[kind]) return;
    try {
      const source = this.ctx.createBufferSource();
      source.buffer = this.buffers[kind];
      source.connect(this.masterGain);
      source.start();
    } catch (e) { /* 忽略 */ }
  }
}

// 背景音樂：指定現在應該播放的檔案，傳 null 代表停止；檔案相同時不會重新播放
// iOS 要求播放必須由使用者點擊觸發，所以用「同一個 <audio>」在第一次點擊時先解鎖，之後只換檔案
const SilentWav = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAESsAABErAAABAAgAZGF0YQAAAAA=';

export class BackgroundMusicPlayer {
  constructor(soundEffects) {
    this.sound = soundEffects;
    this.isEnabled = true;
    this.volumePercent = 60;
    this.currentPath = null;
    this.audio = null;
    this.gainNode = null;
  }

  // 必須在使用者點擊的事件裡呼叫（在 SoundEffects.Unlock 之後）
  Init() {
    if (this.audio || !this.sound.Context) return;
    const audio = new Audio();
    audio.loop = true;
    audio.preload = 'auto';
    audio.setAttribute('playsinline', '');
    this.audio = audio;
    try {
      // iOS 的 <audio> 不能直接調音量，所以接到 WebAudio 的 GainNode 控制
      const ctx = this.sound.Context;
      const source = ctx.createMediaElementSource(audio);
      this.gainNode = ctx.createGain();
      source.connect(this.gainNode);
      this.gainNode.connect(ctx.destination);
    } catch (e) {
      this.gainNode = null;
    }
    this.ApplyVolume();
    audio.src = SilentWav;
    const p = audio.play();
    if (p && p.catch) p.catch(() => {});
  }

  SetVolumePercent(v) {
    this.volumePercent = v;
    this.ApplyVolume();
  }

  SetEnabled(v) {
    this.isEnabled = v;
    if (!v) this.SetTrack(null);
  }

  ApplyVolume() {
    const v = this.volumePercent / 100;
    if (this.gainNode) this.gainNode.gain.value = v;
    else if (this.audio) this.audio.volume = v;
  }

  SetTrack(path) {
    if (!this.isEnabled) path = null;
    if (path === this.currentPath) return;
    this.currentPath = path;
    if (!this.audio) return;
    if (path === null) {
      try { this.audio.pause(); } catch (e) { /* 忽略 */ }
      return;
    }
    this.audio.src = path;
    this.audio.loop = true;
    this.ApplyVolume();
    const p = this.audio.play();
    if (p && p.catch) p.catch(() => { /* 沒有BGM檔案或被瀏覽器擋下時，安靜略過 */ });
  }
}
