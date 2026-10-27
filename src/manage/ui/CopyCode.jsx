'use client';
// Un cod de culoare care se copiază la clic
import {useState} from 'react';

export default function CopyCode({value}) {
  const [done, setDone] = useState(false);
  return (
    <button type="button" className="sm" title="Copiază" onClick={async () => { try { await navigator.clipboard.writeText(value); setDone(true); setTimeout(() => setDone(false), 1200); } catch {} }}>
      {done ? 'copiat ✓' : value}
    </button>
  );
}
