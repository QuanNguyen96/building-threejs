// import React, { useEffect, useRef } from "react";
// import * as THREE from "three";
// import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
// import { AmmoPhysics } from "three/examples/jsm/physics/AmmoPhysics.js";
// import Stats from "three/examples/jsm/libs/stats.module.js";

// export default function AmmoPhysicsScene() {
//   const mountRef = useRef();

//   useEffect(() => {
//     // Tạo thẻ script để load ammo.wasm.js
//     const script = document.createElement("script");
//     script.src = "/libs/ammo.wasm.js";
//     script.async = true;

//     script.onload = () => {
//       if (typeof window.Ammo === "undefined") {
//         console.error("Ammo failed to load.");
//         return;
//       }
//       init(); // Bắt đầu scene sau khi Ammo đã sẵn sàng
//     };

//     document.body.appendChild(script);

//     let camera, scene, renderer, stats, physics, position;
//     let boxes, spheres;
//     let animationId;
//     let controls;

//     async function init() {
//       physics = await AmmoPhysics(); // sử dụng AmmoPhysics sau khi window.Ammo đã có
//       if (!physics) {
//         console.error("AmmoPhysics failed to initialize.");
//         return;
//       }

//       position = new THREE.Vector3();

//       camera = new THREE.PerspectiveCamera(
//         50,
//         window.innerWidth / window.innerHeight,
//         0.1,
//         100
//       );
//       camera.position.set(-1, 1.5, 2);
//       camera.lookAt(0, 0.5, 0);

//       scene = new THREE.Scene();
//       scene.background = new THREE.Color(0x666666);

//       const hemiLight = new THREE.HemisphereLight();
//       scene.add(hemiLight);

//       const dirLight = new THREE.DirectionalLight(0xffffff, 3);
//       dirLight.position.set(5, 5, 5);
//       dirLight.castShadow = true;
//       dirLight.shadow.camera.zoom = 2;
//       scene.add(dirLight);

//       const shadowPlane = new THREE.Mesh(
//         new THREE.PlaneGeometry(10, 10),
//         new THREE.ShadowMaterial({ color: 0x444444 })
//       );
//       shadowPlane.rotation.x = -Math.PI / 2;
//       shadowPlane.receiveShadow = true;
//       scene.add(shadowPlane);

//       const floorCollider = new THREE.Mesh(
//         new THREE.BoxGeometry(10, 5, 10),
//         new THREE.MeshBasicMaterial({ color: 0x666666 })
//       );
//       floorCollider.position.y = -2.5;
//       floorCollider.userData.physics = { mass: 0 };
//       floorCollider.visible = false;
//       scene.add(floorCollider);

//       const material = new THREE.MeshLambertMaterial();
//       const matrix = new THREE.Matrix4();
//       const color = new THREE.Color();

//       const geometryBox = new THREE.BoxGeometry(0.075, 0.075, 0.075);
//       boxes = new THREE.InstancedMesh(geometryBox, material, 400);
//       boxes.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
//       boxes.castShadow = true;
//       boxes.receiveShadow = true;
//       boxes.userData.physics = { mass: 1 };
//       scene.add(boxes);

//       for (let i = 0; i < boxes.count; i++) {
//         matrix.setPosition(
//           Math.random() - 0.5,
//           Math.random() * 2,
//           Math.random() - 0.5
//         );
//         boxes.setMatrixAt(i, matrix);
//         boxes.setColorAt(i, color.setHex(0xffffff * Math.random()));
//       }

//       const geometrySphere = new THREE.IcosahedronGeometry(0.05, 4);
//       spheres = new THREE.InstancedMesh(geometrySphere, material, 400);
//       spheres.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
//       spheres.castShadow = true;
//       spheres.receiveShadow = true;
//       spheres.userData.physics = { mass: 1 };
//       scene.add(spheres);

//       for (let i = 0; i < spheres.count; i++) {
//         matrix.setPosition(
//           Math.random() - 0.5,
//           Math.random() * 2,
//           Math.random() - 0.5
//         );
//         spheres.setMatrixAt(i, matrix);
//         spheres.setColorAt(i, color.setHex(0xffffff * Math.random()));
//       }

//       physics.addScene(scene);

//       renderer = new THREE.WebGLRenderer({ antialias: true });
//       renderer.setPixelRatio(window.devicePixelRatio);
//       renderer.setSize(window.innerWidth, window.innerHeight);
//       renderer.shadowMap.enabled = true;
//       mountRef.current.appendChild(renderer.domElement);

//       stats = new Stats();
//       mountRef.current.appendChild(stats.dom);

//       controls = new OrbitControls(camera, renderer.domElement);
//       controls.target.y = 0.5;
//       controls.update();

//       window.addEventListener("resize", onWindowResize);

//       setInterval(() => {
//         console.log("boxes.count=", boxes.count);
//         let index = Math.floor(Math.random() * boxes.count);
//         position.set(0, Math.random() + 1, 0);
//         physics.setMeshPosition(boxes, position, index);

