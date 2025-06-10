// import React, { useRef, useEffect, useState } from "react";
// import * as THREE from "three";
// import { OrbitControls, DragControls } from "three-stdlib";
// import Test from "./components/test";
// import Test2 from "./components/test2";
// import Test3 from "./components/test3";
// import Test4 from "./components/test4";
// import Test5 from "./components/test5";
// import Test6 from "./components/test6";
// import Test7 from "./components/test7";
// import Test8 from "./components/test8";
// import Test9 from "./components/test9";
// import Test10 from "./components/test10";
// import Camera from "./components/camera";
// import Minimapcamera from "./components/minimapcamera";
// import Light from "./components/light";
// import ExtrudeGeometry from "./components/ExtrudeGeometry";
// import AddGroupThree from "./components/addGroupThree";
// import AddGroupThree2 from "./components/addGroupThree2";
// import LearnReactjs from "./components/learn-react";
// import SelectionBoxTest1 from "./components/selectionBoxTest1";
// import FloorplanViewer2 from "./components/floorplanViewer2";
// import FloorplanViewer3 from "./components/floorplanViewer3";

// function App() {
//   const testRef = useRef();
//   const [dataDeepFloorplan, setDataDeepFloorplan] = useState({});
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
//   const [wallHeight, setWallHeight] = useState([0, 5]);
//   const [wallHeightT, setWallHeightT] = useState([0, 5]);
//   const refExportModel = useRef();
//   return (
//     <>
//       <button onClick={saveModelGLB}>save model(export to .glb)</button>
//       <div>
//         <div className="flex items-center">
//           <div className="flex items-center">
//             <button size="small" variant="contained">
//               save model(export to .glb)
//             </button>
//           </div>
//           <button
//             size="small"
//             type="button"
//             variant="contained"
//             className="!ml-[8px]"
//           >
//             Chọn ảnh
//           </button>
//         </div>
//         <div
//           style={{
//             height: "100%",
//             width: "100%",
//             margin: 0,
//             padding: 0,
//             overflow: "hidden",
//           }}
//         >
//           <div className="">
//             <span className="mt-[10px] inline-block">Wall height: 232</span>
//             <br></br>
//             <div></div>
//           </div>
//         </div>

//         {/* <Test ref={testRef} /> */}
//         {/* <Test2 /> */}
//         {/* <Test3 /> */}
//         {/* <Test4 /> */}
//         {/* <Test5 ref={testRef} /> */}
//         {/* <Test6 /> */}
//         {/* <Test7 /> */}
//         {/* <Camera /> */}
//         <Minimapcamera />

//         {/* <Test8 /> */}
//         {/* <Test9 /> */}
//         {/* <Test10 /> */}

//         {/* <ExtrudeGeometry /> */}

//         {/* <Light /> */}
//         {/* <AddGroupThree /> */}
//         {/* <AddGroupThree2 /> */}
//         {/* <LearnReactjs /> */}
//         {/* <SelectionBoxTest1 /> */}
//         {/* <FloorplanViewer2 dataDeepFloorplan={dataDeepFloorplan} wallHeight={wallHeight[1]} ref={refExportModel} /> */}
//         {/* <FloorplanViewer3 dataDeepFloorplan={dataDeepFloorplan} wallHeight={wallHeight[1]} ref={refExportModel} /> */}
//       </div>
//     </>
//   );
// }

// export default App;

// // App.js
import React, { useRef, useState } from 'react';
import FloorplanViewer from './components/floorplanViewer';
import FloorplanViewer2 from './components/floorplanViewer2';
import Home from './components/home';
import Home1 from './components/home1';
import { Button as BtnMaterial } from '@mui/material';
import './styles/floorplanViewer.css'
import RangeSlider from "react-range-slider-input";
import "react-range-slider-input/dist/style.css";
import "./react-range-slider-input.css";

function extractBoxes(grid) {
  const rows = grid.length;
  const cols = grid[0].length;
  const visited = Array.from({ length: rows }, () => Array(cols).fill(false));

  const boxes = [];

  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      if (grid[i][j] !== 1 || visited[i][j]) continue;

      // Tìm độ rộng theo X (j)
      let width = 1;
      while (j + width < cols && grid[i][j + width] === 1 && !visited[i][j + width]) {
        width++;
      }

      // Tìm độ dài theo Z (i)
      let height = 1;
      let canExpand = true;
      while (i + height < rows && canExpand) {
        for (let dj = 0; dj < width; dj++) {
          if (grid[i + height][j + dj] !== 1 || visited[i + height][j + dj]) {
            canExpand = false;
            break;
          }
        }
        if (canExpand) height++;
      }

      // Đánh dấu đã dùng
      for (let di = 0; di < height; di++) {
        for (let dj = 0; dj < width; dj++) {
          visited[i + di][j + dj] = true;
        }
      }

      boxes.push({
        x: j,              // cột
        y: 0,              // mặc định
        z: i,              // hàng
        width: width,
        height: 2.5,       // chiều cao tường
        depth: height
      });
    }
  }

  return boxes;
}
function findRectangles(matrix) {
  const rows = matrix.length;
  const cols = matrix[0].length;
  const visited = Array.from({ length: rows }, () => Array(cols).fill(false));
  const rectangles = [];

  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      if (matrix[i][j] === 1 && !visited[i][j]) {
        // Tìm giới hạn phải (cột)
        let maxCol = j;
        while (
          maxCol + 1 < cols &&
          matrix[i][maxCol + 1] === 1 &&
          !visited[i][maxCol + 1]
        ) {
          maxCol++;
        }

        // Tìm giới hạn dưới (dòng)
        let rowEnd = i;
        let canExpandDown = true;
        while (canExpandDown && rowEnd + 1 < rows) {
          for (let k = j; k <= maxCol; k++) {
            if (matrix[rowEnd + 1][k] !== 1 || visited[rowEnd + 1][k]) {
              canExpandDown = false;
              break;
            }
          }
          if (canExpandDown) rowEnd++;
        }

        // Đánh dấu đã duyệt
        for (let r = i; r <= rowEnd; r++) {
          for (let c = j; c <= maxCol; c++) {
            visited[r][c] = true;
          }
        }

        rectangles.push({
          x: j,
          y: i,
          width: maxCol - j + 1,
          height: rowEnd - i + 1,
        });
      }
    }
  }

  return rectangles;
}

