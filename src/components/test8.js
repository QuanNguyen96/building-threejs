// import React, { useState, useEffect } from "react";

// // Sample room layout: 'W' = Wall, 'R' = Room
// const initialMap = [
//   ['W', 'W', 'W', 'W', 'W', 'W', 'W', 'W', 'W', 'W'],
//   ['W', 'R', 'R', 'W', 'R', 'W', 'W', 'W', 'W', 'W'],
//   ['W', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'W'],
//   ['W', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'W'],
//   ['W', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'W'],
//   ['W', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'W'],
//   ['W', 'W', 'W', 'W', 'W', 'W', 'W', 'W', 'W', 'W'],
// ];

// // Furniture list
// const furnitureList = [
//   { id: 'A', w: 2, h: 1, label: 'Bed' },
//   { id: 'B', w: 1, h: 1, label: 'Table' },
//   { id: 'C', w: 2, h: 2, label: 'Wardrobe' },
// ];

// export default function RoomPlanner2D() {
//   const [map, setMap] = useState([]);

//   useEffect(() => {
//     const placedMap = placeFurniture(initialMap, furnitureList);
//     setMap(placedMap);
//   }, []);

//   return (
//     <div>
//       <h2>Room Layout</h2>
//       <table style={{ borderCollapse: 'collapse' }}>
//         <tbody>
//           {map.map((row, y) => (
//             <tr key={y}>
//               {row.map((cell, x) => (
//                 <td key={x} style={{
//                   width: 30, height: 30, textAlign: 'center',
//                   border: '1px solid #ccc',
//                   background: cell === 'W' ? '#444' :
//                     cell === 'R' ? '#eee' :
//                       '#aaf'
//                 }}>
//                   {cell !== 'W' && cell !== 'R' ? cell : ''}
//                 </td>
//               ))}
//             </tr>
//           ))}
//         </tbody>
//       </table>
//     </div>
//   );
// }

// // --------- Core logic: place furniture on 2D grid ----------
// function placeFurniture(map2D, furniture) {
//   const map = map2D.map(row => row.slice()); // deep copy
//   const height = map.length;
//   const width = map[0].length;

//   function canPlaceAt(x, y, w, h) {
//     if (x + w > width || y + h > height) return false;
//     for (let dy = 0; dy < h; dy++) {
//       for (let dx = 0; dx < w; dx++) {
//         const cell = map[y + dy][x + dx];
//         if (cell !== 'R') return false;
//       }
//     }
//     return true;
//   }

//   function place(id, x, y, w, h) {
//     for (let dy = 0; dy < h; dy++) {
//       for (let dx = 0; dx < w; dx++) {
//         map[y + dy][x + dx] = id;
//       }
//     }
//   }

//   furniture.forEach(item => {
//     let placed = false;
//     for (let y = 0; y < height; y++) {
//       for (let x = 0; x < width; x++) {
//         if (canPlaceAt(x, y, item.w, item.h)) {
//           place(item.id, x, y, item.w, item.h);
//           placed = true;
//           break;
//         }
//       }
//       if (placed) break;
//     }
//   });

//   return map;
// }




import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import * as CANNON from "cannon-es";

const floorSize = 30;

function createShapeMesh(type) {
  let geometry;
  const mat = new THREE.MeshStandardMaterial({ color: 0x6699cc });

  switch (type) {
    case "circle":
      geometry = new THREE.CylinderGeometry(2, 2, 1, 32);
      break;
    case "triangle":
      const shape = new THREE.Shape();
      shape.moveTo(0, 2);
      shape.lineTo(-2, -2);
      shape.lineTo(2, -2);
      shape.lineTo(0, 2);
      geometry = new THREE.ExtrudeGeometry(shape, { depth: 1, bevelEnabled: false });
      break;
    case "square":
    default:
      geometry = new THREE.BoxGeometry(3, 1, 3);
      break;
  }

  const mesh = new THREE.Mesh(geometry, mat);
  return mesh;
}

function createShapeBody(type) {
  let shape;
  switch (type) {
    case "circle":
      shape = new CANNON.Cylinder(2, 2, 1, 16);
      break;
    case "triangle":
      shape = new CANNON.Box(new CANNON.Vec3(2, 0.5, 2));
      break;
    case "square":
    default:
      shape = new CANNON.Box(new CANNON.Vec3(1.5, 0.5, 1.5));
      break;
  }
  const body = new CANNON.Body({ mass: 5, shape });
  return body;
}

