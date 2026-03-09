import { describe, it } from 'vitest';
import { computeScleralLens } from './formulas.js';

const f = (v) => v != null ? +Number(v).toFixed(4) : null;
const val = (x) => (x && typeof x === 'object' && 'value' in x) ? x.value : x;

const rows = [
  { row: 1, bc: 7.10, sphere: -0.5,  diam: 13.4, oz: 8.4, design: 1, zones: 3, toricity: 0,     mode: 'diop'   },
  { row: 2, bc: 6.90, sphere: -5.0,  diam: 13.4, oz: 8.4, design: 2, zones: 3, toricity: 0,     mode: 'diop'   },
  { row: 3, bc: 7.03, sphere: -8.0,  diam: 16.4, oz: 9.4, design: 3, zones: 3, toricity: 0,     mode: 'diop'   },
  { row: 4, bc: 7.34, sphere: -9.25, diam: 16.4, oz: 9.4, design: 4, zones: 3, toricity: 0,     mode: 'diop'   },
  { row: 5, bc: 7.18, sphere: -11.5, diam: 16.4, oz: 9.4, design: 1, zones: 3, toricity: 0,     mode: 'diop'   },
  { row: 6, bc: 7.64, sphere: -4.5,  diam: 16.4, oz: 9.4, design: 2, zones: 4, toricity: -2.25, mode: 'diop'   },
  { row: 7, bc: 7.81, sphere: -3.0,  diam: 16.4, oz: 9.4, design: 3, zones: 4, toricity: -1.5,  mode: 'diop'   },
  { row: 8, bc: 7.50, sphere: -10.0, diam: 16.4, oz: 9.0, design: 4, zones: 4, toricity: -4.75, mode: 'diop'   },
  { row: 9, bc: 7.10, sphere: -0.5,  diam: 13.4, oz: 8.4, design: 1, zones: 4, toricity: -100,  mode: 'micron' },
];

describe('Entry HAI-SCL all rows', () => {
  for (const r of rows) {
    it(`Row ${r.row} | BC=${r.bc} Sph=${r.sphere} Diam=${r.diam} OZ=${r.oz} D=${r.design} Z=${r.zones} Tor=${r.toricity}(${r.mode})`, () => {
      const res = computeScleralLens({
        baseCurve: r.bc, sphere: r.sphere, cylinder: 0,
        diam: r.diam, oz: r.oz, designType: r.design, zones: r.zones,
        zone1Toricity: r.toricity, zone2Toricity: r.toricity,
        zone3Toricity: r.toricity, zone4Toricity: r.toricity, pcToricity: r.toricity,
        toricMode: r.mode,
      });

      const is4 = r.zones === 4;
      console.log(`\n=== ROW ${r.row} (${res._inputs.designName}, ${r.zones}-zone) ===`);
      console.log(`  Radii  : RC1=${f(val(res.RC1_radius))}  AC1=${f(val(res.AC1_radius))}  AC2=${f(val(res.AC2_radius))}${is4 ? `  AC3=${f(val(res.AC3_radius))}` : ''}  PC1=${f(val(res.PC1_radius))}`);
      if (r.toricity !== 0)
        console.log(`  Toric  : RC1t=${f(val(res.RC1_tor))}  AC1t=${f(val(res.AC1_tor))}  AC2t=${f(val(res.AC2_tor))}${is4 ? `  AC3t=${f(val(res.AC3_tor))}` : ''}`);
      console.log(`  Widths : W1=${f(val(res.RC1_width))}  W2=${f(val(res.AC1_width))}  W3=${f(val(res.AC2_width))}${is4 ? `  W4=${f(val(res.AC3_width))}` : ''}  PCw=${f(val(res.PC_width))}`);
      console.log(`  Sag    : full=${f(res.sagSum_spherical)}  shift=${f(res.sagSum_spherical2)}`);
      console.log(`  SagDiff: sph=${f(res.sagDiff_spherical)}  tor=${f(res.sagDiff_toric)}`);
      console.log(`  CT     : ${f(res.centerThickness)}`);
    });
  }
});
