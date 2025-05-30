// FloorplanViewer.tsx
import React, {
  useEffect,
  useRef,
  useState,
  forwardRef,
  useImperativeHandle,
} from "react";
import * as THREE from "three";
import _ from 'lodash'
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader'; // Nếu dùng nén
import { RectAreaLightHelper } from 'three/examples/jsm/helpers/RectAreaLightHelper.js';
import { Dialog, Switch, FormControlLabel, Modal, Box, Button, Typography, TransitionProps, Slide, DialogActions, DialogContent, DialogContentText, DialogTitle } from '@mui/material';
import '../styles/floorplanViewer.css'
import { ColorPicker, useColor } from "react-color-palette";
import "react-color-palette/css";



const Transition = React.forwardRef(function Transition(
  props: TransitionProps & {
    children: React.ReactElement<any, any>;
  },
  ref: React.Ref<unknown>,
) {
  return <Slide direction="down" ref={ref} {...props} />;
});


function uniquePointsWithMinMax(points) {
  const seen = new Set();
  const result = [];

  let minI = Infinity, maxI = -Infinity, minJ = Infinity, maxJ = -Infinity;

  for (const [i, j] of points) {
    const key = `${i},${j}`;
    if (!seen.has(key)) {
      seen.add(key);
      result.push([i, j]);

      if (i < minI) minI = i;
      if (i > maxI) maxI = i;
      if (j < minJ) minJ = j;
      if (j > maxJ) maxJ = j;
    }
  }

  return { uniquePoints: result, minI, maxI, minJ, maxJ };
}
function findConsecutiveRanges(points, size) {
  if (!size || !size.length) {
    return [];
  }
  const sizeX = size[0];
  const sizeZ = size[1];
  let minX = 0, minZ = 0, maxX = sizeX, maxZ = sizeZ;

  const transformedPoints = points;
  // Loại trùng
  // const uniquePoints = Array.from(
  //   new Set(transformedPoints.map((p) => `${p[0]},${p[1]}`))
  // ).map((str) => str.split(",").map(Number));
  const uniquePointsWithMinMaxT = uniquePointsWithMinMax(transformedPoints)
  const uniquePoints = uniquePointsWithMinMaxT.uniquePoints
  if (uniquePointsWithMinMaxT.minI && uniquePointsWithMinMaxT.maxI && uniquePointsWithMinMaxT.minJ && uniquePointsWithMinMaxT.maxJ) {
    minX = uniquePointsWithMinMaxT.minI
    maxX = uniquePointsWithMinMaxT.maxI
    minZ = uniquePointsWithMinMaxT.minJ
    maxZ = uniquePointsWithMinMaxT.maxJ
  }

  const groupByI = new Map();
  const groupByJ = new Map();

  for (const [i, j] of uniquePoints) {
    if (!groupByI.has(i)) groupByI.set(i, []);
    if (!groupByJ.has(j)) groupByJ.set(j, []);
    groupByI.get(i).push(j);
    groupByJ.get(j).push(i);
  }

  const resultSet = new Set();

  function mergeConsecutive(sortedCoords) {
    const ranges = [];
    let start = sortedCoords[0];
    let prev = start;
    for (let i = 1; i < sortedCoords.length; i++) {
      if (sortedCoords[i] === prev + 1) {
        prev = sortedCoords[i];
      } else {
        ranges.push([start, prev]);
        start = sortedCoords[i];
        prev = start;
      }
    }
    ranges.push([start, prev]);
    return ranges;
  }

  for (const [i, js] of groupByI.entries()) {
    const sortedJs = js.sort((a, b) => a - b);
    const jRanges = mergeConsecutive(sortedJs);
    for (const [jStart, jEnd] of jRanges) {
      resultSet.add(`${i},${jStart}-${i},${jEnd}`);
    }
  }

  for (const [j, is_] of groupByJ.entries()) {
    const sortedIs = is_.sort((a, b) => a - b);
    const iRanges = mergeConsecutive(sortedIs);
    for (const [iStart, iEnd] of iRanges) {
      if (iStart !== iEnd) {
        const key = `${iStart},${j}-${iEnd},${j}`;
        if (!resultSet.has(key)) {
          resultSet.add(key);
        }
      }
    }
  }

  const result = Array.from(resultSet).map((entry) => {
    const [startStr, endStr] = entry.split("-");
    const start = startStr.split(",").map(Number);
    const end = endStr.split(",").map(Number);
    return { start, end };
  });

  return { result, minX, maxX, minZ, maxZ };
}

// function Wall({ start, end, height = 2.8, width = 100, scene, color = "#dbe5e6" }) {
//   // Tạo wall dưới dạng BoxGeometry
//   const dx = end[0] - start[0];
//   const dz = end[1] - start[1];
//   const length = Math.sqrt(dx * dx + dz * dz);
//   const angle = Math.atan2(dz, dx);

//   const geometry = new THREE.BoxGeometry(length, height, width);
//   const material = new THREE.MeshStandardMaterial({ color: color });
//   const mesh = new THREE.Mesh(geometry, material);
//   mesh.castShadow = true;
//   mesh.receiveShadow = true;
//   mesh.position.set(start[0] + dx / 2, height / 2, start[1] + dz / 2);
//   mesh.rotation.y = -angle;
//   // Thêm hàm cập nhật chiều cao
//   mesh.updateHeight = (newHeight) => {
//     mesh.geometry.dispose(); // Giải phóng geometry cũ
//     mesh.geometry = new THREE.BoxGeometry(length, newHeight, width);
//     mesh.position.y = newHeight / 2;
//   };
//   mesh.updateColor = (newColor) => {
//     if (mesh.material) {
//       mesh.material.color.set(newColor);
//       mesh.material.needsUpdate = true;
//     }
//   };

//   scene.add(mesh);

//   return mesh;
// }



