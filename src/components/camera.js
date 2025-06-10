import React, { useEffect, useRef } from 'react'
import * as THREE from 'three'

export default function MultiCameraScene() {
  const container1Ref = useRef(null)
  const container2Ref = useRef(null)

  useEffect(() => {
    // COMMON SCENE SETUP
    const scene = new THREE.Scene()

    // CAMERA 1
    const camera1 = new THREE.PerspectiveCamera(75, 1, 0.1, 1000)
    camera1.position.z = 5
    camera1.layers.enable(1) // camera1 sees layer 1

    // CAMERA 2
    const camera2 = new THREE.PerspectiveCamera(75, 1, 0.1, 1000)
    camera2.position.z = 5
    camera2.layers.enable(2) // camera2 sees layer 2

    // RENDERERS
    const renderer1 = new THREE.WebGLRenderer()
    renderer1.setSize(400, 400)
    container1Ref.current.appendChild(renderer1.domElement)

    const renderer2 = new THREE.WebGLRenderer()
    renderer2.setSize(400, 400)
    container2Ref.current.appendChild(renderer2.domElement)

    // LIGHT
    const light = new THREE.DirectionalLight(0xffffff, 1)
    light.position.set(0, 1, 1).normalize()
    scene.add(light)

    // Box1 – only camera1 (layer 1)
    const box1 = new THREE.Mesh(
      new THREE.BoxGeometry(),
      new THREE.MeshStandardMaterial({ color: 'red' })
    )
    box1.position.x = -2
    box1.layers.set(1)
    scene.add(box1)

    // Box2 – only camera2 (layer 2)
    const box2 = new THREE.Mesh(
      new THREE.BoxGeometry(),
      new THREE.MeshStandardMaterial({ color: 'yellow' })
    )
    box2.position.x = 0
    box2.layers.set(2)
    scene.add(box2)

    // Box3 – both cameras (layers 1 and 2)
    const box3 = new THREE.Mesh(
      new THREE.BoxGeometry(),
      new THREE.MeshStandardMaterial({ color: 'blue' })
    )
    box3.position.x = 2
    box3.layers.enable(1)
    // box3.layers.enable(2)
    scene.add(box3)

    // // Box4 – not visible to any camera (layer 3)
    // const box4 = new THREE.Mesh(
    //   new THREE.BoxGeometry(),
    //   new THREE.MeshStandardMaterial({ color: 'pink' })
    // )
    // box4.position.x = 3
    // box4.layers.enable(1)
    // scene.add(box4)

    // Render both cameras
    function animate() {
      requestAnimationFrame(animate)
      renderer1.render(scene, camera1)
      renderer2.render(scene, camera2)
    }
    animate()

    return () => {
      // Clean up on unmount
      renderer1.dispose()
      renderer2.dispose()
      container1Ref.current.innerHTML = ''
      container2Ref.current.innerHTML = ''
    }
  }, [])

  return (
    <div style={{ display: 'flex' }}>
      <div ref={container1Ref} id="div1" />
      <div ref={container2Ref} id="div2" />
    </div>
  )
}
