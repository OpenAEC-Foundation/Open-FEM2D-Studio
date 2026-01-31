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

  const handleApply = () => {
    onUpdate({
      section,
      endReleases: { startMoment: startMomentRelease, endMoment: endMomentRelease }
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

          <div className="bar-props-section-title">End Releases (Hinges)</div>
          <div className="bar-props-row">
            <label className="bar-props-checkbox-label">
              <input
                type="checkbox"
                checked={startMomentRelease}
                onChange={(e) => setStartMomentRelease(e.target.checked)}
              />
              <span>Start node: moment release</span>
            </label>
          </div>
          <div className="bar-props-row">
            <label className="bar-props-checkbox-label">
              <input
                type="checkbox"
                checked={endMomentRelease}
                onChange={(e) => setEndMomentRelease(e.target.checked)}
              />
              <span>End node: moment release</span>
            </label>
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
