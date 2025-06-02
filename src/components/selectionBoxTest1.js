import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { SelectionBox } from 'three/examples/jsm/interactive/SelectionBox';
import { SelectionHelper } from 'three/examples/jsm/interactive/SelectionHelper';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';


// https://stackblitz.com/edit/three-js-start-yhxnqirm?file=index.ts,SelectionBox.ts
export default function SelectionBoxScene() {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x202020); // ✅ background

    const camera = new THREE.PerspectiveCamera(
      70,
      window.innerWidth / window.innerHeight,
      1,
      1000
    );
    camera.position.set(0, 200, 500);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    containerRef.current.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);

    // ✅ ÁNH SÁNG
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(1, 2, 3);
    scene.add(directionalLight);

    // ✅ OBJECTS
    const objects: THREE.Mesh[] = [];
    const geometry = new THREE.BoxGeometry(20, 20, 20);

    for (let i = 0; i < 100; i++) {
      const material = new THREE.MeshLambertMaterial({
        color: Math.random() * 0xffffff,
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.x = Math.random() * 800 - 400;
      mesh.position.y = Math.random() * 800 - 400;
      mesh.position.z = Math.random() * 800 - 400;
      scene.add(mesh);
      objects.push(mesh);
    }

    const selectionBox = new SelectionBox(camera, scene);
    const selectionHelper = new SelectionHelper(renderer, 'selectBox');

    let isSelecting = false;

    const onPointerDown = (event: PointerEvent) => {
      if (!event.shiftKey) return;

      isSelecting = true;
      controls.enabled = false;

      selectionBox.startPoint.set(event.clientX, event.clientY);
    };

    const onPointerMove = (event: PointerEvent) => {
      if (!isSelecting) return;

      selectionBox.endPoint.set(event.clientX, event.clientY);
      // selectionHelper.onPointerMove(event);
    };


    const onPointerUp = (event: PointerEvent) => {
      if (!isSelecting) return;

      selectionBox.endPoint.set(event.clientX, event.clientY);

      const selected = selectionBox.select();
      console.log('✅ Selected:', selected);

      selectionHelper.enabled = false;
      controls.enabled = true;
      isSelecting = false;
    };

    window.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);

    const animate = () => {
      requestAnimationFrame(animate);
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      renderer.dispose();
    };
  }, []);

  return <div ref={containerRef} style={{ width: '100vw', height: '100vh' }} />;
}
