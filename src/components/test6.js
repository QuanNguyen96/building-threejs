// HouseScene.jsx
import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

const HouseScene = () => {
  const mountRef = useRef();

  useEffect(() => {
    const width = mountRef.current.clientWidth;
    const height = mountRef.current.clientHeight;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf0f0f0);
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(10, 10, 10);
    camera.lookAt(4.5, 1, 2);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    mountRef.current.appendChild(renderer.domElement);

    // OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 5);
    scene.add(ambientLight, directionalLight);

    // Materials
    const wallMaterial = new THREE.MeshStandardMaterial({ color: '#dbe5e6' });
    const floorMaterial = new THREE.MeshStandardMaterial({ color: '#f5f5dc' });

    // Floor
    const floor = new THREE.Mesh(
      new THREE.BoxGeometry(9, 0.2, 4),
      floorMaterial
    );
    floor.position.set(4.5, -0.1, 2);
    scene.add(floor);

    // Helper function to add wall
    const addWall = (x, y, z, sx, sy, sz) => {
      const geometry = new THREE.BoxGeometry(sx, sy, sz);
      const wall = new THREE.Mesh(geometry, wallMaterial);
      wall.position.set(x, y, z);
      scene.add(wall);
    };

    // Create a room with one front wall having a door
    const createRoom = (offsetX = 0) => {
      const h = 2; // tường cao 2
      const d = 0.2; // tường dày 0.2
      const roomWidth = 2;
      const roomDepth = 4;
      const doorWidth = 1;
      const zMid = 2;

      // Tường trước (có cửa)
      const side = (roomWidth - doorWidth) / 2;
      addWall(offsetX + side / 2, 1, 0, side, h, d); // trái cửa
      addWall(offsetX + roomWidth - side / 2, 1, 0, side, h, d); // phải cửa

      // Tường sau
      addWall(offsetX + roomWidth / 2, 1, 4, roomWidth, h, d);

      // Tường trái
      addWall(offsetX, 1, zMid, d, h, roomDepth);

      // Tường phải
      addWall(offsetX + roomWidth, 1, zMid, d, h, roomDepth);
    };

    // Tạo 4 phòng liền nhau (cách nhau đúng 2.2 đơn vị để không khít)
    createRoom(0);
    createRoom(2.2);
    createRoom(4.4);
    createRoom(6.6);

    // Render loop
    const animate = () => {
      requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // Cleanup
    return () => {
      mountRef.current.removeChild(renderer.domElement);
      renderer.dispose();
    };
  }, []);

  return <div ref={mountRef} style={{ width: '100vw', height: '100vh' }} />;
};

export default HouseScene;




// import React, { useEffect, useRef } from 'react';
// import * as THREE from 'three';
// import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

// const walls = [
//   { start: [0, 0], end: [0, 400] },
//   { start: [0, 400], end: [400, 400] },
//   { start: [400, 400], end: [400, 0] },
//   { start: [400, 0], end: [0, 0] }
// ];

// const WallScene = () => {
//   const mountRef = useRef();

//   useEffect(() => {
//     const width = mountRef.current.clientWidth;
//     const height = mountRef.current.clientHeight;

//     const scene = new THREE.Scene();
//     const camera = new THREE.PerspectiveCamera(45, width / height, 1, 1000);
//     camera.position.set(300, 300, 500);
//     camera.lookAt(200, 0, 200);

//     const renderer = new THREE.WebGLRenderer({ antialias: true });
//     renderer.setSize(width, height);
//     mountRef.current.appendChild(renderer.domElement);

//     const controls = new OrbitControls(camera, renderer.domElement);
//     controls.enableDamping = true;
//     controls.dampingFactor = 0.1;

//     // Light
//     const ambient = new THREE.AmbientLight(0xffffff, 0.6);
//     const dirLight = new THREE.DirectionalLight(0xffffff, 0.6);
//     dirLight.position.set(100, 200, 100);
//     scene.add(ambient, dirLight);

//     // Wall material
//     const wallMaterial = new THREE.MeshStandardMaterial({ color: 'red' });
//     const wallHeight = 200;
//     const wallThickness = 20;

//     walls.forEach(({ start, end }) => {
//       const [x1, z1] = start;
//       const [x2, z2] = end;

//       const dx = x2 - x1;
//       const dz = z2 - z1;
//       const length = Math.sqrt(dx * dx + dz * dz);

//       const midX = (x1 + x2) / 2;
//       const midZ = (z1 + z2) / 2;

//       const angle = Math.atan2(dz, dx);

//       const geometry = new THREE.BoxGeometry(length, wallHeight, wallThickness);
//       const wall = new THREE.Mesh(geometry, wallMaterial);

//       wall.position.set(midX, wallHeight / 2, midZ);
//       wall.rotation.y = -angle;

//       scene.add(wall);
//     });

//     // Floor
//     const floorGeometry = new THREE.BoxGeometry(400, 0.2, 400);
//     const floorMaterial = new THREE.MeshStandardMaterial({ color: '#ccc' });
//     const floor = new THREE.Mesh(floorGeometry, floorMaterial);
//     floor.position.set(200, -0.1, 200);
//     scene.add(floor);

//     // Render loop
//     const animate = () => {
//       requestAnimationFrame(animate);
//       controls.update();
//       renderer.render(scene, camera);
//     };
//     animate();

//     // Cleanup
//     return () => {
//       mountRef.current.removeChild(renderer.domElement);
//       renderer.dispose();
//     };
//   }, []);

//   return <div ref={mountRef} style={{ width: '100vw', height: '100vh' }} />;
// };

// export default WallScene;