function createLabeledArray(m, n, indices) {
  // Khởi tạo mảng 2 chiều toàn 0
  const array = Array.from({ length: m }, () => Array(n).fill(0));

  // Gán giá trị 1 cho các chỉ số có trong mảng indices
  for (const [i, j] of indices) {
    if (i >= 0 && i < m && j >= 0 && j < n) {
      array[i][j] = 1;
    }
  }

  return array;
}

function App() {
  const refExportModel = useRef();
  const refChonAnh = useRef()
  const [dataDeepFloorplan, setDataDeepFloorplan] = useState({})
  const [wallHeight, setWallHeight] = useState([0, 5])
  const [wallHeightT, setWallHeightT] = useState([0, 5])
  const [mergeWallsT, setmergeWallsT] = useState([])
  const [modelName, setModelName] = useState('')
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
    // let data2 = {
    //   sizeImg: [600, 450],
    //   wall: [
    //     // { start: [0, 90], end: [0, 100] },
    //     // { start: [0, 200], end: [200, 0] },
    //     { start: [0, 0], end: [0, 400] },
    //     //
    //     { start: [0, 400], end: [400, 400] },
    //     { start: [400, 400], end: [400, 0] },
    //     { start: [400, 0], end: [0, 0] }
    //   ]
    // }
    // let wall = [];
    // let points = []
    // for (let i = 0; i <= 400; i++) {
    //   wall.push({ start: [0, 0], end: [0, i] })
    //   for (let j = 0; j <= 20; j++) {
    //     points.push([j, i])
    //   }
    // }
    // for (let i = 0; i <= 400; i++) {
    //   wall.push({ start: [0, 400], end: [i, 400] })
    //   points.push([i, 400])
    // }
    // for (let i = 0; i <= 400; i++) {
    //   wall.push({ start: [400, 400 - i], end: [400, 400 - i] })
    //   // points.push([400, 400 - i])
    //   for (let j = 0; j <= 10; j++) {
    //     points.push([400 - j, 400 - i])
    //   }
    // }
    // for (let i = 0; i <= 400; i++) {
    //   wall.push({ start: [400 - i, 0], end: [400 - i, 0] })
    //   points.push([400 - i, 0])
    // }
    // data2.wall = [{
    //   points: points
    // }]
    // console.log("points",points)
    // const mergeWallsT = extractBoxes(points)
    // // setmergeWallsT(mergeWallsT)
    // console.log("mergeWallsT", mergeWallsT)
    // const label=createLabeledArray(600,450,points)
    // const findRectanglesT = findRectangles(label)
    // console.log("ket qua=",findRectanglesT)
    // // tạo thử lưới 10 * 10
    // setDataDeepFloorplan(data2)
    // // setModelName('model-30939153')
    // return
    try {
      const response = await fetch('http://127.0.0.1:8000/TF2-DeepFloorplan', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error("Upload failed");

      const responseJson = await response.json();
      if (responseJson && responseJson.data && responseJson.data.wall && responseJson.data.wall[0] && responseJson.data.wall[0].points && responseJson.data.wall[0].points.length && responseJson.data.sizeImg && responseJson.data.sizeImg[0] && responseJson.data.sizeImg[1]) {
        console.log("responseJson.data", responseJson.data)
        setDataDeepFloorplan(responseJson.data)
        if (file.name == '30939153.jpg') {
          setModelName('model-30939153')
        }

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
      <div style={{ height: '100%', width: '100%', margin: 0, padding: 0, }}>
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
        {/* <FloorplanViewer2 dataDeepFloorplan={dataDeepFloorplan} wallHeight={wallHeight[1]} ref={refExportModel} /> */}
        <Home dataDeepFloorplan={dataDeepFloorplan} mergeWallsT={mergeWallsT} modelName={modelName} wallHeight={wallHeight[1]} ref={refExportModel} />
        {/* <Home1 dataDeepFloorplan={dataDeepFloorplan} mergeWallsT={mergeWallsT} modelName={modelName} wallHeight={wallHeight[1]} ref={refExportModel} /> */}
      </div>
    </>
  );
}

export default App;
