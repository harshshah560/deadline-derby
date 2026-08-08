import { useLayoutEffect, useRef, useState } from "react";
import { buildCalendarLayout } from "../../lib/calendarLayout";
import type { Checkpoint, CheckpointCompletion, Participant } from "../../lib/database.types";
import { RacerAvatar } from "./RacerAvatar";

interface Point {
  x: number;
  y: number;
}

interface Props {
  containerId: string;
  startDate: string;
  endDate: string;
  checkpoints: Checkpoint[];
  participants: Participant[];
  completions: CheckpointCompletion[];
}

function measureCells(containerId: string, dayKeys: string[]): Point[] {
  const container = document.getElementById(containerId);
  if (!container) return [];
  const containerBox = container.getBoundingClientRect();
  return dayKeys.map((key) => {
    const el = container.querySelector(`[data-day-key="${key}"]`) as HTMLElement | null;
    if (!el) return { x: 0, y: 0 };
    const box = el.getBoundingClientRect();
    return {
      x: box.left - containerBox.left + box.width / 2,
      y: box.top - containerBox.top + box.height / 2,
    };
  });
}

export function RaceTrack({ containerId, startDate, endDate, checkpoints, participants, completions }: Props) {
  const { serpentine } = buildCalendarLayout(startDate, endDate);
  const dayKeys = serpentine.map((d) => d.key);
  const [points, setPoints] = useState<Point[]>([]);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const frame = useRef<number | null>(null);

  useLayoutEffect(() => {
    const recompute = () => {
      const container = document.getElementById(containerId);
      if (container) {
        setContainerSize({ width: container.offsetWidth, height: container.offsetHeight });
      }
      setPoints(measureCells(containerId, dayKeys));
    };

    recompute();
    const observer = new ResizeObserver(() => {
      if (frame.current) cancelAnimationFrame(frame.current);
      frame.current = requestAnimationFrame(recompute);
    });
    const container = document.getElementById(containerId);
    if (container) observer.observe(container);
    window.addEventListener("resize", recompute);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", recompute);
      if (frame.current) cancelAnimationFrame(frame.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [containerId, startDate, endDate, checkpoints.length]);

  if (points.length === 0 || !points.some((p) => p.x || p.y)) return null;

  const pathD = points.reduce((d, p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `${d} L ${p.x} ${p.y}`), "");

  const todayKey = new Date().toISOString().slice(0, 10);
  const todayIndex = Math.max(
    0,
    dayKeys.findIndex((k) => k === todayKey),
  );

  const racers = participants
    .filter((p) => p.role !== "viewer")
    .map((participant) => {
      const myCompletions = completions.filter(
        (c) => c.participant_id === participant.id && c.completed_at,
      );
      const myCheckpointIds = new Set(myCompletions.map((c) => c.checkpoint_id));
      const completedCheckpoints = checkpoints.filter((c) => myCheckpointIds.has(c.id));

      let furthestIndex = 0;
      for (const cp of completedCheckpoints) {
        const idx = dayKeys.indexOf(cp.target_date);
        if (idx > furthestIndex) furthestIndex = idx;
      }

      const point = points[furthestIndex] ?? points[0];
      return { participant, point, progress: completedCheckpoints.length, total: checkpoints.length };
    });

  return (
    <svg
      className="pointer-events-none absolute inset-0"
      width={containerSize.width}
      height={containerSize.height}
      viewBox={`0 0 ${containerSize.width} ${containerSize.height}`}
    >
      <path
        d={pathD}
        fill="none"
        stroke="var(--color-ink)"
        strokeOpacity={0.12}
        strokeWidth={10}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d={pathD}
        fill="none"
        stroke="#fff"
        strokeOpacity={0.9}
        strokeWidth={2}
        strokeDasharray="6 10"
        strokeLinecap="round"
      />
      {points[todayIndex] && (
        <g transform={`translate(${points[todayIndex].x}, ${points[todayIndex].y})`}>
          <circle r={16} fill="none" stroke="var(--color-accent)" strokeWidth={2} strokeDasharray="3 4" />
        </g>
      )}
      {racers.map(({ participant, point }, i) => (
        <RacerAvatar key={participant.id} participant={participant} point={point} laneOffset={i} />
      ))}
    </svg>
  );
}