// Tạo random 30 điểm trên lưới 10x10
function generateRandomPoints(numPoints, maxI, maxJ) {
  const points = [];
  for (let k = 0; k < numPoints; k++) {
    const i = Math.floor(Math.random() * (maxI + 1));
    const j = Math.floor(Math.random() * (maxJ + 1));
    points.push([i, j]);
  }
  return points;
}



function Wall({ start, end, height = 2.8, width = 0.2, scene, color = "#dbe5e6" }) {
  const dx = end[0] - start[0];
  const dz = end[1] - start[1];
  const length = Math.sqrt(dx * dx + dz * dz);

  const isSinglePoint = length === 0;
  // Nếu độ dày quá nhỏ, không render
  if (width <= 0) return null;

  const geometry = isSinglePoint
    ? new THREE.BoxGeometry(width, height, width)
    : new THREE.BoxGeometry(length, height, width);

  const material = new THREE.MeshStandardMaterial({ color, roughness: 0.1, metalness: 0.1 });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.roughness = 0.8; // nền mờ hơn

  if (isSinglePoint) {
    mesh.position.set(start[0] + width / 2, height / 2, start[1] + width / 2);
  } else {
    const angle = Math.atan2(dz, dx);
    mesh.position.set(start[0] + dx / 2, height / 2, start[1] + dz / 2);
    mesh.rotation.y = -angle;
    // Dịch mesh sang 1 phía để tránh lòi ra 2 bên
    const perpX = dz / length;
    const perpZ = dx / length;
    mesh.position.x += perpX * (width / 2);
    mesh.position.z += perpZ * (width / 2);
  }

  // Thêm hàm cập nhật chiều cao
  // mesh.updateHeight = (newHeight) => {
  //   // mesh.geometry.dispose(); // Giải phóng geometry cũ
  //   // mesh.geometry = new THREE.BoxGeometry(length, newHeight, width);
  //   // mesh.position.y = newHeight / 2;
  // };
  mesh.updateHeight = (newHeight) => {
    // Lưu lại chiều cao cũ
    const oldHeight = mesh.geometry.parameters.height;

    // Tạo geometry mới với chiều cao mới
    const newGeometry = new THREE.BoxGeometry(
      mesh.geometry.parameters.width, // chiều dài (trong local space sau xoay)
      newHeight,
      mesh.geometry.parameters.depth  // chiều rộng
    );

    mesh.geometry.dispose();         // Giải phóng bộ nhớ geometry cũ
    mesh.geometry = newGeometry;

    // Cập nhật lại vị trí theo chiều cao mới
    mesh.position.y += (newHeight - oldHeight) / 2;
  };
  mesh.updateColor = (newColor) => {
    if (mesh.material) {
      mesh.material.color.set(newColor);
      mesh.material.needsUpdate = true;
    }
  };
  scene.add(mesh);
  return mesh;
}


