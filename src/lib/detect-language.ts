export type DetectedLang = "hi" | "en" | "hi-en";

export interface LangDetection {
  lang: DetectedLang;
  label: string;
  bcp47: string; // preferred speech lang code
}

/** Detect Hindi, English, or Hinglish from raw text. */
export function detectLanguage(text: string): LangDetection {
  const safe = typeof text === "string" ? text : "";
  const devanagari = (safe.match(/[\u0900-\u097F]/g) || []).length;
  const latin = (safe.match(/[A-Za-z]/g) || []).length;
  const total = devanagari + latin;

  if (total === 0) {
    return { lang: "en", label: "English", bcp47: "en-US" };
  }
  const devRatio = devanagari / total;
  if (devRatio > 0.6) return { lang: "hi", label: "Hindi", bcp47: "hi-IN" };
  if (devanagari > 0 && latin > 0) return { lang: "hi-en", label: "Hinglish", bcp47: "hi-IN" };
  return { lang: "en", label: "English", bcp47: "en-US" };
}

export type VoiceGender = "auto" | "male" | "female";

/** Pick the best browser voice for a detected language, with fallback. */
export function pickVoiceForLang(
  voices: SpeechSynthesisVoice[],
  detection: LangDetection,
  gender: VoiceGender = "auto",
): SpeechSynthesisVoice | null {
  if (!voices || !voices.length) return null;
  const want = (detection?.bcp47 ?? "en-US").toLowerCase();
  const wantPrefix = want.split("-")[0] ?? "en";

  // Score voices: language match + quality signals (Google/Natural/Neural/Premium).
  const qualityScore = (v: SpeechSynthesisVoice) => {
    const n = `${v?.name ?? ""} ${v?.voiceURI ?? ""}`.toLowerCase();
    let s = 0;
    if (/google/.test(n)) s += 6;
    if (/natural|neural|wavenet|premium|enhanced|online/.test(n)) s += 5;
    if (/microsoft/.test(n)) s += 2;
    if (/novelty|whisper|bells|cellos|organ|trinoids|zarvox/.test(n)) s -= 10;
    return s;
  };
  const langScore = (v: SpeechSynthesisVoice) => {
    const l = (v?.lang ?? "").toLowerCase();
    if (l === want) return 10;
    if (l.startsWith(wantPrefix + "-") || l === wantPrefix) return 7;
    if (l.startsWith("en")) return 2;
    return 0;
  };
  // Heuristic gender scoring based on voice name keywords.
  // Common male voice tokens across Google/Microsoft/Apple TTS engines.
  const MALE_RE =
    /\b(male|man|guy)\b|onyx|david|mark|guy|george|ryan|tony|alex|daniel|fred|james|john|matthew|brian|kevin|paul|aaron|adam|liam|noah|oliver|ethan|lucas|mason|logan|jacob|michael|william|benjamin|elijah|alexander|prabhat|hemant|madhur|ravi/;
  const FEMALE_RE =
    /\b(female|woman|girl)\b|nova|shimmer|samantha|victoria|karen|moira|tessa|fiona|susan|allison|ava|kate|serena|zira|hazel|heera|kalpana|swara|aria|jenny|sara|emma|olivia|sophia|isabella|mia|amelia|harper|evelyn|chloe|ella|grace|lily|zoe|priya|neerja|raveena/;
  const genderScore = (v: SpeechSynthesisVoice) => {
    if (gender === "auto") return 0;
    const n = `${v?.name ?? ""} ${v?.voiceURI ?? ""}`.toLowerCase();
    const isMale = MALE_RE.test(n);
    const isFemale = FEMALE_RE.test(n);
    if (gender === "male") {
      if (isMale) return 12;
      if (isFemale) return -20; // strongly avoid female voices for male output
      return 0;
    }
    if (gender === "female") {
      if (isFemale) return 12;
      if (isMale) return -20;
      return 0;
    }
    return 0;
  };
  let best: SpeechSynthesisVoice | null = null;
  let bestScore = -Infinity;
  for (const v of voices) {
    if (!v) continue;
    const s = langScore(v) + qualityScore(v) + genderScore(v);
    if (s > bestScore) {
      bestScore = s;
      best = v;
    }
  }
  return best ?? voices[0] ?? null;
}

/** Strip emojis, pictographs, and noisy symbols; keep readable punctuation. */
export function cleanTextForSpeech(input: string): string {
  const safe = typeof input === "string" ? input : "";
  if (!safe) return "";
  let out = safe;
  // Remove emoji & pictographic ranges (variation selectors, ZWJ, symbols).
  out = out.replace(
    /[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}\u{2300}-\u{23FF}\u{2B00}-\u{2BFF}\u{1F1E6}-\u{1F1FF}\uFE0F\u200D]/gu,
    "",
  );
  // Remove decorative symbols but keep . , ! ? ; : ' " - ( ) and basic Devanagari/Latin/whitespace/digits.
  out = out.replace(/[*_~`#^<>{}\[\]\\|@$%+=/]/g, " ");
  // Collapse repeated punctuation (!!! -> !) and whitespace.
  out = out.replace(/([.!?,;:])\1{1,}/g, "$1");
  out = out.replace(/\s{2,}/g, " ").trim();
  return out;
}
