// import React, { useEffect, useRef } from "react";
// import * as THREE from "three";
// import * as CANNON from "cannon-es";
// import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

// export default function FallingSimulation() {
//   const mountRef = useRef(null);

//   useEffect(() => {
//     // Scene, Camera, Renderer
//     const scene = new THREE.Scene();
//     scene.background = new THREE.Color(0xdddddd);
//     const camera = new THREE.PerspectiveCamera(
//       75,
//       mountRef.current.clientWidth / mountRef.current.clientHeight,
//       0.1,
//       1000
//     );
//     camera.position.set(5, 5, 10);

//     const renderer = new THREE.WebGLRenderer({ antialias: true });
//     renderer.setSize(
//       mountRef.current.clientWidth,
//       mountRef.current.clientHeight
//     );
//     renderer.shadowMap.enabled = true;
//     mountRef.current.appendChild(renderer.domElement);

//     // OrbitControls
//     const controls = new OrbitControls(camera, renderer.domElement);
//     controls.enableDamping = true;

//     // Lights
//     const light = new THREE.DirectionalLight(0xffffff, 1);
//     light.position.set(10, 10, 5);
//     light.castShadow = true;
//     scene.add(light);

//     scene.add(new THREE.AmbientLight(0x404040));

//     // Cannon world
//     const world = new CANNON.World({
//       gravity: new CANNON.Vec3(0, -9.82, 0),
//     });

//     // Ground - Cannon
//     const groundBody = new CANNON.Body({
//       type: CANNON.Body.STATIC,
//       shape: new CANNON.Plane(),
//     });
//     groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
//     world.addBody(groundBody);

//     // Ground - Three
//     const groundGeometry = new THREE.PlaneGeometry(100, 100);
//     const groundMaterial = new THREE.MeshStandardMaterial({ color: 0x999999 });
//     const groundMesh = new THREE.Mesh(groundGeometry, groundMaterial);
//     groundMesh.rotation.x = -Math.PI / 2;
//     groundMesh.receiveShadow = true;
//     scene.add(groundMesh);

//     // Box - Cannon
//     const boxSize = 1;
//     const boxShape = new CANNON.Box(
//       new CANNON.Vec3(boxSize / 2, boxSize / 2, boxSize / 2)
//     );
//     const boxBody = new CANNON.Body({
//       mass: 1,
//       position: new CANNON.Vec3(0, 10, 0),
//       shape: boxShape,
//     });
//     world.addBody(boxBody);

//     // Box - Three
//     const boxGeometry = new THREE.BoxGeometry(boxSize, boxSize, boxSize);
//     const boxMaterial = new THREE.MeshStandardMaterial({
//       color: 0xff8800,
//       wireframe: true,
//     });
//     const boxMesh = new THREE.Mesh(boxGeometry, boxMaterial);
//     boxMesh.castShadow = true;
//     scene.add(boxMesh);

//     // Collider helper (wireframe)
//     const edges = new THREE.EdgesGeometry(boxGeometry);
//     const line = new THREE.LineSegments(
//       edges,
//       new THREE.LineBasicMaterial({ color: 0x000000 })
//     );
//     boxMesh.add(line);

//     // Animation loop
//     const clock = new THREE.Clock();
//     function animate() {
//       const delta = clock.getDelta();
//       world.step(1 / 60, delta, 3);

//       // Sync Three.js box position/rotation with Cannon
//       boxMesh.position.copy(boxBody.position);
//       boxMesh.quaternion.copy(boxBody.quaternion);

//       controls.update();
//       renderer.render(scene, camera);
//       requestAnimationFrame(animate);
//     }

//     animate();

//     // Cleanup
//     return () => {
//       mountRef.current.removeChild(renderer.domElement);
//       renderer.dispose();
//     };
//   }, []);

//   return <div ref={mountRef} style={{ width: "100vw", height: "100vh" }} />;
// }

import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { TransformControls } from "three/examples/jsm/controls/TransformControls";

