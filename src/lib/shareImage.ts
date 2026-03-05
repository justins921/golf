'use client';

/**
 * Share utilities for Golf OS
 * Simple, dependency-free sharing functions
 */

/** Copy text to clipboard with fallback */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  }
}

/** Download content as a file */
export function downloadFile(content: string, filename: string, mimeType = 'text/plain') {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Use native Web Share API if available */
export async function nativeShare(data: { title: string; text: string; url?: string }): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      await navigator.share(data);
      return true;
    } catch {
      return false;
    }
  }
  return false;
}

/** Generate a text summary of round data for sharing */
export function formatRoundSummary(round: {
  course_name: string;
  round_date: string;
  total_score: number | null;
  total_putts: number | null;
  total_gir: number | null;
  total_fairways_hit: number | null;
  total_fairways: number | null;
  holes_played: number;
}): string {
  const lines = [
    `${round.course_name} - ${round.round_date}`,
    `Score: ${round.total_score ?? '-'} (${round.holes_played} holes)`,
  ];
  if (round.total_putts != null) lines.push(`Putts: ${round.total_putts}`);
  if (round.total_gir != null) lines.push(`GIR: ${round.total_gir}/${round.holes_played}`);
  if (round.total_fairways_hit != null && round.total_fairways != null) {
    lines.push(`FIR: ${round.total_fairways_hit}/${round.total_fairways}`);
  }
  lines.push('', 'Tracked with Golf OS');
  return lines.join('\n');
}

/** Generate a text summary of bag/gapping for sharing */
export function formatGappingSummary(clubs: { clubName: string; medianCarry: number; gapToNext: number | null }[]): string {
  const lines = ['My Bag - Distance Ladder', ''];
  for (const c of clubs) {
    const gap = c.gapToNext != null ? ` (${c.gapToNext}yd gap)` : '';
    lines.push(`${c.clubName.padEnd(14)} ${String(c.medianCarry).padStart(3)} yd${gap}`);
  }
  lines.push('', 'Tracked with Golf OS');
  return lines.join('\n');
}
