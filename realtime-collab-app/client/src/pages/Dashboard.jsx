import { useContext, useState } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, LogOut, ArrowRight, Video, Monitor, PenTool, Lock } from 'lucide-react';

const Dashboard = () => {
  const { user, logout } = useContext(AuthContext);
  const [roomId, setRoomId] = useState('');
  const navigate = useNavigate();

  const handleCreate = () => {
    const newRoomId = Math.random().toString(36).substring(2, 9).toUpperCase();
    navigate(`/room/${newRoomId}`);
  };

  const handleJoin = () => {
    if (roomId.trim()) navigate(`/room/${roomId.trim().toUpperCase()}`);
    else alert('Please enter a Room ID');
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const features = [
    { icon: <Video size={20} />, label: 'HD Video' },
    { icon: <Monitor size={20} />, label: 'Screen Share' },
    { icon: <PenTool size={20} />, label: 'Whiteboard' },
    { icon: <Lock size={20} />, label: 'Encrypted' },
  ];

  return (
    <div className="min-h-screen bg-dark p-4 sm:p-6 lg:p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8 sm:mb-12">
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold">
              Welcome, <span className="text-primary">{user?.username || 'User'}</span>
            </h1>
            <p className="text-slate-400 mt-1 text-sm sm:text-base">Ready to collaborate?</p>
          </div>
          <button
            onClick={handleLogout}
            className="self-start sm:self-auto flex items-center gap-2 px-4 py-2 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20 transition-all text-sm"
          >
            <LogOut size={16} />
            Logout
          </button>
        </div>

        {/* Action Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 lg:gap-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-6 sm:p-8 bg-panel rounded-2xl border border-slate-700 hover:border-primary transition-all group"
          >
            <div className="w-12 h-12 sm:w-14 sm:h-14 bg-primary/20 rounded-xl flex items-center justify-center mb-4 sm:mb-6 text-primary group-hover:scale-110 transition-transform">
              <Plus size={22} />
            </div>
            <h2 className="text-lg sm:text-xl font-semibold mb-2">Create Meeting</h2>
            <p className="text-slate-400 mb-5 sm:mb-6 text-sm">Start a new secure video call.</p>
            <button
              onClick={handleCreate}
              className="w-full py-3 bg-primary rounded-lg font-semibold hover:bg-blue-600 transition-all text-white text-sm sm:text-base"
            >
              Start New Call
            </button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="p-6 sm:p-8 bg-panel rounded-2xl border border-slate-700 hover:border-accent transition-all group"
          >
            <div className="w-12 h-12 sm:w-14 sm:h-14 bg-accent/20 rounded-xl flex items-center justify-center mb-4 sm:mb-6 text-accent group-hover:scale-110 transition-transform">
              <ArrowRight size={22} />
            </div>
            <h2 className="text-lg sm:text-xl font-semibold mb-2">Join Meeting</h2>
            <p className="text-slate-400 mb-5 sm:mb-6 text-sm">Enter a Room ID to join.</p>
            <div className="flex flex-col xs:flex-row gap-2">
              <input
                type="text"
                placeholder="Room ID"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                className="flex-1 p-3 bg-dark border border-slate-600 rounded-lg focus:outline-none focus:border-accent text-white text-sm sm:text-base"
              />
              <button
                onClick={handleJoin}
                className="px-5 py-3 bg-accent rounded-lg font-semibold hover:bg-purple-600 transition-all text-white text-sm sm:text-base whitespace-nowrap"
              >
                Join
              </button>
            </div>
          </motion.div>
        </div>

        {/* Features */}
        <div className="mt-8 sm:mt-12 grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          {features.map((f, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + i * 0.05 }}
              className="p-4 sm:p-5 bg-panel/50 rounded-xl border border-slate-800 text-center hover:border-slate-600 transition-colors"
            >
              <div className="flex justify-center text-primary mb-2">{f.icon}</div>
              <p className="text-xs sm:text-sm text-slate-400">{f.label}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;