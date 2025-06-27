import React, { useEffect, useRef, useState } from "react";
import { fabric } from "fabric";

export default function WallDrawingEditor() {
  const canvasRef = useRef(null);
  const [canvas, setCanvas] = useState(null);
  const [points, setPoints] = useState([]);
  const gridSize = 50;
  const wallThickness = 10;
  const snapDistance = 10;

  useEffect(() => {
    const c = new fabric.Canvas(canvasRef.current, {
      selection: false,
      preserveObjectStacking: true,
    });
    setCanvas(c);

    // Draw grid
    for (let i = 0; i <= c.width; i += gridSize) {
      c.add(new fabric.Rect({
        left: i,
        top: 0,
        width: 1,
        height: c.height,
        fill: "#eee",
        selectable: false,
        evented: false,
      }));
    }
    for (let j = 0; j <= c.height; j += gridSize) {
      c.add(new fabric.Rect({
        left: 0,
        top: j,
        width: c.width,
        height: 1,
        fill: "#eee",
        selectable: false,
        evented: false,
      }));
    }

    c.on("mouse:down", (opt) => {
      const pointer = c.getPointer(opt.e);
      const snapped = snapToGrid(pointer);

      // Snap to nearby point if within threshold
      const nearby = points.find(
        (p) => Math.hypot(p.x - snapped.x, p.y - snapped.y) < snapDistance
      );
      const current = nearby || snapped;

      const circle = new fabric.Circle({
        left: current.x - 3,
        top: current.y - 3,
        radius: 3,
        fill: "red",
        selectable: false,
        evented: false,
      });
      c.add(circle);

      if (points.length % 2 === 1) {
        const prev = points[points.length - 1];
        const dx = current.x - prev.x;
        const dy = current.y - prev.y;
        const length = Math.hypot(dx, dy);
        const angle = (Math.atan2(dy, dx) * 180) / Math.PI;

        const wall = new fabric.Rect({
          left: prev.x,
          top: prev.y - wallThickness / 2,
          width: length,
          height: wallThickness,
          fill: "#444",
          originX: "left",
          originY: "top",
          angle: angle,
          hasControls: true,
          hasBorders: true,
        });
        c.add(wall);

        const lengthText = new fabric.Text((length / 100).toFixed(2) + " m", {
          left: (prev.x + current.x) / 2,
          top: (prev.y + current.y) / 2 - 20,
          fontSize: 14,
          fill: "blue",
          selectable: false,
          evented: false,
        });
        c.add(lengthText);
      }

      setPoints([...points, current]);
    });

    return () => {
      c.dispose();
    };
  }, [points]);

  const snapToGrid = (point) => {
    return {
      x: Math.round(point.x / gridSize) * gridSize,
      y: Math.round(point.y / gridSize) * gridSize,
    };
  };

  return (
    <div>
      <p>🧱 Click 2 điểm để tạo một tường. Snap vào lưới và điểm gần.</p>
      <canvas
        ref={canvasRef}
        width={800}
        height={500}
        style={{ border: "1px solid #ccc" }}
      />
    </div>
  );
}
