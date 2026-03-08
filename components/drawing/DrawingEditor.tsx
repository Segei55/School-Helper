import React, { useState, useEffect, useRef, useCallback } from 'react';
import { DrawingProject, DrawingLayer, DrawingToolType, GridType } from '../../types';
import { drawGrid } from './GridRenderer';
import LayerManager from './LayerManager';
import DrawingToolbar from './DrawingToolbar';
import { floodFill } from './FloodFill';
import { ArrowLeft, Save, Download, Maximize, Minimize, CheckCircle, Layers } from 'lucide-react';

interface DrawingEditorProps {
  project: DrawingProject;
  onSaveProject: (project: DrawingProject, thumbnail: string) => void;
  onClose: () => void;
  isDarkMode: boolean;
}

const DrawingEditor: React.FC<DrawingEditorProps> = ({
  project,
  onSaveProject,
  onClose,
  isDarkMode
}) => {
  // --- State ---
  const [layers, setLayers] = useState<DrawingLayer[]>(project.layers);
  const [activeLayerId, setActiveLayerId] = useState<string>(project.layers[0]?.id || '1');
  const [tool, setTool] = useState<DrawingToolType>('brush');
  const [brushSize, setBrushSize] = useState(5);
  const [brushColor, setBrushColor] = useState('#ed4245');
  const [backgroundColor, setBackgroundColor] = useState(project.backgroundColor);
  const [gridType, setGridType] = useState<GridType>(project.gridType);
  const [gridSize, setGridSize] = useState(20);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPresentationMode, setIsPresentationMode] = useState(false);
  const [showToast, setShowToast] = useState(false);
  
  // Export State
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportName, setExportName] = useState(project.name);
  const [exportFormat, setExportFormat] = useState<'png' | 'jpeg'>('png');
  
  // Layers Panel State
  const [isLayersVisible, setIsLayersVisible] = useState(true);
  const [layersWidth, setLayersWidth] = useState(288); // 72 * 4 = 288px
  const isResizingLayers = useRef(false);
  
  // History
  const [history, setHistory] = useState<{ layers: DrawingLayer[], backgroundColor: string }[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const bgTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Refs
  const wrapperRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRefs = useRef<Map<string, HTMLCanvasElement>>(new Map());
  const gridCanvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);
  const isPanning = useRef(false);
  const lastPos = useRef<{x: number, y: number} | null>(null);
  const lastPanPos = useRef<{x: number, y: number} | null>(null);
  const hasUnsavedChanges = useRef(false);
  
  // Swipe Handlers
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  // Two-finger Pan/Zoom
  const initialTouchDistance = useRef<number | null>(null);
  const initialTouchCenter = useRef<{x: number, y: number} | null>(null);
  const initialZoom = useRef<number>(1);
  const initialPan = useRef<{x: number, y: number}>({x: 0, y: 0});

  const handleTouchStartGlobal = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEndGlobal = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    
    const diffX = touchEndX - touchStartX.current;
    const diffY = touchEndY - touchStartY.current;

    // Only trigger if horizontal swipe is more prominent than vertical
    if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 50) {
      // Swipe left from the right edge to open layers
      if (diffX < -50 && touchStartX.current > window.innerWidth - 50 && !isLayersVisible) {
        setIsLayersVisible(true);
      }
      // Swipe right on the layers panel to close it
      else if (diffX > 50 && isLayersVisible && touchStartX.current > window.innerWidth - layersWidth) {
        setIsLayersVisible(false);
      }
    }
    
    touchStartX.current = null;
    touchStartY.current = null;
  };

  const handleResizeStart = (e: React.MouseEvent | React.TouchEvent) => {
    isResizingLayers.current = true;
  };

  useEffect(() => {
    const handleResizeMove = (e: MouseEvent | TouchEvent) => {
      if (!isResizingLayers.current) return;
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const newWidth = window.innerWidth - clientX;
      setLayersWidth(Math.max(260, Math.min(newWidth, window.innerWidth - 100)));
    };

    const handleResizeEnd = () => {
      isResizingLayers.current = false;
    };

    window.addEventListener('mousemove', handleResizeMove);
    window.addEventListener('mouseup', handleResizeEnd);
    window.addEventListener('touchmove', handleResizeMove);
    window.addEventListener('touchend', handleResizeEnd);

    return () => {
      window.removeEventListener('mousemove', handleResizeMove);
      window.removeEventListener('mouseup', handleResizeEnd);
      window.removeEventListener('touchmove', handleResizeMove);
      window.removeEventListener('touchend', handleResizeEnd);
    };
  }, []);

  // --- Pointer Lock Listener ---
  useEffect(() => {
    const handleLockChange = () => {
      if (document.pointerLockElement !== wrapperRef.current) {
        isPanning.current = false;
        lastPanPos.current = null;
      }
    };
    document.addEventListener('pointerlockchange', handleLockChange);
    return () => document.removeEventListener('pointerlockchange', handleLockChange);
  }, []);

  // --- Initialization ---
  useEffect(() => {
    // Restore canvas content from dataURLs
    layers.forEach(layer => {
      const canvas = canvasRefs.current.get(layer.id);
      if (canvas && layer.dataUrl) {
        const ctx = canvas.getContext('2d');
        const img = new Image();
        img.src = layer.dataUrl;
        img.onload = () => ctx?.drawImage(img, 0, 0);
      }
    });
  }, []); // Run once on mount

  // Track changes
  useEffect(() => {
    hasUnsavedChanges.current = true;
  }, [layers, backgroundColor, gridType, gridSize]);

  // Draw Grid when type/zoom changes
  useEffect(() => {
    const canvas = gridCanvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Calculate contrasting color for grid
        const getGridColor = (bgColor: string) => {
          const hex = bgColor.replace('#', '');
          const r = parseInt(hex.substring(0, 2), 16);
          const g = parseInt(hex.substring(2, 4), 16);
          const b = parseInt(hex.substring(4, 6), 16);
          const brightness = (r * 299 + g * 587 + b * 114) / 1000;
          return brightness > 128 ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.15)';
        };

        drawGrid(ctx, project.width, project.height, gridType, getGridColor(backgroundColor), gridSize);
      }
    }
  }, [gridType, gridSize, project.width, project.height, backgroundColor]);

  // --- History Management ---
  // Save history AFTER an action is completed
  const saveHistory = useCallback((currentLayers: DrawingLayer[], currentBackgroundColor: string) => {
    const currentStateLayers = currentLayers.map(l => {
      const canvas = canvasRefs.current.get(l.id);
      return {
        ...l,
        dataUrl: canvas?.toDataURL() || ''
      };
    });
    
    const currentState = {
      layers: currentStateLayers,
      backgroundColor: currentBackgroundColor
    };
    
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(currentState);
    
    if (newHistory.length > 20) newHistory.shift();
    
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  }, [history, historyIndex]);

  // Initial history save
  useEffect(() => {
    if (history.length === 0 && layers.length > 0) {
       // Wait for canvases to be ready
       setTimeout(() => saveHistory(layers, backgroundColor), 100);
    }
  }, []);

  const restoreCanvasState = useCallback((state: DrawingLayer[]) => {
    state.forEach(layer => {
      const canvas = canvasRefs.current.get(layer.id);
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          if (layer.dataUrl) {
            const img = new Image();
            img.src = layer.dataUrl;
            img.onload = () => ctx.drawImage(img, 0, 0);
          }
        }
      }
    });
  }, []);

  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const prevState = history[historyIndex - 1];
      setLayers(prevState.layers);
      setBackgroundColor(prevState.backgroundColor);
      setHistoryIndex(historyIndex - 1);
      restoreCanvasState(prevState.layers);
    }
  }, [history, historyIndex, restoreCanvasState]);

  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const nextState = history[historyIndex + 1];
      setLayers(nextState.layers);
      setBackgroundColor(nextState.backgroundColor);
      setHistoryIndex(historyIndex + 1);
      restoreCanvasState(nextState.layers);
    }
  }, [history, historyIndex, restoreCanvasState]);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if any input is focused to avoid triggering when typing
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo]);
  
  const handleBackgroundColorChange = (newColor: string) => {
    setBackgroundColor(newColor);
    
    if (bgTimeoutRef.current) clearTimeout(bgTimeoutRef.current);
    
    bgTimeoutRef.current = setTimeout(() => {
        saveHistory(layers, newColor);
    }, 500);
  };

  const [cursorPos, setCursorPos] = useState<{x: number, y: number} | null>(null);
  const [eyedropperColor, setEyedropperColor] = useState<string>('#ffffff');
  const helperCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // --- Helper: Get Composite Color ---
  const getCompositeColor = (x: number, y: number) => {
      const ix = Math.floor(x);
      const iy = Math.floor(y);
      
      if (!helperCanvasRef.current) {
          helperCanvasRef.current = document.createElement('canvas');
          helperCanvasRef.current.width = 1;
          helperCanvasRef.current.height = 1;
      }
      const ctx = helperCanvasRef.current.getContext('2d');
      if (!ctx) return backgroundColor;
      
      ctx.clearRect(0, 0, 1, 1);
      
      // Fill background
      ctx.fillStyle = backgroundColor;
      ctx.fillRect(0, 0, 1, 1);
      
      // Draw layers
      layers.forEach(layer => {
          if (!layer.visible) return;
          const layerCanvas = canvasRefs.current.get(layer.id);
          if (layerCanvas) {
              ctx.globalAlpha = layer.opacity;
              ctx.drawImage(layerCanvas, ix, iy, 1, 1, 0, 0, 1, 1);
          }
      });
      
      const pixel = ctx.getImageData(0, 0, 1, 1).data;
      return "#" + ((1 << 24) + (pixel[0] << 16) + (pixel[1] << 8) + pixel[2]).toString(16).slice(1);
  };

  // --- Drawing Logic ---
  const getCoordinates = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRefs.current.get(activeLayerId);
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;

    // Adjust for zoom and position
    return {
      x: (clientX - rect.left) / zoom,
      y: (clientY - rect.top) / zoom
    };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    // Prevent drawing with right click
    if ('button' in e && e.button === 2) return;

    if ('touches' in e && e.touches.length === 2) {
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const dist = Math.hypot(touch1.clientX - touch2.clientX, touch1.clientY - touch2.clientY);
      initialTouchDistance.current = dist;
      initialTouchCenter.current = {
        x: (touch1.clientX + touch2.clientX) / 2,
        y: (touch1.clientY + touch2.clientY) / 2
      };
      initialZoom.current = zoom;
      initialPan.current = { ...pan };
      isDrawing.current = false;
      return;
    }

    const layer = layers.find(l => l.id === activeLayerId);
    if (!layer || !layer.visible || layer.locked) return;

    const { x, y } = getCoordinates(e);
    const canvas = canvasRefs.current.get(activeLayerId);
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    if (tool === 'fill') {
      floodFill(ctx, Math.floor(x), Math.floor(y), brushColor);
      
      // Update dataUrl immediately for the fill action
      const newDataUrl = canvas.toDataURL();
      const newLayers = layers.map(l => l.id === activeLayerId ? { ...l, dataUrl: newDataUrl } : l);
      setLayers(newLayers);
      saveHistory(newLayers, backgroundColor);
      return;
    }

    if (tool === 'eyedropper') {
      const ix = Math.floor(x);
      const iy = Math.floor(y);
      let pickedColor = backgroundColor;

      // Iterate from top layer to bottom
      for (let i = layers.length - 1; i >= 0; i--) {
        const layer = layers[i];
        if (!layer.visible) continue;
        
        const layerCanvas = canvasRefs.current.get(layer.id);
        if (!layerCanvas) continue;
        
        const layerCtx = layerCanvas.getContext('2d');
        if (!layerCtx) continue;

        const pixel = layerCtx.getImageData(ix, iy, 1, 1).data;
        // If not fully transparent
        if (pixel[3] > 0) {
          // Convert to HEX
          pickedColor = "#" + ((1 << 24) + (pixel[0] << 16) + (pixel[1] << 8) + pixel[2]).toString(16).slice(1);
          break;
        }
      }

      setBrushColor(pickedColor);
      setTool('brush');
      return;
    }

    isDrawing.current = true;
    lastPos.current = { x, y };

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = brushSize;
    
    if (tool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = brushColor;
    }

    // Dot
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if ('touches' in e && e.touches.length === 2) {
      if (initialTouchDistance.current === null || initialTouchCenter.current === null) return;
      
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const dist = Math.hypot(touch1.clientX - touch2.clientX, touch1.clientY - touch2.clientY);
      const center = {
        x: (touch1.clientX + touch2.clientX) / 2,
        y: (touch1.clientY + touch2.clientY) / 2
      };

      const scale = dist / initialTouchDistance.current;
      const newZoom = Math.min(Math.max(initialZoom.current * scale, 0.1), 5);
      
      const deltaX = center.x - initialTouchCenter.current.x;
      const deltaY = center.y - initialTouchCenter.current.y;
      
      setZoom(newZoom);
      setPan({
        x: initialPan.current.x + deltaX,
        y: initialPan.current.y + deltaY
      });
      return;
    }

    // Update cursor position
    if (!('touches' in e)) {
       const { x, y } = getCoordinates(e);
       setCursorPos({ x, y });
    }

    if (!isDrawing.current || !lastPos.current) return;
    
    const { x, y } = getCoordinates(e);
    const canvas = canvasRefs.current.get(activeLayerId);
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;

    ctx.beginPath();
    ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(x, y);
    ctx.stroke();

    lastPos.current = { x, y };
  };

  const stopDrawing = (e?: React.MouseEvent | React.TouchEvent) => {
    if (e && 'touches' in e && e.touches.length < 2) {
      initialTouchDistance.current = null;
      initialTouchCenter.current = null;
    }

    if (!isDrawing.current) return;
    isDrawing.current = false;
    lastPos.current = null;
    
    // Update dataUrl in state for the active layer
    const canvas = canvasRefs.current.get(activeLayerId);
    if (canvas) {
      const newDataUrl = canvas.toDataURL();
      const newLayers = layers.map(l => l.id === activeLayerId ? { ...l, dataUrl: newDataUrl } : l);
      setLayers(newLayers);
      saveHistory(newLayers, backgroundColor);
    }
  };

  // --- Zoom & Pan Logic ---
  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      setZoom(prev => Math.min(Math.max(prev + delta, 0.1), 5));
    }
  };

  const handleWindowMouseMove = useCallback((e: MouseEvent) => {
    if (!isPanning.current) return;

    if (document.pointerLockElement === wrapperRef.current) {
       setPan(prev => ({ x: prev.x + e.movementX, y: prev.y + e.movementY }));
    } else {
       // Fallback using client coordinates
       if (lastPanPos.current) {
         const deltaX = e.clientX - lastPanPos.current.x;
         const deltaY = e.clientY - lastPanPos.current.y;
         setPan(prev => ({ x: prev.x + deltaX, y: prev.y + deltaY }));
         lastPanPos.current = { x: e.clientX, y: e.clientY };
       }
    }
  }, []);

  const handleWindowMouseUp = useCallback(() => {
    isPanning.current = false;
    lastPanPos.current = null;
    if (document.pointerLockElement === wrapperRef.current) {
      document.exitPointerLock();
    }
    window.removeEventListener('mousemove', handleWindowMouseMove);
    window.removeEventListener('mouseup', handleWindowMouseUp);
  }, [handleWindowMouseMove]);

  // Cleanup on unmount
  useEffect(() => {
      return () => {
          window.removeEventListener('mousemove', handleWindowMouseMove);
          window.removeEventListener('mouseup', handleWindowMouseUp);
      }
  }, [handleWindowMouseMove, handleWindowMouseUp]);

  const handleMouseDown = async (e: React.MouseEvent) => {
    if (e.button === 2) { // Right click
      isPanning.current = true;
      lastPanPos.current = { x: e.clientX, y: e.clientY };
      try {
        await wrapperRef.current?.requestPointerLock();
      } catch (err) {
        console.error("Pointer lock failed", err);
      }
      window.addEventListener('mousemove', handleWindowMouseMove);
      window.addEventListener('mouseup', handleWindowMouseUp);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    // Update cursor position if not panning
    if (!isPanning.current) {
        const { x, y } = getCoordinates(e);
        setCursorPos({ x, y });
        
        if (tool === 'eyedropper') {
            const color = getCompositeColor(x, y);
            setEyedropperColor(color);
        }
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    // Only handle drawing stop here, panning is handled by window listener
    if (!isPanning.current) {
        stopDrawing(e);
    }
  };

  const handleMouseEnter = (e: React.MouseEvent) => {
     const { x, y } = getCoordinates(e);
     setCursorPos({ x, y });
     if (tool === 'eyedropper') {
        const color = getCompositeColor(x, y);
        setEyedropperColor(color);
     }
  };

  const handleMouseLeave = (e: React.MouseEvent) => {
     setCursorPos(null);
     // Do not stop panning here, window listener handles it
     stopDrawing(e);
  };

  // --- Layer Management ---
  const addLayer = () => {
    const newId = Date.now().toString();
    const newLayer: DrawingLayer = {
      id: newId,
      name: `Слой ${layers.length + 1}`,
      visible: true,
      opacity: 1,
      locked: false,
      dataUrl: '',
      order: layers.length
    };
    const newLayers = [...layers, newLayer];
    setLayers(newLayers);
    setActiveLayerId(newId);
    saveHistory(newLayers, backgroundColor);
  };

  const deleteLayer = (id: string) => {
    if (layers.length <= 1) return;
    const newLayers = layers.filter(l => l.id !== id);
    setLayers(newLayers);
    if (activeLayerId === id) {
      setActiveLayerId(newLayers[newLayers.length - 1].id);
    }
    saveHistory(newLayers, backgroundColor);
  };

  const toggleVisibility = (id: string) => {
    const newLayers = layers.map(l => l.id === id ? { ...l, visible: !l.visible } : l);
    setLayers(newLayers);
    saveHistory(newLayers, backgroundColor);
  };

  const toggleLock = (id: string) => {
    const newLayers = layers.map(l => l.id === id ? { ...l, locked: !l.locked } : l);
    setLayers(newLayers);
    saveHistory(newLayers, backgroundColor);
  };

  const reorderLayer = (id: string, direction: 'up' | 'down') => {
    const index = layers.findIndex(l => l.id === id);
    if (index === -1) return;
    
    const newLayers = [...layers];
    if (direction === 'up' && index < layers.length - 1) {
      [newLayers[index], newLayers[index + 1]] = [newLayers[index + 1], newLayers[index]];
    } else if (direction === 'down' && index > 0) {
      [newLayers[index], newLayers[index - 1]] = [newLayers[index - 1], newLayers[index]];
    }
    setLayers(newLayers);
    saveHistory(newLayers, backgroundColor);
  };

  const renameLayer = (id: string, newName: string) => {
    const newLayers = layers.map(l => l.id === id ? { ...l, name: newName } : l);
    setLayers(newLayers);
    saveHistory(newLayers, backgroundColor);
  };

  const updateLayerOpacity = (id: string, opacity: number) => {
    const newLayers = layers.map(l => l.id === id ? { ...l, opacity } : l);
    setLayers(newLayers);
    // Debounce history save for opacity slider
    if (bgTimeoutRef.current) clearTimeout(bgTimeoutRef.current);
    bgTimeoutRef.current = setTimeout(() => {
        saveHistory(newLayers, backgroundColor);
    }, 500);
  };

  // --- Saving ---
  const handleSave = useCallback((isManual = false) => {
    // Composite all layers for thumbnail
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = project.width;
    tempCanvas.height = project.height;
    const ctx = tempCanvas.getContext('2d');
    if (!ctx) return;

    // Background
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, project.width, project.height);

    // Layers
    layers.forEach(layer => {
      if (layer.visible) {
        const canvas = canvasRefs.current.get(layer.id);
        if (canvas) {
          ctx.globalAlpha = layer.opacity;
          ctx.drawImage(canvas, 0, 0);
        }
      }
    });

    const thumbnail = tempCanvas.toDataURL('image/png', 0.5);
    
    const updatedProject: DrawingProject = {
      ...project,
      layers,
      backgroundColor,
      gridType,
      thumbnail,
      updatedAt: Date.now()
    };
    
    onSaveProject(updatedProject, thumbnail);
    hasUnsavedChanges.current = false;

    if (isManual) {
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    }
  }, [project, layers, backgroundColor, gridType, onSaveProject]);

  // Keep ref to latest save function for unmount/autosave
  const handleSaveRef = useRef(handleSave);
  useEffect(() => {
    handleSaveRef.current = handleSave;
  }, [handleSave]);

  // Autosave effect
  useEffect(() => {
    const timer = setTimeout(() => {
      if (hasUnsavedChanges.current) {
        handleSaveRef.current(false);
      }
    }, 1000); // Autosave after 1 second of inactivity

    return () => clearTimeout(timer);
  }, [layers, backgroundColor, gridType, gridSize]);

  // Unmount / BeforeUnload save
  useEffect(() => {
    const handleUnload = () => {
      if (hasUnsavedChanges.current) {
        handleSaveRef.current(false);
      }
    };
    window.addEventListener('beforeunload', handleUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleUnload);
      if (hasUnsavedChanges.current) {
        handleSaveRef.current(false);
      }
    };
  }, []);

  const handleDownload = () => {
    setExportName(project.name);
    setIsExportModalOpen(true);
  };

  const performExport = () => {
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = project.width;
    tempCanvas.height = project.height;
    const ctx = tempCanvas.getContext('2d');
    if (!ctx) return;

    // Fill background (white if jpeg, otherwise backgroundColor)
    if (exportFormat === 'jpeg') {
        // Check if background is transparent/none
        if (backgroundColor === 'transparent' || backgroundColor === 'none' || !backgroundColor) {
             ctx.fillStyle = '#ffffff';
        } else {
             ctx.fillStyle = backgroundColor;
        }
    } else {
        if (backgroundColor && backgroundColor !== 'transparent' && backgroundColor !== 'none') {
            ctx.fillStyle = backgroundColor;
        }
    }
    
    if (backgroundColor && backgroundColor !== 'transparent' && backgroundColor !== 'none') {
        ctx.fillRect(0, 0, project.width, project.height);
    } else if (exportFormat === 'jpeg') {
        ctx.fillRect(0, 0, project.width, project.height);
    }

    layers.forEach(layer => {
      if (layer.visible) {
        const canvas = canvasRefs.current.get(layer.id);
        if (canvas) {
          ctx.globalAlpha = layer.opacity;
          ctx.drawImage(canvas, 0, 0);
        }
      }
    });

    const link = document.createElement('a');
    link.download = `${exportName}.${exportFormat}`;
    link.href = tempCanvas.toDataURL(`image/${exportFormat}`, 0.9);
    link.click();
    
    setIsExportModalOpen(false);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  return (
    <div 
      className={`flex h-full w-full overflow-hidden ${isDarkMode ? 'bg-[#1e1f22]' : 'bg-gray-100'}`}
      onTouchStart={handleTouchStartGlobal}
      onTouchEnd={handleTouchEndGlobal}
    >
      
      {/* Toast Notification */}
      {showToast && (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5 fade-in duration-300 pointer-events-none">
          <div className="bg-[#2f3136] text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 border border-white/10">
            <div className="bg-green-500/20 p-1 rounded-full">
              <CheckCircle size={16} className="text-green-500" />
            </div>
            <span className="font-bold text-sm">Холст сохранён!</span>
          </div>
        </div>
      )}

      {/* Left Toolbar */}
      {!isPresentationMode && (
        <div className={`z-20 flex-shrink-0 ${isDarkMode ? 'bg-[#2b2d31] border-r border-[#1e1f22]' : 'bg-white border-r border-gray-200'}`}>
          <DrawingToolbar 
            tool={tool} setTool={setTool}
            brushSize={brushSize} setBrushSize={setBrushSize}
            brushColor={brushColor} setBrushColor={setBrushColor}
            backgroundColor={backgroundColor} setBackgroundColor={handleBackgroundColorChange}
            gridType={gridType} setGridType={setGridType}
            gridSize={gridSize} setGridSize={setGridSize}
            zoom={zoom} setZoom={setZoom}
            isPresentationMode={isPresentationMode} togglePresentationMode={() => setIsPresentationMode(!isPresentationMode)}
            onUndo={handleUndo} onRedo={handleRedo}
            onClear={() => {
              const canvas = canvasRefs.current.get(activeLayerId);
              const ctx = canvas?.getContext('2d');
              ctx?.clearRect(0, 0, project.width, project.height);
              stopDrawing(); 
            }}
            onSave={handleSave}
            onDownload={handleDownload}
            canUndo={historyIndex > 0}
            canRedo={historyIndex < history.length - 1}
            isDarkMode={isDarkMode}
            onClose={onClose}
          />
        </div>
      )}

      {/* Main Canvas Area */}
      <div 
        ref={wrapperRef}
        className="flex-1 relative overflow-hidden flex items-center justify-center touch-none"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onMouseEnter={handleMouseEnter}
        onContextMenu={(e) => e.preventDefault()}
      >
        
        {/* Background Pattern for transparency indication */}
        <div className={`absolute inset-0 opacity-10 pointer-events-none ${isDarkMode ? 'bg-[radial-gradient(#404249_1px,transparent_1px)] [background-size:16px_16px]' : 'bg-[radial-gradient(#d1d5db_1px,transparent_1px)] [background-size:16px_16px]'}`} />

        <div 
          ref={containerRef}
          className="relative shadow-2xl transition-transform duration-75 ease-out"
          style={{ 
            width: project.width, 
            height: project.height,
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            backgroundColor: backgroundColor,
            cursor: (tool === 'brush' || tool === 'eraser' || tool === 'fill') ? 'none' : (tool === 'eyedropper' ? 'crosshair' : 'default')
          }}
        >
          {/* Drawing Layers */}
          {layers.map((layer, index) => (
            <canvas
              key={layer.id}
              ref={el => {
                if (el) canvasRefs.current.set(layer.id, el);
                else canvasRefs.current.delete(layer.id);
              }}
              width={project.width}
              height={project.height}
              className={`absolute inset-0 transition-opacity duration-200 ${layer.id === activeLayerId ? 'cursor-none' : 'pointer-events-none'}`}
              style={{ 
                opacity: layer.visible ? layer.opacity : 0,
                zIndex: index + 10 
              }}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
            />
          ))}

          {/* Grid Layer (On Top) */}
          <canvas 
            ref={gridCanvasRef}
            width={project.width}
            height={project.height}
            className="absolute inset-0 pointer-events-none z-40"
          />

          {/* Brush Cursor Overlay */}
          {cursorPos && (tool === 'brush' || tool === 'eraser') && !isPanning.current && (
            <div 
              className="absolute pointer-events-none rounded-full border border-black/50 bg-white/20 z-50"
              style={{
                left: cursorPos.x,
                top: cursorPos.y,
                width: brushSize,
                height: brushSize,
                transform: 'translate(-50%, -50%)',
                borderColor: tool === 'brush' ? (isDarkMode ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)') : 'rgba(0,0,0,0.5)',
                backgroundColor: tool === 'brush' ? brushColor + '40' : 'rgba(255,255,255,0.3)'
              }}
            />
          )}

          {/* Eyedropper Cursor Overlay */}
          {cursorPos && tool === 'eyedropper' && !isPanning.current && (
            <div 
              className="absolute pointer-events-none z-50 rounded-full shadow-xl flex items-center justify-center"
              style={{
                left: cursorPos.x,
                top: cursorPos.y,
                width: 60,
                height: 60,
                transform: 'translate(-50%, -50%)',
                border: '4px solid white',
                outline: '1px solid rgba(0,0,0,0.2)',
                backgroundColor: eyedropperColor,
              }}
            >
              {/* Crosshair */}
              <div className="w-1 h-1 bg-black/50 outline outline-1 outline-white/50" />
            </div>
          )}
          {/* Fill Cursor Overlay */}
          {cursorPos && tool === 'fill' && !isPanning.current && (
            <>
              {/* Precision Dot */}
              <div 
                className="absolute pointer-events-none z-50 w-1 h-1 bg-black/50 outline outline-1 outline-white/50 rounded-full"
                style={{
                    left: cursorPos.x,
                    top: cursorPos.y,
                    transform: 'translate(-50%, -50%)'
                }}
              />
              {/* Bucket Icon */}
              <div 
                className="absolute pointer-events-none z-50"
                style={{
                    left: cursorPos.x,
                    top: cursorPos.y,
                    transform: 'translate(4px, -22px)'
                }}
              >
                 <svg 
                   width="32" 
                   height="32" 
                   viewBox="0 0 24 24" 
                   fill="none" 
                   xmlns="http://www.w3.org/2000/svg"
                   style={{ filter: 'drop-shadow(0px 2px 4px rgba(0,0,0,0.2))' }}
                 >
                   {/* Bucket Body - White with Dark Border */}
                   <path 
                     d="M19 11L11 19C10.4477 19.5523 9.55228 19.5523 9 19L5 15C4.44772 14.4477 4.44772 13.5523 5 13L13 5C13.5523 4.44772 14.4477 4.44772 15 5L19 9C19.5523 9.55228 19.5523 10.4477 19 11Z" 
                     fill="white" 
                     stroke="#1f2937" 
                     strokeWidth="1.5" 
                     strokeLinejoin="round"
                   />
                   
                   {/* Paint Color Inside */}
                   <path 
                     d="M16.5 8.5L10.5 14.5L7.5 11.5L13.5 5.5L16.5 8.5Z" 
                     fill={brushColor} 
                   />
                   
                   {/* Handle Line */}
                   <path d="M13 5L5 13" stroke="#1f2937" strokeWidth="1.5" strokeLinecap="round" />
                   
                   {/* Paint Drop */}
                   <path 
                     d="M4 16C4 16 2 17.5 2 19C2 20.1046 2.89543 21 4 21C5.10457 21 6 20.1046 6 19C6 17.5 4 16 4 16Z" 
                     fill={brushColor} 
                     stroke="#1f2937" 
                     strokeWidth="1"
                   />
                 </svg>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Right Sidebar: Layers */}
      {!isPresentationMode && (
        <>
          {/* Toggle Button */}
          <button
            onClick={() => setIsLayersVisible(!isLayersVisible)}
            className={`absolute top-4 right-4 z-30 p-2 rounded-xl shadow-lg transition-colors ${
              isDarkMode ? 'bg-[#2b2d31] hover:bg-[#35383c] text-white' : 'bg-white hover:bg-gray-100 text-gray-900'
            }`}
            title={isLayersVisible ? "Скрыть слои" : "Показать слои"}
          >
            <Layers size={20} />
          </button>

          {isLayersVisible && (
            <div 
              className={`flex-shrink-0 z-20 absolute right-0 top-0 bottom-0 md:relative flex ${isDarkMode ? 'bg-[#2b2d31] border-l border-[#1e1f22]' : 'bg-white border-l border-gray-200'}`}
              style={{ width: layersWidth }}
            >
              {/* Resize Handle */}
              <div
                className="absolute -left-2 top-0 bottom-0 w-4 cursor-col-resize hover:bg-[#5865f2]/50 transition-colors z-30 flex items-center justify-center"
                onMouseDown={handleResizeStart}
                onTouchStart={handleResizeStart}
              >
                <div className="w-1 h-12 bg-gray-400/50 rounded-full" />
              </div>
              <div className="flex-1 overflow-hidden pt-14">
                <LayerManager 
                  layers={layers}
                  activeLayerId={activeLayerId}
                  onSelectLayer={setActiveLayerId}
                  onToggleVisibility={toggleVisibility}
                  onToggleLock={toggleLock}
                  onAddLayer={addLayer}
                  onDeleteLayer={deleteLayer}
                  onReorderLayer={reorderLayer}
                  onRenameLayer={renameLayer}
                  onUpdateOpacity={updateLayerOpacity}
                  isDarkMode={isDarkMode}
                />
              </div>
            </div>
          )}
        </>
      )}

      {/* Export Modal */}
      {isExportModalOpen && (
        <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`w-full max-w-md rounded-2xl shadow-2xl p-6 animate-in zoom-in-95 duration-200 ${isDarkMode ? 'bg-[#2f3136] text-white' : 'bg-white text-gray-900'}`}>
            <h3 className="text-xl font-bold mb-4">Экспорт изображения</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase opacity-50 mb-1">Название файла</label>
                <input 
                  type="text" 
                  value={exportName}
                  onChange={(e) => setExportName(e.target.value)}
                  className={`w-full p-3 rounded-xl outline-none font-medium ${isDarkMode ? 'bg-black/20' : 'bg-gray-100'}`}
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase opacity-50 mb-1">Формат</label>
                <div className="grid grid-cols-2 gap-2">
                  <button 
                    onClick={() => setExportFormat('png')}
                    className={`p-3 rounded-xl font-bold transition-colors ${exportFormat === 'png' ? 'bg-[#5865f2] text-white' : (isDarkMode ? 'bg-black/20 hover:bg-black/30' : 'bg-gray-100 hover:bg-gray-200')}`}
                  >
                    PNG
                  </button>
                  <button 
                    onClick={() => setExportFormat('jpeg')}
                    className={`p-3 rounded-xl font-bold transition-colors ${exportFormat === 'jpeg' ? 'bg-[#5865f2] text-white' : (isDarkMode ? 'bg-black/20 hover:bg-black/30' : 'bg-gray-100 hover:bg-gray-200')}`}
                  >
                    JPEG
                  </button>
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button 
                  onClick={() => setIsExportModalOpen(false)}
                  className={`flex-1 p-3 rounded-xl font-bold transition-colors ${isDarkMode ? 'bg-white/5 hover:bg-white/10' : 'bg-gray-100 hover:bg-gray-200'}`}
                >
                  Отмена
                </button>
                <button 
                  onClick={performExport}
                  className="flex-1 p-3 rounded-xl font-bold bg-[#5865f2] text-white hover:brightness-110 transition-all"
                >
                  Сохранить
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DrawingEditor;
