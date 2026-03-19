import { useState, useEffect, useRef } from 'react';
import { Send, Bot, User, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import api from '../lib/api';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export default function AIChat() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: '¡Hola! Soy tu asistente virtual de STN PQ\'s. ¿En qué puedo ayudarte hoy?',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId] = useState(`session_${Date.now()}`);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await api.post('/ai/chat', {
        message: input,
        sessionId,
        useLocal: true, // Usar AI local por defecto
      });

      const assistantMessage: Message = {
        role: 'assistant',
        content: response.data.response,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: Message = {
        role: 'assistant',
        content: 'Lo siento, hubo un error al procesar tu mensaje. Por favor, intenta nuevamente.',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const quickActions = [
    '¿Cuál es mi saldo?',
    '¿Cuáles son mis envíos?',
    'Quiero reportar un problema',
    'Ayuda',
  ];

  const handleQuickAction = (action: string) => {
    setInput(action);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container-custom max-w-4xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-[hsl(var(--secondary))]">Asistente Virtual</h1>
          <p className="text-muted-foreground">Preguntame lo que necesites sobre tus envíos</p>
        </div>

        <Card className="flex h-[600px] flex-col">
          <CardHeader className="border-b border-border">
            <CardTitle className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[hsl(var(--primary))]">
                <Bot className="h-6 w-6 text-white" />
              </div>
              Asistente IA - STN PQ's
            </CardTitle>
          </CardHeader>

          <CardContent className="flex-1 overflow-y-auto p-6">
            <div className="space-y-4">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {message.role === 'assistant' && (
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[hsl(var(--primary))]/10">
                      <Bot className="h-5 w-5 text-[hsl(var(--primary))]" />
                    </div>
                  )}
                  <div
                    className={`max-w-[70%] rounded-lg px-4 py-3 ${
                      message.role === 'user'
                        ? 'bg-[hsl(var(--primary))] text-white'
                        : 'bg-gray-100 text-foreground'
                    }`}
                  >
                    <p className="whitespace-pre-wrap text-sm">{message.content}</p>
                    <p
                      className={`mt-1 text-xs ${
                        message.role === 'user' ? 'text-blue-100' : 'text-muted-foreground'
                      }`}
                    >
                      {message.timestamp.toLocaleTimeString('es-AR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                  {message.role === 'user' && (
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[hsl(var(--secondary))]">
                      <User className="h-5 w-5 text-white" />
                    </div>
                  )}
                </div>
              ))}
              {loading && (
                <div className="flex gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[hsl(var(--primary))]/10">
                    <Bot className="h-5 w-5 text-[hsl(var(--primary))]" />
                  </div>
                  <div className="rounded-lg bg-gray-100 px-4 py-3">
                    <Loader2 className="h-5 w-5 animate-spin text-[hsl(var(--primary))]" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </CardContent>

          <div className="border-t border-border p-4">
            {/* Quick Actions */}
            <div className="mb-3 flex flex-wrap gap-2">
              {quickActions.map((action) => (
                <button
                  key={action}
                  onClick={() => handleQuickAction(action)}
                  className="rounded-full border border-border bg-white px-3 py-1 text-xs text-foreground transition-colors hover:bg-gray-50"
                  disabled={loading}
                >
                  {action}
                </button>
              ))}
            </div>

            {/* Input Form */}
            <form onSubmit={handleSend} className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Escribí tu mensaje..."
                className="input flex-1"
                disabled={loading}
              />
              <Button type="submit" disabled={loading || !input.trim()}>
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
              </Button>
            </form>
          </div>
        </Card>

        {/* Info Card */}
        <Card className="mt-6">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                <Bot className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h3 className="font-bold">Sobre el Asistente IA</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Nuestro asistente virtual puede ayudarte con consultas sobre tus envíos, saldo, crear
                  incidencias y más. Está disponible 24/7 para responder tus preguntas.
                </p>
                <div className="mt-3 text-xs text-muted-foreground">
                  💡 Tip: Podés preguntarle sobre el estado de tus envíos, tu saldo actual, o cómo crear
                  un nuevo envío.
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
