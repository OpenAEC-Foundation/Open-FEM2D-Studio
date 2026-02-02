import { useState, useMemo } from 'react';
import { IBeamSection } from '../../core/fem/types';
import { STEEL_SECTION_SERIES, ISteelProfile } from '../../core/data/SteelSections';
import { SectionPreview } from './SectionPreview';
import './SectionDialog.css';

type CustomSectionType = 'I-section' | 'Rectangular' | 'Circular' | 'RHS' | 'CHS';

/** Compute section properties from custom dimensions (all inputs in mm, output in m) */
function computeCustomSection(
  type: CustomSectionType,
  dims: { h: number; b: number; tw: number; tf: number; D: number; t: number }
): IBeamSection | null {
  const { h, b, tw, tf, D, t } = dims;
  switch (type) {
    case 'I-section': {
      if (h <= 0 || b <= 0 || tw <= 0 || tf <= 0) return null;
      const hm = h / 1000, bm = b / 1000, twm = tw / 1000, tfm = tf / 1000;
      const hw = hm - 2 * tfm;
      if (hw <= 0) return null;
      const A = 2 * bm * tfm + hw * twm;
      const Iy = (bm * hm ** 3 - (bm - twm) * hw ** 3) / 12;
      const Iz = (2 * tfm * bm ** 3 + hw * twm ** 3) / 12;
      const Wy = 2 * Iy / hm;
      const Wz = 2 * Iz / bm;
      const Wply = bm * tfm * (hm - tfm) + twm * hw ** 2 / 4;
      const Wplz = 2 * tfm * bm ** 2 / 4 + hw * twm ** 2 / 4;
      return { A, I: Iy, h: hm, Iy, Iz, Wy, Wz, Wply, Wplz };
    }
    case 'Rectangular': {
      if (h <= 0 || b <= 0) return null;
      const hm = h / 1000, bm = b / 1000;
      const A = bm * hm;
      const Iy = (bm * hm ** 3) / 12;
      const Iz = (hm * bm ** 3) / 12;
      const Wy = bm * hm ** 2 / 6;
      const Wz = hm * bm ** 2 / 6;
      const Wply = bm * hm ** 2 / 4;
      const Wplz = hm * bm ** 2 / 4;
      return { A, I: Iy, h: hm, Iy, Iz, Wy, Wz, Wply, Wplz };
    }
    case 'Circular': {
      if (D <= 0) return null;
      const r = D / 2000; // radius in m
      const A = Math.PI * r ** 2;
      const Iy = Math.PI * r ** 4 / 4;
      const Wy = Math.PI * r ** 3 / 4;
      const Wply = (4 / 3) * r ** 3;
      return { A, I: Iy, h: D / 1000, Iy, Iz: Iy, Wy, Wz: Wy, Wply, Wplz: Wply };
    }
    case 'RHS': {
      if (h <= 0 || b <= 0 || t <= 0) return null;
      const hm = h / 1000, bm = b / 1000, tm = t / 1000;
      if (hm <= 2 * tm || bm <= 2 * tm) return null;
      const A = hm * bm - (hm - 2 * tm) * (bm - 2 * tm);
      const Iy = (bm * hm ** 3 - (bm - 2 * tm) * (hm - 2 * tm) ** 3) / 12;
      const Iz = (hm * bm ** 3 - (hm - 2 * tm) * (bm - 2 * tm) ** 3) / 12;
      const Wy = 2 * Iy / hm;
      const Wz = 2 * Iz / bm;
      return { A, I: Iy, h: hm, Iy, Iz, Wy, Wz };
    }
    case 'CHS': {
      if (D <= 0 || t <= 0) return null;
      const ro = D / 2000;
      const ri = (D / 2 - t) / 1000;
      if (ri <= 0) return null;
      const A = Math.PI * (ro ** 2 - ri ** 2);
      const Iy = Math.PI * (ro ** 4 - ri ** 4) / 4;
      const Wy = Iy / ro;
      const Wply = (4 / 3) * (ro ** 3 - ri ** 3);
      return { A, I: Iy, h: D / 1000, Iy, Iz: Iy, Wy, Wz: Wy, Wply, Wplz: Wply };
    }
    default:
      return null;
  }
}

type MaterialCategory = 'steel' | 'wood' | 'concrete' | 'composite' | 'other';

