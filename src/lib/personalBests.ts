import { Round, SpeedReading, WorkoutLog } from './types';

export interface PersonalBest {
  label: string;
  value: string;
  detail: string;
  isNew: boolean;
}

export function computePersonalBests(
  rounds: Round[],
  speedReadings: (SpeedReading & { session_date: string })[],
  workouts: WorkoutLog[],
  practiceSessions: { created_at: string }[],
): PersonalBest[] {
  const results: PersonalBest[] = [];

  // 1. Best Score — lowest total_score
  const scoredRounds = rounds.filter((r) => r.total_score != null);
  if (scoredRounds.length > 0) {
    const best = scoredRounds.reduce((a, b) => (a.total_score! < b.total_score! ? a : b));
    const mostRecent = scoredRounds[0]; // rounds are assumed sorted most-recent-first
    results.push({
      label: 'Best Score',
      value: `${best.total_score}`,
      detail: `${best.course_name} · ${best.round_date}`,
      isNew: mostRecent.total_score === best.total_score && mostRecent.id === best.id,
    });
  }

  // 2. Best Putts — lowest total_putts
  const puttRounds = rounds.filter((r) => r.total_putts != null);
  if (puttRounds.length > 0) {
    const best = puttRounds.reduce((a, b) => (a.total_putts! < b.total_putts! ? a : b));
    const mostRecent = puttRounds[0];
    results.push({
      label: 'Best Putts',
      value: `${best.total_putts}`,
      detail: `${best.course_name} · ${best.round_date}`,
      isNew: mostRecent.total_putts === best.total_putts && mostRecent.id === best.id,
    });
  }

  // 3. Best GIR — highest total_gir (18-hole rounds only)
  const girRounds = rounds.filter((r) => r.total_gir != null && r.holes_played === 18);
  if (girRounds.length > 0) {
    const best = girRounds.reduce((a, b) => (a.total_gir! > b.total_gir! ? a : b));
    const mostRecent = girRounds[0];
    results.push({
      label: 'Best GIR',
      value: `${best.total_gir}`,
      detail: `${best.course_name} · ${best.round_date}`,
      isNew: mostRecent.total_gir === best.total_gir && mostRecent.id === best.id,
    });
  }

  // 4. Max Driver Speed — highest clubhead_speed_mph where club = 'Driver'
  const driverReadings = speedReadings.filter(
    (r) => r.club === 'Driver' && r.clubhead_speed_mph != null,
  );
  if (driverReadings.length > 0) {
    const best = driverReadings.reduce((a, b) =>
      a.clubhead_speed_mph! > b.clubhead_speed_mph! ? a : b,
    );
    const mostRecent = driverReadings[driverReadings.length - 1];
    results.push({
      label: 'Max Driver Speed',
      value: `${Math.round(best.clubhead_speed_mph! * 10) / 10} mph`,
      detail: best.session_date,
      isNew:
        mostRecent.clubhead_speed_mph === best.clubhead_speed_mph &&
        mostRecent.id === best.id,
    });
  }

  // 5. Longest Streak — consecutive-day streak from all activity dates
  const activityDatesSet = new Set<string>();
  for (const r of rounds) activityDatesSet.add(r.round_date);
  for (const w of workouts) activityDatesSet.add(w.workout_date);
  for (const p of practiceSessions) activityDatesSet.add(p.created_at.split('T')[0]);

  if (activityDatesSet.size > 0) {
    const sortedDates = Array.from(activityDatesSet).sort();
    let longestStreak = 1;
    let longestStart = 0;
    let longestEnd = 0;
    let currentStreak = 1;
    let currentStart = 0;

    for (let i = 1; i < sortedDates.length; i++) {
      const prev = new Date(sortedDates[i - 1]);
      const curr = new Date(sortedDates[i]);
      const diffMs = curr.getTime() - prev.getTime();
      const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        currentStreak++;
        if (currentStreak > longestStreak) {
          longestStreak = currentStreak;
          longestStart = currentStart;
          longestEnd = i;
        }
      } else {
        currentStreak = 1;
        currentStart = i;
      }
    }

    if (longestStreak >= 2) {
      results.push({
        label: 'Longest Streak',
        value: `${longestStreak} days`,
        detail: `${sortedDates[longestStart]} to ${sortedDates[longestEnd]}`,
        isNew: false,
      });
    }
  }

  // 6. Most Rounds in Month — calendar month with the most rounds
  if (rounds.length > 0) {
    const monthCounts = new Map<string, number>();
    for (const r of rounds) {
      const month = r.round_date.slice(0, 7); // "YYYY-MM"
      monthCounts.set(month, (monthCounts.get(month) ?? 0) + 1);
    }
    let bestMonth = '';
    let bestCount = 0;
    for (const [month, count] of monthCounts) {
      if (count > bestCount) {
        bestCount = count;
        bestMonth = month;
      }
    }
    if (bestCount > 0) {
      const [year, monthNum] = bestMonth.split('-');
      const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December',
      ];
      const monthLabel = monthNames[parseInt(monthNum, 10) - 1];
      results.push({
        label: 'Most Rounds in Month',
        value: `${bestCount}`,
        detail: `${monthLabel} ${year}`,
        isNew: false,
      });
    }
  }

  // 7. Most Practice in Week — calendar week with the most practice sessions
  if (practiceSessions.length > 0) {
    const weekCounts = new Map<string, { count: number; weekStart: Date }>();
    for (const p of practiceSessions) {
      const date = new Date(p.created_at.split('T')[0]);
      // Get Monday of the week
      const day = date.getDay();
      const diff = day === 0 ? -6 : 1 - day;
      const monday = new Date(date);
      monday.setDate(date.getDate() + diff);
      const key = monday.toISOString().split('T')[0];
      const existing = weekCounts.get(key);
      if (existing) {
        existing.count++;
      } else {
        weekCounts.set(key, { count: 1, weekStart: monday });
      }
    }
    let bestWeekKey = '';
    let bestCount = 0;
    let bestWeekStart: Date | null = null;
    for (const [key, { count, weekStart }] of weekCounts) {
      if (count > bestCount) {
        bestCount = count;
        bestWeekKey = key;
        bestWeekStart = weekStart;
      }
    }
    if (bestCount > 0 && bestWeekStart) {
      const monthNames = [
        'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
      ];
      const label = `Week of ${monthNames[bestWeekStart.getMonth()]} ${bestWeekStart.getDate()}`;
      results.push({
        label: 'Most Practice in Week',
        value: `${bestCount}`,
        detail: label,
        isNew: false,
      });
    }
  }

  return results;
}
