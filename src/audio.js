export function playDigit(number, enabled = true) {
  if (!enabled || typeof globalThis.speechSynthesis === 'undefined' || typeof globalThis.SpeechSynthesisUtterance === 'undefined') return false;
  try {
    globalThis.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(String(number));
    utterance.rate = 1.15;
    utterance.pitch = 1;
    utterance.volume = 0.95;
    globalThis.speechSynthesis.speak(utterance);
    return true;
  } catch {
    return false;
  }
}
