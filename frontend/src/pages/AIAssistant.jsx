import React from 'react';
import ChatInterface from '../components/AIAssistant/ChatInterface';

export default function AIAssistant() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">AI Agricultural Assistant</h1>
      <p className="text-gray-600">Ask anything about your farm — irrigation, pests, planting advice.</p>

      <ChatInterface />
    </div>
  );
}
