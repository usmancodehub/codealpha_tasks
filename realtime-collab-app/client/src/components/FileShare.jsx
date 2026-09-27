import { useState } from 'react';
import axios from 'axios';
import { Upload, File, Download } from 'lucide-react';

const FileShare = ({ roomId }) => {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    formData.append('roomId', roomId);

    setUploading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post('http://localhost:5000/api/files/upload', formData, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setFiles((prev) => [...prev, { name: res.data.file.fileName, url: res.data.file.fileUrl }]);
    } catch (err) {
      alert('Upload failed: ' + (err.response?.data?.msg || err.message));
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  return (
    <div className="p-3 sm:p-4 h-full flex flex-col">
      <label className="flex flex-col items-center justify-center w-full h-28 sm:h-32 border-2 border-dashed border-slate-600 rounded-lg cursor-pointer hover:border-primary transition-colors bg-slate-800/50">
        <Upload className="text-slate-400 mb-2" size={22} />
        <span className="text-xs sm:text-sm text-slate-400 px-2 text-center">
          {uploading ? 'Uploading...' : 'Tap to upload file'}
        </span>
        <input type="file" className="hidden" onChange={handleUpload} disabled={uploading} />
      </label>
      <div className="mt-4 flex-1 overflow-y-auto space-y-2">
        {files.map((file, i) => (
          <div key={i} className="flex items-center justify-between p-2.5 sm:p-3 bg-slate-800 rounded-lg border border-slate-700">
            <div className="flex items-center gap-2 overflow-hidden min-w-0">
              <File size={16} className="text-primary shrink-0" />
              <span className="text-xs sm:text-sm truncate">{file.name}</span>
            </div>
            <a
              href={`http://localhost:5000${file.url}`}
              download
              className="p-1.5 hover:bg-slate-700 rounded shrink-0"
            >
              <Download size={14} />
            </a>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FileShare;