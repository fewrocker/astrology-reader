const A = require('astronomy-engine');
const lat = -19.9167, lng = -43.9345;
const utcDate = new Date(Date.UTC(1993, 9, 27, 12, 24, 0));
const time = A.MakeTime(utcDate);

const signs = ['Ari','Tau','Gem','Can','Leo','Vir','Lib','Sco','Sag','Cap','Aqu','Pis'];
function fmt(lon) {
  const n = ((lon % 360) + 360) % 360;
  const si = Math.floor(n / 30);
  const d = Math.floor(n - si * 30);
  const m = Math.floor((n - si * 30 - d) * 60);
  return signs[si] + ' ' + d + 'd' + String(m).padStart(2,'0') + 'm (' + n.toFixed(2) + ')';
}

// Dynamic obliquity
const tilt = A.e_tilt(time);
const obliquity = tilt.mobl;
console.log('Mean obliquity:', obliquity.toFixed(6));
const oblRad = obliquity * Math.PI / 180;

// FIXED: Use GeoVector + Ecliptic for geocentric ecliptic longitude
function geoEclLon(body) {
  const geo = A.GeoVector(body, time, true);
  return A.Ecliptic(geo).elon;
}

console.log('\n--- PLANET POSITIONS (geocentric) ---');
const bodies = [
  ['Sun', A.Body.Sun],
  ['Moon', A.Body.Moon],
  ['Mercury', A.Body.Mercury],
  ['Venus', A.Body.Venus],
  ['Mars', A.Body.Mars],
  ['Jupiter', A.Body.Jupiter],
  ['Saturn', A.Body.Saturn],
  ['Uranus', A.Body.Uranus],
  ['Neptune', A.Body.Neptune],
  ['Pluto', A.Body.Pluto],
];

const expected = {
  Sun:     214.10, Moon:    1.35,  Mercury: 232.33, Venus:   194.30,
  Mars:    230.97, Jupiter: 207.02, Saturn:  323.63, Uranus:  288.60,
  Neptune: 288.57, Pluto:   234.58,
};

for (const [name, body] of bodies) {
  let lon;
  if (name === 'Sun') lon = A.SunPosition(time).elon;
  else if (name === 'Moon') lon = A.EclipticGeoMoon(time).lon;
  else lon = geoEclLon(body);
  const diff = Math.abs(lon - expected[name]);
  const status = diff < 0.1 ? '✓' : '✗ (off by ' + diff.toFixed(2) + ')';
  console.log(name.padEnd(10) + ': ' + fmt(lon) + '  ' + status);
}

// --- ASC / MC ---
const gst = A.SiderealTime(time);
const lst = gst + lng / 15;
const lstDeg = ((lst * 15) % 360 + 360) % 360;
const latRad = lat * Math.PI / 180;
const lstRad = lstDeg * Math.PI / 180;

// FIXED ASC: negate both arguments for correct quadrant
const yA = Math.cos(lstRad);
const xA = -(Math.sin(lstRad) * Math.cos(oblRad) + Math.tan(latRad) * Math.sin(oblRad));
let asc = Math.atan2(yA, xA) * 180 / Math.PI;
asc = ((asc % 360) + 360) % 360;

// MC (unchanged formula)
let mc = Math.atan2(Math.sin(lstRad), Math.cos(lstRad) * Math.cos(oblRad)) * 180 / Math.PI;
mc = ((mc % 360) + 360) % 360;

console.log('\n--- ANGLES ---');
console.log('ASC:', fmt(asc), ' Expected: Cap ~6d (276.33)');
console.log('MC: ', fmt(mc), ' Expected: Lib ~27d (207.75)');
console.log('DSC:', fmt((asc + 180) % 360));
console.log('IC: ', fmt((mc + 180) % 360));

