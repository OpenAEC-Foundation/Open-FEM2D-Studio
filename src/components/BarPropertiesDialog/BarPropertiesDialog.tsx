import { useState } from 'react';
import { IBeamElement, IBeamSection } from '../../core/fem/types';
import { SectionDialog } from '../SectionDialog/SectionDialog';
import './BarPropertiesDialog.css';

interface BarPropertiesDialogProps {
  beam: IBeamElement;
  length: number;
  onUpdate: (updates: Partial<IBeamElement>) => void;
  onClose: () => void;
}

export function BarPropertiesDialog({ beam, length, onUpdate, onClose }: BarPropertiesDialogProps) {
  const [showSectionPicker, setShowSectionPicker] = useState(false);
  const [section, setSection] = useState<IBeamSection>(beam.section);
  const [startMomentRelease, setStartMomentRelease] = useState(beam.endReleases?.startMoment ?? false);
  const [endMomentRelease, setEndMomentRelease] = useState(beam.endReleases?.endMoment ?? false);
  const [startAxialRelease, setStartAxialRelease] = useState(beam.endReleases?.startAxial ?? false);
  const [endAxialRelease, setEndAxialRelease] = useState(beam.endReleases?.endAxial ?? false);
  const [startShearRelease, setStartShearRelease] = useState(beam.endReleases?.startShear ?? false);
  const [endShearRelease, setEndShearRelease] = useState(beam.endReleases?.endShear ?? false);

  const setAllReleases = (val: boolean) => {
    setStartMomentRelease(val);
    setEndMomentRelease(val);
    setStartAxialRelease(val);
    setEndAxialRelease(val);
    setStartShearRelease(val);
    setEndShearRelease(val);
  };

  const applyHingePreset = () => {
    setStartMomentRelease(true);
    setEndMomentRelease(true);
    setStartAxialRelease(false);
    setEndAxialRelease(false);
    setStartShearRelease(false);
    setEndShearRelease(false);
  };

  const handleApply = () => {
    onUpdate({
      section,
      endReleases: {
        startMoment: startMomentRelease,
        endMoment: endMomentRelease,
        startAxial: startAxialRelease,
        endAxial: endAxialRelease,
        startShear: startShearRelease,
        endShear: endShearRelease,
      }
    });
    onClose();
  };

  if (showSectionPicker) {
    return (
      <SectionDialog
        onSelect={(newSection) => {
          setSection(newSection);
          setShowSectionPicker(false);
        }}
        onCancel={() => setShowSectionPicker(false)}
      />
    );
  }

  return (
    <div className="bar-props-overlay" onClick={onClose}>
      <div className="bar-props-dialog" onClick={e => e.stopPropagation()}>
        <div className="bar-props-header">Bar Properties</div>
        <div className="bar-props-body">
          <div className="bar-props-row">
            <span className="bar-props-label">ID</span>
            <span className="bar-props-value">{beam.id}</span>
          </div>
          <div className="bar-props-row">
            <span className="bar-props-label">Length</span>
            <span className="bar-props-value">{length.toFixed(3)} m</span>
          </div>
          <div className="bar-props-row">
            <span className="bar-props-label">Nodes</span>
            <span className="bar-props-value">{beam.nodeIds[0]} — {beam.nodeIds[1]}</span>
          </div>

          <div className="bar-props-section-title">Section</div>
          <div className="bar-props-row">
            <span className="bar-props-label">A</span>
            <span className="bar-props-value">{section.A.toExponential(3)} m²</span>
          </div>
          <div className="bar-props-row">
            <span className="bar-props-label">I</span>
            <span className="bar-props-value">{section.I.toExponential(3)} m⁴</span>
          </div>
          <div className="bar-props-row">
            <span className="bar-props-label">h</span>
            <span className="bar-props-value">{(section.h * 1000).toFixed(0)} mm</span>
          </div>
          <button className="bar-props-change-btn" onClick={() => setShowSectionPicker(true)}>
            Change Section...
          </button>

          <div className="bar-props-section-title">End Releases</div>
          <div className="bar-props-preset-row">
            <button
              className="bar-props-preset-btn"
              onClick={() => setAllReleases(false)}
              title="All DOFs fixed (no releases)"
            >
              Fully Fixed
            </button>
            <button
              className="bar-props-preset-btn"
              onClick={applyHingePreset}
              title="Moment released at both ends"
            >
              Hinge
            </button>
          </div>

          <div className="bar-props-release-grid">
            <div className="bar-props-release-header">
              <span></span>
              <span className="bar-props-release-col-label">Moment</span>
              <span className="bar-props-release-col-label">Axial</span>
              <span className="bar-props-release-col-label">Shear</span>
            </div>
            <div className="bar-props-release-row">
              <span className="bar-props-release-row-label">Start</span>
              <label className="bar-props-cb-cell">
                <input type="checkbox" checked={startMomentRelease} onChange={e => setStartMomentRelease(e.target.checked)} />
              </label>
              <label className="bar-props-cb-cell">
                <input type="checkbox" checked={startAxialRelease} onChange={e => setStartAxialRelease(e.target.checked)} />
              </label>
              <label className="bar-props-cb-cell">
                <input type="checkbox" checked={startShearRelease} onChange={e => setStartShearRelease(e.target.checked)} />
              </label>
            </div>
            <div className="bar-props-release-row">
              <span className="bar-props-release-row-label">End</span>
              <label className="bar-props-cb-cell">
                <input type="checkbox" checked={endMomentRelease} onChange={e => setEndMomentRelease(e.target.checked)} />
              </label>
              <label className="bar-props-cb-cell">
                <input type="checkbox" checked={endAxialRelease} onChange={e => setEndAxialRelease(e.target.checked)} />
              </label>
              <label className="bar-props-cb-cell">
                <input type="checkbox" checked={endShearRelease} onChange={e => setEndShearRelease(e.target.checked)} />
              </label>
            </div>
          </div>
        </div>
        <div className="bar-props-footer">
          <button className="bar-props-btn cancel" onClick={onClose}>Cancel</button>
          <button className="bar-props-btn confirm" onClick={handleApply}>OK</button>
        </div>
      </div>
    </div>
  );
}
