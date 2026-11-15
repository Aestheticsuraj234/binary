import {
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  useAudioRecorder,
} from 'expo-audio';
import {File} from 'expo-file-system';
import {useState} from 'react';
import {Platform} from 'react-native';

import {apiFetch} from '@/lib/api';

export type VoiceState = 'idle' | 'recording' | 'transcribing';

/** The recording as a form field: a file on a phone, a blob in a browser. */
async function recordingPart(uri: string): Promise<Blob> {
  if (Platform.OS === 'web') {
    return (await fetch(uri)).blob();
  }
  return new File(uri);
}

/**
 * Voice input: tap to record, tap again to stop. The recording goes to the
 * API, which turns it into text with the user's OpenAI key; the text then
 * lands in the message box to check before sending.
 */
export function useVoiceInput(onText: (text: string) => void) {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const [state, setState] = useState<VoiceState>('idle');
  const [error, setError] = useState('');

  async function start() {
    setError('');
    const permission = await AudioModule.requestRecordingPermissionsAsync();
    if (!permission.granted) {
      setError('Allow the microphone in Settings to talk to your crew.');
      return;
    }
    // iOS records only in a recording session, and stays silent otherwise.
    await setAudioModeAsync({allowsRecording: true, playsInSilentMode: true});
    await recorder.prepareToRecordAsync();
    recorder.record();
    setState('recording');
  }

  async function stop() {
    await recorder.stop();
    await setAudioModeAsync({allowsRecording: false});
    const uri = recorder.uri;
    if (!uri) {
      setState('idle');
      setError('Nothing was recorded. Try again.');
      return;
    }
    setState('transcribing');
    const form = new FormData();
    form.append('audio', await recordingPart(uri), 'recording.m4a');
    const response = await apiFetch('/api/transcribe', {
      method: 'POST',
      body: form,
    }).catch(() => null);
    const body: {text?: string; error?: string} | null = response
      ? await response.json().catch(() => null)
      : null;
    setState('idle');
    if (!response?.ok || !body?.text) {
      setError(body?.error ?? 'Could not reach the API.');
      return;
    }
    onText(body.text);
  }

  async function toggle() {
    try {
      await (state === 'recording' ? stop() : start());
    } catch {
      setState('idle');
      setError('The microphone is not available.');
    }
  }

  return {state, error, toggle};
}
