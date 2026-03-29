import { useState, useEffect, useRef } from 'react';
import { Send, Bot, User, Loader2, Sparkles } from 'lucide-react';
import Button from '../components/ui/Button';
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
      content: '¡Hola! Soy tu asistente virtual de STN PQ\'s. ¿En qué puedo ayudarte hoy? Puedo darte información sobre tus envíos, saldo, sucursales y más.',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId] = useState(`session_${Date.now()}`);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = messagesContainerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
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
    const sentInput = input;
    setInput('');
    setLoading(true);

    try {
      const response = await api.post('/ai/chat', {
        message: sentInput,
        sessionId,
      });

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: response.data.response,
          timestamp: new Date(),
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Lo siento, hubo un error al procesar tu mensaje. Por favor, intentá nuevamente.',
          timestamp: new Date(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const quickActions = [
    '¿Cuál es mi saldo?',
    '¿Cuáles son mis envíos?',
    'Quiero reportar un problema',
    '¿Cómo creo un envío?',
  ];

  return (
    <div className="min-h-screen" style={{ background: '#F8FAFC' }}>
      <div className="container-custom max-w-3xl py-10">

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3">
            <div
              className="flex h-11 w-11 items-center justify-center rounded-2xl"
              style={{ background: 'linear-gradient(135deg, #38BDF8, #0284C7)', boxShadow: '0 4px 14px rgba(2,132,199,0.30)' }}
            >
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1
                className="text-2xl font-black text-slate-900"
                style={{ fontFamily: "'Poppins', sans-serif", letterSpacing: '-0.02em' }}
              >
                Asistente Virtual
              </h1>
              <p className="text-sm text-slate-500">Disponible 24/7 para ayudarte</p>
            </div>
          </div>
        </div>

        {/* Chat card */}
        <div
          className="flex flex-col rounded-2xl bg-white overflow-hidden"
          style={{ height: '580px', boxShadow: '0 4px 24px rgba(0,0,0,0.08)', border: '1px solid #E2E8F0' }}
        >
          {/* Top bar */}
          <div
            className="flex items-center gap-3 px-5 py-4"
            style={{ borderBottom: '1px solid #E0F2FE', background: '#FAFCFF' }}
          >
            <div
              className="flex h-8 w-8 items-center justify-center rounded-xl"
              style={{ background: 'linear-gradient(135deg, #38BDF8, #0284C7)' }}
            >
              <Bot className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900">Asistente IA — STN PQ's</p>
              <p className="text-xs text-green-600 font-medium">● En línea</p>
            </div>
          </div>

          {/* Messages */}
          <div ref={messagesContainerRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {message.role === 'assistant' && (
                  <div
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl mt-1"
                    style={{ background: '#F0F9FF' }}
                  >
                    <Bot className="h-4 w-4" style={{ color: '#0284C7' }} />
                  </div>
                )}
                <div
                  className="max-w-[75%] rounded-2xl px-4 py-3"
                  style={
                    message.role === 'user'
                      ? { background: 'linear-gradient(135deg, #38BDF8, #0284C7)', color: '#fff', borderBottomRightRadius: '4px' }
                      : { background: '#F1F5F9', color: '#1E293B', borderBottomLeftRadius: '4px' }
                  }
                >
                  <p className="whitespace-pre-wrap text-sm leading-relaxed">{message.content}</p>
                  <p
                    className="mt-1.5 text-xs"
                    style={{ color: message.role === 'user' ? 'rgba(255,255,255,0.65)' : '#94A3B8' }}
                  >
                    {message.timestamp.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                {message.role === 'user' && (
                  <div
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl mt-1"
                    style={{ background: '#0F172A' }}
                  >
                    <User className="h-4 w-4 text-white" />
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div className="flex gap-3">
                <div
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl mt-1"
                  style={{ background: '#F0F9FF' }}
                >
                  <Bot className="h-4 w-4" style={{ color: '#0284C7' }} />
                </div>
                <div className="rounded-2xl px-4 py-3" style={{ background: '#F1F5F9', borderBottomLeftRadius: '4px' }}>
                  <div className="flex gap-1 items-center h-5">
                    {[0, 150, 300].map((delay) => (
                      <span
                        key={delay}
                        className="h-2 w-2 rounded-full"
                        style={{
                          background: '#94A3B8',
                          animation: `bounce 1s ${delay}ms infinite`,
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Input area */}
          <div
            className="px-4 py-3"
            style={{ borderTop: '1px solid #E0F2FE', background: '#FAFCFF' }}
          >
            {/* Quick actions */}
            <div className="mb-3 flex flex-wrap gap-1.5">
              {quickActions.map((action) => (
                <button
                  key={action}
                  onClick={() => setInput(action)}
                  disabled={loading}
                  className="rounded-full px-3 py-1 text-xs font-medium transition-all"
                  style={{ background: '#F0F9FF', color: '#0284C7', border: '1px solid #BAE6FD' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = '#E0F2FE'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = '#F0F9FF'; }}
                >
                  {action}
                </button>
              ))}
            </div>

            {/* Input form */}
            <form onSubmit={handleSend} className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Escribí tu mensaje..."
                disabled={loading}
                className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 outline-none transition"
                style={{ fontFamily: "'Inter', sans-serif" }}
                onFocus={(e) => { e.currentTarget.style.borderColor = '#38BDF8'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(56,189,248,0.15)'; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.boxShadow = 'none'; }}
              />
              <Button type="submit" disabled={loading || !input.trim()} size="md">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </form>
          </div>
        </div>

        {/* Info */}
        <div
          className="mt-4 flex items-start gap-3 rounded-2xl px-5 py-4"
          style={{ background: '#F0F9FF', border: '1px solid #BAE6FD' }}
        >
          <Sparkles className="h-4 w-4 shrink-0 mt-0.5" style={{ color: '#0284C7' }} />
          <p className="text-xs text-slate-600 leading-relaxed">
            <strong className="text-slate-800">Tip:</strong> Podés preguntarle sobre el estado de tus envíos, tu saldo actual, cómo crear un nuevo envío, o reportar un problema con una entrega.
          </p>
        </div>
      </div>

      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); }
          40% { transform: translateY(-5px); }
        }
      `}</style>
    </div>
  );
}