function CustomGrid({ width = 10, height = 10, divisionsX = 60, divisionsY = 40, scene, displayGridSence }) {
  // Tạo lưới bằng LineSegments
  const vertices = [];

  for (let i = 0; i <= divisionsX; i++) {
    const x = (i / divisionsX) * width;
    vertices.push(x, 0, 0, x, 0, height);
  }
  for (let j = 0; j <= divisionsY; j++) {
    const z = (j / divisionsY) * height;
    vertices.push(0, 0, z, width, 0, z);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
  // const material = new THREE.LineBasicMaterial({ color: "#cccccc" });
  const material = new THREE.LineBasicMaterial({ color: "#cccccc", transparent: true, opacity: 0.4, visible: displayGridSence });

  const grid = new THREE.LineSegments(geometry, material);
  grid.updateDisplay = function (visible) {
    this.visible = visible;
  };

  scene.add(grid);

  return grid;
}


// export default function FloorplanViewer({ dataDeepFloorplan, wallHeight }) {
const initFunc = forwardRef((props, ref) => {

  const { dataDeepFloorplan, wallHeight } = props;
  const containerRef = useRef(null);

  const [checkMoveOXZ, setCheckMoveOXZ] = useState(true);
  const onlyMoveOnOXZRef = useRef(checkMoveOXZ);

  const [wallStore, setWallStore] = useState([
    // { start: [0, 90], end: [0, 100] },
    // { start: [0, 200], end: [200, 0] },


    // // { start: [0, 0], end: [0, 400] },
    // // 
    // { start: [0, 400], end: [400, 400] },
    // { start: [400, 400], end: [400, 0] },
    // { start: [400, 0], end: [0, 0] }
  ]);
  const [floorStore, setFloorStore] = useState({});
  // const [gridSize, setGridSize] = useState([10, 10]);
  const [gridSize, setGridSize] = useState([400, 400]);
  const [wallUpdate, setWallUpdate] = useState([]);
  const [displayGridSence, setDisplayGridSence] = useState(true);
  const [sceneBackground, setSceneBackground] = useState('#fff');

  const sceneRef = useRef();
  const cameraRef = useRef();
  const controlsRef = useRef();
  const rendererRef = useRef();
  const floorRef = useRef();
  const gridSenceRef = useRef();
  const mountRef = useRef(null);
  const modeRef = useRef("drag");
  const [modeUI, setModeUI] = useState("drag");
  const modelRef = useRef(null);
  const interactableMeshes = useRef([]);


  const directionalLightRef = useRef();
  const directionalLight2Ref = useRef();
  const lightSphereRef = useRef();
  const lightSphere2Ref = useRef();
  const sceneBoundingBoxRef = useRef();

  // Thêm ref lưu đối tượng đang được chọn thao tác
  const selectedObjectRef = useRef(null);


  // phần ui
  const [open, setOpen] = React.useState(false);

















  const [sceneRefBackground, setSceneRefBackground] = useColor("#fff");
  const handleClickOpen = () => {
    setOpen(true);
  };
  const handleClose = () => {
    setSceneBackground(sceneRefBackground.hex)
    setOpen(false);
  };


  const [openWallColor, setOpenWallcolor] = React.useState(false);
  const [sceneWallColor, setSceneWallColor] = useState('#dbe5e6');
  const [sceneRefWallColor, setSceneRefWallColor] = useColor("#dbe5e6");
  const handleClickOpenWallColor = () => {
    setOpenWallcolor(true);
  };
  const handleCloseWallColor = () => {
    setSceneWallColor(sceneRefWallColor.hex)
    setOpenWallcolor(false);
  };

  const [openFloorColor, setOpenFloorcolor] = React.useState(false);
  const [sceneFloorColor, setSceneFloorColor] = useState('#e7d9a9');
  const [sceneRefFloorColor, setSceneRefFloorColor] = useColor("#e7d9a9");
  const handleClickOpenFloorColor = () => {
    setOpenFloorcolor(true);
  };
  const handleCloseFloorColor = () => {
    setSceneFloorColor(sceneRefFloorColor.hex)
    setOpenFloorcolor(false);
  };

  useEffect(() => {
    onlyMoveOnOXZRef.current = checkMoveOXZ
  }, [checkMoveOXZ])
  useEffect(() => {
    if (sceneRef && sceneRef.current) {
      sceneRef.current.background = new THREE.Color(sceneBackground); // Mặc định
    }
  }, [sceneBackground])


  useEffect(() => {
    if (floorRef && floorRef.current) {
      floorRef.current.updateColor(sceneFloorColor);
    }
  }, [sceneFloorColor])



  useEffect(() => {
    if (
      dataDeepFloorplan &&
      dataDeepFloorplan.wall &&
      dataDeepFloorplan.wall[0] &&
      dataDeepFloorplan.wall[0].points &&
      dataDeepFloorplan.wall[0].points.length &&
      dataDeepFloorplan.sizeImg
    ) {
      console.log("dataDeepFloorplan", dataDeepFloorplan)
      const findConsecutiveRangesT = findConsecutiveRanges(dataDeepFloorplan.wall[0].points, dataDeepFloorplan.sizeImg);
      console.log("findConsecutiveRangesT", findConsecutiveRangesT)
      const wallThreejs = findConsecutiveRangesT.result;
      if (findConsecutiveRangesT.minX && findConsecutiveRangesT.maxX && findConsecutiveRangesT.minZ && findConsecutiveRangesT.maxZ) {
        setFloorStore({
          minX: findConsecutiveRangesT.minX,
          maxX: findConsecutiveRangesT.maxX,
          minZ: findConsecutiveRangesT.minZ,
          maxZ: findConsecutiveRangesT.maxZ,
        })
      }
      console.log("wallThreejs", wallThreejs)
      setWallStore(wallThreejs);
      setGridSize(dataDeepFloorplan.sizeImg);
    }
  }, [dataDeepFloorplan]);

  useEffect(() => {
    if (!containerRef.current) return;

    const sceneWidth = containerRef.current.clientWidth;
    const sceneHeight = containerRef.current.clientHeight;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(sceneBackground);
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(
      90,
      sceneWidth / sceneHeight,
      0.1,
      2000
    );
    cameraRef.current = camera;
    camera.position.set(gridSize[0], gridSize[0], gridSize[1]);
    camera.lookAt(gridSize[0] / 2, 0, gridSize[1] / 2);

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(sceneWidth, sceneHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(gridSize[0] / 2, 0, gridSize[1] / 2);
    controls.update();
    controlsRef.current = controls;

    // // Lights
    // const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    // const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    // directionalLight.castShadow = true;
    // directionalLight.position.set(gridSize[0], gridSize[1], gridSize[0]);
    // scene.add(ambientLight, directionalLight);



    // Walls
    let wallHeightC = 5 * 10;
    if (wallHeight && wallHeight >= 0) {
      wallHeightC = wallHeight * 10
    }
    const wallMeshes = [];
    const wallColor = sceneWallColor ? sceneWallColor : "#dbe5e6"
    wallStore.forEach(({ start, end }) => {
      const wallMesh = Wall({ start, end, width: 1, height: wallHeightC, scene, color: wallColor });
      wallMeshes.push(wallMesh);
      wallUpdate.push(wallMesh)
    });

    // // Lights
    // Ambient light nhẹ: là ánh sáng môi trường, ánh sáng chung, chiếu đều khắp mọi nơi trong cảnh.
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
    scene.add(ambientLight);
    const hemisphereLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.4); // Cường độ 0.5

    // const hemisphereLight = new THREE.HemisphereLight('a9b0b1', '#ccc', 0.4); // Cường độ 0.5
    scene.add(hemisphereLight);

    // Kích thước mặt lưới
    // Tạo đèn
    const rectLight = new THREE.RectAreaLight('#dbe5e6', 0.5, gridSize[0], gridSize[1]);
    // Chiếu ánh sáng hướng thẳng xuống nền (trục âm y)
    rectLight.position.set(gridSize[0] / 2, 0, gridSize[1] / 2);
    const rectLightHeigth = wallHeight * 10 * 1.2
    rectLight.lookAt(gridSize[0] / 2, rectLightHeigth, gridSize[1] / 2);
    // Thêm vào scene
    scene.add(rectLight);
    // // (Tuỳ chọn) Thêm helper để bạn nhìn thấy vùng sáng
    // const helper = new RectAreaLightHelper(rectLight);
    // scene.add(helper);





    // Đèn DirectionalLight hỗ trợ đổ bóng :là ánh sáng có hướng cố định, giống như ánh sáng mặt trời.
    const directionalLight = new THREE.DirectionalLight(0xffffff, 2);
    directionalLightRef.current = directionalLight
    // position.set & target.position.set tức là chiếu từ điếm sáng đó về điểm target
    // do đó điểm sáng cần đặt ở ví trí góc ngoài cùng của lưới,cao = 1.5 * cao gốc
    const directionalLightY = Math.ceil(wallHeightC * 1.8)
    const directionalLightX = Math.ceil(gridSize[0] + 10)
    const directionalLightZ = Math.ceil(gridSize[1] + 10)
    directionalLight.position.set(directionalLightX, directionalLightY, directionalLightZ);
    // Tạo hình cầu để hiển thị vị trí của nguồn sáng
    const lightSphereGeometry = new THREE.SphereGeometry(4, 32, 32); // bán kính 2
    const lightSphereMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00 }); // màu vàng
    const lightSphere = new THREE.Mesh(lightSphereGeometry, lightSphereMaterial);
    // // Đặt hình cầu vào đúng vị trí của DirectionalLight
    lightSphere.position.set(directionalLightX, directionalLightY, directionalLightZ);
    lightSphereRef.current = lightSphere
    lightSphere.visible = false
    // tạo thêm 1 hình cầu ở phía đối diện nữa
    const lightSphereGeometry2 = new THREE.SphereGeometry(4, 32, 32); // bán kính 2
    const lightSphereMaterial2 = new THREE.MeshBasicMaterial({ color: 0xffff00 }); // màu vàng
    const lightSphere2 = new THREE.Mesh(lightSphereGeometry2, lightSphereMaterial2);
    const directionalLight2X = -Math.ceil(0 + 10)
    const directionalLight2Z = -Math.ceil(0 + 10)
    lightSphere2.position.set(directionalLight2X, directionalLightY, directionalLight2Z);
    lightSphere2.visible = false
    lightSphere2Ref.current = lightSphere2

    scene.add(lightSphere, lightSphere2);
    // // --- Tính bounding box tổng thể scene ---
    const sceneBoundingBox = new THREE.Box3().setFromObject(scene);
    // // Tạo helper để hiển thị hộp bao
    // const boxHelperScene = new THREE.Box3Helper(sceneBoundingBox, 0x00ff00);
    // sceneBoundingBox.update = function () {
    //   this.setFromObject(scene); // Cập nhật lại hộp bao dựa trên scene
    // };
    // sceneBoundingBoxRef.current=sceneBoundingBox
    // scene.add(boxHelperScene);


    directionalLight.target.position.set(0, 0, 0);
    directionalLight.castShadow = true;
    // shadow.mapSize.width && height là độ phân giải của bóng
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;

    // khoảng cách là khoảng cách từ điểm sáng đến các vật thể
    // nên phải tính lại theo boudingbox của toàn vật thể scene
    // near là khoảng cách gần nhất được tạo bóng nếu nhỏ hơn k tạo bóng
    directionalLight.shadow.camera.near = 1;
    // far là khoảng cách xa nhất được tạo bóng nếu xa hơn k tạo bóng
    directionalLight.shadow.camera.far = 500;
    // left-right-top-bottom như kiểu kích thước bóng
    // directionalLight.shadow.camera.left = -200;
    // directionalLight.shadow.camera.right = 200;
    // directionalLight.shadow.camera.top = 200;
    // directionalLight.shadow.camera.bottom = -200;
    directionalLight.shadow.camera.left = -120;
    directionalLight.shadow.camera.right = 120;
    directionalLight.shadow.camera.top = 120;
    directionalLight.shadow.camera.bottom = -120;

    const lightPos = directionalLight.position;
    let maxDistance = 0;
    const worldPoints = [
      new THREE.Vector3(sceneBoundingBox.min.x, sceneBoundingBox.min.y, sceneBoundingBox.min.z),
      new THREE.Vector3(sceneBoundingBox.min.x, sceneBoundingBox.min.y, sceneBoundingBox.max.z),
      new THREE.Vector3(sceneBoundingBox.min.x, sceneBoundingBox.max.y, sceneBoundingBox.min.z),
      new THREE.Vector3(sceneBoundingBox.min.x, sceneBoundingBox.max.y, sceneBoundingBox.max.z),
      new THREE.Vector3(sceneBoundingBox.max.x, sceneBoundingBox.min.y, sceneBoundingBox.min.z),
      new THREE.Vector3(sceneBoundingBox.max.x, sceneBoundingBox.min.y, sceneBoundingBox.max.z),
      new THREE.Vector3(sceneBoundingBox.max.x, sceneBoundingBox.max.y, sceneBoundingBox.min.z),
      new THREE.Vector3(sceneBoundingBox.max.x, sceneBoundingBox.max.y, sceneBoundingBox.max.z),
    ];
    for (let i = 0; i < worldPoints.length; i++) {
      const dist = lightPos.distanceTo(worldPoints[i]);
      if (dist > maxDistance) maxDistance = dist;
    }

    // 7. Set near và far
    directionalLight.shadow.camera.near = 1;
    directionalLight.shadow.camera.far = maxDistance + 10; // thêm margin

    // 8. Cập nhật ma trận projection shadow camera
    directionalLight.shadow.camera.updateProjectionMatrix();

    // đây là add đèn theo hướng ngược lại
    // const directionalLight2 = new THREE.DirectionalLight(0xffffff, 1);
    // directionalLight2.position.set(-directionalLightX, directionalLightY, -directionalLightZ);
    // directionalLight2.castShadow = false;
    // directionalLight2.target.position.set(0, 0, 0);
    // directionalLight2.shadow.mapSize.width = 2048;
    // directionalLight2.shadow.mapSize.height = 2048;
    // directionalLight2.shadow.camera.near = 1;
    // directionalLight2.shadow.camera.far = 600;
    // directionalLight2.shadow.camera.left = -200;
    // directionalLight2.shadow.camera.right = 200;
    // directionalLight2.shadow.camera.top = 200;
    // directionalLight2.shadow.camera.bottom = -200;
    const directionalLight2 = directionalLight.clone();
    directionalLight2Ref.current = directionalLight2
    directionalLight2.position.set(-directionalLightX, directionalLightY, -directionalLightZ);
    directionalLight2.castShadow = false;
    scene.add(directionalLight, directionalLight2);

    // floor:nền nhà
    if (floorStore && floorStore.minX && floorStore.maxX && floorStore.maxZ && floorStore.minZ) {
      const floorMinX = floorStore.minX
      const floorMaxX = floorStore.maxX
      const floorMinZ = floorStore.minZ
      const floorMaxZ = floorStore.maxZ
      const floorWidth = Math.abs(floorMaxX - floorMinX);
      const floorDepth = Math.abs(floorMaxZ - floorMinZ);
      const floorHeight = 5; // độ dày nền
      const geometryFloor = new THREE.BoxGeometry(floorWidth, floorHeight, floorDepth);
      const materialFloor = new THREE.MeshStandardMaterial({ color: sceneFloorColor ? sceneFloorColor : "#f5f5dc", shininess: 1 });
      const floorHouse = new THREE.Mesh(geometryFloor, materialFloor);
      floorHouse.roughness = 0.9; // nền mờ hơn
      floorHouse.castShadow = true;
      floorHouse.receiveShadow = true;
      floorHouse.position.set(
        (floorMinX + floorMaxX) / 2,
        floorHeight / 2,  // để nền nằm trên mặt phẳng y=0
        (floorMinZ + floorMaxZ) / 2
      );
      floorHouse.updateColor = (newColor) => {
        if (floorHouse.material) {
          floorHouse.material.color.set(newColor);
          floorHouse.material.needsUpdate = true;
        }
      };
      scene.add(floorHouse);
      floorRef.current = floorHouse
    }


    // Grid
    const grid = CustomGrid({ width: gridSize[0], height: gridSize[1], divisionsX: 30, divisionsY: 20, scene, displayGridSence });
    gridSenceRef.current = grid;

    // Animate
    const animate = () => {
      requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // Cleanup on unmount
    return () => {
      wallMeshes.forEach((m) => {
        scene.remove(m);
        m.geometry.dispose();
        m.material.dispose();
      });
      scene.remove(grid);
      grid.geometry.dispose();
      grid.material.dispose();

      controls.dispose();
      renderer.dispose();
      if (renderer.domElement) containerRef.current.removeChild(renderer.domElement);
    };
  }, [wallStore, gridSize, floorStore]);

  useEffect(() => {
    if (gridSenceRef && gridSenceRef.current) {
      gridSenceRef.current.updateDisplay(displayGridSence);
    }
  }, [displayGridSence])
  useEffect(() => {
    let newWallHeight = wallHeight * 10
    if (wallUpdate && wallUpdate.length) {
      wallUpdate.forEach((mesh) => {
        mesh.updateHeight(newWallHeight);
      });
    }
    //  let wallHeightC = 5 * 10;
    //   if (wallHeight && wallHeight >= 0) {
    //     wallHeightC = wallHeight * 10
    //   }
    //   const directionalLightY = Math.ceil(wallHeightC * 1.8)
    //   const directionalLightX = Math.ceil(gridSize[0] + 10)
    //   const directionalLightZ = Math.ceil(gridSize[1] + 10)
    // if (directionalLightRef && directionalLightRef.current) {
    //   const directionalLight = directionalLightRef.current
    //   directionalLight.position.set(directionalLightX, directionalLightY, directionalLightZ);
    // }
    // if (directionalLight2Ref && directionalLight2Ref.current) {
    //   const directionalLight2 = directionalLight2Ref.current
    //   directionalLight2.position.set(-directionalLightX, directionalLightY, -directionalLightZ);
    // }
    // if (lightSphereRef && lightSphereRef.current) {
    //   lightSphereRef.current.position.set(directionalLightX, directionalLightY, directionalLightZ);
    // }
    // if (lightSphere2Ref && lightSphere2Ref.current) {
    //   const directionalLight2X = -Math.ceil(0 + 10)
    //   const directionalLight2Z = -Math.ceil(0 + 10)
    //   lightSphere2Ref.current.position.set(directionalLight2X, directionalLightY, directionalLight2Z);
    // }
    // if (sceneBoundingBoxRef && sceneBoundingBoxRef.current) {
    //   sceneBoundingBoxRef.current.update()
    //   sceneRef.current.updateMatrixWorld(true);
    // }
  }, [wallHeight])
  useEffect(() => {
    if (wallUpdate && wallUpdate.length) {
      wallUpdate.forEach((mesh) => {
        mesh.updateColor(sceneWallColor);
      });
    }
  }, [sceneWallColor])
  const handleModeChange = (newMode) => {
    modeRef.current = newMode;
    setModeUI(newMode);
  };
  const handleDeleteSelected = () => {
    const obj = selectedObjectRef.current;
    if (obj) {
      if (obj.parent) {
        obj.parent.remove(obj); // Xóa khỏi scene
      }
      const index = interactableMeshes.current.indexOf(obj);
      if (index !== -1) {
        interactableMeshes.current.splice(index, 1); // Xóa khỏi danh sách tương tác
      }
      selectedObjectRef.current = null;
    }
  };
  useEffect(() => {
  }, [selectedObjectRef]);

  // expose hàm exportGLB cho App.js gọi
  useImperativeHandle(ref, () => ({
    exportGLB: () => {
      if (!sceneRef.current) {
        console.error("Scene chưa được tạo");
        return;
      }
      const exporter = new GLTFExporter();
      exporter.parse(
        sceneRef.current,
        (result) => {
          if (result instanceof ArrayBuffer) {
            saveArrayBuffer(result, "scene.glb");
          } else {
            const output = JSON.stringify(result, null, 2);
            saveString(output, "scene.gltf");
          }
        },

        { binary: true }
      );
    },
  }));
  function saveString(text, filename) {
    const blob = new Blob([text], { type: "text/plain" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
  }

  function saveArrayBuffer(buffer, filename) {
    const blob = new Blob([buffer], { type: "application/octet-stream" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
  }
  const ImportAddModel = async (event) => {
    const scene = sceneRef.current
    if (!scene) return
    console.log("ImportAddModel")
    try {
      await new Promise(resolve => {
        const loader = new GLTFLoader();
        // Optional: DRACO support nếu file nén
        const dracoLoader = new DRACOLoader();
        dracoLoader.setDecoderPath('/js/libs/draco/');
        loader.setDRACOLoader(dracoLoader);
        const file = event.target.files[0];
        if (!file) return;
        let scaleModel = 1
        let scaleX_Model = 1, scaleY_Model = 1, scaleZ_Model = 1
        //  const scaleModel = 1
        const reader = new FileReader();
        reader.onload = function (e) {
          const arrayBuffer = e.target.result;
          loader.parse(arrayBuffer, '', (gltf) => {
            try {
              const model = gltf.scene;
              const box = new THREE.Box3().setFromObject(model);
              const size = new THREE.Vector3();
              let sizeX = 1, sizeY = 1, sizeZ = 1;
              const sizeBox = box.getSize(size); // size sẽ chứa width, height, depth
              if (sizeBox && sizeBox.x && sizeBox.y && sizeBox.z) {
                sizeX = sizeBox.x
                sizeY = sizeBox.y
                sizeZ = sizeBox.z
                scaleX_Model = gridSize[0] / sizeX
                scaleZ_Model = gridSize[1] / sizeZ
                try {
                  scaleModel = Math.min(scaleX_Model, scaleZ_Model)
                } catch { }
              }
              console.log("model222", _.cloneDeep(model))
              console.log("size=", size)
              console.log("sizeBox=", sizeBox)
              console.log("grid size hien tai", gridSize)
              console.log("wall heigh", wallHeight)
              model.traverse((child) => {
                if (child.isMesh) {
                  child.castShadow = true;
                  child.material.side = THREE.DoubleSide;
                  interactableMeshes.current.push(child);
                }
              });

              // model.scale.set(0.001 * scaleModel, 0.001 * scaleModel, 0.001 * scaleModel);
              // model.scale.set(1 * scaleModel, 1 * scaleModel, 1 * scaleModel);
              model.scale.set(scaleModel, scaleModel, scaleModel);
              console.log(`scaleX_Model=${scaleX_Model} scaleY_Model=${scaleY_Model} scaleZ_Model=${scaleZ_Model} scaleModel=${scaleModel}`)
              //  model.scale.set(sizeX, sizeX, sizeX);
              model.position.set(0, 0, 0);
              scene.add(model);
              // modelRef.current = model;
            } catch { }
            resolve()
          }, (error) => {
            resolve()
            console.error("Lỗi khi parse GLB:", error);
          });
        };
        reader.readAsArrayBuffer(file);
      })
    } catch { }
    try {
      const camera = cameraRef.current
      const renderer = rendererRef.current
      // Controls
      // const controls = new OrbitControls(camera, renderer.domElement);
      // controls.enableDamping = true;
      const controls = controlsRef.current;

      // Interaction variables
      let isInteracting = false;
      const offset = new THREE.Vector3();
      const startMouse = new THREE.Vector2();
      const startRotation = new THREE.Euler();
      const startScale = new THREE.Vector3();
      const plane = new THREE.Plane();
      const raycaster = new THREE.Raycaster();
      const mouse = new THREE.Vector2();
      function onMouseDown(event) {
        console.log("onMouseDown")
        const rect = renderer.domElement.getBoundingClientRect();
        mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        raycaster.setFromCamera(mouse, camera);

        const intersects = raycaster.intersectObjects(
          interactableMeshes.current,
          true
        );

        if (intersects.length > 0) {
          const pickedMesh = intersects[0].object;
          selectedObjectRef.current = pickedMesh;

          console.log("dang chojn", pickedMesh);
          console.log("selectedObjectRef", selectedObjectRef);
          isInteracting = true;
          controls.enabled = false;

          if (modeRef.current === "drag") {
            const worldPoint = new THREE.Vector3();
            pickedMesh.getWorldPosition(worldPoint);

            plane.setFromNormalAndCoplanarPoint(
              camera.getWorldDirection(plane.normal),
              worldPoint
            );

            offset.copy(intersects[0].point).sub(worldPoint);
          } else if (modeRef.current === "rotate") {
            startMouse.set(event.clientX, event.clientY);
            startRotation.copy(pickedMesh.rotation);
          } else if (modeRef.current === "scale") {
            startMouse.set(event.clientX, event.clientY);
            startScale.copy(pickedMesh.scale);
          }
        } else {
          selectedObjectRef.current = null;
          console.log("vao day roi ha nenselectedObjectRef", selectedObjectRef);
        }
      }

      function onMouseMove(event) {
        console.log("mousemove1111")
        if (!isInteracting || !selectedObjectRef.current) return;

        const rect = renderer.domElement.getBoundingClientRect();
        mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        const obj = selectedObjectRef.current;

        if (modeRef.current === "drag") {
          raycaster.setFromCamera(mouse, camera);
          const intersection = new THREE.Vector3();
          if (raycaster.ray.intersectPlane(plane, intersection)) {
            const newWorldPos = intersection.sub(offset);
            console.log("checkMoveOXZ 111111", onlyMoveOnOXZRef.current)
            if (onlyMoveOnOXZRef && onlyMoveOnOXZRef.current) {
              // Giữ nguyên trục Y hiện tại của object
              newWorldPos.y = obj.getWorldPosition(new THREE.Vector3()).y;
            }
            if (obj.parent) {
              obj.position.copy(obj.parent.worldToLocal(newWorldPos.clone()));
            } else {
              obj.position.copy(newWorldPos);
            }
          }
        } else if (modeRef.current === "rotate") {
          const deltaX = event.clientX - startMouse.x;
          const deltaY = event.clientY - startMouse.y;
          if (onlyMoveOnOXZRef && onlyMoveOnOXZRef.current) {
            obj.rotation.set(startRotation.x, startRotation.y + deltaX * 0.01, startRotation.z);
          } else {
            obj.rotation.y = startRotation.y + deltaX * 0.01;
            obj.rotation.x = startRotation.x + deltaY * 0.01;
          }
        } else if (modeRef.current === "scale") {
          const delta = event.clientY - startMouse.y;
          const newScale = Math.max(0.1, startScale.x + delta * 0.01);
          obj.scale.set(newScale, newScale, newScale);
        }
      }

      function onMouseUp() {
        if (isInteracting) {
          isInteracting = false;
          // selectedObjectRef.current = null;  // BỎ DÒNG NÀY đi
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
    } catch { }
  }
  const loadAddModel = () => {
    const scene = sceneRef.current
    if (!scene) return
    // Load GLB model
    const loader = new GLTFLoader();
    const scaleModel = 20
    loader.load(
      "/models/source/简约餐桌.glb",
      (gltf) => {
        const model = gltf.scene;
        model.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = true;
            child.material.side = THREE.DoubleSide;
            interactableMeshes.current.push(child);
          }
        });

        model.scale.set(0.001 * scaleModel, 0.001 * scaleModel, 0.001 * scaleModel);
        model.position.set(0, 0, 0);
        scene.add(model);
        // modelRef.current = model;
      },
      undefined,
      (error) => {
        console.error("Lỗi khi load GLB:", error);
      }
    );

    loader.load(
      "/models/source/low_poly_furnitures_full_bundle.glb",
      // "/models/source/scene.gltf",
      (gltf) => {
        const model = gltf.scene;
        model.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = true;
            child.material.side = THREE.DoubleSide;
            interactableMeshes.current.push(child);
          }
        });

        model.scale.set(1 * scaleModel, 1 * scaleModel, 1 * scaleModel);
        model.position.set(0, 0, 0);
        scene.add(model);
        // modelRef.current = model;
      },
      undefined,
      (error) => {
        console.error("Lỗi khi load GLB:", error);
      }
    );
    const camera = cameraRef.current
    const renderer = rendererRef.current
    // Controls
    // const controls = new OrbitControls(camera, renderer.domElement);
    // controls.enableDamping = true;
    const controls = controlsRef.current;

    // Interaction variables
    let isInteracting = false;
    const offset = new THREE.Vector3();
    const startMouse = new THREE.Vector2();
    const startRotation = new THREE.Euler();
    const startScale = new THREE.Vector3();
    const plane = new THREE.Plane();
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    function onMouseDown(event) {
      console.log("onMouseDown")
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);

      const intersects = raycaster.intersectObjects(
        interactableMeshes.current,
        true
      );

      if (intersects.length > 0) {
        const pickedMesh = intersects[0].object;
        selectedObjectRef.current = pickedMesh;

        console.log("dang chojn", pickedMesh);
        console.log("selectedObjectRef", selectedObjectRef);
        isInteracting = true;
        controls.enabled = false;

        if (modeRef.current === "drag") {
          const worldPoint = new THREE.Vector3();
          pickedMesh.getWorldPosition(worldPoint);

          plane.setFromNormalAndCoplanarPoint(
            camera.getWorldDirection(plane.normal),
            worldPoint
          );

          offset.copy(intersects[0].point).sub(worldPoint);
        } else if (modeRef.current === "rotate") {
          startMouse.set(event.clientX, event.clientY);
          startRotation.copy(pickedMesh.rotation);
        } else if (modeRef.current === "scale") {
          startMouse.set(event.clientX, event.clientY);
          startScale.copy(pickedMesh.scale);
        }
      } else {
        selectedObjectRef.current = null;
        console.log("vao day roi ha nenselectedObjectRef", selectedObjectRef);
      }
    }

    function onMouseMove(event) {
      console.log("mousemove-22222")
      if (!isInteracting || !selectedObjectRef.current) return;

      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      const obj = selectedObjectRef.current;

      if (modeRef.current === "drag") {
        raycaster.setFromCamera(mouse, camera);
        const intersection = new THREE.Vector3();
        if (raycaster.ray.intersectPlane(plane, intersection)) {
          const newWorldPos = intersection.sub(offset);
          if (onlyMoveOnOXZRef && onlyMoveOnOXZRef.current) {
            // Giữ nguyên trục Y hiện tại của object
            newWorldPos.y = obj.getWorldPosition(new THREE.Vector3()).y;
          }
          if (obj.parent) {
            obj.position.copy(obj.parent.worldToLocal(newWorldPos.clone()));
          } else {
            obj.position.copy(newWorldPos);
          }
        }
      } else if (modeRef.current === "rotate") {
        const deltaX = event.clientX - startMouse.x;
        const deltaY = event.clientY - startMouse.y;
        if (onlyMoveOnOXZRef && onlyMoveOnOXZRef.current) {
          obj.rotation.set(startRotation.x, startRotation.y + deltaX * 0.01, startRotation.z);
        } else {
          obj.rotation.y = startRotation.y + deltaX * 0.01;
          obj.rotation.x = startRotation.x + deltaY * 0.01;
        }
      } else if (modeRef.current === "scale") {
        const delta = event.clientY - startMouse.y;
        const newScale = Math.max(0.1, startScale.x + delta * 0.01);
        obj.scale.set(newScale, newScale, newScale);
      }
    }

    function onMouseUp() {
      if (isInteracting) {
        isInteracting = false;
        // selectedObjectRef.current = null;  // BỎ DÒNG NÀY đi
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
  }
  async function smoothWall() {
    console.log("smoothWall")
    try {
      console.log("data", wallStore)
      let dataSend = {
        size: gridSize,
        walls: wallStore,
      }
      try {
        const response = await fetch('http://127.0.0.1:8000/smooth-wall', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(dataSend),
        });

        if (!response.ok) throw new Error("Error");

        const responseJson = await response.json();
        if (responseJson && responseJson.data) {
          setWallStore(responseJson.data);
        }
        console.log("responseJson", responseJson)
      } catch (error) {
        console.error("Lỗi upload:", error);
      }
    } catch { }
  }

  return (
    <>
      <div style={{ position: "relative", width: "100vw", height: "100vh" }}>
        <div
          style={{
            position: "absolute",
            top: 10,
            left: 10,
            display: "flex",
            alignItems: "center",
            gap: "10px",
            zIndex: 10,
          }}
        >
          <input type="file" accept=".glb,.gltf" onChange={ImportAddModel} />
          {/* <button
            onClick={() => ImportAddModel()}
            style={{
              padding: "8px 12px",
              border: "1px solid #ccc",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            + Import Model (file glb)
          </button> */}
          <button
            onClick={() => loadAddModel()}
            style={{
              padding: "8px 12px",
              border: "1px solid #ccc",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            + Add model (file glb)
          </button>
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
              backgroundColor: modeUI === "scale" ? "#3cb371" : "#eee",
              border: "1px solid #ccc",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            🔍 Scale
          </button>
          <button
            onClick={handleDeleteSelected}
            style={{
              padding: "8px 12px",
              backgroundColor: "#ff4d4f",
              color: "#fff",
              border: "1px solid #ccc",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            🗑 Xóa
          </button>
          <div className="border h-full h-[40px] flex items-center p-2">

            <FormControlLabel
              control={<Switch checked={checkMoveOXZ}
                onChange={(e) => setCheckMoveOXZ(e.target.checked)}
              />}
              label="OXZ:"
              labelPlacement="start"
            />
          </div>
        </div>
        <div className="absolute top-[60px] left-[15px]">
          <div className="flex items-center">
            Scene Background Color:
            <input className="ip-scene-background" type="text" value={sceneBackground} onInput={(e) => setSceneBackground(e.target.value)} style={{ width: '80px', padding: '2px 5px' }} />
            <div onClick={handleClickOpen} className="border border-solid border-black-200 ml-[8px]" style={{ width: '26px', height: '26px', background: sceneBackground }}></div>
          </div>
          <Dialog
            open={open}
            slots={{
              transition: Transition,
            }}
            keepMounted
            onClose={handleClose}
            aria-describedby="alert-dialog-slide-description"
          >
            <DialogTitle>{"Chọn màu cho không gian"}</DialogTitle>
            <DialogContent>
              <ColorPicker color={sceneRefBackground} onChange={setSceneRefBackground} />
            </DialogContent>
            <DialogActions>
              <Button onClick={handleClose}>Đóng</Button>
            </DialogActions>
          </Dialog>
        </div>

        <div className="absolute top-[90px] left-[15px] flex items-center">
          <div className="flex items-center">
            Wall Color:
            <input className="ip-scene-background" type="text" value={sceneWallColor} onInput={(e) => setSceneWallColor(e.target.value)} style={{ width: '80px', padding: '2px 5px' }} />
            <div onClick={handleClickOpenWallColor} className="border border-solid border-black-200 ml-[8px]" style={{ width: '26px', height: '26px', background: sceneWallColor }}></div>
          </div>
          <Dialog
            open={openWallColor}
            slots={{
              transition: Transition,
            }}
            keepMounted
            onClose={handleCloseWallColor}
            aria-describedby="alert-dialog-slide-description"
          >
            <DialogTitle>{"Chọn màu cho không gian"}</DialogTitle>
            <DialogContent>
              <ColorPicker color={sceneRefWallColor} onChange={setSceneRefWallColor} />
            </DialogContent>
            <DialogActions>
              <Button onClick={handleCloseWallColor}>Đóng</Button>
            </DialogActions>
          </Dialog>
          <div className="ml-4">
            <Button onClick={smoothWall} size="small" variant="contained">Smooth Wall</Button>
          </div>
        </div>

        <div className="absolute top-[120px] left-[15px]">
          <div className="flex items-center">
            Floor Color:
            <input className="ip-scene-background" type="text" value={sceneFloorColor} onInput={(e) => setSceneFloorColor(e.target.value)} style={{ width: '80px', padding: '2px 5px' }} />
            <div onClick={handleClickOpenFloorColor} className="border border-solid border-black-200 ml-[8px]" style={{ width: '26px', height: '26px', background: sceneFloorColor }}></div>
          </div>
          <Dialog
            open={openFloorColor}
            slots={{
              transition: Transition,
            }}
            keepMounted
            onClose={handleCloseFloorColor}
            aria-describedby="alert-dialog-slide-description"
          >
            <DialogTitle>{"Chọn màu cho không gian"}</DialogTitle>
            <DialogContent>
              <ColorPicker color={sceneRefFloorColor} onChange={setSceneRefFloorColor} />
            </DialogContent>
            <DialogActions>
              <Button onClick={handleCloseFloorColor}>Đóng</Button>
            </DialogActions>
          </Dialog>
        </div>
        <div className="absolute top-[150px] left-[15px] formControlLabel-display-grid">
          <FormControlLabel
            control={<Switch checked={displayGridSence}
              onChange={(e) => setDisplayGridSence(e.target.checked)}
            />}
            label="Display Grid"
            labelPlacement="start"
          />

        </div>
        <div ref={containerRef} style={{ width: "100%", height: "100%" }} />
      </div>
    </>
  );
})
export default initFunc;
