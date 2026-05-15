// Minimal ambient type declarations for the 'astronomia' package (no @types available).

declare module 'astronomia' {
  interface AstronomiaCoord {
    ra: number
    dec: number
    range?: number
    elongation?: number
  }

  interface EllipticElementsInput {
    axis: number
    ecc: number
    inc: number
    argP: number
    node: number
    timeP: number
  }

  interface EllipticElementsInstance {
    position(jde: number, earth: unknown): AstronomiaCoord
  }

  interface EllipticNamespace {
    Elements: new (elements: EllipticElementsInput) => EllipticElementsInstance
  }

  interface PlanetpositionNamespace {
    Planet: new (data: unknown) => unknown
  }

  export const elliptic: EllipticNamespace
  export const planetposition: PlanetpositionNamespace
}

declare module 'astronomia/data/vsop87Bearth' {
  const vsop87Bearth: unknown
  export default vsop87Bearth
}
