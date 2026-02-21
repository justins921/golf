import type { Shot, ClubStats, YardageCardClub } from './types';

/**
 * Export filtered shots as CSV
 */
export function shotsToCSV(shots: Shot[]): string {
  const headers = [
    'club_name', 'club_type', 'datetime',
    'carry_distance_yd', 'carry_lateral_yd',
    'total_distance_yd', 'total_lateral_yd',
    'is_full_shot', 'excluded_from_card', 'target_distance_yd',
    'tags', 'notes',
  ];

  const rows = shots.map((s) =>
    [
      s.club_name, s.club_type, s.datetime ?? '',
      s.carry_distance_yd, s.carry_lateral_yd,
      s.total_distance_yd, s.total_lateral_yd,
      s.is_full_shot, s.excluded_from_card, s.target_distance_yd ?? '',
      s.tags.join(';'), s.notes ?? '',
    ]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(',')
  );

  return [headers.join(','), ...rows].join('\n');
}

/**
 * Export stats as JSON
 */
export function statsToJSON(stats: ClubStats[]): string {
  return JSON.stringify(stats, null, 2);
}

/**
 * Export stats as CSV
 */
export function statsToCSV(stats: ClubStats[]): string {
  const headers = [
    'club_name', 'club_type', 'n',
    'carry_mean', 'carry_sd', 'carry_lateral_mean', 'carry_lateral_sd',
    'carry_median', 'carry_p10', 'carry_p20', 'carry_p80', 'carry_p90',
    'total_mean', 'total_sd', 'total_lateral_mean', 'total_lateral_sd',
  ];

  const rows = stats.map((s) =>
    [
      s.clubName, s.clubType, s.n,
      s.carry.meanDistance.toFixed(1), s.carry.sdDistance.toFixed(1),
      s.carry.meanLateral.toFixed(1), s.carry.sdLateral.toFixed(1),
      s.carry.medianDistance.toFixed(1), s.carry.p10Distance.toFixed(1),
      s.carry.p20Distance.toFixed(1), s.carry.p80Distance.toFixed(1),
      s.carry.p90Distance.toFixed(1),
      s.total.meanDistance.toFixed(1), s.total.sdDistance.toFixed(1),
      s.total.meanLateral.toFixed(1), s.total.sdLateral.toFixed(1),
    ].join(',')
  );

  return [headers.join(','), ...rows].join('\n');
}

/**
 * Trigger browser download of a string as file.
 */
export function downloadFile(content: string, filename: string, mimeType: string = 'text/csv') {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Export an SVG element as PNG.
 */
export async function svgToPng(svgElement: SVGSVGElement, scale: number = 2): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const svgData = new XMLSerializer().serializeToString(svgElement);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      reject(new Error('Failed to get canvas context'));
      return;
    }

    const img = new Image();
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const svgUrl = URL.createObjectURL(svgBlob);

    img.onload = () => {
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      ctx.scale(scale, scale);
      ctx.drawImage(img, 0, 0);
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Failed to create PNG blob'));
        URL.revokeObjectURL(svgUrl);
      }, 'image/png');
    };

    img.onerror = () => {
      reject(new Error('Failed to load SVG'));
      URL.revokeObjectURL(svgUrl);
    };

    img.src = svgUrl;
  });
}

/**
 * Download a Blob as a file.
 */
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
