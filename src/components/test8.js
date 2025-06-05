import React, { useEffect, useRef } from "react";
import * as THREE from "three";
import * as CANNON from "cannon-es";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

export default function RoomLayout() {
  const floorSize = 100;
  const halfSize = floorSize / 2;
  const containerRef = useRef();
  const worldRef = useRef();
  const objectsRef = useRef([]);
  function getBodyAABB(body) {
    const aabb = new CANNON.AABB();

    if (!body.shapes.length) {
      console.warn("Body không có shape!");
      return null;
    }

    // Tính AABB cho shape đầu tiên (thường chỉ 1 shape thôi)
    body.shapes[0].calculateWorldAABB(
      body.position,
      body.quaternion,
      aabb.lowerBound,
      aabb.upperBound
    );
    return aabb;
  }

  function canPlace(body, pos, others) {
    body.position.set(pos.x, pos.y, pos.z);

    const bb1 = getBodyAABB(body);
    if (!bb1) return false;

    const minX = -halfSize + 5;
    const maxX = halfSize - 5;
    const minZ = -halfSize + 5;
    const maxZ = halfSize - 5;

    if (
      bb1.lowerBound.x < minX ||
      bb1.upperBound.x > maxX ||
      bb1.lowerBound.z < minZ ||
      bb1.upperBound.z > maxZ
    ) {
      return false;
    }

    for (let other of others) {
      if (other === body) continue;
      const bb2 = getBodyAABB(other);
      if (!bb2) continue;
      if (bb1.overlaps(bb2)) return false;
    }

    return true;
  }
  useEffect(() => {
    const width = window.innerWidth;
    const height = window.innerHeight;

    // === THREE SETUP ===
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf0f0f0);
    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
    camera.position.set(0, 80, 100);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    containerRef.current.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);

    // === CANNON SETUP ===
    const world = new CANNON.World();
    world.gravity.set(0, -9.82, 0);
    world.broadphase = new CANNON.NaiveBroadphase();
    world.solver.iterations = 10;
    worldRef.current = world;

    // Floor (THREE + CANNON)
    const floorSize = 60;
    const floorGeo = new THREE.PlaneGeometry(floorSize, floorSize);
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x999999 });
    const floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.rotation.x = -Math.PI / 2;
    scene.add(floorMesh);

    const floorBody = new CANNON.Body({ mass: 0 });
    floorBody.addShape(new CANNON.Plane());
    floorBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
    world.addBody(floorBody);

    // Walls - 4 walls bounding the room (CANNON + THREE)
    const wallThickness = 2;
    const wallHeight = 20;
    const halfSize = floorSize / 2;

    const wallMaterial = new THREE.MeshStandardMaterial({ color: 0x666666 });

    function createWall(position, rotation, size) {
      // THREE Mesh
      const geo = new THREE.BoxGeometry(size.x, size.y, size.z);
      const mesh = new THREE.Mesh(geo, wallMaterial);
      mesh.position.copy(position);
      mesh.rotation.y = rotation;
      scene.add(mesh);

      // CANNON Body
      const shape = new CANNON.Box(
        new CANNON.Vec3(size.x / 2, size.y / 2, size.z / 2)
      );
      const body = new CANNON.Body({ mass: 0, shape });
      body.position.copy(position);
      body.quaternion.setFromEuler(0, rotation, 0);
      world.addBody(body);
      return { mesh, body };
    }

    // Create 4 walls
    const walls = [
      createWall(
        new THREE.Vector3(0, wallHeight / 2, -halfSize),
        0,
        new THREE.Vector3(floorSize, wallHeight, wallThickness)
      ),
      createWall(
        new THREE.Vector3(0, wallHeight / 2, halfSize),
        0,
        new THREE.Vector3(floorSize, wallHeight, wallThickness)
      ),
      createWall(
        new THREE.Vector3(-halfSize, wallHeight / 2, 0),
        Math.PI / 2,
        new THREE.Vector3(floorSize, wallHeight, wallThickness)
      ),
      createWall(
        new THREE.Vector3(halfSize, wallHeight / 2, 0),
        Math.PI / 2,
        new THREE.Vector3(floorSize, wallHeight, wallThickness)
      ),
    ];

    // LIGHTS
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(50, 50, 50);
    scene.add(dirLight);
    scene.add(new THREE.AmbientLight(0xffffff, 0.3));

    // Đồ vật (hộp) cần đặt
    // Mỗi đồ vật là 1 BoxGeometry với kích thước khác nhau
    const furnitures = [
      { w: 15, h: 7, d: 10, color: 0xaa5522 },
      { w: 10, h: 5, d: 8, color: 0x22aa55 },
      { w: 12, h: 6, d: 6, color: 0x2255aa },
    ];

    // Tạo mesh + body cho từng đồ vật, nhưng chưa đặt vị trí
    const furnitureObjs = furnitures.map(({ w, h, d, color }) => {
      // Mesh
      const geo = new THREE.BoxGeometry(w, h, d);
      const mat = new THREE.MeshStandardMaterial({ color });
      const mesh = new THREE.Mesh(geo, mat);
      scene.add(mesh);

      // Body
      const shape = new CANNON.Box(new CANNON.Vec3(w / 2, h / 2, d / 2));
      const body = new CANNON.Body({ mass: 1, shape });
      world.addBody(body);

      return { w, h, d, mesh, body };
    });

    // Heuristic đặt đồ vật:
    // Đặt lần lượt, cố định y = h/2 (trên mặt đất)
    // Cố gắng đặt đồ vật cách tường tối thiểu 5 đơn vị (m)
    // Nếu va chạm, thử dịch đồ vật sang phải / trái trong phạm vi phòng

    function canPlace(body, pos, others) {
      // Đặt tạm vị trí mới
      body.position.set(pos.x, pos.y, pos.z);

      // Kiểm tra va chạm với các vật khác (dùng AABB simple)
      // Lấy bounding box của body
      const bb1 = new CANNON.AABB();
      body.shape.calculateWorldAABB(
        body.position,
        body.quaternion,
        bb1.lowerBound,
        bb1.upperBound
      );

      // Kiểm tra chạm với walls: không vượt quá tường (tường là 2 đơn vị dày)
      // Phòng từ -halfSize đến +halfSize
      const minX = -halfSize + 5;
      const maxX = halfSize - 5;
      const minZ = -halfSize + 5;
      const maxZ = halfSize - 5;
      if (
        bb1.lowerBound.x < minX ||
        bb1.upperBound.x > maxX ||
        bb1.lowerBound.z < minZ ||
        bb1.upperBound.z > maxZ
      ) {
        return false;
      }

      // Kiểm tra với các vật khác (bounding box simple)
      for (let other of others) {
        if (other === body) continue;
        const bb2 = new CANNON.AABB();
        other.shape.calculateWorldAABB(
          other.position,
          other.quaternion,
          bb2.lowerBound,
          bb2.upperBound
        );
        if (bb1.overlaps(bb2)) return false;
      }
      return true;
    }

    function placeFurniture() {
      const placedBodies = [];

      furnitureObjs.forEach(({ body, h }) => {
        let placed = false;
        const y = h / 2;

        // Tìm vị trí thử theo grid
        const step = 2;
        const range = halfSize - 5;
        outer: for (let x = -range; x <= range; x += step) {
          for (let z = -range; z <= range; z += step) {
            if (canPlace(body, new CANNON.Vec3(x, y, z), placedBodies)) {
              body.position.set(x, y, z);
              placedBodies.push(body);
              placed = true;
              break outer;
            }
          }
        }

        if (!placed) {
          console.warn("Không tìm được vị trí hợp lệ cho đồ vật");
        }
      });
    }

    placeFurniture();

    objectsRef.current = furnitureObjs;

    // Animation loop
    const clock = new THREE.Clock();

    function animate() {
      requestAnimationFrame(animate);
      const delta = clock.getDelta();

      world.step(1 / 60, delta);

      objectsRef.current.forEach(({ mesh, body }) => {
        mesh.position.copy(body.position);
        mesh.quaternion.copy(body.quaternion);
      });

      controls.update();
      renderer.render(scene, camera);
    }
    animate();

    return () => {
      renderer.dispose();
      containerRef.current.removeChild(renderer.domElement);
    };
  }, []);

  return <div ref={containerRef} style={{ width: "100vw", height: "100vh" }} />;
}
