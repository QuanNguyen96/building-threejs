// import React, { useEffect, useRef } from "react";
// import * as THREE from "three";
// import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
// import { GUI } from "three/examples/jsm/libs/lil-gui.module.min.js";
// import { DirectionalLightHelper } from "three";

// export default function ThreeDirectionalLights() {
//   const containerRef = useRef();

//   useEffect(() => {
//     if (!containerRef.current) return;

//     // Scene + Camera
//     const scene = new THREE.Scene();
//     scene.background = new THREE.Color(0xaaaaaa);
//     const camera = new THREE.PerspectiveCamera(
//       60,
//       containerRef.current.clientWidth / containerRef.current.clientHeight,
//       0.1,
//       1000
//     );
//     camera.position.set(30, 30, 30);

//     // Renderer
//     const renderer = new THREE.WebGLRenderer({ antialias: true });
//     renderer.setSize(
//       containerRef.current.clientWidth,
//       containerRef.current.clientHeight
//     );
//     renderer.shadowMap.enabled = true;
//     containerRef.current.appendChild(renderer.domElement);

//     // Controls
//     const controls = new OrbitControls(camera, renderer.domElement);
//     controls.target.set(0, 0, 0);
//     controls.update();

//     // Ground plane
//     const planeGeometry = new THREE.PlaneGeometry(100, 100);
//     const planeMaterial = new THREE.MeshStandardMaterial({
//       color: 0x999999,
//       side: THREE.DoubleSide,
//     });
//     const plane = new THREE.Mesh(planeGeometry, planeMaterial);
//     plane.rotation.x = -Math.PI / 2;
//     plane.receiveShadow = true;
//     scene.add(plane);

//     // Box
//     const boxGeometry = new THREE.BoxGeometry(10, 10, 10);
//     const boxMaterial = new THREE.MeshStandardMaterial({ color: 'red' });
//     const box = new THREE.Mesh(boxGeometry, boxMaterial);
//     box.castShadow = true;
//     box.position.y = 5;
//     scene.add(box);

//     // Directional Light 1
//     const light1 = new THREE.DirectionalLight(0xffffff, 0.8);
//     light1.position.set(30, 40, 30);
//     light1.castShadow = true;
//     light1.shadow.camera.left = -50;
//     light1.shadow.camera.right = 50;
//     light1.shadow.camera.top = 50;
//     light1.shadow.camera.bottom = -50;
//     light1.shadow.camera.near = 1;
//     light1.shadow.camera.far = 200;
//     scene.add(light1);
//     light1.target.position.set(0, 0, 0);
//     // scene.add(light1.target);

//     // Helper 1
//     const helper1 = new DirectionalLightHelper(light1, 5, 0xff0000);
//     scene.add(helper1);

//     // // Directional Light 2
//     // const light2 = new THREE.DirectionalLight(0xffffff, 0.5);
//     // light2.position.set(0, 40, -30);
//     // light2.castShadow = false;
//     // scene.add(light2);
//     // light2.target.position.set(0, 0, 0);
//     // // scene.add(light2.target);

//     // // Helper 2
//     // const helper2 = new DirectionalLightHelper(light2, 5, 0x0000ff);
//     // scene.add(helper2);

//     // GUI
//     const gui = new GUI();
//     const folder1 = gui.addFolder("Light 1");
//     folder1.add(light1.position, "x", -100, 100).name("posX");
//     folder1.add(light1.position, "y", -100, 100).name("posY");
//     folder1.add(light1.position, "z", -100, 100).name("posZ");
//     folder1.open();

//     // const folder2 = gui.addFolder("Light 2");
//     // folder2.add(light2.position, "x", -100, 100).name("posX");
//     // folder2.add(light2.position, "y", -100, 100).name("posY");
//     // folder2.add(light2.position, "z", -100, 100).name("posZ");
//     // folder2.open();

//     // Handle resize
//     function onResize() {
//       if (!containerRef.current) return;
//       camera.aspect =
//         containerRef.current.clientWidth / containerRef.current.clientHeight;
//       camera.updateProjectionMatrix();
//       renderer.setSize(
//         containerRef.current.clientWidth,
//         containerRef.current.clientHeight
//       );
//     }
//     window.addEventListener("resize", onResize);

//     // Animate loop
//     function animate() {
//       requestAnimationFrame(animate);
//       helper1.update();
//       // helper2.update();
//       renderer.render(scene, camera);
//     }
//     animate();

//     // Cleanup on unmount
//     return () => {
//       window.removeEventListener("resize", onResize);
//       gui.destroy();
//       renderer.dispose();
//       if (containerRef.current) {
//         while (containerRef.current.firstChild) {
//           containerRef.current.removeChild(containerRef.current.firstChild);
//         }
//       }
//     };
//   }, []);

//   return <div ref={containerRef} style={{ width: "100vw", height: "100vh" }} />;
// }










// import React, { useRef, useEffect, useState } from "react";
// import * as THREE from "three";
// import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
// import { TransformControls } from "three/examples/jsm/controls/TransformControls.js";

// export default function ThreeSelectionDemo({ useGroup = true }) {
//   const containerRef = useRef();
//   const sceneRef = useRef();
//   const cameraRef = useRef();
//   const rendererRef = useRef();
//   const orbitRef = useRef();
//   const transformRef = useRef();
//   const groupRef = useRef(null);
//   const selectableMeshesRef = useRef([]);
//   const isSelecting = useRef(false);
//   const startPoint = useRef(new THREE.Vector2());
//   const endPoint = useRef(new THREE.Vector2());

//   const [selectionBox, setSelectionBox] = useState(null);

//   // Hàm attach mesh từ oldParent sang newParent giữ đúng position/quaternion/scale thế giới
//   function attach(mesh, oldParent, newParent) {
//     oldParent.updateMatrixWorld();
//     mesh.updateMatrixWorld();

//     const matrixWorld = mesh.matrixWorld.clone();

//     oldParent.remove(mesh);
//     newParent.add(mesh);

//     newParent.updateMatrixWorld();
//     const parentInverse = new THREE.Matrix4().copy(newParent.matrixWorld).invert();

