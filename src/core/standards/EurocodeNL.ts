/**
 * Eurocode NL (NEN-EN) Standards Data
 * Reference values for structural design according to Dutch national annex
 */

// NEN-EN 1990 NB — Partial factors for ULS
export interface ILoadFactorSet {
  name: string;
  description: string;
  gammaG: number;     // Permanent actions
  gammaQ: number;     // Variable actions (leading)
  gammaQ_acc: number; // Variable actions (accompanying)
  psi0: number;       // Combination factor
}

export const ULS_LOAD_FACTORS: ILoadFactorSet[] = [
  {
    name: '6.10a',
    description: 'ULS combination 6.10a (NEN-EN 1990)',
    gammaG: 1.35,
    gammaQ: 1.5,
    gammaQ_acc: 1.5,
    psi0: 0.0
  },
  {
    name: '6.10b',
    description: 'ULS combination 6.10b (NEN-EN 1990)',
    gammaG: 1.2,
    gammaQ: 1.5,
    gammaQ_acc: 1.5,
    psi0: 0.0
  },
  {
    name: 'EQU',
    description: 'Equilibrium check',
    gammaG: 0.9,
    gammaQ: 1.5,
    gammaQ_acc: 1.5,
    psi0: 0.0
  }
];

// Psi-factors (NEN-EN 1990 NB Table A.1.1)
export interface IPsiFactors {
  category: string;
  description: string;
  psi0: number;
  psi1: number;
  psi2: number;
}

export const PSI_FACTORS: IPsiFactors[] = [
  { category: 'A', description: 'Woonruimten', psi0: 0.4, psi1: 0.5, psi2: 0.3 },
  { category: 'B', description: 'Kantoorruimten', psi0: 0.5, psi1: 0.5, psi2: 0.3 },
  { category: 'C', description: 'Bijeenkomstruimten', psi0: 0.6, psi1: 0.7, psi2: 0.6 },
  { category: 'D', description: 'Winkelruimten', psi0: 0.6, psi1: 0.7, psi2: 0.6 },
  { category: 'E', description: 'Opslagruimten', psi0: 1.0, psi1: 0.9, psi2: 0.8 },
  { category: 'F', description: 'Verkeersruimten (< 30 kN)', psi0: 0.6, psi1: 0.7, psi2: 0.6 },
  { category: 'G', description: 'Verkeersruimten (30-160 kN)', psi0: 0.7, psi1: 0.5, psi2: 0.3 },
  { category: 'H', description: 'Daken', psi0: 0.0, psi1: 0.0, psi2: 0.0 },
  { category: 'Wind', description: 'Windbelasting', psi0: 0.0, psi1: 0.2, psi2: 0.0 },
  { category: 'Sneeuw', description: 'Sneeuwbelasting (NL)', psi0: 0.0, psi1: 0.2, psi2: 0.0 },
];

// Steel grades (NEN-EN 1993-1-1)
export interface ISteelGrade {
  name: string;
  fy: number;       // Yield strength (MPa) for t <= 40mm
  fu: number;       // Ultimate tensile strength (MPa)
  gammaM0: number;  // Partial factor for cross-section resistance
  gammaM1: number;  // Partial factor for member resistance
  gammaM2: number;  // Partial factor for connection resistance
}

export const STEEL_GRADES: ISteelGrade[] = [
  { name: 'S235', fy: 235, fu: 360, gammaM0: 1.0, gammaM1: 1.0, gammaM2: 1.25 },
  { name: 'S275', fy: 275, fu: 430, gammaM0: 1.0, gammaM1: 1.0, gammaM2: 1.25 },
  { name: 'S355', fy: 355, fu: 510, gammaM0: 1.0, gammaM1: 1.0, gammaM2: 1.25 },
  { name: 'S420', fy: 420, fu: 520, gammaM0: 1.0, gammaM1: 1.0, gammaM2: 1.25 },
  { name: 'S460', fy: 460, fu: 540, gammaM0: 1.0, gammaM1: 1.0, gammaM2: 1.25 },
];

// Consequence classes (NEN-EN 1990)
export interface IConsequenceClass {
  name: string;
  description: string;
  KFI: number;      // Factor for actions
  examples: string;
}

export const CONSEQUENCE_CLASSES: IConsequenceClass[] = [
  {
    name: 'CC1',
    description: 'Lage gevolgen',
    KFI: 0.9,
    examples: 'Landbouwgebouwen, opslagloodsen'
  },
  {
    name: 'CC2',
    description: 'Gemiddelde gevolgen',
    KFI: 1.0,
    examples: 'Woningen, kantoren, winkels'
  },
  {
    name: 'CC3',
    description: 'Hoge gevolgen',
    KFI: 1.1,
    examples: 'Publieke gebouwen, tribunes, concertzalen'
  }
];
