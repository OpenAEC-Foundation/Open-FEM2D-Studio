import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, X, Loader2, Mic, MicOff } from 'lucide-react';
import { useFEM } from '../../context/FEMContext';
import './AgentPanel.css';

interface AgentPanelProps {
  onClose: () => void;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export function AgentPanel({ onClose }: AgentPanelProps) {
  const { state } = useFEM();
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (bodyRef.current) {
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
    }
  }, [messages]);

  const buildContext = () => {
    const nodes = Array.from(state.mesh.nodes.values());
    const beams = Array.from(state.mesh.beamElements.values());
    return [
      `Model: ${nodes.length} nodes, ${beams.length} beams`,
      `Analysis: ${state.analysisType}`,
      state.result ? 'Status: Solved' : 'Status: Not solved',
      `Project: ${state.projectInfo.name || 'Untitled'}`,
    ].join('\n');
  };

  const toggleListening = useCallback(() => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Speech recognition is not supported in this browser.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'nl-NL'; // Dutch primary, will also understand English
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

    try {
      const resp = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg, context: buildContext() }),
      });
      const data = await resp.json();
      if (data.error) {
        setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${data.error}` }]);
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: data.response || '(no response)' }]);
      }
    } catch (e) {
      setMessages(prev => [...prev, { role: 'assistant', content: `Connection error: ${(e as Error).message}` }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="agent-panel">
      <div className="agent-panel-header">
        <span>AI Agent</span>
        <button className="agent-panel-close" onClick={onClose}>
          <X size={14} />
        </button>
      </div>
      <div className="agent-panel-body" ref={bodyRef}>
        {messages.length === 0 ? (
          <div className="agent-panel-placeholder">
            <p>AI structural engineering assistant</p>
            <p className="agent-hint">Ask questions about your model, get design suggestions, or check code compliance.</p>
          </div>
        ) : (
          <div className="agent-messages">
            {messages.map((m, i) => (
              <div key={i} className={`agent-msg agent-msg-${m.role}`}>
                <div className="agent-msg-label">{m.role === 'user' ? 'You' : 'Agent'}</div>
                <div className="agent-msg-content">{m.content}</div>
              </div>
            ))}
            {loading && (
              <div className="agent-msg agent-msg-assistant">
                <div className="agent-msg-label">Agent</div>
                <div className="agent-msg-content agent-loading">
                  <Loader2 size={14} className="agent-spinner" /> Thinking...
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      <div className="agent-panel-input-area">
        <input
          type="text"
          placeholder="Ask a question..."
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