export default function RoomWithDropShapes() {
  const containerRef = useRef();
  const sceneRef = useRef();
  const worldRef = useRef();
  const objectsRef = useRef([]);
  const [worldReady, setWorldReady] = useState(false);

  useEffect(() => {
    const width = window.innerWidth;
    const height = window.innerHeight;

    // === THREE SETUP ===
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf0f0f0);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
    camera.position.set(20, 25, 30);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    containerRef.current.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);

    // Floor
    const floorGeo = new THREE.PlaneGeometry(floorSize, floorSize);
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x999999 });
    const floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.rotation.x = -Math.PI / 2;
    scene.add(floorMesh);

    // Lights
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(20, 30, 20);
    scene.add(dirLight);
    scene.add(new THREE.AmbientLight(0xffffff, 0.4));

    // === CANNON SETUP ===
    const world = new CANNON.World();
    world.gravity.set(0, -9.82, 0);
    world.broadphase = new CANNON.NaiveBroadphase();
    world.solver.iterations = 10;
    worldRef.current = world;

    // Floor body
    const floorBody = new CANNON.Body({ mass: 0 });
    floorBody.addShape(new CANNON.Plane());
    floorBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
    world.addBody(floorBody);

    // Thêm vài hộp chữ L cố định (dùng Box đơn giản)
    function createLShapeBody() {
      const body = new CANNON.Body({ mass: 0 });
      const box1 = new CANNON.Box(new CANNON.Vec3(4, 1, 1));
      body.addShape(box1, new CANNON.Vec3(2, 1, 0));

      const box2 = new CANNON.Box(new CANNON.Vec3(1, 1, 4));
      body.addShape(box2, new CANNON.Vec3(0, 1, 2));

      const box3 = new CANNON.Box(new CANNON.Vec3(1, 1, 1));
      body.addShape(box3, new CANNON.Vec3(0, 1, 0));

      return body;
    }
    function createLShapeMesh() {
      const group = new THREE.Group();
      const mat = new THREE.MeshStandardMaterial({ color: 0x2288cc });
      const box1 = new THREE.Mesh(new THREE.BoxGeometry(8, 2, 2), mat);
      box1.position.set(2, 1, 0);
      group.add(box1);

      const box2 = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 8), mat);
      box2.position.set(0, 1, 4);
      group.add(box2);

      const box3 = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2), mat);
      box3.position.set(0, 1, 0);
      group.add(box3);
      return group;
    }

    // Thêm 2 vật chữ L cố định trong phòng
    const lObjects = [];
    const lPositions = [
      { x: -8, y: 0, z: -5 },
      { x: 5, y: 0, z: 5 },
    ];
    lPositions.forEach(({ x, y, z }) => {
      const body = createLShapeBody();
      body.position.set(x, y, z);
      world.addBody(body);

      const mesh = createLShapeMesh();
      mesh.position.set(x, y, z);
      scene.add(mesh);

      lObjects.push({ body, mesh });
    });

    objectsRef.current = [];

    // Animation loop
    const clock = new THREE.Clock();
    function animate() {
      requestAnimationFrame(animate);
      const delta = clock.getDelta();
      world.step(1 / 60, delta);

      // Cập nhật vị trí mesh theo body vật lý
      objectsRef.current.forEach(({ body, mesh }) => {
        mesh.position.copy(body.position);
        mesh.quaternion.copy(body.quaternion);
      });

      lObjects.forEach(({ body, mesh }) => {
        mesh.position.copy(body.position);
        mesh.quaternion.copy(body.quaternion);
      });

      controls.update();
      renderer.render(scene, camera);
    }
    animate();

    setWorldReady(true);

    return () => {
      renderer.dispose();
      containerRef.current.removeChild(renderer.domElement);
    };
  }, []);

  function addRandomShape() {
    if (!worldRef.current || !sceneRef.current) return;

    const types = ["circle", "triangle", "square"];
    const type = types[Math.floor(Math.random() * types.length)];

    const body = createShapeBody(type);

    const x = (Math.random() - 0.5) * (floorSize - 6);
    const z = (Math.random() - 0.5) * (floorSize - 6);
    const y = 20 + Math.random() * 5;

    body.position.set(x, y, z);
    body.angularVelocity.set(Math.random(), Math.random(), Math.random());
    body.angularDamping = 0.5;

    worldRef.current.addBody(body);

    const mesh = createShapeMesh(type);
    mesh.position.set(x, y, z);

    sceneRef.current.add(mesh);

    objectsRef.current.push({ body, mesh });
  }

  return (
    <>
      <button
        onClick={addRandomShape}
        disabled={!worldReady}
        style={{ position: "absolute", top: 200, left: 20, zIndex: 10 }}
      >
        Thả vật thể ngẫu nhiên
      </button>
      <div ref={containerRef} style={{ width: "100vw", height: "100vh" }} />
    </>
  );
}



