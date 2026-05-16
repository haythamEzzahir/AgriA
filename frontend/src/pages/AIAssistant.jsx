import React from 'react';
import { useLanguage } from '../i18n/context';
import ChatInterface from '../components/AIAssistant/ChatInterface';
import { Sparkles } from '../components/icons';

export default function AIAssistant() {
  const { t } = useLanguage();

  return (
    <div className="max-w-3xl mx-auto px-6 py-6">
      <div className="flex items-start gap-3 mb-5">
        <div className="w-10 h-10 rounded-xl bg-agri-500 flex items-center justify-center text-white shadow-sm flex-shrink-0">
          <Sparkles size={18} />
        </div>
        <div>
          <h1 className="text-xl font-bold text-agri-900">{t('ai.title')}</h1>
          <p className="text-farm-500 text-xs mt-0.5">{t('ai.subtitle')}</p>
        </div>
      </div>
      <ChatInterface />
    </div>
  );
}
