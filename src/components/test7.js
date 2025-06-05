// import React, { useEffect, useRef } from "react";
// import * as THREE from "three";
// import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
// import * as CANNON from "cannon-es";

// export default function App() {
//   const containerRef = useRef();
//   const worldRef = useRef();
//   const objectsRef = useRef([]);

//   useEffect(() => {
//     const width = window.innerWidth;
//     const height = window.innerHeight;

//     // === THREE.JS SETUP ===
//     const scene = new THREE.Scene();
//     scene.background = new THREE.Color(0xeeeeee);

//     const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
//     camera.position.set(0, 50, 100);

//     const renderer = new THREE.WebGLRenderer({ antialias: true });
//     renderer.setSize(width, height);
//     containerRef.current.appendChild(renderer.domElement);

//     const controls = new OrbitControls(camera, renderer.domElement);

//     // LIGHTS
//     const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
//     directionalLight.position.set(100, 100, 100);
//     scene.add(directionalLight);
//     scene.add(new THREE.AmbientLight(0xffffff, 0.3));

//     // FLOOR - Three.js
//     const floorSize = 100;
//     const floorGeometry = new THREE.PlaneGeometry(floorSize, floorSize);
//     const floorMaterial = new THREE.MeshStandardMaterial({
//       color: 0x999999,
//       side: THREE.DoubleSide,
//     });
//     const floorMesh = new THREE.Mesh(floorGeometry, floorMaterial);
//     floorMesh.rotation.x = -Math.PI / 2;
//     scene.add(floorMesh);

//     // GRID HELPER
//     const grid = new THREE.GridHelper(floorSize, 20, 0x444444, 0x888888);
//     scene.add(grid);

//     // WALLS (CANNON + THREE)
//     // Tạo 4 bức tường xung quanh phòng dạng box
//     const wallThickness = 2;
//     const wallHeight = 20;
//     const halfFloor = floorSize / 2;

//     const wallMaterial = new THREE.MeshStandardMaterial({ color: 0x555555 });

//     function createWall(position, rotation, size) {
//       // THREE Mesh
//       const geo = new THREE.BoxGeometry(size.x, size.y, size.z);
//       const mesh = new THREE.Mesh(geo, wallMaterial);
//       mesh.position.copy(position);
//       mesh.rotation.y = rotation;
//       scene.add(mesh);

//       // CANNON Body
//       const shape = new CANNON.Box(
//         new CANNON.Vec3(size.x / 2, size.y / 2, size.z / 2)
//       );
//       const body = new CANNON.Body({ mass: 0, shape });
//       body.position.copy(position);
//       body.quaternion.setFromEuler(0, rotation, 0);
//       worldRef.current.addBody(body);
//     }

//     // === CANNON.JS SETUP ===
//     const world = new CANNON.World({
//       gravity: new CANNON.Vec3(0, -9.82, 0),
//     });
//     worldRef.current = world;

//     // Floor (CANNON)
//     const floorBody = new CANNON.Body({
//       mass: 0,
//       shape: new CANNON.Plane(),
//     });
//     floorBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
//     world.addBody(floorBody);

//     // Add walls
//     createWall(
//       new THREE.Vector3(0, wallHeight / 2, -halfFloor), // mặt sau
//       0,
//       new THREE.Vector3(floorSize, wallHeight, wallThickness)
//     );
//     createWall(
//       new THREE.Vector3(0, wallHeight / 2, halfFloor), // mặt trước
//       0,
//       new THREE.Vector3(floorSize, wallHeight, wallThickness)
//     );
//     createWall(
//       new THREE.Vector3(-halfFloor, wallHeight / 2, 0), // bên trái
//       Math.PI / 2,
//       new THREE.Vector3(floorSize, wallHeight, wallThickness)
//     );
//     createWall(
//       new THREE.Vector3(halfFloor, wallHeight / 2, 0), // bên phải
//       Math.PI / 2,
//       new THREE.Vector3(floorSize, wallHeight, wallThickness)
//     );



//     // Tạo giường dạng hộp chữ nhật 3D
//     const bedWidth = 20;
//     const bedHeight = 5;
//     const bedDepth = 10;