export default function BoxWithBoundingBoxFixed() {
  const mountRef = useRef(null);
  const transformControlsRef = useRef(null);
  const [mode, setMode] = useState("translate");

  useEffect(() => {
    // Setup scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xeeeeee);

    // Setup camera
    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.set(5, 5, 10);

    // Setup renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    mountRef.current.appendChild(renderer.domElement);

    // OrbitControls
    const orbitControls = new OrbitControls(camera, renderer.domElement);
    orbitControls.enableDamping = true;

    // Lights
    scene.add(new THREE.AmbientLight(0x404040));
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(5, 10, 7);
    scene.add(directionalLight);

    // Box geometry and mesh
    const boxGeometry = new THREE.BoxGeometry(1, 1, 1);
    boxGeometry.computeBoundingBox();
    const boxMaterial = new THREE.MeshStandardMaterial({ color: 0xff8800 });
    const box = new THREE.Mesh(boxGeometry, boxMaterial);

    // Box3 and Box3Helper
    const box3 = new THREE.Box3().setFromObject(box);
    const boxHelper = new THREE.Box3Helper(box3, "red");
    scene.add(boxHelper);
    // Tạo BoxHelper trực tiếp từ mesh box
    const boxHelper2 = new THREE.BoxHelper(box, "blue"); // màu xanh lá
    // scene.add(boxHelper2);

    // 1. Tính bounding box của box (có thể là Box3)
    const boundingBox = new THREE.Box3().setFromObject(box);

    // 2. Lấy kích thước bounding box
    const size = new THREE.Vector3();
    boundingBox.getSize(size);

    // 3. Lấy tâm bounding box (center)
    const center = new THREE.Vector3();
    boundingBox.getCenter(center);

    // 4. Tạo BoxGeometry với kích thước bằng bounding box
    const boundingBoxGeometry = new THREE.BoxGeometry(size.x, size.y, size.z);

    // 5. Tạo mesh từ boundingBoxGeometry
    const boundingBoxMaterial = new THREE.MeshBasicMaterial({
      color: "yellow",
      wireframe: true,
    });
    const boundingBoxMesh = new THREE.Mesh(
      boundingBoxGeometry,
      boundingBoxMaterial
    );
    // box.userData.bbBoxmesh = boundingBoxMesh;
    // boundingBoxMesh.userData.targetGroup = box;
    // box.add(boundingBoxMesh);
    // 6. Đặt vị trí boundingBoxMesh trùng tâm bounding box

    // 7. Thêm boundingBoxMesh vào scene
    // scene.add(boundingBoxMesh);

    // Console check before adding
    console.log("box is Object3D:", box instanceof THREE.Object3D);
    console.log("boxHelper is Object3D:", boxHelper instanceof THREE.Object3D);

    // Add box and helper
    scene.add(box);

    // TransformControls
    const transformControls = new TransformControls(
      camera,
      renderer.domElement
    );
    transformControls.attach(box);

    console.log(
      "transformControls is Object3D:",
      transformControls instanceof THREE.Object3D
    );
    const helpertransformControls = transformControls.getHelper();
    scene.add(helpertransformControls);

    helpertransformControls.visible = false;
    // transformControls.showX = false;
    // transformControls.showY = false;
    // transformControls.showZ = false;
    transformControlsRef.current = transformControls;

    // Disable orbit while dragging
    transformControls.addEventListener("dragging-changed", (event) => {
      orbitControls.enabled = !event.value;
    });

    // Limit scale and update bounding box on transform change
    transformControls.addEventListener("objectChange", () => {
      ["x", "y", "z"].forEach((axis) => {
        if (box.scale[axis] < 0.01) box.scale[axis] = 0.01;
      });
      box3.setFromObject(box);
    });

    // Animate loop
    const animate = () => {
      //   boxHelper2.update();
      //   orbitControls.update();
      // renderer.render(scene, camera);
      // requestAnimationFrame(animate);
    };
    animate();

    // Cleanup
    return () => {
      renderer.dispose();
      mountRef.current.removeChild(renderer.domElement);
    };
  }, []);

  // Update mode
  useEffect(() => {
    if (transformControlsRef.current) {
      transformControlsRef.current.setMode(mode);
    }
  }, [mode]);

  return (
    <>
      <div
        className="mt-16"
        style={{ position: "absolute", top: 20, left: 20, zIndex: 1 }}
      >
        <button onClick={() => setMode("translate")}>Translate</button>
        <button onClick={() => setMode("rotate")}>Rotate</button>
        <button onClick={() => setMode("scale")}>Scale</button>
      </div>
      <div ref={mountRef} style={{ width: "100vw", height: "100vh" }} />
    </>
  );
}
