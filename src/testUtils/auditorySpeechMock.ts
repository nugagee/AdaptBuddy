/** Synthetic device speech only; this fixture never emits sound or accesses a microphone. */
export const LOCAL_TEST_VOICE: SpeechSynthesisVoice = {
  default: true, lang: 'en-GB', localService: true, name: 'Synthetic local English', voiceURI: 'test-local-en',
};

class TestUtterance extends EventTarget {
  text: string;
  voice: SpeechSynthesisVoice | null = null;
  lang = ''; rate = 1; pitch = 1; volume = 1;
  onstart: ((event: unknown) => void) | null = null;
  onend: ((event: unknown) => void) | null = null;
  onerror: ((event: unknown) => void) | null = null;
  constructor(text: string) { super(); this.text = text; }
}

export function installAuditorySpeechMock(voices: SpeechSynthesisVoice[] = [LOCAL_TEST_VOICE]) {
  const oldSynth = Object.getOwnPropertyDescriptor(window, 'speechSynthesis');
  const oldUtterance = Object.getOwnPropertyDescriptor(window, 'SpeechSynthesisUtterance');
  const synth = Object.assign(new EventTarget(), {
    getVoices: jest.fn<SpeechSynthesisVoice[], []>().mockReturnValue(voices),
    speak: jest.fn<void, [SpeechSynthesisUtterance]>(),
    cancel: jest.fn<void, []>(),
    speaking: false, pending: false, paused: false,
  });
  Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: synth });
  Object.defineProperty(window, 'SpeechSynthesisUtterance', { configurable: true, value: TestUtterance });
  return {
    synth,
    utterance: (index = synth.speak.mock.calls.length - 1) => synth.speak.mock.calls[index][0],
    restore: () => {
      if (oldSynth) Object.defineProperty(window, 'speechSynthesis', oldSynth); else Reflect.deleteProperty(window, 'speechSynthesis');
      if (oldUtterance) Object.defineProperty(window, 'SpeechSynthesisUtterance', oldUtterance); else Reflect.deleteProperty(window, 'SpeechSynthesisUtterance');
    },
  };
}

export function emitSpeechEvent(utterance: SpeechSynthesisUtterance, type: 'onstart' | 'onend' | 'onerror') {
  const callback = utterance[type] as ((event: unknown) => void) | null;
  callback?.call(utterance, {});
}
