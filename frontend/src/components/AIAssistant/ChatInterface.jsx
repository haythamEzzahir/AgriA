import React, { useState, useEffect, useRef } from 'react';
import { useLanguage } from '../../i18n/context';
import { ai, farms, analyze } from '../../services/api';
import { Sparkles } from '../icons';
import {
  getCachedAnalysis,
  setCachedAnalysis,
  getSelectedFarmId,
} from '../../services/analysisCache';

export default function ChatInterface() {
  const { t } = useLanguage();
  const [messages, setMessages] = useState([
    { role: 'assistant', text: t('ai.welcome') },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [farm, setFarm] = useState(null);
  const [analysisData, setAnalysisData] = useState(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        const list = await farms.list();
        if (!list?.length) return;
        const storedId = getSelectedFarmId();
        const current = (storedId && list.find((f) => f.id === storedId)) || list[0];
        setFarm(current);

        // Try cache first — avoids triggering a fresh analyze call from the chat page
        const cached = getCachedAnalysis(current.id);
        if (cached) {
          setAnalysisData(cached);
        } else {
          // No cache → fetch fresh analysis so the AI has real context
          try {
            const fresh = await analyze.run(current.id);
            setAnalysisData(fresh);
            setCachedAnalysis(current.id, fresh);
          } catch {
            /* AI will still work, just without satellite context */
          }
        }
      } catch {
        /* ignore */
      }
    })();
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, loading]);

  const sendMessage = async () => {
    if (!input.trim() || !farm) return;
    const userMsg = { role: 'user', text: input };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await ai.explain({
        farmId: farm.id,
        question: input,
        analysis: analysisData,
      });
      setMessages((prev) => [...prev, { role: 'assistant', text: res.response }]);
    } catch (err) {
      setMessages((prev) => [...prev, { role: 'assistant', text: `Error: ${err.message}` }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-farm-100 shadow-sm overflow-hidden">
      <div ref={scrollRef} className="h-[500px] overflow-y-auto p-5 space-y-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fadeIn`}>
            {msg.role === 'assistant' && (
              <div className="w-8 h-8 rounded-full bg-agri-500 flex items-center justify-center text-white flex-shrink-0 mr-2 self-start">
                <Sparkles size={14} />
              </div>
            )}
            <div className={`max-w-[78%] px-4 py-2.5 rounded-2xl text-sm whitespace-pre-line leading-relaxed ${
              msg.role === 'user'
                ? 'bg-agri-500 text-white rounded-br-sm'
                : 'bg-farm-50 text-agri-800 rounded-bl-sm border border-farm-100'
            }`}>
              {msg.text}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start animate-fadeIn">
            <div className="w-8 h-8 rounded-full bg-agri-500 flex items-center justify-center text-white flex-shrink-0 mr-2 self-start">
              <Sparkles size={14} />
            </div>
            <div className="bg-farm-50 border border-farm-100 px-4 py-2.5 rounded-2xl flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-farm-400 animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-farm-400 animate-bounce" style={{ animationDelay: '120ms' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-farm-400 animate-bounce" style={{ animationDelay: '240ms' }} />
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-farm-100 p-3 flex gap-2 bg-white">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
          placeholder={t('ai.placeholder')}
          className="flex-1 px-4 py-2.5 bg-farm-50 border border-farm-200 rounded-xl text-sm text-agri-800 placeholder:text-farm-300 focus:outline-none focus:ring-2 focus:ring-agri-400 focus:border-transparent transition"
        />
        <button
          onClick={sendMessage}
          disabled={loading || !farm || !input.trim()}
          className="px-5 py-2 bg-agri-500 hover:bg-agri-400 disabled:bg-farm-200 disabled:text-farm-400 text-white rounded-xl text-sm font-semibold transition shadow-sm"
        >
          {t('ai.send')}
        </button>
      </div>
    </div>
  );
}
