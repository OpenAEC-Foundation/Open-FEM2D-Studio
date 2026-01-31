import { useState } from 'react';
import { IBeamSection } from '../../core/fem/types';
import { SectionPreview } from './SectionPreview';
import './SectionDialog.css';

type MaterialCategory = 'steel' | 'wood' | 'concrete' | 'composite' | 'other';

interface ProfileEntry {
  name: string;
  section: IBeamSection;
  b?: number;       // width in mm
  tf?: number;      // flange thickness in mm
  tw?: number;      // web thickness in mm
  weight?: number;  // kg/m
  Wel?: number;     // elastic section modulus m³
  shapeType?: 'I' | 'rectangular' | 'hollow';
}

interface ProfileGroup {
  label: string;
  profiles: ProfileEntry[];
}

type MaterialCatalog = Record<string, ProfileGroup>;

// Helper: rectangular section from b×h in mm
function rect(bMm: number, hMm: number): IBeamSection {
  const b = bMm / 1000;
  const h = hMm / 1000;
  return { A: b * h, I: (b * h * h * h) / 12, h };
}

// ── Steel profiles ──────────────────────────────────────────────────
const STEEL_CATALOG: MaterialCatalog = {
  ipe: {
    label: 'IPE',
    profiles: [
      { name: 'IPE 100', section: { A: 10.3e-4, I: 171e-8, h: 0.100 }, b: 55, tf: 5.7, tw: 4.1, weight: 8.1, Wel: 34.2e-6, shapeType: 'I' },
      { name: 'IPE 120', section: { A: 13.2e-4, I: 318e-8, h: 0.120 }, b: 64, tf: 6.3, tw: 4.4, weight: 10.4, Wel: 53.0e-6, shapeType: 'I' },
      { name: 'IPE 140', section: { A: 16.4e-4, I: 541e-8, h: 0.140 }, b: 73, tf: 6.9, tw: 4.7, weight: 12.9, Wel: 77.3e-6, shapeType: 'I' },
      { name: 'IPE 160', section: { A: 20.1e-4, I: 869e-8, h: 0.160 }, b: 82, tf: 7.4, tw: 5.0, weight: 15.8, Wel: 109e-6, shapeType: 'I' },
      { name: 'IPE 180', section: { A: 23.9e-4, I: 1320e-8, h: 0.180 }, b: 91, tf: 8.0, tw: 5.3, weight: 18.8, Wel: 146e-6, shapeType: 'I' },
      { name: 'IPE 200', section: { A: 28.5e-4, I: 1940e-8, h: 0.200 }, b: 100, tf: 8.5, tw: 5.6, weight: 22.4, Wel: 194e-6, shapeType: 'I' },
      { name: 'IPE 220', section: { A: 33.4e-4, I: 2770e-8, h: 0.220 }, b: 110, tf: 9.2, tw: 5.9, weight: 26.2, Wel: 252e-6, shapeType: 'I' },
      { name: 'IPE 240', section: { A: 39.1e-4, I: 3890e-8, h: 0.240 }, b: 120, tf: 9.8, tw: 6.2, weight: 30.7, Wel: 324e-6, shapeType: 'I' },
      { name: 'IPE 270', section: { A: 45.9e-4, I: 5790e-8, h: 0.270 }, b: 135, tf: 10.2, tw: 6.6, weight: 36.1, Wel: 429e-6, shapeType: 'I' },
      { name: 'IPE 300', section: { A: 53.8e-4, I: 8360e-8, h: 0.300 }, b: 150, tf: 10.7, tw: 7.1, weight: 42.2, Wel: 557e-6, shapeType: 'I' },
      { name: 'IPE 330', section: { A: 62.6e-4, I: 11770e-8, h: 0.330 }, b: 160, tf: 11.5, tw: 7.5, weight: 49.1, Wel: 713e-6, shapeType: 'I' },
      { name: 'IPE 360', section: { A: 72.7e-4, I: 16270e-8, h: 0.360 }, b: 170, tf: 12.7, tw: 8.0, weight: 57.1, Wel: 904e-6, shapeType: 'I' },
      { name: 'IPE 400', section: { A: 84.5e-4, I: 23130e-8, h: 0.400 }, b: 180, tf: 13.5, tw: 8.6, weight: 66.3, Wel: 1160e-6, shapeType: 'I' },
      { name: 'IPE 450', section: { A: 98.8e-4, I: 33740e-8, h: 0.450 }, b: 190, tf: 14.6, tw: 9.4, weight: 77.6, Wel: 1500e-6, shapeType: 'I' },
      { name: 'IPE 500', section: { A: 115.5e-4, I: 48200e-8, h: 0.500 }, b: 200, tf: 16.0, tw: 10.2, weight: 90.7, Wel: 1930e-6, shapeType: 'I' },
      { name: 'IPE 550', section: { A: 134.4e-4, I: 67120e-8, h: 0.550 }, b: 210, tf: 17.2, tw: 11.1, weight: 106, Wel: 2440e-6, shapeType: 'I' },
      { name: 'IPE 600', section: { A: 156.0e-4, I: 92080e-8, h: 0.600 }, b: 220, tf: 19.0, tw: 12.0, weight: 122, Wel: 3070e-6, shapeType: 'I' },
    ],
  },
  hea: {
    label: 'HEA',
    profiles: [
      { name: 'HEA 100', section: { A: 21.2e-4, I: 349e-8, h: 0.096 }, b: 100, tf: 8.0, tw: 5.0, weight: 16.7, shapeType: 'I' },
      { name: 'HEA 120', section: { A: 25.3e-4, I: 606e-8, h: 0.114 }, b: 120, tf: 8.0, tw: 5.0, weight: 19.9, shapeType: 'I' },
      { name: 'HEA 140', section: { A: 31.4e-4, I: 1030e-8, h: 0.133 }, b: 140, tf: 8.5, tw: 5.5, weight: 24.7, shapeType: 'I' },
      { name: 'HEA 160', section: { A: 38.8e-4, I: 1670e-8, h: 0.152 }, b: 160, tf: 9.0, tw: 6.0, weight: 30.4, shapeType: 'I' },
      { name: 'HEA 180', section: { A: 45.3e-4, I: 2510e-8, h: 0.171 }, b: 180, tf: 9.5, tw: 6.0, weight: 35.5, shapeType: 'I' },
      { name: 'HEA 200', section: { A: 53.8e-4, I: 3690e-8, h: 0.190 }, b: 200, tf: 10.0, tw: 6.5, weight: 42.3, shapeType: 'I' },
      { name: 'HEA 220', section: { A: 64.3e-4, I: 5410e-8, h: 0.210 }, b: 220, tf: 11.0, tw: 7.0, weight: 50.5, shapeType: 'I' },
      { name: 'HEA 240', section: { A: 76.8e-4, I: 7760e-8, h: 0.230 }, b: 240, tf: 12.0, tw: 7.5, weight: 60.3, shapeType: 'I' },
      { name: 'HEA 260', section: { A: 86.8e-4, I: 10450e-8, h: 0.250 }, b: 260, tf: 12.5, tw: 7.5, weight: 68.2, shapeType: 'I' },
      { name: 'HEA 280', section: { A: 97.3e-4, I: 13670e-8, h: 0.270 }, b: 280, tf: 13.0, tw: 8.0, weight: 76.4, shapeType: 'I' },
      { name: 'HEA 300', section: { A: 112.5e-4, I: 18260e-8, h: 0.290 }, b: 300, tf: 14.0, tw: 8.5, weight: 88.3, shapeType: 'I' },
      { name: 'HEA 320', section: { A: 124.4e-4, I: 22930e-8, h: 0.310 }, b: 300, tf: 15.5, tw: 9.0, weight: 97.6, shapeType: 'I' },
      { name: 'HEA 340', section: { A: 133.5e-4, I: 27690e-8, h: 0.330 }, b: 300, tf: 16.5, tw: 9.5, weight: 105, shapeType: 'I' },
      { name: 'HEA 360', section: { A: 142.8e-4, I: 33090e-8, h: 0.350 }, b: 300, tf: 17.5, tw: 10.0, weight: 112, shapeType: 'I' },
      { name: 'HEA 400', section: { A: 159.0e-4, I: 45070e-8, h: 0.390 }, b: 300, tf: 19.0, tw: 11.0, weight: 125, shapeType: 'I' },
    ],
  },
  heb: {
    label: 'HEB',
    profiles: [
      { name: 'HEB 100', section: { A: 26.0e-4, I: 450e-8, h: 0.100 }, b: 100, tf: 10.0, tw: 6.0, weight: 20.4, shapeType: 'I' },
      { name: 'HEB 120', section: { A: 34.0e-4, I: 864e-8, h: 0.120 }, b: 120, tf: 11.0, tw: 6.5, weight: 26.7, shapeType: 'I' },
      { name: 'HEB 140', section: { A: 43.0e-4, I: 1510e-8, h: 0.140 }, b: 140, tf: 12.0, tw: 7.0, weight: 33.7, shapeType: 'I' },
      { name: 'HEB 160', section: { A: 54.3e-4, I: 2490e-8, h: 0.160 }, b: 160, tf: 13.0, tw: 8.0, weight: 42.6, shapeType: 'I' },
      { name: 'HEB 180', section: { A: 65.3e-4, I: 3830e-8, h: 0.180 }, b: 180, tf: 14.0, tw: 8.5, weight: 51.2, shapeType: 'I' },
      { name: 'HEB 200', section: { A: 78.1e-4, I: 5700e-8, h: 0.200 }, b: 200, tf: 15.0, tw: 9.0, weight: 61.3, shapeType: 'I' },
      { name: 'HEB 220', section: { A: 91.0e-4, I: 8090e-8, h: 0.220 }, b: 220, tf: 16.0, tw: 9.5, weight: 71.5, shapeType: 'I' },
      { name: 'HEB 240', section: { A: 106.0e-4, I: 11260e-8, h: 0.240 }, b: 240, tf: 17.0, tw: 10.0, weight: 83.2, shapeType: 'I' },
      { name: 'HEB 260', section: { A: 118.4e-4, I: 14920e-8, h: 0.260 }, b: 260, tf: 17.5, tw: 10.0, weight: 93.0, shapeType: 'I' },
      { name: 'HEB 280', section: { A: 131.4e-4, I: 19270e-8, h: 0.280 }, b: 280, tf: 18.0, tw: 10.5, weight: 103, shapeType: 'I' },
      { name: 'HEB 300', section: { A: 149.1e-4, I: 25170e-8, h: 0.300 }, b: 300, tf: 19.0, tw: 11.0, weight: 117, shapeType: 'I' },
      { name: 'HEB 320', section: { A: 161.3e-4, I: 30820e-8, h: 0.320 }, b: 300, tf: 20.5, tw: 11.5, weight: 127, shapeType: 'I' },
      { name: 'HEB 340', section: { A: 170.9e-4, I: 36660e-8, h: 0.340 }, b: 300, tf: 21.5, tw: 12.0, weight: 134, shapeType: 'I' },
      { name: 'HEB 360', section: { A: 180.6e-4, I: 43190e-8, h: 0.360 }, b: 300, tf: 22.5, tw: 12.5, weight: 142, shapeType: 'I' },
      { name: 'HEB 400', section: { A: 197.8e-4, I: 57680e-8, h: 0.400 }, b: 300, tf: 24.0, tw: 13.5, weight: 155, shapeType: 'I' },
    ],
  },
  koker: {
    label: 'Koker',
    profiles: [
      { name: 'SHS 80x80x4', section: { A: 11.7e-4, I: 115e-8, h: 0.080 }, b: 80, tw: 4, shapeType: 'hollow' },
      { name: 'SHS 100x100x5', section: { A: 18.7e-4, I: 293e-8, h: 0.100 }, b: 100, tw: 5, shapeType: 'hollow' },
      { name: 'SHS 120x120x5', section: { A: 22.7e-4, I: 518e-8, h: 0.120 }, b: 120, tw: 5, shapeType: 'hollow' },
      { name: 'SHS 150x150x6', section: { A: 33.4e-4, I: 1200e-8, h: 0.150 }, b: 150, tw: 6, shapeType: 'hollow' },
      { name: 'SHS 200x200x8', section: { A: 58.8e-4, I: 3720e-8, h: 0.200 }, b: 200, tw: 8, shapeType: 'hollow' },
      { name: 'SHS 250x250x10', section: { A: 91.0e-4, I: 9060e-8, h: 0.250 }, b: 250, tw: 10, shapeType: 'hollow' },
      { name: 'SHS 300x300x10', section: { A: 110.0e-4, I: 15700e-8, h: 0.300 }, b: 300, tw: 10, shapeType: 'hollow' },
      { name: 'RHS 100x50x4', section: { A: 11.0e-4, I: 169e-8, h: 0.100 }, b: 50, tw: 4, shapeType: 'hollow' },
      { name: 'RHS 120x60x5', section: { A: 16.7e-4, I: 361e-8, h: 0.120 }, b: 60, tw: 5, shapeType: 'hollow' },
      { name: 'RHS 150x100x6', section: { A: 28.1e-4, I: 1040e-8, h: 0.150 }, b: 100, tw: 6, shapeType: 'hollow' },
      { name: 'RHS 200x100x8', section: { A: 43.2e-4, I: 2590e-8, h: 0.200 }, b: 100, tw: 8, shapeType: 'hollow' },
      { name: 'RHS 250x150x8', section: { A: 58.4e-4, I: 6460e-8, h: 0.250 }, b: 150, tw: 8, shapeType: 'hollow' },
      { name: 'RHS 300x200x10', section: { A: 91.0e-4, I: 14400e-8, h: 0.300 }, b: 200, tw: 10, shapeType: 'hollow' },
    ],
  },
  custom: { label: 'Handmatig', profiles: [] },
};

