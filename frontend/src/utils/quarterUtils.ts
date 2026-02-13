export type QuarterMode = "redhat" | "calendar";

export interface Quarter {
  year: number;
  quarter: number; // 1-4
  mode: QuarterMode;
  start: Date;
  end: Date;
}

export interface Week {
  weekNum: number;
  start: Date;
  end: Date;
  label: string;
}

/**
 * Red Hat fiscal year starts in March:
 *   Q1 = Mar-May, Q2 = Jun-Aug, Q3 = Sep-Nov, Q4 = Dec-Feb
 *
 * Calendar quarters:
 *   Q1 = Jan-Mar, Q2 = Apr-Jun, Q3 = Jul-Sep, Q4 = Oct-Dec
 */

function getQuarterStartMonth(quarter: number, mode: QuarterMode): number {
  if (mode === "redhat") {
    // Q1=Mar(2), Q2=Jun(5), Q3=Sep(8), Q4=Dec(11)
    return [2, 5, 8, 11][quarter - 1];
  }
  // Calendar: Q1=Jan(0), Q2=Apr(3), Q3=Jul(6), Q4=Oct(9)
  return [0, 3, 6, 9][quarter - 1];
}

function makeQuarter(year: number, quarter: number, mode: QuarterMode): Quarter {
  const startMonth = getQuarterStartMonth(quarter, mode);

  // For RH fiscal Q4 (Dec-Feb), Dec is in the previous calendar year
  let calendarYear = year;
  if (mode === "redhat") {
    // RH FY year label is 1 ahead for Q1-Q3 (e.g., FY26 Q1 = Mar 2025)
    // FY26 Q1 = Mar 2025, FY26 Q2 = Jun 2025, FY26 Q3 = Sep 2025, FY26 Q4 = Dec 2025
    calendarYear = year - 1;
    if (quarter === 4) {
      // Q4 Dec starts in year-1, Jan-Feb in year
      calendarYear = year - 1;
    }
  }

  const start = new Date(calendarYear, startMonth, 1);
  const endMonth = startMonth + 3;
  const end = new Date(calendarYear, endMonth, 0, 23, 59, 59, 999);

  // Handle year rollover for months >= 12
  if (endMonth > 12) {
    const adjustedEnd = new Date(calendarYear + 1, endMonth - 12, 0, 23, 59, 59, 999);
    return { year, quarter, mode, start, end: adjustedEnd };
  }

  return { year, quarter, mode, start, end };
}

export function getCurrentQuarter(mode: QuarterMode): Quarter {
  const now = new Date();
  const month = now.getMonth(); // 0-11

  if (mode === "redhat") {
    // Mar-May=Q1, Jun-Aug=Q2, Sep-Nov=Q3, Dec-Feb=Q4
    let q: number;
    let fy: number;
    if (month >= 2 && month <= 4) {
      q = 1;
      fy = now.getFullYear() + 1;
    } else if (month >= 5 && month <= 7) {
      q = 2;
      fy = now.getFullYear() + 1;
    } else if (month >= 8 && month <= 10) {
      q = 3;
      fy = now.getFullYear() + 1;
    } else {
      q = 4;
      // Dec is in current year, Jan-Feb is in next year for FY
      fy = month === 11 ? now.getFullYear() + 1 : now.getFullYear();
    }
    return makeQuarter(fy, q, mode);
  }

  // Calendar
  const q = Math.floor(month / 3) + 1;
  return makeQuarter(now.getFullYear(), q, mode);
}

export function getRecentQuarters(count: number, mode: QuarterMode): Quarter[] {
  const current = getCurrentQuarter(mode);
  const quarters: Quarter[] = [];

  let y = current.year;
  let q = current.quarter;

  for (let i = 0; i < count; i++) {
    quarters.push(makeQuarter(y, q, mode));
    q--;
    if (q < 1) {
      q = 4;
      y--;
    }
  }

  return quarters;
}

export function getWeeksInQuarter(quarter: Quarter): Week[] {
  const weeks: Week[] = [];
  const current = new Date(quarter.start);
  // Align to Monday
  const day = current.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  current.setDate(current.getDate() + diff);

  let weekNum = 1;
  while (current <= quarter.end) {
    const weekStart = new Date(current);
    const weekEnd = new Date(current);
    weekEnd.setDate(weekEnd.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const label = `Week of ${monthNames[weekStart.getMonth()]} ${weekStart.getDate()}`;

    weeks.push({ weekNum, start: weekStart, end: weekEnd, label });

    current.setDate(current.getDate() + 7);
    weekNum++;
  }

  return weeks;
}

export function filterByDateRange<T>(
  items: T[],
  getDate: (item: T) => Date | null,
  start: Date,
  end: Date
): T[] {
  return items.filter((item) => {
    const d = getDate(item);
    if (!d) return false;
    return d >= start && d <= end;
  });
}

export function groupByWeek<T>(
  items: T[],
  getDate: (item: T) => Date | null,
  quarter: Quarter
): Map<number, T[]> {
  const weeks = getWeeksInQuarter(quarter);
  const grouped = new Map<number, T[]>();

  for (const week of weeks) {
    grouped.set(week.weekNum, []);
  }

  for (const item of items) {
    const d = getDate(item);
    if (!d) continue;
    for (const week of weeks) {
      if (d >= week.start && d <= week.end) {
        const arr = grouped.get(week.weekNum) || [];
        arr.push(item);
        grouped.set(week.weekNum, arr);
        break;
      }
    }
  }

  return grouped;
}

export function getQuarterLabel(quarter: Quarter): string {
  if (quarter.mode === "redhat") {
    const fyShort = quarter.year.toString().slice(-2);
    return `FY${fyShort} Q${quarter.quarter}`;
  }
  return `${quarter.year} Q${quarter.quarter}`;
}
