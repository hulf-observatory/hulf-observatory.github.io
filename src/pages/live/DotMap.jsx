// Station map for a full view: the HMDA outline and one dot per station coloured by its value (five equal steps,
// a legend under the map). Wind stations get an arrow pointing where the wind is going. No basemap — plain SVG.
import { useEffect, useState } from 'react';

const K = Math.cos((17.4 * Math.PI) / 180); // longitude is shorter at Hyderabad's latitude

function useHmda() {
  const [g, setG] = useState(null);
  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}live/hmda.geojson`).then((r) => r.json()).then(setG).catch(() => {});
  }, []);
  return g;
}

export default function DotMap({ stations, value, ramp, steps, arrow, format, label }) {
  const hmda = useHmda();
  const rings = hmda ? (hmda.features[0].geometry.type === 'Polygon' ? [hmda.features[0].geometry.coordinates]
    : hmda.features[0].geometry.coordinates).map((p) => p[0]) : [];
  const allPts = [...rings.flat(), ...stations.map((s) => [s.lon, s.lat])];
  if (!allPts.length) return null;
  const x0 = Math.min(...allPts.map((p) => p[0])); const x1 = Math.max(...allPts.map((p) => p[0]));
  const y0 = Math.min(...allPts.map((p) => p[1])); const y1 = Math.max(...allPts.map((p) => p[1]));
  const W = 600; const H = ((y1 - y0) / ((x1 - x0) * K)) * W;
  const px = (lon) => ((lon - x0) / (x1 - x0)) * W;
  const py = (lat) => ((y1 - lat) / (y1 - y0)) * H;
  const colourOf = (v) => {
    if (v == null) return '#D1D5DB';
    const i = steps.findIndex((s) => v <= s);
    return ramp[i === -1 ? ramp.length - 1 : i];
  };
  const shown = stations.filter((s) => s.lat != null && s.lon != null && value(s) != null);
  return (
    <figure className="lt-map">
      <svg viewBox={`-8 -8 ${W + 16} ${H + 16}`} role="img" aria-label={label}>
        {rings.map((r, i) => (
          <path key={i} d={`M${r.map((p) => `${px(p[0]).toFixed(1)},${py(p[1]).toFixed(1)}`).join(' L')}Z`} fill="#FAFAFB" stroke="#D1D5DB" strokeWidth="1" />
        ))}
        {[...shown].sort((a, b) => value(a) - value(b)).map((s, i) => {
          const v = value(s); const c = colourOf(v);
          return arrow && s[arrow] != null ? (
            <g key={i} transform={`translate(${px(s.lon).toFixed(1)} ${py(s.lat).toFixed(1)}) rotate(${s[arrow] + 180})`}>
              <line x1="0" y1="7" x2="0" y2="-6" stroke={c} strokeWidth="1.6" strokeLinecap="round" />
              <path d="M-3.4,-2.6 L0,-7.5 L3.4,-2.6" fill="none" stroke={c} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              <title>{`${s.name}: ${format(v)}`}</title>
            </g>
          ) : (
            <circle key={i} cx={px(s.lon)} cy={py(s.lat)} r="4.5" fill={c} stroke="#fff" strokeWidth="1">
              <title>{`${s.name}: ${format(v)}`}</title>
            </circle>
          );
        })}
      </svg>
      <figcaption className="lt-legend">
        {ramp.map((c, i) => (
          <span key={c}><i style={{ background: c }} />{i === 0 ? `≤ ${format(steps[0])}` : i === ramp.length - 1 ? `> ${format(steps[i - 1])}` : `${format(steps[i - 1])}–${format(steps[i])}`}</span>
        ))}
      </figcaption>
    </figure>
  );
}