// ── Wood profiles (rectangular) ─────────────────────────────────────
const WOOD_CATALOG: MaterialCatalog = {
  rect38: {
    label: '38 mm',
    profiles: [
      { name: '38x89', section: rect(38, 89), b: 38, shapeType: 'rectangular' },
      { name: '38x140', section: rect(38, 140), b: 38, shapeType: 'rectangular' },
      { name: '38x184', section: rect(38, 184), b: 38, shapeType: 'rectangular' },
      { name: '38x235', section: rect(38, 235), b: 38, shapeType: 'rectangular' },
      { name: '38x286', section: rect(38, 286), b: 38, shapeType: 'rectangular' },
    ],
  },
  rect50: {
    label: '50 mm',
    profiles: [
      { name: '50x100', section: rect(50, 100), b: 50, shapeType: 'rectangular' },
      { name: '50x150', section: rect(50, 150), b: 50, shapeType: 'rectangular' },
      { name: '50x200', section: rect(50, 200), b: 50, shapeType: 'rectangular' },
      { name: '50x250', section: rect(50, 250), b: 50, shapeType: 'rectangular' },
      { name: '50x300', section: rect(50, 300), b: 50, shapeType: 'rectangular' },
    ],
  },
  rect63: {
    label: '63 mm',
    profiles: [
      { name: '63x150', section: rect(63, 150), b: 63, shapeType: 'rectangular' },
      { name: '63x175', section: rect(63, 175), b: 63, shapeType: 'rectangular' },
      { name: '63x200', section: rect(63, 200), b: 63, shapeType: 'rectangular' },
      { name: '63x225', section: rect(63, 225), b: 63, shapeType: 'rectangular' },
    ],
  },
  rect75: {
    label: '75 mm',
    profiles: [
      { name: '75x150', section: rect(75, 150), b: 75, shapeType: 'rectangular' },
      { name: '75x200', section: rect(75, 200), b: 75, shapeType: 'rectangular' },
      { name: '75x225', section: rect(75, 225), b: 75, shapeType: 'rectangular' },
      { name: '75x250', section: rect(75, 250), b: 75, shapeType: 'rectangular' },
      { name: '75x300', section: rect(75, 300), b: 75, shapeType: 'rectangular' },
    ],
  },
  rect100: {
    label: '100 mm',
    profiles: [
      { name: '100x200', section: rect(100, 200), b: 100, shapeType: 'rectangular' },
      { name: '100x250', section: rect(100, 250), b: 100, shapeType: 'rectangular' },
      { name: '100x300', section: rect(100, 300), b: 100, shapeType: 'rectangular' },
      { name: '100x400', section: rect(100, 400), b: 100, shapeType: 'rectangular' },
    ],
  },
  custom: { label: 'Handmatig', profiles: [] },
};

