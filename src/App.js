// import React, { useRef, useEffect } from "react";
// import * as THREE from "three";
// import { OrbitControls, DragControls } from "three-stdlib";
// import Test from "./components/test";
// import Test2 from "./components/test2";
// import Test3 from "./components/test3";
// import Test4 from "./components/test4";
// import Test5 from "./components/test5";
// import Test6 from "./components/test6";
// import Light from "./components/light";
// import AddGroupThree from "./components/addGroupThree";

// function App() {
//   const testRef = useRef();
//   // const mountRef = useRef(null);

//   // useEffect(() => {
//   //   // Scene
//   //   const scene = new THREE.Scene();
//   //   scene.background = new THREE.Color("#fff");

//   //   // Camera
//   //   const camera = new THREE.PerspectiveCamera(
//   //     75,
//   //     window.innerWidth / window.innerHeight,
//   //     0.1,
//   //     1000
//   //   );
//   //   camera.position.set(0, 0, 100);

//   //   // Renderer
//   //   const renderer = new THREE.WebGLRenderer({ antialias: true });
//   //   renderer.setSize(window.innerWidth, window.innerHeight);
//   //   mountRef.current.appendChild(renderer.domElement);

//   //   // // Ánh sáng
//   //   // const light = new THREE.DirectionalLight(0xffffff, 1);
//   //   // light.position.set(1, 1, 1).normalize();
//   //   // scene.add(light);

//   //   // // Mảng chứa các khối để DragControls
//   //   const objects = [];

//   //   // // Tạo 100 khối hộp với vị trí và màu sắc ngẫu nhiên
//   //   // for (let i = 0; i < 100; i++) {
//   //   //   const geometry = new THREE.BoxGeometry(5, 5, 5);
//   //   //   const material = new THREE.MeshPhongMaterial({
//   //   //     color: Math.random() * 0xffffff,
//   //   //   });
//   //   //   const cube = new THREE.Mesh(geometry, material);
//   //   //   cube.position.set(
//   //   //     Math.random() * 200 - 100,
//   //   //     Math.random() * 200 - 100,
//   //   //     Math.random() * 200 - 100
//   //   //   );
//   //   //   scene.add(cube);
//   //   //   objects.push(cube);
//   //   // }

//   //   // OrbitControls: xoay camera
//   //   const orbitControls = new OrbitControls(camera, renderer.domElement);
//   //   orbitControls.enableDamping = true;

//   //   // DragControls: kéo thả khối
//   //   const dragControls = new DragControls(objects, camera, renderer.domElement);

//   //   // Highlight khi đang kéo
//   //   dragControls.addEventListener("dragstart", (event) => {
//   //     orbitControls.enabled = false;
//   //     event.object.material.emissive.set(0x333333);
//   //   });

//   //   dragControls.addEventListener("dragend", (event) => {
//   //     orbitControls.enabled = true;
//   //     event.object.material.emissive.set(0x000000);
//   //   });

//   //   // Resize window
//   //   const handleResize = () => {
//   //     camera.aspect = window.innerWidth / window.innerHeight;
//   //     camera.updateProjectionMatrix();
//   //     renderer.setSize(window.innerWidth, window.innerHeight);
//   //   };
//   //   window.addEventListener("resize", handleResize);

//   //   // Animation loop
//   //   const animate = () => {
//   //     requestAnimationFrame(animate);
//   //     orbitControls.update();
//   //     renderer.render(scene, camera);
//   //   };

//   //   animate();

//   //   // Cleanup
//   //   return () => {
//   //     mountRef.current.removeChild(renderer.domElement);
//   //     window.removeEventListener("resize", handleResize);
//   //     renderer.dispose();
//   //   };
//   // }, []);

