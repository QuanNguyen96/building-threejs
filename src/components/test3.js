import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

export default function Test2() {
  const mountRef = useRef(null);
  const modeRef = useRef(null); // dùng ref thay vì state để không reset effect
  const [modeUI, setModeUI] = useState(null); // chỉ để hiện trạng thái lên nút

  useEffect(() => {
    const width = mountRef.current.clientWidth;
    const height = mountRef.current.clientHeight;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf0f0f0);

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
    scene.add(new THREE.GridHelper(10, 10));
    scene.add(new THREE.AxesHelper(3));

    // Cube
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshStandardMaterial({ color: 0x0077ff });
    const cube = new THREE.Mesh(geometry, material);
    cube.position.y = 0.5;
    scene.add(cube);

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;

    // Interaction variables
    let isInteracting = false;
    const offset = new THREE.Vector3();
    const startMouse = new THREE.Vector2();
    const startRotation = new THREE.Euler();
    const plane = new THREE.Plane();
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    function onMouseDown(event) {
      if (!modeRef.current) return;

      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObject(cube);

      if (intersects.length > 0) {
        isInteracting = true;
        controls.enabled = false;
        cube.material.color.set(0xff9900);

        if (modeRef.current === "drag") {
          plane.setFromNormalAndCoplanarPoint(
            camera.getWorldDirection(plane.normal),
            intersects[0].point
          );
          offset.copy(intersects[0].point).sub(cube.position);
        } else if (modeRef.current === "rotate") {
          startMouse.set(event.clientX, event.clientY);
          startRotation.copy(cube.rotation);
        }
      }
    }

    function onMouseMove(event) {
      if (!isInteracting) return;

      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      if (modeRef.current === "drag") {
        raycaster.setFromCamera(mouse, camera);
        const intersection = new THREE.Vector3();
        raycaster.ray.intersectPlane(plane, intersection);
        cube.position.copy(intersection.sub(offset));
      } else if (modeRef.current === "rotate") {
        const deltaX = event.clientX - startMouse.x;
        const deltaY = event.clientY - startMouse.y;
        cube.rotation.y = startRotation.y + deltaX * 0.01;
        cube.rotation.x = startRotation.x + deltaY * 0.01;
      }
    }

    function onMouseUp() {
      if (isInteracting) {
        isInteracting = false;
        controls.enabled = true;
        cube.material.color.set(0x0077ff);
      }
    }

    // Events
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

    // Render loop (❌ không tự xoay)
    const animate = () => {
      requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // Cleanup
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

  return (
    <div style={{ position: "relative", width: "100vw", height: "100vh" }}>
      {/* Three.js Canvas */}
      <div ref={mountRef} style={{ width: "100%", height: "100%" }} />

      {/* UI Mode Selector */}
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
      </div>
    </div>
  );
}