// ── Concrete profiles (rectangular) ─────────────────────────────────
const CONCRETE_CATALOG: MaterialCatalog = {
  rect200: {
    label: 'b=200',
    profiles: [
      { name: '200x300', section: rect(200, 300), b: 200, shapeType: 'rectangular' },
      { name: '200x400', section: rect(200, 400), b: 200, shapeType: 'rectangular' },
      { name: '200x500', section: rect(200, 500), b: 200, shapeType: 'rectangular' },
      { name: '200x600', section: rect(200, 600), b: 200, shapeType: 'rectangular' },
    ],
  },
  rect250: {
    label: 'b=250',
    profiles: [
      { name: '250x400', section: rect(250, 400), b: 250, shapeType: 'rectangular' },
      { name: '250x500', section: rect(250, 500), b: 250, shapeType: 'rectangular' },
      { name: '250x600', section: rect(250, 600), b: 250, shapeType: 'rectangular' },
      { name: '250x800', section: rect(250, 800), b: 250, shapeType: 'rectangular' },
    ],
  },
  rect300: {
    label: 'b=300',
    profiles: [
      { name: '300x400', section: rect(300, 400), b: 300, shapeType: 'rectangular' },
      { name: '300x500', section: rect(300, 500), b: 300, shapeType: 'rectangular' },
      { name: '300x600', section: rect(300, 600), b: 300, shapeType: 'rectangular' },
      { name: '300x800', section: rect(300, 800), b: 300, shapeType: 'rectangular' },
    ],
  },
  rect400: {
    label: 'b=400',
    profiles: [
      { name: '400x500', section: rect(400, 500), b: 400, shapeType: 'rectangular' },
      { name: '400x600', section: rect(400, 600), b: 400, shapeType: 'rectangular' },
      { name: '400x800', section: rect(400, 800), b: 400, shapeType: 'rectangular' },
      { name: '400x1000', section: rect(400, 1000), b: 400, shapeType: 'rectangular' },
    ],
  },
  custom: { label: 'Handmatig', profiles: [] },
};

