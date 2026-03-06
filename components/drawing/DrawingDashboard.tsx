import React, { useState, useEffect } from 'react';
import { 
  Plus, Trash2, Edit2, Image as ImageIcon, 
  MoreVertical, Calendar, Grid, Layers 
} from 'lucide-react';
import { DrawingProject } from '../../types';

interface DrawingDashboardProps {
  projects: DrawingProject[];
  onCreateProject: (width: number, height: number, name: string) => void;
  onOpenProject: (project: DrawingProject) => void;
  onDeleteProject: (id: string) => void;
  isDarkMode: boolean;
}

const DrawingDashboard: React.FC<DrawingDashboardProps> = ({
  projects,
  onCreateProject,
  onOpenProject,
  onDeleteProject,
  isDarkMode
}) => {
  const [showNewModal, setShowNewModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newWidth, setNewWidth] = useState(800);
  const [newHeight, setNewHeight] = useState(600);

  const handleCreate = () => {
    if (newProjectName.trim()) {
      onCreateProject(newWidth, newHeight, newProjectName);
      setShowNewModal(false);
      setNewProjectName('');
    }
  };

  return (
    <div className={`flex-1 flex flex-col p-8 overflow-y-auto ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Мои проекты</h1>
          <p className="opacity-60">Управляйте своими рисунками и создавайте новые шедевры</p>
        </div>
        <button 
          onClick={() => setShowNewModal(true)}
          className="px-6 py-3 bg-[#5865f2] hover:bg-[#4752c4] text-white rounded-xl font-bold shadow-lg shadow-indigo-500/30 transition-all transform hover:scale-105 flex items-center gap-2"
        >
          <Plus size={20} />
          Новый проект
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {/* Create New Card (Alternative) */}
        <div 
          onClick={() => setShowNewModal(true)}
          className={`aspect-[4/3] rounded-2xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all group ${isDarkMode ? 'border-white/10 hover:border-[#5865f2] hover:bg-[#5865f2]/5' : 'border-gray-300 hover:border-[#5865f2] hover:bg-blue-50'}`}
        >
          <div className="w-16 h-16 rounded-full bg-[#5865f2]/10 flex items-center justify-center text-[#5865f2] mb-4 group-hover:scale-110 transition-transform">
            <Plus size={32} />
          </div>
          <span className="font-bold opacity-70 group-hover:text-[#5865f2]">Создать новый</span>
        </div>

        {projects.map(project => (
          <div 
            key={project.id}
            className={`group relative aspect-[4/3] rounded-2xl overflow-hidden border shadow-sm hover:shadow-xl transition-all ${isDarkMode ? 'bg-[#2f3136] border-white/5' : 'bg-white border-gray-200'}`}
          >
            {/* Preview */}
            <div 
              onClick={() => onOpenProject(project)}
              className="absolute inset-0 bg-white cursor-pointer"
            >
              {project.thumbnail ? (
                <img src={project.thumbnail} alt={project.name} className="w-full h-full object-contain" />
              ) : (
                <div className="w-full h-full flex items-center justify-center opacity-20 bg-[url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAYAAACp8Z5+AAAAIklEQVQIW2NkQAKrVq36zwjjgzhhYWGMYAEYB8RmROaABADeOQ8CXl/xfgAAAABJRU5ErkJggg==')]">
                  <ImageIcon size={48} />
                </div>
              )}
            </div>

            {/* Overlay Info */}
            <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/80 via-black/40 to-transparent text-white opacity-0 group-hover:opacity-100 transition-opacity flex justify-between items-end pointer-events-none">
              <div>
                <h3 className="font-bold truncate max-w-[150px]">{project.name}</h3>
                <div className="text-xs opacity-70 flex items-center gap-2">
                  <span>{project.width}x{project.height}</span>
                  <span>•</span>
                  <span>{new Date(project.updatedAt).toLocaleDateString()}</span>
                </div>
              </div>
              <button 
                onClick={(e) => { e.stopPropagation(); onDeleteProject(project.id); }}
                className="p-2 rounded-lg bg-white/10 hover:bg-red-500 hover:text-white transition-colors pointer-events-auto"
                title="Удалить"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* New Project Modal */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setShowNewModal(false)}>
          <div className={`w-full max-w-md p-6 rounded-2xl shadow-2xl ${isDarkMode ? 'bg-[#2f3136]' : 'bg-white'}`} onClick={e => e.stopPropagation()}>
            <h2 className="text-2xl font-bold mb-6">Новый проект</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase opacity-50 mb-1">Название</label>
                <input 
                  value={newProjectName}
                  onChange={e => setNewProjectName(e.target.value)}
                  placeholder="Мой рисунок"
                  className={`w-full p-3 rounded-xl border bg-transparent outline-none focus:ring-2 focus:ring-[#5865f2] ${isDarkMode ? 'border-white/10' : 'border-gray-200'}`}
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase opacity-50 mb-1">Ширина (px)</label>
                  <input 
                    type="number"
                    value={newWidth}
                    onChange={e => setNewWidth(Number(e.target.value))}
                    className={`w-full p-3 rounded-xl border bg-transparent outline-none focus:ring-2 focus:ring-[#5865f2] ${isDarkMode ? 'border-white/10' : 'border-gray-200'}`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase opacity-50 mb-1">Высота (px)</label>
                  <input 
                    type="number"
                    value={newHeight}
                    onChange={e => setNewHeight(Number(e.target.value))}
                    className={`w-full p-3 rounded-xl border bg-transparent outline-none focus:ring-2 focus:ring-[#5865f2] ${isDarkMode ? 'border-white/10' : 'border-gray-200'}`}
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <button onClick={() => setShowNewModal(false)} className="flex-1 py-3 rounded-xl font-bold opacity-60 hover:opacity-100 hover:bg-black/5 transition-all">
                  Отмена
                </button>
                <button 
                  onClick={handleCreate}
                  disabled={!newProjectName.trim()}
                  className="flex-1 py-3 rounded-xl font-bold bg-[#5865f2] text-white hover:bg-[#4752c4] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  Создать
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DrawingDashboard;
