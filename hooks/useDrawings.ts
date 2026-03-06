import { useState, useEffect, useCallback } from 'react';
import { DrawingProject } from '../types';

const STORAGE_KEY = 'school_helper_drawing_projects';

export const useDrawings = () => {
  const [projects, setProjects] = useState<DrawingProject[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error("Failed to load drawing projects", e);
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
  }, [projects]);

  const createProject = useCallback((width: number, height: number, name: string) => {
    const newProject: DrawingProject = {
      id: Date.now().toString(),
      name,
      width,
      height,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      layers: [
        {
          id: '1',
          name: 'Фон',
          visible: true,
          opacity: 1,
          locked: false,
          dataUrl: '', // Empty string for empty layer
          order: 0
        }
      ],
      activeLayerId: '1',
      gridType: 'none',
      backgroundType: 'none',
      backgroundColor: '#ffffff'
    };
    setProjects(prev => [newProject, ...prev]);
    return newProject;
  }, []);

  const updateProject = useCallback((updatedProject: DrawingProject) => {
    setProjects(prev => prev.map(p => p.id === updatedProject.id ? updatedProject : p));
  }, []);

  const deleteProject = useCallback((id: string) => {
    setProjects(prev => prev.filter(p => p.id !== id));
  }, []);

  const getProject = useCallback((id: string) => {
    return projects.find(p => p.id === id);
  }, [projects]);

  return {
    projects,
    createProject,
    updateProject,
    deleteProject,
    getProject
  };
};
