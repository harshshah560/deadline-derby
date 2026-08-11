import confetti from "canvas-confetti";

export function fireConfetti() {
  confetti({
    particleCount: 90,
    spread: 70,
    startVelocity: 35,
    origin: { y: 0.7 },
    colors: ["#FF6B6B", "#4ECDC4", "#FFD166", "#A78BFA", "#F472B6"],
  });
}
