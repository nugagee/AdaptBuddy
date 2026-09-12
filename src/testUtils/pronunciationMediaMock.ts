/** Synthetic browser devices only. No real microphone or audio playback. */
export function installPronunciationMediaMock() {
  const restores: Array<() => void> = [];
  const set = (target: object, name: string, value: unknown) => {
    const before = Object.getOwnPropertyDescriptor(target, name);
    Object.defineProperty(target, name, { configurable: true, writable: true, value });
    restores.push(() => { if (before) Object.defineProperty(target, name, before); else Reflect.deleteProperty(target, name); });
  };
  const config = { autoStart: true, autoStop: true, failRecorder: false, rejectPlay: false, mime: 'audio/webm;codecs=opus' };
  const track = { readyState: 'live', onended: null as (() => void) | null, stop: jest.fn() };
  track.stop.mockImplementation(() => { track.readyState = 'ended'; });
  const stream = { getTracks: () => [track], getAudioTracks: () => [track] };
  const getUserMedia = jest.fn().mockImplementation(async () => { track.readyState = 'live'; return stream; });
  class Recorder {
    static instances: Recorder[] = [];
    static isTypeSupported = jest.fn((type: string) => type === config.mime);
    state = 'inactive'; mimeType: string;
    onstart: (() => void) | null = null; onstop: (() => void) | null = null;
    onerror: (() => void) | null = null; ondataavailable: ((event: { data: Blob }) => void) | null = null;
    start = jest.fn(() => { this.state = 'recording'; if (config.autoStart) this.onstart?.(); });
    finish = (bytes = 10) => { this.state = 'inactive'; this.ondataavailable?.({ data: new Blob(['a'.repeat(bytes)], { type: this.mimeType }) }); this.onstop?.(); };
    stop = jest.fn(() => { this.state = 'inactive'; if (config.autoStop) this.finish(); });
    constructor(_stream: unknown, options?: { mimeType?: string }) {
      if (config.failRecorder) throw new Error('synthetic recorder failure');
      this.mimeType = options?.mimeType ?? 'audio/webm'; Recorder.instances.push(this);
    }
  }
  class Player {
    static instances: Player[] = [];
    onplaying: (() => void) | null = null; onended: (() => void) | null = null; onerror: (() => void) | null = null;
    play = jest.fn(() => config.rejectPlay ? Promise.reject(new Error('blocked')) : Promise.resolve()); pause = jest.fn(); load = jest.fn(); removeAttribute = jest.fn();
    constructor(public src: string) { Player.instances.push(this); }
  }
  class Recognition {
    static instances: Recognition[] = [];
    continuous = false; interimResults = false; lang = ''; maxAlternatives = 1;
    onaudiostart: (() => void) | null = null; onaudioend: (() => void) | null = null;
    onresult: ((event: any) => void) | null = null; onerror: ((event: { error?: string }) => void) | null = null;
    onend: (() => void) | null = null;
    start = jest.fn(); stop = jest.fn(); abort = jest.fn();
    constructor() { Recognition.instances.push(this); }
  }
  class Utterance {
    voice: unknown; lang = ''; rate = 1; pitch = 1;
    onstart: (() => void) | null = null; onend: (() => void) | null = null; onerror: (() => void) | null = null;
    constructor(public text: string) {}
  }
  const localVoice = { voiceURI: 'synthetic-local', name: 'Synthetic English', lang: 'en-GB', localService: true, default: true };
  const synth = { speaking: false, pending: false, paused: false, getVoices: jest.fn(() => [localVoice]), speak: jest.fn(), cancel: jest.fn(), addEventListener: jest.fn(), removeEventListener: jest.fn() };
  const createObjectURL = jest.fn(() => 'blob:synthetic-private-clip'); const revokeObjectURL = jest.fn();
  set(window, 'isSecureContext', true); set(document, 'hidden', false);
  set(navigator, 'mediaDevices', { getUserMedia }); set(window, 'MediaRecorder', Recorder); set(window, 'Audio', Player);
  set(window, 'SpeechRecognition', Recognition); set(window, 'webkitSpeechRecognition', undefined);
  set(window, 'speechSynthesis', synth); set(window, 'SpeechSynthesisUtterance', Utterance);
  set(URL, 'createObjectURL', createObjectURL); set(URL, 'revokeObjectURL', revokeObjectURL);
  return { config, track, stream, getUserMedia, Recorder, Player, Recognition, Utterance, synth, localVoice, createObjectURL, revokeObjectURL,
    recorder: () => Recorder.instances[Recorder.instances.length - 1], player: () => Player.instances[Player.instances.length - 1],
    recognition: () => Recognition.instances[Recognition.instances.length - 1], utterance: () => synth.speak.mock.calls[synth.speak.mock.calls.length - 1]?.[0] as Utterance,
    restore: () => restores.reverse().forEach(restore => restore()),
  };
}
