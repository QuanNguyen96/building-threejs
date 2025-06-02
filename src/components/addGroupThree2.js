// import React, { useEffect, useRef, useState } from "react";
// import * as THREE from "three";

// export default function GroupMeshesExample() {
//   const mountRef = useRef();
//   const sceneRef = useRef();
//   const cameraRef = useRef();
//   const rendererRef = useRef();
//   const groupRef = useRef(null);
//   const meshRefs = useRef([]);

//   useEffect(() => {
//     // 1. Setup scene, camera, renderer
//     const scene = new THREE.Scene();
//     scene.background = new THREE.Color(0x222222);
//     sceneRef.current = scene;

//     const camera = new THREE.PerspectiveCamera(
//       75,
//       window.innerWidth / window.innerHeight,
//       0.1,
//       1000
//     );
//     camera.position.set(0, 5, 10);
//     cameraRef.current = camera;

//     const renderer = new THREE.WebGLRenderer({ antialias: true });
//     renderer.setSize(window.innerWidth, window.innerHeight);
//     rendererRef.current = renderer;
//     mountRef.current.appendChild(renderer.domElement);

//     // 2. Tạo 3 mesh riêng, add trực tiếp vào scene
//     const geometry = new THREE.BoxGeometry(1, 1, 1);
//     const material1 = new THREE.MeshStandardMaterial({ color: 0xff0000 });
//     const material2 = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
//     const material3 = new THREE.MeshStandardMaterial({ color: 0x0000ff });

//     const mesh1 = new THREE.Mesh(geometry, material1);
//     mesh1.position.set(-2, 0, 0);
//     const mesh2 = new THREE.Mesh(geometry, material2);
//     mesh2.position.set(0, 0, 0);
//     const mesh3 = new THREE.Mesh(geometry, material3);
//     mesh3.position.set(2, 0, 0);

//     scene.add(mesh1);
//     scene.add(mesh2);
//     scene.add(mesh3);

//     meshRefs.current = [mesh1, mesh2, mesh3];

//     // 3. Ánh sáng
//     const light = new THREE.DirectionalLight(0xffffff, 1);
//     light.position.set(5, 10, 7);
//     scene.add(light);
//     scene.add(new THREE.AmbientLight(0xffffff, 0.3));

//     // 4. Tạo group trống (chưa add vào scene)
//     groupRef.current = new THREE.Group();

//     // 5. Render loop
//     const animate = () => {
//       requestAnimationFrame(animate);
//       renderer.render(scene, camera);
//     };
//     animate();

//     // 6. Clean up
//     return () => {
//       mountRef.current.removeChild(renderer.domElement);
//     };
//   }, []);

//   // Hàm nhóm mesh vào group
//   const handleGroup = () => {
//     const scene = sceneRef.current;
//     const group = groupRef.current;
//     if (!group) return;

//     // Nếu group chưa add vào scene, add nó
//     if (!scene.children.includes(group)) {
//       scene.add(group);
//     }

//     // Add các mesh vào group (sẽ tự động remove khỏi scene)
//     meshRefs.current.forEach((mesh) => {
//       if (mesh.parent !== group) {
//         group.add(mesh);
//       }
//     });
//   };

//   // Hàm tách group ra, add mesh lại scene trực tiếp
//   const handleUngroup = () => {
//     const scene = sceneRef.current;
//     const group = groupRef.current;
//     if (!group) return;

//     // Lấy các mesh con group ra
//     [...group.children].forEach((mesh) => {
//       scene.add(mesh);
//     });

//     // Xóa group khỏi scene
//     scene.remove(group);
//   };

//   // Hàm di chuyển group (demo di chuyển đơn giản qua nút bấm)
//   const handleMoveGroup = () => {
//     const group = groupRef.current;
//     if (!group) return;
//     group.position.x += 100;
//     group.position.y += 100;
//     group.position.z += 100;
//     console.log("group",group)
//   };

//   return (
//     <div>
//       <div style={{ position: "fixed", top: 10, left: 10, zIndex: 10 }}>
//         <button onClick={handleGroup}>Group meshes</button>
//         <button onClick={handleUngroup}>Ungroup meshes</button>
//         <button onClick={handleMoveGroup}>Move group +1 on X</button>
//       </div>
//       <div className="mt-[100px]" ref={mountRef} style={{ width: "100vw", height: "100vh" }} />
//     </div>
//   );
// }

