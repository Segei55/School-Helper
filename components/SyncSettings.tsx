import React from 'react';
import { useSync } from '../hooks/useSync';
import { BrowserData } from '../types';
import { Cloud, Download, Upload, Loader2, CheckCircle, AlertTriangle } from 'lucide-react';

interface SyncSettingsProps {
  accessToken?: string;
  currentData: BrowserData;
  onDataImported: (data: BrowserData) => void;
  isDarkMode: boolean;
}

const SyncSettings: React.FC<SyncSettingsProps> = ({ accessToken, currentData, onDataImported, isDarkMode }) => {
  const [error, setError] = React.useState<string | null>(null);
  const [successMsg, setSuccessMsg] = React.useState<string | null>(null);

  const { isSyncing, exportData, importData, lastSyncTime } = useSync({
    accessToken,
    currentData,
    onDataImported: (data) => {
      onDataImported(data);
      setSuccessMsg('Данные успешно импортированы!');
      setTimeout(() => setSuccessMsg(null), 3000);
    },
    onSyncError: (err) => {
      setError(err);
      setTimeout(() => setError(null), 5000);
    }
  });

  const handleExport = async () => {
    setError(null);
    setSuccessMsg(null);
    await exportData();
    if (!error) {
        setSuccessMsg('Данные успешно экспортированы!');
        setTimeout(() => setSuccessMsg(null), 3000);
    }
  };

  const handleImport = async () => {
    setError(null);
    setSuccessMsg(null);
    await importData();
  };

  if (!accessToken) {
    return (
      <div className={`p-4 rounded-lg border ${isDarkMode ? 'border-red-500/20 bg-red-500/5' : 'border-red-200 bg-red-50'} flex items-center gap-3`}>
        <AlertTriangle className="text-red-500" size={20} />
        <div className="text-sm opacity-80">
          Для синхронизации необходимо войти в Google аккаунт.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold uppercase opacity-50 flex items-center gap-2">
          <Cloud size={16} /> Google Drive Sync
        </h3>
        {lastSyncTime && (
          <span className="text-[10px] opacity-40">
            Последняя синхронизация: {new Date(lastSyncTime).toLocaleTimeString()}
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={handleImport}
          disabled={isSyncing}
          className={`flex items-center justify-center gap-2 p-3 rounded-lg font-bold transition-all ${
            isDarkMode 
              ? 'bg-blue-500/10 text-blue-400 hover:bg-blue-500/20' 
              : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {isSyncing ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
          <span>Импорт</span>
        </button>

        <button
          onClick={handleExport}
          disabled={isSyncing}
          className={`flex items-center justify-center gap-2 p-3 rounded-lg font-bold transition-all ${
            isDarkMode 
              ? 'bg-green-500/10 text-green-400 hover:bg-green-500/20' 
              : 'bg-green-50 text-green-600 hover:bg-green-100'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {isSyncing ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />}
          <span>Экспорт</span>
        </button>
      </div>

      {error && (
        <div className="text-xs text-red-500 flex items-center gap-1 mt-2 animate-in fade-in slide-in-from-top-1">
          <AlertTriangle size={12} /> {error}
        </div>
      )}

      {successMsg && (
        <div className="text-xs text-green-500 flex items-center gap-1 mt-2 animate-in fade-in slide-in-from-top-1">
          <CheckCircle size={12} /> {successMsg}
        </div>
      )}

      <p className="text-[10px] opacity-40 text-center">
        Данные синхронизируются с папкой приложения на Google Диске (browser_sync.json).
        Это позволяет сохранить ваши вкладки, историю и настройки между устройствами (PC и Android).
      </p>
    </div>
  );
};

export default SyncSettings;
