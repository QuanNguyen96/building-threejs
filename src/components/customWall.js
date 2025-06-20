import React, { useRef, useState, useEffect } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

function WallDrawer() {
  const mountRef = useRef();
  const [mode, setMode] = useState('none');
  const [points, setPoints] = useState([]);
  const pointsRef = useRef([])
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const controlsRef = useRef(null);
  const raycaster = useRef(new THREE.Raycaster());
  const mouse = useRef(new THREE.Vector2());

  useEffect(() => {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xffffff);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(10, 10, 10);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    rendererRef.current = renderer;
    mountRef.current.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controlsRef.current = controls;

    scene.add(new THREE.GridHelper(20, 20));
    const dirLight = new THREE.DirectionalLight(0xffffff, 1);
    dirLight.position.set(10, 10, 10);
    scene.add(dirLight);
    scene.add(new THREE.AmbientLight(0x404040));

    function onClick(event) {
      console.log("onClick", modeRef.current)
      if (modeRef.current !== 'draw') return;

      const rect = renderer.domElement.getBoundingClientRect();
      mouse.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.current.setFromCamera(mouse.current, camera);
      const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
      const intersectPoint = new THREE.Vector3();
      raycaster.current.ray.intersectPlane(plane, intersectPoint);

      intersectPoint.x = Math.round(intersectPoint.x);
      intersectPoint.z = Math.round(intersectPoint.z);

      const last = pointsRef.current[pointsRef.current.length - 1];
      console.log("last", last)
      if (last) {
        const wall = createWall(last, intersectPoint);

        console.log("wall=", wall)
        scene.add(wall);
        console.log("scene=", scene)
      }
      pointsRef.current.push(intersectPoint)
      setPoints([intersectPoint]);
    }

    renderer.domElement.addEventListener('click', onClick);

    function animate() {
      requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    }
    animate();

    return () => {
      renderer.domElement.removeEventListener('click', onClick);
      mountRef.current.removeChild(renderer.domElement);
    };
  }, []); // Only run once on mount
  const modeRef = useRef()
  useEffect(() => {
    modeRef.current = mode
    if (mode !== 'draw') {
      pointsRef.current = []
      setPoints([]);

    }
  }, [mode]);

  function createWall(start, end) {
    const direction = new THREE.Vector3().subVectors(end, start);
    const length = direction.length();
    const center = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
    const angle = Math.atan2(direction.z, direction.x);

    const height = 3;
    const geometry = new THREE.BoxGeometry(length, height, 0.2);
    const material = new THREE.MeshStandardMaterial({ color: 0x8b4513 });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(center.x, height / 2, center.z);
    mesh.rotation.y = -angle;
    return mesh;
  }

  return (
    <>
      <div id="toolbar" style={{ position: 'absolute', top: 10, left: 10, zIndex: 1, background: 'white', padding: 8 }}>
        <button onClick={() => setMode('draw')}>🧱 Vẽ tường</button>
        <button onClick={() => setMode('none')}>❌ Tắt</button>
      </div>
      <div ref={mountRef} />
    </>
  );
}

export default WallDrawer;