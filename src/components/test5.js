import React, {
  useEffect,
  useRef,
  useState,
  forwardRef,
  useImperativeHandle,
} from "react";
import * as THREE from "three";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";

const Test2 = forwardRef((props, ref) => {
  const sceneRef = useRef();
  const mountRef = useRef(null);
  const modeRef = useRef("drag");
  const [modeUI, setModeUI] = useState("drag");
  const modelRef = useRef(null);
  const interactableMeshes = useRef([]);
  // Thêm ref lưu đối tượng đang được chọn thao tác
  const selectedObjectRef = useRef(null);

  useEffect(() => {
    const width = mountRef.current.clientWidth;
    const height = mountRef.current.clientHeight;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf0f0f0);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    camera.position.set(3, 3, 5);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    mountRef.current.appendChild(renderer.domElement);

    // Light
    scene.add(new THREE.AmbientLight(0xffffff, 0.5));
    const dirLight = new THREE.DirectionalLight(0xffffff, 1);
    dirLight.position.set(5, 10, 7);
    scene.add(dirLight);

    // Helpers
    const GridHelper1 = new THREE.GridHelper(10, 10)
    GridHelper1.material.transparent = true;
    GridHelper1.material.opacity = 0.2
    // GridHelper1.material.visible = false
    console.log("GridHelper1=",GridHelper1)
    scene.add(GridHelper1);
    const AxesHelper1 = new THREE.AxesHelper(3)
    AxesHelper1.material.transparent = true;
    AxesHelper1.material.opacity = 0.2
    // AxesHelper1.material.visible = false
    console.log("AxesHelper1=",AxesHelper1)
    scene.add(AxesHelper1);

    // Load GLB model
    const loader = new GLTFLoader();
    loader.load(
      "/models/source/简约餐桌.glb",
      (gltf) => {
        const model = gltf.scene;
        model.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = true;
            child.material.side = THREE.DoubleSide;
            interactableMeshes.current.push(child);
          }
        });

        model.scale.set(0.001, 0.001, 0.001);
        model.position.set(0, 0.5, 0);
        scene.add(model);
        // modelRef.current = model;
      },
      undefined,
      (error) => {
        console.error("Lỗi khi load GLB:", error);
      }
    );

    loader.load(
      "/models/source/low_poly_furnitures_full_bundle.glb",
      // "/models/source/scene.gltf",
      (gltf) => {
        const model = gltf.scene;
        model.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = true;
            child.material.side = THREE.DoubleSide;
            interactableMeshes.current.push(child);
          }
        });

        model.scale.set(1, 1, 1);
        model.position.set(0, 0.5, 0);
        scene.add(model);
        // modelRef.current = model;
      },
      undefined,
      (error) => {
        console.error("Lỗi khi load GLB:", error);
      }
    );

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;

    // Interaction variables
    let isInteracting = false;
    const offset = new THREE.Vector3();
    const startMouse = new THREE.Vector2();
    const startRotation = new THREE.Euler();
    const startScale = new THREE.Vector3();
    const plane = new THREE.Plane();
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    // function onMouseDown(event) {
    //   if (!modeRef.current || interactableMeshes.current.length === 0) return;

    //   const rect = renderer.domElement.getBoundingClientRect();
    //   mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    //   mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    //   raycaster.setFromCamera(mouse, camera);

    //   // Tìm mesh con được click, trả về đầu tiên tìm thấy
    //   const intersects = raycaster.intersectObjects(
    //     interactableMeshes.current,
    //     true
    //   );
    //   if (intersects.length > 0) {
    //     // Chỉ chọn mesh con đầu tiên được click
    //     const pickedMesh = intersects[0].object;
    //     selectedObjectRef.current = pickedMesh; // lưu lại mesh được chọn
    //     isInteracting = true;
    //     controls.enabled = false;

    //     if (modeRef.current === "drag") {
    //       // Plane đặt vuông góc camera, đi qua điểm pick
    //       plane.setFromNormalAndCoplanarPoint(
    //         camera.getWorldDirection(plane.normal),
    //         intersects[0].point
    //       );
    //       // Tính offset giữa điểm pick và vị trí object
    //       offset.copy(intersects[0].point).sub(pickedMesh.position);
    //     } else if (modeRef.current === "rotate") {
    //       startMouse.set(event.clientX, event.clientY);
    //       startRotation.copy(pickedMesh.rotation);
    //     } else if (modeRef.current === "scale") {
    //       startMouse.set(event.clientX, event.clientY);
    //       startScale.copy(pickedMesh.scale);
    //     }
    //   } else {
    //     // Click ra ngoài bỏ chọn object
    //     selectedObjectRef.current = null;
    //   }
    // }

    // function onMouseMove(event) {
    //   if (!isInteracting || !selectedObjectRef.current) return;

    //   const rect = renderer.domElement.getBoundingClientRect();
    //   mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    //   mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    //   const obj = selectedObjectRef.current;

    //   if (modeRef.current === "drag") {
    //     raycaster.setFromCamera(mouse, camera);
    //     const intersection = new THREE.Vector3();
    //     raycaster.ray.intersectPlane(plane, intersection);
    //     obj.position.copy(intersection.sub(offset));
    //   } else if (modeRef.current === "rotate") {
    //     const deltaX = event.clientX - startMouse.x;
    //     const deltaY = event.clientY - startMouse.y;
    //     obj.rotation.y = startRotation.y + deltaX * 0.01;
    //     obj.rotation.x = startRotation.x + deltaY * 0.01;
    //   } else if (modeRef.current === "scale") {
    //     const delta = event.clientY - startMouse.y;
    //     const newScale = Math.max(0.1, startScale.x + delta * 0.01);
    //     obj.scale.set(newScale, newScale, newScale);
    //   }
    // }

    function onMouseDown(event) {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);

      const intersects = raycaster.intersectObjects(
        interactableMeshes.current,
        true
      );

      if (intersects.length > 0) {
        const pickedMesh = intersects[0].object;
        selectedObjectRef.current = pickedMesh;

        console.log("dang chojn", pickedMesh);
        console.log("selectedObjectRef", selectedObjectRef);
        isInteracting = true;
        controls.enabled = false;

        if (modeRef.current === "drag") {
          const worldPoint = new THREE.Vector3();
          pickedMesh.getWorldPosition(worldPoint);

          plane.setFromNormalAndCoplanarPoint(
            camera.getWorldDirection(plane.normal),
            worldPoint
          );

          offset.copy(intersects[0].point).sub(worldPoint);
        } else if (modeRef.current === "rotate") {
          startMouse.set(event.clientX, event.clientY);
          startRotation.copy(pickedMesh.rotation);
        } else if (modeRef.current === "scale") {
          startMouse.set(event.clientX, event.clientY);
          startScale.copy(pickedMesh.scale);
        }
      } else {
        selectedObjectRef.current = null;
        console.log("vao day roi ha nenselectedObjectRef", selectedObjectRef);
      }
    }

    function onMouseMove(event) {
      if (!isInteracting || !selectedObjectRef.current) return;

      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      const obj = selectedObjectRef.current;

      if (modeRef.current === "drag") {
        raycaster.setFromCamera(mouse, camera);
        const intersection = new THREE.Vector3();
        if (raycaster.ray.intersectPlane(plane, intersection)) {
          const newWorldPos = intersection.sub(offset);
          if (obj.parent) {
            obj.position.copy(obj.parent.worldToLocal(newWorldPos.clone()));
          } else {
            obj.position.copy(newWorldPos);
          }
        }
      } else if (modeRef.current === "rotate") {
        const deltaX = event.clientX - startMouse.x;
        const deltaY = event.clientY - startMouse.y;
        obj.rotation.y = startRotation.y + deltaX * 0.01;
        obj.rotation.x = startRotation.x + deltaY * 0.01;
      } else if (modeRef.current === "scale") {
        const delta = event.clientY - startMouse.y;
        const newScale = Math.max(0.1, startScale.x + delta * 0.01);
        obj.scale.set(newScale, newScale, newScale);
      }
    }

    function onMouseUp() {
      if (isInteracting) {
        isInteracting = false;
        // selectedObjectRef.current = null;  // BỎ DÒNG NÀY đi
        controls.enabled = true;
      }
    }

    renderer.domElement.addEventListener("mousedown", onMouseDown);
    renderer.domElement.addEventListener("mousemove", onMouseMove);
    renderer.domElement.addEventListener("mouseup", onMouseUp);

    const handleResize = () => {
      const width = mountRef.current.clientWidth;
      const height = mountRef.current.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };

    window.addEventListener("resize", handleResize);

    const animate = () => {
      requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      renderer.domElement.removeEventListener("mousedown", onMouseDown);
      renderer.domElement.removeEventListener("mousemove", onMouseMove);
      renderer.domElement.removeEventListener("mouseup", onMouseUp);
      window.removeEventListener("resize", handleResize);
      mountRef.current.removeChild(renderer.domElement);
    };
  }, []);

  const handleModeChange = (newMode) => {
    modeRef.current = newMode;
    setModeUI(newMode);
  };
  const handleDeleteSelected = () => {
    console.log("handleDeleteSelected xoa obj");
    const obj = selectedObjectRef.current;
    console.log("obj", obj);
    if (obj) {
      if (obj.parent) {
        obj.parent.remove(obj); // Xóa khỏi scene
      }
      const index = interactableMeshes.current.indexOf(obj);
      if (index !== -1) {
        interactableMeshes.current.splice(index, 1); // Xóa khỏi danh sách tương tác
      }
      selectedObjectRef.current = null;
    }
  };
  useEffect(() => {
    console.log("wwatchselectedObjectRef", selectedObjectRef);
  }, [selectedObjectRef]);

  // expose hàm exportGLB cho App.js gọi
  useImperativeHandle(ref, () => ({
    exportGLB: () => {
      if (!sceneRef.current) {
        console.error("Scene chưa được tạo");
        return;
      }
      const exporter = new GLTFExporter();
      exporter.parse(
        sceneRef.current,
        (result) => {
          if (result instanceof ArrayBuffer) {
            saveArrayBuffer(result, "scene.glb");
          } else {
            const output = JSON.stringify(result, null, 2);
            saveString(output, "scene.gltf");
          }
        },

        { binary: true }
      );
    },
  }));
  function saveString(text, filename) {
    const blob = new Blob([text], { type: "text/plain" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
  }

  function saveArrayBuffer(buffer, filename) {
    const blob = new Blob([buffer], { type: "application/octet-stream" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
  }
  return (
    <div style={{ position: "relative", width: "100vw", height: "100vh" }}>
      <div ref={mountRef} style={{ width: "100%", height: "100%" }} />

      <div
        style={{
          position: "absolute",
          top: 10,
          left: 10,
          display: "flex",
          gap: "10px",
          zIndex: 10,
        }}
      >
        <button
          onClick={() => handleModeChange("drag")}
          style={{
            padding: "8px 12px",
            backgroundColor: modeUI === "drag" ? "#ffa500" : "#eee",
            border: "1px solid #ccc",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          🟧 Kéo (Drag)
        </button>
        <button
          onClick={() => handleModeChange("rotate")}
          style={{
            padding: "8px 12px",
            backgroundColor: modeUI === "rotate" ? "#9370db" : "#eee",
            border: "1px solid #ccc",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          🔄 Xoay (Rotate)
        </button>
        <button
          onClick={() => handleModeChange("scale")}
          style={{
            padding: "8px 12px",
            backgroundColor: modeUI === "scale" ? "#3cb371" : "#eee",
            border: "1px solid #ccc",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          🔍 Scale
        </button>
        <button
          onClick={handleDeleteSelected}
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
      </div>
    </div>
  );
});
export default Test2;
