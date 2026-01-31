import { useState } from 'react';
import { useFEM } from '../../context/FEMContext';
import type { IProjectInfo } from '../../context/FEMContext';
import './ProjectInfoDialog.css';

interface ProjectInfoDialogProps {
  onClose: () => void;
}

export function ProjectInfoDialog({ onClose }: ProjectInfoDialogProps) {
  const { state, dispatch } = useFEM();

  const [name, setName] = useState(state.projectInfo.name);
  const [engineer, setEngineer] = useState(state.projectInfo.engineer);
  const [company, setCompany] = useState(state.projectInfo.company);
  const [date, setDate] = useState(state.projectInfo.date);
  const [description, setDescription] = useState(state.projectInfo.description);
  const [notes, setNotes] = useState(state.projectInfo.notes);

  const handleApply = () => {
    const updated: IProjectInfo = { name, engineer, company, date, description, notes };
    dispatch({ type: 'SET_PROJECT_INFO', payload: updated });
    onClose();
  };

  return (
    <div className="proj-info-overlay" onClick={onClose}>
      <div className="proj-info-dialog" onClick={e => e.stopPropagation()}>
        <div className="proj-info-header">Project Information</div>
        <div className="proj-info-body">
          <label className="proj-info-field">
            <span>Name</span>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              autoFocus
              onFocus={e => e.target.select()}
            />
          </label>
          <label className="proj-info-field">
            <span>Engineer</span>
            <input
              type="text"
              value={engineer}
              onChange={e => setEngineer(e.target.value)}
              onFocus={e => e.target.select()}
            />
          </label>
          <label className="proj-info-field">
            <span>Company</span>
            <input
              type="text"
              value={company}
              onChange={e => setCompany(e.target.value)}
              onFocus={e => e.target.select()}
            />
          </label>
          <label className="proj-info-field">
            <span>Date</span>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
            />
          </label>
          <label className="proj-info-field proj-info-field--tall">
            <span>Description</span>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
            />
          </label>
          <label className="proj-info-field proj-info-field--tall">
            <span>Notes</span>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
            />
          </label>
        </div>
        <div className="proj-info-footer">
          <button className="proj-info-btn cancel" onClick={onClose}>Cancel</button>
          <button className="proj-info-btn confirm" onClick={handleApply}>Apply</button>
        </div>
      </div>
    </div>
  );
}
