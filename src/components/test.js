// import React, { useRef, useEffect } from "react";
// import * as THREE from "three";
// import { OrbitControls } from "three-stdlib";
// import { DragControls } from "three/examples/jsm/controls/DragControls";

// function Test() {
//   const mountRef = useRef(null);

//   useEffect(() => {
//     const scene = new THREE.Scene();

//     // Camera setup
//     const camera = new THREE.PerspectiveCamera(
//       75,
//       window.innerWidth / window.innerHeight,
//       0.1,
//       1000
//     );
//     camera.position.set(50, 100, 150);
//     camera.lookAt(0, 40, 0);

//     // Renderer
//     const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
//     renderer.setClearColor(0x000000, 0); // nền trong suốt
//     renderer.setSize(window.innerWidth, window.innerHeight);
//     renderer.shadowMap.enabled = true;
//     renderer.shadowMap.type = THREE.PCFSoftShadowMap;
//     mountRef.current.appendChild(renderer.domElement);

//     // Controls
//     const orbitControls = new OrbitControls(camera, renderer.domElement);
//     orbitControls.enableDamping = true;

//     // Mặt phẳng nền trắng
//     const planeGeometry = new THREE.PlaneGeometry(500, 500);

//     // Mặt phẳng trắng
//     const planeMaterial = new THREE.MeshPhongMaterial({
//       color: 0xffffff,
//       side: THREE.DoubleSide,
//     });
//     const plane = new THREE.Mesh(planeGeometry, planeMaterial);
//     plane.rotation.x = -Math.PI / 2;
//     plane.position.y = -0.1;
//     plane.receiveShadow = false; // nền trắng không nhận bóng
//     scene.add(plane);

//     // Mặt phẳng bóng
//     const shadowPlaneMaterial = new THREE.ShadowMaterial({ opacity: 0.7 });
//     const shadowPlane = new THREE.Mesh(planeGeometry, shadowPlaneMaterial);
//     shadowPlane.rotation.x = -Math.PI / 2;
//     shadowPlane.position.y = -0.09;
//     shadowPlane.receiveShadow = true; // nhận bóng đổ
//     scene.add(shadowPlane);

//     // GridHelper rõ nét trên nền
//     const gridHelper = new THREE.GridHelper(500, 50, 0x444444, 0xaaaaaa);
//     scene.add(gridHelper);

//     // Trục XYZ
//     const axisLength = 50;
//     const origin = new THREE.Vector3(0, 0, 0);
//     const arrowX = new THREE.ArrowHelper(
//       new THREE.Vector3(1, 0, 0),
//       origin,
//       axisLength,
//       0xff0000,
//       5,
//       3
//     );
//     const arrowY = new THREE.ArrowHelper(
//       new THREE.Vector3(0, 1, 0),
//       origin,
//       axisLength,
//       0x00ff00,
//       5,
//       3
//     );
//     const arrowZ = new THREE.ArrowHelper(
//       new THREE.Vector3(0, 0, 1),
//       origin,
//       axisLength,
//       0x0000ff,
//       5,
//       3
//     );
//     scene.add(arrowX, arrowY, arrowZ);

//     // Ánh sáng ambient để đủ sáng chung
//     const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
//     scene.add(ambientLight);

//     // SpotLight có bóng đổ rộng hơn
//     const spotLight = new THREE.SpotLight(0x0000ff, 2);
//     spotLight.position.set(0, 100, 0);
//     spotLight.angle = Math.PI / 3; // mở rộng góc chiếu (60 độ)
//     spotLight.penumbra = 0.4;
//     spotLight.decay = 2;
//     spotLight.distance = 300;
//     spotLight.castShadow = true;

//     // Tăng kích thước shadow map cho nét hơn
//     spotLight.shadow.mapSize.width = 4096;
//     spotLight.shadow.mapSize.height = 4096;

//     // Cấu hình vùng shadow camera rộng hơn
//     spotLight.shadow.camera.near = 10;
//     spotLight.shadow.camera.far = 300;
//     spotLight.shadow.camera.fov = 60; // góc lớn hơn để phủ bóng rộng

//     scene.add(spotLight);

//     // Camera helper để debug vùng shadow (bạn có thể tắt sau)
//     const shadowCameraHelper = new THREE.CameraHelper(spotLight.shadow.camera);
//     scene.add(shadowCameraHelper);

//     // Các khối hộp có thể kéo thả
//     const draggableObjects = [];
//     for (let i = 0; i < 20; i++) {
//       const geometry = new THREE.BoxGeometry(8, 8, 8);
//       const material = new THREE.MeshPhongMaterial({
//         color: Math.random() * 0xffffff,
//       });
//       const cube = new THREE.Mesh(geometry, material);
//       cube.position.set(
//         (Math.random() - 0.5) * 180,
//         10 + Math.random() * 70,
//         (Math.random() - 0.5) * 180
//       );
//       cube.castShadow = true;
//       cube.receiveShadow = true;
//       scene.add(cube);
//       draggableObjects.push(cube);
//     }

//     // DragControls
//     const dragControls = new DragControls(
//       draggableObjects,
//       camera,
//       renderer.domElement
//     );
//     dragControls.addEventListener("dragstart", () => {
//       orbitControls.enabled = false;
//     });
//     dragControls.addEventListener("dragend", () => {
//       orbitControls.enabled = true;
//     });

//     // Resize
//     const handleResize = () => {
//       camera.aspect = window.innerWidth / window.innerHeight;
//       camera.updateProjectionMatrix();
//       renderer.setSize(window.innerWidth, window.innerHeight);
//     };
//     window.addEventListener("resize", handleResize);

