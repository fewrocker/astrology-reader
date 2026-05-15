import * as Astronomy from 'astronomy-engine';
import { normalizeAngle } from './zodiac';
/**
 * Get geocentric ecliptic longitude for a planet at a given time.
 * Uses GeoVector (geocentric equatorial J2000) → Ecliptic conversion.
 * EclipticLongitude() is heliocentric and wrong for natal charts.
 */
export function getPlanetLongitude(body, time) {
    if (body === Astronomy.Body.Sun) {
        return Astronomy.SunPosition(time).elon;
    }
    if (body === Astronomy.Body.Moon) {
        return Astronomy.EclipticGeoMoon(time).lon;
    }
    const geo = Astronomy.GeoVector(body, time, true);
    return Astronomy.Ecliptic(geo).elon;
}
/**
 * Calculate Mean Lunar Node (North Node) longitude using the five-term polynomial.
 * T is Julian centuries from J2000.0.
 */
export function getMeanNodeLongitude(time) {
    const T = time.tt / 36525;
    const omega = 125.0445479
        - 1934.1362891 * T
        + 0.0020754 * T * T
        + T * T * T / 467441
        - T * T * T * T / 60616000;
    return normalizeAngle(omega);
}
/**
 * Calculate daily motion in degrees (positive = direct, negative = retrograde).
 * Computes the longitude delta over a 24-hour window, normalized to [-180, 180].
 */
export function getDailyMotion(body, time) {
    const lon1 = getPlanetLongitude(body, time);
    const timePlus = Astronomy.MakeTime(new Date(time.date.getTime() + 86400000));
    const lon2 = getPlanetLongitude(body, timePlus);
    let diff = lon2 - lon1;
    if (diff > 180)
        diff -= 360;
    if (diff < -180)
        diff += 360;
    return diff;
}
/**
 * Determine which house (1–12) a longitude falls in given an array of cusp longitudes.
 * cusps must be ordered 1st through 12th; wraps around 360° correctly.
 */
export function getHouseForLongitude(longitude, cusps) {
    for (let i = 0; i < 12; i++) {
        const nextI = (i + 1) % 12;
        const start = cusps[i];
        const end = cusps[nextI];
        if (start < end) {
            if (longitude >= start && longitude < end)
                return i + 1;
        }
        else {
            // Wraps around 360°
            if (longitude >= start || longitude < end)
                return i + 1;
        }
    }
    return 1;
}
