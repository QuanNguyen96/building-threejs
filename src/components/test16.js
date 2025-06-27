import React, { useEffect, useRef } from "react";
import * as THREE from "three";
import { CSG } from "three-csg-ts";

// Nếu bạn dùng bundler (Vite, CRA...), hãy chắc chắn OrbitControls đã được import đúng
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

const WallWithDoor = () => {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // === SETUP SCENE ===
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf0f0f0);

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(5, 5, 5);
    camera.lookAt(0, 1.4, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    containerRef.current.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;

    // === LIGHTS ===
    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    const directional = new THREE.DirectionalLight(0xffffff, 0.8);
    directional.position.set(5, 10, 5);
    scene.add(ambient, directional);

    // === CREATE WALL ===
    const wallGeometry = new THREE.BoxGeometry(4, 2.8, 0.2);
    const wallMaterial = new THREE.MeshStandardMaterial({ color: 0x888888 });
    const wallMesh = new THREE.Mesh(wallGeometry, wallMaterial);
    wallMesh.position.set(0, 1.4, 0);

    // === CREATE DOOR ===
    const doorGeometry = new THREE.BoxGeometry(1, 1, 0.25);
    const doorMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000 });
    const doorMesh = new THREE.Mesh(doorGeometry, doorMaterial);
    doorMesh.position.set(0, 1.8, 0); // giữa tường

    // === CSG SUBTRACT ===
    // const wallCSG = CSG.fromMesh(wallMesh);
    // const doorCSG = CSG.fromMesh(doorMesh);
    // const subtractedCSG = wallCSG.subtract(doorCSG);
    // const resultMesh = CSG.toMesh(subtractedCSG, wallMesh.matrix, wallMaterial);
    wallMesh.updateMatrix();
    doorMesh.updateMatrix();
    const resultMesh = CSG.subtract(wallMesh, doorMesh);
    scene.add(resultMesh);

    // === ANIMATION LOOP ===
    const animate = () => {
      requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // === CLEANUP ===
    return () => {
      renderer.dispose();
      if (containerRef.current && renderer.domElement) {
        containerRef.current.removeChild(renderer.domElement);
      }
    };
  }, []);

  return <div ref={containerRef} style={{ width: "100%", height: "100vh" }} />;
};

export default WallWithDoor;