//     // Animate loop
//     const animate = () => {
//       requestAnimationFrame(animate);
//       orbitControls.update();
//       renderer.render(scene, camera);
//     };
//     animate();

//     // Cleanup
//     return () => {
//       mountRef.current.removeChild(renderer.domElement);
//       window.removeEventListener("resize", handleResize);
//       dragControls.dispose();
//       renderer.dispose();
//     };
//   }, []);

//   return <div ref={mountRef} style={{ width: "100vw", height: "100vh" }} />;
// }

// export default Test;

import React, { useRef, useEffect } from "react";
import * as THREE from "three";
import { OrbitControls } from "three-stdlib";
import { DragControls } from "three/examples/jsm/controls/DragControls";

function Test() {
  const mountRef = useRef(null);

  useEffect(() => {
    const scene = new THREE.Scene();

    // Camera setup
    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.set(50, 100, 150);
    camera.lookAt(0, 40, 0);

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setClearColor(0x000000, 0); // nền trong suốt
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mountRef.current.appendChild(renderer.domElement);

    // Controls
    const orbitControls = new OrbitControls(camera, renderer.domElement);
    orbitControls.enableDamping = true;

    // Mặt phẳng nền trắng
    const planeGeometry = new THREE.PlaneGeometry(500, 500);

    // Mặt phẳng trắng
    const planeMaterial = new THREE.MeshPhongMaterial({
      color: 0xffffff,
      side: THREE.DoubleSide,
    });
    const plane = new THREE.Mesh(planeGeometry, planeMaterial);
    plane.rotation.x = -Math.PI / 2;
    plane.position.y = -0.1;
    plane.receiveShadow = false; // nền trắng không nhận bóng
    scene.add(plane);

    // Mặt phẳng bóng
    const shadowPlaneMaterial = new THREE.ShadowMaterial({ opacity: 0.7 });
    const shadowPlane = new THREE.Mesh(planeGeometry, shadowPlaneMaterial);
    shadowPlane.rotation.x = -Math.PI / 2;
    shadowPlane.position.y = -0.09;
    shadowPlane.receiveShadow = true; // nhận bóng đổ
    scene.add(shadowPlane);

    // GridHelper rõ nét trên nền
    const gridHelper = new THREE.GridHelper(500, 50, 0x444444, 0xaaaaaa);
    scene.add(gridHelper);

    // Trục XYZ
    const axisLength = 50;
    const origin = new THREE.Vector3(0, 0, 0);
    const arrowX = new THREE.ArrowHelper(
      new THREE.Vector3(1, 0, 0),
      origin,
      axisLength,
      0xff0000,
      5,
      3
    );
    const arrowY = new THREE.ArrowHelper(
      new THREE.Vector3(0, 1, 0),
      origin,
      axisLength,
      0x00ff00,
      5,
      3
    );
    const arrowZ = new THREE.ArrowHelper(
      new THREE.Vector3(0, 0, 1),
      origin,
      axisLength,
      0x0000ff,
      5,
      3
    );
    scene.add(arrowX, arrowY, arrowZ);

    // Ánh sáng ambient để đủ sáng chung
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    // Thay Spotlight bằng DirectionalLight
    const directionalLight = new THREE.DirectionalLight(0x0000ff, 2);
    directionalLight.position.set(0, 150, 0);
    directionalLight.castShadow = true;

    // Thiết lập vùng shadow camera lớn để bao phủ toàn cảnh
    directionalLight.shadow.camera.left = -200;
    directionalLight.shadow.camera.right = 200;
    directionalLight.shadow.camera.top = 200;
    directionalLight.shadow.camera.bottom = -200;

    directionalLight.shadow.camera.near = 10;
    directionalLight.shadow.camera.far = 400;

    directionalLight.shadow.mapSize.width = 4096;
    directionalLight.shadow.mapSize.height = 4096;

    scene.add(directionalLight);

    // Camera helper để debug vùng shadow (bạn có thể tắt sau)
    const shadowCameraHelper = new THREE.CameraHelper(
      directionalLight.shadow.camera
    );
    scene.add(shadowCameraHelper);

    // Các khối hộp có thể kéo thả
    const draggableObjects = [];
    for (let i = 0; i < 20; i++) {
      const geometry = new THREE.BoxGeometry(8, 8, 8);
      const material = new THREE.MeshPhongMaterial({
        color: Math.random() * 0xffffff,
      });
      const cube = new THREE.Mesh(geometry, material);
      cube.position.set(
        (Math.random() - 0.5) * 180,
        10 + Math.random() * 70,
        (Math.random() - 0.5) * 180
      );
      cube.castShadow = true;
      cube.receiveShadow = true;
      scene.add(cube);
      draggableObjects.push(cube);
    }

    // DragControls
    const dragControls = new DragControls(
      draggableObjects,
      camera,
      renderer.domElement
    );
    dragControls.addEventListener("dragstart", () => {
      orbitControls.enabled = false;
    });
    dragControls.addEventListener("dragend", () => {
      orbitControls.enabled = true;
    });

    // Resize
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener("resize", handleResize);

    // Animate loop
    const animate = () => {
      requestAnimationFrame(animate);
      orbitControls.update();
      renderer.render(scene, camera);
    };
    animate();

    // Cleanup
    return () => {
      mountRef.current.removeChild(renderer.domElement);
      window.removeEventListener("resize", handleResize);
      dragControls.dispose();
      renderer.dispose();
    };
  }, []);

  return <div ref={mountRef} style={{ width: "100vw", height: "100vh" }} />;
}

export default Test;
