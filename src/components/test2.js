import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three-stdlib";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
// import { RectAreaLightUniformsLib } from "three/examples/jsm/lights/RectAreaLightUniformsLib.js";
// import { RectAreaLightHelper } from "three/examples/jsm/helpers/RectAreaLightHelper.js";
// RectAreaLightUniformsLib.init();
function Test2() {
  const mountRef = useRef(null);
  const modeRef = useRef("drag");
  const [modeUI, setModeUI] = useState("drag");
  const modelRef = useRef(null);

  useEffect(() => {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#000");

    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.set(240, 20, 80);
    camera.lookAt(0, 1.5, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mountRef.current.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 1.5, 0);
    controls.update();
    controls.enableDamping = true;

    // GridHelper cho tổng diện tích-> lưoi nen
    const gridHelper = new THREE.GridHelper(240, 80, 0x888888, 0xcccccc);
    gridHelper.material.opacity = 0.1; // giảm xuống gần 0 để gần như trong suốt
    // gridHelper.visible = false;
    scene.add(gridHelper);

    const wallHeight = 5 * 10;
    // // Thông số đèn
    // const tubeLightLength = 10; // chiều dài đèn theo chiều tường (x)
    // const tubeLightHeight = 0.4; // chiều cao/thickness của đèn
    // const tubeLightWidth = 0.1; // chiều "sâu" đèn, dùng để dịch z ra khỏi tường

    // // Tạo đèn RectAreaLight
    // const tubeLight = new THREE.RectAreaLight(
    //   "#ffffff", // màu trắng
    //   50, // cường độ sáng
    //   tubeLightLength, // chiều dài
    //   tubeLightHeight // chiều cao
    // );

    // // Đặt vị trí đèn: trên cùng tường trước (z = -4, cao hơn 1 chút so với tường cao 3m)
    // tubeLight.position.set(5, wallHeight + 2, -4 + tubeLightWidth / 2);

    // // Quay đèn hướng vào phòng (tức là hướng về phía camera, tâm phòng)
    // tubeLight.rotation.y = Math.PI; // Quay 180 độ quanh trục Y để hướng ánh sáng về trong phòng

    // scene.add(tubeLight);

    // // Helper để hiển thị vị trí & hướng chiếu sáng của RectAreaLight
    // const helper = new RectAreaLightHelper(tubeLight);
    // tubeLight.add(helper);

    // Tạo 4 phòng sát nhau, mỗi phòng 10x8 (chiều dài x chiều sâu)
    const wallThickness = 2;
    const roomWidth = 60;
    const roomDepth = 40;
    const wallMaterial = new THREE.MeshStandardMaterial({ color: "#dbe5e6" });
    const floorMaterial = new THREE.MeshStandardMaterial({ color: "#f5f5dc" }); // nền nhà hơi vàng nhạt

    // Hàm tạo phòng với nền riêng
    function createRoom(centerX, centerZ) {
      // Nền phòng
      // const floorGeometry = new THREE.BoxGeometry(roomWidth, 1, roomDepth);
      const floorRoom = new THREE.MeshStandardMaterial({
        color: "#f5f5dc",
        transparent: true,
        opacity: 1,
      }); // nền nhà hơi vàng nhạt
      const floorGeometry = new THREE.BoxGeometry(roomWidth, 0.1, roomDepth);
      const floor = new THREE.Mesh(floorGeometry, floorRoom);
      // Đặt vị trí y bằng nửa chiều cao để đáy nằm ở y=0
      floor.position.set(centerX, 0.1 / 2, centerZ);
      floor.receiveShadow = true;
      scene.add(floor);

      // Lớp nền phụ nằm trên lớp nền chính (ví dụ dày 0.02, màu khác)
      const floorLayer2Material = new THREE.MeshStandardMaterial({
        color: "#ffffff", // màu vàng nhạt hoặc bạn muốn
        transparent: true,
        opacity: 1,
      });
      const floorLayer2Geometry = new THREE.BoxGeometry(
        roomWidth,
        0.02,
        roomDepth
      );
      const floorLayer2 = new THREE.Mesh(
        floorLayer2Geometry,
        floorLayer2Material
      );
      // Đặt lớp 2 nằm trên lớp 1 (ở y = 0.1 + 0.02/2 = 0.11)
      floorLayer2.position.set(centerX, 0.1 + 0.02 / 2, centerZ);
      floorLayer2.receiveShadow = true;
      scene.add(floorLayer2);

      scene.add(floor);

      // Tường phía trước (z - roomDepth/2)
      const wallFront = new THREE.Mesh(
        new THREE.BoxGeometry(roomWidth, wallHeight, wallThickness),
        wallMaterial
      );
      wallFront.position.set(centerX, wallHeight / 2, centerZ - roomDepth / 2);
      wallFront.castShadow = true;
      wallFront.receiveShadow = true;
      scene.add(wallFront);

      // Tường phía sau (z + roomDepth/2)
      const wallBack = new THREE.Mesh(
        new THREE.BoxGeometry(roomWidth, wallHeight, wallThickness),
        wallMaterial
      );
      wallBack.position.set(centerX, wallHeight / 2, centerZ + roomDepth / 2);
      wallBack.castShadow = true;
      wallBack.receiveShadow = true;
      scene.add(wallBack);

      // Tường bên trái (x - roomWidth/2)
      const wallLeft = new THREE.Mesh(
        new THREE.BoxGeometry(wallThickness, wallHeight, roomDepth),
        wallMaterial
      );
      wallLeft.position.set(centerX - roomWidth / 2, wallHeight / 2, centerZ);
      wallLeft.castShadow = true;
      wallLeft.receiveShadow = true;
      scene.add(wallLeft);

      // Tường bên phải (x + roomWidth/2)
      const wallRight = new THREE.Mesh(
        new THREE.BoxGeometry(wallThickness, wallHeight, roomDepth),
        wallMaterial
      );
      wallRight.position.set(centerX + roomWidth / 2, wallHeight / 2, centerZ);
      wallRight.castShadow = true;
      wallRight.receiveShadow = true;
      scene.add(wallRight);
    }

    /*
     * Để các phòng sát nhau:
     * Phòng 1: center tại (roomWidth/2, roomDepth/2) = (5,4)
     * Phòng 2: dịch sang bên phải đúng roomWidth => centerX = 5 + 10 = 15, centerZ = 4
     * Phòng 3: dịch xuống dưới đúng roomDepth => centerX = 5, centerZ = 4 + 8 = 12
     * Phòng 4: dịch phải và xuống dưới => (15, 12)
     */

    createRoom(roomWidth / 2, roomDepth / 2); // Phòng 1
    createRoom(roomWidth / 2 + roomWidth, roomDepth / 2); // Phòng 2 kế bên phải
    createRoom(roomWidth / 2, roomDepth / 2 + roomDepth); // Phòng 3 phía dưới
    createRoom(roomWidth / 2 + roomWidth, roomDepth / 2 + roomDepth); // Phòng 4 góc dưới phải

    // Ambient light nhẹ
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    // Tạo hình cầu để hiển thị vị trí của nguồn sáng
    const lightSphereGeometry = new THREE.SphereGeometry(2, 32, 32); // bán kính 2
    const lightSphereMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00 }); // màu vàng
    const lightSphere = new THREE.Mesh(lightSphereGeometry, lightSphereMaterial);

    // // Đặt hình cầu vào đúng vị trí của DirectionalLight
    lightSphere.position.set(150, 60, 120);
    lightSphere.visible = false
    scene.add(lightSphere);




    // Đèn DirectionalLight hỗ trợ đổ bóng
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(150, 60, 120);
    directionalLight.target.position.set(0, 0, 0);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 1024;
    directionalLight.shadow.mapSize.height = 1024;
    // directionalLight.shadow.camera.near = 1;
    // // directionalLight.shadow.camera.far = 5000;
    // // directionalLight.shadow.camera.left = -20;
    // // directionalLight.shadow.camera.right = 20;
    // // directionalLight.shadow.camera.top = 20;
    // // directionalLight.shadow.camera.bottom = -20;
    // directionalLight.shadow.camera.far = 5000;
    // directionalLight.shadow.camera.left = -50;
    // directionalLight.shadow.camera.right = 50;
    // directionalLight.shadow.camera.top = 50;
    // directionalLight.shadow.camera.bottom = -50;


    // --- Tính bounding box tổng thể scene ---
    const sceneBoundingBox = new THREE.Box3().setFromObject(scene);
    console.log("sceneBoundingBox", sceneBoundingBox)

    // Tạo helper để hiển thị hộp bao
    const boxHelper = new THREE.Box3Helper(sceneBoundingBox, 0x00ff00);
    scene.add(boxHelper);

    // 1. Lấy bounding box tổng thể scene
    const box = new THREE.Box3().setFromObject(scene);

    // 2. Lấy 8 điểm bounding box
    const points = [
      new THREE.Vector3(box.min.x, box.min.y, box.min.z),
      new THREE.Vector3(box.min.x, box.min.y, box.max.z),
      new THREE.Vector3(box.min.x, box.max.y, box.min.z),
      new THREE.Vector3(box.min.x, box.max.y, box.max.z),
      new THREE.Vector3(box.max.x, box.min.y, box.min.z),
      new THREE.Vector3(box.max.x, box.min.y, box.max.z),
      new THREE.Vector3(box.max.x, box.max.y, box.min.z),
      new THREE.Vector3(box.max.x, box.max.y, box.max.z),
    ];

    // 3. Biến đổi điểm bounding box sang hệ tọa độ ánh sáng
    const lightMatrix = directionalLight.shadow.camera.matrixWorldInverse.clone();
    for (let i = 0; i < points.length; i++) {
      points[i].applyMatrix4(lightMatrix);
    }

    // 4. Tính bounding box mới trong hệ ánh sáng
    const lightSpaceBox = new THREE.Box3().setFromPoints(points);

    // 5. Set left, right, top, bottom từ bounding box ánh sáng
    directionalLight.shadow.camera.left = lightSpaceBox.min.x;
    directionalLight.shadow.camera.right = lightSpaceBox.max.x;
    directionalLight.shadow.camera.top = lightSpaceBox.max.y;
    directionalLight.shadow.camera.bottom = lightSpaceBox.min.y;

    // 6. Tính khoảng cách max từ vị trí ánh sáng đến bounding box (hệ thế giới)
    const lightPos = directionalLight.position;
    let maxDistance = 0;
    const worldPoints = [
      new THREE.Vector3(box.min.x, box.min.y, box.min.z),
      new THREE.Vector3(box.min.x, box.min.y, box.max.z),
      new THREE.Vector3(box.min.x, box.max.y, box.min.z),
      new THREE.Vector3(box.min.x, box.max.y, box.max.z),
      new THREE.Vector3(box.max.x, box.min.y, box.min.z),
      new THREE.Vector3(box.max.x, box.min.y, box.max.z),
      new THREE.Vector3(box.max.x, box.max.y, box.min.z),
      new THREE.Vector3(box.max.x, box.max.y, box.max.z),
    ];
    for (let i = 0; i < worldPoints.length; i++) {
      const dist = lightPos.distanceTo(worldPoints[i]);
      if (dist > maxDistance) maxDistance = dist;
    }
    console.log("maxDistance",maxDistance)

    // 7. Set near và far
    directionalLight.shadow.camera.near = 1;
    directionalLight.shadow.camera.far = maxDistance + 10; // thêm margin

    // 8. Cập nhật ma trận projection shadow camera
    directionalLight.shadow.camera.updateProjectionMatrix();


    scene.add(directionalLight);

    // // Ánh sáng
    // const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    // scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0xffffee, 1, 100);
    pointLight.position.set(20, wallHeight + 5, 20);
    pointLight.castShadow = true;
    scene.add(pointLight);

    // Load model bàn ghế cho phòng 1 (trung tâm phòng 1)
    const loader = new GLTFLoader();
    loader.load(
      "/models/source/简约餐桌.glb",
      (gltf) => {
        const model = gltf.scene;
        model.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = true;
            child.material.side = THREE.DoubleSide;
          }
        });
        model.scale.set(0.001, 0.001, 0.001);
        // Đặt ở phòng 1 (center (5, 4))
        model.position.set(roomWidth / 2, 0.5, roomDepth / 2);
        scene.add(model);
        modelRef.current = model;
      },
      undefined,
      (error) => {
        console.error("Lỗi khi load GLB:", error);
      }
    );
    // loader.load(
    //   "/models/source/low_poly_furnitures_full_bundle.glb",
    //   (gltf) => {
    //     const model = gltf.scene;
    //     model.traverse((child) => {
    //       if (child.isMesh) {
    //         child.castShadow = true;
    //         child.material.side = THREE.DoubleSide;
    //       }
    //     });
    //     model.scale.set(1, 1, 1);
    //     // Đặt ở phòng 1 (center (5, 4))
    //     model.position.set(roomWidth / 2, 0.5, roomDepth / 2);
    //     scene.add(model);
    //     modelRef.current = model;
    //   },
    //   undefined,
    //   (error) => {
    //     console.error("Lỗi khi load GLB:", error);
    //   }
    // );

    // Xử lý tương tác (giữ nguyên code từ trước, tương tự)

    let isInteracting = false;
    const offset = new THREE.Vector3();
    const startMouse = new THREE.Vector2();
    const startRotation = new THREE.Euler();
    const startScale = new THREE.Vector3();
    const plane = new THREE.Plane();
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    function onMouseDown(event) {
      if (!modeRef.current || !modelRef.current) return;

      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObject(modelRef.current, true);

      if (intersects.length > 0) {
        isInteracting = true;
        controls.enabled = false;

        if (modeRef.current === "drag") {
          plane.setFromNormalAndCoplanarPoint(
            camera.getWorldDirection(plane.normal),
            intersects[0].point
          );
          offset.copy(intersects[0].point).sub(modelRef.current.position);
        } else if (modeRef.current === "rotate") {
          startMouse.set(event.clientX, event.clientY);
          startRotation.copy(modelRef.current.rotation);
        } else if (modeRef.current === "scale") {
          startMouse.set(event.clientX, event.clientY);
          startScale.copy(modelRef.current.scale); // lưu scale hiện tại
        }
      }
    }

    function onMouseMove(event) {
      if (!isInteracting || !modelRef.current) return;

      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      if (modeRef.current === "drag") {
        raycaster.setFromCamera(mouse, camera);
        const intersection = new THREE.Vector3();
        raycaster.ray.intersectPlane(plane, intersection);
        modelRef.current.position.copy(intersection.sub(offset));
      } else if (modeRef.current === "rotate") {
        const deltaX = event.clientX - startMouse.x;
        const deltaY = event.clientY - startMouse.y;
        modelRef.current.rotation.y = startRotation.y + deltaX * 0.01;
        modelRef.current.rotation.x = startRotation.x + deltaY * 0.01;
      } else if (modeRef.current === "scale") {
        const deltaY = event.clientY - startMouse.y;
        const scaleFactor = 1 + deltaY * 0.01; // phóng to/thu nhỏ theo chiều dọc chuột
        modelRef.current.scale.set(
          startScale.x * scaleFactor,
          startScale.y * scaleFactor,
          startScale.z * scaleFactor
        );
      }
    }

    function onMouseUp() {
      if (isInteracting) {
        isInteracting = false;
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
      renderer.dispose();
    };
  }, []);

  const handleModeChange = (newMode) => {
    modeRef.current = newMode;
    setModeUI(newMode);
  };

  return (
    <>
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
              backgroundColor: modeUI === "scale" ? "#9370db" : "#eee",
              border: "1px solid #ccc",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            🔄 thu phong (Scale)
          </button>
        </div>
      </div>
    </>
  );
}

export default Test2;
