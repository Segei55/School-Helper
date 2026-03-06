export const floodFill = (
  ctx: CanvasRenderingContext2D,
  startX: number,
  startY: number,
  fillColorHex: string,
  tolerance: number = 10
) => {
  const canvas = ctx.canvas;
  const width = canvas.width;
  const height = canvas.height;
  
  // Get image data
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  
  // Parse fill color
  const rFill = parseInt(fillColorHex.slice(1, 3), 16);
  const gFill = parseInt(fillColorHex.slice(3, 5), 16);
  const bFill = parseInt(fillColorHex.slice(5, 7), 16);
  const aFill = 255; // Assuming full opacity for fill

  // Get start color
  const startPos = (Math.floor(startY) * width + Math.floor(startX)) * 4;
  const rStart = data[startPos];
  const gStart = data[startPos + 1];
  const bStart = data[startPos + 2];
  const aStart = data[startPos + 3];

  // If fill color is same as start color, return
  if (
    Math.abs(rStart - rFill) < tolerance &&
    Math.abs(gStart - gFill) < tolerance &&
    Math.abs(bStart - bFill) < tolerance &&
    Math.abs(aStart - aFill) < tolerance
  ) {
    return;
  }

  const matchStartColor = (pos: number) => {
    const r = data[pos];
    const g = data[pos + 1];
    const b = data[pos + 2];
    const a = data[pos + 3];

    // Simple Euclidean distance for better color matching
    const dist = Math.sqrt(
      Math.pow(r - rStart, 2) +
      Math.pow(g - gStart, 2) +
      Math.pow(b - bStart, 2) +
      Math.pow(a - aStart, 2)
    );

    return dist <= tolerance * 3; // Adjusted tolerance scaling
  };

  const colorPixel = (pos: number) => {
    data[pos] = rFill;
    data[pos + 1] = gFill;
    data[pos + 2] = bFill;
    data[pos + 3] = aFill;
  };

  // Stack-based recursive implementation (Scanline is better but this is simpler for now)
  // To avoid stack overflow, we use an explicit stack array
  const stack = [[Math.floor(startX), Math.floor(startY)]];

  while (stack.length) {
    const [x, y] = stack.pop()!;
    let pixelPos = (y * width + x) * 4;

    // Move up as long as we match start color
    let y1 = y;
    while (y1 >= 0 && matchStartColor(pixelPos)) {
      y1--;
      pixelPos -= width * 4;
    }
    y1++;
    pixelPos += width * 4;

    let spanLeft = false;
    let spanRight = false;

    // Move down, coloring pixels
    while (y1 < height && matchStartColor(pixelPos)) {
      colorPixel(pixelPos);

      if (x > 0) {
        if (matchStartColor(pixelPos - 4)) {
          if (!spanLeft) {
            stack.push([x - 1, y1]);
            spanLeft = true;
          }
        } else if (spanLeft) {
          spanLeft = false;
        }
      }

      if (x < width - 1) {
        if (matchStartColor(pixelPos + 4)) {
          if (!spanRight) {
            stack.push([x + 1, y1]);
            spanRight = true;
          }
        } else if (spanRight) {
          spanRight = false;
        }
      }

      y1++;
      pixelPos += width * 4;
    }
  }

  ctx.putImageData(imageData, 0, 0);
};
