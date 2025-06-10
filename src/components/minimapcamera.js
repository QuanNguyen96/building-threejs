// import { useEffect, useRef } from "react";
// import * as THREE from "three";
// import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

// export default function App() {
//   const mainRef = useRef();
//   const minimapRef = useRef();
//   const cameraMainRef = useRef();
//   const cameraMiniRef = useRef();
//   const rendererRef = useRef();
//   const miniRendererRef = useRef();

//   useEffect(() => {
//     const width = window.innerWidth;
//     const height = window.innerHeight;

//     // Scene
//     const scene = new THREE.Scene();
//     scene.background = new THREE.Color("#cccccc");

//     // Main Camera
//     const cameraMain = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
//     cameraMain.position.set(30, 30, 30);
//     cameraMain.lookAt(0, 0, 0);
//     cameraMainRef.current = cameraMain;

//     // Minimap Camera (orthographic)
//     const miniCamSize = 50;
//     const cameraMini = new THREE.OrthographicCamera(
//       -miniCamSize, miniCamSize,
//       miniCamSize, -miniCamSize,
//       0.1, 1000
//     );
//     cameraMini.position.set(100, 100, 100);
//     cameraMini.lookAt(0, 0, 0);
//     cameraMiniRef.current = cameraMini;

//     // Renderer chính
//     const renderer = new THREE.WebGLRenderer({ antialias: true });
//     renderer.setSize(width, height);
//     mainRef.current.appendChild(renderer.domElement);
//     rendererRef.current = renderer;
//     // Trong useEffect, sau khi tạo renderer:
//     const controls = new OrbitControls(cameraMain, renderer.domElement);
//     controls.enableDamping = true;
//     controls.dampingFactor = 0.1;
//     controls.target.set(0, 0, 0);
//     controls.update();

//     // Renderer minimap
//     const miniRenderer = new THREE.WebGLRenderer({ antialias: true });
//     miniRenderer.setSize(200, 200);
//     miniRenderer.setClearColor(0x222222);
//     miniRenderer.domElement.style.position = 'absolute';
//     miniRenderer.domElement.style.bottom = '10px';
//     miniRenderer.domElement.style.right = '10px';
//     miniRenderer.domElement.style.border = '2px solid white';
//     minimapRef.current.appendChild(miniRenderer.domElement);
//     miniRendererRef.current = miniRenderer;

//     // Lights
//     const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
//     scene.add(ambientLight);

//     // Grid & box
//     const grid = new THREE.GridHelper(100, 10);
//     scene.add(grid);

//     const box1 = new THREE.Mesh(
//       new THREE.BoxGeometry(10, 10, 10),
//       new THREE.MeshStandardMaterial({ color: "red" })
//     );
//     box1.position.set(0, 5, 0);
//     scene.add(box1);

//     const box2 = new THREE.Mesh(
//       new THREE.BoxGeometry(5, 5, 5),
//       new THREE.MeshStandardMaterial({ color: "green" })
//     );
//     box2.position.set(20, 2.5, -10);
//     scene.add(box2);

//     // Camera helper (hiển thị camera chính trong minimap)
//     cameraMain.updateMatrixWorld(); // Quan trọng!
//     const cameraHelper = new THREE.CameraHelper(cameraMain);
//     scene.add(cameraHelper);

//     // Animation loop
//     function animate() {
//       requestAnimationFrame(animate);

//       // Quay box nhẹ cho vui
//       box1.rotation.y += 0.01;
//       box2.rotation.x += 0.01;

//       cameraMain.updateMatrixWorld();
//       cameraHelper.update();

//       // Render chính
//       renderer.render(scene, cameraMain);

//       // Render minimap
//       miniRenderer.clear();
//       miniRenderer.render(scene, cameraMini);
//     }

//     animate();

//     // Cleanup
//     return () => {
//       renderer.dispose();
//       miniRenderer.dispose();
//       while (mainRef.current.firstChild) {
//         mainRef.current.removeChild(mainRef.current.firstChild);
//       }
//       while (minimapRef.current.firstChild) {
//         minimapRef.current.removeChild(minimapRef.current.firstChild);
//       }
//     };
//   }, []);

//   return (
//     <>
//       <div ref={mainRef} style={{ width: "100vw", height: "100vh", position: "relative" }} />
//       <div ref={minimapRef} style={{ position: "absolute", bottom: "30px", right: "50px", pointerEvents: "none" }} />
//     </>
//   );
// }


// import React, { useEffect, useRef } from 'react';
// import * as THREE from 'three';

// const MiniMapScene = () => {
//   const mainContainerRef = useRef();
//   const miniContainerRef = useRef();

//   useEffect(() => {
//     const mainContainer = mainContainerRef.current;
//     const miniContainer = miniContainerRef.current;

//     // === SCENE ===
//     const scene = new THREE.Scene();
//     scene.background = new THREE.Color(0x222222);

//     // === CAMERAS ===
//     const mainCamera = new THREE.PerspectiveCamera(75, mainContainer.clientWidth / mainContainer.clientHeight, 0.1, 1000);
//     mainCamera.position.set(0, 5, 10);

//     const miniCamera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);

//     // === RENDERERS ===
//     const mainRenderer = new THREE.WebGLRenderer({ antialias: true });
//     mainRenderer.setSize(mainContainer.clientWidth, mainContainer.clientHeight);
//     mainContainer.appendChild(mainRenderer.domElement);

//     const miniRenderer = new THREE.WebGLRenderer({ antialias: true });
//     miniRenderer.setSize(miniContainer.clientWidth, miniContainer.clientHeight);
//     miniContainer.appendChild(miniRenderer.domElement);

