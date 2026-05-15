import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../i18n/context';
import { ai, farms } from '../../services/api';

export default function ChatInterface() {
  const { t } = useLanguage();
  const [messages, setMessages] = useState([
    { role: 'assistant', text: t('ai.welcome') },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [farmId, setFarmId] = useState(null);

  useEffect(() => {
    farms.list().then((data) => {
      if (data?.length > 0) setFarmId(data[0].id);
    }).catch(() => {});
  }, []);

  const sendMessage = async () => {
    if (!input.trim() || !farmId) return;

    const userMsg = { role: 'user', text: input };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await ai.explain({ farmId, question: input });
      setMessages((prev) => [...prev, { role: 'assistant', text: res.response }]);
    } catch (err) {
      setMessages((prev) => [...prev, { role: 'assistant', text: `Error: ${err.message}` }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-agri-800 rounded-lg border border-agri-700 overflow-hidden">
      <div className="h-[500px] overflow-y-auto p-4 space-y-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] p-3 rounded-lg text-sm ${
              msg.role === 'user' ? 'bg-agri-500 text-white' : 'bg-agri-700 text-agri-200'
            }`}>
              {msg.text}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-agri-700 p-3 rounded-lg">
              <span className="text-agri-500 text-sm">{t('ai.thinking')}</span>
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-agri-700 p-4 flex gap-2">
        <input value={input} onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
          placeholder={t('ai.placeholder')}
          className="flex-1 px-4 py-2 bg-agri-900 border border-agri-700 rounded-lg text-sm text-agri-200 placeholder:text-agri-600 focus:border-agri-500 focus:outline-none" />
        <button onClick={sendMessage} disabled={loading || !farmId}
          className="px-4 py-2 bg-agri-500 text-white rounded-lg text-sm hover:bg-agri-400 disabled:opacity-50 transition font-medium">
          {t('ai.send')}
        </button>
      </div>
    </div>
  );
}
