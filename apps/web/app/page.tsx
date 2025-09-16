'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { ChatResponse } from '@multibot/shared';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  type?: 'clarification' | 'plan' | 'result' | 'error';
  plan?: any;
  steps?: any[];
  result?: any;
  disambiguation?: any;
  taskId?: string;
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [awaitingConfirmation, setAwaitingConfirmation] = useState<{
    taskId: string;
    plan: any;
    steps: any[];
  } | null>(null);
  const [disambiguation, setDisambiguation] = useState<{
    question: string;
    choices: any[];
    taskId: string;
  } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async (message: string) => {
    if (!message.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: message,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_AUTH_TOKEN || 'local-dev-only'}`
        },
        body: JSON.stringify({
          conversationId,
          message
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data: ChatResponse = await response.json();

      if (!conversationId && data.taskId) {
        setConversationId(data.taskId);
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.message || '',
        timestamp: new Date(),
        type: data.type,
        plan: data.plan,
        steps: data.steps,
        result: data.result,
        disambiguation: data.disambiguation,
        taskId: data.taskId
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Handle different response types
      if (data.type === 'plan' && data.taskId) {
        setAwaitingConfirmation({
          taskId: data.taskId,
          plan: data.plan,
          steps: data.steps || []
        });
      } else if (data.type === 'clarification' && data.disambiguation) {
        setDisambiguation({
          question: data.disambiguation.question,
          choices: data.disambiguation.choices,
          taskId: data.taskId || ''
        });
      }

    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`,
        timestamp: new Date(),
        type: 'error'
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const executeTask = async (taskId: string, disambiguationChoice?: any) => {
    setIsLoading(true);

    try {
      const response = await fetch('/api/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_AUTH_TOKEN || 'local-dev-only'}`
        },
        body: JSON.stringify({
          taskId,
          confirm: true,
          disambiguation: disambiguationChoice ? { choiceId: disambiguationChoice.id } : undefined
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data: ChatResponse = await response.json();

      const resultMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: data.message || 'Task completed',
        timestamp: new Date(),
        type: data.type,
        result: data.result
      };

      setMessages(prev => [...prev, resultMessage]);

    } catch (error) {
      const errorMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `Execution error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`,
        timestamp: new Date(),
        type: 'error'
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      setAwaitingConfirmation(null);
      setDisambiguation(null);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleDisambiguationChoice = (choice: any) => {
    if (disambiguation) {
      executeTask(disambiguation.taskId, choice);
    }
  };

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Multibot Orchestrator</h1>
            <p className="text-sm text-gray-500">AI-powered construction management</p>
          </div>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-3xl rounded-lg px-4 py-2 ${
                message.role === 'user'
                  ? 'bg-primary-600 text-white'
                  : 'bg-white border border-gray-200'
              }`}
            >
              <div className="flex items-start space-x-2">
                {message.role === 'user' ? (
                  <User className="w-5 h-5 mt-0.5 flex-shrink-0" />
                ) : (
                  <Bot className="w-5 h-5 mt-0.5 flex-shrink-0" />
                )}
                <div className="flex-1">
                  <p className="text-sm">{message.content}</p>
                  
                  {/* Plan Preview */}
                  {message.type === 'plan' && message.plan && (
                    <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <h4 className="font-medium text-blue-900 mb-2">Execution Plan</h4>
                      <div className="text-sm text-blue-800">
                        <p><strong>Service:</strong> {message.plan.service}</p>
                        <p><strong>Intent:</strong> {message.plan.intent}</p>
                        {message.steps && message.steps.length > 0 && (
                          <div className="mt-2">
                            <p className="font-medium">Steps:</p>
                            <ul className="list-disc list-inside space-y-1">
                              {message.steps.map((step, index) => (
                                <li key={index}>{step.description}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Result */}
                  {message.type === 'result' && message.result && (
                    <div className="mt-3 p-3 bg-green-50 rounded-lg border border-green-200">
                      <div className="flex items-center space-x-2 mb-2">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <h4 className="font-medium text-green-900">Task Completed</h4>
                      </div>
                      <div className="text-sm text-green-800">
                        <pre className="whitespace-pre-wrap">
                          {JSON.stringify(message.result, null, 2)}
                        </pre>
                      </div>
                    </div>
                  )}

                  {/* Error */}
                  {message.type === 'error' && (
                    <div className="mt-3 p-3 bg-red-50 rounded-lg border border-red-200">
                      <div className="flex items-center space-x-2">
                        <AlertCircle className="w-4 h-4 text-red-600" />
                        <h4 className="font-medium text-red-900">Error</h4>
                      </div>
                    </div>
                  )}

                  <p className="text-xs opacity-70 mt-1">
                    {message.timestamp.toLocaleTimeString()}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ))}

        {/* Disambiguation */}
        {disambiguation && (
          <div className="flex justify-start">
            <div className="max-w-3xl bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h4 className="font-medium text-yellow-900 mb-3">{disambiguation.question}</h4>
              <div className="space-y-2">
                {disambiguation.choices.map((choice) => (
                  <button
                    key={choice.id}
                    onClick={() => handleDisambiguationChoice(choice)}
                    className="w-full text-left p-2 bg-white border border-yellow-300 rounded hover:bg-yellow-100 transition-colors"
                  >
                    {choice.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Loading indicator */}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white border border-gray-200 rounded-lg px-4 py-2">
              <div className="flex items-center space-x-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm text-gray-600">Processing...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Confirmation Panel */}
      {awaitingConfirmation && (
        <div className="border-t border-gray-200 bg-white p-4">
          <div className="max-w-3xl mx-auto">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-2">Confirm Execution</h4>
              <p className="text-sm text-blue-800 mb-3">
                Ready to execute the plan. Click "Run" to proceed.
              </p>
              <div className="flex space-x-3">
                <button
                  onClick={() => executeTask(awaitingConfirmation.taskId)}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                >
                  Run
                </button>
                <button
                  onClick={() => setAwaitingConfirmation(null)}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Input */}
      <div className="border-t border-gray-200 bg-white p-4">
        <form onSubmit={handleSubmit} className="max-w-3xl mx-auto">
          <div className="flex space-x-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask me to help with CompanyCam, AccuLynx, Bolt, or Slack..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
