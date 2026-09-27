import { useEffect, useRef, useState } from 'react';
import { MicOff } from 'lucide-react';

const VideoPlayer = ({ peer, username }) => {
  const ref = useRef();
  const [hasStream, setHasStream] = useState(false);

  useEffect(() => {
    if (!peer) return;
    const onStream = (stream) => {
      if (ref.current) {
        ref.current.srcObject = stream;
        setHasStream(true);
      }
    };
    peer.on('stream', onStream);
    return () => peer.off('stream', onStream);
  }, [peer]);

  return (
    <div className="relative bg-black rounded-lg sm:rounded-xl overflow-hidden aspect-video border border-slate-700">
      <video ref={ref} autoPlay playsInline className="w-full h-full object-cover" />
      <div className="absolute bottom-1.5 left-1.5 bg-black/60 px-2 py-0.5 rounded text-xs flex items-center gap-1 truncate max-w-[80%]">
        <span className="truncate">{username}</span>
      </div>
      {!hasStream && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-800">
          <div className="text-center">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-slate-700 flex items-center justify-center mx-auto mb-2 text-base sm:text-xl font-bold text-slate-400">
              {username?.[0]?.toUpperCase() || '?'}
            </div>
            <p className="text-[10px] sm:text-xs text-slate-400">Connecting...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoPlayer;