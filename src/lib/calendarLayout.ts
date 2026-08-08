import { addDays, format, isSameDay, startOfWeek } from "date-fns";

export interface DayCell {
  date: Date;
  key: string;
  row: number;
  col: number;
  isFirstOfMonth: boolean;
}

// Lays the project's date range out as calendar weeks (Sun-Sat rows), and
// returns the days in serpentine order (row 0 left->right, row 1 right->left, ...)
// so a single continuous racetrack path can snake across the grid.
export function buildCalendarLayout(startDate: string, endDate: string) {
  const start = startOfWeek(new Date(`${startDate}T00:00:00`));
  const end = new Date(`${endDate}T00:00:00`);

  const weeks: DayCell[][] = [];
  let cursor = start;
  let row = 0;

  while (cursor <= end || cursor.getDay() !== 0) {
    const week: DayCell[] = [];
    for (let col = 0; col < 7; col++) {
      week.push({
        date: cursor,
        key: format(cursor, "yyyy-MM-dd"),
        row,
        col,
        isFirstOfMonth: cursor.getDate() === 1,
      });
      cursor = addDays(cursor, 1);
    }
    weeks.push(week);
    row++;
    if (cursor > end) break;
  }

  const serpentine: DayCell[] = weeks.flatMap((week, i) => (i % 2 === 0 ? week : [...week].reverse()));

  return { weeks, serpentine };
}

export function findDayCell(serpentine: DayCell[], date: string) {
  const target = new Date(`${date}T00:00:00`);
  return serpentine.find((d) => isSameDay(d.date, target));
}
