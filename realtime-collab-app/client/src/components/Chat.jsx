import { useState, useEffect, useRef } from 'react';
import { Send } from 'lucide-react';

const Chat = ({ socket, roomId, username }) => {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const bottomRef = useRef(null);

  useEffect(() => {
    if (!socket) return;
    const handler = (data) => setMessages((prev) => [...prev, data]);
    socket.on('receive-message', handler);
    return () => socket.off('receive-message', handler);
  }, [socket]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = (e) => {
    e.preventDefault();
    if (!message.trim() || !socket) return;
    socket.emit('send-message', { roomId, message, sender: username });
    setMessages((prev) => [...prev, { message, sender: username, timestamp: new Date() }]);
    setMessage('');
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3">
        {messages.length === 0 && (
          <p className="text-center text-xs text-slate-500 mt-4">No messages yet</p>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`flex flex-col ${msg.sender === username ? 'items-end' : 'items-start'}`}>
            <span className="text-[10px] sm:text-xs text-slate-500 mb-1">{msg.sender}</span>
            <div
              className={`px-3 py-2 rounded-lg max-w-[85%] text-sm break-words ${
                msg.sender === username ? 'bg-primary text-white' : 'bg-slate-700 text-slate-200'
              }`}
            >
              {msg.message}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <form onSubmit={sendMessage} className="p-2 sm:p-3 border-t border-slate-700 flex gap-2 safe-bottom">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary text-white min-w-0"
        />
        <button
          type="submit"
          className="p-2 bg-primary rounded-lg hover:bg-blue-600 text-white shrink-0"
          aria-label="Send message"
        >
          <Send size={18} />
        </button>
      </form>
    </div>
  );
};

export default Chat;