//     mesh.matrix.copy(parentInverse.multiply(matrixWorld));
//     mesh.matrix.decompose(mesh.position, mesh.quaternion, mesh.scale);
//   }

//   // Quét các mesh nằm trong vùng chọn (dùng box3 chiếu 8 điểm bounding box)
//   function getMeshesInSelection(p1, p2) {
//     const x1 = Math.min(p1.x, p2.x);
//     const x2 = Math.max(p1.x, p2.x);
//     const y1 = Math.min(p1.y, p2.y);
//     const y2 = Math.max(p1.y, p2.y);

//     const cam = cameraRef.current;
//     const renderer = rendererRef.current;
//     const selected = [];

//     for (const mesh of selectableMeshesRef.current) {
//       const box = new THREE.Box3().setFromObject(mesh);
//       if (box.isEmpty()) continue;

//       const points = [
//         new THREE.Vector3(box.min.x, box.min.y, box.min.z),
//         new THREE.Vector3(box.min.x, box.min.y, box.max.z),
//         new THREE.Vector3(box.min.x, box.max.y, box.min.z),
//         new THREE.Vector3(box.min.x, box.max.y, box.max.z),
//         new THREE.Vector3(box.max.x, box.min.y, box.min.z),
//         new THREE.Vector3(box.max.x, box.min.y, box.max.z),
//         new THREE.Vector3(box.max.x, box.max.y, box.min.z),
//         new THREE.Vector3(box.max.x, box.max.y, box.max.z),
//       ];

//       let anyInside = false;
//       for (const point of points) {
//         const screenPos = point.clone().project(cam);
//         const screenX = ((screenPos.x + 1) / 2) * renderer.domElement.clientWidth;
//         const screenY = ((-screenPos.y + 1) / 2) * renderer.domElement.clientHeight;

//         if (screenX >= x1 && screenX <= x2 && screenY >= y1 && screenY <= y2) {
//           anyInside = true;
//           break;
//         }
//       }

//       if (anyInside) selected.push(mesh);
//     }

//     return selected;
//   }

//   // Gom các mesh đã chọn vào group và attach TransformControls cho group
//   function groupSelectedMeshes(meshes) {
//     const scene = sceneRef.current;

//     if (groupRef.current) {
//       scene.remove(groupRef.current);
//       groupRef.current = null;
//     }

//     const group = new THREE.Group();

//     // Tính bounding box tập mesh để lấy center
//     const box = new THREE.Box3();
//     meshes.forEach((m) => box.expandByObject(m));
//     const center = box.getCenter(new THREE.Vector3());

//     meshes.forEach((mesh) => {
//       attach(mesh, scene, group);
//       mesh.position.sub(center);
//     });

//     group.position.copy(center);
//     group.updateMatrixWorld();

//     scene.add(group);
//     groupRef.current = group;

//     transformRef.current.attach(group);
//   }

//   useEffect(() => {
//     const container = containerRef.current;
//     if (!container) return;

//     // Scene
//     const scene = new THREE.Scene();
//     sceneRef.current = scene;

//     // Camera
//     const camera = new THREE.PerspectiveCamera(60, container.clientWidth / container.clientHeight, 0.1, 1000);
//     camera.position.set(0, 20, 40);
//     cameraRef.current = camera;

//     // Renderer
//     const renderer = new THREE.WebGLRenderer({ antialias: true });
//     renderer.setSize(container.clientWidth, container.clientHeight);
//     container.appendChild(renderer.domElement);
//     rendererRef.current = renderer;

//     // Controls
//     const orbit = new OrbitControls(camera, renderer.domElement);
//     orbitRef.current = orbit;

//     // TransformControls
//     const transform = new TransformControls(camera, renderer.domElement);
//     transformRef.current = transform;
//     scene.add(transform);

//     // Thêm ánh sáng
//     const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
//     scene.add(ambientLight);
//     const dirLight = new THREE.DirectionalLight(0xffffff, 0.5);
//     dirLight.position.set(10, 20, 10);
//     scene.add(dirLight);

//     // Tạo 30 khối hộp random để test
//     const selectableMeshes = [];
//     for (let i = 0; i < 30; i++) {
//       const geometry = new THREE.BoxGeometry(1, 1, 1);
//       const material = new THREE.MeshStandardMaterial({ color: Math.random() * 0xffffff });
//       const mesh = new THREE.Mesh(geometry, material);
//       mesh.position.set(
//         (Math.random() - 0.5) * 30,
//         0.5,
//         (Math.random() - 0.5) * 30
//       );
//       scene.add(mesh);
//       selectableMeshes.push(mesh);
//     }
//     selectableMeshesRef.current = selectableMeshes;

//     // Animation loop
//     function animate() {
//       requestAnimationFrame(animate);
//       renderer.render(scene, camera);
//     }
//     animate();

//     // --- Event handlers ---

//     function onMouseDown(e) {
//       if (!useGroup) return;

//       isSelecting.current = true;
//       startPoint.current.set(e.clientX, e.clientY);
//       endPoint.current.set(e.clientX, e.clientY);

//       setSelectionBox({
//         left: e.clientX,
//         top: e.clientY,
//         width: 0,
//         height: 0,
//       });

//       // Tắt controls khi kéo vùng chọn
//       transform.enabled = false;
//       orbit.enabled = false;

//       e.preventDefault();
//       e.stopPropagation();
//     }

//     function onMouseMove(e) {
//       if (!isSelecting.current) return;

//       endPoint.current.set(e.clientX, e.clientY);

//       const left = Math.min(startPoint.current.x, e.clientX);
//       const top = Math.min(startPoint.current.y, e.clientY);
//       const width = Math.abs(e.clientX - startPoint.current.x);
//       const height = Math.abs(e.clientY - startPoint.current.y);

//       setSelectionBox({ left, top, width, height });

//       e.preventDefault();
//       e.stopPropagation();
//     }

//     function onMouseUp(e) {
//       if (!isSelecting.current) return;

//       isSelecting.current = false;
//       setSelectionBox(null);

//       // Bật lại controls sau khi quét xong
//       transform.enabled = true;
//       orbit.enabled = true;

//       const selectedMeshes = getMeshesInSelection(startPoint.current, endPoint.current);
//       console.log("so mesh tim thay là",selectedMeshes)
//       if (selectedMeshes.length > 0) {
//         groupSelectedMeshes(selectedMeshes);
//       }

