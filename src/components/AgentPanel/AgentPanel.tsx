import { useState } from 'react';
import { Send, X } from 'lucide-react';
import './AgentPanel.css';

interface AgentPanelProps {
  onClose: () => void;
}

export function AgentPanel({ onClose }: AgentPanelProps) {
  const [input, setInput] = useState('');

  return (
    <div className="agent-panel">
      <div className="agent-panel-header">
        <span>AI Agent</span>
        <button className="agent-panel-close" onClick={onClose}>
          <X size={14} />
        </button>
      </div>
      <div className="agent-panel-body">
        <div className="agent-panel-placeholder">
          <p>AI structural engineering assistant</p>
          <p className="agent-hint">Ask questions about your model, get design suggestions, or check code compliance.</p>
        </div>
      </div>
      <div className="agent-panel-input-area">
        <input
          type="text"
          placeholder="Ask a question..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && input.trim()) {
              setInput('');
            }
          }}
        />
        <button className="agent-send-btn" disabled={!input.trim()}>
          <Send size={14} />
        </button>
      </div>
    </div>
  );
}
