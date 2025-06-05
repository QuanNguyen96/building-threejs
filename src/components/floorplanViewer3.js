// FloorplanViewer.tsx
import React, {
  useEffect,
  useRef,
  useState,
  forwardRef,
  useImperativeHandle,
} from "react";
import * as THREE from "three";
import _ from "lodash";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
// import { SelectionBox } from "three/examples/jsm/interactive/SelectionBox.js";
// import { SelectionHelper } from "three/examples/jsm/interactive/SelectionHelper.js";
import SelectionBox from '../utils/SelectionBoxExtended.js';
import SelectionHelper from "../utils/SelectionHelperOffset.js"; // SelectionHelper đã custom để nhận đúng vị trí khi có offset của window
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader"; // Nếu dùng nén
import { RectAreaLightHelper } from "three/examples/jsm/helpers/RectAreaLightHelper.js";
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import {
  Dialog,
  Switch,
  FormControlLabel,
  Modal,
  Box,
  Button,
  Typography,
  TransitionProps,
  Slide,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from "@mui/material";
import "../styles/floorplanViewer.css";
import { ColorPicker, useColor } from "react-color-palette";
import { GUI } from "three/examples/jsm/libs/lil-gui.module.min.js";
import "react-color-palette/css";
import JSZip from "jszip";

const Transition = React.forwardRef(function Transition(
  props: TransitionProps & {
    children: React.ReactElement<any, any>,
  },
  ref: React.Ref<unknown>
) {
  return <Slide direction="down" ref={ref} {...props} />;
});

function uniquePointsWithMinMax(points) {
  const seen = new Set();
  const result = [];

  let minI = Infinity,
    maxI = -Infinity,
    minJ = Infinity,
    maxJ = -Infinity;

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
  let minX = 0,
    minZ = 0,
    maxX = sizeX,
    maxZ = sizeZ;

  const transformedPoints = points;
  // Loại trùng
  // const uniquePoints = Array.from(
  //   new Set(transformedPoints.map((p) => `${p[0]},${p[1]}`))
  // ).map((str) => str.split(",").map(Number));
  const uniquePointsWithMinMaxT = uniquePointsWithMinMax(transformedPoints);
  const uniquePoints = uniquePointsWithMinMaxT.uniquePoints;
  if (
    uniquePointsWithMinMaxT.minI &&
    uniquePointsWithMinMaxT.maxI &&
    uniquePointsWithMinMaxT.minJ &&
    uniquePointsWithMinMaxT.maxJ
  ) {
    minX = uniquePointsWithMinMaxT.minI;
    maxX = uniquePointsWithMinMaxT.maxI;
    minZ = uniquePointsWithMinMaxT.minJ;
    maxZ = uniquePointsWithMinMaxT.maxJ;
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

function createLabeledArray(size, indices) {
  const m = size[1]
  const n = size[0]

  // Khởi tạo mảng 2 chiều toàn , m cot n hang
  const array = Array.from({ length: m }, () => Array(n).fill(0));

  // Gán giá trị 1 cho các chỉ số có trong mảng indices
  for (const [i, j] of indices) {
    if (j >= 0 && j <= m && i >= 0 && i <= n) {
      array[j][i] = 1;
    }
  }

  return array;
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

function Wall({
  start,
  end,
  height = 2.8,
  width = 0.2,
  scene,
  color = "#dbe5e6",
}) {
  const dx = end[0] - start[0];
  const dz = end[1] - start[1];
  const length = Math.sqrt(dx * dx + dz * dz);

  const isSinglePoint = length === 0;
  // Nếu độ dày quá nhỏ, không render
  if (width <= 0) return null;

  const geometry = isSinglePoint
    ? new THREE.BoxGeometry(width, height, width)
    : new THREE.BoxGeometry(length, height, width);

  const material = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.8,
    metalness: 0.2,
    emissive: 0x111111,
    transparent: true,
    emissiveIntensity: 0.2,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  // mesh.roughness = 0.8; // nền mờ hơn

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
  // // Tạo viền cạnh cho mesh:
  // const edgesGeometry = new THREE.EdgesGeometry(geometry);
  // const edgesMaterial = new THREE.LineBasicMaterial({ color: 'red', linewidth: 2 });
  // // edgesMaterial.color.set(color).offsetHSL(0, 0, -0.3); // màu tối hơn viền
  // const edges = new THREE.LineSegments(edgesGeometry, edgesMaterial);
  // mesh.add(edges); // thêm viền làm con của mesh

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
      mesh.geometry.parameters.depth // chiều rộng
    );

    mesh.geometry.dispose(); // Giải phóng bộ nhớ geometry cũ
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
function Wall2({
  x,
  z,
  xWidth,
  zWidth,
  thickness = 0.2,
  height = 2.8,
  scene,
  color = "#dbe5e6",
}) {
  // Tính kích thước thật khi vẽ Box
  const actualWidth = xWidth + thickness * 2;
  const actualDepth = zWidth + thickness * 2;

  // Không render nếu kích thước quá nhỏ
  if (actualWidth <= 0 || actualDepth <= 0) return null;

  const geometry = new THREE.BoxGeometry(actualWidth, height, actualDepth);
  const material = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.8,
    metalness: 0.2,
    emissive: 0x111111,
    transparent: true,
    emissiveIntensity: 0.2,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;

  // Đặt tâm khối box vào giữa vùng phủ của tường (bao gồm cả dày)
  mesh.position.set(
    x + xWidth / 2,
    height / 2,
    z + zWidth / 2
  );

  // Cập nhật chiều cao
  mesh.updateHeight = (newHeight) => {
    const oldHeight = mesh.geometry.parameters.height;
    const newGeometry = new THREE.BoxGeometry(actualWidth, newHeight, actualDepth);
    mesh.geometry.dispose();
    mesh.geometry = newGeometry;
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


function CustomGrid({
  width = 10,
  height = 10,
  divisionsX = 60,
  divisionsY = 40,
  scene,
  displayGridSence,
}) {
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
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(vertices, 3)
  );
  // const material = new THREE.LineBasicMaterial({ color: "#cccccc" });
  const material = new THREE.LineBasicMaterial({
    color: "#cccccc",
    transparent: true,
    opacity: 0.4,
    visible: displayGridSence,
  });

  const grid = new THREE.LineSegments(geometry, material);
  grid.updateDisplay = function (visible) {
    this.visible = visible;
  };

  scene.add(grid);

  return grid;
}

function usePrevious(value) {
  const ref = useRef();
  useEffect(() => {
    ref.current = value;
  }, [value]);
  return ref.current;
}
// export default function FloorplanViewer({ dataDeepFloorplan, wallHeight }) {
const initFunc = forwardRef((props, ref) => {
  const [splitGroup, setsplitGroup] = useState(false)
  const { dataDeepFloorplan, wallHeight } = props;
  const containerRef = useRef(null);
  const [mousePos3D, setMousePos3D] = useState(new THREE.Vector3());
  const [gridSize, setGridSize] = useState([400, 400]);
  const [useGroup, setUseGroup] = useState(true);
  const useGroupRef = useRef(useGroup);
  const arrUuidBoxMeshGroup = useRef([])
  // cameraPosition: lúc đầu hiểu là như thê nhưng k đúng, hiểu đúng nó chỉ là tâm của trục xoay tại vị trí này thôi
  const [cameraPosition, setCameraPosition] = useState([
    gridSize[0],
    gridSize[0],
    gridSize[1],
  ]);
  const [checkMoveOXZ, setCheckMoveOXZ] = useState(true);
  const onlyMoveOnOXZRef = useRef(checkMoveOXZ);
  const [wallStoreV2, setWallStoreV2] = useState([])
  const [wallStore, setWallStore] = useState([
    // { start: [0, 90], end: [0, 100] },
    // { start: [0, 200], end: [200, 0] },
    // { start: [0, 0], end: [0, 400] },
    // //
    // { start: [0, 400], end: [400, 400] },
    // { start: [400, 400], end: [400, 0] },
    // { start: [400, 0], end: [0, 0] }
  ]);
  const [floorStore, setFloorStore] = useState({});
  // const [gridSize, setGridSize] = useState([10, 10]);

  const [wallUpdate, setWallUpdate] = useState([]);
  const [displayGridSence, setDisplayGridSence] = useState(true);
  const [sceneBackground, setSceneBackground] = useState("#fff");

  const sceneRef = useRef();
  const cameraRef = useRef();
  const controlsRef = useRef();
  const rendererRef = useRef();
  const floorRef = useRef();
  const gridSenceRef = useRef();
  const cameraSphereRef = useRef();
  const mountRef = useRef(null);
  const modeRef = useRef("drag");
  const [modeUI, setModeUI] = useState("drag");
  const modelRef = useRef(null);
  const interactableMeshes = useRef([]);
  const refImportAddModel = useRef();
  const selectionRectRef = useRef();
  const selectionHelperRef = useRef();
  const [arrayObjectSelected, setArrayObjectSelected] = useState([]);
  const arrayObjectSelectedRef = useRef([]);

  const directionalLightRef = useRef();
  const directionalLight2Ref = useRef();
  const lightSphereRef = useRef();
  const sceneBoundingBoxRef = useRef();

  const isSelectingRect = useRef(false);
  const isCtrlAddSelectingRect = useRef(false);
  const pressedKeys = useRef(new Set());
  // Thêm ref lưu đối tượng đang được chọn thao tác
  const selectedObjectRef = useRef(null);
  const isMoveRotateScaleRef = useRef(false);
  const simulatedMesh = useRef(new THREE.Group());

  // phần ui
  const [open, setOpen] = React.useState(false);

  const splitGroupRef = useRef(false)
  function getAllUniqueMeshes(object3D) {
    const uniqueMeshes = new Set();
    if (!object3D) return;
    object3D.traverse((child) => {
      if (child.isMesh && !uniqueMeshes.has(child.uuid)) {
        uniqueMeshes.add(child.uuid);
      }
    });

    // Trả về mảng các mesh theo UUID
    const meshArray = [];
    object3D.traverse((child) => {
      if (child.isMesh && uniqueMeshes.has(child.uuid)) {
        meshArray.push(child);
        uniqueMeshes.delete(child.uuid); // đảm bảo không bị lặp
      }
    });

    return meshArray;
  }
  useEffect(() => {
    useGroupRef.current = useGroup
  }, [useGroup])
  useEffect(() => {
    if (!splitGroup) return
    splitGroupRef.current = splitGroup
    let groups = selectedObjectRef.current;
    let scene = sceneRef.current;
    // let children = getAllUniqueMeshes(groups);
    const meshSet = new Set();
    groups.traverse((child) => {
      if (!meshSet.has(child)) {
        meshSet.add(child);
      }
    });
    const childArr = Array.from(meshSet);
    if (groups && groups.type == 'Group' && childArr && childArr.length && scene) {
      childArr.forEach(objTT => {
        try {
          objTT.castShadow = true;
          objTT.material.side = THREE.DoubleSide;
          objTT.isSelectionBox = true;
          objTT.userData.selectable = true;
          objTT.userData.SelectionBox = true;
          objTT.userData.isChildGroup = null;
          objTT.userData.uuidTargetGroup = null;
          objTT.userData.targetGroup = null;
        } catch { }
        scene.attach(objTT)
      })
      if (groups.userData && groups.userData.bboxMesh) {
        scene.remove(groups.userData.bboxMesh)
      }
      if (groups.userData && groups.userData.pivot) {
        scene.remove(groups.userData.pivot)
      }
    }
  }, [splitGroup])
  function useTrackMouse3D(containerRef, camera, onUpdatePosition) {
    useEffect(() => {
      if (!containerRef.current) return;

      const raycaster = new THREE.Raycaster();
      const mouse = new THREE.Vector2();
      const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0); // mặt phẳng XZ (y=0)
      const intersectPoint = new THREE.Vector3();

      function onMouseMove(event) {
        const rect = containerRef.current.getBoundingClientRect();

        mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        raycaster.setFromCamera(mouse, camera);

        if (raycaster.ray.intersectPlane(plane, intersectPoint)) {
          onUpdatePosition(intersectPoint.clone());
        }
      }
      containerRef.current.addEventListener("mousemove", onMouseMove);
      return () => {
        try {
          containerRef.current.removeEventListener("mousemove", onMouseMove);
        } catch { }
      };
    }, [containerRef, camera, onUpdatePosition]);
  }
  useTrackMouse3D(containerRef, cameraRef.current, (pos) => {
    setMousePos3D(pos);
  });

  useEffect(() => {
    if (
      !cameraRef ||
      !cameraRef.current ||
      !cameraPosition ||
      !cameraPosition.length
    )
      return;
    // const camera = cameraRef.current
    // camera.position.set(...cameraPosition)
    // camera.lookAt(0, 0, 0);
    if (cameraSphereRef && cameraSphereRef.current) {
      cameraSphereRef.current.position.set(...cameraPosition);
    }

    const controls = controlsRef.current;
    controls.target.set(cameraPosition[0], 0, cameraPosition[2]); // thường là tâm lưới
    controls.update();
  }, [cameraPosition]);

  // Tạo debounce 1 lần duy nhất
  const debouncedUpdatePosition = useRef(
    _.debounce(() => {
      if (selectedObjectRef && selectedObjectRef.current) {
        const obj = selectedObjectRef.current.userData?.pivot || selectedObjectRef.current;
        if (obj) {
          const pos = obj.position.toArray();
          setpositionSelectObjet(pos);
        }
      }
    }, 500)
  ).current;
  const throttledUpdatePosition = useRef(
    _.throttle(() => {
      if (selectedObjectRef && selectedObjectRef.current) {
        const obj = selectedObjectRef.current.userData?.pivot || selectedObjectRef.current;
        if (obj) {
          const pos = obj.position.toArray();
          setpositionSelectObjet(pos);
        }
      }
    }, 200) // mỗi 100ms gọi 1 lần
  ).current;
  useEffect(() => {
    try {
      const renderer = rendererRef.current;
      if (renderer && renderer.domElement)
        containerRef.current.removeChild(renderer.domElement);
    } catch { }
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

    camera.position.set(gridSize[0], gridSize[0], gridSize[1]);
    // camera.position.set(cameraPosition)

    camera.lookAt(gridSize[0] / 2, 0, gridSize[1] / 2);
    cameraRef.current = camera;
    // tạo 1 khối cầu tượng trưng cho camera
    // Tạo vật thể sphere màu đỏ ở vị trí cameraPosition
    const geometry = new THREE.SphereGeometry(5, 32, 32); // bán kính 0.5
    const material = new THREE.MeshStandardMaterial({ color: "red" });
    const cameraSphere = new THREE.Mesh(geometry, material);

    // Đặt vị trí cho khối cầu (giả sử cameraPosition là mảng [x, y, z])
    cameraSphere.position.set(...cameraPosition);
    cameraSphereRef.current = cameraSphere;
    // Thêm vào scene
    scene.add(cameraSphere);



    // // Tạo mesh ví dụ
    let createBox = [];
    const boxGeo = new THREE.BoxGeometry(5, 5, 5);
    for (let i = 0; i < 30; i++) {
      const boxMat = new THREE.MeshStandardMaterial({ color: 0x0088ff });
      const mesh = new THREE.Mesh(boxGeo, boxMat);
      mesh.position.set(
        Math.random() * 200 - 25 + gridSize[0] / 2,
        Math.random() * 50 + 25,
        Math.random() * 200 - 25 + gridSize[1] / 2
      );
      mesh.userData.selectable = true;
      mesh.userData.SelectionBox = true;
      mesh.isSelectionBox = true;
      scene.add(mesh);
      createBox.push(mesh);
      // interactableMeshes.current.push(mesh);
    }
    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(sceneWidth, sceneHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(gridSize[0] / 2, 0, gridSize[1] / 2);
    controls.update();
    controlsRef.current = controls;


    // const transformControlsT = new TransformControls(camera, renderer.domElement);
    // transformControlsT.attach(createBox[0]);
    // scene.add(transformControlsT.getHelper());
    // if (selectedObjectRef && selectedObjectRef.current) {
    //   const myObj = selectedObjectRef.current
    //   transformControlsT.attach(myObj);
    //   transformControlsT.addEventListener('objectChange', () => {
    //   });
    // }

    // // Tạo div vùng chọn (selection rect)
    // const selectionRect = document.createElement("div");
    // selectionRect.style.position = "absolute";
    // selectionRect.style.border = "1px dashed red";
    // selectionRect.style.display = "none";
    // selectionRect.style.pointerEvents = "none";
    // containerRef.current.appendChild(selectionRect);
    // selectionRectRef.current = selectionRect;

    const selectionBoxT = new SelectionBox(camera, scene);
    selectionRectRef.current = selectionBoxT;
    const helperSelectionBoxT = new SelectionHelper(
      renderer,
      "selectBox-selected"
    );
    const offset = new THREE.Vector3();
    const startMouse = new THREE.Vector2();
    const startRotation = new THREE.Euler();
    const startScale = new THREE.Vector3();
    const plane = new THREE.Plane();
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    helperSelectionBoxT.enabled = false;
    helperSelectionBoxT.element.style.display = "block";
    selectionHelperRef.current = helperSelectionBoxT;
    // suaoday
    function onMouseDown(event) {
      const rect = renderer.domElement.getBoundingClientRect();
      if (isSelectingRect && isSelectingRect.current) {
        controls.enabled = false;
        // isSelecting = true;
        selectionHelperRef.current.enabled = true;
        // const scrollLeft1 = window.pageXOffset || document.documentElement.scrollLeft;
        // const scrollTop2 = window.pageYOffset || document.documentElement.scrollTop;
        const rect = renderer.domElement.getBoundingClientRect();
        const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        selectionRectRef.current.startPoint.set(x, y, 0.5);
        // const ndc = new THREE.Vector3(x, y, 0.5); // NDC: z = giữa near và far
        // ndc.unproject(camera); // Chuyển sang world
        // selectionRectRef.current.startPoint.set(x, y, 0.5);
        selectionHelperRef.current.element.style.borderColor = `green`;
        // selectionHelperRef.current._onSelectStart(event);
      } else if (isCtrlAddSelectingRect && isCtrlAddSelectingRect.current) {
        mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        raycaster.setFromCamera(mouse, camera);

        const intersects_scene = raycaster.intersectObjects(
          sceneRef.current.children,
          true
        );
        const intersects = intersects_scene.filter(
          (obj) =>
            obj.object &&
            obj.object.userData &&
            obj.object.userData.SelectionBox
        );
        if (intersects.length > 0) {
          let pickedMesh;
          let objFrom;
          let meshBoudingboxOfGroup;
          if (
            intersects[0].object.userData &&
            intersects[0].object.userData.uuidTargetGroup
          ) {
            pickedMesh = intersects[0].object.userData.targetGroup;
            meshBoudingboxOfGroup = intersects[0].object
            objFrom = 'group'
          } else {
            pickedMesh = intersects[0].object;
            objFrom = 'mesh'
          }
          if (pickedMesh && objFrom) {
            if (objFrom == 'mesh') {
              setArrayObjectSelected(prev => {
                const idx = prev.findIndex(obj => obj.uuid === pickedMesh.uuid);
                if (idx >= 0) {
                  // Đã có → xoá
                  const newArr = [...prev];
                  newArr.splice(idx, 1);
                  return newArr;
                } else {
                  // Chưa có → thêm
                  return [...prev, pickedMesh];
                }
              });
            } else if (objFrom == 'group' && meshBoudingboxOfGroup) {
              // pickedMesh đang là group nên add vào hay xóa đi phải tìm các mesh con bên trong nhé
              setArrayObjectSelected(prev => {
                const existing = new Map(prev.map(obj => [obj.uuid, obj]));
                if (pickedMesh?.children?.length) {
                  pickedMesh.children.forEach(mesh => {
                    if (!mesh.userData.meshBoudingBoxOfGroup) {
                      if (existing.has(mesh.uuid)) {
                        // // nếu k xóa sẽ bị lỗi lặp vì cái mesh này đang tham chiếu đến 1 target group khác nên clone là ko thể
                        // mesh.userData = {
                        //   SelectionBox: true,
                        //   selectable: true
                        // }
                        // mesh.updateMatrixWorld();
                        // const worldPos = new THREE.Vector3();
                        // const worldQuat = new THREE.Quaternion();
                        // const worldScale = new THREE.Vector3();
                        // mesh.matrixWorld.decompose(worldPos, worldQuat, worldScale);
                        // const meshClone = mesh.clone()
                        // meshClone.position.copy(worldPos);
                        // meshClone.quaternion.copy(worldQuat);
                        // meshClone.scale.copy(worldScale);
                        // sceneRef.current.add(meshClone)
                        existing.delete(mesh.uuid);
                      } else {
                        existing.set(mesh.uuid, mesh);
                      }
                    }

                  });
                }

                return Array.from(existing.values());
              });
              // setArrayObjectSelected(prev => {
              //   const idx = prev.findIndex(obj => obj.uuid === pickedMesh.uuid);
              //   if (idx >= 0) {
              //     // Đã có → xoá
              //     const newArr = [...prev];
              //     newArr.splice(idx, 1);
              //     return newArr;
              //   } else {
              //     // Chưa có → thêm
              //     return [...prev, pickedMesh];
              //   }
              // });
            }

          }
        }
      } else {
        mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        raycaster.setFromCamera(mouse, camera);

        const intersects_scene = raycaster.intersectObjects(
          sceneRef.current.children,
          true
        );
        const intersects = intersects_scene.filter(
          (obj) =>
            obj.object &&
            obj.object.userData &&
            obj.object.userData.SelectionBox
        );
        if (intersects.length > 0) {
          let pickedMesh;
          if (
            intersects[0].object.userData &&
            intersects[0].object.userData.uuidTargetGroup
          ) {
            pickedMesh = intersects[0].object.userData.targetGroup;
          } else {
            pickedMesh = intersects[0].object;
          }
          selectedObjectRef.current = pickedMesh;

          isMoveRotateScaleRef.current = true;
          controls.enabled = false;

          if (modeRef.current === "drag") {
            const pivot = pickedMesh.userData.pivot || pickedMesh;
            const worldPoint = new THREE.Vector3();
            pivot.getWorldPosition(worldPoint);

            const normal = new THREE.Vector3();
            camera.getWorldDirection(normal);
            plane.setFromNormalAndCoplanarPoint(normal, worldPoint);

            const intersection = new THREE.Vector3();
            if (raycaster.ray.intersectPlane(plane, intersection)) {
              offset.copy(intersection).sub(worldPoint);
            } else {
              offset.set(0, 0, 0);
            }
          } else if (modeRef.current === "rotate") {
            startMouse.set(event.clientX, event.clientY);
            const pivot = pickedMesh.userData.pivot || pickedMesh;
            startRotation.copy(pivot.rotation);
          } else if (modeRef.current === "scale") {
            startMouse.set(event.clientX, event.clientY);
            const pivot = pickedMesh.userData.pivot || pickedMesh;
            startScale.copy(pivot.scale);
          }
        } else {
          selectedObjectRef.current = null;
          setArrayObjectSelected((prev) => [])
        }

      }
      setselectedRefObJSelected(selectedObjectRef.current);
      if (arrUuidBoxMeshGroup && arrUuidBoxMeshGroup.current && arrUuidBoxMeshGroup.current.length) {
        for (let i = 0; i < arrUuidBoxMeshGroup.current.length; i++) {
          if (selectedObjectRef && selectedObjectRef.current && selectedObjectRef.current.uuid == arrUuidBoxMeshGroup.current[i]) {
            selectedObjectRef.current.visible = true
          } else if (selectedObjectRef && selectedObjectRef.current && selectedObjectRef.current.userData && selectedObjectRef.current.userData.bboxMesh) {
            const object = sceneRef.current.getObjectByProperty('uuid', selectedObjectRef.current.userData.bboxMesh.uuid);
            if (object) {
              object.visible = true
            }
          } else {
            // cần phải ấn hết các mesh của các box này đi
            const object = sceneRef.current.getObjectByProperty('uuid', arrUuidBoxMeshGroup.current[i]);
            if (object) {
              object.visible = false
            }
          }
        }
      }
    }

    function onMouseMove(event) {

      if (!isSelectingRect && isSelectingRect.current) {
        // selectionHelperRef.current._onSelectMove(event);
        const rect = renderer.domElement.getBoundingClientRect();
        const mouseX = event.clientX - rect.left;
        const mouseY = event.clientY - rect.top;
        const x = (mouseX / rect.width) * 2 - 1;
        const y = -(mouseY / rect.height) * 2 + 1;
        const selectionBox = selectionRectRef.current;
        selectionBox.endPoint.set(x, y, 0.5);
      } else {
        if (
          !isMoveRotateScaleRef ||
          !isMoveRotateScaleRef.current ||
          !selectedObjectRef.current
        )
          return;
        const rect = renderer.domElement.getBoundingClientRect();
        mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        const obj = selectedObjectRef.current;

        if (modeRef.current === "drag") {
          raycaster.setFromCamera(mouse, camera);
          const intersection = new THREE.Vector3();
          if (raycaster.ray.intersectPlane(plane, intersection)) {
            const pivot = obj.userData.pivot || obj;
            const newPos = intersection.clone().sub(offset);
            if (pivot.parent) {
              pivot.position.copy(pivot.parent.worldToLocal(newPos));
            } else {
              pivot.position.copy(newPos);
            }
          }
        } else if (modeRef.current === "rotate") {
          const pivot = obj.userData.pivot || obj;
          const deltaX = event.clientX - startMouse.x;
          const deltaY = event.clientY - startMouse.y;

          const rotateSpeed = 0.005;

          // Xoay quanh trục Y khi kéo ngang
          pivot.rotation.y = startRotation.y + deltaX * rotateSpeed;

          // Xoay quanh trục X khi kéo dọc
          pivot.rotation.x = startRotation.x + deltaY * rotateSpeed;

          // pivot.rotation.z = startRotation.z + deltaX * rotateSpeed;
        } else if (modeRef.current === "scale") {
          const pivot = obj.userData.pivot || obj;
          const delta = event.clientY - startMouse.y;
          const scaleFactor = Math.max(0.1, startScale.x + delta * 0.01); // scale không nhỏ hơn 0.1
          pivot.scale.set(scaleFactor, scaleFactor, scaleFactor);

          // const delta = event.clientY - startMouse.y;
          // const newScale = Math.max(0.1, startScale.x + delta * 0.01);
          // obj.scale.set(newScale, newScale, newScale);
        }
      }
      // debouncedUpdatePosition()
      throttledUpdatePosition()

    }
    function onMouseUp(event) {
      if (isMoveRotateScaleRef && isMoveRotateScaleRef.current) {
        isMoveRotateScaleRef.current = false;
        // selectedObjectRef.current = null;  // BỎ DÒNG NÀY đi
        controls.enabled = true;
      }
      if (isSelectingRect && isSelectingRect.current) {
        //   if (isSelecting) {
        //   isSelecting = false;
        //   // selectedObjectRef.current = null;  // BỎ DÒNG NÀY đi
        //   controls.enabled = true;
        // }
        const rect = renderer.domElement.getBoundingClientRect();
        const mouseX = event.clientX - rect.left;
        const mouseY = event.clientY - rect.top;
        const x = (mouseX / rect.width) * 2 - 1;
        const y = -(mouseY / rect.height) * 2 + 1;
        const selectionBox = selectionRectRef.current;
        selectionBox.endPoint.set(x, y, 0.5);
        const allSelected = selectionBox.select();
        let filterAllSelected2 = [];
        const filterAllSelected = allSelected.filter(
          (obj) => {
            if (obj.userData && obj.userData.SelectionBox) {
              if (!obj.userData.isChildGroup && !obj.userData.isBBox) {
                obj.userData = {
                  SelectionBox: true,
                  selectable: true
                }
                filterAllSelected2.push(obj)
                return true
              } else if (obj.userData.meshBoudingBoxOfGroup && obj.userData.isBBox && obj.userData.targetGroup) {
                if (obj.userData.targetGroup && obj.userData.targetGroup.children && obj.userData.targetGroup.children.length) {
                  obj.userData.targetGroup.children.forEach(objjT => {
                    if (objjT.userData && objjT.userData && !objjT.userData.meshBoudingBoxOfGroup && !objjT.userData.isBBox) {
                      objjT.userData = {
                        SelectionBox: true,
                        selectable: true
                      }
                      filterAllSelected2.push(objjT)
                    }
                  })

                }
                return true
              }
            }
            return false;
          }
        );
        setArrayObjectSelected(filterAllSelected2);
      }
    }
    renderer.domElement.addEventListener("mousedown", onMouseDown);
    renderer.domElement.addEventListener("mousemove", onMouseMove);
    renderer.domElement.addEventListener("mouseup", onMouseUp);
    const funckeydown = (event) => {
      pressedKeys.current.add(event.key);
      // ✅ Chỉ bật nếu duy nhất 1 phím và là Shift
      if (pressedKeys.current.size === 1 && pressedKeys.current.has("Shift")) {
        isSelectingRect.current = true;
        isCtrlAddSelectingRect.current = false
        controls.enabled = false;
        if (
          selectionHelperRef &&
          selectionHelperRef.current &&
          !selectionHelperRef.current.enabled
        ) {
          selectionHelperRef.current.enabled = true;
          selectionHelperRef.current.element.style.display = "block";
        }
      } else if (pressedKeys.current.size === 1 && pressedKeys.current.has("Control")) {
        isSelectingRect.current = false;
        isCtrlAddSelectingRect.current = true
      } else {
        isSelectingRect.current = false;
        isCtrlAddSelectingRect.current = false
        controls.enabled = true;
        if (selectionHelperRef.current) {
          selectionHelperRef.current.enabled = false;
          selectionHelperRef.current.element.style.display = "none";
          selectionHelperRef.current.element.style.width = 0;
          selectionHelperRef.current.element.style.height = 0;
        }
        if (selectionRectRef && selectionRectRef.current) {
          selectionRectRef.current.startPoint.set(0, 0, 0);
          selectionRectRef.current.endPoint.set(0, 0, 0);
          selectionRectRef.current.collection = [];
        }

        console.log(
          "❌ Không hợp lệ (đồng thời nhiều phím hoặc không phải Shift)"
        );
      }
    }
    const funckeyup = (event) => {
      pressedKeys.current.delete(event.key);
      // Nếu bỏ Shift → tắt luôn
      if (event.key === "Shift") {
        isSelectingRect.current = false;
        controls.enabled = true;
        if (selectionHelperRef.current) {
          selectionHelperRef.current.enabled = false;
          selectionHelperRef.current.element.style.display = "none";
          selectionHelperRef.current.element.style.width = 0;
          selectionHelperRef.current.element.style.height = 0;
        }
        if (selectionRectRef && selectionRectRef.current) {
          selectionRectRef.current.startPoint.set(0, 0, 0);
          selectionRectRef.current.endPoint.set(0, 0, 0);
          selectionRectRef.current.collection = [];
        }
        console.log("🛑 Thả Shift → tắt chế độ quét");
      }
      if (event.key === "Control") {
        isCtrlAddSelectingRect.current = false;
        controls.enabled = true;
      }
    }
    window.addEventListener("keydown", funckeydown);
    window.addEventListener("keyup", funckeyup);
    const handleWindowBlur = () => {
      pressedKeys.current.clear();
    };

    window.addEventListener("blur", handleWindowBlur);
    window.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") {
        pressedKeys.current.clear();
      }
    });


    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);
      controls.update();

      // Cập nhật bounding box vị trí theo group
      try {
        // if (simulatedMesh.current.userData.bboxMesh) {
        //   const bboxMesh = simulatedMesh.current.userData.bboxMesh;
        //   // Nếu bboxMesh chưa phải là con của simulatedMesh, add vào
        //   if (bboxMesh.parent !== simulatedMesh.current) {
        //     simulatedMesh.current.add(bboxMesh);
        //   }
        // }
        // if (simulatedMesh.current.userData.bboxMesh) {
        //   const box = new THREE.Box3().setFromObject(simulatedMesh.current);
        //   const size = new THREE.Vector3();
        //   box.getSize(size);
        //   const center = new THREE.Vector3();
        //   box.getCenter(center);
        //   const bboxMesh = simulatedMesh.current.userData.bboxMesh;
        //   bboxMesh.position.copy(center);
        //   bboxMesh.scale.set(
        //     size.x / bboxMesh.geometry.parameters.width,
        //     size.y / bboxMesh.geometry.parameters.height,
        //     size.z / bboxMesh.geometry.parameters.depth
        //   );
        // }
      } catch { }

      renderer.render(scene, camera);
    };
    animate();
    return () => {
      // createBox.forEach((m) => {
      //   scene.remove(m);
      //   m.geometry.dispose();
      //   m.material.dispose();
      // });
      window.removeEventListener("keydown", funckeydown);
      window.removeEventListener("keyup", funckeyup);
    };
  }, []);
  const selectedGroupRefOld = usePrevious(arrayObjectSelected);
  // useEffect(() => {
  // }, [selectedGroupRefOld]);


  useEffect(() => {
    // suaoday
    const scene = sceneRef.current;
    if (!scene) return;
    if (selectedGroupRefOld && selectedGroupRefOld.length) {
      selectedGroupRefOld.forEach((mesh) => {
        try {
          mesh.userData.isChildGroup = null;
          mesh.userData.targetGroup = null;
          mesh.userData.uuidTargetGroup = null;
        } catch { }
        // scene.attach(mesh);
      });
    }

    if (!arrayObjectSelected || arrayObjectSelected.length === 0) {
      return;
    }
    // Tạo group mới và thêm mesh đã chọn vào
    const selectedGroup = new THREE.Group();
    selectedGroup.disabledSplit = true
    selectedGroup.filterBbox = true;
    // const selectedGroup = simulatedMesh.current
    arrayObjectSelected.forEach((mesh) => {
      // scene.remove(mesh);
      // selectedGroup.add(mesh);
      mesh.userData.isChildGroup = true;
      mesh.userData.targetGroup = selectedGroup;
      mesh.userData.uuidTargetGroup = selectedGroup.uuid;
      selectedGroup.attach(mesh);
    });
    // Tạo bounding box cho group
    // const bboxHelper = new THREE.BoxHelper(selectedGroup, "yellow");
    // selectedGroup.add(bboxHelper);

    // tạo 1 mesh là boudingbox cua group de co the dung quet duoc mesh nay tim lai group cha
    const box = new THREE.Box3().setFromObject(selectedGroup);
    const size = new THREE.Vector3();
    box.getSize(size);
    const center = new THREE.Vector3();
    box.getCenter(center);
    const geo = new THREE.BoxGeometry(size.x, size.y, size.z);
    const mat = new THREE.MeshBasicMaterial({
      color: "blue",
      wireframe: true,
      // color: "blue",
      // wireframe: false, // TẮT wireframe
      // transparent: true,
      // opacity: 0.1, // Trong suốt nhẹ
      // depthWrite: false, // Để không ảnh hưởng đến chiều sâu cảnh
    });
    const bboxMesh = new THREE.Mesh(geo, mat);
    bboxMesh.userData.isBBox = true;
    bboxMesh.userData.selectable = true;
    bboxMesh.userData.SelectionBox = true;
    bboxMesh.userData.targetGroup = selectedGroup;
    bboxMesh.userData.uuidTargetGroup = selectedGroup.uuid;
    bboxMesh.userData.meshBoudingBoxOfGroup = selectedGroup.uuid;
    arrUuidBoxMeshGroup.current.push(bboxMesh.uuid)
    selectedGroup.userData.bboxMesh = bboxMesh;
    simulatedMesh.current = selectedGroup;

    // --- THÊM ĐOẠN NÀY: TẠO PIVOT ---
    const pivot = new THREE.Object3D();
    pivot.position.copy(center); // tâm group
    scene.add(pivot);
    pivot.add(selectedGroup);
    pivot.add(bboxMesh);
    selectedGroup.position.sub(center);      // ✅ đúng: giữ vị trí cũ sau khi vào pivot
    bboxMesh.position.copy(center);  // đặt về world
    bboxMesh.position.sub(pivot.position); // ✅ chuyển về local trong pivot
    // Gán pivot vào userData
    selectedGroup.userData.pivot = pivot;
    bboxMesh.userData.pivot = pivot; // để bắt sau này
    selectedObjectRef.current = selectedGroup
    // Cleanup khi effect thay đổi hoặc component unmount
    if (sceneRef && sceneRef.current) {
      let pivotDel = []
      sceneRef.current.traverse((obj) => {
        if (obj.type === 'Group' && obj.filterBbox) {
          let check = false
          if (obj && obj.children && obj.children.length) {
            for (let i = 0; i < obj.children.length; i++) {
              if (obj.children[i].userData && obj.children[i].userData.SelectionBox && obj.children[i].userData.selectable && !obj.children[i].userData.meshBoudingBoxOfGroup && !obj.children[i].userData.pivot) {
                check = true
                break
              }
            }
            if (!check && obj.userData.pivot) {
              pivotDel.push(obj.userData.pivot)

            }
          } else if (obj && (!obj.children || !obj.children.length) && obj.userData.pivot) {
            pivotDel.push(obj.userData.pivot)
          }
        }
      });
      if (pivotDel && pivotDel.length) {
        for (let i = 0; i < pivotDel.length; i++) {
          sceneRef.current.remove(pivotDel[i])
        }
      }
    }
    return () => {
      // sau khi xoa thi xoa cai group di
      // scene.remove(selectedGroup);
      // scene.remove(bboxMesh);
      // scene.remove(pivot);
    };
  }, [arrayObjectSelected]);

  const [sceneRefBackground, setSceneRefBackground] = useColor("#fff");
  const handleClickOpen = () => {
    setOpen(true);
  };
  const handleClose = () => {
    setSceneBackground(sceneRefBackground.hex);
    setOpen(false);
  };

  const [openWallColor, setOpenWallcolor] = React.useState(false);
  const [sceneWallColor, setSceneWallColor] = useState("#dbe5e6");
  const [sceneRefWallColor, setSceneRefWallColor] = useColor("#dbe5e6");
  const handleClickOpenWallColor = () => {
    setOpenWallcolor(true);
  };
  const handleCloseWallColor = () => {
    setSceneWallColor(sceneRefWallColor.hex);
    setOpenWallcolor(false);
  };

  const [openFloorColor, setOpenFloorcolor] = React.useState(false);
  const [sceneFloorColor, setSceneFloorColor] = useState("#e7d9a9");
  const [sceneRefFloorColor, setSceneRefFloorColor] = useColor("#e7d9a9");
  const handleClickOpenFloorColor = () => {
    setOpenFloorcolor(true);
  };
  const handleCloseFloorColor = () => {
    setSceneFloorColor(sceneRefFloorColor.hex);
    setOpenFloorcolor(false);
  };

  useEffect(() => {
    onlyMoveOnOXZRef.current = checkMoveOXZ;
  }, [checkMoveOXZ]);
  useEffect(() => {
    if (sceneRef && sceneRef.current) {
      sceneRef.current.background = new THREE.Color(sceneBackground); // Mặc định
    }
  }, [sceneBackground]);

  useEffect(() => {
    if (floorRef && floorRef.current) {
      floorRef.current.updateColor(sceneFloorColor);
    }
  }, [sceneFloorColor]);

  useEffect(() => {
    if (
      dataDeepFloorplan &&
      dataDeepFloorplan.wall &&
      dataDeepFloorplan.wall[0] &&
      dataDeepFloorplan.wall[0].points &&
      dataDeepFloorplan.wall[0].points.length &&
      dataDeepFloorplan.sizeImg
    ) {
      const findConsecutiveRangesT = findConsecutiveRanges(
        dataDeepFloorplan.wall[0].points,
        dataDeepFloorplan.sizeImg
      );
      const wallThreejs = findConsecutiveRangesT.result;
      if (
        findConsecutiveRangesT.minX &&
        findConsecutiveRangesT.maxX &&
        findConsecutiveRangesT.minZ &&
        findConsecutiveRangesT.maxZ
      ) {
        setFloorStore({
          minX: findConsecutiveRangesT.minX,
          maxX: findConsecutiveRangesT.maxX,
          minZ: findConsecutiveRangesT.minZ,
          maxZ: findConsecutiveRangesT.maxZ,
        });
      }
      let labels = createLabeledArray(dataDeepFloorplan.sizeImg, dataDeepFloorplan.wall[0].points)
      const findRectanglesT = findRectangles(labels)

      setWallStore(wallThreejs);
      setWallStoreV2(findRectanglesT)
      setGridSize(dataDeepFloorplan.sizeImg);
    }
  }, [dataDeepFloorplan]);

  useEffect(() => {
    if (!containerRef.current) return;

    const sceneWidth = containerRef.current.clientWidth;
    const sceneHeight = containerRef.current.clientHeight;

    // Scene setup
    const scene = sceneRef.current;

    // Camera
    const camera = cameraRef.current;
    camera.position.set(gridSize[0], gridSize[0], gridSize[1]);
    camera.lookAt(gridSize[0] / 2, 0, gridSize[1] / 2);

    // Renderer
    const renderer = rendererRef.current;

    // Controls
    // const controls = new OrbitControls(camera, renderer.domElement);
    // controls.target.set(gridSize[0] / 2, 0, gridSize[1] / 2);
    // controls.update();
    // controlsRef.current = controls;
    const controls = controlsRef.current;
    // controls.target.set(gridSize[0] / 2, 0, gridSize[1] / 2);
    // // controls.update();

    // // Lights
    // const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    // const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    // directionalLight.castShadow = true;
    // directionalLight.position.set(gridSize[0], gridSize[1], gridSize[0]);
    // scene.add(ambientLight, directionalLight);

    // Walls
    let wallHeightC = 5 * 10;
    if (wallHeight && wallHeight >= 0) {
      wallHeightC = wallHeight * 10;
    }
    const wallMeshes = [];
    const wallColor = sceneWallColor ? sceneWallColor : "#dbe5e6";
    // trước khi vẽ tường mới thì cần xóa tường cũ -> giải phóng toàn bộ tường cũ trong mảng
    // vì đã chạy ở trong return rồi nên ko cần chạy ở đây nữa
    // if (wallUpdate && wallUpdate.length) {
    //   wallUpdate.forEach((wall) => {
    //     scene.remove(wall);
    //     wall.geometry.dispose();
    //     wall.material.dispose();
    //   })
    // }
    let wallUpdateT = [];
    // wallStore.forEach(({ start, end }) => {
    //   const wallMesh = Wall({
    //     start,
    //     end,
    //     width: 1,
    //     height: wallHeightC,
    //     scene,
    //     color: wallColor,
    //   });
    //   wallMeshes.push(wallMesh);
    //   wallUpdateT.push(wallMesh);
    // });
    wallStoreV2.forEach(({ x, y, width, height }) => {
      const wallMesh = Wall2({
        x,
        z: y,
        xWidth: width,
        zWidth: height,
        height: wallHeightC,
        scene,
        color: wallColor,
      });
      wallMeshes.push(wallMesh);
      wallUpdateT.push(wallMesh);
    });
    setWallUpdate(wallUpdateT);

    // // Lights
    // Ambient light nhẹ: là ánh sáng môi trường, ánh sáng chung, chiếu đều khắp mọi nơi trong cảnh.
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
    scene.add(ambientLight);
    const hemisphereLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.4); // Cường độ 0.5

    // const hemisphereLight = new THREE.HemisphereLight('a9b0b1', '#ccc', 0.4); // Cường độ 0.5
    scene.add(hemisphereLight);

    // Kích thước mặt lưới
    // Tạo đèn
    const rectLight = new THREE.RectAreaLight(
      "#dbe5e6",
      0.5,
      gridSize[0],
      gridSize[1]
    );
    // Chiếu ánh sáng hướng thẳng xuống nền (trục âm y)
    rectLight.position.set(gridSize[0] / 2, 0, gridSize[1] / 2);
    const rectLightHeigth = wallHeight * 10 * 1.2;
    rectLight.lookAt(gridSize[0] / 2, rectLightHeigth, gridSize[1] / 2);
    // Thêm vào scene
    scene.add(rectLight);
    // // (Tuỳ chọn) Thêm helper để bạn nhìn thấy vùng sáng
    // const helper = new RectAreaLightHelper(rectLight);
    // scene.add(helper);

    // Đèn DirectionalLight hỗ trợ đổ bóng :là ánh sáng có hướng cố định, giống như ánh sáng mặt trời.
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLightRef.current = directionalLight;
    // directionalLight.shadow.bias = -0.001;
    // position.set & target.position.set tức là chiếu từ điếm sáng đó về điểm target
    // do đó điểm sáng cần đặt ở ví trí góc ngoài cùng của lưới,cao = 1.5 * cao gốc
    const directionalLightY = Math.ceil(wallHeightC * 1.8);
    const directionalLightX = Math.ceil(gridSize[0] + 10);
    const directionalLightZ = Math.ceil(gridSize[1] + 10);
    directionalLight.position.set(
      directionalLightX,
      directionalLightY,
      directionalLightZ
    );
    directionalLight.target.position.set(0, 0, 0);
    // Tạo hình cầu để hiển thị vị trí của nguồn sáng
    const lightSphereGeometry = new THREE.SphereGeometry(4, 32, 32); // bán kính 2
    const lightSphereMaterial = new THREE.MeshBasicMaterial({
      color: 0xffff00,
    }); // màu vàng
    const lightSphere = new THREE.Mesh(
      lightSphereGeometry,
      lightSphereMaterial
    );
    // // Đặt hình cầu vào đúng vị trí của DirectionalLight
    lightSphere.position.set(
      directionalLightX,
      directionalLightY,
      directionalLightZ
    );
    lightSphereRef.current = lightSphere;
    lightSphere.visible = false;

    scene.add(lightSphere);
    // // --- Tính bounding box tổng thể scene ---
    const sceneBoundingBox = new THREE.Box3().setFromObject(scene);
    // // Tạo helper để hiển thị hộp bao
    // const boxHelperScene = new THREE.Box3Helper(sceneBoundingBox, 0x00ff00);
    // sceneBoundingBox.update = function () {
    //   this.setFromObject(scene); // Cập nhật lại hộp bao dựa trên scene
    // };
    // sceneBoundingBoxRef.current=sceneBoundingBox
    // scene.add(boxHelperScene);

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
      new THREE.Vector3(
        sceneBoundingBox.min.x,
        sceneBoundingBox.min.y,
        sceneBoundingBox.min.z
      ),
      new THREE.Vector3(
        sceneBoundingBox.min.x,
        sceneBoundingBox.min.y,
        sceneBoundingBox.max.z
      ),
      new THREE.Vector3(
        sceneBoundingBox.min.x,
        sceneBoundingBox.max.y,
        sceneBoundingBox.min.z
      ),
      new THREE.Vector3(
        sceneBoundingBox.min.x,
        sceneBoundingBox.max.y,
        sceneBoundingBox.max.z
      ),
      new THREE.Vector3(
        sceneBoundingBox.max.x,
        sceneBoundingBox.min.y,
        sceneBoundingBox.min.z
      ),
      new THREE.Vector3(
        sceneBoundingBox.max.x,
        sceneBoundingBox.min.y,
        sceneBoundingBox.max.z
      ),
      new THREE.Vector3(
        sceneBoundingBox.max.x,
        sceneBoundingBox.max.y,
        sceneBoundingBox.min.z
      ),
      new THREE.Vector3(
        sceneBoundingBox.max.x,
        sceneBoundingBox.max.y,
        sceneBoundingBox.max.z
      ),
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

    // const wallFillLight1 = directionalLight.clone();
    // wallFillLight1.position.set(directionalLightX / 2, directionalLightY, 0);
    // wallFillLight1.target.position.set(directionalLightX / 2, 0, directionalLightZ);
    // wallFillLight1.castShadow = false;
    // const wallFillLight2 = directionalLight.clone();
    // wallFillLight2.position.set(directionalLightX / 2, directionalLightY, directionalLightZ);
    // wallFillLight2.target.position.set(directionalLightX / 2, 0, 0);
    // wallFillLight2.castShadow = false;
    // const wallFillLight3 = directionalLight.clone();
    // wallFillLight3.position.set(0, directionalLightY, directionalLightZ / 2);
    // wallFillLight3.target.position.set(directionalLightX, 0, directionalLightZ / 2);
    // wallFillLight3.castShadow = false;
    // const wallFillLight4 = directionalLight.clone();
    // wallFillLight4.position.set(directionalLightX, directionalLightY, directionalLightZ / 2);
    // wallFillLight4.target.position.set(0, 0, directionalLightZ / 2);

    const wallFillLight1 = directionalLight.clone();
    wallFillLight1.intensity = 0.8;
    wallFillLight1.position.set(
      directionalLightX,
      directionalLightY,
      directionalLightZ
    );
    wallFillLight1.target.position.set(0, 0, 0);
    wallFillLight1.castShadow = false;
    const wallFillLight1_1 = directionalLight.clone();
    wallFillLight1_1.intensity = 0.3;
    // wallFillLight1_1.intensity = 0.2
    wallFillLight1_1.position.set(
      directionalLightX,
      directionalLightY,
      directionalLightZ
    );
    wallFillLight1_1.target.position.set(directionalLightX / 2, 0, 0);
    wallFillLight1_1.castShadow = false;
    const wallFillLight1_2 = directionalLight.clone();
    wallFillLight1_2.intensity = 0.4;
    // wallFillLight1_2.intensity = 0.2
    wallFillLight1_2.position.set(
      directionalLightX,
      directionalLightY,
      directionalLightZ
    );
    wallFillLight1_2.target.position.set(0, 0, directionalLightZ / 2);
    wallFillLight1_2.castShadow = false;

    const wallFillLight2 = directionalLight.clone();
    wallFillLight2.intensity = 0.8;
    wallFillLight2.position.set(0, directionalLightY, 0);
    wallFillLight2.target.position.set(directionalLightX, 0, directionalLightZ);
    wallFillLight2.castShadow = false;
    const wallFillLight2_1 = directionalLight.clone();
    wallFillLight2_1.intensity = 0.3;
    // wallFillLight2_1.intensity = 0.2
    wallFillLight2_1.position.set(0, directionalLightY, 0);
    wallFillLight2_1.target.position.set(
      directionalLightX / 2,
      0,
      directionalLightZ
    );
    wallFillLight2_1.castShadow = false;
    const wallFillLight2_2 = directionalLight.clone();
    wallFillLight2_2.intensity = 0.4;
    // wallFillLight2_2.intensity = 0.2
    wallFillLight2_2.position.set(0, directionalLightY, 0);
    wallFillLight2_2.target.position.set(
      directionalLightX,
      0,
      directionalLightZ / 2
    );
    wallFillLight2_2.castShadow = false;

    const wallFillLight3 = directionalLight.clone();
    wallFillLight3.intensity = 0.8;
    wallFillLight3.position.set(directionalLightX, directionalLightY, 0);
    wallFillLight3.target.position.set(0, 0, directionalLightZ);
    wallFillLight3.castShadow = false;
    const wallFillLight3_1 = directionalLight.clone();
    wallFillLight3_1.intensity = 0.3;
    // wallFillLight3_1.intensity = 0.2
    wallFillLight3_1.position.set(directionalLightX, directionalLightY, 0);
    wallFillLight3_1.target.position.set(0, 0, directionalLightZ / 2);
    wallFillLight3_1.castShadow = false;
    const wallFillLight3_2 = directionalLight.clone();
    wallFillLight3_2.intensity = 0.4;
    // wallFillLight3_2.intensity = 0.2
    wallFillLight3_2.position.set(directionalLightX, directionalLightY, 0);
    wallFillLight3_2.target.position.set(
      directionalLightX / 2,
      0,
      directionalLightZ
    );
    wallFillLight3_2.castShadow = false;

    const wallFillLight4 = directionalLight.clone();
    wallFillLight4.intensity = 0.8;
    wallFillLight4.position.set(0, directionalLightY, directionalLightZ);
    wallFillLight4.target.position.set(directionalLightX, 0, 0);
    wallFillLight4.castShadow = false;
    const wallFillLight4_1 = directionalLight.clone();
    wallFillLight4_1.intensity = 0.3;
    // wallFillLight4_1.intensity = 0.2
    wallFillLight4_1.position.set(0, directionalLightY, directionalLightZ);
    wallFillLight4_1.target.position.set(directionalLightX / 2, 0, 0);
    wallFillLight4_1.castShadow = false;
    const wallFillLight4_2 = directionalLight.clone();
    wallFillLight4_2.intensity = 0.4;
    // wallFillLight4_2.intensity = 0.2
    wallFillLight4_2.position.set(0, directionalLightY, directionalLightZ);
    wallFillLight4_2.target.position.set(
      directionalLightX,
      0,
      directionalLightZ / 2
    );
    wallFillLight4_2.castShadow = false;

    // wallFillLight1.castShadow = true;
    // wallFillLight2.castShadow = true;
    // wallFillLight3.castShadow = true;
    // wallFillLight4.castShadow = true;
    scene.add(directionalLight);
    scene.add(wallFillLight1, wallFillLight2, wallFillLight3, wallFillLight4);
    scene.add(
      wallFillLight1_1,
      wallFillLight2_1,
      wallFillLight3_1,
      wallFillLight4_1
    );
    scene.add(
      wallFillLight1_2,
      wallFillLight2_2,
      wallFillLight3_2,
      wallFillLight4_2
    );

    const wallDirectionalLight = new THREE.DirectionalLightHelper(
      directionalLight,
      5,
      "red"
    );
    const wallFillLightHelper1 = new THREE.DirectionalLightHelper(
      wallFillLight1,
      5,
      "green"
    );
    const wallFillLightHelper1_1 = new THREE.DirectionalLightHelper(
      wallFillLight1_1,
      5,
      "green"
    );
    const wallFillLightHelper1_2 = new THREE.DirectionalLightHelper(
      wallFillLight1_2,
      5,
      "green"
    );
    const wallFillLightHelper2 = new THREE.DirectionalLightHelper(
      wallFillLight2,
      5,
      "blue"
    );
    const wallFillLightHelper2_1 = new THREE.DirectionalLightHelper(
      wallFillLight2_1,
      5,
      "blue"
    );
    const wallFillLightHelper2_2 = new THREE.DirectionalLightHelper(
      wallFillLight2_2,
      5,
      "blue"
    );
    const wallFillLightHelper3 = new THREE.DirectionalLightHelper(
      wallFillLight3,
      5,
      "yellow"
    );
    const wallFillLightHelper3_1 = new THREE.DirectionalLightHelper(
      wallFillLight3_1,
      5,
      "yellow"
    );
    const wallFillLightHelper3_2 = new THREE.DirectionalLightHelper(
      wallFillLight3_2,
      5,
      "yellow"
    );
    const wallFillLightHelper4 = new THREE.DirectionalLightHelper(
      wallFillLight4,
      5,
      "orange"
    );
    const wallFillLightHelper4_1 = new THREE.DirectionalLightHelper(
      wallFillLight4_1,
      5,
      "orange"
    );
    const wallFillLightHelper4_2 = new THREE.DirectionalLightHelper(
      wallFillLight4_2,
      5,
      "orange"
    );
    // scene.add(wallDirectionalLight)
    // scene.add(wallFillLightHelper1, wallFillLightHelper2, wallFillLightHelper3, wallFillLightHelper4);
    // scene.add(wallFillLightHelper1_1, wallFillLightHelper2_1, wallFillLightHelper3_1, wallFillLightHelper4_1);
    // scene.add(wallFillLightHelper1_2, wallFillLightHelper2_2, wallFillLightHelper3_2, wallFillLightHelper4_2);

    // floor:nền nhà
    let floorHouse;
    if (
      floorStore &&
      floorStore.minX &&
      floorStore.maxX &&
      floorStore.maxZ &&
      floorStore.minZ
    ) {
      const floorMinX = floorStore.minX;
      const floorMaxX = floorStore.maxX;
      const floorMinZ = floorStore.minZ;
      const floorMaxZ = floorStore.maxZ;
      const floorWidth = Math.abs(floorMaxX - floorMinX);
      const floorDepth = Math.abs(floorMaxZ - floorMinZ);
      const floorHeight = 5; // độ dày nền
      const geometryFloor = new THREE.BoxGeometry(
        floorWidth,
        floorHeight,
        floorDepth
      );
      const materialFloor = new THREE.MeshStandardMaterial({
        color: sceneFloorColor ? sceneFloorColor : "#f5f5dc",
        roughness: 0.3,
        shininess: 1,
        transparent: true,
      });
      floorHouse = new THREE.Mesh(geometryFloor, materialFloor);
      // floorHouse.roughness = 0.9; // nền mờ hơn
      floorHouse.castShadow = true;
      floorHouse.receiveShadow = true;
      floorHouse.position.set(
        (floorMinX + floorMaxX) / 2,
        floorHeight / 2, // để nền nằm trên mặt phẳng y=0
        (floorMinZ + floorMaxZ) / 2
      );
      floorHouse.updateColor = (newColor) => {
        if (floorHouse.material) {
          floorHouse.material.color.set(newColor);
          floorHouse.material.needsUpdate = true;
        }
      };
      scene.add(floorHouse);
      floorRef.current = floorHouse;
    }

    // Grid
    const grid = CustomGrid({
      width: gridSize[0],
      height: gridSize[1],
      divisionsX: gridSize[0],
      divisionsY: gridSize[1],
      scene,
      displayGridSence,
    });
    gridSenceRef.current = grid;

    // Animate
    const animate = () => {
      requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // Cleanup on unmount
    // return tức hiểu là khi phần tử này bị xóa khỏi dom hoặc ở đây theo dõi 3 param nếu thay đổi thì chạy vào hàm này,
    return () => {
      wallMeshes.forEach((m) => {
        scene.remove(m);
        m.geometry.dispose();
        m.material.dispose();
      });
      scene.remove(grid);
      grid.geometry.dispose();
      grid.material.dispose();
      if (floorHouse) {
        scene.remove(floorHouse);
        floorHouse.geometry.dispose();
        floorHouse.material.dispose();
      }
      // xóa đi các nguồn sáng
      scene.remove(ambientLight);
      scene.remove(hemisphereLight);
      scene.remove(rectLight);
      scene.remove(directionalLight);
      scene.remove(
        wallFillLight1,
        wallFillLight2,
        wallFillLight3,
        wallFillLight4
      );
      scene.remove(
        wallFillLight1_1,
        wallFillLight2_1,
        wallFillLight3_1,
        wallFillLight4_1
      );
      scene.remove(
        wallFillLight1_2,
        wallFillLight2_2,
        wallFillLight3_2,
        wallFillLight4_2
      );
      scene.remove(lightSphere);
      lightSphere.geometry.dispose();
      lightSphere.material.dispose();

      controls.dispose();
      renderer.render(scene, camera);
      try {
        if (wallDirectionalLight) {
          scene.remove(wallDirectionalLight);
          scene.remove(
            wallFillLightHelper1,
            wallFillLightHelper2,
            wallFillLightHelper3,
            wallFillLightHelper4
          );
          scene.remove(
            wallFillLightHelper1_1,
            wallFillLightHelper2_1,
            wallFillLightHelper3_1,
            wallFillLightHelper4_1
          );
          scene.remove(
            wallFillLightHelper1_2,
            wallFillLightHelper2_2,
            wallFillLightHelper3_2,
            wallFillLightHelper4_2
          );
        }
      } catch { }
      // renderer.dispose();
      // if (renderer.domElement) containerRef.current.removeChild(renderer.domElement);
    };
  }, [wallStore, gridSize, floorStore]);

  useEffect(() => {
    if (gridSenceRef && gridSenceRef.current) {
      gridSenceRef.current.updateDisplay(displayGridSence);
    }
  }, [displayGridSence]);
  useEffect(() => {
    let newWallHeight = wallHeight * 10;
    if (wallUpdate && wallUpdate.length) {
      wallUpdate.forEach((mesh) => {
        mesh.updateHeight(newWallHeight);
      });
    }
  }, [wallHeight]);
  useEffect(() => {
    if (wallUpdate && wallUpdate.length) {
      wallUpdate.forEach((mesh) => {
        mesh.updateColor(sceneWallColor);
      });
    }
  }, [sceneWallColor]);
  const handleModeChange = (newMode) => {
    modeRef.current = newMode;
    setModeUI(newMode);
  };
  const handleDeleteSelected = () => {
    const scene = sceneRef.current;
    if (!scene || !selectedObjectRef || !selectedObjectRef.current) return
    const obj = selectedObjectRef.current;
    try {
      if (obj && obj.children && obj.children.length) {
        const childrenT = [...obj.children]
        childrenT.forEach(mesh => {
          scene.remove(mesh)
        })
      }
      if (obj && obj.userData) {
        if (obj.userData.bboxMesh) {
          scene.remove(obj.userData.bboxMesh)
        }
        if (obj.userData.pivot) {
          scene.remove(obj.userData.pivot)
        }
      }
    } catch { }
    try {
      if (obj) {
        if (obj.parent) {
          obj.parent.remove(obj); // Xóa khỏi scene
        }
      }
    } catch { }
    try {
      const index = interactableMeshes.current.indexOf(obj);
      if (index !== -1) {
        interactableMeshes.current.splice(index, 1); // Xóa khỏi danh sách tương tác
      }
      selectedObjectRef.current = null;
    } catch { }
  };
  useEffect(() => { }, [selectedObjectRef]);

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
    refImportAddModel.current.click();
  };
  const handlerImportAddModel = async (event) => {
    const scene = sceneRef.current;
    if (!scene) return;
    try {
      let scaleModel = 1;
      let scaleX_Model = 1,
        scaleY_Model = 1,
        scaleZ_Model = 1;
      //  const scaleModel = 1
      const modelOrigin = await new Promise(async (resolve) => {
        const file = event.target.files[0];
        if (!file) {
          return resolve()
        };
        let fileName = file.name;
        let typeFile = fileName.split(".").pop(); // 'txt'
        if (typeFile == "glb") {
          const loader = new GLTFLoader();
          // Optional: DRACO support nếu file nén
          const dracoLoader = new DRACOLoader();
          dracoLoader.setDecoderPath("/js/libs/draco/");
          loader.setDRACOLoader(dracoLoader);
          const reader = new FileReader();
          reader.onload = function (e) {
            const arrayBuffer = e.target.result;
            loader.parse(
              arrayBuffer,
              "",
              (gltf) => {
                resolve(gltf.scene)
                return;
                resolve();
              },
              (error) => {
                resolve();
                console.error("Lỗi khi parse GLB:", error);
              }
            );
          };
          reader.readAsArrayBuffer(file);
        } else if (typeFile == "zip") {
          try {
            const zip = await JSZip.loadAsync(file);
            // Tìm file scene.gltf trong zip
            const gltfEntry = Object.values(zip.files).find((f) =>
              f.name.endsWith(".gltf")
            );
            if (!gltfEntry) {
              console.error("Không tìm thấy file .gltf trong zip");
              return;
            }

            const gltfText = await gltfEntry.async("string");

            // Tạo blob URLs cho resource phụ
            const blobUrlMap = {};
            await Promise.all(
              Object.values(zip.files).map(async (file) => {
                const name = file.name;
                if (/\.(bin|png|jpg|jpeg|gif|tga|ktx2|txt)$/i.test(name)) {
                  const blob = await file.async("blob");
                  blobUrlMap[name] = URL.createObjectURL(blob);
                }
              })
            );

            // ✅ Tạo manager và setURLModifier
            const manager = new THREE.LoadingManager();
            manager.setURLModifier((url) => {
              console.log("Đã intercept:", url);
              const clean = url.split("/").pop();
              return blobUrlMap[clean] || url;
            });

            // ✅ Truyền manager vào loader
            const loader = new GLTFLoader(manager);

            // Optional: DRACO support nếu cần
            const dracoLoader = new DRACOLoader();
            dracoLoader.setDecoderPath("/js/libs/draco/");
            loader.setDRACOLoader(dracoLoader);

            // Load từ gltfText
            const gltf = await loader.parseAsync(gltfText, ""); // path rỗng vì bạn dùng blob
            resolve(gltf.scene)
            return
          } catch { }
          resolve();
        }
      });
      if (modelOrigin) {
        try {
          const model = modelOrigin.clone()
          const box = new THREE.Box3().setFromObject(model);
          const size = new THREE.Vector3();
          let sizeX = 1,
            sizeY = 1,
            sizeZ = 1;
          const sizeBox = box.getSize(size); // size sẽ chứa width, height, depth
          if (sizeBox && sizeBox.x && sizeBox.y && sizeBox.z) {
            sizeX = sizeBox.x;
            sizeY = sizeBox.y;
            sizeZ = sizeBox.z;
            scaleX_Model = gridSize[0] / sizeX;
            scaleZ_Model = gridSize[1] / sizeZ;
            try {
              scaleModel = Math.min(scaleX_Model, scaleZ_Model);
            } catch { }
          }
          const useGroup = useGroupRef.current
          const meshSet = new Set();
          model.traverse((child) => {
            if (child.isMesh) {
              // child.castShadow = true;
              // child.material.side = THREE.DoubleSide;
              // child.userData.selectable = true;
              // child.userData.SelectionBox = true;
              // child.isSelectionBox = true;
            }
            if (!useGroup) {
              interactableMeshes.current.push(child);
            }
            if (!meshSet.has(child)) {
              meshSet.add(child);
            }
          });
          const childArr = Array.from(meshSet);

          // model.scale.set(0.001 * scaleModel, 0.001 * scaleModel, 0.001 * scaleModel);
          // model.scale.set(1 * scaleModel, 1 * scaleModel, 1 * scaleModel);
          model.scale.set(scaleModel, scaleModel, scaleModel);
          //  model.scale.set(sizeX, sizeX, sizeX);
          model.position.set(0, 0, 0);
          // scene.add(model);
          // modelRef.current = model;
          model.updateMatrix(); // <- update local matrix
          model.updateMatrixWorld(true); // <- đệ quy cập nhật toàn bộ
          if (useGroup) {
            const pivot1 = model.userData?.pivot;
            if (pivot1) {
              scene.add(pivot1);
            } else {
              model.updateMatrix(); // <- update local matrix
              model.updateMatrixWorld(true); // <- đệ quy cập nhật toàn bộ
              model.disabledSplit = true
              model.filterBbox = true;
              const box2 = new THREE.Box3().setFromObject(model);
              const size2 = new THREE.Vector3();
              box2.getSize(size2);
              const center = new THREE.Vector3();
              box2.getCenter(center);
              const geo = new THREE.BoxGeometry(size2.x, size2.y, size2.z);
              const mat = new THREE.MeshBasicMaterial({
                color: "blue",
                wireframe: true,
                // color: "blue",
                // wireframe: false, // TẮT wireframe
                // transparent: true,
                // opacity: 0.1, // Trong suốt nhẹ
                // depthWrite: false, // Để không ảnh hưởng đến chiều sâu cảnh
              });
              const bboxMesh = new THREE.Mesh(geo, mat);
              bboxMesh.userData.isBBox = true;
              bboxMesh.userData.selectable = true;
              bboxMesh.userData.SelectionBox = true;
              bboxMesh.userData.targetGroup = model;
              bboxMesh.userData.uuidTargetGroup = model.uuid;
              bboxMesh.userData.meshBoudingBoxOfGroup = model.uuid;
              arrUuidBoxMeshGroup.current.push(bboxMesh.uuid)
              model.userData.bboxMesh = bboxMesh;
              // scene.add(bboxMesh);
              simulatedMesh.current = model;

              // --- THÊM ĐOẠN NÀY: TẠO PIVOT ---
              const pivot = new THREE.Object3D();
              pivot.position.copy(center); // tâm group
              scene.add(pivot);
              pivot.add(model);
              pivot.add(bboxMesh)
              model.position.sub(center);      // ✅ đúng: giữ vị trí cũ sau khi vào pivot
              bboxMesh.position.copy(center);  // đặt về world
              bboxMesh.position.sub(pivot.position); // ✅ chuyển về local trong pivot

              // Gán pivot vào userData
              model.userData.pivot = pivot;
              bboxMesh.userData.pivot = pivot; // để bắt sau này
              selectedObjectRef.current = model
            }
          } else {
            try {
              if (childArr && childArr.length) {
                childArr.forEach(objTT => {
                  if (objTT.isMesh) {
                    objTT.castShadow = true;
                    objTT.material.side = THREE.DoubleSide;
                    objTT.userData.selectable = true;
                    objTT.userData.SelectionBox = true;
                    objTT.isSelectionBox = true;
                  }
                  scene.attach(objTT)
                })
              }
            } catch {
              // scene.add(model);
            }
          }
        } catch { }
      }
    } catch { }
    // try {
    //   const camera = cameraRef.current;
    //   const renderer = rendererRef.current;
    //   // Controls
    //   // const controls = new OrbitControls(camera, renderer.domElement);
    //   // controls.enableDamping = true;
    //   const controls = controlsRef.current;

    //   // Interaction variables
    //   let isInteracting = false;
    //   const offset = new THREE.Vector3();
    //   const startMouse = new THREE.Vector2();
    //   const startRotation = new THREE.Euler();
    //   const startScale = new THREE.Vector3();
    //   const plane = new THREE.Plane();
    //   const raycaster = new THREE.Raycaster();
    //   const mouse = new THREE.Vector2();
    //   function onMouseDown(event) {
    //     const rect = renderer.domElement.getBoundingClientRect();
    //     mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    //     mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    //     raycaster.setFromCamera(mouse, camera);

    //     const intersects = raycaster.intersectObjects(
    //       interactableMeshes.current,
    //       true
    //     );

    //     if (intersects.length > 0) {
    //       const pickedMesh = intersects[0].object;
    //       selectedObjectRef.current = pickedMesh;
    //       isInteracting = true;
    //       controls.enabled = false;

    //       if (modeRef.current === "drag") {
    //         const worldPoint = new THREE.Vector3();
    //         pickedMesh.getWorldPosition(worldPoint);

    //         plane.setFromNormalAndCoplanarPoint(
    //           camera.getWorldDirection(plane.normal),
    //           worldPoint
    //         );

    //         offset.copy(intersects[0].point).sub(worldPoint);
    //       } else if (modeRef.current === "rotate") {
    //         startMouse.set(event.clientX, event.clientY);
    //         startRotation.copy(pickedMesh.rotation);
    //       } else if (modeRef.current === "scale") {
    //         startMouse.set(event.clientX, event.clientY);
    //         startScale.copy(pickedMesh.scale);
    //       }
    //     } else {
    //       selectedObjectRef.current = null;
    //     }
    //   }

    //   function onMouseMove(event) {
    //     if (!isInteracting || !selectedObjectRef.current) return;

    //     const rect = renderer.domElement.getBoundingClientRect();
    //     mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    //     mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    //     const obj = selectedObjectRef.current;

    //     if (modeRef.current === "drag") {
    //       raycaster.setFromCamera(mouse, camera);
    //       const intersection = new THREE.Vector3();
    //       if (raycaster.ray.intersectPlane(plane, intersection)) {
    //         const newWorldPos = intersection.sub(offset);
    //         if (onlyMoveOnOXZRef && onlyMoveOnOXZRef.current) {
    //           // Giữ nguyên trục Y hiện tại của object
    //           newWorldPos.y = obj.getWorldPosition(new THREE.Vector3()).y;
    //         }
    //         if (obj.parent) {
    //           obj.position.copy(obj.parent.worldToLocal(newWorldPos.clone()));
    //         } else {
    //           obj.position.copy(newWorldPos);
    //         }
    //       }
    //     } else if (modeRef.current === "rotate") {
    //       const deltaX = event.clientX - startMouse.x;
    //       const deltaY = event.clientY - startMouse.y;
    //       if (onlyMoveOnOXZRef && onlyMoveOnOXZRef.current) {
    //         obj.rotation.set(
    //           startRotation.x,
    //           startRotation.y + deltaX * 0.01,
    //           startRotation.z
    //         );
    //       } else {
    //         obj.rotation.y = startRotation.y + deltaX * 0.01;
    //         obj.rotation.x = startRotation.x + deltaY * 0.01;
    //       }
    //     } else if (modeRef.current === "scale") {
    //       const delta = event.clientY - startMouse.y;
    //       const newScale = Math.max(0.1, startScale.x + delta * 0.01);
    //       obj.scale.set(newScale, newScale, newScale);
    //     }
    //   }

    //   function onMouseUp() {
    //     if (isInteracting) {
    //       isInteracting = false;
    //       // selectedObjectRef.current = null;  // BỎ DÒNG NÀY đi
    //       controls.enabled = true;
    //     }
    //   }
    //   renderer.domElement.addEventListener("mousedown", onMouseDown);
    //   renderer.domElement.addEventListener("mousemove", onMouseMove);
    //   renderer.domElement.addEventListener("mouseup", onMouseUp);

    //   const handleResize = () => {
    //     const sceneWidth = containerRef.current.clientWidth;
    //     const sceneHeight = containerRef.current.clientHeight;
    //     camera.aspect = sceneWidth / sceneHeight;
    //     camera.updateProjectionMatrix();
    //     renderer.setSize(sceneWidth, sceneHeight);
    //   };

    //   window.addEventListener("resize", handleResize);

    //   const animate = () => {
    //     requestAnimationFrame(animate);
    //     controls.update();
    //     renderer.render(scene, camera);
    //   };
    //   animate();
    // } catch { }
    event.target.value = "";
    refImportAddModel.current.value = "";
  };
  const loadAddModel = () => {
    const scene = sceneRef.current;
    if (!scene) return;
    // Load GLB model
    const loader = new GLTFLoader();
    const scaleModel = 20;
    // loader.load(
    //   "/models/source/简约餐桌.glb",
    //   (gltf) => {
    //     const model = gltf.scene;
    //     model.traverse((child) => {
    //       if (child.isMesh) {
    //         child.castShadow = true;
    //         child.material.side = THREE.DoubleSide;
    //         interactableMeshes.current.push(child);
    //       }
    //     });

    //     model.scale.set(0.001 * scaleModel, 0.001 * scaleModel, 0.001 * scaleModel);
    //     model.position.set(0, 0, 0);
    //     scene.add(model);
    //     // modelRef.current = model;
    //   },
    //   undefined,
    //   (error) => {
    //     console.error("Lỗi khi load GLB:", error);
    //   }
    // );

    loader.load(
      // "/models/source/low_poly_furnitures_full_bundle.glb",
      "/models/source/scene.gltf",
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
    const camera = cameraRef.current;
    const renderer = rendererRef.current;
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
      }
    }

    function onMouseMove(event) {
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
          obj.rotation.set(
            startRotation.x,
            startRotation.y + deltaX * 0.01,
            startRotation.z
          );
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
  };
  async function smoothWall() {
    try {
      let dataSend = {
        size: gridSize,
        walls: wallStore,
      };
      try {
        const response = await fetch("http://127.0.0.1:8000/smooth-wall", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(dataSend),
        });

        if (!response.ok) throw new Error("Error");

        const responseJson = await response.json();
        if (responseJson && responseJson.data && responseJson.data.result) {
          setWallStore(responseJson.data.result);
        }
        if (responseJson && responseJson.data && responseJson.data.array) {
          const findRectanglesT = findRectangles(responseJson.data.array)
          setWallStoreV2(findRectanglesT);
        }
      } catch (error) {
        console.error("Lỗi upload:", error);
      }
    } catch { }
  }
  function setPositionY0() {
    const obj = selectedObjectRef.current;
    if (!obj) return;

    // Cập nhật lại world matrix để bounding box chính xác
    obj.updateMatrixWorld(true);
    // const scene = sceneRef.current
    // const boxHelper = new THREE.BoxHelper(obj, 0xff0000); // màu đỏ
    // scene.add(boxHelper);

    // Tính bounding box của object (bao gồm scale, rotation, group)
    const box = new THREE.Box3().setFromObject(obj);

    // Lấy điểm có Y thấp nhất (minY) trong world space
    const minY = box.min.y;

    // Tính offset để đáy chạm Y=0
    const offsetY = -minY;

    // Tạo vector offset trong world
    const worldOffset = new THREE.Vector3(0, offsetY, 0);

    // Chuyển offset này về local space của object.parent
    const localOffset = obj.parent
      .worldToLocal(obj.getWorldPosition(new THREE.Vector3()).add(worldOffset))
      .sub(obj.position);

    // Dời obj sao cho đáy trùng mặt phẳng OXZ
    obj.position.add(localOffset);
  }


  const [selectedRefObJSelected, setselectedRefObJSelected] = useState(null);
  const [positionSelectObjet, setpositionSelectObjet] = useState([0, 0, 0]);

  useEffect(() => {
    console.log("watchselectedRefObJSelected ", selectedRefObJSelected)
    if (selectedRefObJSelected) {
      const obj = selectedRefObJSelected.userData && selectedRefObJSelected.userData.pivot ? selectedRefObJSelected.userData.pivot : selectedRefObJSelected
      const pos = obj.position.toArray();
      setpositionSelectObjet(pos);
    }
  }, [selectedRefObJSelected])
  useEffect(() => {
    if (selectedRefObJSelected) {
      const obj = selectedRefObJSelected.userData && selectedRefObJSelected.userData.pivot ? selectedRefObJSelected.userData.pivot : selectedRefObJSelected
      obj.position.set(...positionSelectObjet)
    }
  }, [positionSelectObjet])
  const handleChangeSelectObject = (index, value) => {
    const newPos = [...positionSelectObjet];
    newPos[index] = parseFloat(value);
    setpositionSelectObjet(newPos);
  };

  // 🔧 Hàm này sẽ render 3 input nếu meshRef tồn tại
  const renderPositionInputs = () => {
    if (!selectedRefObJSelected) return;

    return (
      <div className='flex items-center'>
        {['X', 'Y', 'Z'].map((axis, i) => (
          <div key={axis}>
            <label>{axis}: </label>
            <input
              type="number"
              value={positionSelectObjet[i]}
              onChange={(e) => handleChangeSelectObject(i, e.target.value)}
              step="0.1"
            />
          </div>
        ))}
      </div>
    );
  };

  return (
    <>
      <div
        style={{
          width: "100vw",
          height: "100vh",
        }}
      >
        <div className="relative">
          <div
            style={{
              top: 10,
              left: 10,
              display: "flex",
              alignItems: "center",
              gap: "10px",
              zIndex: 10,
            }}
          >
            <input
              className="hidden"
              type="file"
              accept=".glb,.zip"
              ref={refImportAddModel}
              onChange={handlerImportAddModel}
            />
            <button
              onClick={() => ImportAddModel()}
              style={{
                padding: "8px 12px",
                border: "1px solid #ccc",
                borderRadius: "4px",
                cursor: "pointer",
              }}
            >
              + Import Model (file glb)
            </button>
            {/* <button
            onClick={() => loadAddModel()}
            style={{
              padding: "8px 12px",
              border: "1px solid #ccc",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            + Add model (file glb)
          </button> */}
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
                control={
                  <Switch
                    checked={checkMoveOXZ}
                    onChange={(e) => setCheckMoveOXZ(e.target.checked)}
                  />
                }
                label="OXZ:"
                labelPlacement="start"
              />
            </div>
            <div className="h-full h-[40px] flex items-center p-2">
              <Button
                onClick={() => setPositionY0()}
                size="small"
                variant="contained"
              >
                SET Y = 0
              </Button>
            </div>
            <div className="h-full h-[40px] flex items-center p-2">
              <FormControlLabel
                control={
                  <Switch
                    checked={useGroup}
                    onChange={(e) => setUseGroup(e.target.checked)}
                  />
                }
                label="UseGroup:"
                labelPlacement="start"
              />
            </div>
          </div>
          <div className=" top-[60px] left-[15px]">
            <div className="flex items-center">
              Scene Background Color:
              <input
                className="ip-scene-background"
                type="text"
                value={sceneBackground}
                onInput={(e) => setSceneBackground(e.target.value)}
                style={{ width: "80px", padding: "2px 5px" }}
              />
              <div
                onClick={handleClickOpen}
                className="border border-solid border-black-200 ml-[8px]"
                style={{
                  width: "26px",
                  height: "26px",
                  background: sceneBackground,
                }}
              ></div>
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
                <ColorPicker
                  color={sceneRefBackground}
                  onChange={setSceneRefBackground}
                />
              </DialogContent>
              <DialogActions>
                <Button onClick={handleClose}>Đóng</Button>
              </DialogActions>
            </Dialog>
          </div>

          <div className=" top-[90px] left-[15px] flex items-center">
            <div className="flex items-center">
              Wall Color:
              <input
                className="ip-scene-background"
                type="text"
                value={sceneWallColor}
                onInput={(e) => setSceneWallColor(e.target.value)}
                style={{ width: "80px", padding: "2px 5px" }}
              />
              <div
                onClick={handleClickOpenWallColor}
                className="border border-solid border-black-200 ml-[8px]"
                style={{
                  width: "26px",
                  height: "26px",
                  background: sceneWallColor,
                }}
              ></div>
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
                <ColorPicker
                  color={sceneRefWallColor}
                  onChange={setSceneRefWallColor}
                />
              </DialogContent>
              <DialogActions>
                <Button onClick={handleCloseWallColor}>Đóng</Button>
              </DialogActions>
            </Dialog>
            <div className="ml-4">
              <Button onClick={smoothWall} size="small" variant="contained">
                Smooth Wall
              </Button>
            </div>
          </div>

          <div className=" top-[120px] left-[15px]">
            <div className="flex items-center">
              Floor Color:
              <input
                className="ip-scene-background"
                type="text"
                value={sceneFloorColor}
                onInput={(e) => setSceneFloorColor(e.target.value)}
                style={{ width: "80px", padding: "2px 5px" }}
              />
              <div
                onClick={handleClickOpenFloorColor}
                className="border border-solid border-black-200 ml-[8px]"
                style={{
                  width: "26px",
                  height: "26px",
                  background: sceneFloorColor,
                }}
              ></div>
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
                <ColorPicker
                  color={sceneRefFloorColor}
                  onChange={setSceneRefFloorColor}
                />
              </DialogContent>
              <DialogActions>
                <Button onClick={handleCloseFloorColor}>Đóng</Button>
              </DialogActions>
            </Dialog>
          </div>
          <div className=" top-[150px] left-[15px] formControlLabel-display-grid">
            <FormControlLabel
              control={
                <Switch
                  checked={displayGridSence}
                  onChange={(e) => setDisplayGridSence(e.target.checked)}
                />
              }
              label="Display Grid"
              labelPlacement="start"
            />
          </div>
          <div className=" top-[180px] left-[15px] formControlLabel-display-grid flex-items-center">
            <div>Camera</div>
            <div className="flex-items-center ml-2">
              X=
              <input
                type="number"
                value={cameraPosition[0]}
                onInput={(e) =>
                  setCameraPosition([
                    Number(e.target.value),
                    cameraPosition[1],
                    cameraPosition[2],
                  ])
                }
                className="border max-w-[80px]"
              />
            </div>
            <div className="flex-items-center ml-2">
              Y=
              <input
                type="number"
                value={cameraPosition[1]}
                onInput={(e) =>
                  setCameraPosition([
                    cameraPosition[0],
                    Number(e.target.value),
                    cameraPosition[2],
                  ])
                }
                className="border max-w-[80px]"
              />
            </div>
            <div className="flex-items-center ml-2">
              Z=
              <input
                type="number"
                value={cameraPosition[2]}
                onInput={(e) =>
                  setCameraPosition([
                    cameraPosition[0],
                    cameraPosition[1],
                    Number(e.target.value),
                  ])
                }
                className="border max-w-[80px]"
              />
            </div>
          </div>
          <div className=" top-[290px] left-[15px] formControlLabel-display-grid flex-items-center">
            <div>Mouse 3D Position: {mousePos3D.x.toFixed(2)},{" "}
              {mousePos3D.y.toFixed(2)}, {mousePos3D.z.toFixed(2)}{" "}
            </div>
            <div className="flex items-center"> <FormControlLabel
              control={
                <Switch
                  checked={splitGroup}
                  onChange={(e) => setsplitGroup(e.target.checked)}
                />
              }
              label="Split Group: "
              labelPlacement="start"
            />
              <div style={{ marginLeft: '20px' }}>
                {renderPositionInputs()}
              </div>
            </div>

          </div>
        </div>
        <div ref={containerRef} style={{ width: "100%", height: "100%" }} />
      </div>
    </>
  );
});
export default initFunc;