//       e.preventDefault();
//       e.stopPropagation();
//     }

//     renderer.domElement.addEventListener("mousedown", onMouseDown);
//     window.addEventListener("mousemove", onMouseMove);
//     window.addEventListener("mouseup", onMouseUp);

//     // Cleanup
//     return () => {
//       renderer.domElement.removeEventListener("mousedown", onMouseDown);
//       window.removeEventListener("mousemove", onMouseMove);
//       window.removeEventListener("mouseup", onMouseUp);

//       transform.dispose();
//       orbit.dispose();
//       renderer.dispose();

//       if (container.contains(renderer.domElement)) {
//         container.removeChild(renderer.domElement);
//       }
//     };
//   }, [useGroup]);

//   return (
//     <>
//       <div
//         ref={containerRef}
//         style={{ width: "100%", height: "100vh", position: "relative", userSelect: "none" }}
//       />
//       {selectionBox && (
//         <div
//           style={{
//             position: "fixed",
//             border: "1px dashed #00f",
//             backgroundColor: "rgba(0,0,255,0.2)",
//             left: selectionBox.left,
//             top: selectionBox.top,
//             width: selectionBox.width,
//             height: selectionBox.height,
//             pointerEvents: "none",
//             zIndex: 9999,
//           }}
//         />
//       )}
//     </>
//   );
// }









// import React, { useEffect, useRef, useState } from "react";
// import * as THREE from "three";
// import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
// import { TransformControls } from "three/examples/jsm/controls/TransformControls";

// const SelectionScene = () => {
//   const containerRef = useRef();
//   const [mode, setMode] = useState("select");

//   const sceneRef = useRef();
//   const cameraRef = useRef();
//   const rendererRef = useRef();
//   const transformControlRef = useRef();
//   const controlsRef = useRef();
//   const groupRef = useRef(new THREE.Group());
//   const meshesRef = useRef([]);
//   const selectedMeshesRef = useRef([]);

//   const isSelectingRef = useRef(false);
//   const draggingTransformRef = useRef(false);
//   const pointerDownOnBBoxRef = useRef(false);
//   const shiftPressedRef = useRef(false);

//   const dragStart = useRef(new THREE.Vector2());
//   const dragEnd = useRef(new THREE.Vector2());

//   // Div hiển thị vùng kéo chọn
//   const selectionRectRef = useRef();

//   // Kiểm tra pointer có nằm trên bounding box group hay không
//   function isPointerOnGroupBBox(event) {
//     if (groupRef.current.children.length === 0) return false;

//     const rect = rendererRef.current.domElement.getBoundingClientRect();

//     // Lấy vị trí chuột normalized device coordinates
//     const mouse = new THREE.Vector2(
//       ((event.clientX - rect.left) / rect.width) * 2 - 1,
//       -((event.clientY - rect.top) / rect.height) * 2 + 1
//     );

//     // Tạo raycaster từ camera
//     const raycaster = new THREE.Raycaster();
//     raycaster.setFromCamera(mouse, cameraRef.current);

//     // Tạo Box3 cho group
//     const box = new THREE.Box3().setFromObject(groupRef.current);

//     // Box3 không hỗ trợ intersectsRay trực tiếp, nên ta tạo 8 điểm góc và test khoảng cách
//     // Cách đơn giản: tạo mesh box tạm với kích thước bounding box để raycast
//     if (!groupRef.current.userData.bboxMesh) {
//       const size = new THREE.Vector3();
//       box.getSize(size);
//       const center = new THREE.Vector3();
//       box.getCenter(center);

//       const geo = new THREE.BoxGeometry(size.x, size.y, size.z);
//       const mat = new THREE.MeshBasicMaterial({ visible: false });
//       const mesh = new THREE.Mesh(geo, mat);
//       mesh.position.copy(center);
//       groupRef.current.userData.bboxMesh = mesh;
//       sceneRef.current.add(mesh);
//     }

//     const intersects = raycaster.intersectObject(groupRef.current.userData.bboxMesh);
//     return intersects.length > 0;
//   }

//   useEffect(() => {
//     // Setup scene
//     const scene = new THREE.Scene();
//     sceneRef.current = scene;

//     const camera = new THREE.PerspectiveCamera(
//       75,
//       window.innerWidth / window.innerHeight,
//       0.1,
//       1000
//     );
//     camera.position.set(0, 20, 30);
//     cameraRef.current = camera;

//     const renderer = new THREE.WebGLRenderer({ antialias: true });
//     renderer.setSize(window.innerWidth, window.innerHeight);
//     rendererRef.current = renderer;
//     containerRef.current.appendChild(renderer.domElement);

//     // Controls
//     const controls = new OrbitControls(camera, renderer.domElement);
//     controls.enableDamping = true;
//     controlsRef.current = controls;

//     // Transform Controls
//     const transformControl = new TransformControls(camera, renderer.domElement);
//     transformControlRef.current = transformControl;

//     transformControl.addEventListener("dragging-changed", (event) => {
//       controls.enabled = !event.value;
//       draggingTransformRef.current = event.value;
//     });
//     scene.add(transformControl);

//     // Group chứa các mesh đã chọn
//     const group = groupRef.current;
//     scene.add(group);

//     // Tạo mesh ví dụ
//     const boxGeo = new THREE.BoxGeometry(2, 2, 2);
//     for (let i = 0; i < 30; i++) {
//       const boxMat = new THREE.MeshStandardMaterial({ color: 0x0088ff });
//       const mesh = new THREE.Mesh(boxGeo, boxMat);
//       mesh.position.set(Math.random() * 50 - 25, 1, Math.random() * 50 - 25);
//       mesh.userData.selectable = true;
//       scene.add(mesh);
//       meshesRef.current.push(mesh);
//     }

//     // Lights
//     const light = new THREE.DirectionalLight(0xffffff, 1);
//     light.position.set(10, 20, 10);
//     scene.add(light);
//     scene.add(new THREE.AmbientLight(0xffffff, 0.3));