// ── Composite / built-up sections ───────────────────────────────────
const COMPOSITE_CATALOG: MaterialCatalog = {
  custom: { label: 'Handmatig', profiles: [] },
};

// ── Other ───────────────────────────────────────────────────────────
const OTHER_CATALOG: MaterialCatalog = {
  custom: { label: 'Handmatig', profiles: [] },
};

// ── Material categories ─────────────────────────────────────────────
const MATERIALS: { key: MaterialCategory; label: string; catalog: MaterialCatalog }[] = [
  { key: 'steel', label: 'Staal', catalog: STEEL_CATALOG },
  { key: 'wood', label: 'Hout', catalog: WOOD_CATALOG },
  { key: 'concrete', label: 'Beton', catalog: CONCRETE_CATALOG },
  { key: 'composite', label: 'Samengesteld', catalog: COMPOSITE_CATALOG },
  { key: 'other', label: 'Overig', catalog: OTHER_CATALOG },
];

// ── Component ───────────────────────────────────────────────────────

// Steel quality grades
const STEEL_GRADES = [
  { name: 'S235', fy: 235 },
  { name: 'S275', fy: 275 },
  { name: 'S355', fy: 355 },
  { name: 'S420', fy: 420 },
  { name: 'S460', fy: 460 },
];

// Wood quality grades
const WOOD_GRADES = [
  { name: 'C18', fb: 18 },
  { name: 'C24', fb: 24 },
  { name: 'C30', fb: 30 },
  { name: 'GL24h', fb: 24 },
  { name: 'GL28h', fb: 28 },
  { name: 'GL32h', fb: 32 },
];

