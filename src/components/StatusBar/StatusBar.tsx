import { useFEM } from '../../context/FEMContext';
import { formatStress } from '../../utils/colors';
import './StatusBar.css';

export function StatusBar() {
  const { state } = useFEM();
  const { mesh, result, selectedTool } = state;

  const toolHints: Record<string, string> = {
    select: 'Click to select nodes/elements. Shift+click to multi-select. Drag to move nodes.',
    addNode: 'Click to place a new node on the grid.',
    addElement: 'Click 3 nodes to create a triangular element.',
    addConstraint: 'Click a node to toggle fixed constraint.',
    addLoad: 'Click a node to apply a force.',
    delete: 'Click a node or element to delete it.',
    pan: 'Drag to pan the view. Scroll to zoom.'
  };

  return (
    <div className="status-bar">
      <div className="status-section">
        <span className="status-label">Tool:</span>
        <span className="status-hint">{toolHints[selectedTool]}</span>
      </div>

      <div className="status-section status-stats">
        <span>
          <strong>Nodes:</strong> {mesh.getNodeCount()}
        </span>
        <span>
          <strong>Elements:</strong> {mesh.getElementCount()}
        </span>
        {result && (
          <>
            <span className="status-solved">Solved</span>
            <span>
              <strong>Max Stress:</strong> {formatStress(result.maxVonMises)}
            </span>
          </>
        )}
      </div>
    </div>
  );
}