// import React, { useEffect, useRef } from "react";
// import * as THREE from "three";
// import * as CANNON from "cannon-es";
// import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

// export default function RoomLayout() {
//   const containerRef = useRef();
//   const worldRef = useRef();
//   const objectsRef = useRef([]);
//   const floorSize = 60;
//   const halfSize = floorSize / 2;

//   // Hàm tính AABB tổng cho body (nếu nhiều shape)
//   function getBodyAABB(body) {
//     const aabb = new CANNON.AABB();
//     if (!body.shapes.length) return null;

//     // Khởi tạo AABB từ shape đầu tiên
//     body.shapes[0].calculateWorldAABB(
//       body.position.vadd(body.shapeOffsets[0] || new CANNON.Vec3()),
//       body.quaternion.mult(body.shapeOrientations[0] || new CANNON.Quaternion()),
//       aabb.lowerBound,
//       aabb.upperBound
//     );

//     // Mở rộng AABB với các shape tiếp theo (nếu có)
//     for (let i = 1; i < body.shapes.length; i++) {
//       const lb = new CANNON.Vec3();
//       const ub = new CANNON.Vec3();
//       body.shapes[i].calculateWorldAABB(
//         body.position.vadd(body.shapeOffsets[i] || new CANNON.Vec3()),
//         body.quaternion.mult(body.shapeOrientations[i] || new CANNON.Quaternion()),
//         lb,
//         ub
//       );
//       aabb.extend(lb);
//       aabb.extend(ub);
//     }
//     return aabb;
//   }

//   // Kiểm tra có thể đặt body tại pos mà không va chạm
//   function canPlace(body, pos, others) {
//     body.position.copy(pos);

//     const bb1 = getBodyAABB(body);
//     if (!bb1) return false;

//     const minX = -halfSize + 5;
//     const maxX = halfSize - 5;
//     const minZ = -halfSize + 5;
//     const maxZ = halfSize - 5;

//     if (
//       bb1.lowerBound.x < minX ||
//       bb1.upperBound.x > maxX ||
//       bb1.lowerBound.z < minZ ||
//       bb1.upperBound.z > maxZ
//     ) {
//       return false;
//     }

//     for (let other of others) {
//       if (other === body) continue;
//       const bb2 = getBodyAABB(other);
//       if (!bb2) continue;
//       if (bb1.overlaps(bb2)) return false;
//     }
//     return true;
//   }

//   useEffect(() => {
//     const width = window.innerWidth;
//     const height = window.innerHeight;

//     // === THREE SETUP ===
//     const scene = new THREE.Scene();
//     scene.background = new THREE.Color(0xf0f0f0);
//     const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
//     camera.position.set(0, 80, 100);
//     camera.lookAt(0, 0, 0);

//     const renderer = new THREE.WebGLRenderer({ antialias: true });
//     renderer.setSize(width, height);
//     containerRef.current.appendChild(renderer.domElement);

//     const controls = new OrbitControls(camera, renderer.domElement);

//     // === CANNON SETUP ===
//     const world = new CANNON.World();
//     world.gravity.set(0, -9.82, 0);
//     world.broadphase = new CANNON.NaiveBroadphase();
//     world.solver.iterations = 10;
//     worldRef.current = world;

//     // Floor
//     const floorGeo = new THREE.PlaneGeometry(floorSize, floorSize);
//     const floorMat = new THREE.MeshStandardMaterial({ color: 0x999999 });
//     const floorMesh = new THREE.Mesh(floorGeo, floorMat);
//     floorMesh.rotation.x = -Math.PI / 2;
//     scene.add(floorMesh);

//     const floorBody = new CANNON.Body({ mass: 0 });
//     floorBody.addShape(new CANNON.Plane());
//     floorBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
//     world.addBody(floorBody);

//     // Walls
//     const wallThickness = 2;
//     const wallHeight = 20;

//     const wallMaterial = new THREE.MeshStandardMaterial({ color: 0x666666 });

//     function createWall(position, rotation, size) {
//       const geo = new THREE.BoxGeometry(size.x, size.y, size.z);
//       const mesh = new THREE.Mesh(geo, wallMaterial);
//       mesh.position.copy(position);
//       mesh.rotation.y = rotation;
//       scene.add(mesh);

