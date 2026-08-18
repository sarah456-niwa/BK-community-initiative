// src/components/Chat/ChatWidget.jsx
import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { useAuth } from '../../hooks/useAuth';
import { usePermissions } from '../../hooks/usePermissions';
import api from '../../services/api';
import { Send, X, MessageCircle, RefreshCw, Zap, Trash2, Download } from 'lucide-react';
import remarkGfm from 'remark-gfm';
import './ChatWidget.css';

const ChatWidget = () => {
  const { isAuthenticated } = useAuth();
  const { canView } = usePermissions(); // or any permission check
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { sender: 'bot', text: 'Hello! I\'m your M&E assistant. Ask me anything about the program, data, or reports.' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [providers, setProviders] = useState([]);
  const [selectedProvider, setSelectedProvider] = useState('auto');
  const [providerUsed, setProviderUsed] = useState(null);
  const messagesEndRef = useRef(null);

  // Only show chat if user is authenticated and has at least view permission
  if (!isAuthenticated) return null;

  useEffect(() => {
    if (isOpen) {
      loadProviders();
    }
  }, [isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadProviders = async () => {
    try {
      const response = await api.get('/ai/providers/');
      setProviders(response.data.available_providers || []);
    } catch (error) {
      console.error('Failed to load providers:', error);
    }
  };

  const clearChat = () => {
    setMessages([
      { sender: 'bot', text: 'Hello! I\'m your M&E assistant. Ask me anything about the program, data, or reports.' }
    ]);
  };

  const downloadAsWord = (e, index) => {
    e.stopPropagation();
    const element = document.getElementById(`chat-msg-${index}`);
    if (!element) return;
    
    // Create a basic HTML wrapper for Word to understand
    const header = "<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><title>Report</title></head><body>";
    const footer = "</body></html>";
    const sourceHTML = header + element.innerHTML + footer;
    
    const blob = new Blob(['\ufeff', sourceHTML], {
        type: 'application/msword'
    });
    
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'M_and_E_Report.doc';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const sendMessage = async () => {
    if (!input.trim()) return;
    const userMsg = { sender: 'user', text: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    setProviderUsed(null);

    try {
      const provider = selectedProvider === 'auto' ? null : selectedProvider;
      const response = await api.post('/chat/', {
        question: input,
        provider: provider,
      });
      const botMsg = { sender: 'bot', text: response.data.answer };
      setMessages(prev => [...prev, botMsg]);
      setProviderUsed(response.data.provider_used);
    } catch (error) {
      const errorMsg = error.response?.data?.error || 'Sorry, I could not process your question.';
      const providersList = error.response?.data?.available_providers;
      let extra = '';
      if (providersList && providersList.length) {
        extra = `\n\nAvailable providers: ${providersList.join(', ')}`;
      }
      setMessages(prev => [...prev, { sender: 'bot', text: errorMsg + extra }]);
    }
    setLoading(false);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="chat-widget-container">
      {!isOpen && (
        <button className="chat-toggle-btn" onClick={() => setIsOpen(true)}>
          <MessageCircle size={24} />
          <span className="chat-toggle-badge">AI</span>
        </button>
      )}
      {isOpen && (
        <div className="chat-window">
          <div className="chat-header">
            <div className="chat-header-title">
              <Zap size={18} style={{ marginRight: 8 }} />
              M&E Assistant
            </div>
            <div className="chat-header-actions">
              <button className="chat-refresh-btn" onClick={clearChat} title="Clear chat history">
                <Trash2 size={16} />
              </button>
              <button className="chat-refresh-btn" onClick={loadProviders} title="Refresh providers">
                <RefreshCw size={16} />
              </button>
              <button className="chat-close-btn" onClick={() => setIsOpen(false)}>
                <X size={18} />
              </button>
            </div>
          </div>

          <div className="chat-provider-selector">
            <span>Provider:</span>
            <select
              value={selectedProvider}
              onChange={(e) => setSelectedProvider(e.target.value)}
              className="chat-provider-select"
            >
              <option value="auto">🔄 Auto (Failover)</option>
              {providers.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
            {providerUsed && (
              <span className="chat-provider-used">Last: {providerUsed}</span>
            )}
          </div>

          <div className="chat-messages">
            {messages.map((msg, i) => (
              <div key={i} className={`chat-message ${msg.sender === 'user' ? 'user' : 'bot'}`}>
                <div className="chat-bubble" id={msg.sender === 'bot' ? `chat-msg-${i}` : undefined}>
                  {msg.sender === 'user' ? (
                    msg.text.split('\n').map((line, idx) => (
                      <React.Fragment key={idx}>
                        {line}
                        {idx < msg.text.split('\n').length - 1 && <br />}
                      </React.Fragment>
                    ))
                  ) : (
                    <ReactMarkdown
                      allowedElements={['p', 'strong', 'em', 'h1', 'h2', 'h3', 'h4', 'ul', 'ol', 'li', 'br', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'blockquote']}
                      unwrapDisallowed={true}
                      remarkPlugins={[remarkGfm]}
                    >
                      {msg.text}
                    </ReactMarkdown>
                  )}
                </div>
                {msg.sender === 'bot' && (
                  <button 
                    className="chat-download-btn" 
                    onClick={(e) => downloadAsWord(e, i)} 
                    title="Download as Word Document"
                  >
                    <Download size={14} />
                  </button>
                )}
              </div>
            ))}
            {loading && (
              <div className="chat-message bot">
                <div className="chat-bubble typing-indicator">Typing...</div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="chat-input-area">
            <textarea
              rows="2"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask me anything..."
              className="chat-input"
              disabled={loading}
            />
            <button
              className="chat-send-btn"
              onClick={sendMessage}
              disabled={loading || !input.trim()}
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatWidget;