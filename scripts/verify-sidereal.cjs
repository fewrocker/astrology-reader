// Compare sidereal time from astronomy-engine vs astronomia (Meeus-based)
const A = require('astronomy-engine');

// Try to compute GMST from scratch using Meeus formula
const utcDate = new Date(Date.UTC(1993, 9, 27, 12, 24, 0));
const time = A.MakeTime(utcDate);

// astronomy-engine GAST
const gast = A.SiderealTime(time);
console.log('astronomy-engine SiderealTime:', gast.toFixed(8), 'hours');
console.log('astronomy-engine SiderealTime:', (gast * 15).toFixed(4), 'degrees');

// Manual GMST calculation (Meeus formula)
// JD for Oct 27, 1993, 12:24 UTC
// First: JD for 0h UT
const y = 1993, m = 10, d = 27;
const aa = Math.floor(y / 100);
const b = 2 - aa + Math.floor(aa / 4);
const jd0 = Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + d + b - 1524.5;
console.log('\nJD at 0h UT:', jd0);

const jd = jd0 + 12.4 / 24;
console.log('JD at 12:24 UT:', jd.toFixed(6));

// GMST at 0h UT (in hours)
const T0 = (jd0 - 2451545.0) / 36525;
console.log('T (centuries from J2000):', T0.toFixed(10));

// Meeus formula for GMST at 0h UT (in seconds of time)
const theta0_s = 24110.54841 + 8640184.812866 * T0 + 0.093104 * T0*T0 - 6.2e-6 * T0*T0*T0;
let gmst0_h = (theta0_s / 3600) % 24;
if (gmst0_h < 0) gmst0_h += 24;
console.log('GMST at 0h UT:', gmst0_h.toFixed(8), 'hours');

// Add sidereal time for 12h24m UT
const ut_hours = 12 + 24/60;
const sidereal_elapsed = ut_hours * 1.00273790935;
const gmst = (gmst0_h + sidereal_elapsed) % 24;
console.log('GMST at 12:24 UT:', gmst.toFixed(8), 'hours');
console.log('GMST at 12:24 UT:', (gmst * 15).toFixed(4), 'degrees');

// GAST = GMST + equation of equinoxes
// For now, just check if the difference between our GMST and astronomy-engine's value
// is significant
console.log('\nDifference (A.E. - manual):', ((gast - gmst) * 3600).toFixed(2), 'seconds of time');
console.log('Difference in degrees:', ((gast - gmst) * 15).toFixed(4));

// Now compute MC with both approaches
const lng = -43.9345;
const lat = -19.9167;
const oblRad = 23.4393 * Math.PI / 180;

function computeMC(lstDeg) {
  const lstRad = lstDeg * Math.PI / 180;
  let mc = Math.atan2(Math.sin(lstRad), Math.cos(lstRad) * Math.cos(oblRad)) * 180 / Math.PI;
  return ((mc % 360) + 360) % 360;
}

function computeASC(lstDeg) {
  const lstRad = lstDeg * Math.PI / 180;
  const latRad = lat * Math.PI / 180;
  const y = -Math.cos(lstRad);
  const x = Math.sin(lstRad) * Math.cos(oblRad) + Math.tan(latRad) * Math.sin(oblRad);
  let asc = Math.atan2(y, x) * 180 / Math.PI;
  return ((asc % 360) + 360) % 360;
}

const lst_ae = (gast + lng/15) * 15;
const lst_manual = (gmst + lng/15) * 15;

console.log('\n--- With astronomy-engine GAST ---');
console.log('LST:', ((lst_ae % 360 + 360) % 360).toFixed(4), 'degrees');
console.log('MC: ', computeMC(((lst_ae % 360 + 360) % 360)).toFixed(4));
console.log('ASC:', computeASC(((lst_ae % 360 + 360) % 360)).toFixed(4));

console.log('\n--- With manual GMST ---');
console.log('LST:', ((lst_manual % 360 + 360) % 360).toFixed(4), 'degrees');
console.log('MC: ', computeMC(((lst_manual % 360 + 360) % 360)).toFixed(4));
console.log('ASC:', computeASC(((lst_manual % 360 + 360) % 360)).toFixed(4));

// What RAMC would give MC = 207.75?
// MC = atan2(sin(RAMC), cos(RAMC)*cos(ε))
// For MC = 207.75° we need:
// sin(RAMC) = sin(207.75°)*cos(oblRad)?  No...
// Going backward: for a given MC, find the RAMC
// tan(RAMC) = cos(ε) * tan(MC)
const expectedMC = 207.75 * Math.PI / 180;
const neededRAMC_rad = Math.atan2(Math.cos(oblRad) * Math.sin(expectedMC), Math.cos(expectedMC));
let neededRAMC = neededRAMC_rad * 180 / Math.PI;
neededRAMC = ((neededRAMC % 360) + 360) % 360;
console.log('\nFor MC=207.75°, RAMC would need to be:', neededRAMC.toFixed(4), 'degrees');
console.log('Which is LST:', (neededRAMC / 15).toFixed(4), 'hours');
console.log('Our LST is:', ((lst_ae % 360 + 360) % 360 / 15).toFixed(4), 'hours');
console.log('Difference:', (neededRAMC - ((lst_ae % 360 + 360) % 360)).toFixed(4), 'degrees');

// Test: what if RAMC should be GAST*15 + longitude (in degrees)?
// Check if SiderealTime gives something different than expected
console.log('\n--- Sanity check: SiderealTime at J2000.0 ---');
const j2000 = A.MakeTime(new Date(Date.UTC(2000, 0, 1, 12, 0, 0)));
console.log('GAST at J2000:', A.SiderealTime(j2000).toFixed(8), '(expected ~18.6973 hours)');