interface ProfileEntry {
  name: string;
  section: IBeamSection;
  b?: number;       // width in mm
  tf?: number;      // flange thickness in mm
  tw?: number;      // web thickness in mm
  weight?: number;  // kg/m
  Wel?: number;     // elastic section modulus strong axis m³ (legacy alias for Wy)
  Iz?: number;      // second moment of area, weak axis (m⁴)
  Wz?: number;      // elastic section modulus, weak axis (m³)
  Wply?: number;    // plastic section modulus, strong axis (m³)
  Wplz?: number;    // plastic section modulus, weak axis (m³)
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
  const Iy = (b * h * h * h) / 12;
  const Iz = (h * b * b * b) / 12;
  return {
    A: b * h,
    I: Iy,
    h,
    Iy,
    Iz,
    Wy: b * h * h / 6,
    Wz: h * b * b / 6,
    Wply: b * h * h / 4,
    Wplz: h * b * b / 4,
  };
}

// ── Convert ISteelProfile to ProfileEntry (catalog units -> SI units) ──
function steelProfileToEntry(p: ISteelProfile): ProfileEntry {
  const series = p.series;
  const isHollow = series === 'RHS' || series === 'CHS';
  const isChannel = series === 'UNP';
  const shapeType: 'I' | 'hollow' | 'rectangular' = isHollow ? 'hollow' : (isChannel ? 'I' : 'I');

  // Convert catalog units (cm/mm) to SI (m)
  const Iy_m4 = p.Iy * 1e-8;   // cm⁴ -> m⁴
  const Iz_m4 = p.Iz * 1e-8;
  const Wy_m3 = p.Wy * 1e-6;   // cm³ -> m³
  const Wz_m3 = p.Wz * 1e-6;
  const Wply_m3 = p.Wpl_y * 1e-6;
  const Wplz_m3 = p.Wpl_z * 1e-6;
  const It_m4 = p.It * 1e-8;
  const Iw_m6 = p.Iw * 1e-12;  // cm⁶ -> m⁶

  return {
    name: p.name,
    section: {
      A: p.A * 1e-4,       // cm² -> m²
      I: Iy_m4,
      h: p.h / 1000,       // mm -> m
      b: p.b / 1000,       // mm -> m
      tw: p.tw / 1000,     // mm -> m
      tf: p.tf / 1000,     // mm -> m
      Iy: Iy_m4,
      Iz: Iz_m4,
      Wy: Wy_m3,
      Wz: Wz_m3,
      Wply: Wply_m3,
      Wplz: Wplz_m3,
      It: It_m4,
      Iw: Iw_m6,
    },
    b: p.b,
    tf: p.tf,
    tw: p.tw,
    weight: p.mass,
    Wel: Wy_m3,
    Iz: Iz_m4,
    Wz: Wz_m3,
    Wply: Wply_m3,
    Wplz: Wplz_m3,
    shapeType,
  };
}

// ── Steel profiles (generated from SteelSections database) ──────────
const STEEL_CATALOG: MaterialCatalog = (() => {
  const catalog: MaterialCatalog = {};
  for (const [seriesKey, profiles] of Object.entries(STEEL_SECTION_SERIES)) {
    const key = seriesKey.toLowerCase();
    catalog[key] = {
      label: seriesKey,
      profiles: profiles.map(steelProfileToEntry),
    };
  }
  catalog['custom'] = { label: 'Custom', profiles: [] };
  return catalog;
})();

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
  custom: { label: 'Custom', profiles: [] },
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
  custom: { label: 'Custom', profiles: [] },
};

// ── Composite / built-up sections ───────────────────────────────────
const COMPOSITE_CATALOG: MaterialCatalog = {
  custom: { label: 'Custom', profiles: [] },
};

// ── Other ───────────────────────────────────────────────────────────
const OTHER_CATALOG: MaterialCatalog = {
  custom: { label: 'Custom', profiles: [] },
};

