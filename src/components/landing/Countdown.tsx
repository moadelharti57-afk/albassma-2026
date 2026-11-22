import { useEffect, useState } from 'react';
import { EVENT } from '@/config/event';

function diff(target: number) {
  const ms = Math.max(0, target - Date.now());
  return {
    done: ms === 0,
    parts: [
      { label: 'Jours', value: Math.floor(ms / 86_400_000) },
      { label: 'Heures', value: Math.floor(ms / 3_600_000) % 24 },
      { label: 'Minutes', value: Math.floor(ms / 60_000) % 60 },
      { label: 'Secondes', value: Math.floor(ms / 1000) % 60 },
    ],
  };
}

/** Countdown to EVENT.date. Renders nothing if the date isn't set yet. */
export function Countdown() {
  const target = EVENT.date ? new Date(EVENT.date).getTime() : NaN;
  const [state, setState] = useState(() => (Number.isFinite(target) ? diff(target) : null));

  useEffect(() => {
    if (!Number.isFinite(target)) return;
    const id = window.setInterval(() => setState(diff(target)), 1000);
    return () => window.clearInterval(id);
  }, [target]);

  if (!state) return null;

  if (state.done) {
    return <p className="font-display text-3xl text-primary">C'est ce soir !</p>;
  }

  return (
    <div className="flex gap-2 sm:gap-3" role="timer" aria-label="Temps restant avant l'événement">
      {state.parts.map((p) => (
        <div key={p.label} className="glass min-w-[4.25rem] rounded-2xl px-3 py-3 text-center sm:min-w-[5.5rem]">
          <div className="font-display text-3xl tabular-nums text-foreground sm:text-5xl">
            {String(p.value).padStart(2, '0')}
          </div>
          <div className="mt-1 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{p.label}</div>
        </div>
      ))}
    </div>
  );
}