import _ from "lodash";
import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
// import { SelectionHelper } from "three/examples/jsm/interactive/SelectionHelper.js";
import SelectionHelper from "../utils/SelectionHelperOffset.js";
import { SelectionBox } from "three/examples/jsm/interactive/SelectionBox.js";
import {
  Dialog,
  Switch,
  FormControlLabel,
  Modal,
  Box,
  Button,
  Typography,
  TransitionProps,
  Slide,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from "@mui/material";
import "../styles/floorplanViewer.css";
import { GUI } from "three/examples/jsm/libs/lil-gui.module.min.js";


// import { TransformControls } from "three/examples/jsm/controls/TransformControls";

const SelectionScene = () => {
  const interactableMeshes = useRef([]);
  const containerRef = useRef();
  const [mode, setMode] = useState("select");
  const modeRef = useRef();

  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);
  const selectedObjectRef = useRef(null);
  const sceneRef = useRef();
  const cameraRef = useRef();
  const rendererRef = useRef();
  const transformControlRef = useRef();
  const controlsRef = useRef();
  const groupRef = useRef(new THREE.Group());
  const meshesRef = useRef([]);
  const selectedMeshesRef = useRef([]);
  const [groupSelected, setGroupSelected] = useState([]);

  const isSelectingRef = useRef(false);
  const draggingTransformRef = useRef(false);
  const pointerDownOnBBoxRef = useRef(false);
  const shiftPressedRef = useRef(false);

  const dragStart = useRef(new THREE.Vector2());
  const dragEnd = useRef(new THREE.Vector2());

  // Div hiển thị vùng kéo chọn
  const selectionRectRef = useRef();
  const pointerStartRef = useRef(new THREE.Vector2());
  const groupStartRotationRef = useRef(0);

  const selectionRectRefT = useRef();
  const selectionHelperRefT = useRef();

  // Kiểm tra pointer có nằm trên bounding box group hay không
  function isPointerOnGroupBBox(event) {
    if (groupRef.current.children.length === 0) return false;

    const rect = rendererRef.current.domElement.getBoundingClientRect();

    // Lấy vị trí chuột normalized device coordinates
    const mouse = new THREE.Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1
    );

    // Tạo raycaster từ camera
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, cameraRef.current);

    // Tạo Box3 cho group
    const box = new THREE.Box3().setFromObject(groupRef.current);

    // Box3 không hỗ trợ intersectsRay trực tiếp, nên ta tạo 8 điểm góc và test khoảng cách
    // Cách đơn giản: tạo mesh box tạm với kích thước bounding box để raycast
    if (!groupRef.current.userData.bboxMesh) {
      const size = new THREE.Vector3();
      box.getSize(size);
      const center = new THREE.Vector3();
      box.getCenter(center);

      const geo = new THREE.BoxGeometry(size.x, size.y, size.z);
      const mat = new THREE.MeshBasicMaterial({ visible: false });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(center);
      groupRef.current.userData.bboxMesh = mesh;
      sceneRef.current.add(mesh);
    }

    const intersects = raycaster.intersectObject(
      groupRef.current.userData.bboxMesh
    );
    return intersects.length > 0;
  }

  useEffect(() => {
    // Setup scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.set(0, 20, 30);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    rendererRef.current = renderer;
    containerRef.current.appendChild(renderer.domElement);

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controlsRef.current = controls;

    // // Transform Controls
    // const transformControl = new TransformControls(camera, renderer.domElement);
    // transformControlRef.current = transformControl;

    // transformControl.addEventListener("dragging-changed", (event) => {
    //   controls.enabled = !event.value;
    //   draggingTransformRef.current = event.value;
    // });
    // scene.add(transformControl);

    // Group chứa các mesh đã chọn
    const group = groupRef.current;
    scene.add(group);

    // Tạo mesh ví dụ
    const boxGeo = new THREE.BoxGeometry(2, 2, 2);
    for (let i = 0; i < 30; i++) {
      const boxMat = new THREE.MeshStandardMaterial({ color: 0x0088ff });
      const mesh = new THREE.Mesh(boxGeo, boxMat);
      mesh.position.set(
        Math.random() * 50 - 25,
        Math.random() * 50 - 25,
        Math.random() * 50 - 25
      );
      mesh.userData.selectable = true;
      scene.add(mesh);
      meshesRef.current.push(mesh);
    }
    console.log("scene", scene);
    console.log("meshesRef", meshesRef);

    // Lights
    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(10, 20, 10);
    scene.add(light);
    scene.add(new THREE.AmbientLight(0xffffff, 0.3));

    // Tạo div vùng chọn (selection rect)
    const selectionRect = document.createElement("div");
    selectionRect.style.position = "absolute";
    selectionRect.style.border = "1px dashed blue";
    selectionRect.style.display = "none";
    selectionRect.style.pointerEvents = "none";
    containerRef.current.appendChild(selectionRect);
    selectionRectRef.current = selectionRect;

    const selectionBoxT = new SelectionBox(camera, scene);
    selectionRectRefT.current = selectionBoxT;
    const helperSelectionBoxT = new SelectionHelper(
      renderer,
      "selectBox-selected"
    );
    // helperSelectionBoxT.enabled = true;
    selectionHelperRefT.current = helperSelectionBoxT;

    // Xử lý phím Shift
    const onKeyDown = (e) => {
      console.log("on onKeyDown");
      if (e.key === "Shift") shiftPressedRef.current = true;
    };
    const onKeyUp = (e) => {
      if (e.key === "Shift") shiftPressedRef.current = false;

      // Khi thả shift, kết thúc transform drag nếu có
      if (draggingTransformRef.current) {
        draggingTransformRef.current = false;
        controls.enabled = true;
        // transformControl.detach();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);

    let isInteracting = false;
    const offset = new THREE.Vector3();
    const startMouse = new THREE.Vector2();
    const startRotation = new THREE.Euler();
    const startScale = new THREE.Vector3();
    const plane = new THREE.Plane();
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    function getPivotForObject(obj) {
      if (obj.userData.pivot) return obj.userData.pivot;

      const pivot = new THREE.Object3D();

      // Tính bounding box để lấy center làm pivot
      const box = new THREE.Box3().setFromObject(obj);
      const center = new THREE.Vector3();
      box.getCenter(center);
      pivot.position.copy(center);

      // Đảm bảo obj không phải là pivot (để tránh add vào chính nó)
      if (obj !== pivot) {
        // Lấy parent hiện tại của obj
        const parent = obj.parent;

        if (parent) {
          // Thay thế obj bằng pivot trong parent
          parent.add(pivot);
          parent.remove(obj);
        }

        // Đưa obj thành con của pivot
        pivot.add(obj);
      }

      obj.userData.pivot = pivot;

      return pivot;
    }

    // Pointer events
    const onPointerDown = (e) => {
      const mode = modeRef.current;
      console.log("onPointerDown");

      const rect = renderer.domElement.getBoundingClientRect();
      let selectionRectselected = selectionHelperRefT.current.element;
      console.log("selectionRectselected", selectionRectselected);
      const scrollLeft =
        window.pageXOffset || document.documentElement.scrollLeft;
      const scrollTop =
        window.pageYOffset || document.documentElement.scrollTop;
      let x = e.clientX + scrollLeft;
      let y = e.clientY + scrollTop;
      selectionRectselected.style.left = `${x}px !important`;
      selectionRectselected.style.top = `${y}px  !important`;
      //   selectionRectRefT.current.startPoint.set(x2, y2, 0.5);
      //   console.log("domRec", rect);
      //   //   const x = ((e.clientX - rect.left) / rect.width) * 2 - 1 + 120;
      //   // const y = -((e.clientY - rect.top) / rect.height) * 2 + 1 + 120;
      //   const scrollLeft =
      //     window.pageXOffset || document.documentElement.scrollLeft;
      //   const scrollTop =
      //     window.pageYOffset || document.documentElement.scrollTop;
      //   console.log(`scrollLeft=${scrollLeft} scrollTop=${scrollTop} `);
      //   let x = e.clientX + scrollLeft;
      //   let y = e.clientY + scrollTop;

      //   selectionHelperRefT.current.enabled = true;
      //   //   selectionHelperRefT.current.element.style.left = `${100}px`;
      //   //   selectionHelperRefT.current.element.style.top = `${100}px`;
      //   selectionHelperRefT.current.element.style.display = `block`;
      //   console.log(`x=${x} y=${y} z=0.5`);
      //   selectionRectRefT.current.endPoint.set(x, y, 0.5);
      //   const ndc = new THREE.Vector3(x, y, 0.5); // NDC: z = giữa near và far
      //   ndc.unproject(camera); // Chuyển sang world
      //   console.log("ndc=", ndc);
      //   selectionRectRefT.current.startPoint.set(ndc);
      //   // B4: Tạo box tại vị trí point
      //   // Giả sử bạn đã có scene (hoặc group muốn add vào), và THREE đã import
      //   const boxGeometry = new THREE.BoxGeometry(2, 2, 2); // kích thước box 1x1x1
      //   const boxMaterial = new THREE.MeshStandardMaterial({ color: "yellow" });
      //   const boxMesh = new THREE.Mesh(boxGeometry, boxMaterial);
      //   // Đặt vị trí box tại điểm đã unproject (chính là vị trí trong world)
      //   boxMesh.position.copy(ndc);
      //   console.log("ndcndc", ndc);
      //   console.log("ndcndcboxMesh", boxMesh);

      //   // Thêm box vào scene hoặc group
      //   scene.add(boxMesh);

      if (shiftPressedRef.current) {
        console.log("vao day roi ");
        if (mode === "select") {
          // Bắt đầu quét chọn vùng
          isSelectingRef.current = true;
          dragStart.current.set(e.clientX, e.clientY);

          controls.enabled = false;
          // transformControl.detach();
          console.log("dang quét tron vung");
          //   Lấy scroll của cửa sổ (window)
          const scrollLeft =
            window.pageXOffset || document.documentElement.scrollLeft;
          const scrollTop =
            window.pageYOffset || document.documentElement.scrollTop;
          console.log(`scrollLeft=${scrollLeft} scrollTop=${scrollTop} `);
          let x = e.clientX + scrollLeft;
          let y = e.clientY + scrollTop;

          Object.assign(selectionRect.style, {
            left: x + "px",
            top: y + "px",
            width: 0 + "px",
            height: 0 + "px",
          });
          selectionHelperRefT.current.element.style.borderColor = `green`;
          // const x2 =
          //   ((e.clientX + scrollLeft - rect.left) / rect.width) * 2 - 1;
          // const y2 =
          //   -((e.clientY + scrollTop - rect.top) / rect.height) * 2 + 1;
          // console.log("selectionHelperRefT.current", selectionHelperRefT);
          // let selectionRectselected = selectionHelperRefT.current.element;
          // console.log("selectionRectselected", selectionRectselected);
          // selectionRectselected.style.left = `${x}px !important`;
          // selectionRectselected.style.top = `${y}px  !important`;
          selectionRectRefT.current.startPoint.set(x, y, 0.5);
          console.log("selectionRectRefT", _.cloneDeep(selectionHelperRefT));
        } else if (
          (mode === "translate" || mode === "rotate" || mode === "scale") &&
          selectedMeshesRef.current.length > 0
        ) {
          // Ở các mode transform, khi giữ shift + kéo trên bounding box thì attach transform cho group
          // if (isPointerOnGroupBBox(e)) {
          if (true) {
            // transformControl.attach(groupRef.current);
            // transformControl.setMode(mode);
            draggingTransformRef.current = true;
            controls.enabled = false;
            pointerDownOnBBoxRef.current = true;
          }
        }
      } else {
        console.log("zo dy mode=", mode);
        console.log("modeRef.current", modeRef.current);

        // Không giữ shift
        if (mode !== "select") {
          console.log("hì");
          isInteracting = false;

          const rect = renderer.domElement.getBoundingClientRect();
          mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
          mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
          console.log("mouse", mouse);

          raycaster.setFromCamera(mouse, camera);
          console.log("scene", scene);

          const intersects = raycaster.intersectObjects(scene.children, true);
          console.log("tim thay roi nhe", intersects);
          if (intersects.length > 0) {
            let pickedMesh;
            if (
              intersects[0].object.userData &&
              intersects[0].object.userData.targetGroup &&
              intersects[0].object.userData.targetGroup.type == "Group"
            ) {
              console.log("vao day roi ma");
              pickedMesh = intersects[0].object.userData.targetGroup;
            } else {
              pickedMesh = intersects[0].object;
            }
            selectedObjectRef.current = pickedMesh;
            setGroupSelected(pickedMesh);
            console.log("pickedMesh sdfsdfdsf= ", selectedObjectRef);
            isInteracting = true;
            controls.enabled = false;

            if (modeRef.current === "translate") {
              const pivot = pickedMesh.userData.pivot || pickedMesh;
              const worldPoint = new THREE.Vector3();
              pivot.getWorldPosition(worldPoint);

              const normal = new THREE.Vector3();
              camera.getWorldDirection(normal);
              plane.setFromNormalAndCoplanarPoint(normal, worldPoint);

              const intersection = new THREE.Vector3();
              if (raycaster.ray.intersectPlane(plane, intersection)) {
                offset.copy(intersection).sub(worldPoint);
              } else {
                offset.set(0, 0, 0);
              }
            } else if (modeRef.current === "rotate") {
              // startMouse.set(e.clientX, e.clientY);
              // startRotation.copy(pickedMesh.rotation);
              // startMouse.set(e.clientX, e.clientY);
              const pivot = pickedMesh.userData.pivot || pickedMesh;
              // startRotation.copy(pivot.rotation);
              pointerStartRef.current.set(e.clientX, e.clientY);
              groupStartRotationRef.current = pivot.rotation.y;
            } else if (modeRef.current === "scale") {
              startMouse.set(e.clientX, e.clientY);
              startScale.copy(pickedMesh.scale);
            }
          } else {
            // selectedObjectRef.current = null;
          }
          // // Click vùng trống clear selection
          // if (!isPointerOnGroupBBox(e)) {
          //   transformControl.detach();
          //   controls.enabled = true;
          //   pointerDownOnBBoxRef.current = false;
          //   draggingTransformRef.current = false;

          //   groupRef.current.clear();
          //   selectedMeshesRef.current = [];
          //   // Xóa mesh bbox mesh ẩn nếu có
          //   if (groupRef.current.userData.bboxMesh) {
          //     scene.remove(groupRef.current.userData.bboxMesh);
          //     groupRef.current.userData.bboxMesh.geometry.dispose();
          //     groupRef.current.userData.bboxMesh.material.dispose();
          //     delete groupRef.current.userData.bboxMesh;
          //   }
          // }
        }
      }
    };

    const onPointerMove = (e) => {
      const rect = renderer.domElement.getBoundingClientRect();
      //   const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      //   const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      //   // selectionRectRefT.current.endPoint.set(x, y, 0.5);
      //   const ndc = new THREE.Vector3(x, y, 0.5); // NDC: z = giữa near và far
      //   ndc.unproject(camera); // Chuyển sang world
      //   //   selectionRectRefT.current.endPoint.set(ndc);
      if (mode === "select" && isSelectingRef.current) {
        dragEnd.current.set(e.clientX, e.clientY);
        const scrollLeft =
          window.pageXOffset || document.documentElement.scrollLeft;
        const scrollTop =
          window.pageYOffset || document.documentElement.scrollTop;
        console.log(`scrollLeft=${scrollLeft} scrollTop=${scrollTop} `);

        const x = Math.min(dragStart.current.x, dragEnd.current.x) + scrollLeft;
        const y = Math.min(dragStart.current.y, dragEnd.current.y) + scrollTop;
        const width = Math.abs(dragStart.current.x - dragEnd.current.x);
        const height = Math.abs(dragStart.current.y - dragEnd.current.y);

        Object.assign(selectionRect.style, {
          left: x + "px",
          top: y + "px",
          width: width + "px",
          height: height + "px",
        });
        // // selectionRectRefT.current.endPoint.set(x, y, 0.5);
        // const ndc = new THREE.Vector3(x, y, 0.5); // NDC: z = giữa near và far
        // ndc.unproject(camera); // Chuyển sang world
        //   selectionRectRefT.current.endPoint.set(ndc);
        // selectionRectRefT.current.endPoint.set(x, y, 0.5);
        // selectionHelperRefT.current.element.style.left = `${x}px !important`;
        // selectionHelperRefT.current.element.style.top = `${y}px  !important`;
        // selectionRectRefT.current.startPoint.set(x2, y2, 0.5);
        console.log("mousemove.msdfdkjs");
      } else {
        if (!isInteracting || !selectedObjectRef.current) return;
        const rect = renderer.domElement.getBoundingClientRect();
        mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

        const obj = selectedObjectRef.current;

        if (modeRef.current === "translate") {
          // raycaster.setFromCamera(mouse, camera);
          // const intersection = new THREE.Vector3();
          // if (raycaster.ray.intersectPlane(plane, intersection)) {
          //   const newWorldPos = intersection.sub(offset);
          //   if (obj.parent) {
          //     obj.position.copy(obj.parent.worldToLocal(newWorldPos.clone()));
          //   } else {
          //     obj.position.copy(newWorldPos);
          //   }
          // }
          raycaster.setFromCamera(mouse, camera);
          const intersection = new THREE.Vector3();
          if (raycaster.ray.intersectPlane(plane, intersection)) {
            const pivot = obj.userData.pivot || obj;
            const newPos = intersection.clone().sub(offset);
            if (pivot.parent) {
              pivot.position.copy(pivot.parent.worldToLocal(newPos));
            } else {
              pivot.position.copy(newPos);
            }
          }
        } else if (modeRef.current === "rotate") {
          console.log("mouse move rotate");
          // const deltaX = e.clientX - startMouse.x;
          // const deltaY = e.clientY - startMouse.y;
          // obj.rotation.y = startRotation.y + deltaX * 0.01;
          // obj.rotation.x = startRotation.x + deltaY * 0.01;
          // // if (onlyMoveOnOXZRef && onlyMoveOnOXZRef.current) {
          // //   obj.rotation.set(startRotation.x, startRotation.y + deltaX * 0.01, startRotation.z);
          // // } else {
          // obj.rotation.y = startRotation.y + deltaX * 0.01;
          // obj.rotation.x = startRotation.x + deltaY * 0.01;
          // // }
          const pivot = obj.userData.pivot || obj;

          // const deltaX = e.clientX - startMouse.x;
          // const deltaY = e.clientY - startMouse.y;

          // const rotateSpeed = 0.01;
          // const limitX = Math.PI / 2 - 0.1;

          // let newRotX = startRotation.x + deltaY * rotateSpeed;
          // newRotX = Math.min(limitX, Math.max(-limitX, newRotX));

          // pivot.rotation.x = newRotX;
          // pivot.rotation.y = startRotation.y + deltaX * rotateSpeed;

          //  e.preventDefault();
          // const pivot = obj.userData.pivot || obj;

          console.log("objMoveMove", obj);

          const deltaX = e.clientX - pointerStartRef.current.x;

          // Adjust rotation speed as needed
          const rotationSpeed = 0.005;

          obj.rotation.y =
            groupStartRotationRef.current + deltaX * rotationSpeed;

          // Update bounding box helper to reflect new rotation
          // bboxHelper.update();
        } else if (modeRef.current === "scale") {
          // console.log("mouse move scale")
          // const delta = e.clientY - startMouse.y;
          // const newScale = Math.max(0.1, startScale.x + delta * 0.01);
          // obj.scale.set(newScale, newScale, newScale);

          const pivot =
            selectedObjectRef.current.userData.pivot ||
            selectedObjectRef.current;
          const delta = e.clientY - startMouse.y;
          const scaleFactor = Math.max(0.1, startScale.x + delta * 0.01); // scale không nhỏ hơn 0.1
          pivot.scale.set(scaleFactor, scaleFactor, scaleFactor);
        }
      }
    };

    const onPointerUp = (e) => {
      if (mode === "select" && isSelectingRef.current) {
        isSelectingRef.current = false;
        // selectionRect.style.display = "none";
        controls.enabled = true;

        const rect = renderer.domElement.getBoundingClientRect();

        // Chuyển tọa độ pixel sang normalized device coords (-1..1)
        const x1 = ((dragStart.current.x - rect.left) / rect.width) * 2 - 1;
        const y1 = -((dragStart.current.y - rect.top) / rect.height) * 2 + 1;
        const x2 = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        const y2 = -((e.clientY - rect.top) / rect.height) * 2 + 1;

        const minX = Math.min(x1, x2);
        const maxX = Math.max(x1, x2);
        const minY = Math.min(y1, y2);
        const maxY = Math.max(y1, y2);

        let selected = [];
        meshesRef.current.forEach((mesh) => {
          const pos = mesh.position.clone();
          pos.project(cameraRef.current);
          if (
            pos.x >= minX &&
            pos.x <= maxX &&
            pos.y >= minY &&
            pos.y <= maxY
          ) {
            selected.push(mesh);
          }
        });
        // //   const rect = renderer.domElement.getBoundingClientRect();
        // const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        // const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        // selectionRectRefT.current.endPoint.set(x, y, 0.5);
        // selected = selectionRectRefT.current.select();
        // console.log("selectionRectRefT.current.select", selectionRectRefT);
        // console.log("DA TIM THAY SO MESH ROI NHE", selected);
        // Clear group cũ và add mesh mới
        groupRef.current.clear();
        selected.forEach((mesh) => {
          groupRef.current.add(mesh);
        });
        selectedMeshesRef.current = selected;

        console.log("scene", scene);
        console.log("meshesRef", meshesRef);

        // Xóa bbox mesh cũ nếu có để update bbox mới
        if (groupRef.current.userData.bboxMesh) {
          scene.remove(groupRef.current.userData.bboxMesh);
          groupRef.current.userData.bboxMesh.geometry.dispose();
          groupRef.current.userData.bboxMesh.material.dispose();
          delete groupRef.current.userData.bboxMesh;
        }

        console.log("groupRef.current", groupRef.current);
        // Tạo lại bounding box mesh
        if (selected.length > 0) {
          const box = new THREE.Box3().setFromObject(groupRef.current);
          const size = new THREE.Vector3();
          box.getSize(size);
          const center = new THREE.Vector3();
          box.getCenter(center);

          const geo = new THREE.BoxGeometry(size.x, size.y, size.z);
          const mat = new THREE.MeshBasicMaterial({
            color: 0xffff00,
            wireframe: true,
          });
          const bboxMesh = new THREE.Mesh(geo, mat);
          bboxMesh.position.copy(center);
          bboxMesh.userData.isBBox = true;
          const targetGroup = groupRef.current;
          bboxMesh.userData.targetGroup = groupRef.current;
          setGroupSelected(bboxMesh);
          groupRef.current.userData.bboxMesh = bboxMesh;
          scene.add(bboxMesh);

          // --- THÊM ĐOẠN NÀY: TẠO PIVOT ---
          const pivot = new THREE.Object3D();
          pivot.position.copy(center); // tâm group
          scene.add(pivot);
          pivot.add(groupRef.current);
          groupRef.current.position.sub(center); // giữ nguyên vị trí tương đối

          // Gán pivot vào userData
          groupRef.current.userData.pivot = pivot;
          bboxMesh.userData.pivot = pivot; // để bắt sau này
        }
        console.log("scene22", scene);
      } else {
        if (isInteracting) {
          isInteracting = false;
          // selectedObjectRef.current = null;  // BỎ DÒNG NÀY đi
          controls.enabled = true;
        }
      }

      if (draggingTransformRef.current) {
        draggingTransformRef.current = false;
        pointerDownOnBBoxRef.current = false;
        // transformControl.detach();
        controls.enabled = true;
      }
    };

    renderer.domElement.addEventListener("pointerdown", onPointerDown);
    renderer.domElement.addEventListener("pointermove", onPointerMove);
    renderer.domElement.addEventListener("pointerup", onPointerUp);

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);
      controls.update();

      // Cập nhật bounding box vị trí theo group
      if (groupRef.current.userData.bboxMesh) {
        const box = new THREE.Box3().setFromObject(groupRef.current);
        const size = new THREE.Vector3();
        box.getSize(size);
        const center = new THREE.Vector3();
        box.getCenter(center);

        const bboxMesh = groupRef.current.userData.bboxMesh;
        bboxMesh.position.copy(center);
        bboxMesh.scale.set(
          size.x / bboxMesh.geometry.parameters.width,
          size.y / bboxMesh.geometry.parameters.height,
          size.z / bboxMesh.geometry.parameters.depth
        );
      }

      renderer.render(scene, camera);
    };
    animate();

    // Cleanup
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);

      renderer.domElement.removeEventListener("pointerdown", onPointerDown);
      renderer.domElement.removeEventListener("pointermove", onPointerMove);
      renderer.domElement.removeEventListener("pointerup", onPointerUp);

      renderer.dispose();
      containerRef.current.removeChild(renderer.domElement);
    };
  }, []);
  useEffect(() => {
    console.log("watch groupSelected", groupSelected);
  }, [groupSelected]);
  // Cập nhật transform control khi đổi mode
  useEffect(() => {
    const transformControl = transformControlRef.current;
    if (!transformControl) return;

    if (mode === "select") {
      transformControl.detach();
      controlsRef.current.enabled = true;
    } else {
      if (selectedMeshesRef.current.length > 0) {
        transformControl.attach(groupRef.current);
        transformControl.setMode(mode);
        controlsRef.current.enabled = false;
      } else {
        transformControl.detach();
        controlsRef.current.enabled = true;
      }
    }
  }, [mode]);

  return (
    <>
      <div
        style={{
          position: "absolute",
          zIndex: 10,
          color: "#fff",
          userSelect: "none",
          padding: 8,
        }}
      >
        <button onClick={() => setMode("select")}>Select</button>
        <button onClick={() => setMode("translate")}>Translate</button>
        <button onClick={() => setMode("rotate")}>Rotate</button>
        <button onClick={() => setMode("scale")}>Scale</button>
        <div>Current mode: {mode}</div>
        <div style={{ fontSize: 12, marginTop: 8, maxWidth: 300 }}>
          Giữ SHIFT + kéo chuột để:
          <ul>
            <li>
              <b>Select:</b> quét chọn mesh và tạo bounding box nhóm
            </li>
            <li>
              <b>Translate/Rotate/Scale:</b> thao tác transform cả nhóm nếu kéo
              trên bounding box
            </li>
          </ul>
          Click vùng trống không giữ shift sẽ clear selection.
        </div>
      </div>
      {/* <div ref={containerRef} style={{ width: "100vw", height: "100vh" }} /> */}
       {/* <div ref={containerRef} style={{ width: "100%", height: "100%" }} /> */}

      <div
        style={{
          position: "relative",
          width: "100vw",
          height: "100vh",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 10,
            left: 10,
            display: "flex",
            alignItems: "center",
            gap: "10px",
            zIndex: 10,
          }}
        >
          <input
            className="hidden"
            type="file"
            accept=".glb,.zip"
          />
          <button
            style={{
              padding: "8px 12px",
              border: "1px solid #ccc",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            + Import Model (file glb)
          </button>
          {/* <button
               onClick={() => loadAddModel()}
               style={{
                 padding: "8px 12px",
                 border: "1px solid #ccc",
                 borderRadius: "4px",
                 cursor: "pointer",
               }}
             >
               + Add model (file glb)
             </button> */}
          <button
            style={{
              padding: "8px 12px",
              backgroundColor: "#ffa500",
              border: "1px solid #ccc",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            🟧 Kéo (Drag)
          </button>
          <button
            style={{
              padding: "8px 12px",
              backgroundColor: "#ffa500",
              border: "1px solid #ccc",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            🔄 Xoay (Rotate)
          </button>
          <button
            style={{
              padding: "8px 12px",
              backgroundColor: "#ffa500",
              border: "1px solid #ccc",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            🔍 Scale
          </button>
          <button
            style={{
              padding: "8px 12px",
              backgroundColor: "#ff4d4f",
              color: "#fff",
              border: "1px solid #ccc",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            🗑 Xóa
          </button>
          <div className="border h-full h-[40px] flex items-center p-2">
            <FormControlLabel
              control={
                <Switch
                />
              }
              label="OXZ:"
              labelPlacement="start"
            />
          </div>
          <div className="h-full h-[40px] flex items-center p-2">
            <Button
              size="small"
              variant="contained"
            >
              SET Y = 0
            </Button>
          </div>
          <div className="h-full h-[40px] flex items-center p-2">
            <FormControlLabel
              control={
                <Switch
                />
              }
              label="UseGroup:"
              labelPlacement="start"
            />
          </div>
        </div>
        <div className="absolute top-[60px] left-[15px]">
          <div className="flex items-center">
            Scene Background Color:
            <input
              className="ip-scene-background"
              type="text"
              style={{ width: "80px", padding: "2px 5px" }}
            />
            <div
              className="border border-solid border-black-200 ml-[8px]"
              style={{
                width: "26px",
                height: "26px",
                background: 'red',
              }}
            ></div>
          </div>
        </div>

        <div className="absolute top-[90px] left-[15px] flex items-center">
          <div className="flex items-center">
            Wall Color:
            <input
              className="ip-scene-background"
              type="text"
              style={{ width: "80px", padding: "2px 5px" }}
            />
            <div
              className="border border-solid border-black-200 ml-[8px]"
              style={{
                width: "26px",
                height: "26px",
                background: 'red',
              }}
            ></div>
          </div>
          <div className="ml-4">
            <Button size="small" variant="contained">
              Smooth Wall
            </Button>
          </div>
        </div>

        <div className="absolute top-[120px] left-[15px]">
          <div className="flex items-center">
            Floor Color:
            <input
              className="ip-scene-background"
              type="text"
              style={{ width: "80px", padding: "2px 5px" }}
            />
            <div
              className="border border-solid border-black-200 ml-[8px]"
              style={{
                width: "26px",
                height: "26px",
                background: 'red',
              }}
            ></div>
          </div>
        </div>
        <div className="absolute top-[150px] left-[15px] formControlLabel-display-grid">
          <FormControlLabel
            control={
              <Switch
              />
            }
            label="Display Grid"
            labelPlacement="start"
          />
        </div>
        <div className="absolute top-[180px] left-[15px] formControlLabel-display-grid flex-items-center">
          <div>Camera</div>
          <div className="flex-items-center ml-2">
            X=
            <input
              type="number"
              className="border max-w-[80px]"
            />
          </div>
          <div className="flex-items-center ml-2">
            Y=
            <input
              type="number"
              className="border max-w-[80px]"
            />
          </div>
          <div className="flex-items-center ml-2">
            Z=
            <input
              type="number"
              className="border max-w-[80px]"
            />
          </div>
        </div>
        <div className="absolute top-[290px] left-[15px] formControlLabel-display-grid flex-items-center">
          Mouse 3D Position: 1,2,3
        </div>
        <div ref={containerRef} style={{ width: "100%", height: "100%" }} />
      </div>

    </>
  );
};

export default SelectionScene;