//     // Tạo div vùng chọn (selection rect)
//     const selectionRect = document.createElement("div");
//     selectionRect.style.position = "absolute";
//     selectionRect.style.border = "1px dashed red";
//     selectionRect.style.display = "none";
//     selectionRect.style.pointerEvents = "none";
//     containerRef.current.appendChild(selectionRect);
//     selectionRectRef.current = selectionRect;

//     // Xử lý phím Shift
//     const onKeyDown = (e) => {
//       if (e.key === "Shift") shiftPressedRef.current = true;
//     };
//     const onKeyUp = (e) => {
//       if (e.key === "Shift") shiftPressedRef.current = false;

//       // Khi thả shift, kết thúc transform drag nếu có
//       if (draggingTransformRef.current) {
//         draggingTransformRef.current = false;
//         controls.enabled = true;
//         transformControl.detach();
//       }
//     };
//     window.addEventListener("keydown", onKeyDown);
//     window.addEventListener("keyup", onKeyUp);

//     // Pointer events
//     const onPointerDown = (e) => {
//       if (shiftPressedRef.current) {
//         if (mode === "select") {
//           // Bắt đầu quét chọn vùng
//           isSelectingRef.current = true;
//           dragStart.current.set(e.clientX, e.clientY);

//           selectionRect.style.left = e.clientX + "px";
//           selectionRect.style.top = e.clientY + "px";
//           selectionRect.style.width = "0px";
//           selectionRect.style.height = "0px";
//           selectionRect.style.display = "block";

//           controls.enabled = false;
//           transformControl.detach();
//         } else if (
//           (mode === "translate" || mode === "rotate" || mode === "scale") &&
//           selectedMeshesRef.current.length > 0
//         ) {
//           // Ở các mode transform, khi giữ shift + kéo trên bounding box thì attach transform cho group
//           if (isPointerOnGroupBBox(e)) {
//             transformControl.attach(groupRef.current);
//             transformControl.setMode(mode);
//             draggingTransformRef.current = true;
//             controls.enabled = false;
//             pointerDownOnBBoxRef.current = true;
//           }
//         }
//       } else {
//         // Không giữ shift
//         if (mode !== "select") {
//           // Click vùng trống clear selection
//           if (!isPointerOnGroupBBox(e)) {
//             transformControl.detach();
//             controls.enabled = true;
//             pointerDownOnBBoxRef.current = false;
//             draggingTransformRef.current = false;

//             groupRef.current.clear();
//             selectedMeshesRef.current = [];
//             // Xóa mesh bbox mesh ẩn nếu có
//             if (groupRef.current.userData.bboxMesh) {
//               scene.remove(groupRef.current.userData.bboxMesh);
//               groupRef.current.userData.bboxMesh.geometry.dispose();
//               groupRef.current.userData.bboxMesh.material.dispose();
//               delete groupRef.current.userData.bboxMesh;
//             }
//           }
//         }
//       }
//     };

//     const onPointerMove = (e) => {
//       if (mode === "select" && isSelectingRef.current) {
//         dragEnd.current.set(e.clientX, e.clientY);

//         const x = Math.min(dragStart.current.x, dragEnd.current.x);
//         const y = Math.min(dragStart.current.y, dragEnd.current.y);
//         const width = Math.abs(dragStart.current.x - dragEnd.current.x);
//         const height = Math.abs(dragStart.current.y - dragEnd.current.y);

//         Object.assign(selectionRect.style, {
//           left: x + "px",
//           top: y + "px",
//           width: width + "px",
//           height: height + "px",
//         });
//       }
//     };

//     const onPointerUp = (e) => {
//       if (mode === "select" && isSelectingRef.current) {
//         isSelectingRef.current = false;
//         selectionRect.style.display = "none";
//         controls.enabled = true;

//         const rect = renderer.domElement.getBoundingClientRect();

//         // Chuyển tọa độ pixel sang normalized device coords (-1..1)
//         const x1 = ((dragStart.current.x - rect.left) / rect.width) * 2 - 1;
//         const y1 = -((dragStart.current.y - rect.top) / rect.height) * 2 + 1;
//         const x2 = ((e.clientX - rect.left) / rect.width) * 2 - 1;
//         const y2 = -((e.clientY - rect.top) / rect.height) * 2 + 1;

//         const minX = Math.min(x1, x2);
//         const maxX = Math.max(x1, x2);
//         const minY = Math.min(y1, y2);
//         const maxY = Math.max(y1, y2);

//         const selected = [];
//         meshesRef.current.forEach((mesh) => {
//           const pos = mesh.position.clone();
//           pos.project(cameraRef.current);
//           if (
//             pos.x >= minX &&
//             pos.x <= maxX &&
//             pos.y >= minY &&
//             pos.y <= maxY
//           ) {
//             selected.push(mesh);
//           }
//         });

//         // Clear group cũ và add mesh mới
//         groupRef.current.clear();
//         selected.forEach((mesh) => groupRef.current.add(mesh));
//         selectedMeshesRef.current = selected;

//         // Xóa bbox mesh cũ nếu có để update bbox mới
//         if (groupRef.current.userData.bboxMesh) {
//           scene.remove(groupRef.current.userData.bboxMesh);
//           groupRef.current.userData.bboxMesh.geometry.dispose();
//           groupRef.current.userData.bboxMesh.material.dispose();
//           delete groupRef.current.userData.bboxMesh;
//         }

//         // Tạo lại bounding box mesh
//         if (selected.length > 0) {
//           const box = new THREE.Box3().setFromObject(groupRef.current);
//           const size = new THREE.Vector3();
//           box.getSize(size);
//           const center = new THREE.Vector3();
//           box.getCenter(center);

//           const geo = new THREE.BoxGeometry(size.x, size.y, size.z);
//           const mat = new THREE.MeshBasicMaterial({
//             color: 0xffff00,
//             wireframe: true,
//           });
//           const bboxMesh = new THREE.Mesh(geo, mat);
//           bboxMesh.position.copy(center);
//           bboxMesh.userData.isBBox = true;
//           groupRef.current.userData.bboxMesh = bboxMesh;
//           scene.add(bboxMesh);
//         }
//       }

//       if (draggingTransformRef.current) {
//         draggingTransformRef.current = false;
//         pointerDownOnBBoxRef.current = false;
//         transformControl.detach();
//         controls.enabled = true;
//       }
//     };

