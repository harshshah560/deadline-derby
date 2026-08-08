import type { MouseEvent } from "react";
import type { Checkpoint } from "../../lib/database.types";

const SOURCE_EMOJI: Record<Checkpoint["progress_source"], string> = {
  manual: "🎯",
  github: "🐙",
};

interface Props {
  checkpoint: Checkpoint;
  onClick?: (e: MouseEvent) => void;
}

export function CheckpointBadge({ checkpoint, onClick }: Props) {
  return (
    <span
      role="button"
      tabIndex={0}
      title={checkpoint.title}
      onClick={onClick}
      onKeyDown={(e) => e.key === "Enter" && onClick?.(e as unknown as MouseEvent)}
      className="sticker flex h-5 w-5 cursor-pointer items-center justify-center rounded-full bg-[var(--color-accent-2)] text-[11px] shadow-sm"
    >
      {SOURCE_EMOJI[checkpoint.progress_source]}
    </span>
  );
}
