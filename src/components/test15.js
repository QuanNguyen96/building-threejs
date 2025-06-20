import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { CSG } from 'three-csg-ts';

export default function CSGExample() {
  const mountRef = useRef();

  useEffect(() => {
    // --- Setup scene, camera, renderer ---
    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(
      45,
      mountRef.current.clientWidth / mountRef.current.clientHeight,
      1,
      10000
    );
    camera.position.set(0, 20, 10);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    mountRef.current.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.update();

    // --- Create base meshes ---
    const box = new THREE.Mesh(
      new THREE.BoxGeometry(2, 2, 2),
      new THREE.MeshNormalMaterial()
    );

    const sphere = new THREE.Mesh(
      new THREE.SphereGeometry(1.2, 30, 30),
      new THREE.MeshNormalMaterial()
    );

    // Update matrix (CSG cần)
    box.updateMatrix();
    sphere.updateMatrix();

    // --- CSG operations ---
    const subRes = CSG.subtract(box, sphere);
    const unionRes = CSG.union(box, sphere);
    const interRes = CSG.intersect(box, sphere);

    // Position results
    unionRes.position.set(0, 0, 5);
    interRes.position.set(0, 0, -5);

    scene.add(box);
    // scene.add(unionRes);
    // scene.add(interRes);

    // --- Animation loop ---
    const animate = () => {
      requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // Cleanup on unmount
    return () => {
      renderer.dispose();
      mountRef.current.removeChild(renderer.domElement);
    };
  }, []);

  return <div ref={mountRef} style={{ width: '100vw', height: '100vh' }} />;
}
