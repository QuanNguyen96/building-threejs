// components/WallViewer.js
import React, { useEffect, useRef } from 'react';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import * as THREE from 'three';

const wallSegments = [
  [[2.034, 0.799], [10.266, 0.799]],
  [[10.291, 1.041], [12.591, 1.041]],
  [[10.291, 3.753], [12.591, 3.753]],
  [[3.196, 4.237], [6.126, 4.237]],
  [[3.148, 5.811], [4.697, 5.811]],
  [[3.172, 10.242], [4.600, 10.242]],
  [[4.649, 9.806], [5.956, 9.806]],
  [[4.455, 6.513], [6.102, 6.513]],
  [[4.528, 10.944], [6.271, 10.944]],
  [[7.240, 7.748], [10.291, 7.748]],
  [[7.240, 9.564], [10.266, 9.564]],
  [[3.172, 13.777], [10.266, 13.777]],
  [[7.240, 0.799], [7.240, 6.780]],
  [[7.240, 10.654], [7.240, 12.082]],
  [[7.240, 12.106], [7.240, 13.269]],
  [[3.148, 9.152], [3.148, 11.646]],
  [[3.148, 5.956], [3.148, 7.312]],
  [[4.625, 5.254], [4.625, 6.465]],
  [[4.625, 9.830], [4.625, 10.920]],
  [[6.102, 7.458], [6.102, 9.976]]
];

const WallViewer = () => {
  const mountRef = useRef(null);

  useEffect(() => {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf0f0f0);

    const camera = new THREE.PerspectiveCamera(
      75,
      mountRef.current.clientWidth / mountRef.current.clientHeight,
      0.1,
      1000
    );
    camera.position.set(0, -20, 20);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    mountRef.current.appendChild(renderer.domElement);

    // Light
    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(10, 10, 20);
    scene.add(light);

    // Floor Grid
    const gridHelper = new THREE.GridHelper(28, 28);
    scene.add(gridHelper);
    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true; // mượt hơn khi xoay
    controls.dampingFactor = 0.05;
    controls.enableZoom = true;
    controls.zoomSpeed = 1;
    controls.target.set(6, 0, 6); // điểm camera nhìn vào — tùy chỉnh theo center mô hình
    controls.update();

    // Draw walls
    const material = new THREE.MeshLambertMaterial({ color: 0x888888 });

    wallSegments.forEach(([start, end]) => {
      const [x1, z1] = start;
      const [x2, z2] = end;

      const dx = x2 - x1;
      const dz = z2 - z1;
      const length = Math.sqrt(dx * dx + dz * dz);
      const angle = Math.atan2(dz, dx);

      const wallHeight = 2.5; // chiều cao
      const wallThickness = 0.1; // độ dày tường

      // Dài theo X, cao theo Y, dày theo Z
      const geometry = new THREE.BoxGeometry(length, wallHeight, wallThickness);
      const wall = new THREE.Mesh(geometry, material);

      // Đặt vị trí giữa đoạn tường
      wall.position.x = (x1 + x2) / 2;
      wall.position.z = (z1 + z2) / 2;
      wall.position.y = wallHeight / 2;

      // Xoay tường theo trục Y để khớp hướng
      wall.rotation.y = -angle;

      scene.add(wall);
    });


    // Orbit Controls (manual)
    let isDragging = false;
    let previousMousePosition = { x: 0, y: 0 };

    const onMouseDown = (e) => {
      isDragging = true;
      previousMousePosition = { x: e.clientX, y: e.clientY };
    };

    const onMouseUp = () => {
      isDragging = false;
    };

    const onMouseMove = (e) => {
      if (!isDragging) return;

      const deltaX = e.clientX - previousMousePosition.x;
      const deltaY = e.clientY - previousMousePosition.y;

      const rotationSpeed = 0.005;
      scene.rotation.y += deltaX * rotationSpeed;
      scene.rotation.x += deltaY * rotationSpeed;

      previousMousePosition = { x: e.clientX, y: e.clientY };
    };

    renderer.domElement.addEventListener('mousedown', onMouseDown);
    renderer.domElement.addEventListener('mouseup', onMouseUp);
    renderer.domElement.addEventListener('mousemove', onMouseMove);

    const animate = () => {
      requestAnimationFrame(animate);
      controls.update(); // bắt buộc
      renderer.render(scene, camera);
    };

    animate();

    return () => {
      mountRef.current.removeChild(renderer.domElement);
    };
  }, []);

  return <div ref={mountRef} style={{ width: '100%', height: '600px' }} />;
};

export default WallViewer;