//         index = Math.floor(Math.random() * spheres.count);
//         position.set(0, Math.random() + 1, 0);
//         physics.setMeshPosition(spheres, position, index);
//       }, 1000 / 60);

//       animate();
//     }

//     function animate() {
//       animationId = requestAnimationFrame(animate);
//       renderer.render(scene, camera);
//       stats.update();
//     }

//     function onWindowResize() {
//       camera.aspect = window.innerWidth / window.innerHeight;
//       camera.updateProjectionMatrix();
//       renderer.setSize(window.innerWidth, window.innerHeight);
//     }

//     return () => {
//       cancelAnimationFrame(animationId);
//       window.removeEventListener("resize", onWindowResize);
//       if (renderer && renderer.domElement) {
//         mountRef.current.removeChild(renderer.domElement);
//         renderer.dispose();
//       }
//       if (stats && stats.dom) {
//         mountRef.current.removeChild(stats.dom);
//       }
//       document.body.removeChild(script);
//     };
//   }, []);

//   return <div ref={mountRef} style={{ width: "100vw", height: "100vh" }} />;
// }

import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { TransformControls } from "three/examples/jsm/controls/TransformControls";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

export default function PhysicsDemoWithControls() {
  const mountRef = useRef();
  const [mode, setMode] = useState("translate");
  const refs = useRef({
    Ammo: null,
    physicsWorld: null,
    tmpTransform: null,
    rigidBodies: [],
    scene: null,
    camera: null,
    renderer: null,
    groundMesh: null,
    groundBody: null,
    transformControl: null,
    orbitControl: null,
  });

  useEffect(() => {
    // Load Ammo wasm js bằng script tag
    const script = document.createElement("script");
    script.src = "/libs/ammo.wasm.js";
    script.async = true;
    script.onload = () => {
      if (!window.Ammo) {
        console.error("Ammo not loaded");
        return;
      }
      window.Ammo().then((AmmoLib) => {
        refs.current.Ammo = AmmoLib;
        init(AmmoLib);
      });
    };
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
      if (refs.current.renderer) {
        refs.current.renderer.dispose();
      }
    };
  }, []);

  const init = (AmmoLib) => {
    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xbfd1e5);
    refs.current.scene = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.2,
      2000
    );
    camera.position.set(0, 15, 30);
    refs.current.camera = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    mountRef.current.appendChild(renderer.domElement);
    refs.current.renderer = renderer;

    // Orbit controls
    const orbit = new OrbitControls(camera, renderer.domElement);
    refs.current.orbitControl = orbit;

    // Light
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444);
    hemiLight.position.set(0, 20, 0);
    scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(0xffffff);
    dirLight.position.set(-3, 10, -10);
    scene.add(dirLight);

    // Ammo physics world
    const collisionConfig = new AmmoLib.btDefaultCollisionConfiguration();
    const dispatcher = new AmmoLib.btCollisionDispatcher(collisionConfig);
    const broadphase = new AmmoLib.btDbvtBroadphase();
    const solver = new AmmoLib.btSequentialImpulseConstraintSolver();
    const physicsWorld = new AmmoLib.btDiscreteDynamicsWorld(
      dispatcher,
      broadphase,
      solver,
      collisionConfig
    );
    physicsWorld.setGravity(new AmmoLib.btVector3(0, -9.8, 0));
    refs.current.physicsWorld = physicsWorld;
    refs.current.tmpTransform = new AmmoLib.btTransform();

    // Create ground plane (visual only)
    const groundGeo = new THREE.PlaneGeometry(50, 50);
    const groundMat = new THREE.MeshStandardMaterial({ color: 0x556655 });
    const groundMesh = new THREE.Mesh(groundGeo, groundMat);
    groundMesh.rotation.x = -Math.PI / 2;
    groundMesh.receiveShadow = true;
    scene.add(groundMesh);

    // Create physics ground (box collider) - initial size and position
    const groundSize = new THREE.Vector3(10, 2, 10);
    const groundPos = new THREE.Vector3(0, 1, 0); // y=1 vì box cao 2, nằm trên plane
    const groundBox = createPhysicsBox(
      AmmoLib,
      physicsWorld,
      groundPos,
      groundSize,
      0,
      0x8888ff
    );
    refs.current.groundMesh = groundBox.mesh;
    refs.current.groundBody = groundBox.body;
    scene.add(groundBox.mesh);
    refs.current.rigidBodies.push(groundBox.mesh);

    // TransformControls setup
    const transformControl = new TransformControls(camera, renderer.domElement);
    transformControl.attach(groundBox.mesh);
    transformControl.setMode(mode);
    scene.add(transformControl.getHelper());
    refs.current.transformControl = transformControl;

    // Disable orbit when using transform control
    transformControl.addEventListener("dragging-changed", (event) => {
      orbit.enabled = !event.value;
    });

    // On transform end, update physics collider position and rotation
    transformControl.addEventListener("objectChange", () => {
      updatePhysicsBodyFromMesh(
        refs.current.groundMesh,
        refs.current.groundBody,
        AmmoLib
      );
    });

    // Raycaster for clicking on box (to spawn falling boxes)
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    function onClick(event) {
      // If transform control is dragging, ignore click
      if (transformControl.dragging) return;

      mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObject(groundBox.mesh);
      if (intersects.length > 0) {
        spawnFallingBox(AmmoLib, physicsWorld, scene, refs.current.rigidBodies);
      }
    }

    window.addEventListener("click", onClick);

    // Animation loop
    const clock = new THREE.Clock();

    function animate() {
      const deltaTime = clock.getDelta();
      updatePhysics(deltaTime, AmmoLib);
      renderer.render(scene, camera);
      requestAnimationFrame(animate);
    }

    animate();

    // Resize
    window.addEventListener("resize", () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    });
  };

  function createPhysicsBox(
    AmmoLib,
    physicsWorld,
    position,
    size,
    mass,
    color = 0xffffff
  ) {
    const geometry = new THREE.BoxGeometry(size.x, size.y, size.z);
    const material = new THREE.MeshStandardMaterial({ color });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(position);
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    const transform = new refs.current.Ammo.btTransform();
    transform.setIdentity();
    transform.setOrigin(
      new refs.current.Ammo.btVector3(position.x, position.y, position.z)
    );

    const motionState = new refs.current.Ammo.btDefaultMotionState(transform);

    const halfExtents = new refs.current.Ammo.btVector3(
      size.x / 2,
      size.y / 2,
      size.z / 2
    );
    const shape = new refs.current.Ammo.btBoxShape(halfExtents);

    const localInertia = new refs.current.Ammo.btVector3(0, 0, 0);
    if (mass > 0) shape.calculateLocalInertia(mass, localInertia);

    const rbInfo = new refs.current.Ammo.btRigidBodyConstructionInfo(
      mass,
      motionState,
      shape,
      localInertia
    );
    const body = new refs.current.Ammo.btRigidBody(rbInfo);

    physicsWorld.addRigidBody(body);

    mesh.userData.physicsBody = body;

    return { mesh, body };
  }

  function updatePhysicsBodyFromMesh(mesh, body, AmmoLib) {
    const pos = mesh.position;
    const quat = mesh.quaternion;

    const transform = new AmmoLib.btTransform();
    transform.setIdentity();
    transform.setOrigin(new AmmoLib.btVector3(pos.x, pos.y, pos.z));
    transform.setRotation(
      new AmmoLib.btQuaternion(quat.x, quat.y, quat.z, quat.w)
    );

    body.setWorldTransform(transform);
    body.getMotionState().setWorldTransform(transform);
    body.activate(); // wake up physics body
  }

  function spawnFallingBox(AmmoLib, physicsWorld, scene, rigidBodies) {
    const size = new THREE.Vector3(1, 1, 1);
    const position = new THREE.Vector3(
      (Math.random() - 0.5) * 5,
      15,
      (Math.random() - 0.5) * 5
    );
    const mass = 1;

    const { mesh, body } = createPhysicsBox(
      AmmoLib,
      physicsWorld,
      position,
      size,
      mass,
      0xff0000
    );
    scene.add(mesh);
    rigidBodies.push(mesh);
  }

  function updatePhysics(deltaTime, AmmoLib) {
    const { physicsWorld, rigidBodies, tmpTransform } = refs.current;
    if (!physicsWorld) return;

    physicsWorld.stepSimulation(deltaTime, 10);

    for (const mesh of rigidBodies) {
      const body = mesh.userData.physicsBody;
      const motionState = body.getMotionState();
      if (motionState) {
        motionState.getWorldTransform(tmpTransform);
        const p = tmpTransform.getOrigin();
        const q = tmpTransform.getRotation();
        mesh.position.set(p.x(), p.y(), p.z());
        mesh.quaternion.set(q.x(), q.y(), q.z(), q.w());
      }
    }
  }

  // When mode changes, update transformControl mode
  useEffect(() => {
    if (refs.current.transformControl) {
      refs.current.transformControl.setMode(mode);
    }
  }, [mode]);

  return (
    <>
      <div ref={mountRef} style={{ width: "100vw", height: "100vh" }} />
      <div
        style={{
          position: "absolute",
          top: 10,
          left: 10,
          zIndex: 1000,
          backgroundColor: "rgba(255,255,255,0.8)",
          padding: "8px",
          borderRadius: "8px",
        }}
      >
        <button
          onClick={() => setMode("translate")}
          disabled={mode === "translate"}
        >
          Move
        </button>
        <button onClick={() => setMode("rotate")} disabled={mode === "rotate"}>
          Rotate
        </button>
        <button onClick={() => setMode("scale")} disabled={mode === "scale"}>
          Scale
        </button>
        <p style={{ marginTop: 8, fontSize: 12 }}>
          Click box to drop a red box from above
        </p>
      </div>
    </>
  );
}
