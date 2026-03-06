import React from 'react';
import { MemoryRouter, Routes, Route, Navigate, useParams, useNavigate } from 'react-router-dom';
import Gallery from '../components/drawing/Gallery';
import DrawingEditor from '../components/drawing/DrawingEditor';
import { useDrawings } from '../hooks/useDrawings';
import { DrawingProject } from '../types';

interface DrawingPageProps {
  isDarkMode?: boolean;
}

const EditorWrapper: React.FC<{ 
  projects: DrawingProject[], 
  onSave: (p: DrawingProject) => void,
  isDarkMode: boolean 
}> = ({ projects, onSave, isDarkMode }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const project = projects.find(p => p.id === id);

  if (!project) {
    return <Navigate to="/" replace />;
  }

  const handleSave = (updatedProject: DrawingProject, thumbnail: string) => {
    onSave({ ...updatedProject, thumbnail });
  };

  return (
    <DrawingEditor 
      project={project}
      onSaveProject={handleSave}
      onClose={() => navigate('/')}
      isDarkMode={isDarkMode}
    />
  );
};

const DrawingPage: React.FC<DrawingPageProps> = ({ isDarkMode = true }) => {
  const { projects, createProject, updateProject, deleteProject } = useDrawings();

  const handleCreate = (width: number, height: number, name: string) => {
    const newProject = createProject(width, height, name);
    // We can't navigate here easily because we are outside the Router context
    // But we can pass a callback or handle it in Gallery if we pass createProject there
    // Actually, createProject returns the new project, so we can't navigate from here unless we have access to navigate.
    // We will let Gallery handle navigation after creation if needed, or we can't.
    // Wait, Gallery uses useNavigate, so it can navigate!
    // But Gallery needs the ID of the new project.
    // createProject returns the new project synchronously.
    // So Gallery can do: const p = onCreate(...); navigate(/editor/${p.id});
  };

  return (
    <MemoryRouter>
      <Routes>
        <Route 
          path="/" 
          element={
            <Gallery 
              projects={projects}
              onCreateProject={(w, h, n) => {
                const p = createProject(w, h, n);
                // We need to access navigation here. 
                // Since Gallery is inside Router, it can use useNavigate.
                // But this callback is defined here.
                // We can change Gallery to accept createProject that returns the project, 
                // and Gallery handles navigation.
                return p; 
              }}
              onDeleteProject={deleteProject}
              isDarkMode={isDarkMode}
            />
          } 
        />
        <Route 
          path="/editor/:id" 
          element={
            <EditorWrapper 
              projects={projects}
              onSave={updateProject}
              isDarkMode={isDarkMode}
            />
          } 
        />
      </Routes>
    </MemoryRouter>
  );
};

export default DrawingPage;