//     renderer.domElement.addEventListener("pointerdown", onPointerDown);
//     renderer.domElement.addEventListener("pointermove", onPointerMove);
//     renderer.domElement.addEventListener("pointerup", onPointerUp);

//     // Animation loop
//     const animate = () => {
//       requestAnimationFrame(animate);
//       controls.update();

//       // Cập nhật bounding box vị trí theo group
//       if (groupRef.current.userData.bboxMesh) {
//         const box = new THREE.Box3().setFromObject(groupRef.current);
//         const size = new THREE.Vector3();
//         box.getSize(size);
//         const center = new THREE.Vector3();
//         box.getCenter(center);

//         const bboxMesh = groupRef.current.userData.bboxMesh;
//         bboxMesh.position.copy(center);
//         bboxMesh.scale.set(
//           size.x / bboxMesh.geometry.parameters.width,
//           size.y / bboxMesh.geometry.parameters.height,
//           size.z / bboxMesh.geometry.parameters.depth
//         );
//       }

//       renderer.render(scene, camera);
//     };
//     animate();

//     // Cleanup
//     return () => {
//       window.removeEventListener("keydown", onKeyDown);
//       window.removeEventListener("keyup", onKeyUp);

//       renderer.domElement.removeEventListener("pointerdown", onPointerDown);
//       renderer.domElement.removeEventListener("pointermove", onPointerMove);
//       renderer.domElement.removeEventListener("pointerup", onPointerUp);

//       renderer.dispose();
//       containerRef.current.removeChild(renderer.domElement);
//     };
//   }, []);

//   // Cập nhật transform control khi đổi mode
//   useEffect(() => {
//     const transformControl = transformControlRef.current;
//     if (!transformControl) return;

//     if (mode === "select") {
//       transformControl.detach();
//       controlsRef.current.enabled = true;
//     } else {
//       if (selectedMeshesRef.current.length > 0) {
//         transformControl.attach(groupRef.current);
//         transformControl.setMode(mode);
//         controlsRef.current.enabled = false;
//       } else {
//         transformControl.detach();
//         controlsRef.current.enabled = true;
//       }
//     }
//   }, [mode]);

//   return (
//     <>
//       <div
//         style={{
//           position: "absolute",
//           zIndex: 10,
//           color: "#fff",
//           userSelect: "none",
//           padding: 8,
//         }}
//       >
//         <button onClick={() => setMode("select")}>Select</button>
//         <button onClick={() => setMode("translate")}>Translate</button>
//         <button onClick={() => setMode("rotate")}>Rotate</button>
//         <button onClick={() => setMode("scale")}>Scale</button>
//         <div>Current mode: {mode}</div>
//         <div style={{ fontSize: 12, marginTop: 8, maxWidth: 300 }}>
//           Giữ SHIFT + kéo chuột để:
//           <ul>
//             <li>
//               <b>Select:</b> quét chọn mesh và tạo bounding box nhóm
//             </li>
//             <li>
//               <b>Translate/Rotate/Scale:</b> thao tác transform cả nhóm nếu kéo
//               trên bounding box
//             </li>
//           </ul>
//           Click vùng trống không giữ shift sẽ clear selection.
//         </div>
//       </div>
//       <div ref={containerRef} style={{ width: "100vw", height: "100vh" }} />
//     </>
//   );
// };

// export default SelectionScene;

// ,color:"#fff"









// import React, { useEffect, useRef, useState } from "react";
// import * as THREE from "three";
// import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

// const GroupMoveExample = () => {
//   const containerRef = useRef();

//   // Refs for Three.js objects
//   const sceneRef = useRef();
//   const cameraRef = useRef();
//   const rendererRef = useRef();
//   const controlsRef = useRef();
//   const groupRef = useRef(new THREE.Group());
//   const bboxHelperRef = useRef();

//   // For dragging
//   const isDraggingRef = useRef(false);
//   const pointerStartRef = useRef(new THREE.Vector3());
//   const groupStartPosRef = useRef(new THREE.Vector3());

//   useEffect(() => {
//     // Setup scene
//     const scene = new THREE.Scene();
//     scene.background = new THREE.Color(0x222222);
//     sceneRef.current = scene;

//     // Setup camera
//     const camera = new THREE.PerspectiveCamera(
//       75,
//       window.innerWidth / window.innerHeight,
//       0.1,
//       1000
//     );
//     camera.position.set(0, 30, 40);
//     camera.lookAt(0, 0, 0);
//     cameraRef.current = camera;

//     // Setup renderer
//     const renderer = new THREE.WebGLRenderer({ antialias: true });
//     renderer.setSize(window.innerWidth, window.innerHeight);
//     rendererRef.current = renderer;
//     containerRef.current.appendChild(renderer.domElement);

//     // Setup controls
//     const controls = new OrbitControls(camera, renderer.domElement);
//     controls.enableDamping = true;
//     controlsRef.current = controls;

//     // Add some light
//     const light = new THREE.DirectionalLight(0xffffff, 1);
//     light.position.set(10, 20, 10);
//     scene.add(light);
//     scene.add(new THREE.AmbientLight(0xffffff, 0.3));

//     // Create 3 box meshes
//     const boxGeo = new THREE.BoxGeometry(2, 2, 2);
//     const material = new THREE.MeshStandardMaterial({ color: 0x0088ff });

//     const mesh1 = new THREE.Mesh(boxGeo, material);
//     mesh1.position.set(-5, 1, 0);
//     const mesh2 = new THREE.Mesh(boxGeo, material);
//     mesh2.position.set(0, 1, 0);
//     const mesh3 = new THREE.Mesh(boxGeo, material);
//     mesh3.position.set(5, 1, 0);

//     // Add to group
//     const group = groupRef.current;
//     group.add(mesh1);
//     group.add(mesh2);
//     group.add(mesh3);

//     scene.add(group);

//     // Create BoxHelper for bounding box and add to scene
//     const bboxHelper = new THREE.BoxHelper(group, 0xffff00);
//     bboxHelperRef.current = bboxHelper;
//     scene.add(bboxHelper);

