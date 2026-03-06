import { GridType } from '../../types';

export const drawGrid = (
  ctx: CanvasRenderingContext2D, 
  width: number, 
  height: number, 
  type: GridType, 
  color: string = 'rgba(0,0,0,0.1)',
  size: number = 20
) => {
  ctx.clearRect(0, 0, width, height);
  if (type === 'none') return;

  ctx.strokeStyle = color;
  ctx.lineWidth = 1;

  if (type === 'math') {
    const cellSize = size;
    ctx.beginPath();
    for (let x = 0; x <= width; x += cellSize) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
    }
    for (let y = 0; y <= height; y += cellSize) {
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
    }
    ctx.stroke();
  } else if (type === 'line') {
    const lineHeight = size;
    ctx.beginPath();
    for (let y = lineHeight; y < height; y += lineHeight) {
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
    }
    ctx.stroke();
  } else if (type === 'music') {
    const lineSpacing = size / 2;
    const groupSpacing = size * 3;
    ctx.beginPath();
    for (let y = size; y < height; y += groupSpacing) {
      for (let i = 0; i < 5; i++) {
        const lineY = y + i * lineSpacing;
        if (lineY > height) break;
        ctx.moveTo(0, lineY);
        ctx.lineTo(width, lineY);
      }
    }
    ctx.stroke();
  }
};