//     // THREE Mesh giường
//     const bedGeometry = new THREE.BoxGeometry(bedWidth, bedHeight, bedDepth);
//     const bedMaterial = new THREE.MeshStandardMaterial({ color: 0x884422 });
//     const bedMesh = new THREE.Mesh(bedGeometry, bedMaterial);
//     bedMesh.position.set(0, bedHeight / 2, 0); // đặt trên mặt đất
//     scene.add(bedMesh);

//     // CANNON Body giường
//     const bedShape = new CANNON.Box(
//       new CANNON.Vec3(bedWidth / 2, bedHeight / 2, bedDepth / 2)
//     );
//     const bedBody = new CANNON.Body({
//       // mass: 0, // đặt =0 nếu bạn muốn nó cố định
//       mass: 1, // > 0 để nó động
//       shape: bedShape,
//       position: new CANNON.Vec3(45, bedHeight / 2, 0),
//       material: new CANNON.Material({ friction: 0.4, restitution: 0 }),
//     });
//     world.addBody(bedBody);

//     // Lưu để đồng bộ vị trí
//     objectsRef.current.push({ mesh: bedMesh, body: bedBody });
//     // Giả sử bedBody có mass > 0 (ví dụ 1)
//     const step = 1;

//     window.addEventListener("keydown", (e) => {
//       let newPos = bedBody.position.clone();

//       if (e.key === "ArrowUp") newPos.z -= step;
//       else if (e.key === "ArrowDown") newPos.z += step;
//       else if (e.key === "ArrowLeft") newPos.x -= step;
//       else if (e.key === "ArrowRight") newPos.x += step;

//       // Đặt vị trí mới cho body
//       bedBody.position.copy(newPos);

//       // Sau đó call world.step(1/60) để vật lý cập nhật va chạm
//       // Vị trí body.position có thể được chỉnh lại nếu chạm tường
//     });

//     // Hàm thả vật thể ngẫu nhiên hình cầu hoặc tam giác
//     const dropRandomObject = () => {
//       const type = Math.random() < 0.5 ? "sphere" : "pyramid";
//       const color = Math.random() * 0xffffff;

//       // Vị trí rơi random gần trung tâm ±30
//       const x = (Math.random() - 0.5) * 60;
//       const z = (Math.random() - 0.5) * 60;
//       const y = 50;

//       let mesh, body;

//       if (type === "sphere") {
//         const radius = 3 + Math.random() * 2;
//         // Three.js mesh
//         const sphereGeo = new THREE.SphereGeometry(radius, 32, 32);
//         const sphereMat = new THREE.MeshStandardMaterial({ color });
//         mesh = new THREE.Mesh(sphereGeo, sphereMat);
//         mesh.position.set(x, y, z);
//         scene.add(mesh);

//         // Cannon body
//         const shape = new CANNON.Sphere(radius);
//         body = new CANNON.Body({
//           mass: 1,
//           shape,
//           position: new CANNON.Vec3(x, y, z),
//           material: new CANNON.Material({ friction: 0.4, restitution: 0.7 }),
//         });
//         world.addBody(body);
//       } else {
//         // Pyramid dạng hình chóp tam giác (cylinder 3 cạnh)
//         const radius = 5;
//         const height = 7;
//         const coneGeo = new THREE.ConeGeometry(radius, height, 3);
//         const coneMat = new THREE.MeshStandardMaterial({ color });
//         mesh = new THREE.Mesh(coneGeo, coneMat);
//         mesh.position.set(x, y, z);
//         scene.add(mesh);

//         // Cannon shape gần đúng: cylinder 3 cạnh
//         const shape = new CANNON.Cylinder(0.1, radius, height, 3);
//         body = new CANNON.Body({
//           mass: 1,
//           shape,
//           position: new CANNON.Vec3(x, y, z),
//           material: new CANNON.Material({ friction: 0.4, restitution: 0.5 }),
//         });
//         // Xoay thân thẳng đứng
//         body.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
//         world.addBody(body);
//       }

//       objectsRef.current.push({ mesh, body });
//     };

//     // Gán cho console để dễ test
//     window.dropRandomObject = dropRandomObject;
//     console.log("Gõ dropRandomObject() trong console để thả vật thể!");

//     // ANIMATION LOOP
//     const clock = new THREE.Clock();

//     const animate = () => {
//       requestAnimationFrame(animate);

//       const delta = clock.getDelta();
//       world.step(1 / 60, delta);

