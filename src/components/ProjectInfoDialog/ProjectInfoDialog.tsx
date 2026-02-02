import { useState } from 'react';
import { useFEM } from '../../context/FEMContext';
import type { IProjectInfo } from '../../context/FEMContext';
import './ProjectInfoDialog.css';

interface ProjectInfoDialogProps {
  onClose: () => void;
}

interface ErpProject {
  name: string;
  project_name: string;
  customer?: string;
  status?: string;
  company?: string;
}

export function ProjectInfoDialog({ onClose }: ProjectInfoDialogProps) {
  const { state, dispatch } = useFEM();

  const [name, setName] = useState(state.projectInfo.name);
  const [engineer, setEngineer] = useState(state.projectInfo.engineer);
  const [company, setCompany] = useState(state.projectInfo.company);
  const [date, setDate] = useState(state.projectInfo.date);
  const [description, setDescription] = useState(state.projectInfo.description);
  const [notes, setNotes] = useState(state.projectInfo.notes);
  const [location, setLocation] = useState(state.projectInfo.location);

  // ERPNext linking
  const [showErpSearch, setShowErpSearch] = useState(false);
  const [erpSearch, setErpSearch] = useState('');
  const [erpResults, setErpResults] = useState<ErpProject[]>([]);
  const [erpLoading, setErpLoading] = useState(false);
  const [erpError, setErpError] = useState<string | null>(null);

  const handleApply = () => {
    const updated: IProjectInfo = { name, engineer, company, date, description, notes, location };
    dispatch({ type: 'SET_PROJECT_INFO', payload: updated });
    onClose();
  };

  const searchErpProjects = async () => {
    setErpLoading(true);
    setErpError(null);
    try {
      const resp = await fetch(`/api/erpnext/projects?search=${encodeURIComponent(erpSearch)}`);
      const data = await resp.json();
      if (data.error) {
        setErpError(data.error);
        setErpResults([]);
      } else {
        setErpResults(data.data || []);
      }
    } catch (e) {
      setErpError((e as Error).message);
      setErpResults([]);
    } finally {
      setErpLoading(false);
    }
  };

  const importErpProject = async (proj: ErpProject) => {
    setName(proj.project_name || proj.name);
    if (proj.company) setCompany(proj.company);
    // Fetch full details for description
    try {
      const resp = await fetch(`/api/erpnext/project/${encodeURIComponent(proj.name)}`);
      const data = await resp.json();
      if (data.data) {
        const d = data.data;
        if (d.notes) setDescription(d.notes);
        if (d.company) setCompany(d.company);
      }
    } catch { /* ignore */ }
    setShowErpSearch(false);
  };

  return (
    <div className="proj-info-overlay" onClick={onClose}>
      <div className="proj-info-dialog" onClick={e => e.stopPropagation()}>
        <div className="proj-info-header">
          Project Information
          <button
            className="proj-info-erp-btn"
            onClick={() => setShowErpSearch(!showErpSearch)}
            title="Link with ERPNext project"
          >
            ERPNext
          </button>
        </div>

        {showErpSearch && (
          <div className="erp-search-section">
            <div className="erp-search-row">
              <input
                type="text"
                placeholder="Search ERPNext projects..."
                value={erpSearch}
                onChange={e => setErpSearch(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') searchErpProjects(); }}
              />
              <button onClick={searchErpProjects} disabled={erpLoading}>
                {erpLoading ? '...' : 'Search'}
              </button>
            </div>
            {erpError && <div className="erp-error">{erpError}</div>}
            {erpResults.length > 0 && (
              <div className="erp-results">
                {erpResults.map(p => (
                  <button key={p.name} className="erp-result-item" onClick={() => importErpProject(p)}>
                    <span className="erp-result-name">{p.project_name || p.name}</span>
                    <span className="erp-result-meta">{p.customer || p.company || ''}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

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
          <label className="proj-info-field">
            <span>Location</span>
            <input
              type="text"
              value={location}
              onChange={e => setLocation(e.target.value)}
              placeholder="e.g. Amsterdam, Netherlands"
              onFocus={e => e.target.select()}
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
