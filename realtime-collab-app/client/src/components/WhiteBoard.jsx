import { useEffect, useRef, useState } from 'react';
import { Eraser, Pen, Trash2 } from 'lucide-react';

const Whiteboard = ({ socket, roomId }) => {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#3b82f6');
  const [isEraser, setIsEraser] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const resize = () => {
      const parent = canvas.parentElement;
      canvas.width = parent.clientWidth;
      canvas.height = parent.clientHeight;
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    };
    resize();
    window.addEventListener('resize', resize);

    const drawHandler = (data) => drawLine(data.x0, data.y0, data.x1, data.y1, data.color, data.isEraser);
    if (socket) socket.on('draw', drawHandler);
    return () => {
      window.removeEventListener('resize', resize);
      if (socket) socket.off('draw', drawHandler);
    };
  }, [socket]);

  const drawLine = (x0, y0, x1, y1, color, isEraser) => {
    const ctx = canvasRef.current.getContext('2d');
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.strokeStyle = isEraser ? '#0f172a' : color;
    ctx.lineWidth = isEraser ? 20 : 3;
    ctx.stroke();
    ctx.closePath();
  };

  const getPoint = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    if (e.touches) {
      return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
    }
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const start = (e) => {
    e.preventDefault();
    setIsDrawing(true);
    const p = getPoint(e);
    canvasRef.current.lastX = p.x;
    canvasRef.current.lastY = p.y;
  };

  const draw = (e) => {
    e.preventDefault();
    if (!isDrawing) return;
    const p = getPoint(e);
    const lastX = canvasRef.current.lastX;
    const lastY = canvasRef.current.lastY;
    drawLine(lastX, lastY, p.x, p.y, color, isEraser);
    if (socket) socket.emit('draw', { roomId, x0: lastX, y0: lastY, x1: p.x, y1: p.y, color, isEraser });
    canvasRef.current.lastX = p.x;
    canvasRef.current.lastY = p.y;
  };

  const stop = (e) => {
    e.preventDefault();
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  };

  return (
    <div className="h-full flex flex-col">
      <div className="p-2 border-b border-slate-700 flex gap-2 justify-center bg-slate-800/50 flex-wrap">
        <button
          onClick={() => setIsEraser(false)}
          className={`p-2 rounded ${!isEraser ? 'bg-primary text-white' : 'bg-slate-700 text-slate-400'}`}
          aria-label="Pen"
        >
          <Pen size={16} />
        </button>
        <button
          onClick={() => setIsEraser(true)}
          className={`p-2 rounded ${isEraser ? 'bg-primary text-white' : 'bg-slate-700 text-slate-400'}`}
          aria-label="Eraser"
        >
          <Eraser size={16} />
        </button>
        <input
          type="color"
          value={color}
          onChange={(e) => setColor(e.target.value)}
          className="w-8 h-8 rounded cursor-pointer bg-transparent border-0"
        />
        <button
          onClick={clearCanvas}
          className="p-2 rounded bg-slate-700 text-slate-400 hover:text-red-400 ml-auto"
          aria-label="Clear canvas"
        >
          <Trash2 size={16} />
        </button>
      </div>
      <canvas
        ref={canvasRef}
        className="flex-1 bg-dark cursor-crosshair touch-none"
        onMouseDown={start}
        onMouseMove={draw}
        onMouseUp={stop}
        onMouseLeave={stop}
        onTouchStart={start}
        onTouchMove={draw}
        onTouchEnd={stop}
      />
    </div>
  );
};

export default Whiteboard;