//     // Ground plane for raycasting (XZ plane at y=0)
//     const planeNormal = new THREE.Vector3(0, 1, 0);
//     const plane = new THREE.Plane(planeNormal, 0);

//     // Raycaster for mouse interaction
//     const raycaster = new THREE.Raycaster();

//     // Convert mouse position to world on XZ plane
//     function getMousePositionOnPlane(event) {
//       const rect = renderer.domElement.getBoundingClientRect();
//       const mouse = new THREE.Vector2(
//         ((event.clientX - rect.left) / rect.width) * 2 - 1,
//         -((event.clientY - rect.top) / rect.height) * 2 + 1
//       );

//       raycaster.setFromCamera(mouse, camera);
//       const pos = new THREE.Vector3();
//       raycaster.ray.intersectPlane(plane, pos);
//       return pos;
//     }

//     // Mouse events for dragging group
//     function onPointerDown(event) {
//       event.preventDefault();

//       // Check if clicked inside bounding box (approximate by raycasting group)
//       raycaster.setFromCamera(
//         new THREE.Vector2(
//           ((event.clientX - renderer.domElement.getBoundingClientRect().left) /
//             renderer.domElement.getBoundingClientRect().width) *
//             2 -
//             1,
//           -(
//             (event.clientY - renderer.domElement.getBoundingClientRect().top) /
//             renderer.domElement.getBoundingClientRect().height
//           ) *
//             2 +
//             1
//         ),
//         camera
//       );

//       // Get intersects with group's children
//       const intersects = raycaster.intersectObjects(group.children, true);

//       if (intersects.length > 0) {
//         // Start dragging
//         isDraggingRef.current = true;
//         controls.enabled = false;
//         pointerStartRef.current.copy(getMousePositionOnPlane(event));
//         groupStartPosRef.current.copy(group.position);
//       }
//     }

//     function onPointerMove(event) {
//       if (!isDraggingRef.current) return;

//       event.preventDefault();
//       const currentPos = getMousePositionOnPlane(event);
//       const delta = new THREE.Vector3().subVectors(currentPos, pointerStartRef.current);

//       // Move group in XZ plane only
//       group.position.set(
//         groupStartPosRef.current.x + delta.x,
//         groupStartPosRef.current.y,
//         groupStartPosRef.current.z + delta.z
//       );

//       // Update bounding box helper
//       bboxHelper.update();
//     }

//     function onPointerUp(event) {
//       if (!isDraggingRef.current) return;

//       event.preventDefault();
//       isDraggingRef.current = false;
//       controls.enabled = true;
//     }

//     renderer.domElement.addEventListener("pointerdown", onPointerDown);
//     renderer.domElement.addEventListener("pointermove", onPointerMove);
//     renderer.domElement.addEventListener("pointerup", onPointerUp);

//     // Handle window resize
//     function onResize() {
//       camera.aspect = window.innerWidth / window.innerHeight;
//       camera.updateProjectionMatrix();
//       renderer.setSize(window.innerWidth, window.innerHeight);
//     }
//     window.addEventListener("resize", onResize);

//     // Animation loop
//     function animate() {
//       requestAnimationFrame(animate);
//       controls.update();
//       renderer.render(scene, camera);
//     }
//     animate();

//     // Cleanup on unmount
//     return () => {
//       renderer.domElement.removeEventListener("pointerdown", onPointerDown);
//       renderer.domElement.removeEventListener("pointermove", onPointerMove);
//       renderer.domElement.removeEventListener("pointerup", onPointerUp);
//       window.removeEventListener("resize", onResize);

//       controls.dispose();
//       renderer.dispose();
//       containerRef.current.removeChild(renderer.domElement);
//     };
//   }, []);

//   return <div ref={containerRef} style={{ width: "100vw", height: "100vh" }} />;
// };

// export default GroupMoveExample;







import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

