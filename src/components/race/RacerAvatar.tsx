import { motion } from "framer-motion";
import type { Participant } from "../../lib/database.types";

interface Props {
  participant: Participant;
  point: { x: number; y: number };
  laneOffset: number;
}

export function RacerAvatar({ participant, point, laneOffset }: Props) {
  const emoji = participant.profile?.avatar_emoji ?? "🏃";
  const color = participant.profile?.avatar_color ?? "#FF6B6B";
  const offset = (laneOffset % 3) * 10 - 10;

  return (
    <motion.g
      initial={false}
      animate={{ x: point.x + offset, y: point.y - 14 }}
      transition={{ type: "spring", stiffness: 120, damping: 14 }}
    >
      <foreignObject x={-16} y={-16} width={32} height={32}>
        <div
          className="sticker flex h-8 w-8 items-center justify-center rounded-full text-base shadow-md ring-2 ring-white"
          style={{ background: color }}
          title={participant.profile?.username ?? "Racer"}
        >
          {emoji}
        </div>
      </foreignObject>
    </motion.g>
  );
}
