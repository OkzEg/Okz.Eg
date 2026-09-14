import { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Loader2, Minus } from 'lucide-react';
import { toast } from 'react-toastify';
import { Link } from 'react-router-dom';
import { useWishlist } from '../../context/WishlistContext';
import { useShopActivity } from '../../context/ShopActivityContext';
import { useCart } from '../../context/CartContext';
import api from '../../api/axios';

const LANG_KEY = 'okz_chat_lang';

function rememberLang(mode) {
  try {
    if (mode) localStorage.setItem(LANG_KEY, mode);
  } catch {}
}

function lastKnownLang() {
  try {
    return localStorage.getItem(LANG_KEY) || 'egyptian_arabic';
  } catch {
    return 'egyptian_arabic';
  }
}

export default function ChatWidget() {
  const { items: wishlist } = useWishlist();
  const { addItem } = useCart();
  const { events, pendingRoasts, consumePendingRoast, trackSmallSizeCart } = useShopActivity();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasUnreadRoast, setHasUnreadRoast] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const roastBusy = useRef(false);

  const applyCartAction = (cartAction) => {
    if (!cartAction?.productId) return false;
    addItem(
      {
        id: cartAction.productId,
        name: cartAction.name,
        photos: cartAction.photos?.length ? cartAction.photos : [cartAction.image].filter(Boolean),
        price: cartAction.price,
        salePrice: cartAction.salePrice,
        isSaleActive: cartAction.isSaleActive,
        stock: cartAction.stock,
      },
      cartAction.qty || 1,
      cartAction.color || null,
      cartAction.size || null
    );
    trackSmallSizeCart?.({
      productId: cartAction.productId,
      productName: cartAction.name,
      size: cartAction.size || null,
    });
    toast.success(
      <span className="inline-flex flex-wrap items-center gap-x-3 gap-y-1">
        <span>Added to cart</span>
        <Link to="/cart" className="font-semibold underline underline-offset-2">
          View cart
        </Link>
      </span>
    );
    return true;
  };

  useEffect(() => {
    if (isOpen && !isMinimized && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, isMinimized]);

  useEffect(() => {
    if (isOpen && !isMinimized && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen, isMinimized]);

  useEffect(() => {
    if (isOpen && !isMinimized) setHasUnreadRoast(false);
  }, [isOpen, isMinimized]);

  // Proactive roast when customer does something dunk-worthy.
  useEffect(() => {
    if (!pendingRoasts.length || roastBusy.current) return undefined;

    let cancelled = false;
    const run = async () => {
      roastBusy.current = true;
      const event = consumePendingRoast();
      if (!event) {
        roastBusy.current = false;
        return;
      }

      try {
        const { data } = await api.post('/chat', {
          activityRoast: {
            type: event.type,
            productName: event.productName,
            size: event.size || null,
            language: lastKnownLang(),
          },
          wishlist,
          activity: events.slice(0, 5),
        });
        if (cancelled) return;
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: data.content,
            isActivity: true,
          },
        ]);
        setIsOpen(true);
        setIsMinimized(false);
        setHasUnreadRoast(true);
      } catch {
        // Silent — activity roasts are optional spice, not required UX.
      } finally {
        roastBusy.current = false;
      }
    };

    const timer = setTimeout(run, 450);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [pendingRoasts, consumePendingRoast, wishlist, events]);

  const toggleChat = () => {
    if (isOpen) {
      if (isMinimized) {
        setIsMinimized(false);
        setHasUnreadRoast(false);
      } else {
        setIsOpen(false);
      }
    } else {
      setIsOpen(true);
      setIsMinimized(false);
      setHasUnreadRoast(false);
    }
  };

  const minimizeChat = (e) => {
    e.stopPropagation();
    setIsMinimized(true);
  };

  const closeChat = (e) => {
    e.stopPropagation();
    setIsOpen(false);
    setIsMinimized(false);
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMsg = { role: 'user', content: input.trim() };
    const newMessages = [...messages, userMsg];

    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    try {
      const history = newMessages
        .filter((m) => m.role === 'user' || (m.role === 'assistant' && !m.isError))
        .slice(-12)
        .map((m) => ({ role: m.role, content: m.content }));

      const { data } = await api.post('/chat', {
        messages: history,
        wishlist,
        activity: events.slice(0, 5),
      });
      if (data.detectedLanguage) rememberLang(data.detectedLanguage);
      if (data.cartAction) applyCartAction(data.cartAction);
      setMessages([
        ...newMessages,
        {
          role: 'assistant',
          content: data.content,
          cartAdded: Boolean(data.cartAction),
        },
      ]);
    } catch (error) {
      const errorMsg =
        error.response?.data?.message || 'Sorry, I am having trouble connecting right now.';
      setMessages([...newMessages, { role: 'assistant', content: errorMsg, isError: true }]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={toggleChat}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-timber-900 text-wheat-500 shadow-xl transition-transform hover:scale-110 active:scale-95"
        aria-label="Open chat assistant"
      >
        <MessageSquare size={28} />
        {hasUnreadRoast && (
          <span className="absolute -top-0.5 -end-0.5 h-3.5 w-3.5 rounded-full bg-wheat ring-2 ring-white" />
        )}
      </button>
    );
  }

  if (isMinimized) {
    return (
      <div
        onClick={toggleChat}
        className="fixed bottom-6 right-6 z-50 flex h-14 items-center gap-3 rounded-full bg-timber-900 px-5 text-wheat-500 shadow-xl cursor-pointer hover:bg-timber-800 transition-colors"
      >
        <MessageSquare size={20} />
        <span className="text-sm font-semibold tracking-wide">OKZ Assistant</span>
        {hasUnreadRoast && (
          <span className="h-2.5 w-2.5 rounded-full bg-wheat" />
        )}
        <button
          onClick={closeChat}
          className="ml-2 rounded-full p-1 text-timber-400 hover:bg-timber-700 hover:text-white"
        >
          <X size={16} />
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 flex h-[500px] max-h-[80vh] w-[350px] max-w-[calc(100vw-3rem)] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-timber-900/10">
      <div className="flex items-center justify-between bg-timber-900 px-4 py-3 text-white">
        <div className="flex items-center gap-2">
          <MessageSquare size={20} className="text-wheat-500" />
          <span className="font-semibold tracking-wide">OKZ Assistant</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={minimizeChat}
            className="rounded p-1 text-timber-300 hover:bg-timber-800 hover:text-white transition-colors"
            aria-label="Minimize chat"
          >
            <Minus size={18} />
          </button>
          <button
            onClick={closeChat}
            className="rounded p-1 text-timber-300 hover:bg-timber-800 hover:text-white transition-colors"
            aria-label="Close chat"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 bg-[#FAFAFA]">
        <div className="flex flex-col gap-4">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-timber-900 text-white rounded-br-sm'
                    : msg.isError
                      ? 'bg-red-50 text-red-600 ring-1 ring-red-100 rounded-bl-sm'
                      : 'bg-white text-timber-900 ring-1 ring-timber-100 shadow-sm rounded-bl-sm'
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="flex max-w-[85%] items-center gap-2 rounded-2xl rounded-bl-sm bg-white px-4 py-3 text-sm text-timber-500 ring-1 ring-timber-100 shadow-sm">
                <Loader2 size={16} className="animate-spin" />
                Thinking...
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      <form onSubmit={handleSend} className="border-t border-timber-100 bg-white p-3">
        <div className="relative flex items-center">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about products..."
            className="w-full rounded-full border-0 bg-timber-50 py-2.5 pl-4 pr-12 text-sm text-timber-900 ring-1 ring-inset ring-timber-200 placeholder:text-timber-400 focus:ring-2 focus:ring-inset focus:ring-wheat-500"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="absolute right-1 flex h-8 w-8 items-center justify-center rounded-full bg-wheat-500 text-timber-900 transition-transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100"
          >
            <Send size={16} className="-ml-0.5" />
          </button>
        </div>
      </form>
    </div>
  );
}