//       const shape = new CANNON.Box(
//         new CANNON.Vec3(size.x / 2, size.y / 2, size.z / 2)
//       );
//       const body = new CANNON.Body({ mass: 0, shape });
//       body.position.copy(position);
//       body.quaternion.setFromEuler(0, rotation, 0);
//       world.addBody(body);
//       return { mesh, body };
//     }

//     const walls = [
//       createWall(
//         new THREE.Vector3(0, wallHeight / 2, -halfSize),
//         0,
//         new THREE.Vector3(floorSize, wallHeight, wallThickness)
//       ),
//       createWall(
//         new THREE.Vector3(0, wallHeight / 2, halfSize),
//         0,
//         new THREE.Vector3(floorSize, wallHeight, wallThickness)
//       ),
//       createWall(
//         new THREE.Vector3(-halfSize, wallHeight / 2, 0),
//         Math.PI / 2,
//         new THREE.Vector3(floorSize, wallHeight, wallThickness)
//       ),
//       createWall(
//         new THREE.Vector3(halfSize, wallHeight / 2, 0),
//         Math.PI / 2,
//         new THREE.Vector3(floorSize, wallHeight, wallThickness)
//       ),
//     ];

//     // LIGHTS
//     const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
//     dirLight.position.set(50, 50, 50);
//     scene.add(dirLight);
//     scene.add(new THREE.AmbientLight(0xffffff, 0.3));

//     // Đồ vật (hộp) cần đặt
//     const furnitures = [
//       { w: 15, h: 7, d: 10, color: 0xaa5522 },
//       { w: 10, h: 5, d: 8, color: 0x22aa55 },
//       { w: 12, h: 6, d: 6, color: 0x2255aa },
//     ];

//     // Tạo mesh + body cho từng đồ vật, chưa đặt vị trí
//     const furnitureObjs = furnitures.map(({ w, h, d, color }) => {
//       const geo = new THREE.BoxGeometry(w, h, d);
//       const mat = new THREE.MeshStandardMaterial({ color });
//       const mesh = new THREE.Mesh(geo, mat);
//       scene.add(mesh);

//       const shape = new CANNON.Box(new CANNON.Vec3(w / 2, h / 2, d / 2));
//       const body = new CANNON.Body({ mass: 1, shape });
//       world.addBody(body);

//       return { w, h, d, mesh, body };
//     });

//     // Đặt đồ vật lần lượt trên grid
//     function placeFurniture() {
//       const placedBodies = [];

//       furnitureObjs.forEach(({ body, h }) => {
//         let placed = false;
//         const y = h / 2;

//         const step = 2;
//         const range = halfSize - 5;
//         outer: for (let x = -range; x <= range; x += step) {
//           for (let z = -range; z <= range; z += step) {
//             if (canPlace(body, new CANNON.Vec3(x, y, z), placedBodies)) {
//               body.position.set(x, y, z);
//               placedBodies.push(body);
//               placed = true;
//               break outer;
//             }
//           }
//         }

//         if (!placed) {
//           console.warn("Không tìm được vị trí hợp lệ cho đồ vật");
//         }
//       });
//     }

//     placeFurniture();

//     objectsRef.current = furnitureObjs;

//     // Animation loop
//     const clock = new THREE.Clock();

//     function animate() {
//       requestAnimationFrame(animate);
//       const delta = clock.getDelta();

//       world.step(1 / 60, delta);

//       objectsRef.current.forEach(({ mesh, body }) => {
//         mesh.position.copy(body.position);
//         mesh.quaternion.copy(body.quaternion);
//       });

//       controls.update();
//       renderer.render(scene, camera);
//     }
//     animate();

//     return () => {
//       renderer.dispose();
//       containerRef.current.removeChild(renderer.domElement);
//     };
//   }, []);

//   return <div ref={containerRef} style={{ width: "100vw", height: "100vh" }} />;
// }


// import React, { useEffect, useRef, useState } from "react";
// import * as THREE from "three";
// import * as CANNON from "cannon-es";
// import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

// export default function RoomWithLDropTest() {
//   const containerRef = useRef();
//   const worldRef = useRef();
//   const objectsRef = useRef([]);
//   const [scene, setScene] = useState(null);

//   useEffect(() => {
//     const width = window.innerWidth;
//     const height = window.innerHeight;

//     const scene = new THREE.Scene();
//     scene.background = new THREE.Color(0xf0f0f0);
//     setScene(scene);

//     const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
//     camera.position.set(0, 60, 100);

//     const renderer = new THREE.WebGLRenderer({ antialias: true });
//     renderer.setSize(width, height);
//     containerRef.current.appendChild(renderer.domElement);

