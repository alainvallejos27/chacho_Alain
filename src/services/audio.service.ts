export class AudioService {
  private audioContext: AudioContext | null = null;

  private getAudioContext(): AudioContext | null {
    if (this.audioContext) return this.audioContext;
    const AudioContextConstructor = window.AudioContext ||
      (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextConstructor) return null;
    this.audioContext = new AudioContextConstructor();
    return this.audioContext;
  }

  playDiceSound(isEnabled: () => boolean): void {
    const context = this.getAudioContext();
    if (!context || !isEnabled()) return;
    void context.resume();
    const buffer = context.createBuffer(1, context.sampleRate * 0.16, context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      const decay = 1 - i / data.length;
      data[i] = (Math.random() * 2 - 1) * decay * decay;
    }
    const noise = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const gain = context.createGain();
    noise.buffer = buffer;
    filter.type = 'bandpass';
    filter.frequency.value = 1450;
    filter.Q.value = 0.8;
    gain.gain.setValueAtTime(0.0001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.24, context.currentTime + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.16);
    noise.connect(filter).connect(gain).connect(context.destination);
    noise.start();

    [0, 85, 155].forEach((delay, index) => {
      window.setTimeout(() => {
        if (!isEnabled()) return;
        const click = context.createOscillator();
        const clickGain = context.createGain();
        click.type = 'triangle';
        click.frequency.value = 680 + index * 115;
        clickGain.gain.setValueAtTime(0.0001, context.currentTime);
        clickGain.gain.exponentialRampToValueAtTime(0.12, context.currentTime + 0.005);
        clickGain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.075);
        click.connect(clickGain).connect(context.destination);
        click.start();
        click.stop(context.currentTime + 0.08);
      }, delay);
    });
  }
}
