'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Voice input hook using the Web Speech API.
 * Extracts numbers from spoken input for fast data entry.
 *
 * Usage:
 *   const { listening, transcript, start, stop, supported } = useVoiceInput(onNumber);
 */

// ============================================================
// Word-to-number conversion
// ============================================================

const WORD_NUMBERS: Record<string, number> = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5,
  six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15,
  sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19,
  twenty: 20, thirty: 30, forty: 40, fifty: 50,
  sixty: 60, seventy: 70, eighty: 80, ninety: 90,
  hundred: 100,
};

/**
 * Parse spoken text into a number. Handles:
 * - Pure digits: "72" → 72
 * - Word numbers: "seventy two" → 72
 * - Mixed: "1 hundred" → 100
 * - Decimals: "forty five point five" → 45.5
 */
export function parseSpokenNumber(text: string): number | null {
  const cleaned = text.toLowerCase().trim();

  // Try direct numeric parse first
  const direct = parseFloat(cleaned);
  if (!isNaN(direct) && cleaned.match(/^[\d.]+$/)) return direct;

  // Split on "point" or "dot" for decimal handling
  const [wholePart, decimalPart] = cleaned.split(/\s+(?:point|dot)\s+/);

  const wholeNum = parseWordsToNumber(wholePart);
  if (wholeNum === null) return null;

  if (decimalPart) {
    const decNum = parseWordsToNumber(decimalPart);
    if (decNum !== null) {
      // "forty five point five" → 45.5
      const decStr = decNum.toString();
      return wholeNum + parseFloat(`0.${decStr}`);
    }
  }

  return wholeNum;
}

function parseWordsToNumber(text: string): number | null {
  const words = text.split(/[\s-]+/).filter(Boolean);
  if (words.length === 0) return null;

  // Try direct parse of the entire string
  const direct = parseFloat(words.join(''));
  if (!isNaN(direct)) return direct;

  let result = 0;
  let current = 0;

  for (const word of words) {
    // Try as digit
    const asNum = parseFloat(word);
    if (!isNaN(asNum)) {
      current += asNum;
      continue;
    }

    // Skip "and"
    if (word === 'and') continue;

    const val = WORD_NUMBERS[word];
    if (val === undefined) {
      // If we have something so far, maybe the rest is noise
      if (current > 0 || result > 0) break;
      return null;
    }

    if (val === 100) {
      // "one hundred" → current = 1, val = 100 → current = 100
      current = (current === 0 ? 1 : current) * 100;
    } else {
      current += val;
    }
  }

  result += current;
  return result > 0 ? result : null;
}

// ============================================================
// Voice commands
// ============================================================

export type VoiceCommand = 'undo' | 'mishit' | 'skip' | 'done' | null;

export function parseVoiceCommand(text: string): VoiceCommand {
  const lower = text.toLowerCase().trim();
  if (lower.includes('undo') || lower.includes('take back') || lower.includes('go back')) return 'undo';
  if (lower.includes('mishit') || lower.includes('miss hit') || lower.includes('mis-hit') || lower.includes('duff')) return 'mishit';
  if (lower.includes('skip') || lower.includes('next')) return 'skip';
  if (lower.includes('done') || lower.includes('finish') || lower.includes('stop') || lower.includes('end session')) return 'done';
  return null;
}

// ============================================================
// Hook
// ============================================================

interface UseVoiceInputOptions {
  /** Called when a number is recognized */
  onNumber?: (value: number) => void;
  /** Called when a voice command is recognized */
  onCommand?: (command: VoiceCommand) => void;
  /** Auto-restart listening after each result (continuous mode) */
  continuous?: boolean;
}

interface UseVoiceInputReturn {
  /** Whether the browser supports speech recognition */
  supported: boolean;
  /** Whether actively listening */
  listening: boolean;
  /** Raw transcript of last recognition */
  transcript: string;
  /** Visual feedback status */
  status: 'idle' | 'listening' | 'processing';
  /** Start listening */
  start: () => void;
  /** Stop listening */
  stop: () => void;
  /** Toggle listening */
  toggle: () => void;
}

export function useVoiceInput(options: UseVoiceInputOptions = {}): UseVoiceInputReturn {
  const { onNumber, onCommand, continuous = true } = options;

  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [status, setStatus] = useState<'idle' | 'listening' | 'processing'>('idle');

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const shouldRestartRef = useRef(false);

  // Store callbacks in refs to avoid re-creating recognition on every render
  const onNumberRef = useRef(onNumber);
  const onCommandRef = useRef(onCommand);
  useEffect(() => { onNumberRef.current = onNumber; }, [onNumber]);
  useEffect(() => { onCommandRef.current = onCommand; }, [onCommand]);

  // Check support
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || (window as unknown as { webkitSpeechRecognition: typeof window.SpeechRecognition }).webkitSpeechRecognition;
    setSupported(!!SpeechRecognition);
  }, []);

  const start = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || (window as unknown as { webkitSpeechRecognition: typeof window.SpeechRecognition }).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    // Clean up existing
    if (recognitionRef.current) {
      recognitionRef.current.abort();
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false; // We restart manually for better control
    recognition.interimResults = false;
    recognition.lang = 'en-US';
    recognition.maxAlternatives = 3;

    recognition.onstart = () => {
      setListening(true);
      setStatus('listening');
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      setStatus('processing');

      // Check all alternatives for a number
      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        for (let j = 0; j < result.length; j++) {
          const text = result[j].transcript;
          setTranscript(text);

          // Check for commands first
          const command = parseVoiceCommand(text);
          if (command) {
            onCommandRef.current?.(command);
            return;
          }

          // Try to extract a number
          const num = parseSpokenNumber(text);
          if (num !== null && num > 0 && num < 400) {
            onNumberRef.current?.(num);
            return;
          }
        }
      }
    };

    recognition.onerror = (event) => {
      // 'no-speech' and 'aborted' are expected, don't treat as fatal
      if (event.error === 'no-speech' || event.error === 'aborted') {
        // Restart if in continuous mode
        if (shouldRestartRef.current && continuous) {
          setTimeout(() => {
            try { recognition.start(); } catch { /* ignore */ }
          }, 100);
        }
        return;
      }
      console.warn('Speech recognition error:', event.error);
      setListening(false);
      setStatus('idle');
    };

    recognition.onend = () => {
      // Auto-restart in continuous mode
      if (shouldRestartRef.current && continuous) {
        setTimeout(() => {
          try { recognition.start(); } catch { /* ignore */ }
        }, 100);
      } else {
        setListening(false);
        setStatus('idle');
      }
    };

    recognitionRef.current = recognition;
    shouldRestartRef.current = true;

    try {
      recognition.start();
    } catch { /* already started */ }
  }, [continuous]);

  const stop = useCallback(() => {
    shouldRestartRef.current = false;
    if (recognitionRef.current) {
      recognitionRef.current.abort();
      recognitionRef.current = null;
    }
    setListening(false);
    setStatus('idle');
  }, []);

  const toggle = useCallback(() => {
    if (listening) {
      stop();
    } else {
      start();
    }
  }, [listening, start, stop]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      shouldRestartRef.current = false;
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  return { supported, listening, transcript, status, start, stop, toggle };
}