interface SectionDialogProps {
  onSelect: (section: IBeamSection, profileName: string) => void;
  onCancel: () => void;
}

export function SectionDialog({ onSelect, onCancel }: SectionDialogProps) {
  const [material, setMaterial] = useState<MaterialCategory>('steel');
  const [subCategory, setSubCategory] = useState<string>('ipe');
  const [selectedProfile, setSelectedProfile] = useState<string>('IPE 200');
  const [customA, setCustomA] = useState('28.5e-4');
  const [customI, setCustomI] = useState('1940e-8');
  const [customH, setCustomH] = useState('0.200');
  const [steelGrade, setSteelGrade] = useState('S235');
  const [woodGrade, setWoodGrade] = useState('C24');

  const currentMat = MATERIALS.find(m => m.key === material)!;
  const catalog = currentMat.catalog;
  const subKeys = Object.keys(catalog);
  const isCustom = subCategory === 'custom';
  const currentProfiles = catalog[subCategory]?.profiles || [];

  const activeProfile = currentProfiles.find(p => p.name === selectedProfile);

  const handleMaterialChange = (key: MaterialCategory) => {
    setMaterial(key);
    const cat = MATERIALS.find(m => m.key === key)!.catalog;
    const firstKey = Object.keys(cat)[0];
    setSubCategory(firstKey);
    const firstProfiles = cat[firstKey]?.profiles || [];
    if (firstProfiles.length > 0) {
      setSelectedProfile(firstProfiles[0].name);
    }
  };

  const handleSubCategoryChange = (key: string) => {
    setSubCategory(key);
    if (key !== 'custom') {
      const profiles = catalog[key]?.profiles || [];
      if (profiles.length > 0) {
        setSelectedProfile(profiles[0].name);
      }
    }
  };

  const handleConfirm = () => {
    if (isCustom) {
      const A = parseFloat(customA);
      const I = parseFloat(customI);
      const h = parseFloat(customH);
      if (isNaN(A) || isNaN(I) || isNaN(h) || A <= 0 || I <= 0 || h <= 0) return;
      onSelect({ A, I, h }, 'Custom');
      return;
    }

    const profile = currentProfiles.find(p => p.name === selectedProfile);
    if (profile) {
      let label = profile.name;
      if (material === 'steel') label = `${profile.name} (${steelGrade})`;
      if (material === 'wood') label = `${profile.name} (${woodGrade})`;
      onSelect(profile.section, label);
    }
  };

  return (
    <div className="section-dialog-overlay" onClick={onCancel}>
      <div className="section-dialog" onClick={e => e.stopPropagation()}>
        <div className="section-dialog-header">
          Doorsnede Profiel
        </div>

        <div className="section-dialog-body">
          {/* Material tabs */}
          <div className="section-material-tabs">
            {MATERIALS.map(m => (
              <button
                key={m.key}
                className={`section-material-tab ${material === m.key ? 'active' : ''}`}
                onClick={() => handleMaterialChange(m.key)}
              >
                {m.label}
              </button>
            ))}
          </div>

          {/* Sub-category tabs (only if more than just 'custom') */}
          {subKeys.length > 1 && (
            <div className="section-category-tabs">
              {subKeys.map(key => (
                <button
                  key={key}
                  className={`section-category-tab ${subCategory === key ? 'active' : ''}`}
                  onClick={() => handleSubCategoryChange(key)}
                >
                  {catalog[key].label}
                </button>
              ))}
            </div>
          )}

          {/* Quality grade selector */}
          {material === 'steel' && (
            <div className="section-grade-row">
              <span className="section-grade-label">Staalsoort:</span>
              <select
                className="section-grade-select"
                value={steelGrade}
                onChange={e => setSteelGrade(e.target.value)}
              >
                {STEEL_GRADES.map(g => (
                  <option key={g.name} value={g.name}>{g.name} (fy={g.fy} MPa)</option>
                ))}
              </select>
            </div>
          )}
          {material === 'wood' && (
            <div className="section-grade-row">
              <span className="section-grade-label">Houtklasse:</span>
              <select
                className="section-grade-select"
                value={woodGrade}
                onChange={e => setWoodGrade(e.target.value)}
              >
                {WOOD_GRADES.map(g => (
                  <option key={g.name} value={g.name}>{g.name} (fb={g.fb} MPa)</option>
                ))}
              </select>
            </div>
          )}

          {/* Two-column layout: left = list, right = preview + properties */}
          <div className="section-two-column">
            <div className="section-left-column">
              {!isCustom ? (
                <div className="section-profile-list">
                  {currentProfiles.map(p => (
                    <button
                      key={p.name}
                      className={`section-profile-item ${selectedProfile === p.name ? 'active' : ''}`}
                      onClick={() => setSelectedProfile(p.name)}
                    >
                      <span className="profile-name">{p.name}</span>
                      <span className="profile-props">
                        A={formatSci(p.section.A)} m&sup2;
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="section-custom-form">
                  <label>
                    <span>A (m&sup2;)</span>
                    <input type="text" value={customA} onChange={e => setCustomA(e.target.value)} />
                  </label>
                  <label>
                    <span>I (m&sup4;)</span>
                    <input type="text" value={customI} onChange={e => setCustomI(e.target.value)} />
                  </label>
                  <label>
                    <span>h (m)</span>
                    <input type="text" value={customH} onChange={e => setCustomH(e.target.value)} />
                  </label>
                </div>
              )}
            </div>

            {/* Right column: preview + properties */}
            {!isCustom && activeProfile && (
              <div className="section-right-column">
                <div className="section-preview-area">
                  <SectionPreview
                    shapeType={activeProfile.shapeType || 'rectangular'}
                    h={activeProfile.section.h * 1000}
                    b={activeProfile.b || activeProfile.section.h * 500}
                    tf={activeProfile.tf}
                    tw={activeProfile.tw}
                  />
                </div>
                <div className="section-properties">
                  <table className="section-props-table">
                    <tbody>
                      <tr><td>A</td><td>{formatSci(activeProfile.section.A)} m²</td></tr>
                      <tr><td>I</td><td>{formatSci(activeProfile.section.I)} m⁴</td></tr>
                      {activeProfile.Wel && <tr><td>W_el</td><td>{formatSci(activeProfile.Wel)} m³</td></tr>}
                      <tr><td>h</td><td>{(activeProfile.section.h * 1000).toFixed(0)} mm</td></tr>
                      {activeProfile.b && <tr><td>b</td><td>{activeProfile.b} mm</td></tr>}
                      {activeProfile.tf && <tr><td>t_f</td><td>{activeProfile.tf} mm</td></tr>}
                      {activeProfile.tw && <tr><td>t_w</td><td>{activeProfile.tw} mm</td></tr>}
                      {activeProfile.weight && <tr><td>Mass</td><td>{activeProfile.weight} kg/m</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="section-dialog-footer">
          <button className="section-btn cancel" onClick={onCancel}>Cancel</button>
          <button className="section-btn confirm" onClick={handleConfirm}>OK</button>
        </div>
      </div>
    </div>
  );
}

function formatSci(val: number): string {
  if (val === 0) return '0';
  const exp = Math.floor(Math.log10(Math.abs(val)));
  const mantissa = val / Math.pow(10, exp);
  return `${mantissa.toFixed(1)}e${exp}`;
}
