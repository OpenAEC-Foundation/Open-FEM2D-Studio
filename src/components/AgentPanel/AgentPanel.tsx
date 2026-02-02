import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Send, X, Loader2, Mic, MicOff, Trash2,
  Play, BarChart3,
  HelpCircle, Eraser, Building2, Columns, PanelTop, Box
} from 'lucide-react';
import { useFEM, applyLoadCaseToMesh } from '../../context/FEMContext';
import { solve } from '../../core/solver/SolverService';
import { processAgentInput } from '../../core/agent/ModelAgent';
import './AgentPanel.css';

interface AgentPanelProps {
  onClose: () => void;
}

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  details?: string;
}

export function AgentPanel({ onClose }: AgentPanelProps) {
  const { state, dispatch } = useFEM();
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([{
    role: 'assistant',
    content: 'I can create structural models from natural language. Try a command like "Create a beam 6m with 10 kN/m" or click a quick-create button below.',
  }]);
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [expandedDetails, setExpandedDetails] = useState<Set<number>>(new Set());
  const bodyRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (bodyRef.current) {
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
    }
  }, [messages]);

  const getModelSummary = () => {
    const nodes = Array.from(state.mesh.nodes.values());
    const beams = Array.from(state.mesh.beamElements.values());
    const plates = Array.from(state.mesh.plateRegions.values());
    const elements = Array.from(state.mesh.elements.values());
    const supportedNodes = nodes.filter(n => n.constraints.x || n.constraints.y || n.constraints.rotation);
    return {
      nodes: nodes.length,
      beams: beams.length,
      plates: plates.length,
      elements: elements.length,
      supports: supportedNodes.length,
      loadCases: state.loadCases.length,
    };
  };

  const toggleListening = useCallback(() => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setMessages(prev => [...prev, { role: 'system', content: 'Speech recognition is not supported in this browser.' }]);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'nl-NL';
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onresult = (event: any) => {
      let transcript = '';
      for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      setInput(transcript);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.onerror = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  }, [isListening]);

  const handleSend = async () => {
    const msg = input.trim();
    if (!msg || loading) return;

    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: msg }]);
    setLoading(true);

    // Small delay so UI updates before potentially heavy operation
    await new Promise(r => setTimeout(r, 50));

    try {
      const result = processAgentInput(msg, state.mesh, dispatch, state.loadCases);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: result.message,
        details: result.details,
      }]);
    } catch (e) {
      setMessages(prev => [...prev, {
        role: 'system',
        content: `Error: ${(e as Error).message}`,
      }]);
    } finally {
      setLoading(false);
    }
  };

  const executeQuickCommand = async (command: string) => {
    setMessages(prev => [...prev, { role: 'user', content: command }]);
    setLoading(true);
    await new Promise(r => setTimeout(r, 50));

    try {
      const result = processAgentInput(command, state.mesh, dispatch, state.loadCases);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: result.message,
        details: result.details,
      }]);
    } catch (e) {
      setMessages(prev => [...prev, {
        role: 'system',
        content: `Error: ${(e as Error).message}`,
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleClearChat = () => {
    setMessages([]);
    setExpandedDetails(new Set());
  };

  const handleQuickSolve = async () => {
    setMessages(prev => [...prev, { role: 'system', content: 'Running analysis...' }]);
    try {
      const activeLc = state.loadCases.find(lc => lc.id === state.activeLoadCase);
      if (activeLc) {
        applyLoadCaseToMesh(state.mesh, activeLc);
      }
      const result = await solve(state.mesh, {
        analysisType: state.analysisType,
        geometricNonlinear: false,
      });
      dispatch({ type: 'SET_RESULT', payload: result });
      dispatch({ type: 'SET_SHOW_DEFORMED', payload: true });
      dispatch({ type: 'SET_VIEW_MODE', payload: 'results' });
      if (state.analysisType === 'frame') {
        dispatch({ type: 'SET_SHOW_MOMENT', payload: true });
      }

      // Build a summary of results
      let resultSummary = 'Analysis completed successfully.';
      if (result.beamForces.size > 0) {
        let maxM = 0, maxV = 0, maxN = 0;
        for (const bf of result.beamForces.values()) {
          maxM = Math.max(maxM, Math.abs(bf.maxM));
          maxV = Math.max(maxV, Math.abs(bf.maxV));
          maxN = Math.max(maxN, Math.abs(bf.maxN));
        }
        resultSummary += `\n\nMax values:\n  M = ${(maxM / 1000).toFixed(2)} kNm\n  V = ${(maxV / 1000).toFixed(2)} kN\n  N = ${(maxN / 1000).toFixed(2)} kN`;
      }

      setMessages(prev => [...prev, { role: 'assistant', content: resultSummary }]);
    } catch (e) {
      setMessages(prev => [...prev, { role: 'system', content: `Solver error: ${(e as Error).message}` }]);
    }
  };

  const handleQuickShowResults = () => {
    if (!state.result) {
      setMessages(prev => [...prev, { role: 'system', content: 'No results available. Run analysis first.' }]);
      return;
    }
    dispatch({ type: 'SET_VIEW_MODE', payload: 'results' });
    dispatch({ type: 'SET_SHOW_DEFORMED', payload: true });
    if (state.analysisType === 'frame') {
      dispatch({ type: 'SET_SHOW_MOMENT', payload: true });
    }
    setMessages(prev => [...prev, { role: 'system', content: 'Switched to results view.' }]);
  };

  const toggleDetails = (index: number) => {
    setExpandedDetails(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const summary = getModelSummary();

  return (
    <div className="agent-panel">
      <div className="agent-panel-header">
        <span>AI Model Agent</span>
        <div className="agent-header-actions">
          {messages.length > 0 && (
            <button
              className="agent-clear-btn"
              onClick={handleClearChat}
              title="Clear chat"
            >
              <Trash2 size={12} />
            </button>
          )}
          <button className="agent-panel-close" onClick={onClose}>
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Context Section */}
      <div className="agent-context">
        <div className="agent-context-title">Model Context</div>
        <div className="agent-context-grid">
          <div className="agent-context-item">
            <span className="agent-context-value">{summary.nodes}</span>
            <span className="agent-context-label">Nodes</span>
          </div>
          <div className="agent-context-item">
            <span className="agent-context-value">{summary.beams}</span>
            <span className="agent-context-label">Beams</span>
          </div>
          <div className="agent-context-item">
            <span className="agent-context-value">{summary.plates}</span>
            <span className="agent-context-label">Plates</span>
          </div>
          <div className="agent-context-item">
            <span className="agent-context-value">{summary.loadCases}</span>
            <span className="agent-context-label">Load Cases</span>
          </div>
        </div>
        <div className="agent-context-status">
          <span className={`agent-status-dot ${state.result ? 'solved' : 'unsolved'}`} />
          <span>{state.result ? 'Solved' : 'Not solved'}</span>
          <span className="agent-context-sep">|</span>
          <span>{state.analysisType.replace('_', ' ')}</span>
        </div>
      </div>

      {/* Quick Create Structures */}
      <div className="agent-quick-actions">
        <div className="agent-quick-title">Quick Create</div>
        <div className="agent-quick-buttons">
          <button
            className="agent-quick-btn"
            onClick={() => executeQuickCommand('Create a simply supported beam 6m with 10 kN/m')}
            title="Simply supported beam 6m with 10 kN/m"
          >
            <Columns size={12} />
            <span>Beam 6m</span>
          </button>
          <button
            className="agent-quick-btn"
            onClick={() => executeQuickCommand('Create a cantilever beam 3m with point load 10 kN at tip')}
            title="Cantilever 3m with 10 kN at tip"
          >
            <PanelTop size={12} />
            <span>Cantilever 3m</span>
          </button>
          <button
            className="agent-quick-btn"
            onClick={() => executeQuickCommand('Create a portal frame 6m wide 4m high with 10 kN/m')}
            title="Portal frame 6m x 4m with 10 kN/m"
          >
            <Building2 size={12} />
            <span>Portal 6x4m</span>
          </button>
          <button
            className="agent-quick-btn"
            onClick={() => executeQuickCommand('Create a truss 12m span 2m high with 5 kN/m')}
            title="Truss 12m x 2m with 5 kN/m"
          >
            <Box size={12} />
            <span>Truss 12m</span>
          </button>
        </div>
      </div>

      {/* Tool Shortcuts */}
      <div className="agent-quick-actions agent-tool-actions">
        <div className="agent-quick-title">Actions</div>
        <div className="agent-quick-buttons">
          <button className="agent-quick-btn" onClick={handleQuickSolve} title="Run analysis">
            <Play size={12} />
            <span>Solve</span>
          </button>
          <button className="agent-quick-btn" onClick={handleQuickShowResults} title="Show results">
            <BarChart3 size={12} />
            <span>Results</span>
          </button>
          <button
            className="agent-quick-btn"
            onClick={() => executeQuickCommand('clear')}
            title="Clear model"
          >
            <Eraser size={12} />
            <span>Clear</span>
          </button>
          <button
            className="agent-quick-btn"
            onClick={() => executeQuickCommand('help')}
            title="Show help"
          >
            <HelpCircle size={12} />
            <span>Help</span>
          </button>
        </div>
      </div>

      {/* Chat body */}
      <div className="agent-panel-body" ref={bodyRef}>
        {messages.length === 0 ? (
          <div className="agent-panel-placeholder">
            <p>AI structural engineering assistant</p>
            <p className="agent-hint">Describe a structure in Dutch or English, and I will build it.</p>
            <p className="agent-hint">Type "help" to see supported commands.</p>
          </div>
        ) : (
          <div className="agent-messages">
            {messages.map((m, i) => (
              <div key={i} className={`agent-msg agent-msg-${m.role}`}>
                <div className="agent-msg-label">
                  {m.role === 'user' ? 'You' : m.role === 'assistant' ? 'Agent' : 'System'}
                </div>
                <div className="agent-msg-content">
                  {m.content}
                  {m.details && (
                    <>
                      <button
                        className="agent-details-toggle"
                        onClick={() => toggleDetails(i)}
                      >
                        {expandedDetails.has(i) ? 'Hide details' : 'Show details'}
                      </button>
                      {expandedDetails.has(i) && (
                        <div className="agent-msg-details">{m.details}</div>
                      )}
                    </>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div className="agent-msg agent-msg-assistant">
                <div className="agent-msg-label">Agent</div>
                <div className="agent-msg-content agent-loading">
                  <Loader2 size={14} className="agent-spinner" /> Creating model...
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Input area */}
      <div className="agent-panel-input-area">
        <input
          type="text"
          placeholder="Describe a structure... (e.g. beam 8m with 15 kN/m)"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && input.trim() && !loading) {
              handleSend();
            }
          }}
          disabled={loading}
        />
        <button
          className={`agent-mic-btn ${isListening ? 'active' : ''}`}
          onClick={toggleListening}
          title={isListening ? 'Stop recording' : 'Start speech input'}
        >
          {isListening ? <MicOff size={14} /> : <Mic size={14} />}
        </button>
        <button className="agent-send-btn" disabled={!input.trim() || loading} onClick={handleSend}>
          <Send size={14} />
        </button>
      </div>
    </div>
  );
}
