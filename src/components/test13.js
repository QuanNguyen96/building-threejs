import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

const Wall3DViewer = () => {
  const containerRef = useRef();

  // ✅ Dữ liệu mẫu cứng trong component
  const detect = {
    'inference_id': 'ee3e410b-b257-4647-b257-3954e2ea68bd', 'time': 0.04574501900060568, 'image': { 'width': 838, 'height': 1200 }, 'predictions': [{
      'x': 705.5, 'y': 267.5, 'width': 49.0, 'height': 185.0, 'confidence': 0.9307782649993896, 'class': 'walls', 'class_id': 0, 'detection_id': 'a6af8b39-20c2-4b00-ab37-af0c660e05d4'
    }, { 'x': 437.0, 'y': 874.5, 'width': 14.0, 'height': 247.0, 'confidence': 0.8977356553077698, 'class': 'walls', 'class_id': 0, 'detection_id': '11bcf694-6c2a-4504-93ae-cd2981f116b7' }, { 'x': 619.0, 'y': 864.0, 'width': 222.0, 'height': 14.0, 'confidence': 0.8885136246681213, 'class': 'walls', 'class_id': 0, 'detection_id': 'a0b8c0df-9bad-4599-9450-838156a592f8' }, { 'x': 397.0, 'y': 194.5, 'width': 140.0, 'height': 35.0, 'confidence': 0.8751079440116882, 'class': 'walls', 'class_id': 0, 'detection_id': '50a01d8c-853d-4272-a9da-d8b92d824364' }, { 'x': 725.0, 'y': 637.0, 'width': 14.0, 'height': 154.0, 'confidence': 0.8664635419845581, 'class': 'walls', 'class_id': 0, 'detection_id': '3dc1cb0a-9714-4d92-836f-f83d263cfda8' }, { 'x': 626.0, 'y': 467.0, 'width': 210.0, 'height': 20.0, 'confidence': 0.8586091995239258, 'class': 'walls', 'class_id': 0, 'detection_id': 'b00ca7e4-03ba-4e11-8321-6cf86617d9b4' },
    { 'x': 514.0, 'y': 652.5, 'width': 10.0, 'height': 81.0, 'confidence': 0.842875599861145, 'class': 'walls', 'class_id': 0, 'detection_id': 'c66210f2-7543-4197-baa8-52001e8d7955' }, { 'x': 620.0, 'y': 617.5, 'width': 224.0, 'height': 15.0, 'confidence': 0.8359535932540894, 'class': 'walls', 'class_id': 0, 'detection_id': 'e3576eea-331c-4bc9-bcdd-c1c6be32069f' }, { 'x': 466.0, 'y': 279.0, 'width': 12.0, 'height': 208.0, 'confidence': 0.8348503112792969, 'class': 'walls', 'class_id': 0, 'detection_id': '23b9df3a-6668-4431-8c28-d7b6d52e1128' }, { 'x': 407.5, 'y': 419.5, 'width': 19.0, 'height': 91.0, 'confidence': 0.8237285614013672, 'class': 'walls', 'class_id': 0, 'detection_id': 'cc4de685-0924-473c-ab15-aaf9faa0c270' }, { 'x': 88.5, 'y': 798.0, 'width': 15.0, 'height': 86.0, 'confidence': 0.8127953410148621, 'class': 'walls', 'class_id': 0, 'detection_id': 'b8170f84-326c-4a61-bc3a-57eb904e7d1a' }, { 'x': 327.5, 'y': 216.0, 'width': 11.0, 'height': 82.0, 'confidence': 0.8127614259719849, 'class': 'walls', 'class_id': 0, 'detection_id': '5668fc2b-b2d2-428d-8624-2d23e2a74b20' }, { 'x': 515.0, 'y': 810.0, 'width': 12.0, 'height': 114.0, 'confidence': 0.8037711381912231, 'class': 'walls', 'class_id': 0, 'detection_id': '1d92d3a1-9c06-4574-ab18-4205a10db451' }, { 'x': 88.5, 'y': 967.5, 'width': 15.0, 'height': 63.0, 'confidence': 0.8004876971244812, 'class': 'walls', 'class_id': 0, 'detection_id': '8432c772-fdec-4fb1-aa2a-0a317e67b5f1' }, { 'x': 89.0, 'y': 496.0, 'width': 14.0, 'height': 330.0, 'confidence': 0.7999358773231506, 'class': 'walls', 'class_id': 0, 'detection_id': 'e46dea77-18e4-4b53-b25a-afe276fcadba' }, { 'x': 435.5, 'y': 614.5, 'width': 11.0, 'height': 151.0, 'confidence': 0.7995805144309998, 'class': 'walls', 'class_id': 0, 'detection_id': 'f7e10368-b1c0-4e8a-87e5-6d37b7e83cd9' }, { 'x': 262.5, 'y': 993.0, 'width': 363.0, 'height': 16.0, 'confidence': 0.7897260785102844, 'class': 'walls', 'class_id': 0, 'detection_id': 'fd3e79f1-39b6-4607-92a9-2c30571db43f' }, { 'x': 428.5, 'y': 458.0, 'width': 61.0, 'height': 20.0, 'confidence': 0.7780341506004333, 'class': 'walls', 'class_id': 0, 'detection_id': '7a2c9311-9ab1-47a5-ba61-aa786c821dbe' }, { 'x': 89.0, 'y': 205.0, 'width': 16.0, 'height': 64.0, 'confidence': 0.7773202657699585, 'class': 'walls', 'class_id': 0, 'detection_id': '78cf961c-5de1-4157-a1b5-f0461b9ec35e' }, { 'x': 328.0, 'y': 392.0, 'width': 10.0, 'height': 152.0, 'confidence': 0.7650445699691772, 'class': 'walls', 'class_id': 0, 'detection_id': '3f898866-2b73-4c2e-8db0-4d98853878cb' }, { 'x': 327.5, 'y': 572.5, 'width': 11.0, 'height': 77.0, 'confidence': 0.7303471565246582, 'class': 'walls', 'class_id': 0, 'detection_id': '94e2a551-87df-470d-a6d4-f88aa185d1b7' }, { 'x': 725.0, 'y': 848.0, 'width': 14.0, 'height': 48.0, 'confidence': 0.7233521342277527, 'class': 'walls', 'class_id': 0, 'detection_id': '20f09f48-a2d9-4e0a-886a-337b5d4e6119' }, { 'x': 597.5, 'y': 583.0, 'width': 9.0, 'height': 82.0, 'confidence': 0.6910867691040039, 'class': 'walls', 'class_id': 0, 'detection_id': 'af29c4c6-7d5e-4675-bbeb-97df55188d4d' }, { 'x': 399.0, 'y': 379.0, 'width': 154.0, 'height': 12.0, 'confidence': 0.6853432655334473, 'class': 'walls', 'class_id': 0, 'detection_id': '95fa3f8d-a86c-488e-b789-165e15eee017' }, {
      'x': 528.5,
      'y': 580.5, 'width': 11.0, 'height': 83.0, 'confidence': 0.6757205724716187, 'class': 'walls', 'class_id': 0, 'detection_id': 'f7877e41-f8b8-4710-ae60-2060a7df5ea4'
    }, { 'x': 256.0, 'y': 606.0, 'width': 312.0, 'height': 12.0, 'confidence': 0.6457440853118896, 'class': 'walls', 'class_id': 0, 'detection_id': '71f8a3e7-48d2-408d-ad46-9a891a345ba4' }, { 'x': 320.0, 'y': 546.0, 'width': 52.0, 'height': 12.0, 'confidence': 0.6408675909042358, 'class': 'walls', 'class_id': 0, 'detection_id': '62437705-d467-4187-95d1-4d1f75e0818c' }, { 'x': 110.5, 'y': 545.0, 'width': 55.0, 'height': 12.0, 'confidence': 0.6297878623008728, 'class': 'walls', 'class_id': 0, 'detection_id': '1934057c-3325-4c53-80ec-8412b2c23976' }]
  }

  const wallData = detect.predictions

  useEffect(() => {
    // --- Setup scene ---
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xffffff); // hoặc new THREE.Color("#ffffff")
    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    const camera = new THREE.PerspectiveCamera(45, width / height, 1, 5000);
    camera.position.set(0, 300, 400);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    containerRef.current.appendChild(renderer.domElement);

    // --- Controls ---
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(500, 0, 300); // Điều chỉnh nhìn giữa các đối tượng
    controls.update();

    // --- Lighting ---
    scene.add(new THREE.AmbientLight(0xffffff, 0.4));
    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(200, 400, 300);
    scene.add(light);

    // --- Grid (OXZ) ---
    const grid = new THREE.GridHelper(2000, 100);
    scene.add(grid);

    // ✅ Trục tọa độ đơn giản
    const axesHelper = new THREE.AxesHelper(300);
    scene.add(axesHelper);

    // ✅ Mũi tên hướng trục X (đỏ)
    const xArrow = new THREE.ArrowHelper(
      new THREE.Vector3(1, 0, 0), // hướng X
      new THREE.Vector3(0, 0, 0), // gốc
      150,                        // độ dài
      0xff0000,                   // màu đỏ
      20,                         // đầu mũi tên
      10                          // độ rộng mũi tên
    );
    scene.add(xArrow);

    // ✅ Mũi tên hướng trục Y (lục)
    const yArrow = new THREE.ArrowHelper(
      new THREE.Vector3(0, 1, 0),
      new THREE.Vector3(0, 0, 0),
      150,
      0x00ff00,
      20,
      10
    );
    scene.add(yArrow);

    // ✅ Mũi tên hướng trục Z (lam)
    const zArrow = new THREE.ArrowHelper(
      new THREE.Vector3(0, 0, 1),
      new THREE.Vector3(0, 0, 0),
      150,
      'yellow',
      20,
      10
    );
    scene.add(zArrow);


    // --- Render mỗi phần tử ---
    wallData.forEach((item) => {
      const boxWidth = item.width;
      const boxDepth = item.height;
      const boxHeight = 20; // chiều cao tạm thời theo trục Y

      const geometry = new THREE.BoxGeometry(boxWidth, boxHeight, boxDepth);
      const material = new THREE.MeshStandardMaterial({
        color: item.class === 'door' ? 'orange' : 'gray',
        wireframe: true,
      });

      const mesh = new THREE.Mesh(geometry, material);

      // ✅ Vị trí: (x, height/2, z) — vì x/y từ Roboflow là CENTER
      mesh.position.set(item.x, boxHeight / 2, item.y);

      scene.add(mesh);
    });

    // --- Render loop ---
    const animate = () => {
      requestAnimationFrame(animate);
      renderer.render(scene, camera);
    };
    animate();

    // --- Cleanup ---
    return () => {
      renderer.dispose();
      containerRef.current.removeChild(renderer.domElement);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{ width: '100vw', height: '100vh', backgroundColor: '#000' }}
    />
  );
};

export default Wall3DViewer;
