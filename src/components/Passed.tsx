import { useEffect } from "react";

/** Full-width "mission passed" banner shown after a launch or trade lands. */
export function Passed({ title, sub, onDone }: { title: string; sub?: string; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 3800);
    return () => clearTimeout(t);
  }, [onDone]);
  return (
    <div className="passed" role="status" onClick={onDone}>
      <div className="passed__title">{title}</div>
      {sub && <div className="passed__sub">{sub}</div>}
    </div>
  );
}
