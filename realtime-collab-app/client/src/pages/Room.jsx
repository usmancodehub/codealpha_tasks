import { useEffect, useRef, useState, useContext, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import Peer from 'simple-peer';
import { AuthContext } from '../context/AuthContext';
import VideoPlayer from '../components/VideoPlayer';
import Chat from '../components/Chat';
import Whiteboard from '../components/WhiteBoard';
import FileShare from '../components/FileShare';
import {
  Mic, MicOff, Video, VideoOff, Monitor,
  PhoneOff, Users, Copy, Check, MessageSquare,
  PenTool, FolderOpen, X
} from 'lucide-react';

const SOCKET_URL = 'http://localhost:5000';

const Room = () => {
  const { roomId } = useParams();
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const [socket, setSocket] = useState(null);
  const [peers, setPeers] = useState([]);
  const [micOn, setMicOn] = useState(true);
  const [videoOn, setVideoOn] = useState(true);
  const [activeTab, setActiveTab] = useState('chat');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const userVideo = useRef();
  const peersRef = useRef([]);
  const streamRef = useRef();

  // ---- Setup ----
  useEffect(() => {
    const newSocket = io(SOCKET_URL, { transports: ['websocket'] });
    setSocket(newSocket);

    const init = async () => {
      try {
        const currentStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        streamRef.current = currentStream;
        if (userVideo.current) userVideo.current.srcObject = currentStream;

        newSocket.emit('join-room', { roomId, username: user?.username || 'Guest' });

        newSocket.on('room-users', (users) => {
          const newPeers = [];
          users.forEach((u) => {
            if (u.id === newSocket.id) return;
            const peer = createPeer(u.id, newSocket.id, currentStream);
            const obj = { peerID: u.id, peer, username: u.username };
            peersRef.current.push(obj);
            newPeers.push(obj);
          });
          setPeers([...newPeers]);
        });

        newSocket.on('user-joined', ({ id, username }) => {
          setPeers((prev) => {
            const exists = prev.find((p) => p.peerID === id);
            return exists ? prev : prev;
          });
        });

        newSocket.on('signal', ({ from, signal }) => {
          const item = peersRef.current.find((p) => p.peerID === from);
          if (item) item.peer.signal(signal);
        });

        newSocket.on('user-left', (id) => {
          const obj = peersRef.current.find((p) => p.peerID === id);
          if (obj) obj.peer.destroy();
          peersRef.current = peersRef.current.filter((p) => p.peerID !== id);
          setPeers((prev) => prev.filter((p) => p.peerID !== id));
        });

        // Handle new user signal for us
        newSocket.on('user-joined', ({ id, username, signal }) => {
          if (signal) {
            const peer = addPeer(signal, id, currentStream);
            const obj = { peerID: id, peer, username };
            peersRef.current.push(obj);
            setPeers((prev) => [...prev, obj]);
          }
        });
      } catch (err) {
        console.error('Media error:', err);
        alert('Could not access camera/microphone.');
      }
    };

    init();

    return () => {
      if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
      peersRef.current.forEach((p) => p.peer.destroy());
      peersRef.current = [];
      newSocket.disconnect();
    };
  }, [roomId, user]);

  const createPeer = useCallback((userToSignal, callerID, stream) => {
    const peer = new Peer({
      initiator: true, trickle: false, stream,
      config: { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] },
    });
    peer.on('signal', (signal) => socket?.emit('signal', { to: userToSignal, from: callerID, signal }));
    peer.on('error', (err) => console.warn('Peer error:', err.message));
    return peer;
  }, [socket]);

  const addPeer = useCallback((incomingSignal, callerID, stream) => {
    const peer = new Peer({
      initiator: false, trickle: false, stream,
      config: { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] },
    });
    peer.on('signal', (signal) => socket?.emit('signal', { to: callerID, from: socket?.id, signal }));
    peer.on('error', (err) => console.warn('Peer error:', err.message));
    peer.signal(incomingSignal);
    return peer;
  }, [socket]);

  // ---- Controls ----
  const toggleMic = () => {
    if (streamRef.current) {
      const a = streamRef.current.getAudioTracks()[0];
      a.enabled = !a.enabled;
      setMicOn(a.enabled);
    }
  };

  const toggleVideo = () => {
    if (streamRef.current) {
      const v = streamRef.current.getVideoTracks()[0];
      v.enabled = !v.enabled;
      setVideoOn(v.enabled);
    }
  };

  const shareScreen = async () => {
    try {
      const screen = await navigator.mediaDevices.getDisplayMedia({ cursor: true });
      const track = screen.getVideoTracks()[0];
      peersRef.current.forEach(({ peer }) => {
        const sender = peer._pc?.getSenders().find((s) => s.track?.kind === 'video');
        if (sender) sender.replaceTrack(track);
      });
      if (userVideo.current) userVideo.current.srcObject = screen;
      track.onended = () => {
        const cam = streamRef.current.getVideoTracks()[0];
        peersRef.current.forEach(({ peer }) => {
          const sender = peer._pc?.getSenders().find((s) => s.track?.kind === 'video');
          if (sender) sender.replaceTrack(cam);
        });
        if (userVideo.current) userVideo.current.srcObject = streamRef.current;
      };
    } catch {}
  };

  const leaveRoom = () => {
    if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
    peersRef.current.forEach((p) => p.peer.destroy());
    socket?.disconnect();
    navigate('/dashboard');
  };

  const copyRoomLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/room/${roomId}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ---- Grid class calculation ----
  const totalTiles = peers.length + 1;
  const gridClass =
    totalTiles === 1
      ? 'grid-cols-1'
      : totalTiles === 2
      ? 'grid-cols-1 md:grid-cols-2'
      : totalTiles <= 4
      ? 'grid-cols-1 sm:grid-cols-2'
      : 'grid-cols-2 lg:grid-cols-3 xl:grid-cols-4';

  const tabs = [
    { key: 'chat', label: 'Chat', icon: <MessageSquare size={16} /> },
    { key: 'whiteboard', label: 'Board', icon: <PenTool size={16} /> },
    { key: 'files', label: 'Files', icon: <FolderOpen size={16} /> },
  ];

  return (
    <div className="h-screen flex flex-col bg-dark overflow-hidden">
      {/* ---------- HEADER ---------- */}
      <div className="h-14 sm:h-16 border-b border-slate-700 flex items-center justify-between px-3 sm:px-6 bg-panel shrink-0 safe-top">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse shrink-0" />
          <h1 className="text-sm sm:text-lg font-bold truncate">
            Room: <span className="text-primary">{roomId}</span>
          </h1>
          <span className="hidden xs:flex text-xs text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full items-center gap-1 shrink-0">
            <Users size={12} /> {totalTiles}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={copyRoomLink}
            className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs sm:text-sm text-slate-300 transition-colors"
          >
            {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
            <span className="hidden md:inline">{copied ? 'Copied!' : 'Copy Invite Link'}</span>
          </button>
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 bg-slate-800 rounded-lg hover:bg-slate-700"
            aria-label="Open sidebar"
          >
            <MessageSquare size={18} />
          </button>
        </div>
      </div>

      {/* ---------- MAIN ---------- */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Video area */}
        <div className="flex-1 p-2 sm:p-4 overflow-y-auto">
          <div className={`grid gap-2 sm:gap-4 ${gridClass} h-full auto-rows-fr`}>
            {/* Local video */}
            <div className="relative bg-black rounded-lg sm:rounded-xl overflow-hidden aspect-video border-2 border-primary/50">
              <video ref={userVideo} autoPlay muted playsInline className="w-full h-full object-cover" />
              <div className="absolute bottom-1.5 left-1.5 bg-black/60 px-2 py-0.5 rounded text-xs flex items-center gap-1">
                {!micOn && <MicOff size={10} className="text-red-400" />}
                You
              </div>
            </div>

            {/* Remote videos */}
            {peers.map((p) => (
              <VideoPlayer key={p.peerID} peer={p.peer} username={p.username} />
            ))}

            {/* Empty state */}
            {peers.length === 0 && (
              <div className="hidden md:flex bg-slate-800/40 border border-dashed border-slate-700 rounded-xl items-center justify-center aspect-video">
                <div className="text-center px-4">
                  <Users size={32} className="text-slate-600 mx-auto mb-2" />
                  <p className="text-slate-400 text-sm">Waiting for others...</p>
                  <button
                    onClick={copyRoomLink}
                    className="text-primary text-xs mt-2 underline"
                  >
                    Copy invite link
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ---------- SIDEBAR (Desktop persistent) ---------- */}
        <div className="hidden lg:flex w-80 xl:w-96 border-l border-slate-700 bg-panel flex-col shrink-0">
          <div className="flex border-b border-slate-700">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-1 py-3 text-sm font-medium transition-all flex items-center justify-center gap-1.5 ${
                  activeTab === tab.key
                    ? 'text-primary border-b-2 border-primary'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {tab.icon}
                <span className="hidden xl:inline">{tab.label}</span>
              </button>
            ))}
          </div>
          <div className="flex-1 overflow-hidden">
            {socket && activeTab === 'chat' && <Chat socket={socket} roomId={roomId} username={user?.username} />}
            {socket && activeTab === 'whiteboard' && <Whiteboard socket={socket} roomId={roomId} />}
            {activeTab === 'files' && <FileShare roomId={roomId} />}
          </div>
        </div>

        {/* ---------- SIDEBAR (Mobile drawer) ---------- */}
        {sidebarOpen && (
          <>
            <div
              className="lg:hidden fixed inset-0 bg-black/60 z-40"
              onClick={() => setSidebarOpen(false)}
            />
            <div className="lg:hidden fixed inset-y-0 right-0 w-[90vw] max-w-md bg-panel z-50 flex flex-col animate-slide-in-right safe-top">
              <div className="h-14 flex items-center justify-between px-4 border-b border-slate-700">
                <span className="font-semibold">Collaboration</span>
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="p-2 rounded-lg hover:bg-slate-700"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="flex border-b border-slate-700">
                {tabs.map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-1.5 transition-all ${
                      activeTab === tab.key
                        ? 'text-primary border-b-2 border-primary'
                        : 'text-slate-400'
                    }`}
                  >
                    {tab.icon}
                    {tab.label}
                  </button>
                ))}
              </div>
              <div className="flex-1 overflow-hidden">
                {socket && activeTab === 'chat' && <Chat socket={socket} roomId={roomId} username={user?.username} />}
                {socket && activeTab === 'whiteboard' && <Whiteboard socket={socket} roomId={roomId} />}
                {activeTab === 'files' && <FileShare roomId={roomId} />}
              </div>
            </div>
          </>
        )}
      </div>

      {/* ---------- FOOTER CONTROLS ---------- */}
      <div className="h-16 sm:h-20 bg-panel border-t border-slate-700 flex items-center justify-center gap-2 sm:gap-4 shrink-0 safe-bottom">
        <button
          onClick={toggleMic}
          className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-all ${
            micOn ? 'bg-slate-700 hover:bg-slate-600' : 'bg-red-500/20'
          }`}
          aria-label="Toggle microphone"
        >
          {micOn ? <Mic size={18} /> : <MicOff size={18} className="text-red-400" />}
        </button>
        <button
          onClick={toggleVideo}
          className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-all ${
            videoOn ? 'bg-slate-700 hover:bg-slate-600' : 'bg-red-500/20'
          }`}
          aria-label="Toggle video"
        >
          {videoOn ? <Video size={18} /> : <VideoOff size={18} className="text-red-400" />}
        </button>
        <button
          onClick={shareScreen}
          className="hidden sm:flex w-12 h-12 rounded-full bg-slate-700 hover:bg-slate-600 items-center justify-center transition-all"
          aria-label="Share screen"
        >
          <Monitor size={18} />
        </button>
        <button
          onClick={leaveRoom}
          className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center transition-all"
          aria-label="Leave room"
        >
          <PhoneOff size={18} />
        </button>
      </div>
    </div>
  );
};

export default Room;