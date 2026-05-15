import React from 'react';
import { useLanguage } from '../i18n/context';
import ChatInterface from '../components/AIAssistant/ChatInterface';

export default function AIAssistant() {
  const { t } = useLanguage();

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-bold text-agri-50">{t('ai.title')}</h1>
      <p className="text-agri-500 text-xs">{t('ai.subtitle')}</p>
      <ChatInterface />
    </div>
  );
}
