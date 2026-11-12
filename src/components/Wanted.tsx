/** GTA-style wanted stars, used here as a coin's heat: how far along its curve it is. */
export function Wanted({ level, label = true }: { level: number; label?: boolean }) {
  return (
    <span className="wanted" title={`Heat ${level}/5`} aria-label={`Heat ${level} of 5`}>
      {[0, 1, 2, 3, 4].map((i) => (
        <svg key={i} viewBox="0 0 24 24" className={i < level ? "on" : ""} aria-hidden>
          <path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5L2.5 9.4l6.6-.9z" />
        </svg>
      ))}
      {label && <span className="sr-only">{level} of 5</span>}
    </span>
  );
}