//   // return <div ref={mountRef} />;
//   const saveModelGLB = () => {
//     console.log("saveModelGLB");
//     if (testRef.current) {
//       testRef.current.exportGLB();
//     }
//   };
//   return (
//     <>
//       <button onClick={saveModelGLB}>save model(export to .glb)</button>
//       <div>
//         {/* <Test ref={testRef} /> */}
//         {/* <Test2 /> */}
//         {/* <Test3 /> */}
//         {/* <Test4 /> */}
//         {/* <Test5 ref={testRef} /> */}
//         {/* <Test6/> */}
//         <Light />
//         {/* <AddGroupThree /> */}
//       </div>
//     </>
//   );
// }

// export default App;




// App.js
import React, { useRef, useState } from 'react';
import FloorplanViewer from './components/floorplanViewer';
import FloorplanViewer2 from './components/floorplanViewer2';
import { Button as BtnMaterial} from '@mui/material';
import './styles/floorplanViewer.css'
import RangeSlider from "react-range-slider-input";
import "react-range-slider-input/dist/style.css";
import "./react-range-slider-input.css";


function App() {
  const refExportModel = useRef();
  const refChonAnh = useRef()
  const [dataDeepFloorplan, setDataDeepFloorplan] = useState({})
  const [wallHeight, setWallHeight] = useState([0, 5])
  const [wallHeightT, setWallHeightT] = useState([0, 5])
  const chonAnh = () => {
    if (refChonAnh && refChonAnh.current) {
      refChonAnh.current.click(); // ← kích hoạt input file
    }
  }

  const handleFileChange = async (event) => {
    const file = event.target.files[0];
    if (file) {
      await uploadFile(file);

      // Reset input sau khi xử lý
      refChonAnh.current.value = '';
    }
  };

  const uploadFile = async (file) => {
    const formData = new FormData();
    formData.append('image', file); // 'image' là tên field backend mong đợi

    try {
      const response = await fetch('http://127.0.0.1:8000/TF2-DeepFloorplan', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error("Upload failed");

      const responseJson = await response.json();
      if (responseJson && responseJson.data && responseJson.data.wall && responseJson.data.wall[0] && responseJson.data.wall[0].points && responseJson.data.wall[0].points.length && responseJson.data.sizeImg && responseJson.data.sizeImg[0] && responseJson.data.sizeImg[1]) {
        setDataDeepFloorplan(responseJson.data)
      }
    } catch (error) {
      console.error("Lỗi upload:", error);
    }
  };
    const saveModelGLB = () => {
    if (refExportModel.current) {
      refExportModel.current.exportGLB();
    }
  };
  return (
    <>
      <input className="hidden"
        type="file"
        accept="image/*"
        ref={refChonAnh}
        onChange={handleFileChange}></input>
      <div className='flex items-center'>
        <div className='flex items-center' >
          <BtnMaterial size="small" onClick={saveModelGLB} variant="contained">save model(export to .glb)</BtnMaterial>
          </div>
         <BtnMaterial size="small" onClick={chonAnh} type="button" variant="contained" className="!ml-[8px]">Chọn ảnh</BtnMaterial>
      </div>
      <div style={{ height: '100%', width: '100%', margin: 0, padding: 0,overflow:'hidden' }}>
        <div className=''>
          <span className='mt-[10px] inline-block'>Wall height: {wallHeight[1]}</span><br></br>
          <div>
            <RangeSlider
              value={wallHeightT}
              onInput={setWallHeightT}
              onThumbDragEnd={() => {
                setWallHeight(wallHeightT); // chỉ cập nhật khi thả chuột
              }}
              className="single-thumb flex items-center"
              defaultValue={[0, 5]}
              thumbsDisabled={[true, false]}
              rangeSlideDisabled={true}
              min={1}
              max={30}
            />
          </div>
        </div>
        {/* <FloorplanScene /> */}
        {/* <FiberEx1 /> */}
        {/* <AddSencery /> */}
        {/* <FloorplanViewer dataDeepFloorplan={dataDeepFloorplan} wallHeight={wallHeight[1]} ref={refExportModel} /> */}
        <FloorplanViewer2 dataDeepFloorplan={dataDeepFloorplan} wallHeight={wallHeight[1]} ref={refExportModel} />
      </div>
    </>
  );
}

export default App;