const GroupRotateExample = () => {
  const containerRef = useRef();

  const sceneRef = useRef();
  const cameraRef = useRef();
  const rendererRef = useRef();
  const controlsRef = useRef();

  const groupRef = useRef(new THREE.Group()); // chứa 3 box con
  const bboxGroupRef = useRef(new THREE.Group()); // chứa bboxHelper, xoay bboxGroup

  const bboxHelperRef = useRef();

  const [isRotateMode, setIsRotateMode] = useState(false);
  const isDraggingRef = useRef(false);
  const pointerStartRef = useRef(new THREE.Vector2());
  const bboxStartRotationRef = useRef(new THREE.Euler());

  useEffect(() => {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x222222);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.set(0, 30, 40);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controlsRef.current = controls;

    // Grid và trục OXYZ
    scene.add(new THREE.GridHelper(50, 50));
    scene.add(new THREE.AxesHelper(5));

    // Ánh sáng
    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(10, 20, 10);
    scene.add(light);
    scene.add(new THREE.AmbientLight(0xffffff, 0.3));

    // Tạo 3 box con, add vào groupRef (chỉ chứa box, ko xoay)
    const boxGeo = new THREE.BoxGeometry(2, 2, 2);
    const mat = new THREE.MeshStandardMaterial({ color: 0x0088ff });

    const m1 = new THREE.Mesh(boxGeo, mat);
    m1.position.set(-5, 1, 0);
    const m2 = new THREE.Mesh(boxGeo, mat);
    m2.position.set(0, 1, 0);
    const m3 = new THREE.Mesh(boxGeo, mat);
    m3.position.set(5, 1, 0);

    const group = groupRef.current;
    group.add(m1, m2, m3);
    scene.add(group);

    // Tạo bounding box chính xác của group
    const box3 = new THREE.Box3().setFromObject(group);
    const center = box3.getCenter(new THREE.Vector3());

    // Dịch group về gốc bboxGroup (để group có center = 0,0,0 trong bboxGroup)
    group.position.sub(center);

    // Tạo Box3Helper dùng EdgesGeometry để vẽ bounding box (tạo mới geometry dựa trên box3)
    const geometry = new THREE.BoxGeometry(
      box3.max.x - box3.min.x,
      box3.max.y - box3.min.y,
      box3.max.z - box3.min.z
    );
    geometry.translate(
      (box3.max.x + box3.min.x) / 2 - center.x,
      (box3.max.y + box3.min.y) / 2 - center.y,
      (box3.max.z + box3.min.z) / 2 - center.z
    );

    // const edges = new THREE.EdgesGeometry(geometry);
    // const bboxHelper = new THREE.LineSegments(
    //   edges,
    //   new THREE.LineBasicMaterial({ color: 0xffff00 })
    // );
    const bboxHelper = new THREE.BoxHelper(group, 'red');
    // bboxHelper.visible=false
    bboxHelperRef.current = bboxHelper;

    // bboxGroup chứa bboxHelper, bboxGroup sẽ được xoay, đặt vị trí center
    const bboxGroup = bboxGroupRef.current;
    // Nếu bboxGroup đã có các con, xóa hết trước
    while (bboxGroup.children.length > 0) {
      bboxGroup.remove(bboxGroup.children[0]);
      bboxGroup.remove(bboxGroup.children[1]);
    }

    bboxGroup.position.copy(center);
    if (bboxGroup.children.length > 0) {
      console.log("vao 1111111")

    } else {
      console.log("vao 222222")
      // bboxGroup.add(bboxHelper);
      // thêm group vào bboxGroup để cùng xoay
    }
   
    bboxGroup.add(bboxHelper);
    bboxGroup.add(group);
     bboxHelper.update();
    console.log("bboxGroupbboxGroup=", bboxGroup)
    console.log("scene=",scene)

    scene.add(bboxGroup);


    // Hàm cập nhật bounding box helper khi group thay đổi
    function updateBoundingBoxHelper() {
      // Tính bounding box mới của group
      const box = new THREE.Box3().setFromObject(group);

      // Tạo geometry mới tương ứng với bounding box mới
      const newGeo = new THREE.BoxGeometry(
        box.max.x - box.min.x,
        box.max.y - box.min.y,
        box.max.z - box.min.z
      );
      newGeo.translate(
        (box.max.x + box.min.x) / 2 - bboxGroup.position.x,
        (box.max.y + box.min.y) / 2 - bboxGroup.position.y,
        (box.max.z + box.min.z) / 2 - bboxGroup.position.z
      );

      // Dispose geometry cũ rồi thay geometry mới cho edges
      bboxHelper.geometry.dispose();
      bboxHelper.geometry = new THREE.EdgesGeometry(newGeo);
    }

    // Sự kiện xoay bboxGroup khi bật rotate mode
    function onPointerDown(event) {
      if (!isRotateMode) return;

      isDraggingRef.current = true;
      pointerStartRef.current.set(event.clientX, event.clientY);

      // Lưu rotation hiện tại (clone Euler)
      bboxStartRotationRef.current = bboxGroup.rotation.clone();
      controls.enabled = false;
    }

    function onPointerMove(event) {
      if (!isRotateMode || !isDraggingRef.current) return;

      const deltaX = event.clientX - pointerStartRef.current.x;
      const deltaY = event.clientY - pointerStartRef.current.y;

      const speed = 0.005;

      bboxGroup.rotation.y = bboxStartRotationRef.current.y + deltaX * speed;
      bboxGroup.rotation.x = bboxStartRotationRef.current.x + deltaY * speed;

      // updateBoundingBoxHelper();
    }

    function onPointerUp() {
      isDraggingRef.current = false;
      controls.enabled = true;
    }

    renderer.domElement.addEventListener("pointerdown", onPointerDown);
    renderer.domElement.addEventListener("pointermove", onPointerMove);
    renderer.domElement.addEventListener("pointerup", onPointerUp);

    // Resize
    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };

    window.addEventListener("resize", onResize);

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);
      if (!isDraggingRef.current) controls.update();
      renderer.render(scene, camera);
    };
    animate();
    // Cleanup
    return () => {
      renderer.domElement.removeEventListener("pointerdown", onPointerDown);
      renderer.domElement.removeEventListener("pointermove", onPointerMove);
      renderer.domElement.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("resize", onResize);

      scene.remove(bboxHelper)
      scene.remove(group);
      controls.dispose();
      renderer.dispose();
      containerRef.current.removeChild(renderer.domElement);
    };
  }, [isRotateMode]);

  return (
    <div style={{ width: "100vw", height: "100vh", position: "relative" }}>
      <button
        onClick={() => setIsRotateMode((prev) => !prev)}
        style={{
          position: "absolute",
          top: 20,
          left: 20,
          zIndex: 1,
          padding: "8px 12px",
          fontSize: "14px",
          background: isRotateMode ? "#ffcc00" : "#333",
          color: isRotateMode ? "#000" : "#fff",
          border: "none",
          borderRadius: "4px",
          cursor: "pointer",
        }}
      >
        {isRotateMode ? "Rotate Mode: ON" : "Rotate Mode: OFF"}
      </button>
      <div ref={containerRef} style={{ width: "100%", height: "100%" }} />
    </div>
  );
};

export default GroupRotateExample;


// import React, { useEffect, useRef, useState } from 'react';
// import * as THREE from 'three';
// import Stats from 'three/examples/jsm/libs/stats.module.js';
// import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
// import { SelectionBox } from 'three/examples/jsm/interactive/SelectionBox.js';
// import { SelectionHelper } from 'three/examples/jsm/interactive/SelectionHelper.js';

// export default function BoxSelection() {
//   const containerRef = useRef();
//   const rendererRef = useRef();
//   const cameraRef = useRef();
//   const sceneRef = useRef();
//   const controlsRef = useRef();
//   const selectionBoxRef = useRef();
//   const helperRef = useRef();
//   const statsRef = useRef();
//   const [selectedCount, setSelectedCount] = useState(0);
//   const isSelectingRef = useRef(false);
//    const selectionRectRef = useRef();
//   const selectionHelperRef = useRef();
//   const gridSize = [400, 400]
//    const [cameraPosition, setCameraPosition] = useState([gridSize[0], gridSize[0], gridSize[1]]);

 
//   useEffect(() => {
//     const scene = new THREE.Scene();
//     scene.background = new THREE.Color(0xf0f0f0);
//     sceneRef.current = scene;