//     const controls = new OrbitControls(camera, renderer.domElement);
//     controls.target.set(0, 10, 0);
//     controls.update();

//     const world = new CANNON.World({
//       gravity: new CANNON.Vec3(0, -9.82, 0),
//     });
//     worldRef.current = world;

//     // Floor
//     const floorSize = 100;
//     const floorGeo = new THREE.PlaneGeometry(floorSize, floorSize);
//     const floorMat = new THREE.MeshStandardMaterial({ color: 0xaaaaaa });
//     const floorMesh = new THREE.Mesh(floorGeo, floorMat);
//     floorMesh.rotation.x = -Math.PI / 2;
//     scene.add(floorMesh);

//     const floorBody = new CANNON.Body({ mass: 0 });
//     floorBody.addShape(new CANNON.Plane());
//     floorBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
//     world.addBody(floorBody);

//     // Light
//     const light = new THREE.DirectionalLight(0xffffff, 0.8);
//     light.position.set(50, 50, 50);
//     scene.add(light);
//     scene.add(new THREE.AmbientLight(0xffffff, 0.3));

//     // === Hình chữ L ngược ===
//     function createUpsideDownL() {
//       const lGroup = new THREE.Group();
//       const thick = 2;
//       const verticalHeight = 10;
//       const horizontalWidth = 8;
//       const mat = new THREE.MeshStandardMaterial({ color: 0x8844ff });

//       const verticalGeo = new THREE.BoxGeometry(thick, verticalHeight, thick);
//       const verticalMesh = new THREE.Mesh(verticalGeo, mat);
//       verticalMesh.position.set(0, verticalHeight / 2, 0);

//       const horizontalGeo = new THREE.BoxGeometry(horizontalWidth, thick, thick);
//       const horizontalMesh = new THREE.Mesh(horizontalGeo, mat);
//       horizontalMesh.position.set(horizontalWidth / 2 - thick / 2, verticalHeight - thick / 2, 0);

//       lGroup.add(verticalMesh);
//       lGroup.add(horizontalMesh);
//       scene.add(lGroup);

//       const body = new CANNON.Body({ mass: 0 });
//       const verticalShape = new CANNON.Box(new CANNON.Vec3(thick / 2, verticalHeight / 2, thick / 2));
//       const horizontalShape = new CANNON.Box(new CANNON.Vec3(horizontalWidth / 2, thick / 2, thick / 2));
//       body.addShape(verticalShape, new CANNON.Vec3(0, verticalHeight / 2, 0));
//       body.addShape(horizontalShape, new CANNON.Vec3(horizontalWidth / 2 - thick / 2, verticalHeight - thick / 2, 0));

//       body.position.set(-10, 0, 0);
//       world.addBody(body);

//       lGroup.position.copy(body.position);
//       return { mesh: lGroup, body };
//     }

//     const lShape = createUpsideDownL();

//     // Animate
//     const clock = new THREE.Clock();
//     function animate() {
//       requestAnimationFrame(animate);
//       const delta = clock.getDelta();
//       world.step(1 / 60, delta);

//       objectsRef.current.forEach(({ mesh, body }) => {
//         mesh.position.copy(body.position);
//         mesh.quaternion.copy(body.quaternion);
//       });

//       renderer.render(scene, camera);
//     }
//     animate();

//     return () => {
//       renderer.dispose();
//       containerRef.current.removeChild(renderer.domElement);
//     };
//   }, []);

//   const dropBox = () => {
//     if (!scene || !worldRef.current) return;
//     const size = 2;
//     const geo = new THREE.BoxGeometry(size, size, size);
//     const mat = new THREE.MeshStandardMaterial({ color: 0xff0000 });
//     const mesh = new THREE.Mesh(geo, mat);
//     scene.add(mesh);

//     const shape = new CANNON.Box(new CANNON.Vec3(size / 2, size / 2, size / 2));
//     const body = new CANNON.Body({ mass: 1 });
//     body.addShape(shape);
//     body.position.set(-10 + Math.random() * 4, 25, Math.random() * 4 - 2);

//     worldRef.current.addBody(body);
//     objectsRef.current.push({ mesh, body });
//   };

//   return (
//     <>
//       <div ref={containerRef} style={{ width: "100vw", height: "100vh" }} />
//       <button
//         onClick={dropBox}
//         style={{
//           position: "absolute",
//           top: 20,
//           left: 20,
//           zIndex: 10,
//           padding: "10px 20px",
//         }}
//       >
//         Thả hộp
//       </button>
//     </>
//   );
// }