//       // Đồng bộ vị trí, xoay vật thể từ Cannon sang Three.js
//       objectsRef.current.forEach(({ mesh, body }) => {
//         mesh.position.copy(body.position);
//         mesh.quaternion.copy(body.quaternion);
//       });

//       controls.update();
//       renderer.render(scene, camera);
//     };
//     animate();

//     // Cleanup khi unmount
//     return () => {
//       renderer.dispose();
//       containerRef.current.removeChild(renderer.domElement);
//     };
//   }, []);

//   return <div ref={containerRef} style={{ width: "100vw", height: "100vh" }} />;
// }




import React, { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import * as CANNON from "cannon-es";

export default function App() {

  const containerRef = useRef();
  const worldRef = useRef();
  const objectsRef = useRef([]);
  const bedBodyRef = useRef();

  useEffect(() => {
    const width = window.innerWidth;
    const height = window.innerHeight;

    // === THREE.JS SETUP ===
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xeeeeee);

    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
    camera.position.set(0, 50, 100);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    containerRef.current.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);

    // LIGHTS
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(100, 100, 100);
    scene.add(directionalLight);
    scene.add(new THREE.AmbientLight(0xffffff, 0.3));

    // FLOOR - Three.js
    const floorSize = 100;
    const floorGeometry = new THREE.PlaneGeometry(floorSize, floorSize);
    const floorMaterial = new THREE.MeshStandardMaterial({
      color: 0x999999,
      side: THREE.DoubleSide,
    });
    const floorMesh = new THREE.Mesh(floorGeometry, floorMaterial);
    floorMesh.rotation.x = -Math.PI / 2;
    scene.add(floorMesh);

    // GRID HELPER
    const grid = new THREE.GridHelper(floorSize, 20, 0x444444, 0x888888);
    scene.add(grid);

    // === CANNON.JS SETUP ===
    const world = new CANNON.World({
      gravity: new CANNON.Vec3(0, -9.82, 0),
    });
    world.broadphase = new CANNON.SAPBroadphase(world);
    world.solver.iterations = 20;
    worldRef.current = world;

    // MATERIALS
    const wallMaterial = new CANNON.Material("wallMaterial");
    const bedMaterial = new CANNON.Material("bedMaterial");
    const floorMaterialCannon = new CANNON.Material("floorMaterial");

    // CONTACT MATERIAL to soften collisions between bed and wall
    const bedWallContact = new CANNON.ContactMaterial(
      wallMaterial,
      bedMaterial,
      {
        friction: 0.4,
        restitution: 0,
        contactEquationStiffness: 1e6,
        contactEquationRelaxation: 3,
      }
    );
    world.addContactMaterial(bedWallContact);

    const bedFloorContact = new CANNON.ContactMaterial(
      floorMaterialCannon,
      bedMaterial,
      {
        friction: 0.5,
        restitution: 0,
      }
    );
    world.addContactMaterial(bedFloorContact);

    // FLOOR (CANNON)
    const floorBody = new CANNON.Body({
      mass: 0,
      shape: new CANNON.Plane(),
      material: floorMaterialCannon,
    });
    floorBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
    world.addBody(floorBody);

    // WALLS (CANNON + THREE)
    const wallThickness = 2;
    const wallHeight = 20;
    const halfFloor = floorSize / 2;

    const wallMaterialThree = new THREE.MeshStandardMaterial({ color: 0x555555 });

    function createWall(position, rotation, size) {
      // THREE Mesh
      const geo = new THREE.BoxGeometry(size.x, size.y, size.z);
      const mesh = new THREE.Mesh(geo, wallMaterialThree);
      mesh.position.copy(position);
      mesh.rotation.y = rotation;
      scene.add(mesh);

      // CANNON Body
      const shape = new CANNON.Box(
        new CANNON.Vec3(size.x / 2, size.y / 2, size.z / 2)
      );
      const body = new CANNON.Body({ mass: 0, shape, material: wallMaterial });
      body.position.set(position.x, position.y, position.z);
      body.quaternion.setFromEuler(0, rotation, 0);
      world.addBody(body);
    }

    // Create 4 walls
    createWall(
      new THREE.Vector3(0, wallHeight / 2, -halfFloor), // back
      0,
      new THREE.Vector3(floorSize, wallHeight, wallThickness)
    );
    createWall(
      new THREE.Vector3(0, wallHeight / 2, halfFloor), // front
      0,
      new THREE.Vector3(floorSize, wallHeight, wallThickness)
    );
    createWall(
      new THREE.Vector3(-halfFloor, wallHeight / 2, 0), // left
      Math.PI / 2,
      new THREE.Vector3(floorSize, wallHeight, wallThickness)
    );
    createWall(
      new THREE.Vector3(halfFloor, wallHeight / 2, 0), // right
      Math.PI / 2,
      new THREE.Vector3(floorSize, wallHeight, wallThickness)
    );

    // GIƯỜNG (Bed) - Box
    const bedWidth = 20;
    const bedHeight = 5;
    const bedDepth = 10;

    // THREE Mesh
    const bedGeometry = new THREE.BoxGeometry(bedWidth, bedHeight, bedDepth);
    const bedMaterialThree = new THREE.MeshStandardMaterial({ color: 0x884422 });
    const bedMesh = new THREE.Mesh(bedGeometry, bedMaterialThree);
    bedMesh.position.set(0, bedHeight / 2, 0);
    scene.add(bedMesh);

    // CANNON Body
    const bedShape = new CANNON.Box(
      new CANNON.Vec3(bedWidth / 2, bedHeight / 2, bedDepth / 2)
    );
    const bedBody = new CANNON.Body({
      mass: 1, // động
      shape: bedShape,
      position: new CANNON.Vec3(100, bedHeight / 2, 0),
      material: bedMaterial,
      linearDamping: 0.9, // giảm tốc độ tự nhiên
      angularDamping: 0.9,
    });
    world.addBody(bedBody);
    bedBodyRef.current = bedBody;

    objectsRef.current.push({ mesh: bedMesh, body: bedBody });

    // Giới hạn vị trí giường trong phòng (cách tường tối thiểu)
    const limitX = halfFloor - wallThickness - bedWidth / 2;
    const limitZ = halfFloor - wallThickness - bedDepth / 2;

    // Di chuyển giường bằng velocity mượt mà, reset velocity khi không nhấn phím
    const velocityStep = 10;

    const keysPressed = { ArrowUp: false, ArrowDown: false, ArrowLeft: false, ArrowRight: false };

    function updateVelocity() {
      if (!bedBodyRef.current) return;

      let vx = 0,
        vz = 0;

      if (keysPressed.ArrowUp) vz -= velocityStep;
      if (keysPressed.ArrowDown) vz += velocityStep;
      if (keysPressed.ArrowLeft) vx -= velocityStep;
      if (keysPressed.ArrowRight) vx += velocityStep;

      bedBodyRef.current.velocity.set(vx, bedBodyRef.current.velocity.y, vz);
    }

    window.addEventListener("keydown", (e) => {
      if (e.key in keysPressed) {
        keysPressed[e.key] = true;
        updateVelocity();
      }
    });

    window.addEventListener("keyup", (e) => {
      if (e.key in keysPressed) {
        keysPressed[e.key] = false;
        updateVelocity();
      }
    });

    // ANIMATION LOOP
    const clock = new THREE.Clock();

    function clampPosition() {
      if (!bedBodyRef.current) return;

      const pos = bedBodyRef.current.position;

      // Giới hạn X
      if (pos.x > limitX) {
        pos.x = limitX;
        bedBodyRef.current.velocity.x = 0;
      } else if (pos.x < -limitX) {
        pos.x = -limitX;
        bedBodyRef.current.velocity.x = 0;
      }

      // Giới hạn Z
      if (pos.z > limitZ) {
        pos.z = limitZ;
        bedBodyRef.current.velocity.z = 0;
      } else if (pos.z < -limitZ) {
        pos.z = -limitZ;
        bedBodyRef.current.velocity.z = 0;
      }
    }

    const animate = () => {
      requestAnimationFrame(animate);

      const delta = clock.getDelta();
      world.step(1 / 60, delta);

      clampPosition();

      // Đồng bộ mesh với body
      objectsRef.current.forEach(({ mesh, body }) => {
        mesh.position.copy(body.position);
        mesh.quaternion.copy(body.quaternion);
      });

      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // Cleanup
    return () => {
      renderer.dispose();
      containerRef.current.removeChild(renderer.domElement);
    };
  }, []);

  return <div ref={containerRef} style={{ width: "100vw", height: "100vh" }} />;
}