//     const sceneWidth = containerRef.current.clientWidth;
//     const sceneHeight = containerRef.current.clientHeight;
//     // const camera = new THREE.PerspectiveCamera(70, sceneWidth / sceneHeight, 0.1, 500);
//     const camera = new THREE.PerspectiveCamera(
//       90,
//       sceneWidth / sceneHeight,
//       0.1,
//       2000
//     );

//     camera.position.z = 50;
//     cameraRef.current = camera;

//     // Thêm trục tọa độ
//     const axesHelper = new THREE.AxesHelper(20);
//     scene.add(axesHelper);

//     // Thêm lưới trên mặt phẳng XZ
//     const gridHelper = new THREE.GridHelper(400, 400);
//     scene.add(gridHelper);

//     const renderer = new THREE.WebGLRenderer({ antialias: true });
//     renderer.setPixelRatio(window.devicePixelRatio);
//     renderer.setSize(window.innerWidth, window.innerHeight);
//     renderer.shadowMap.enabled = true;
//     renderer.shadowMap.type = THREE.PCFShadowMap;
//     rendererRef.current = renderer;
//     containerRef.current.appendChild(renderer.domElement);

//     const stats = new Stats();
//     statsRef.current = stats;
//     containerRef.current.appendChild(stats.dom);

//     const controls = new OrbitControls(camera, renderer.domElement);
//     controlsRef.current = controls;

//     scene.add(new THREE.AmbientLight(0xaaaaaa));
//     const light = new THREE.SpotLight(0xffffff, 10000);
//     light.position.set(0, 25, 50);
//     light.angle = Math.PI / 5;
//     light.castShadow = true;
//     light.shadow.camera.near = 10;
//     light.shadow.camera.far = 100;
//     light.shadow.mapSize.set(1024, 1024);
//     scene.add(light);

//     const geometry = new THREE.BoxGeometry();
//     for (let i = 0; i < 200; i++) {
//       const object = new THREE.Mesh(geometry, new THREE.MeshLambertMaterial({ color: Math.random() * 0xffffff }));
//       object.position.set(Math.random() * 80 - 40, Math.random() * 45 - 25, Math.random() * 45 - 25);
//       object.rotation.set(Math.random() * Math.PI * 2, Math.random() * Math.PI * 2, Math.random() * Math.PI * 2);
//       object.scale.set(Math.random() * 2 + 1, Math.random() * 2 + 1, Math.random() * 2 + 1);
//       object.castShadow = true;
//       object.receiveShadow = true;
//       scene.add(object);
//     }

//     const selectionBox = new SelectionBox(camera, scene);
//     selectionBoxRef.current = selectionBox;
//     const helper = new SelectionHelper(renderer, 'selectBox');
//     helperRef.current = helper;
//     // helper.enabled = false;

//     const animate = () => {
//       requestAnimationFrame(animate);
//       controls.update();
//       renderer.render(scene, camera);
//       stats.update();
//     };
//     animate();

//     const onWindowResize = () => {
//       camera.aspect = window.innerWidth / window.innerHeight;
//       camera.updateProjectionMatrix();
//       renderer.setSize(window.innerWidth, window.innerHeight);
//     };
//     window.addEventListener('resize', onWindowResize);

//     const onPointerDown = (event) => {
//       if (event.shiftKey) {
//         isSelectingRef.current = true;
//         controls.enabled = false;
//         // helper.enabled = true;

//         for (const item of selectionBox.collection) {
//           item.material.emissive.set(0x000000);
//         }

//         selectionBox.startPoint.set(
//           (event.clientX / window.innerWidth) * 2 - 1,
//           -(event.clientY / window.innerHeight) * 2 + 1,
//           0.5
//         );
//       } else {
//         isSelectingRef.current = false;
//         controls.enabled = true;
//         // helper.enabled = false;
//       }
//     };

//     const onPointerMove = (event) => {
//       if (!isSelectingRef.current) return;

//       for (const item of selectionBox.collection) {
//         item.material.emissive.set(0x000000);
//       }

//       // selectionBox.endPoint.set(
//       //   (event.clientX / window.innerWidth) * 2 - 1,
//       //   -(event.clientY / window.innerHeight) * 2 + 1,
//       //   0.5
//       // );

//       // const allSelected = selectionBox.select();
//       // for (const item of allSelected) {
//       //   item.material.emissive.set(0xffffff);
//       // }
//     };

//     const onPointerUp = (event) => {
//       if (!isSelectingRef.current) return;

//       isSelectingRef.current = false;
//       controls.enabled = true;
//       // helper.enabled = false;

//       selectionBox.endPoint.set(
//         (event.clientX / window.innerWidth) * 2 - 1,
//         -(event.clientY / window.innerHeight) * 2 + 1,
//         0.5
//       );

//       // const allSelected = selectionBox.select();
//       // for (const item of allSelected) {
//       //   item.material.emissive.set(0xffffff);
//       // }

//       // setSelectedCount(allSelected.length);
//     };

//     document.addEventListener('pointerdown', onPointerDown);
//     document.addEventListener('pointermove', onPointerMove);
//     document.addEventListener('pointerup', onPointerUp);

//     return () => {
//       window.removeEventListener('resize', onWindowResize);
//       document.removeEventListener('pointerdown', onPointerDown);
//       document.removeEventListener('pointermove', onPointerMove);
//       document.removeEventListener('pointerup', onPointerUp);
//       stats.dom.remove();
//       renderer.dispose();
//       scene.clear();
//       containerRef.current.removeChild(renderer.domElement);
//     };
//   }, []);

//   return (
//     <>
//       <div ref={containerRef} style={{ width: '50vw', height: '50vh', marginTop: "100px", paddingTop: "100px" }} />
//       <div
//         style={{
//           position: 'absolute',
//           top: 10,
//           left: 10,
//           color: '#000',
//           fontWeight: 'bold',
//           userSelect: 'none',
//           backgroundColor: '#fff',
//           padding: '5px 10px',
//           borderRadius: 4,
//           opacity: 0.8,
//         }}
//       >
//         Selected boxes: {selectedCount}
//       </div>
//       <style>{`
//         .selectBox {
//           border: 1px solid #55aaff;
//           background-color: rgba(75, 160, 255, 0.3);
//           position: fixed;
//           pointer-events: none;
//         }
//       `}</style>
//     </>
//   );
// }
