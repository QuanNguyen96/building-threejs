import React, { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'

const RoomScene = () => {
  const containerRef = useRef()

  useEffect(() => {
    // === SCENE SETUP ===
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0xf0f0f0)

    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    )
    camera.position.set(8, 6, 8)
    camera.lookAt(0, 0, 0)

    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setSize(window.innerWidth, window.innerHeight)
    containerRef.current.appendChild(renderer.domElement)

    // === ORBIT CONTROLS ===
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true

    // === LIGHTING ===
    scene.add(new THREE.AmbientLight(0xffffff, 0.5))
    const dirLight = new THREE.DirectionalLight(0xffffff, 1)
    dirLight.position.set(10, 10, 10)
    scene.add(dirLight)

    // === GRID ===
    scene.add(new THREE.GridHelper(20, 20))

    // === CREATE WALL FUNCTION ===
    // function createWall(start, end, height = 2.5, thickness = 0.1) {
    //   const dx = end.x - start.x
    //   const dz = end.z - start.z
    //   const length = Math.sqrt(dx * dx + dz * dz)

    //   const geometry = new THREE.BoxGeometry(length, height, thickness)

    //   const material = new THREE.MeshStandardMaterial({ color: 0x8b4513, wireframe: true }) // brown
    //   const wall = new THREE.Mesh(geometry, material)

    //   const midX = (start.x + end.x) / 2
    //   const midZ = (start.z + end.z) / 2
    //   wall.position.set(midX, height / 2, midZ)

    //   const angle = Math.atan2(dz, dx)
    //   wall.rotation.y = -angle

    //   scene.add(wall)
    // }
    function createWall(start, end, height = 2.5, thickness = 0.1) {
      const dx = end.x - start.x;
      const dz = end.z - start.z;
      const length = Math.sqrt(dx * dx + dz * dz);

      const shape = new THREE.Shape();
      shape.moveTo(0, 0);
      shape.lineTo(0, thickness);
      shape.lineTo(length, thickness);
      shape.lineTo(length, 0);
      shape.lineTo(0, 0);

      const extrudeSettings = {
        steps: 1,
        depth: height,
        bevelEnabled: false,
      };

      const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);

      // Shift geometry để tâm nằm ở giữa (center)
      geometry.translate(-length / 2, -thickness / 2, 0);

      // Quay geometry để depth (Z) thành chiều cao (Y)
      geometry.rotateX(-Math.PI / 2);

      const material = new THREE.MeshStandardMaterial({ color: 0x8b4513, wireframe: true });
      const wall = new THREE.Mesh(geometry, material);

      // Tính trung điểm của start-end
      const midX = (start.x + end.x) / 2;
      const midZ = (start.z + end.z) / 2;

      // Đặt vị trí
      wall.position.set(midX, height / 2, midZ);

      // Góc xoay
      const angle = Math.atan2(dz, dx);
      wall.rotation.y = -angle;

      scene.add(wall);
    }



    // === CREATE 4 WALLS OF THE ROOM ===
    const p1 = new THREE.Vector3(0, 0, 0)
    const p2 = new THREE.Vector3(6, 0, 0)
    const p3 = new THREE.Vector3(6, 0, 4)
    const p4 = new THREE.Vector3(0, 0, 4)

    createWall(p1, p2) // bottom
    createWall(p2, p3) // right
    createWall(p3, p4) // top
    createWall(p4, p1) // left

    // === ANIMATION LOOP ===
    const animate = () => {
      requestAnimationFrame(animate)
      controls.update()
      renderer.render(scene, camera)
    }
    animate()

    // === CLEANUP ===
    return () => {
      renderer.dispose()
      containerRef.current.removeChild(renderer.domElement)
    }
  }, [])

  return <div ref={containerRef} style={{ width: '100vw', height: '100vh' }} />
}

export default RoomScene
