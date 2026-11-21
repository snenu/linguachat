"use client";

/**
 * Records microphone audio and returns a 16 kHz mono WAV file. WAV plays in every browser and
 * is accepted by Gemini for transcription (WebM/Opus is not reliably supported there).
 */
export class VoiceRecorder {
  private stream: MediaStream | null = null;
  private recorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private startedAt = 0;

  static supported() {
    return typeof window !== "undefined" && !!navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== "undefined";
  }

  async start() {
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true } });
    this.chunks = [];
    this.recorder = new MediaRecorder(this.stream);
    this.recorder.ondataavailable = (e) => e.data.size && this.chunks.push(e.data);
    this.recorder.start(250);
    this.startedAt = Date.now();
  }

  elapsed() {
    return this.startedAt ? (Date.now() - this.startedAt) / 1000 : 0;
  }

  cancel() {
    this.recorder?.stop();
    this.cleanup();
  }

  async stop(): Promise<{ file: File; duration: number }> {
    const recorder = this.recorder;
    if (!recorder) throw new Error("Not recording");
    const done = new Promise<void>((resolve) => (recorder.onstop = () => resolve()));
    recorder.stop();
    await done;
    const blob = new Blob(this.chunks, { type: recorder.mimeType || "audio/webm" });
    this.cleanup();
    const wav = await toWav(blob);
    return { file: new File([wav.blob], `voice-${Date.now()}.wav`, { type: "audio/wav" }), duration: wav.duration };
  }

  private cleanup() {
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
    this.recorder = null;
  }
}

async function toWav(input: Blob): Promise<{ blob: Blob; duration: number }> {
  const ctx = new AudioContext();
  const decoded = await ctx.decodeAudioData(await input.arrayBuffer());
  await ctx.close();
  const rate = 16000;
  const offline = new OfflineAudioContext(1, Math.max(1, Math.ceil(decoded.duration * rate)), rate);
  const src = offline.createBufferSource();
  src.buffer = decoded;
  src.connect(offline.destination);
  src.start();
  const rendered = await offline.startRendering();
  const samples = rendered.getChannelData(0);
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  const write = (o: number, s: string) => [...s].forEach((c, i) => view.setUint8(o + i, c.charCodeAt(0)));
  write(0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  write(8, "WAVE");
  write(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, rate, true);
  view.setUint32(28, rate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  write(36, "data");
  view.setUint32(40, samples.length * 2, true);
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return { blob: new Blob([buffer], { type: "audio/wav" }), duration: decoded.duration };
}
