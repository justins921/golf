import type { Shot } from './types';
import { v4 as uuidv4 } from 'uuid';

/**
 * Parse Garmin Approach R50 "DrivingRange-*.csv" exports.
 *
 * CSV format:
 * - Row 1: headers
 * - Row 2: units row (Date cell is blank, other cells contain "[mph]", "[deg]", etc.)
 * - Row 3+: data rows (real shots have Date populated)
 *
 * Returns an array of Shot objects (without id/session_id — caller assigns those).
 */

// Known header mappings (Garmin may vary slightly)
const HEADER_MAP: Record<string, string> = {
  'date': 'date',
  'time': 'time',
  'player': 'player',
  'club name': 'clubName',
  'club type': 'clubType',
  'club speed': 'clubSpeed',
  'ball speed': 'ballSpeed',
  'smash factor': 'smashFactor',
  'launch angle': 'launchAngle',
  'launch direction': 'launchDirection',
  'back spin': 'backSpin',
  'side spin': 'sideSpin',
  'spin axis': 'spinAxis',
  'spin rate': 'spinRate',
  'carry distance': 'carryDistance',
  'carry deviation distance': 'carryDeviationDistance',
  'carry deviation angle': 'carryDeviationAngle',
  'total distance': 'totalDistance',
  'total deviation distance': 'totalDeviationDistance',
  'total deviation angle': 'totalDeviationAngle',
  'hang time': 'hangTime',
  'max height': 'maxHeight',
  'descent angle': 'descentAngle',
};

function normalizeHeader(h: string): string {
  const lower = h.trim().toLowerCase();
  return HEADER_MAP[lower] ?? lower.replace(/\s+/g, '_');
}

function parseNum(val: string | undefined | null): number | null {
  if (val == null || val.trim() === '' || val.trim() === '--') return null;
  const cleaned = val.trim().replace(/,/g, '');
  const n = parseFloat(cleaned);
  return isNaN(n) ? null : n;
}

function parseDate(dateStr: string, timeStr?: string): string | null {
  if (!dateStr || dateStr.trim() === '') return null;
  try {
    const combined = timeStr ? `${dateStr.trim()} ${timeStr.trim()}` : dateStr.trim();
    const d = new Date(combined);
    if (isNaN(d.getTime())) return null;
    return d.toISOString();
  } catch {
    return null;
  }
}

export interface ParseResult {
  shots: Omit<Shot, 'id' | 'session_id'>[];
  clubs: string[];
  playerName: string | null;
  dateRange: { earliest: string | null; latest: string | null };
  errors: string[];
}

export function parseGarminCsv(csvText: string): ParseResult {
  const errors: string[] = [];
  const lines = csvText.split(/\r?\n/);

  if (lines.length < 2) {
    return { shots: [], clubs: [], playerName: null, dateRange: { earliest: null, latest: null }, errors: ['File has fewer than 2 lines'] };
  }

  // Parse headers
  const headerLine = lines[0];
  const headers = parseCSVLine(headerLine).map(normalizeHeader);

  // Detect units row: Date cell is blank
  let dataStart = 1;
  if (lines.length > 1) {
    const secondRowFields = parseCSVLine(lines[1]);
    const dateIdx = headers.indexOf('date');
    if (dateIdx >= 0 && (!secondRowFields[dateIdx] || secondRowFields[dateIdx].trim() === '')) {
      // This is the units row — skip it
      dataStart = 2;
    }
  }

  const shots: Omit<Shot, 'id' | 'session_id'>[] = [];
  let playerName: string | null = null;
  const clubSet = new Set<string>();
  let earliest: string | null = null;
  let latest: string | null = null;

  for (let i = dataStart; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const fields = parseCSVLine(line);
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = fields[idx] ?? '';
    });

    // Skip rows without a date (non-shot rows)
    if (!row.date || row.date.trim() === '') continue;

    const clubName = row.clubName?.trim() || row['club_name']?.trim() || 'Unknown';
    const clubType = row.clubType?.trim() || row['club_type']?.trim() || 'Unknown';
    const carryDistance = parseNum(row.carryDistance ?? row['carry_distance']);
    const carryLateral = parseNum(row.carryDeviationDistance ?? row['carry_deviation_distance']);
    const totalDistance = parseNum(row.totalDistance ?? row['total_distance']);
    const totalLateral = parseNum(row.totalDeviationDistance ?? row['total_deviation_distance']);

    if (carryDistance == null || totalDistance == null) {
      errors.push(`Row ${i + 1}: Missing carry or total distance, skipping`);
      continue;
    }

    if (row.player?.trim()) {
      playerName = row.player.trim();
    }

    const dt = parseDate(row.date, row.time);
    if (dt) {
      if (!earliest || dt < earliest) earliest = dt;
      if (!latest || dt > latest) latest = dt;
    }

    clubSet.add(clubName);

    // Build raw data object with all original fields
    const raw: Record<string, unknown> = {};
    headers.forEach((h) => {
      if (row[h] !== undefined && row[h] !== '') {
        raw[h] = row[h];
      }
    });

    shots.push({
      datetime: dt,
      club_name: clubName,
      club_type: clubType,
      carry_distance_yd: carryDistance,
      carry_lateral_yd: carryLateral ?? 0,
      total_distance_yd: totalDistance,
      total_lateral_yd: totalLateral ?? 0,
      is_full_shot: true,
      excluded_from_card: false,
      target_distance_yd: null,
      tags: [],
      notes: null,
      raw,
    });
  }

  return {
    shots,
    clubs: Array.from(clubSet),
    playerName,
    dateRange: { earliest, latest },
    errors,
  };
}

/**
 * Parse a single CSV line, handling quoted fields.
 */
function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQuotes) {
      if (c === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += c;
      }
    } else {
      if (c === '"') {
        inQuotes = true;
      } else if (c === ',') {
        fields.push(current);
        current = '';
      } else {
        current += c;
      }
    }
  }
  fields.push(current);
  return fields;
}

/**
 * Generate unique IDs for parsed shots and assign session_id.
 */
export function assignIds(
  shots: Omit<Shot, 'id' | 'session_id'>[],
  sessionId: string
): Shot[] {
  return shots.map((s) => ({
    ...s,
    id: uuidv4(),
    session_id: sessionId,
  }));
}
