import { SPELLING_VARIANTS } from '../constants';

/**
 * Analyzes a spelling mistake and returns a human-friendly tip.
 */
export function analyzeSpelling(guess: string, correct: string): { tip: string; coloredGuess: { char: string; correct: boolean }[] } {
  const g = guess.toLowerCase().trim();
  const c = correct.toLowerCase().trim();

  const coloredGuess: { char: string; correct: boolean }[] = [];
  
  // Basic character highlighting
  for (let i = 0; i < g.length; i++) {
    coloredGuess.push({
      char: guess[i],
      correct: g[i] === c[i]
    });
  }

  if (g === c) return { tip: '', coloredGuess };

  // Common error patterns
  
  // 0. British English Check
  const britishCorrect = SPELLING_VARIANTS[g];
  if (britishCorrect === c) {
    return { tip: 'Valid British spelling, but use the provided version for competition', coloredGuess };
  }

  // 1. Extra letter check
  if (g.length > c.length) {
    const extra = findExtraChars(g, c);
    if (extra.length === 1) {
      const char = extra[0];
      // Check if this character is actually in the correct word
      if (c.includes(char)) {
        return { tip: `Only one ${char}`, coloredGuess };
      } else {
        return { tip: `Extra ${char}`, coloredGuess };
      }
    }
  }

  // 2. Missing letter
  if (g.length < c.length) {
    const missing = findExtraChars(c, g);
    if (missing.length === 1) {
      const char = missing[0];
      return { tip: `'${char}' missing`, coloredGuess };
    }
  }

  // 3. Vowel swap
  const vowels = ['a', 'e', 'i', 'o', 'u'];
  if (g.length === c.length) {
    for (let i = 0; i < g.length; i++) {
      if (g[i] !== c[i] && vowels.includes(g[i]) && vowels.includes(c[i])) {
        // If it looks like a vowel sound issue (e.g. oo vs u)
        if (c.slice(i, i+2) === 'oo' && g[i] === 'u') return { tip: 'oo, not u', coloredGuess };
        return { tip: `${c[i]}, not ${g[i]}`, coloredGuess };
      }
    }
  }

  return { tip: 'Check your spelling', coloredGuess };
}

function findExtraChars(longer: string, shorter: string): string[] {
  const charMap: Record<string, number> = {};
  for (const char of shorter) charMap[char] = (charMap[char] || 0) + 1;
  
  const extras: string[] = [];
  for (const char of longer) {
    if (!charMap[char] || charMap[char] <= 0) {
      extras.push(char);
    } else {
      charMap[char]--;
    }
  }
  return extras;
}

/**
 * Simple Audio Utility using Web Audio API
 */
class SoundEngine {
  private ctx: AudioContext | null = null;

  private init() {
    if (!this.ctx) this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }

  async playCorrect() {
    this.init();
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(523.25, this.ctx.currentTime); // C5
    osc.frequency.exponentialRampToValueAtTime(1046.50, this.ctx.currentTime + 0.1); // C6
    gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.3);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.3);
    return new Promise(resolve => setTimeout(resolve, 400));
  }

  async playWrong() {
    this.init();
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150, this.ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(100, this.ctx.currentTime + 0.2);
    gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.001, this.ctx.currentTime + 0.3);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.3);
    return new Promise(resolve => setTimeout(resolve, 400));
  }
}

export const sounds = new SoundEngine();
