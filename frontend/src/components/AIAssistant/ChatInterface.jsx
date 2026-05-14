import React, { useState } from 'react';
import { useLanguage } from '../../i18n/context';

export default function ChatInterface() {
  const { t } = useLanguage();
  const [messages, setMessages] = useState([
    { role: 'assistant', text: t('ai.welcome') },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMsg = { role: 'user', text: input };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    setMessages((prev) => [...prev, { role: 'assistant', text: t('ai.thinking') }]);

    setTimeout(() => {
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: 'assistant',
          text: 'Based on your farm data, NDVI is at 0.42 which indicates moderate vegetation health. Soil moisture is at 28% — consider irrigating within 2 days if no rain is forecast.',
        };
        return updated;
      });
      setLoading(false);
    }, 1500);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-farm-100 overflow-hidden">
      <div className="h-[500px] overflow-y-auto p-4 space-y-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] p-3 rounded-xl text-sm ${
              msg.role === 'user' ? 'bg-gray-900 text-white' : 'bg-farm-50 text-gray-800'
            }`}>
              {msg.text}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-farm-50 p-3 rounded-xl">
              <span className="text-gray-400">{t('ai.thinking')}</span>
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-farm-100 p-4 flex gap-2">
        <input value={input} onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
          placeholder={t('ai.placeholder')}
          className="flex-1 px-4 py-2 border border-gray-200 rounded-xl text-sm focus:border-gray-900 focus:outline-none" />
        <button onClick={sendMessage} disabled={loading}
          className="px-4 py-2 bg-gray-900 text-white rounded-xl text-sm hover:bg-gray-800 disabled:opacity-50 transition">
          {t('ai.send')}
        </button>
      </div>
    </div>
  );
}
