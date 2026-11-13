// Piese mici, comune secțiunilor v5 (merg și pe server, și în componentele client).
import {Fragment} from 'react';

// Un titlu împărțit pe cuvinte, ca fiecare să urce din propria mască (v5-motion.css: .rv-w). Textul rămâne text:
// se citește și se selectează la fel, iar fără mișcare cuvintele stau pur și simplu la locul lor.
export function Words({text, start = 0}) {
  return (text ?? '').split(/\s+/).filter(Boolean).map((w, i) => (
    <Fragment key={i}><span className="rv-w" style={{'--i': start + i}}><span>{w}</span></span>{' '}</Fragment>
  ));
}

// Valurile din logo: trei linii care curg încet, fiecare cu viteza ei. Decor, ascuns cititoarelor de ecran.
const WAVE = `M-120 0${' q 30 -8 60 0 t 60 0'.repeat(32)}`;
export function Waves({className = ''}) {
  return (
    <div className={`wv ${className}`} aria-hidden="true">
      <svg width="3720" height="56" viewBox="-120 0 3720 56">
        <g fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round">
          {/* Poziția pe <g>, mișcarea pe <path>: animația CSS ar înlocui un transform pus direct pe linie */}
          <g transform="translate(0 12)"><path className="wv-1" d={WAVE}/></g>
          <g transform="translate(0 28)"><path className="wv-2" d={WAVE}/></g>
          <g transform="translate(0 44)"><path className="wv-3" d={WAVE}/></g>
        </g>
      </svg>
    </div>
  );
}