//     // === LIGHT ===
//     const light = new THREE.DirectionalLight(0xffffff, 1);
//     light.position.set(10, 10, 10);
//     scene.add(light);

//     // === FLOOR + PLAYER ===
//     const floor = new THREE.Mesh(
//       new THREE.PlaneGeometry(50, 50),
//       new THREE.MeshStandardMaterial({ color: 0x444444 })
//     );
//     floor.rotation.x = -Math.PI / 2;
//     scene.add(floor);

//     const player = new THREE.Mesh(
//       new THREE.BoxGeometry(1, 1, 1),
//       new THREE.MeshStandardMaterial({ color: 0x00ff00 })
//     );
//     player.position.set(0, 0.5, 0);
//     scene.add(player);

//     // === OBJECTS ===
//     for (let i = 0; i < 6; i++) {
//       const box = new THREE.Mesh(
//         new THREE.BoxGeometry(1, 1, 1),
//         new THREE.MeshStandardMaterial({ color: Math.random() * 0xffffff })
//       );
//       box.position.set((Math.random() - 0.5) * 30, 0.5, (Math.random() - 0.5) * 30);
//       scene.add(box);
//     }

//     // === ANIMATE ===
//     let angle = 0;

//     const animate = () => {
//       requestAnimationFrame(animate);

//       angle += 0.01;
//       player.position.x = Math.cos(angle) * 5;
//       player.position.z = Math.sin(angle) * 5;

//       mainCamera.lookAt(player.position);

//       mainRenderer.render(scene, mainCamera);

//       miniCamera.position.set(player.position.x, 20, player.position.z);
//       miniCamera.lookAt(player.position);

//       miniRenderer.render(scene, miniCamera);
//     };

//     animate();

//     return () => {
//       mainRenderer.dispose();
//       miniRenderer.dispose();
//       mainContainer.innerHTML = '';
//       miniContainer.innerHTML = '';
//     };
//   }, []);

//   return (
//     <div style={{ position: 'relative', width: '100%', height: '100vh' }}>
//       {/* Main canvas */}
//       <div
//         ref={mainContainerRef}
//         style={{
//           width: '100%',
//           height: '100%',
//           overflow: 'hidden',
//         }}
//       />

//       {/* Minimap canvas */}
//       <div
//         ref={miniContainerRef}
//         style={{
//           width: '200px',
//           height: '200px',
//           position: 'absolute',
//           bottom: '10px',
//           right: '10px',
//           border: '2px solid white',
//           zIndex: 10,
//         }}
//       />
//     </div>
//   );
// };

// export default MiniMapScene;
import React, { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

export default function FirstPersonCameraView() {
  const mainRef = useRef();
  const fpvRef = useRef();

  useEffect(() => {
    // === Scene Setup ===
    const scene = new THREE.Scene();

    // === Main Camera ===
    const mainCamera = new THREE.PerspectiveCamera(
      60,
      mainRef.current.clientWidth / mainRef.current.clientHeight,
      0.1,
      1000
    );
    mainCamera.position.set(5, 3, 5);
    mainCamera.lookAt(0, 0, 0);

    // === Renderer for main view ===
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(mainRef.current.clientWidth, mainRef.current.clientHeight);
    mainRef.current.appendChild(renderer.domElement);

    // === Controls for orbiting main camera ===
    const controls = new OrbitControls(mainCamera, renderer.domElement);
    controls.enableDamping = true;

    // === Objects ===
    const geometry = new THREE.BoxGeometry();
    const boxes = [];

    const colors = [0xff0000, 0x00ff00, 0x0000ff];
    const positions = [
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(2, 0, 1),
      new THREE.Vector3(-1, 0, 2),
    ];

    for (let i = 0; i < 3; i++) {
      const material = new THREE.MeshBasicMaterial({ color: colors[i] });
      const box = new THREE.Mesh(geometry, material);
      box.position.copy(positions[i]);
      scene.add(box);
      boxes.push(box);
    }

    scene.add(new THREE.AxesHelper(5));

    // === FPV Camera === (first-person camera — same as mainCamera)
    const fpvCamera = new THREE.PerspectiveCamera(60, 1, 0.1, 1000);

    // === Renderer for FPV ===
    const fpvCanvas = fpvRef.current;
    const fpvRenderer = new THREE.WebGLRenderer({
      canvas: fpvCanvas,
      antialias: true,
    });
    fpvRenderer.setSize(200, 200);

    // === Render loop ===
    const animate = () => {
      requestAnimationFrame(animate);

      controls.update();

      // Update FPV camera to follow main camera's position + rotation
      fpvCamera.position.copy(mainCamera.position);
      fpvCamera.rotation.copy(mainCamera.rotation);
      fpvCamera.quaternion.copy(mainCamera.quaternion); // rotation safest via quaternion
      fpvCamera.updateProjectionMatrix();

      // Render both views
      renderer.render(scene, mainCamera);
      fpvRenderer.render(scene, fpvCamera);
    };

    animate();

    const handleResize = () => {
      const width = mainRef.current.clientWidth;
      const height = mainRef.current.clientHeight;

      renderer.setSize(width, height);
      mainCamera.aspect = width / height;
      mainCamera.updateProjectionMatrix();
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      mainRef.current.removeChild(renderer.domElement);
      controls.dispose();
    };
  }, []);

  return (
    <div style={{ display: "flex", gap: 20 }}>
      <div
        ref={mainRef}
        style={{ width: "600px", height: "400px", border: "1px solid black" }}
      />
      <div>
        <h4>Camera góc nhìn thứ nhất</h4>
        <canvas
          ref={fpvRef}
          width={200}
          height={200}
          style={{ border: "1px solid black", background: "#ccc" }}
        />
      </div>
    </div>
  );
}
