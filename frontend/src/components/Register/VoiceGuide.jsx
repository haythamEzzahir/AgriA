import { useEffect, useCallback } from 'react';

const voices = {
  'ar-MA': 'Google Google Arabic',
  'fr-FR': 'Google Google Français',
  'en-US': 'Google US English',
};

export function useVoiceGuide(lang = 'ar-MA') {
  const speak = useCallback((text) => {
    if (!('speechSynthesis' in window)) return;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);

    const langMap = {
      'ar-MA': 'ar-SA', 'fr-FR': 'fr-FR', 'en-US': 'en-US',
    };
    utterance.lang = langMap[lang] || 'ar-SA';
    utterance.rate = 0.85;
    utterance.pitch = 1.1;
    utterance.volume = 1;

    const voices = window.speechSynthesis.getVoices();
    const match = voices.find((v) => v.lang.startsWith(lang.split('-')[0]));
    if (match) utterance.voice = match;

    window.speechSynthesis.speak(utterance);
  }, [lang]);

  const stop = useCallback(() => {
    window.speechSynthesis.cancel();
  }, []);

  useEffect(() => {
    return () => window.speechSynthesis.cancel();
  }, []);

  return { speak, stop };
}