// ── Material categories ─────────────────────────────────────────────
const MATERIALS: { key: MaterialCategory; label: string; catalog: MaterialCatalog }[] = [
  { key: 'steel', label: 'Steel', catalog: STEEL_CATALOG },
  { key: 'wood', label: 'Timber', catalog: WOOD_CATALOG },
  { key: 'concrete', label: 'Concrete', catalog: CONCRETE_CATALOG },
  { key: 'composite', label: 'Composite', catalog: COMPOSITE_CATALOG },
  { key: 'other', label: 'Other', catalog: OTHER_CATALOG },
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

// Concrete quality grades (Eurocode 2)
const CONCRETE_GRADES = [
  { name: 'C12/15', fck: 12 },
  { name: 'C16/20', fck: 16 },
  { name: 'C20/25', fck: 20 },
  { name: 'C25/30', fck: 25 },
  { name: 'C30/37', fck: 30 },
  { name: 'C35/45', fck: 35 },
  { name: 'C40/50', fck: 40 },
  { name: 'C45/55', fck: 45 },
  { name: 'C50/60', fck: 50 },
];

// Reinforcement steel grades
const REBAR_GRADES = [
  { name: 'B500A', fyk: 500 },
  { name: 'B500B', fyk: 500 },
  { name: 'B500C', fyk: 500 },
];

// Standard stirrup diameters (mm)
const STIRRUP_DIAMETERS = [6, 8, 10, 12];

export interface IConcreteProperties {
  concreteGrade: string;
  fck: number;
  rebarGrade: string;
  fyk: number;
  asBottom: number;       // mm²
  asTop: number;          // mm²
  cover: number;          // mm
  stirrupDiameter: number; // mm
  stirrupSpacing: number;  // mm
  stirrupLegs: number;
}

interface SectionDialogProps {
  onSelect: (section: IBeamSection, profileName: string, concreteProps?: IConcreteProperties) => void;
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
  const [concreteGrade, setConcreteGrade] = useState('C30/37');
  const [rebarGrade, setRebarGrade] = useState('B500B');
  const [asBottom, setAsBottom] = useState('804');       // mm² (e.g. 4Ø16)
  const [asTop, setAsTop] = useState('402');             // mm² (e.g. 2Ø16)
  const [cover, setCover] = useState('30');              // mm
  const [stirrupDiameter, setStirrupDiameter] = useState(8);
  const [stirrupSpacing, setStirrupSpacing] = useState('200');
  const [stirrupLegs, setStirrupLegs] = useState(2);

  // Custom section editor state
  const [customSectionType, setCustomSectionType] = useState<CustomSectionType>('I-section');
  const [csH, setCsH] = useState('200');
  const [csB, setCsB] = useState('100');
  const [csTw, setCsTw] = useState('5.6');
  const [csTf, setCsTf] = useState('8.5');
  const [csD, setCsD] = useState('200');
  const [csT, setCsT] = useState('8');

  const customSectionResult = useMemo(() => {
    return computeCustomSection(customSectionType, {
      h: parseFloat(csH) || 0,
      b: parseFloat(csB) || 0,
      tw: parseFloat(csTw) || 0,
      tf: parseFloat(csTf) || 0,
      D: parseFloat(csD) || 0,
      t: parseFloat(csT) || 0,
    });
  }, [customSectionType, csH, csB, csTw, csTf, csD, csT]);

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

  const buildConcreteProps = (): IConcreteProperties | undefined => {
    if (material !== 'concrete') return undefined;
    const gradeInfo = CONCRETE_GRADES.find(g => g.name === concreteGrade);
    const rebarInfo = REBAR_GRADES.find(g => g.name === rebarGrade);
    return {
      concreteGrade,
      fck: gradeInfo?.fck ?? 30,
      rebarGrade,
      fyk: rebarInfo?.fyk ?? 500,
      asBottom: parseFloat(asBottom) || 0,
      asTop: parseFloat(asTop) || 0,
      cover: parseFloat(cover) || 30,
      stirrupDiameter,
      stirrupSpacing: parseFloat(stirrupSpacing) || 200,
      stirrupLegs,
    };
  };

  const handleConfirm = () => {
    if (isCustom) {
      // Check if user used the parametric custom editor
      if (customSectionResult) {
        let label = `Custom ${customSectionType}`;
        if (customSectionType === 'I-section') label = `Custom I ${csH}x${csB}`;
        else if (customSectionType === 'Rectangular') label = `Custom ${csH}x${csB}`;
        else if (customSectionType === 'Circular') label = `Custom CIR D${csD}`;
        else if (customSectionType === 'RHS') label = `Custom RHS ${csH}x${csB}x${csT}`;
        else if (customSectionType === 'CHS') label = `Custom CHS D${csD}x${csT}`;
        onSelect(customSectionResult, label, buildConcreteProps());
        return;
      }
      // Fallback to raw A/I/h input
      const A = parseFloat(customA);
      const I = parseFloat(customI);
      const h = parseFloat(customH);
      if (isNaN(A) || isNaN(I) || isNaN(h) || A <= 0 || I <= 0 || h <= 0) return;
      onSelect({ A, I, h }, 'Custom', buildConcreteProps());
      return;
    }

    const profile = currentProfiles.find(p => p.name === selectedProfile);
    if (profile) {
      let label = profile.name;
      if (material === 'steel') label = `${profile.name} (${steelGrade})`;
      if (material === 'wood') label = `${profile.name} (${woodGrade})`;
      if (material === 'concrete') label = `${profile.name} (${concreteGrade})`;
      onSelect(profile.section, label, buildConcreteProps());
    }
  };

  return (
    <div className="section-dialog-overlay" onClick={onCancel}>
      <div className="section-dialog" onClick={e => e.stopPropagation()}>
        <div className="section-dialog-header">
          Section Profile
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
              <span className="section-grade-label">Steel grade:</span>
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
              <span className="section-grade-label">Timber class:</span>
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

          {material === 'concrete' && (
            <div className="section-concrete-fields">
              {/* Concrete quality */}
              <div className="section-grade-row">
                <span className="section-grade-label">Concrete grade:</span>
                <select
                  className="section-grade-select"
                  value={concreteGrade}
                  onChange={e => setConcreteGrade(e.target.value)}
                >
                  {CONCRETE_GRADES.map(g => (
                    <option key={g.name} value={g.name}>{g.name} (fck={g.fck} MPa)</option>
                  ))}
                </select>
              </div>

              {/* Reinforcement */}
              <div className="section-concrete-group">
                <div className="section-concrete-group-title">Reinforcement</div>
                <div className="section-grade-row">
                  <span className="section-grade-label">Steel grade:</span>
                  <select
                    className="section-grade-select"
                    value={rebarGrade}
                    onChange={e => setRebarGrade(e.target.value)}
                  >
                    {REBAR_GRADES.map(g => (
                      <option key={g.name} value={g.name}>{g.name} (fyk={g.fyk} MPa)</option>
                    ))}
                  </select>
                </div>
                <div className="section-grade-row">
                  <span className="section-grade-label">As,bottom (mm²):</span>
                  <input
                    className="section-grade-input"
                    type="number"
                    min="0"
                    step="1"
                    value={asBottom}
                    onChange={e => setAsBottom(e.target.value)}
                    placeholder="e.g. 804 (4Ø16)"
                  />
                </div>
                <div className="section-grade-row">
                  <span className="section-grade-label">As,top (mm²):</span>
                  <input
                    className="section-grade-input"
                    type="number"
                    min="0"
                    step="1"
                    value={asTop}
                    onChange={e => setAsTop(e.target.value)}
                    placeholder="e.g. 402 (2Ø16)"
                  />
                </div>
                <div className="section-grade-row">
                  <span className="section-grade-label">Cover (mm):</span>
                  <input
                    className="section-grade-input"
                    type="number"
                    min="10"
                    max="100"
                    step="5"
                    value={cover}
                    onChange={e => setCover(e.target.value)}
                  />
                </div>
              </div>

              {/* Stirrups */}
              <div className="section-concrete-group">
                <div className="section-concrete-group-title">Stirrups</div>
                <div className="section-grade-row">
                  <span className="section-grade-label">Diameter:</span>
                  <select
                    className="section-grade-select"
                    value={stirrupDiameter}
                    onChange={e => setStirrupDiameter(Number(e.target.value))}
                  >
                    {STIRRUP_DIAMETERS.map(d => (
                      <option key={d} value={d}>&Oslash;{d}</option>
                    ))}
                  </select>
                </div>
                <div className="section-grade-row">
                  <span className="section-grade-label">Spacing (mm):</span>
                  <input
                    className="section-grade-input"
                    type="number"
                    min="50"
                    max="600"
                    step="25"
                    value={stirrupSpacing}
                    onChange={e => setStirrupSpacing(e.target.value)}
                  />
                </div>
                <div className="section-grade-row">
                  <span className="section-grade-label">Legs:</span>
                  <select
                    className="section-grade-select"
                    value={stirrupLegs}
                    onChange={e => setStirrupLegs(Number(e.target.value))}
                  >
                    <option value={2}>2</option>
                    <option value={3}>3</option>
                    <option value={4}>4</option>
                  </select>
                </div>
              </div>
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
                  {/* Parametric section type selector */}
                  <label>
                    <span>Type</span>
                    <select
                      className="section-grade-select"
                      value={customSectionType}
                      onChange={e => setCustomSectionType(e.target.value as CustomSectionType)}
                    >
                      <option value="I-section">I-section</option>
                      <option value="Rectangular">Rectangular</option>
                      <option value="Circular">Circular</option>
                      <option value="RHS">RHS (Hollow Rect.)</option>
                      <option value="CHS">CHS (Hollow Circ.)</option>
                    </select>
                  </label>

                  {/* Dimension inputs per section type */}
                  {(customSectionType === 'I-section') && (
                    <>
                      <label><span>h (mm)</span><input type="number" min="0" step="1" value={csH} onChange={e => setCsH(e.target.value)} /></label>
                      <label><span>b (mm)</span><input type="number" min="0" step="1" value={csB} onChange={e => setCsB(e.target.value)} /></label>
                      <label><span>tw (mm)</span><input type="number" min="0" step="0.1" value={csTw} onChange={e => setCsTw(e.target.value)} /></label>
                      <label><span>tf (mm)</span><input type="number" min="0" step="0.1" value={csTf} onChange={e => setCsTf(e.target.value)} /></label>
                    </>
                  )}
                  {(customSectionType === 'Rectangular') && (
                    <>
                      <label><span>h (mm)</span><input type="number" min="0" step="1" value={csH} onChange={e => setCsH(e.target.value)} /></label>
                      <label><span>b (mm)</span><input type="number" min="0" step="1" value={csB} onChange={e => setCsB(e.target.value)} /></label>
                    </>
                  )}
                  {(customSectionType === 'Circular') && (
                    <label><span>D (mm)</span><input type="number" min="0" step="1" value={csD} onChange={e => setCsD(e.target.value)} /></label>
                  )}
                  {(customSectionType === 'RHS') && (
                    <>
                      <label><span>h (mm)</span><input type="number" min="0" step="1" value={csH} onChange={e => setCsH(e.target.value)} /></label>
                      <label><span>b (mm)</span><input type="number" min="0" step="1" value={csB} onChange={e => setCsB(e.target.value)} /></label>
                      <label><span>t (mm)</span><input type="number" min="0" step="0.1" value={csT} onChange={e => setCsT(e.target.value)} /></label>
                    </>
                  )}
                  {(customSectionType === 'CHS') && (
                    <>
                      <label><span>D (mm)</span><input type="number" min="0" step="1" value={csD} onChange={e => setCsD(e.target.value)} /></label>
                      <label><span>t (mm)</span><input type="number" min="0" step="0.1" value={csT} onChange={e => setCsT(e.target.value)} /></label>
                    </>
                  )}

                  {/* Fallback raw values */}
                  <div className="section-custom-divider">Or enter raw values:</div>
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

            {/* Right column: preview + properties (catalog profiles) */}
            {!isCustom && activeProfile && (
              <div className="section-right-column">
                <div className="section-preview-area">
                  <SectionPreview
                    shapeType={activeProfile.shapeType || 'rectangular'}
                    h={activeProfile.section.h * 1000}
                    b={activeProfile.b || activeProfile.section.h * 500}
                    tf={activeProfile.tf}
                    tw={activeProfile.tw}
                    sectionProps={{
                      A: activeProfile.section.A,
                      Iy: activeProfile.section.Iy ?? activeProfile.section.I,
                      Iz: activeProfile.section.Iz,
                      Wy: activeProfile.section.Wy,
                      Wz: activeProfile.section.Wz,
                    }}
                  />
                </div>
                <div className="section-properties">
                  <table className="section-props-table">
                    <tbody>
                      <tr><td>A</td><td>{formatSci(activeProfile.section.A)} m²</td></tr>
                      <tr><td>Iy</td><td>{formatSci(activeProfile.section.Iy ?? activeProfile.section.I)} m⁴</td></tr>
                      {activeProfile.section.Iz != null && <tr><td>Iz</td><td>{formatSci(activeProfile.section.Iz)} m⁴</td></tr>}
                      {activeProfile.section.Wy != null && <tr><td>Wy</td><td>{formatSci(activeProfile.section.Wy)} m³</td></tr>}
                      {activeProfile.section.Wz != null && <tr><td>Wz</td><td>{formatSci(activeProfile.section.Wz)} m³</td></tr>}
                      {activeProfile.section.Wply != null && <tr><td>Wpl,y</td><td>{formatSci(activeProfile.section.Wply)} m³</td></tr>}
                      {activeProfile.section.Wplz != null && <tr><td>Wpl,z</td><td>{formatSci(activeProfile.section.Wplz)} m³</td></tr>}
                      {activeProfile.section.It != null && activeProfile.section.It > 0 && <tr><td>It</td><td>{formatSci(activeProfile.section.It)} m⁴</td></tr>}
                      {activeProfile.section.Iw != null && activeProfile.section.Iw > 0 && <tr><td>Iw</td><td>{formatSci(activeProfile.section.Iw)} m⁶</td></tr>}
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

            {/* Right column: preview + properties (custom sections) */}
            {isCustom && (
              <div className="section-right-column">
                <div className="section-preview-area">
                  {customSectionResult ? (
                    <SectionPreview
                      shapeType={
                        customSectionType === 'I-section' ? 'I' :
                        customSectionType === 'Rectangular' ? 'rectangular' :
                        customSectionType === 'Circular' ? 'circular' :
                        customSectionType === 'RHS' ? 'hollow' :
                        customSectionType === 'CHS' ? 'CHS' : 'rectangular'
                      }
                      h={
                        (customSectionType === 'Circular' || customSectionType === 'CHS')
                          ? (parseFloat(csD) || 200)
                          : (parseFloat(csH) || 200)
                      }
                      b={
                        (customSectionType === 'Circular' || customSectionType === 'CHS')
                          ? (parseFloat(csD) || 200)
                          : (parseFloat(csB) || 100)
                      }
                      tf={customSectionType === 'I-section' ? (parseFloat(csTf) || 0) : undefined}
                      tw={
                        customSectionType === 'I-section' ? (parseFloat(csTw) || 0) :
                        (customSectionType === 'RHS' || customSectionType === 'CHS') ? (parseFloat(csT) || 0) :
                        undefined
                      }
                      sectionProps={customSectionResult ? {
                        A: customSectionResult.A,
                        Iy: customSectionResult.Iy,
                        Iz: customSectionResult.Iz,
                        Wy: customSectionResult.Wy,
                        Wz: customSectionResult.Wz,
                      } : undefined}
                    />
                  ) : (
                    <div style={{ color: 'var(--text-muted)', fontSize: 11, textAlign: 'center', padding: 20 }}>
                      Enter dimensions to see preview
                    </div>
                  )}
                </div>
                <div className="section-properties">
                  {customSectionResult ? (
                    <table className="section-props-table">
                      <tbody>
                        <tr><td>A</td><td>{formatSci(customSectionResult.A)} m²</td></tr>
                        <tr><td>Iy</td><td>{formatSci(customSectionResult.Iy ?? customSectionResult.I)} m⁴</td></tr>
                        {customSectionResult.Iz != null && <tr><td>Iz</td><td>{formatSci(customSectionResult.Iz)} m⁴</td></tr>}
                        {customSectionResult.Wy != null && <tr><td>Wy</td><td>{formatSci(customSectionResult.Wy)} m³</td></tr>}
                        {customSectionResult.Wz != null && <tr><td>Wz</td><td>{formatSci(customSectionResult.Wz)} m³</td></tr>}
                        {customSectionResult.Wply != null && <tr><td>Wpl,y</td><td>{formatSci(customSectionResult.Wply)} m³</td></tr>}
                        {customSectionResult.Wplz != null && <tr><td>Wpl,z</td><td>{formatSci(customSectionResult.Wplz)} m³</td></tr>}
                        <tr><td>h</td><td>{(customSectionResult.h * 1000).toFixed(0)} mm</td></tr>
                      </tbody>
                    </table>
                  ) : (
                    <div style={{ color: 'var(--text-muted)', fontSize: 11, padding: 12 }}>
                      Computed properties will appear here
                    </div>
                  )}
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
