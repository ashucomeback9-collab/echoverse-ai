export type DetectedLang = "hi" | "en" | "hi-en";

export interface LangDetection {
  lang: DetectedLang;
  label: string;
  bcp47: string; // preferred speech lang code
}

/** Detect Hindi, English, or Hinglish from raw text. */
export function detectLanguage(text: string): LangDetection {
  const devanagari = (text.match(/[\u0900-\u097F]/g) || []).length;
  const latin = (text.match(/[A-Za-z]/g) || []).length;
  const total = devanagari + latin;

  if (total === 0) {
    return { lang: "en", label: "English", bcp47: "en-US" };
  }
  const devRatio = devanagari / total;
  if (devRatio > 0.6) return { lang: "hi", label: "Hindi", bcp47: "hi-IN" };
  if (devanagari > 0 && latin > 0) return { lang: "hi-en", label: "Hinglish", bcp47: "hi-IN" };
  return { lang: "en", label: "English", bcp47: "en-US" };
}

/** Pick the best browser voice for a detected language, with fallback. */
export function pickVoiceForLang(
  voices: SpeechSynthesisVoice[],
  detection: LangDetection,
): SpeechSynthesisVoice | null {
  if (!voices.length) return null;
  const want = detection.bcp47.toLowerCase();
  const wantPrefix = want.split("-")[0];

  // Exact match
  let v = voices.find((x) => x.lang.toLowerCase() === want);
  if (v) return v;
  // Prefix match (hi-*, en-*)
  v = voices.find((x) => x.lang.toLowerCase().startsWith(wantPrefix + "-") || x.lang.toLowerCase() === wantPrefix);
  if (v) return v;
  // Fallback to English
  v = voices.find((x) => x.lang.toLowerCase().startsWith("en"));
  if (v) return v;
  // Last resort: anything
  return voices[0];
}
