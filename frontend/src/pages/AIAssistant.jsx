import React from 'react';
import { useLanguage } from '../i18n/context';
import ChatInterface from '../components/AIAssistant/ChatInterface';

export default function AIAssistant() {
  const { t } = useLanguage();

  return (
    <div className="space-y-6 pb-20 md:pb-6">
      <h1 className="text-2xl font-bold text-gray-800">{t('ai.title')}</h1>
      <p className="text-gray-500 text-sm">{t('ai.subtitle')}</p>
      <ChatInterface />
    </div>
  );
}
