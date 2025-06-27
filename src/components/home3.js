// FloorplanViewer.tsx
import { useSelector, useDispatch } from "react-redux";
import { modelThreejsActions } from "../store/modelThreejs.js";
// import { setSelectedModel } from './store/modelThreejs';
import React, {
  useEffect,
  useRef,
  useState,
  forwardRef,
  useImperativeHandle,
} from "react";
import * as THREE from "three";
import _, { isBuffer } from "lodash";
import * as CANNON from "cannon-es";
import { CSG } from 'three-csg-ts';
import CannonDebugger from "cannon-es-debugger";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { ConvexGeometry } from 'three/examples/jsm/geometries/ConvexGeometry.js';

import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
// import { SelectionBox } from "three/examples/jsm/interactive/SelectionBox.js";
// import { SelectionHelper } from "three/examples/jsm/interactive/SelectionHelper.js";
import SelectionBox from "../utils/SelectionBoxExtended.js";
import SelectionHelper from "../utils/SelectionHelperOffset.js"; // SelectionHelper đã custom để nhận đúng vị trí khi có offset của window
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader"; // Nếu dùng nén
import { RectAreaLightHelper } from "three/examples/jsm/helpers/RectAreaLightHelper.js";
import CustomMesh from "../utils/CustomMesh.js"; // ✅ đúng
import CustomGroup from "../utils/CustomGroup.js"; // ✅ đúng
import {
  TextareaAutosize,
  Checkbox,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Dialog,
  Switch,
  FormControlLabel,
  Modal,
  Box,
  Button,
  Slider,
  Typography,
  TransitionProps,
  Slide,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  useForkRef,
  patch,
} from "@mui/material";
import "../styles/floorplanViewer.css";
import { ColorPicker, useColor } from "react-color-palette";
import { GUI } from "three/examples/jsm/libs/lil-gui.module.min.js";
import "react-color-palette/css";
import JSZip from "jszip";
import { MeshMatcapMaterial, ModelNode } from "three/webgpu";
import { gapSize } from "three/tsl";



const modelNameYolo = ['wall-detection-xi9ox', 'wall-window-door-detection-zltye', 'walldetector2', 'wall-window-door-detection', 'test-nsycv', 'segmentation-wall-door-window-yeaua']

const Transition = React.forwardRef(function Transition(
  props: TransitionProps & {
    children: React.ReactElement<any, any>,
  },
  ref: React.Ref<unknown>
) {
  return <Slide direction="down" ref={ref} {...props} />;
});

function mergeMeshesToSingleGeometry(groups) {
  if (!groups) return;
  const meshSet = new Set();
  groups.traverse((child) => {
    if (child.isMesh && !meshSet.has(child)) {
      meshSet.add(child);
    }
  });
  const meshes = Array.from(meshSet);
  let geometries = [];
  meshes.map((mesh) => {
    if (mesh.isMesh && mesh.geometry && mesh.geometry.attributes.position) {
      const geom = mesh.geometry.clone();
      geom.applyMatrix4(mesh.matrixWorld); // đảm bảo vị trí đúng trong world
      geometries.push(geom);
    }
  });
  if (geometries.length === 0) {
    console.error("No valid geometries found.");
    return null;
  }
  const mergedGeometry = mergeGeometries(geometries, true);
  return mergedGeometry;
}
// Hàm chuyển BufferGeometry sang ConvexPolyhedron
function geometryToConvexPolyhedron(bufferGeometry) {
  const posAttr = bufferGeometry.attributes.position;
  const vertices = [];
  const faces = [];

  const count = posAttr.count; // = array.length / 3

  for (let i = 0; i < count; i += 3) {
    // Gộp luôn 3 đỉnh cho mỗi mặt tam giác
    const i0 = vertices.length;
    const v0 = new CANNON.Vec3(
      posAttr.getX(i),
      posAttr.getY(i),
      posAttr.getZ(i)
    );
    const v1 = new CANNON.Vec3(
      posAttr.getX(i + 1),
      posAttr.getY(i + 1),
      posAttr.getZ(i + 1)
    );
    const v2 = new CANNON.Vec3(
      posAttr.getX(i + 2),
      posAttr.getY(i + 2),
      posAttr.getZ(i + 2)
    );

    vertices.push(v0, v1, v2);

    // Tính normal
    const cb = new CANNON.Vec3().copy(v2).vsub(v1);
    const ab = new CANNON.Vec3().copy(v0).vsub(v1);
    const normal = cb.cross(ab);

    if (normal.dot(v0) < 0) {
      faces.push([i0, i0 + 2, i0 + 1]); // đảo lại
    } else {
      faces.push([i0, i0 + 1, i0 + 2]);
    }
  }

  return new CANNON.ConvexPolyhedron({ vertices, faces });
}

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

function findRectangles(matrix, labelAs = 1) {
  const rows = matrix.length;
  const cols = matrix[0].length;
  const visited = Array.from({ length: rows }, () => Array(cols).fill(false));
  const rectangles = [];

  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      if (matrix[i][j] === labelAs && !visited[i][j]) {
        // Tìm giới hạn phải (cột)
        let maxCol = j;
        while (
          maxCol + 1 < cols &&
          matrix[i][maxCol + 1] === labelAs &&
          !visited[i][maxCol + 1]
        ) {
          maxCol++;
        }

        // Tìm giới hạn dưới (dòng)
        let rowEnd = i;
        let canExpandDown = true;
        while (canExpandDown && rowEnd + 1 < rows) {
          for (let k = j; k <= maxCol; k++) {
            if (matrix[rowEnd + 1][k] !== labelAs || visited[rowEnd + 1][k]) {
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

function createLabeledArray(size, indices, label = 1) {
  const m = size[1];
  const n = size[0];

  // Khởi tạo mảng 2 chiều toàn , m cot n hang
  const array = Array.from({ length: m }, () => Array(n).fill(0));

  // Gán giá trị 1 cho các chỉ số có trong mảng indices
  for (const [i, j] of indices) {
    if (j >= 0 && j <= m && i >= 0 && i <= n) {
      array[j][i] = label;
    }
  }

  return array;
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
    // wireframe: true,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;

  // Đặt tâm khối box vào giữa vùng phủ của tường (bao gồm cả dày)
  mesh.position.set(x + xWidth / 2, height / 2, z + zWidth / 2);

  // Cập nhật chiều cao
  mesh.updateHeight = (newHeight) => {
    const oldHeight = mesh.geometry.parameters.height;
    const newGeometry = new THREE.BoxGeometry(
      actualWidth,
      newHeight,
      actualDepth
    );
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
function createGeometryFromTrimesh(trimesh) {
  const geometry = new THREE.BufferGeometry();

  // Set vị trí
  geometry.setAttribute(
    "position",
    new THREE.BufferAttribute(new Float32Array(trimesh.vertices), 3)
  );

  // Set chỉ số mặt tam giác (index)
  const indexArray = new (
    trimesh.indices.length > 65535 ? Uint32Array : Uint16Array
  )(trimesh.indices);
  geometry.setIndex(new THREE.BufferAttribute(indexArray, 1));

  geometry.computeVertexNormals();

  return geometry;
}

function centerGeometryKeepY(geometry) {
  geometry.computeBoundingBox();
  const box = geometry.boundingBox;
  const center = new THREE.Vector3();
  box.getCenter(center);

  // Chỉ dịch X,Z về 0, giữ nguyên Y = 0
  geometry.translate(-center.x, 0, -center.z);

  // Trả về offset mà helper cần cộng, Y giữ 0
  return new THREE.Vector3(center.x, 0, center.z);
}


// export default function FloorplanViewer({ dataDeepFloorplan, wallHeight }) {
// CẦN CÓ 1 QUY ƯỚC VỀ ĐƠN VỊ
// ĐƠN VỊ TRONG THREEJS HAY 3D NÊN ĐƯỢC LẤY 1 ĐƠN VỊ = 1MM (THỰC TẾ)
// VÀ TỪ TỈ LỆ BẢN ĐỒ  HOẶC ĐỌC ĐƯỜNG VD 10 PIXEL=2M => 1 PIXEL =2/10=0.2M=20MM=20 Ô ĐƠN VỊ THREE,
const initFunc = forwardRef((props, ref) => {
  const [unitThreeToMM, setunitThreeToMM] = useState(1)  // tức là 1 đơn vị three = 1mm
  // 200pixel tương ứng với 5m=5000mm => 1pixel=25mm
  const [unitPixelToMM, setunitPixelToMM] = useState(1)
  const [unitPixelToThree, setunitPixelToThree] = useState(unitThreeToMM * unitPixelToMM)
  const [showFormDetect, setshowFormDetect] = useState(true)
  const [showImgDetect, setshowImgDetect] = useState(true)
  const refselectImgDetect = useRef()
  const canvasbase64ImgDetect = useRef()
  const [detectedRes, setdetectedRes] = useState()
  const [modeShowCanvasDetect, setmodeShowCanvasDetect] = useState('Draw Confidence')
  const [confidenceThreshold, setconfidenceThreshold] = useState(30);
  const [overlapThreshold, setoverlapThreshold] = useState(50);
  const [base64ImgDetect, setbase64ImgDetect] = useState({});
  const [modelSelected, setmodelSelected] = useState('wall-window-door-detection');
  let sortingManager = null;
  const dispatch = useDispatch();
  const dovatdichuyen = useRef([]);
  const dovatsapxep = useRef({});
  const startRandomBoxMovementIntervalCheck = useRef(false);
  const startRandomBoxMovementIntervalRef = useRef();
  const arrBox3HelperAutoUpdate = useRef([]);
  const modelThreeCommon = useSelector((state) => state.modelThreejs.models);
  const modelThreeCommonRef = useRef({});
  useEffect(() => { }, [modelThreeCommon]);
  const arrHelperUpdate = useRef([]);
  const clockCannonRef = useRef();
  const worldCannonRef = useRef();
  const { dataDeepFloorplan, wallHeight, modelName, mergeWallsT } = props;
  const [splitGroup, setsplitGroup] = useState(false);
  const containerRef = useRef(null);
  const containerViewRef = useRef(null);
  const miniViewRef = useRef(null);
  const [mousePos3D, setMousePos3D] = useState(new THREE.Vector3());
  const [gridSize, setGridSize] = useState([400, 400]);
  const [useGroup, setUseGroup] = useState(true);
  const useGroupRef = useRef(useGroup);
  const arrUuidBoxMeshGroup = useRef([]);
  // cameraPosition: lúc đầu hiểu là như thê nhưng k đúng, hiểu đúng nó chỉ là tâm của trục xoay tại vị trí này thôi
  const [cameraPosition, setCameraPosition] = useState([
    gridSize[0],
    gridSize[0],
    gridSize[1],
  ]);
  const [checkMoveOXZ, setCheckMoveOXZ] = useState(true);
  const onlyMoveOnOXZRef = useRef(checkMoveOXZ);
  const [wallStoreV2, setWallStoreV2] = useState([]);
  const [doorStoreV2, setdoorStoreV2] = useState([]);
  const [wallStore, setWallStore] = useState([
    // { start: [0, 90], end: [0, 100] },
    // { start: [0, 200], end: [200, 0] },
    { start: [0, 0], end: [0, 400] },
    //
    { start: [0, 400], end: [400, 400] },
    { start: [400, 400], end: [400, 0] },
    { start: [400, 0], end: [0, 0] },
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
  const rendererViewRef = useRef();
  const rendererMiniViewRef = useRef();
  const floorRef = useRef();
  const gridSenceRef = useRef();
  const cameraSphereRef = useRef();
  const mountRef = useRef(null);
  // const modeRef = useRef("drag");
  // const [modeUI, setModeUI] = useState("drag");
  const modeRef = useRef();
  const [modeUI, setModeUI] = useState();
  const modelRef = useRef(null);
  const interactableMeshes = useRef([]);
  const refImportAddModel = useRef();
  const selectionRectRef = useRef();
  const selectionHelperRef = useRef();
  const [arrayObjectSelected, setArrayObjectSelected] = useState([]);
  const arrayObjectSelectedRef = useRef([]);
  const [positionDoorWindow, setpositionDoorWindow] = useState([]);

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
  const useTransformFromHand = useRef(false);

  // phần ui
  const [open, setOpen] = React.useState(false);
  const splitGroupRef = useRef(false);
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
  function resetSence() {
    const scene = sceneRef.current;
    if (!scene) return
    try {
      if (
        objects_RoiTuDo_Ref.current &&
        Object.keys(objects_RoiTuDo_Ref.current).length
      ) {
        for (let key in objects_RoiTuDo_Ref.current) {
          try {
            if (worldCannonRef.current) {
              worldCannonRef.current.removeBody(
                objects_RoiTuDo_Ref.current[key].body
              );
            }
          } catch { }
        }
      }
      objects_RoiTuDo_Ref.current = {}
      if (
        objects_2_RoiTuDo_Auto_Ref.current &&
        Object.keys(objects_2_RoiTuDo_Auto_Ref.current).length
      ) {
        for (let key in objects_2_RoiTuDo_Auto_Ref.current) {
          try {
            if (worldCannonRef.current) {
              worldCannonRef.current.removeBody(
                objects_2_RoiTuDo_Auto_Ref.current[key].body
              );
            }
          } catch { }
        }
      }
      objects_2_RoiTuDo_Auto_Ref.current = {}
      if (
        objects_TuTacDong_Ref.current &&
        Object.keys(objects_TuTacDong_Ref.current).length
      ) {
        for (let key in objects_TuTacDong_Ref.current) {
          try {
            if (worldCannonRef.current) {
              worldCannonRef.current.removeBody(
                objects_TuTacDong_Ref.current[key].body
              );
            }
          } catch { }
        }
      }
    } catch { }
    objects_TuTacDong_Ref.current = {}


    // Xóa toàn bộ object trong scene
    while (scene.children.length > 0) {
      const child = scene.children[0];

      // Nếu là mesh, dispose geometry & material
      if (child.isMesh) {
        child.geometry.dispose();
        if (Array.isArray(child.material)) {
          child.material.forEach(mat => mat.dispose());
        } else {
          child.material.dispose();
        }
      }
      scene.remove(child);
    }

    // Optional: clear render target and reset background
  }
  function startRandomBoxMovement(boxes, gridSize, step = 1) {
    startRandomBoxMovementIntervalRef.current = setInterval(() => {
      boxes.forEach((box) => {
        const axis = Math.random() > 0.5 ? "x" : "z";
        const sign = Math.random() > 0.5 ? 1 : -1;

        const currentPos = box.position.clone();
        let newValue = currentPos[axis] + step * sign;

        if (newValue < 0 || newValue > gridSize) {
          // Nếu vượt biên thì quay đầu lại
          newValue = THREE.MathUtils.clamp(
            currentPos[axis] - step * sign,
            0,
            gridSize
          );
        }

        // Set lại bằng .set để đảm bảo trigger các transform watcher
        if (axis === "x") {
          box.position.set(newValue, currentPos.y, currentPos.z);
        } else {
          box.position.set(currentPos.x, currentPos.y, newValue);
        }
      });
    }, 500);
  }
  function Wall3({
    x,
    z,
    xWidth,
    zWidth,
    thickness = 0.2,
    height = 2.8,
    scene,
    color = "#dbe5e6",
    word = null,
    doors = {}
  }) {
    // Tính kích thước thật khi vẽ Box
    // const actualWidth = xWidth + thickness * 2;
    // const actualDepth = zWidth + thickness * 2;
    const actualWidth = xWidth;
    const actualDepth = zWidth;
    let physicsWorld = word;
    if (!physicsWorld && worldCannonRef && worldCannonRef.current) {
      physicsWorld = worldCannonRef.current;
    }

    // Không render nếu kích thước quá nhỏ
    if (actualWidth <= 0 || actualDepth <= 0) return null;

    // Chú ý: chiều dài = actualWidth, chiều rộng = actualDepth
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.lineTo(0, actualDepth);
    shape.lineTo(actualWidth, actualDepth);
    shape.lineTo(actualWidth, 0);
    shape.lineTo(0, 0);

    const extrudeSettings = {
      steps: 1,
      depth: height, // chiều cao thực tế
      bevelEnabled: false,
    };

    const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    // Dịch geometry để tâm nằm ở giữa mặt đáy
    geometry.translate(-actualWidth / 2, -actualDepth / 2, -height / 2);

    // Quay geometry -90 độ quanh X để chiều depth (Z) thành chiều cao (Y)
    geometry.rotateX(-Math.PI / 2);
    const material = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.8,
      metalness: 0.2,
      emissive: 0x111111,
      transparent: true,
      emissiveIntensity: 0.2,
      wireframe: false,
    });

    let mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;


    // Tạo wireframe geometry và line segments
    const wireframeGeometry = new THREE.WireframeGeometry(geometry);
    const wireframeMaterial = new THREE.LineBasicMaterial({ color: "#ffffff" });
    const wireframe = new THREE.LineSegments(
      wireframeGeometry,
      wireframeMaterial
    );

    // Đồng bộ vị trí, xoay, scale wireframe với mesh
    wireframe.position.copy(mesh.position);
    wireframe.rotation.copy(mesh.rotation);
    wireframe.scale.copy(mesh.scale);
    // mesh.userData.wireframe = wireframe;
    // mesh.add(wireframe);

    // Đặt tâm khối box vào giữa vùng phủ của tường (bao gồm cả dày)
    mesh.position.set(x + xWidth / 2, height / 2, z + zWidth / 2);

    // if (boxDoor) {
    //   boxDoor.updateMatrix();
    //   mesh.updateMatrix();
    //   mesh = CSG.subtract(mesh, boxDoor);
    // }

    try {
      for (let kd in doors) {
        doors[kd].updateMatrix();
        mesh.updateMatrix();
        mesh = CSG.subtract(mesh, doors[kd]);
      }
    } catch { }

    if (physicsWorld) {
      const halfExtents = new CANNON.Vec3(
        actualWidth / 2,
        height / 2,
        actualDepth / 2
      );
      const shape = new CANNON.Box(halfExtents);

      const floorMaterial = new CANNON.Material("floorMaterial");
      const boxMaterial = new CANNON.Material("boxMaterial");
      const contactMaterial = new CANNON.ContactMaterial(
        floorMaterial,
        boxMaterial,
        {
          friction: 1, // ma sát: 0 (trơn) → 1 (rất nhám)
          restitution: 0.0, // độ nảy: 0 (không nảy), 1 (nảy hết lực)
        }
      );
      // Nhóm collision
      const GROUP_TERRAIN = 1;
      const GROUP_DYNAMIC = 2;

      const body = new CANNON.Body({
        mass: 0, // static:0, và có va chạm là 1  => vẫn là vật cứng cản được
        position: new CANNON.Vec3(
          mesh.position.x,
          mesh.position.y,
          mesh.position.z
        ),
        shape,
        material: contactMaterial,
        linearDamping: 0.99, // Giảm trôi
        angularDamping: 1, // Giảm lắc khi va chạm
        // collisionFilterGroup: GROUP_TERRAIN,
        // collisionFilterMask: GROUP_DYNAMIC, // chỉ va chạm với vật động
      });

      physicsWorld.addBody(body);
      mesh.userData.physicsBody = body; // nếu cần cập nhật/sync sau
    }



    // Cập nhật chiều cao
    mesh.updateHeight = (newHeight) => {
      const oldHeight = height;
      height = newHeight;

      const newExtrudeSettings = {
        steps: 1,
        depth: newHeight,
        bevelEnabled: false,
      };

      const newGeometry = new THREE.ExtrudeGeometry(shape, newExtrudeSettings);
      newGeometry.translate(-actualWidth / 2, -actualDepth / 2, -newHeight / 2);
      newGeometry.rotateX(-Math.PI / 2);

      // mesh.geometry.dispose();
      mesh.geometry = newGeometry;

      // Cập nhật lại vị trí y để đáy wall vẫn ở y=0
      mesh.position.y = newHeight / 2;

      // if (boxDoor) {
      //   const tempMesh = new THREE.Mesh(newGeometry, mesh.material.clone());
      //   tempMesh.position.copy(mesh.position);
      //   tempMesh.rotation.copy(mesh.rotation);
      //   tempMesh.scale.copy(mesh.scale);
      //   tempMesh.updateMatrix();
      //   boxDoor.updateMatrix();
      //   // 3. Dùng CSG để cắt
      //   const resultMeshMask = CSG.subtract(tempMesh, boxDoor);
      //   mesh.geometry = resultMeshMask.geometry;
      // }

      try {
        const tempMesh = new THREE.Mesh(newGeometry, mesh.material.clone());
        tempMesh.position.copy(mesh.position);
        tempMesh.rotation.copy(mesh.rotation);
        tempMesh.scale.copy(mesh.scale);
        tempMesh.updateMatrix();

        for (let kd in doors) {
          doors[kd].updateMatrix();
          tempMesh.updateMatrix(); // cập nhật lại nếu cần
          const result = CSG.subtract(tempMesh, doors[kd]);
          tempMesh.geometry.dispose(); // tránh leak
          tempMesh.geometry = result.geometry;
        }
        mesh.geometry = tempMesh.geometry;
      } catch { }

      // Cập nhật wireframe
      if (mesh.userData.wireframe) {
        const wf = mesh.userData.wireframe;
        wf.geometry.dispose(); // 💥 rất quan trọng để tránh memory leak
        wf.geometry = new THREE.WireframeGeometry(newGeometry);
      }
      const body = mesh.userData.physicsBody;
      if (body) {
        // Xóa shape cũ
        while (body.shapes.length) {
          body.removeShape(body.shapes[0]);
        }

        const newHalfExtents = new CANNON.Vec3(
          actualWidth / 2,
          newHeight / 2,
          actualDepth / 2
        );
        const newShape = new CANNON.Box(newHalfExtents);
        body.addShape(newShape);
        body.position.y = newHeight / 2; // đảm bảo vẫn đặt đáy ở y=0
      }
    };

    mesh.updateColor = (newColor) => {
      if (mesh.material) {
        mesh.material.color.set(newColor);
        mesh.material.needsUpdate = true;
      }
    };

    // scene.add(meshClone);
    scene.add(mesh);
    return mesh;
    // return meshClone;
  }
  useEffect(() => {
    useGroupRef.current = useGroup;
  }, [useGroup]);
  // useEffect(() => {
  //   console.log("splitGroupsplitGroup")
  //   if (!splitGroup || useGroupRef.current) return;
  //   splitGroupRef.current = splitGroup;
  //   console.log("splitGroupRef", splitGroupRef)
  //   let groups = selectedObjectRef.current;
  //   let scene = sceneRef.current;
  //   // let children = getAllUniqueMeshes(groups);
  //   const meshSet = new Set();
  //   groups.traverse((child) => {
  //     if (!meshSet.has(child)) {
  //       meshSet.add(child);
  //     }
  //   });
  //   const childArr = Array.from(meshSet);
  //   if (
  //     groups &&
  //     groups.type == "Group" &&
  //     childArr &&
  //     childArr.length &&
  //     scene
  //   ) {
  //     childArr.forEach((objTT) => {
  //       try {
  //         objTT.castShadow = true;
  //         objTT.material.side = THREE.DoubleSide;
  //         objTT.isSelectionBox = true;
  //         objTT.userData.selectable = true;
  //         objTT.userData.SelectionBox = true;
  //         objTT.userData.isChildGroup = null;
  //         objTT.userData.uuidTargetGroup = null;
  //         objTT.userData.targetGroup = null;
  //       } catch { }
  //       scene.attach(objTT);
  //     });
  //     if (groups.userData && groups.userData.bboxMesh) {
  //       scene.remove(groups.userData.bboxMesh);
  //     }
  //     if (groups.userData && groups.userData.pivot) {
  //       scene.remove(groups.userData.pivot);
  //     }
  //   }
  // }, [splitGroup]);
  // useEffect(() => {
  //   if (!splitGroup || useGroupRef.current) return;
  //   splitGroupRef.current = splitGroup;

  //   const groups = selectedObjectRef.current;
  //   const scene = sceneRef.current;

  //   const meshSet = new Set();
  //   groups?.traverse((child) => {
  //     if (child.isMesh) {
  //       meshSet.add(child);
  //     }
  //   });

  //   const childArr = Array.from(meshSet);

  //   if (
  //     groups &&
  //     groups.type === "Group" &&
  //     childArr.length &&
  //     scene
  //   ) {
  //     childArr.forEach((objTT) => {
  //       // 1. Lưu transform thế giới
  //       objTT.updateMatrixWorld();
  //       const worldPos = new THREE.Vector3();
  //       const worldQuat = new THREE.Quaternion();
  //       const worldScale = new THREE.Vector3();
  //       objTT.matrixWorld.decompose(worldPos, worldQuat, worldScale);

  //       // 2. Apply các thuộc tính tùy chỉnh
  //       try {
  //         objTT.castShadow = true;
  //         objTT.material.side = THREE.DoubleSide;
  //         objTT.isSelectionBox = true;
  //         objTT.userData.selectable = true;
  //         objTT.userData.SelectionBox = true;
  //         objTT.userData.isChildGroup = null;
  //         objTT.userData.uuidTargetGroup = null;
  //         objTT.userData.targetGroup = null;
  //       } catch (err) {
  //         console.warn("Error applying mesh properties:", err);
  //       }

  //       // 3. Detach khỏi group → đưa ra scene
  //       scene.attach(objTT);

  //       // 4. Gán lại transform world cho mesh
  //       objTT.position.copy(worldPos);
  //       objTT.quaternion.copy(worldQuat);
  //       objTT.scale.copy(worldScale);

  //       // 5. Đồng bộ lại body tương ứng trong objects_2_RoiTuDo_Auto_Ref
  //       const item = objects_2_RoiTuDo_Auto_Ref.current.find(
  //         (entry) => entry.mesh.uuid === objTT.uuid
  //       );
  //       if (item && item.body) {
  //         item.body.position.copy(worldPos);
  //         item.body.quaternion.copy(worldQuat);
  //         item.body.aabbNeedsUpdate = true;
  //       } else {
  //         console.warn("⚠️ Không tìm thấy body tương ứng với mesh khi split:", objTT.name || objTT.uuid);
  //       }
  //     });

  //     // 6. Xóa bbox/pivot nếu có
  //     if (groups.userData?.bboxMesh) {
  //       scene.remove(groups.userData.bboxMesh);
  //     }
  //     if (groups.userData?.pivot) {
  //       scene.remove(groups.userData.pivot);
  //     }
  //   }
  // }, [splitGroup]);
  function worldCannonRemoveObj(obj) {
    try {
      if (
        objects_2_RoiTuDo_Auto_Ref.current &&
        objects_2_RoiTuDo_Auto_Ref.current[obj.uuid]
      ) {
        try {
          if (worldCannonRef.current) {
            worldCannonRef.current.removeBody(
              objects_2_RoiTuDo_Auto_Ref.current[obj.uuid].body
            );
          }
        } catch { }
        delete objects_2_RoiTuDo_Auto_Ref.current[obj.uuid];
      }
      if (
        objects_TuTacDong_Ref.current &&
        objects_TuTacDong_Ref.current[obj.uuid]
      ) {
        try {
          if (worldCannonRef.current) {
            worldCannonRef.current.removeBody(
              objects_TuTacDong_Ref.current[obj.uuid].body
            );
          }
        } catch { }
        delete objects_TuTacDong_Ref.current[obj.uuid];
      }
    } catch { }
  }
  useEffect(() => {
    if (!splitGroup || useGroupRef.current) return;
    splitGroupRef.current = splitGroup;

    const groups = selectedObjectRef.current;
    const scene = sceneRef.current;
    const meshSet = new Set();

    groups?.traverse((child) => {
      if (child.isMesh && child.userData && child.userData.isChildGroup) {
        meshSet.add(child);
      }
    });

    const childArr = Array.from(meshSet);

    if (groups && groups.type === "Group" && childArr.length && scene) {
      childArr.forEach((objTT) => {
        // 1. Lấy transform thế giới
        objTT.updateMatrixWorld(true);
        const worldPos = new THREE.Vector3();
        const worldQuat = new THREE.Quaternion();
        const worldScale = new THREE.Vector3();
        objTT.matrixWorld.decompose(worldPos, worldQuat, worldScale);

        // 2. Detach khỏi group
        scene.attach(objTT);

        // 3. Gán lại transform world cho mesh
        objTT.position.copy(worldPos);
        objTT.quaternion.copy(worldQuat);
        objTT.scale.copy(worldScale);

        // 4. Cập nhật lại Cannon body
        // const bodyEntry = objects_2_RoiTuDo_Auto_Ref.current[objTT.uuid];

        // if (bodyEntry?.body instanceof CANNON.Body) {
        //   const body = bodyEntry.body;
        //   body.position.set(worldPos.x, worldPos.y, worldPos.z);
        //   body.quaternion.set(
        //     worldQuat.x,
        //     worldQuat.y,
        //     worldQuat.z,
        //     worldQuat.w
        //   );
        //   body.velocity.set(0, 0, 0);
        //   body.angularVelocity.set(0, 0, 0);
        //   body.aabbNeedsUpdate = true;
        // }

        // 5. Gán flag nếu cần (ví dụ để skip animate)
        objTT.userData.justDetached = true;

        // 6. Một số flag khác
        objTT.castShadow = true;
        objTT.material.side = THREE.DoubleSide;
        objTT.userData.selectable = true;
        objTT.userData.SelectionBox = true;
        objTT.userData.isChildGroup = null;
        objTT.userData.uuidTargetGroup = null;
        objTT.userData.targetGroup = null;
        try {
          const newBody = createColliderFromMesh(objTT);
          if (worldCannonRef && worldCannonRef.current) {
            worldCannonRef.current.addBody(newBody);
            objects_2_RoiTuDo_Auto_Ref.current[objTT.uuid] = {
              mesh: objTT,
              body: newBody,
            };
            objects_TuTacDong_Ref.current[objTT.uuid] = {
              mesh: objTT,
              body: newBody,
            };
          }
        } catch { }
        console.log("objTT", objTT)
      });

      // 7. Cleanup group metadata
      if (groups.userData?.bboxMesh) {
        scene.remove(groups.userData.bboxMesh);
      }
      if (groups.userData?.pivot) {
        scene.remove(groups.userData.pivot);
      }
      worldCannonRemoveObj(groups)
    }
  }, [splitGroup]);

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
    if (!modelThreeCommonRef.current || !modelThreeCommonRef.current) {
    }
    const scene = sceneRef.current;
    const modelThreeCommonRefT = modelThreeCommonRef.current;
    let modelDoor;
    try {
      modelDoor =
        modelThreeCommonRefT["door"][
        Object.keys(modelThreeCommonRefT["door"])[0]
        ];
    } catch { }
    // door-window
    if (positionDoorWindow && positionDoorWindow.length) {
      for (let i = 0; i < positionDoorWindow.length; i++) {
        // if (i != 4) continue;
        let dataDoor = positionDoorWindow[i];
        const model = modelDoor.clone();
        const doorHeight = 80;
        const { x: x, y: z, width: xWidth, height: zWidth } = dataDoor;
        let rotate;
        if (xWidth > 1.5 * zWidth) {
          rotate = Math.PI / 2;
        }
        let door = createDoorFromModel(
          model,
          { x: x, y: 0, z: z },
          { x: x + xWidth, y: 0, z: z + zWidth },
          1,
          1,
          doorHeight,
          rotate
        );
        if (door && door.model) {
          const model = door.model;
          const pivotmodel = door.pivot;
          interactableMeshes.current.push(model);
          scene.add(pivotmodel);
        }
      }
    }
  }, [positionDoorWindow]);

  useEffect(() => {
    const scene = sceneRef.current;
    // Vẽ các box
    const boxes = mergeWallsT;
    for (const box of boxes) {
      const geometry = new THREE.BoxGeometry(box.width, box.height, box.depth);
      const material = new THREE.MeshStandardMaterial({
        color: 0x8888ff,
        roughness: 0.7,
        metalness: 0.0,
      });
      const mesh = new THREE.Mesh(geometry, material);

      // Đặt vị trí: y = height/2 để tường đứng trên mặt đất
      mesh.position.set(box.x, box.height / 2, box.z);

      scene.add(mesh);
    }
  }, [mergeWallsT]);

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
    // const oldPosition = _.cloneDeep(cameraRef.current.position)
    const oldQuaternion = _.cloneDeep(cameraRef.current.quaternion)
    cameraRef.current.position.x = cameraPosition[0]
    cameraRef.current.position.y = cameraPosition[1]
    cameraRef.current.position.z = cameraPosition[2]
    cameraRef.current.quaternion.copy(oldQuaternion)
    cameraRef.current.updateMatrixWorld();
    // cameraRef.current.position.set(cameraPosition[0], 0, cameraPosition[2])
    const controls = controlsRef.current;
    controls.target.set(cameraPosition[0], 0, cameraPosition[2]); // thường là tâm lưới
    controls.update();
  }, [cameraPosition]);
  // Tạo debounce 1 lần duy nhất
  const debouncedUpdatePosition = useRef(
    _.debounce(() => {
      if (selectedObjectRef && selectedObjectRef.current) {
        const obj =
          selectedObjectRef.current.userData?.pivot ||
          selectedObjectRef.current;
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
        const obj =
          selectedObjectRef.current.userData?.pivot ||
          selectedObjectRef.current;
        if (obj) {
          const pos = obj.position.toArray();
          setpositionSelectObjet(pos);
        }
      }
    }, 200) // mỗi 100ms gọi 1 lần
  ).current;
  function createColliderFromMesh(mesh) {
    mesh.updateMatrixWorld(true);

    // Clone geometry và bake transform
    const clonedGeometry = mesh.geometry.clone();
    clonedGeometry.applyMatrix4(mesh.matrixWorld);

    // Tính bounding box và center
    clonedGeometry.computeBoundingBox();
    const bbox = clonedGeometry.boundingBox;
    const size = new THREE.Vector3();
    bbox.getSize(size);
    const center = new THREE.Vector3();
    bbox.getCenter(center);

    // Tạo shape box từ kích thước
    const halfExtents = new CANNON.Vec3(size.x / 2, size.y / 2, size.z / 2);
    const shape = new CANNON.Box(halfExtents);

    const floorMaterial = new CANNON.Material("floorMaterial");
    // Material cho vật
    const boxMaterial = new CANNON.Material("boxMaterial");
    const contactMaterial = new CANNON.ContactMaterial(
      floorMaterial,
      boxMaterial,
      {
        friction: 1, // ma sát: 0 (trơn) → 1 (rất nhám)
        restitution: 0.0, // độ nảy: 0 (không nảy), 1 (nảy hết lực)
      }
    );

    // Tạo body
    const body = new CANNON.Body({
      mass: 10000, // static body
      material: contactMaterial,
      linearDamping: 0.99, // Giảm trôi
      angularDamping: 0.99, // Giảm lắc khi va chạm
      shape: shape,
    });

    // Set vị trí và quaternion từ mesh
    body.position.set(center.x, center.y, center.z);

    const quat = new THREE.Quaternion();
    mesh.getWorldQuaternion(quat);
    body.quaternion.copy(quat);

    body.aabbNeedsUpdate = true;

    return body;
  }
  function syncCamera(main, copy) {
    copy.position.copy(main.position);         // Gán vị trí
    copy.quaternion.copy(main.quaternion);     // Gán hướng nhìn (rotation)
    copy.updateMatrixWorld();                  // Cập nhật ma trận
  }
  useEffect(() => {
    loadModelCommons();
    try {
      const renderer = rendererRef.current;
      if (renderer && renderer.domElement)
        containerRef.current.removeChild(renderer.domElement);
    } catch { }
    try {
      const rendererView = rendererViewRef.current;
      if (rendererView && rendererView.domElement)
        containerViewRef.current.removeChild(rendererView.domElement);
    } catch { }
    try {
      const rendererMiniView = rendererMiniViewRef.current;
      if (rendererMiniView && rendererMiniView.domElement)
        miniViewRef.current.removeChild(rendererMiniView.domElement);
    } catch { }
    const sceneWidth = containerRef.current.clientWidth;
    const sceneHeight = containerRef.current.clientHeight;

    // === CANNON.JS SETUP ===
    const world = new CANNON.World({
      gravity: new CANNON.Vec3(0, -9.82, 0),
    });
    worldCannonRef.current = world;

    //     // Tùy chọn solver
    // world.broadphase = new CANNON.NaiveBroadphase();
    //     world.solver.iterations = 10;

    // Floor (CANNON) test lấy sàn nhà làm vật va chạm này cái này chưa đồng độ vs sàn nhà đâu
    const floorBody = new CANNON.Body({
      mass: 0,
      shape: new CANNON.Plane(),
      position: new CANNON.Vec3(0, 0, 0), // đặt nền ở y=2
    });
    floorBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
    world.addBody(floorBody);
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
    camera.layers.enable(1);
    camera.position.set(gridSize[0], gridSize[0], gridSize[1]);
    // camera.position.set(cameraPosition)
    camera.lookAt(gridSize[0] / 2, 0, gridSize[1] / 2);
    cameraRef.current = camera;
    console.log("camera", camera)

    const cameraMini = camera.clone()
    cameraMini.near = 0.1;
    cameraMini.far = 200;
    cameraMini.fov = 30;
    cameraMini.aspect = sceneWidth / sceneHeight;
    const rendererMiniViewRefCanvas = new THREE.WebGLRenderer({
      antialias: true,
      preserveDrawingBuffer: true
    });
    rendererMiniViewRefCanvas.setSize(250, 250);
    rendererMiniViewRefCanvas.setClearColor(0x222222);
    miniViewRef.current.appendChild(rendererMiniViewRefCanvas.domElement);
    rendererMiniViewRef.current = rendererMiniViewRefCanvas;

    const cameraCanvas = camera.clone()
    cameraCanvas.near = 0.1;
    cameraCanvas.far = 100;
    cameraCanvas.fov = 30;
    cameraCanvas.aspect = sceneWidth / sceneHeight;
    // // // Bắt buộc phải gọi updateProjectionMatrix sau khi thay đổi thông số
    // // // cameraCanvas.updateProjectionMatrix();
    // const cameraCanvas = new THREE.PerspectiveCamera(
    //   30,
    //   sceneWidth / sceneHeight,
    //   0.1,
    //   100
    // );
    // cameraCanvas.position.set(gridSize[0], gridSize[0], gridSize[1]);
    // cameraCanvas.lookAt(gridSize[0] / 2, 0, gridSize[1] / 2);

    // 2. Helper hình chóp
    const helperCameraHelper = new THREE.CameraHelper(cameraCanvas);
    helperCameraHelper.traverse(obj => {
      obj.layers.set(2);
    });
    scene.add(helperCameraHelper);

    // 3. Camera phụ (nhìn từ xa nhưng nghiêng xuống)
    const cameraDebug = new THREE.OrthographicCamera(
      -500, 500, 500, -500, 0.1, 5000
    );
    cameraDebug.position.set(800, 800, 800); // Nghiêng góc nhìn để thấy hình chóp
    cameraDebug.lookAt(gridSize[0] / 2, 0, gridSize[1] / 2);
    cameraDebug.layers.enable(2);
    const debugRenderer = new THREE.WebGLRenderer({
      antialias: true,
      preserveDrawingBuffer: true
    });
    debugRenderer.setSize(250, 250);
    debugRenderer.setClearColor(0x222222);
    containerViewRef.current.appendChild(debugRenderer.domElement);
    rendererViewRef.current = debugRenderer;

    const center = new THREE.Vector3(gridSize[0] / 2, 0, gridSize[1] / 2);
    const XAxisArrowHelper = new THREE.ArrowHelper(
      new THREE.Vector3(1, 0, 0),  // Hướng X
      center.clone(),              // Gốc tại giữa lưới
      500,                         // Chiều dài
      0xff0000,                    // Màu đỏ
      100,                         // Mũi tên
      50
    )
    XAxisArrowHelper.layers.set(2)
    XAxisArrowHelper.traverse(obj => {
      obj.layers.set(2);
    });
    const YAxisArrowHelper = new THREE.ArrowHelper(
      new THREE.Vector3(0, 1, 0),  // Hướng Y
      center.clone(),
      500,
      0x00ff00,
      100,
      50
    )
    YAxisArrowHelper.layers.set(2)
    YAxisArrowHelper.traverse(obj => {
      obj.layers.set(2);
    });
    const ZAxisArrowHelper = new THREE.ArrowHelper(
      new THREE.Vector3(0, 0, 1),  // Hướng Z
      center.clone(),
      500,
      0x0000ff,
      100,
      50
    )
    ZAxisArrowHelper.layers.set(2)
    ZAxisArrowHelper.traverse(obj => {
      obj.layers.set(2);
    });
    scene.add(XAxisArrowHelper, YAxisArrowHelper, ZAxisArrowHelper);

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

    // Renderer
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      preserveDrawingBuffer: true
    });
    renderer.setSize(sceneWidth, sceneHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const cannonDebugger = CannonDebugger(scene, worldCannonRef.current, {
      color: "black", // Màu collider
    });
    // cannonDebugger.visible = false

    // controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(gridSize[0] / 2, 0, gridSize[1] / 2);
    controls.update();
    controlsRef.current = controls;

    // // Tạo mesh ví dụ
    // let createBox = [];
    // const boxGeo = new THREE.BoxGeometry(5, 5, 5);
    // for (let i = 0; i < 20; i++) {
    //   const boxMat = new THREE.MeshStandardMaterial({ color: 0x0088ff });
    //   // const mesh = new THREE.Mesh(boxGeo, boxMat)
    //   const mesh = new CustomMesh(boxGeo, boxMat);
    //   mesh.position.set(
    //     Math.random() * 200 - 25 + gridSize[0] / 2,
    //     // Math.random() * 50 + 25,
    //     0,
    //     Math.random() * 200 - 25 + gridSize[1] / 2
    //   );
    //   mesh.userData.selectable = true;
    //   mesh.userData.SelectionBox = true;
    //   mesh.isSelectionBox = true;
    //   dovatdichuyen.current.push(mesh);
    //   scene.add(mesh);
    //   createBox.push(mesh);

    //   // 2. Lấy kích thước box từ geometry (để tạo Collider)
    //   boxGeo.computeBoundingBox();
    //   const size = new THREE.Vector3();
    //   boxGeo.boundingBox.getSize(size);

    //   // 3. Tạo shape và body Cannon.js
    //   const halfExtents = new CANNON.Vec3(size.x / 2, size.y / 2, size.z / 2);
    //   const boxShape = new CANNON.Box(halfExtents);
    //   // Material cho nền
    //   const floorMaterial = new CANNON.Material("floorMaterial");
    //   // Material cho vật
    //   const boxMaterial = new CANNON.Material("boxMaterial");
    //   const contactMaterial = new CANNON.ContactMaterial(
    //     floorMaterial,
    //     boxMaterial,
    //     {
    //       friction: 1, // ma sát: 0 (trơn) → 1 (rất nhám)
    //       restitution: 0.0, // độ nảy: 0 (không nảy), 1 (nảy hết lực)
    //     }
    //   );
    //   // mass được coi như là trọng lượng của vật để chịu lực g xét từ trước
    //   const boxBody = new CANNON.Body({
    //     mass: 1000, // đổi thành 0 nếu muốn đứng yên =>0 thì ko chịu tác động của lực, 1 thì chịu tác động của lực theo cách set có dùng lực hay ko
    //     // type: CANNON.Body.KINEMATIC,
    //     // type: CANNON.Body.STATIC,
    //     shape: boxShape,
    //     // material: new CANNON.Material('noBounce'),
    //     material: contactMaterial,
    //     linearDamping: 0.99, // Giảm trôi
    //     angularDamping: 0.99, // Giảm lắc khi va chạm
    //   });

    //   // 4. Đặt vị trí vật lý giống mesh
    //   boxBody.position.set(mesh.position.x, mesh.position.y, mesh.position.z);

    //   // 5. Thêm body vào thế giới vật lý
    //   worldCannonRef.current.addBody(boxBody);
    //   objects_TuTacDong_Ref.current[mesh.uuid] = {
    //     mesh: mesh,
    //     body: boxBody,
    //   };
    //   objects_2_RoiTuDo_Auto_Ref.current[mesh.uuid] = {
    //     mesh: mesh,
    //     body: boxBody,
    //   };
    //   dovatsapxep.current[mesh.uuid] = {
    //     mesh: mesh,
    //     body: boxBody,
    //   };

    //   mesh.onTransformChange = (type, axis, newVal) => {
    //     let bodyCannonRotate;
    //     if (useTransformFromHand.current) {
    //       if (
    //         objects_TuTacDong_Ref.current &&
    //         objects_TuTacDong_Ref.current[mesh.uuid]
    //       ) {
    //         if (
    //           type == "position" ||
    //           type == "rotation" ||
    //           type == "quaternion"
    //         ) {
    //           updateTransformToFrom(
    //             mesh,
    //             objects_TuTacDong_Ref.current[mesh.uuid].body
    //           );
    //         } else if (type == "scale") {
    //           mesh.updateMatrixWorld(true);
    //           // 2. Tìm collider cũ (nếu có)
    //           // 3. Loại bỏ body cũ khỏi world
    //           worldCannonRef.current.removeBody(
    //             objects_TuTacDong_Ref.current[mesh.uuid].body
    //           );

    //           // 1. Lấy bounding box LOCAL của geometry gốc
    //           const bbox =
    //             mesh.geometry.boundingBox ||
    //             mesh.geometry.clone().computeBoundingBox();
    //           const sizeLocal = new THREE.Vector3();
    //           bbox.getSize(sizeLocal);
    //           const centerLocal = new THREE.Vector3();
    //           bbox.getCenter(centerLocal);

    //           // 2. Lấy scale của mesh trong thế giới
    //           const scaleWorld = new THREE.Vector3();
    //           mesh.getWorldScale(scaleWorld);

    //           // 3. Tính lại size collider theo scale thực
    //           const sizeWorld = sizeLocal.clone().multiply(scaleWorld);
    //           const centerWorld = centerLocal
    //             .clone()
    //             .applyMatrix4(mesh.matrixWorld);

    //           // 3. Tạo collider mới
    //           const halfExtents = new CANNON.Vec3(
    //             sizeWorld.x / 2,
    //             sizeWorld.y / 2,
    //             sizeWorld.z / 2
    //           );
    //           const shape = new CANNON.Box(halfExtents);
    //           const newBody = new CANNON.Body({
    //             mass: 1000, // đổi thành 0 nếu muốn đứng yên =>0 thì ko chịu tác động của lực, 1 thì chịu tác động của lực theo cách set có dùng lực hay ko
    //             shape: shape,
    //             material: contactMaterial,
    //             linearDamping: 0.99, // Giảm trôi
    //             angularDamping: 0.99, // Giảm lắc khi va chạm
    //           });

    //           // 4. Đặt collider đúng vị trí & xoay
    //           newBody.position.set(centerWorld.x, centerWorld.y, centerWorld.z);
    //           const quat = new THREE.Quaternion();
    //           mesh.getWorldQuaternion(quat);
    //           newBody.quaternion.set(quat.x, quat.y, quat.z, quat.w);
    //           newBody.aabbNeedsUpdate = true;

    //           // 7. Thêm vào world mới
    //           worldCannonRef.current.addBody(newBody);
    //           objects_TuTacDong_Ref.current[mesh.uuid].body = newBody;
    //           bodyCannonRotate = newBody;
    //         }
    //       }
    //       if (
    //         bodyCannonRotate &&
    //         objects_2_RoiTuDo_Auto_Ref.current &&
    //         objects_2_RoiTuDo_Auto_Ref.current[mesh.uuid]
    //       ) {
    //         objects_2_RoiTuDo_Auto_Ref.current[mesh.uuid].body =
    //           bodyCannonRotate;
    //       }
    //       if (
    //         bodyCannonRotate &&
    //         dovatsapxep.current &&
    //         dovatsapxep.current[mesh.uuid]
    //       ) {
    //         dovatsapxep.current[mesh.uuid].body = bodyCannonRotate;
    //       }
    //     }
    //   };
    //   // interactableMeshes.current.push(mest);
    // }

    // Interaction variables
    const offset = new THREE.Vector3();
    const startMouse = new THREE.Vector2();
    const startRotation = new THREE.Euler();
    const startScale = new THREE.Vector3();
    const plane = new THREE.Plane();
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

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
    helperSelectionBoxT.enabled = false;
    helperSelectionBoxT.element.style.display = "block";
    selectionHelperRef.current = helperSelectionBoxT;

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
            meshBoudingboxOfGroup = intersects[0].object;
            objFrom = "group";
          } else {
            pickedMesh = intersects[0].object;
            objFrom = "mesh";
          }
          if (pickedMesh && objFrom) {
            if (objFrom == "mesh") {
              setArrayObjectSelected((prev) => {
                const idx = prev.findIndex(
                  (obj) => obj.uuid === pickedMesh.uuid
                );
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
            } else if (objFrom == "group" && meshBoudingboxOfGroup) {
              // pickedMesh đang là group nên add vào hay xóa đi phải tìm các mesh con bên trong nhé
              setArrayObjectSelected((prev) => {
                const existing = new Map(prev.map((obj) => [obj.uuid, obj]));
                if (pickedMesh?.children?.length) {
                  pickedMesh.children.forEach((mesh) => {
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

        raycaster.setFromCamera(mouse, cameraRef.current);

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
            const pivot = findPivotFromMesh(pickedMesh) || pickedMesh;
            const worldPoint = new THREE.Vector3();
            pivot.getWorldPosition(worldPoint);

            const normal = new THREE.Vector3();
            camera.getWorldDirection(normal);
            //   plane.setFromNormalAndCoplanarPoint(
            //   cameraRef.current.getWorldDirection(plane.normal),
            //   worldPoint
            // );
            plane.setFromNormalAndCoplanarPoint(normal, worldPoint);

            const intersection = new THREE.Vector3();
            if (raycaster.ray.intersectPlane(plane, intersection)) {
              offset.copy(intersection).sub(worldPoint);
            } else {
              offset.set(0, 0, 0);
            }
          } else if (modeRef.current === "rotate") {
            startMouse.set(event.clientX, event.clientY);
            const pivot = findPivotFromMesh(pickedMesh) || pickedMesh;
            startRotation.copy(pivot.rotation);
          } else if (modeRef.current === "scale") {
            startMouse.set(event.clientX, event.clientY);
            const pivot = findPivotFromMesh(pickedMesh) || pickedMesh;
            startScale.copy(pivot.scale);
          }
        } else {
          selectedObjectRef.current = null;
          setArrayObjectSelected((prev) => []);
        }
      }
      setselectedRefObJSelected(selectedObjectRef.current);
      if (
        arrUuidBoxMeshGroup &&
        arrUuidBoxMeshGroup.current &&
        arrUuidBoxMeshGroup.current.length
      ) {
        for (let i = 0; i < arrUuidBoxMeshGroup.current.length; i++) {
          if (
            selectedObjectRef &&
            selectedObjectRef.current &&
            selectedObjectRef.current.uuid == arrUuidBoxMeshGroup.current[i]
          ) {
            selectedObjectRef.current.visible = true;
          } else if (
            selectedObjectRef &&
            selectedObjectRef.current &&
            selectedObjectRef.current.userData &&
            selectedObjectRef.current.userData.bboxMesh
          ) {
            const object = sceneRef.current.getObjectByProperty(
              "uuid",
              selectedObjectRef.current.userData.bboxMesh.uuid
            );
            if (object) {
              object.visible = true;
            }
          } else {
            // cần phải ấn hết các mesh của các box này đi
            const object = sceneRef.current.getObjectByProperty(
              "uuid",
              arrUuidBoxMeshGroup.current[i]
            );
            if (object) {
              object.visible = false;
            }
          }
        }
      }
    }

    function onMouseMove(event) {
      useTransformFromHand.current = false;
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
          useTransformFromHand.current = true;
          raycaster.setFromCamera(mouse, cameraRef.current);
          const intersection = new THREE.Vector3();
          if (raycaster.ray.intersectPlane(plane, intersection)) {
            const pivot = findPivotFromMesh(obj) || obj;
            const newPos = intersection.clone().sub(offset);
            if (onlyMoveOnOXZRef && onlyMoveOnOXZRef.current) {
              newPos.y = pivot.getWorldPosition(new THREE.Vector3()).y;
            }
            if (pivot.parent) {
              pivot.position.copy(pivot.parent.worldToLocal(newPos));
            } else {
              pivot.position.copy(newPos);
            }
          }
        } else if (modeRef.current === "rotate") {
          useTransformFromHand.current = true;
          const pivot = findPivotFromMesh(obj) || obj;
          const deltaX = event.clientX - startMouse.x;
          const deltaY = event.clientY - startMouse.y;

          const rotateSpeed = 0.005;

          if (onlyMoveOnOXZRef && onlyMoveOnOXZRef.current) {
            pivot.rotation.y = startRotation.y + deltaX * rotateSpeed;
          } else {
            // Xoay quanh trục Y khi kéo ngang
            pivot.rotation.y = startRotation.y + deltaX * rotateSpeed;

            // Xoay quanh trục X khi kéo dọc
            pivot.rotation.x = startRotation.x + deltaY * rotateSpeed;
          }
          // pivot.rotation.z = startRotation.z + deltaX * rotateSpeed;
        } else if (modeRef.current === "scale") {
          useTransformFromHand.current = true;
          const pivot = findPivotFromMesh(obj) || obj;
          const delta = event.clientY - startMouse.y;
          const scaleFactor = Math.max(0.1, startScale.x + delta * 0.01); // scale không nhỏ hơn 0.1
          pivot.scale.set(scaleFactor, scaleFactor, scaleFactor);

          // const delta = event.clientY - startMouse.y;
          // const newScale = Math.max(0.1, startScale.x + delta * 0.01);
          // obj.scale.set(newScale, newScale, newScale);
        }
      }
      // debouncedUpdatePosition()
      throttledUpdatePosition();
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
        const filterAllSelected = allSelected.filter((obj) => {
          if (obj.userData && obj.userData.SelectionBox) {
            if (!obj.userData.isChildGroup && !obj.userData.isBBox) {
              obj.userData = {
                SelectionBox: true,
                selectable: true,
              };
              filterAllSelected2.push(obj);
              worldCannonRemoveObj(obj)
              return true;
            } else if (
              obj.userData.meshBoudingBoxOfGroup &&
              obj.userData.isBBox &&
              obj.userData.targetGroup
            ) {
              if (
                obj.userData.targetGroup &&
                obj.userData.targetGroup.children &&
                obj.userData.targetGroup.children.length
              ) {
                obj.userData.targetGroup.children.forEach((objjT) => {
                  if (
                    objjT.userData &&
                    objjT.userData &&
                    !objjT.userData.meshBoudingBoxOfGroup &&
                    !objjT.userData.isBBox
                  ) {
                    objjT.userData = {
                      SelectionBox: true,
                      selectable: true,
                    };
                    filterAllSelected2.push(objjT);
                    worldCannonRemoveObj(objjT)
                  }
                });
                worldCannonRemoveObj(obj)
                worldCannonRemoveObj(obj.userData.targetGroup)
              }
              return true;
            }
          }
          return false;
        });
        setArrayObjectSelected(filterAllSelected2);
      }
    }
    const funckeydown = (event) => {
      pressedKeys.current.add(event.key);
      // ✅ Chỉ bật nếu duy nhất 1 phím và là Shift
      if (pressedKeys.current.size === 1 && pressedKeys.current.has("Shift")) {
        isSelectingRect.current = true;
        isCtrlAddSelectingRect.current = false;
        controls.enabled = false;
        if (
          selectionHelperRef &&
          selectionHelperRef.current &&
          !selectionHelperRef.current.enabled
        ) {
          selectionHelperRef.current.enabled = true;
          selectionHelperRef.current.element.style.display = "block";
        }
      } else if (
        pressedKeys.current.size === 1 &&
        pressedKeys.current.has("Control")
      ) {
        isSelectingRect.current = false;
        isCtrlAddSelectingRect.current = true;
      } else {
        isSelectingRect.current = false;
        isCtrlAddSelectingRect.current = false;
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
    };
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
    };
    const handleWindowBlur = () => {
      pressedKeys.current.clear();
    };
    const handleResize = () => {
      if (containerRef && containerRef.current) {
        const sceneWidth = containerRef.current.clientWidth;
        const sceneHeight = containerRef.current.clientHeight;
        cameraRef.current.aspect = sceneWidth / sceneHeight;
        cameraRef.current.updateProjectionMatrix();
        rendererRef.current.setSize(sceneWidth, sceneHeight);
      }
    };
    rendererRef.current.domElement.addEventListener("mousedown", onMouseDown);
    rendererRef.current.domElement.addEventListener("mousemove", onMouseMove);
    rendererRef.current.domElement.addEventListener("mouseup", onMouseUp);
    window.addEventListener("resize", handleResize);
    window.addEventListener("keydown", funckeydown);
    window.addEventListener("keyup", funckeyup);
    window.addEventListener("blur", handleWindowBlur);
    window.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") {
        pressedKeys.current.clear();
      }
    });
    // ANIMATION LOOP
    const clock = new THREE.Clock();
    clockCannonRef.current = clock;
    const animate = () => {
      requestAnimationFrame(animate);


      const deltaConnon = Math.min(clock.getDelta(), 0.1); // max 100ms
      worldCannonRef.current.step(1 / 60, deltaConnon);

      // Đồng bộ vị trí, xoay vật thể từ Cannon sang Three.js
      if (
        objects_RoiTuDo_Ref.current &&
        Object.keys(objects_RoiTuDo_Ref.current).length
      ) {
        for (let uuid in objects_RoiTuDo_Ref.current) {
          objects_RoiTuDo_Ref.current[uuid].mesh.position.copy(
            objects_RoiTuDo_Ref.current[uuid].body.position
          );
          objects_RoiTuDo_Ref.current[uuid].mesh.quaternion.copy(
            objects_RoiTuDo_Ref.current[uuid].body.quaternion
          );
        }
      }
      if (
        objects_2_RoiTuDo_Auto_Ref &&
        objects_2_RoiTuDo_Auto_Ref.current &&
        Object.keys(objects_2_RoiTuDo_Auto_Ref.current).length
      ) {
        for (let uuid in objects_2_RoiTuDo_Auto_Ref.current) {
          if (
            useTransformFromHand &&
            useTransformFromHand.current &&
            selectedObjectRef &&
            selectedObjectRef.current &&
            selectedObjectRef.current.uuid &&
            uuid == selectedObjectRef.current.uuid
          ) {
          } else {
            objects_2_RoiTuDo_Auto_Ref.current[uuid].mesh.position.copy(
              objects_2_RoiTuDo_Auto_Ref.current[uuid].body.position
            );
            objects_2_RoiTuDo_Auto_Ref.current[uuid].mesh.quaternion.copy(
              objects_2_RoiTuDo_Auto_Ref.current[uuid].body.quaternion
            );
          }
        }
      }

      // objects_TuTacDong_Ref.current.forEach(({ mesh, body }) => {
      //   const { position, quaternion, scale } = getGlobalTransform(mesh);
      //   // body.position.copy(mesh.position);
      //   // body.quaternion.copy(mesh.quaternion);
      //   // body.aabbNeedsUpdate = true;
      //   body.position.copy(position);
      //   body.quaternion.copy(quaternion);
      //   body.aabbNeedsUpdate = true;
      // });

      // if (arrHelperUpdate.current && arrHelperUpdate.current.length) {
      //   arrHelperUpdate.current.forEach(({ helper, target }) => {
      //     //     // helper.position.copy(target.getWorldPosition(new THREE.Vector3()));
      //     //     // helper.quaternion.copy(target.getWorldQuaternion(new THREE.Quaternion()));
      //     //     target.updateMatrixWorld(true);
      //     //     helper.position.copy(target.getWorldPosition(new THREE.Vector3()));
      //     //     helper.quaternion.copy(target.getWorldQuaternion(new THREE.Quaternion()));
      //   });
      // }

      // arrHelperUpdate.current.forEach(({ helper, target }) => {
      //   target.updateMatrixWorld(true);

      //   // Lấy boundingBox center local (nếu geometry không thay đổi, bạn có thể cache giá trị này)
      //   helper.geometry.computeBoundingBox();
      //   const centerLocal = new THREE.Vector3();
      //   helper.geometry.boundingBox.getCenter(centerLocal);

      //   // Tính vị trí center thế giới
      //   const centerWorld = centerLocal.clone().applyMatrix4(target.matrixWorld);

      //   // Cập nhật vị trí/quaternion/scale cho helper
      //   helper.position.copy(centerWorld);
      //   helper.quaternion.copy(target.getWorldQuaternion(new THREE.Quaternion()));
      //   // helper.scale.copy(target.getWorldScale(new THREE.Vector3()));
      // });
      // cannonDebugger.update();
      if (
        arrBox3HelperAutoUpdate &&
        arrBox3HelperAutoUpdate.current &&
        arrBox3HelperAutoUpdate.current.length
      ) {
        for (let i = 0; i < arrBox3HelperAutoUpdate.current.length; i++) {
          arrBox3HelperAutoUpdate.current[i].box3.setFromObject(
            arrBox3HelperAutoUpdate.current[i].obj
          );
        }
      }

      if (controlsRef && controlsRef.current) {
        controlsRef.current.update();
      }
      if (
        rendererRef &&
        rendererRef.current &&
        cameraRef &&
        cameraRef.current &&
        sceneRef &&
        sceneRef.current
      ) {
        syncCamera(camera, cameraMini)
        syncCamera(camera, cameraCanvas)
        helperCameraHelper.update()
        debugRenderer.render(scene, cameraDebug); // render camera phụ
        rendererMiniViewRefCanvas.render(scene, cameraMini); // render camera phụ
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    };
    animate();
    return () => {
      rendererRef.current.domElement.removeEventListener(
        "mousedown",
        onMouseDown
      );
      rendererRef.current.domElement.removeEventListener(
        "mousemove",
        onMouseMove
      );
      rendererRef.current.domElement.removeEventListener("mouseup", onMouseUp);
    };
  }, []);

  function getGlobalTransform(mesh) {
    // Cập nhật matrixWorld nếu chưa cập nhật
    mesh.updateMatrixWorld(true);

    const position = new THREE.Vector3();
    const quaternion = new THREE.Quaternion();
    const scale = new THREE.Vector3();

    mesh.matrixWorld.decompose(position, quaternion, scale);

    return {
      position,
      quaternion,
      scale,
    };
  }
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
    // const selectedGroup = new THREE.Group();
    const selectedGroup = new CustomGroup();

    selectedGroup.disabledSplit = true;
    selectedGroup.filterBbox = true;
    // const selectedGroup = simulatedMesh.current
    arrayObjectSelected.forEach((mesh) => {
      // scene.remove(mesh);
      // selectedGroup.add(mesh);
      mesh.userData.isChildGroup = true;
      mesh.userData.targetGroup = selectedGroup;
      mesh.userData.uuidTargetGroup = selectedGroup.uuid;
      selectedGroup.attach(mesh);
      // da add vao group thi bo cannon cua mesh con
      if (
        objects_2_RoiTuDo_Auto_Ref.current &&
        objects_2_RoiTuDo_Auto_Ref.current[mesh.uuid]
      ) {
        try {
          if (worldCannonRef.current) {
            worldCannonRef.current.removeBody(
              objects_2_RoiTuDo_Auto_Ref.current[mesh.uuid].body
            );
          }
        } catch { }
        delete objects_2_RoiTuDo_Auto_Ref.current[mesh.uuid];
      }
      if (
        objects_TuTacDong_Ref.current &&
        objects_TuTacDong_Ref.current[mesh.uuid]
      ) {
        try {
          if (worldCannonRef.current) {
            worldCannonRef.current.removeBody(
              objects_TuTacDong_Ref.current[mesh.uuid].body
            );
          }
        } catch { }
        delete objects_TuTacDong_Ref.current[mesh.uuid];
      }
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
    arrUuidBoxMeshGroup.current.push(bboxMesh.uuid);
    selectedGroup.userData.bboxMesh = bboxMesh;
    simulatedMesh.current = selectedGroup;

    // --- THÊM ĐOẠN NÀY: TẠO PIVOT ---
    const pivot = new THREE.Object3D();

    pivot.position.copy(center); // tâm group
    scene.add(pivot);
    pivot.add(selectedGroup);
    pivot.add(bboxMesh);
    selectedGroup.position.sub(center); // ✅ đúng: giữ vị trí cũ sau khi vào pivot
    bboxMesh.position.copy(center); // đặt về world
    bboxMesh.position.sub(pivot.position); // ✅ chuyển về local trong pivot
    // Gán pivot vào userData
    selectedGroup.userData.pivot = pivot;
    bboxMesh.userData.pivot = pivot; // để bắt sau này
    selectedObjectRef.current = selectedGroup;

    // tao colider cho group
    // Tạo collider Cannon.js từ bounding box
    const halfExtents = new CANNON.Vec3(size.x / 2, size.y / 2, size.z / 2);
    const shape = new CANNON.Box(halfExtents);

    // Tạo body Cannon.js
    const bodyCannon = new CANNON.Body({ mass: 0, shape });

    // Đặt vị trí và hướng của body theo bboxMesh (hoặc center)
    bodyCannon.position.set(center.x, center.y, center.z);

    const quat = new THREE.Quaternion();
    bboxMesh.getWorldQuaternion(quat);
    bodyCannon.quaternion.set(quat.x, quat.y, quat.z, quat.w);

    // Thêm vào thế giới vật lý
    worldCannonRef.current.addBody(bodyCannon);

    // Lưu lại reference
    objects_TuTacDong_Ref.current[selectedGroup.uuid] = {
      mesh: selectedGroup,
      body: bodyCannon,
    };

    // selectedGroup.onTransformChange = (type, axis, val) => {
    //   const arrayObjectSelectedT = [...arrayObjectSelected];
    //   // if (arrayObjectSelectedT && arrayObjectSelectedT.length) {
    //   //   for (let k = 0; k < arrayObjectSelectedT.length; k++) {
    //   //     if (
    //   //       objects_TuTacDong_Ref &&
    //   //       objects_TuTacDong_Ref.current &&
    //   //       objects_TuTacDong_Ref.current[arrayObjectSelectedT[k].uuid]
    //   //     ) {
    //   //       const bodyCannon = createColliderFromMesh(arrayObjectSelectedT[k]);
    //   //       if (bodyCannon) {
    //   //         // Remove body cũ khỏi world
    //   //         worldCannonRef.current.removeBody(
    //   //           objects_TuTacDong_Ref.current[arrayObjectSelectedT[k].uuid].body
    //   //         );
    //   //         worldCannonRef.current.addBody(bodyCannon);
    //   //         objects_TuTacDong_Ref.current[arrayObjectSelectedT[k].uuid].body =
    //   //           bodyCannon;
    //   //         if (type == "scale") {
    //   //           console.log("vao scale group do");
    //   //         }
    //   //         // if (objects_2_RoiTuDo_Auto_Ref_obj[arrayObjectSelectedT[k].uuid]) {
    //   //         //   objects_2_RoiTuDo_Auto_Ref.current[objects_2_RoiTuDo_Auto_Ref_obj[arrayObjectSelectedT[k].uuid].idx].body = bodyCannon;
    //   //         // }
    //   //       }
    //   //     }
    //   //   }
    //   // }
    // };
    selectedGroup.onTransformChange = (type, axis, newVal) => {
      if (
        useTransformFromHand.current &&
        objects_TuTacDong_Ref.current &&
        objects_TuTacDong_Ref.current[selectedGroup.uuid]
      ) {
        const { mesh, body } =
          objects_TuTacDong_Ref.current[selectedGroup.uuid];
        if (type == "position" || type == "rotation" || type == "quaternion") {
          updateTransformToFrom(mesh, body);
        } else if (type == "scale") {
          mesh.updateMatrixWorld(true);

          // 3. Loại bỏ body cũ khỏi world
          worldCannonRef.current.removeBody(body);

          // 1. Lấy bounding box LOCAL của geometry gốc
          console.log("selectedGroup", selectedGroup);
          let bbox;
          if (mesh.isGroup) {
            bbox = new THREE.Box3().setFromObject(mesh);
          } else if (mesh.isMesh) {
            bbox =
              mesh.geometry.boundingBox ||
              mesh.geometry.clone().computeBoundingBox();
          }

          const size = new THREE.Vector3();
          bbox.getSize(size);
          const center = new THREE.Vector3();
          bbox.getCenter(center);

          // ✅ Không multiply với scaleWorld nếu đã từ setFromObject

          const halfExtents = new CANNON.Vec3(
            size.x / 2,
            size.y / 2,
            size.z / 2
          );
          const shape = new CANNON.Box(halfExtents);

          // Khởi tạo collider
          const newBody = new CANNON.Body({
            mass: 0, // hoặc giữ mass cũ nếu cần
            shape,
          });

          // Đặt đúng vị trí center
          newBody.position.set(center.x, center.y, center.z);

          // Lấy hướng quaternion từ object
          const quat = new THREE.Quaternion();
          mesh.getWorldQuaternion(quat);
          newBody.quaternion.set(quat.x, quat.y, quat.z, quat.w);

          newBody.aabbNeedsUpdate = true;

          // 7. Thêm vào world mới
          worldCannonRef.current.addBody(newBody);
          objects_TuTacDong_Ref.current[selectedGroup.uuid].body = newBody;
          if (
            objects_2_RoiTuDo_Auto_Ref &&
            objects_2_RoiTuDo_Auto_Ref.current &&
            objects_2_RoiTuDo_Auto_Ref.current[selectedGroup.uuid]
          ) {
            objects_2_RoiTuDo_Auto_Ref.current[selectedGroup.uuid].body =
              newBody;
          }
        }
      }
    };
    selectedGroup.setPivot(pivot);
    // Cleanup khi effect thay đổi hoặc component unmount
    if (sceneRef && sceneRef.current) {
      let pivotDel = [];
      sceneRef.current.traverse((obj) => {
        if (obj.type === "Group" && obj.filterBbox) {
          let check = false;
          if (obj && obj.children && obj.children.length) {
            for (let i = 0; i < obj.children.length; i++) {
              if (
                obj.children[i].userData &&
                obj.children[i].userData.SelectionBox &&
                obj.children[i].userData.selectable &&
                !obj.children[i].userData.meshBoudingBoxOfGroup &&
                !obj.children[i].userData.pivot
              ) {
                check = true;
                break;
              }
            }
            if (!check && obj.userData.pivot) {
              pivotDel.push(obj.userData.pivot);
            }
          } else if (
            obj &&
            (!obj.children || !obj.children.length) &&
            obj.userData.pivot
          ) {
            pivotDel.push(obj.userData.pivot);
          }
        }
      });
      if (pivotDel && pivotDel.length) {
        for (let i = 0; i < pivotDel.length; i++) {
          sceneRef.current.remove(pivotDel[i]);
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

  async function createFileFromUrl(
    url,
    filename,
    mimeType = "application/octet-stream"
  ) {
    const res = await fetch(url);
    const blob = await res.blob();
    return new File([blob], filename, { type: mimeType });
  }
  function createDoorFromModel(
    model,
    start,
    end,
    openDirection = 1,
    axisOrigin = 1,
    doorHeight = 50,
    deg = 0
  ) {
    // axis=1 => trục của model gốc bên trái, axis=0 => trục của model gốc bên phải
    // 1. Tính khoảng cách và hướng
    const dx = end.x - start.x;
    const dz = end.z - start.z;
    const targetWidth = Math.sqrt(dx * dx + dz * dz);

    // 2. Lấy bounding box
    const box = new THREE.Box3().setFromObject(model);
    const size = new THREE.Vector3();
    box.getSize(size);

    const modelWidth = Math.max(size.x, size.z);
    const modelDepth = Math.min(size.x, size.z);

    // 3. Scale đều

    const scale = targetWidth / modelWidth;
    const heightScale = doorHeight && size.y ? doorHeight / size.y : scale;
    model.scale.set(scale, heightScale, scale);

    // 4. Recalculate box sau scale
    const scaledBox = new THREE.Box3().setFromObject(model);
    const scaledSize = new THREE.Vector3();
    scaledBox.getSize(scaledSize);

    // 5. Nếu cần lật tay nắm
    if (axisOrigin !== openDirection) {
      if (size.x >= size.z) {
        model.scale.x *= -1;
        model.position.x *= -1;
      } else {
        model.scale.z *= -1;
        model.position.z *= -1;
      }
    }
    // 6. Tạo pivot tại điểm xoay
    const pivotPoint = openDirection != 1 ? start : end;
    const pivot = new THREE.Object3D();
    pivot.position.set(pivotPoint.x, pivotPoint.y || 0, pivotPoint.z);

    // 7. Đưa model về gốc (0,0,0) của pivot, mép trùng pivot
    if (size.x >= size.z) {
      // Model rộng theo X
      const direction = openDirection != 1 ? 1 : -1;
      model.position.set((scaledSize.x / 2) * direction, scaledSize.y / 2, 0);
    } else {
      // Model rộng theo Z
      const direction = openDirection != 1 ? 1 : -1;
      model.position.set(0, scaledSize.y / 2, (scaledSize.z / 2) * direction);
    }

    if (deg) {
      pivot.rotation.y = deg;
    }

    // 8. Lưu pivot vào userData để xoay về sau
    model.userData.pivot = pivot;
    pivot.add(model);

    return { pivot, model };
  }

  function findPivotFromMesh(mesh) {
    let obj = mesh;
    while (obj) {
      if (obj.userData.pivot) return obj.userData.pivot;
      obj = obj.parent;
    }
    return null; // không tìm thấy pivot
  }
  // function updateTransformToFrom(mesh, body) {
  //   mesh.updateMatrixWorld(true);

  //   const bboxWorld = new THREE.Box3().setFromObject(mesh);
  //   const centerWorld = new THREE.Vector3();
  //   bboxWorld.getCenter(centerWorld);

  //   const quaternion = new THREE.Quaternion();
  //   mesh.getWorldQuaternion(quaternion);

  //   body.position.copy(centerWorld);
  //   body.quaternion.copy(quaternion);
  //   body.aabbNeedsUpdate = true;
  // }
  function updateTransformToFrom(mesh, body) {
    mesh.updateMatrixWorld(true);

    if (mesh.isMesh) {
      // Với Mesh đơn
      const bboxWorld = new THREE.Box3().setFromObject(mesh);
      const centerWorld = new THREE.Vector3();
      bboxWorld.getCenter(centerWorld);

      const quaternion = new THREE.Quaternion();
      mesh.getWorldQuaternion(quaternion);

      body.position.copy(centerWorld);
      body.quaternion.copy(quaternion);
    } else if (mesh.isGroup) {
      const pivot = mesh.userData?.pivot;

      if (pivot) {
        pivot.updateMatrixWorld(true);

        // ✅ Dùng chính pivot làm vị trí và xoay cho collider
        const pivotWorldPos = new THREE.Vector3();
        pivot.getWorldPosition(pivotWorldPos);

        const pivotWorldQuat = new THREE.Quaternion();
        pivot.getWorldQuaternion(pivotWorldQuat);

        body.position.copy(pivotWorldPos);
        body.quaternion.copy(pivotWorldQuat);
      } else {
        // Group không có pivot → fallback dùng bounding box
        const bboxWorld = new THREE.Box3().setFromObject(mesh);
        const centerWorld = new THREE.Vector3();
        bboxWorld.getCenter(centerWorld);

        const quaternion = new THREE.Quaternion();
        mesh.getWorldQuaternion(quaternion);

        body.position.copy(centerWorld);
        body.quaternion.copy(quaternion);
      }
    }

    body.aabbNeedsUpdate = true;
  }



  const loadModelCommons = async () => {
    // load ghe1,
    let modelStore = {
      door: {
        data: [
          // {
          //   path: "/models/source/door1.zip",
          //   name: "door1",
          // },
          {
            path: "/models/source/door2.zip",
            name: "door1",
          }
        ]
      },
      window: {
        data: [
          {
            path: "/models/source/window1.zip",
            name: "window1",
          }
        ]
      }
    }
    let promiseAll = []
    for (let modelName in modelStore) {
      if (modelStore[modelName].data && modelStore[modelName].data.length) {
        for (let i = 0; i < modelStore[modelName].data.length; i++) {
          const promiseC = new Promise(async (resolve) => {
            try {
              let path1 = modelStore[modelName].data[i].path;
              let splitPath = path1.split('/')
              let fileNameT = splitPath[splitPath.length - 1]
              console.log("doc file", fileNameT)
              const file = await createFileFromUrl(path1, fileNameT);
              if (!file) return;
              let scaleModel = 0.5;
              let scaleX_Model = 0.8,
                scaleY_Model = 0.8,
                scaleZ_Model = 0.8;
              //  const scaleModel = 1
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
                      try {
                        const model = gltf.scene;
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
                        // console.log("model222", _.cloneDeep(model));
                        // console.log("size=", size);
                        // console.log("sizeBox=", sizeBox);
                        // console.log("grid size hien tai", gridSize);
                        // console.log("wall heigh", wallHeight);
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
                        // console.log(`scaleX_Model=${scaleX_Model} scaleY_Model=${scaleY_Model} scaleZ_Model=${scaleZ_Model} scaleModel=${scaleModel}`)
                        //  model.scale.set(sizeX, sizeX, sizeX);
                        model.position.set(0, 0, 0);
                        // scene.add(model);
                        // modelRef.current = model;
                      } catch { }
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
                    const normalized = url.replace(/^(\.\/|\/)/, ""); // fix đường dẫn có ./ hoặc /
                    return blobUrlMap[normalized] || url;
                  });

                  // ✅ Truyền manager vào loader
                  const loader = new GLTFLoader(manager);

                  // Optional: DRACO support nếu cần
                  const dracoLoader = new DRACOLoader();
                  dracoLoader.setDecoderPath("/js/libs/draco/");
                  loader.setDRACOLoader(dracoLoader);

                  // Load từ gltfText
                  const gltf = await loader.parseAsync(gltfText, ""); // path rỗng vì bạn dùng blob
                  try {
                    const model = gltf.scene;
                    const box = new THREE.Box3().setFromObject(model);
                    const size = new THREE.Vector3();
                    let sizeX = 1,
                      sizeY = 1,
                      sizeZ = 1;
                    const sizeBox = box.getSize(size); // size sẽ chứa width, height, depth
                    model.traverse((child) => {
                      if (child.isMesh) {
                        child.castShadow = true;
                        child.material.side = THREE.DoubleSide;
                        interactableMeshes.current.push(child);
                      }
                    });
                    if (!modelThreeCommonRef.current[modelName]) {
                      modelThreeCommonRef.current[modelName] = {};
                    }
                    modelThreeCommonRef.current[modelName][model.uuid] = model;
                    // const model1 = model.clone()
                    // model1.scale.set(scaleModel, scaleModel, scaleModel);
                    // // model1.scale.x *= -1;
                    // model1.scale.z *= -1;
                    // model1.updateMatrixWorld(true);
                    // // // ✅ Tính bounding box sau khi scale
                    // const box2 = new THREE.Box3().setFromObject(model1);
                    // const min2 = box2.min;
                    // model1.position.set(40, -min2.y, 445);
                    // scene.add(model1);
                    // // const boxHelper1 = new THREE.BoxHelper(model1, 'red'); // màu vàng
                    // // scene.add(boxHelper1);
                  } catch (e) {
                    console.log(e);
                  }
                } catch { }
                resolve();
              }
            } catch { }
          });
          promiseAll.push(promiseC)
        }
      }
    }
    await Promise.all(promiseAll)

  };

  useEffect(() => {
    return;
    console.log("watch model Name", modelName);
    // return;
    const scene = sceneRef.current;
    if (modelName == "model-30939153") {
      // load ghe1,
      try {
        new Promise(async (resolve) => {
          let path1 = "/models/source/door1.zip";
          const file = await createFileFromUrl(path1, "door1.zip");
          if (!file) return;
          let scaleModel = 0.5;
          let scaleX_Model = 0.8,
            scaleY_Model = 0.8,
            scaleZ_Model = 0.8;
          //  const scaleModel = 1
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
                  try {
                    const model = gltf.scene;
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
                    console.log("model222", _.cloneDeep(model));
                    console.log("size=", size);
                    console.log("sizeBox=", sizeBox);
                    console.log("grid size hien tai", gridSize);
                    console.log("wall heigh", wallHeight);
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
                    // console.log(`scaleX_Model=${scaleX_Model} scaleY_Model=${scaleY_Model} scaleZ_Model=${scaleZ_Model} scaleModel=${scaleModel}`)
                    //  model.scale.set(sizeX, sizeX, sizeX);
                    model.position.set(0, 0, 0);
                    scene.add(model);
                    // modelRef.current = model;
                  } catch { }
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
                const normalized = url.replace(/^(\.\/|\/)/, ""); // fix đường dẫn có ./ hoặc /
                return blobUrlMap[normalized] || url;
              });

              // ✅ Truyền manager vào loader
              const loader = new GLTFLoader(manager);

              // Optional: DRACO support nếu cần
              const dracoLoader = new DRACOLoader();
              dracoLoader.setDecoderPath("/js/libs/draco/");
              loader.setDRACOLoader(dracoLoader);

              // Load từ gltfText
              const gltf = await loader.parseAsync(gltfText, ""); // path rỗng vì bạn dùng blob
              try {
                const model = gltf.scene;
                const box = new THREE.Box3().setFromObject(model);
                const size = new THREE.Vector3();
                let sizeX = 1,
                  sizeY = 1,
                  sizeZ = 1;
                const sizeBox = box.getSize(size); // size sẽ chứa width, height, depth
                model.traverse((child) => {
                  if (child.isMesh) {
                    child.castShadow = true;
                    child.material.side = THREE.DoubleSide;
                    interactableMeshes.current.push(child);
                  }
                });
                // const model1 = model.clone()
                // model1.scale.set(scaleModel, scaleModel, scaleModel);
                // // model1.scale.x *= -1;
                // model1.scale.z *= -1;
                // model1.updateMatrixWorld(true);
                // // // ✅ Tính bounding box sau khi scale
                // const box2 = new THREE.Box3().setFromObject(model1);
                // const min2 = box2.min;
                // model1.position.set(40, -min2.y, 445);
                // scene.add(model1);
                // // const boxHelper1 = new THREE.BoxHelper(model1, 'red'); // màu vàng
                // // scene.add(boxHelper1);

                const doorHeight = 50;
                let model1 = model.clone();
                let door1 = createDoorFromModel(
                  model1,
                  { x: 40, y: 0, z: 420 },
                  { x: 42, y: 0, z: 472 },
                  1,
                  1,
                  doorHeight
                );
                if (door1 && door1.model) {
                  const model1 = door1.model;
                  const pivotmodel1 = door1.pivot;
                  interactableMeshes.current.push(model1);
                  scene.add(pivotmodel1);
                }

                let model2 = model.clone();
                let door2 = createDoorFromModel(
                  model2,
                  { x: 40, y: 0, z: 330 },
                  { x: 40, y: 0, z: 380 },
                  1,
                  1,
                  doorHeight
                );
                if (door2 && door2.model) {
                  const model2 = door2.model;
                  const pivotmodel2 = door2.pivot;
                  interactableMeshes.current.push(model2);
                  // console.log("da add interactableMeshes2", interactableMeshes)
                  // console.log("scenescene", scene)
                  // console.log("model2", model2)
                  // console.log("pivotmodel2", pivotmodel2)
                  // scene.add(model2)
                  scene.add(pivotmodel2);
                  // const pivotMarker = new THREE.Mesh(
                  //   new THREE.BoxGeometry(2, 10, 2), // Kích thước nhỏ dễ nhìn
                  //   new THREE.MeshBasicMaterial({ color: 'red' }) // Màu đỏ nổi bật
                  // );
                  // pivotMarker.position.copy(door2.pivot.position); // Đặt đúng vị trí pivot
                  // scene.add(pivotMarker);
                  // const boxHelper1 = new THREE.BoxHelper(model2, 'red'); // màu vàng
                  // scene.add(boxHelper1);
                }

                let model3 = model.clone();
                let door3 = createDoorFromModel(
                  model3,
                  { x: 40, y: 0, z: 117 },
                  { x: 40, y: 0, z: 164 },
                  0,
                  1,
                  doorHeight
                );
                if (door3 && door3.model) {
                  const model3 = door3.model;
                  const pivotmodel3 = door3.pivot;
                  interactableMeshes.current.push(model3);
                  scene.add(pivotmodel3);
                }

                let model4 = model.clone();
                let door4 = createDoorFromModel(
                  model4,
                  { x: 370, y: 0, z: 357 },
                  { x: 370, y: 0, z: 408 },
                  1,
                  1,
                  doorHeight
                );
                if (door4 && door4.model) {
                  const model4 = door4.model;
                  const pivotmodel4 = door4.pivot;
                  interactableMeshes.current.push(model4);
                  scene.add(pivotmodel4);
                }

                let model5 = model.clone();
                let door5 = createDoorFromModel(
                  model5,
                  { x: 370, y: 0, z: 243 },
                  { x: 370, y: 0, z: 279 },
                  1,
                  1,
                  doorHeight
                );
                if (door5 && door5.model) {
                  const model5 = door5.model;
                  const pivotmodel5 = door5.pivot;
                  interactableMeshes.current.push(model5);
                  scene.add(pivotmodel5);
                }

                let model6 = model.clone();
                let door6 = createDoorFromModel(
                  model6,
                  { x: 370, y: 0, z: 176 },
                  { x: 370, y: 0, z: 225 },
                  1,
                  1,
                  doorHeight
                );
                if (door6 && door6.model) {
                  const model6 = door6.model;
                  const pivotmodel6 = door6.pivot;
                  interactableMeshes.current.push(model6);
                  scene.add(pivotmodel6);
                }
                let model7 = model.clone();
                let door7 = createDoorFromModel(
                  model7,
                  { x: 224, y: 0, z: 430 },
                  { x: 252, y: 0, z: 430 },
                  1,
                  1,
                  doorHeight,
                  Math.PI / 2
                );
                if (door7 && door7.model) {
                  const model7 = door7.model;
                  const pivotmodel7 = door7.pivot;
                  interactableMeshes.current.push(model7);
                  scene.add(pivotmodel7);
                }
              } catch (e) {
                console.log(e);
              }
            } catch { }
            resolve();
          }
        });
      } catch { }
    }

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
      const rect = rendererRef.current.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, cameraRef.current);

      const intersects = raycaster.intersectObjects(
        interactableMeshes.current,
        true
      );
      if (intersects.length > 0) {
        const pickedMesh = intersects[0].object;
        selectedObjectRef.current = pickedMesh;
        isInteracting = true;
        controlsRef.current.enabled = false;

        if (modeRef.current === "drag") {
          const worldPoint = new THREE.Vector3();
          pickedMesh.getWorldPosition(worldPoint);

          plane.setFromNormalAndCoplanarPoint(
            cameraRef.current.getWorldDirection(plane.normal),
            worldPoint
          );
          offset.copy(intersects[0].point).sub(worldPoint);
        } else if (modeRef.current === "rotate") {
          startMouse.set(event.clientX, event.clientY);
          const pivot = findPivotFromMesh(pickedMesh) || pickedMesh;
          startRotation.copy(pivot.rotation);
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

      const rect = rendererRef.current.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      const obj = selectedObjectRef.current;

      if (modeRef.current === "drag") {
        raycaster.setFromCamera(mouse, cameraRef.current);
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
        // const deltaX = event.clientX - startMouse.x;
        // const deltaY = event.clientY - startMouse.y;
        // if (onlyMoveOnOXZRef && onlyMoveOnOXZRef.current) {
        //   obj.rotation.set(
        //     startRotation.x,
        //     startRotation.y + deltaX * 0.01,
        //     startRotation.z
        //   );
        // } else {
        //   obj.rotation.y = startRotation.y + deltaX * 0.01;
        //   obj.rotation.x = startRotation.x + deltaY * 0.01;
        // }
        const pivot = findPivotFromMesh(obj) || obj;
        const deltaX = event.clientX - startMouse.x;
        const deltaY = event.clientY - startMouse.y;

        const rotateSpeed = 0.005;
        if (onlyMoveOnOXZRef && onlyMoveOnOXZRef.current) {
          pivot.rotation.y = startRotation.y + deltaX * rotateSpeed;
        } else {
          // Xoay quanh trục Y khi kéo ngang
          pivot.rotation.y = startRotation.y + deltaX * rotateSpeed;
          // Xoay quanh trục X khi kéo dọc
          pivot.rotation.x = startRotation.x + deltaY * rotateSpeed;
        }
      } else if (modeRef.current === "scale") {
        const delta = event.clientY - startMouse.y;
        const newScale = Math.max(0, startScale.x + delta * 0.01);
        obj.scale.set(newScale, newScale, newScale);
      }
    }

    function onMouseUp() {
      if (isInteracting) {
        isInteracting = false;
        // selectedObjectRef.current = null;  // BỎ DÒNG NÀY đi
        controlsRef.current.enabled = true;
      }
    }
    rendererRef.current.domElement.addEventListener("mousedown", onMouseDown);
    rendererRef.current.domElement.addEventListener("mousemove", onMouseMove);
    rendererRef.current.domElement.addEventListener("mouseup", onMouseUp);

    const handleResize = () => {
      if (containerRef && containerRef.current) {
        console.log("containerRef.current=", containerRef.current);
        console.log("containerRef.current=", containerRef.current.clientWidth);
        const sceneWidth = containerRef.current.clientWidth;
        const sceneHeight = containerRef.current.clientHeight;
        cameraRef.current.aspect = sceneWidth / sceneHeight;
        cameraRef.current.updateProjectionMatrix();
        rendererRef.current.setSize(sceneWidth, sceneHeight);
      }
    };

    window.addEventListener("resize", handleResize);

    const animate = () => {
      requestAnimationFrame(animate);
      if (controlsRef && controlsRef.current) {
        controlsRef.current.update();
      }
      if (rendererRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    };
    animate();
    return () => {
      rendererRef.current.domElement.removeEventListener(
        "mousedown",
        onMouseDown
      );
      rendererRef.current.domElement.removeEventListener(
        "mousemove",
        onMouseMove
      );
      rendererRef.current.domElement.removeEventListener("mouseup", onMouseUp);
    };
  }, [modelName]);

  useEffect(() => {
    resetSence()
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
      let labels = createLabeledArray(
        dataDeepFloorplan.sizeImg,
        dataDeepFloorplan.wall[0].points
      );
      // let labels2 = [
      //   [0, 1, 1, 0],
      //   [0, 1, 1, 0],
      //   [0, 1, 1, 0],
      // ]
      const findRectanglesT = findRectangles(labels);
      console.log("findRectanglesT", findRectanglesT)
      // let wallstor2 = [
      //   {
      //     "x": 203.5,
      //     "y": 208.5,
      //     "width": 11,
      //     "height": 33,
      //     "confidence": 0.788,
      //     "class": "wall",
      //     "class_id": 0,
      //     "detection_id": "fd144cec-1dbe-47f4-81e7-fb8dfa4b1dfb"
      //   },
      //   {
      //     "x": 218.5,
      //     "y": 463,
      //     "width": 7,
      //     "height": 60,
      //     "confidence": 0.774,
      //     "class": "wall",
      //     "class_id": 0,
      //     "detection_id": "9cd19eb1-e32a-40af-8d8b-cbaef80444a2"
      //   },
      //   {
      //     "x": 44.5,
      //     "y": 182.5,
      //     "width": 7,
      //     "height": 177,
      //     "confidence": 0.756,
      //     "class": "wall",
      //     "class_id": 0,
      //     "detection_id": "7cc95043-96b3-481d-8232-861b554d7475"
      //   },
      //   {
      //     "x": 45,
      //     "y": 399,
      //     "width": 8,
      //     "height": 186,
      //     "confidence": 0.754,
      //     "class": "wall",
      //     "class_id": 0,
      //     "detection_id": "33c55bbb-d85e-4d70-aa68-8765ec0b19d0"
      //   },
      //   {
      //     "x": 264,
      //     "y": 271,
      //     "width": 6,
      //     "height": 68,
      //     "confidence": 0.745,
      //     "class": "wall",
      //     "class_id": 0,
      //     "detection_id": "f77347f0-45c6-40d2-a0ca-63dcdb595f94"
      //   },
      //   {
      //     "x": 362,
      //     "y": 271.5,
      //     "width": 8,
      //     "height": 67,
      //     "confidence": 0.744,
      //     "class": "wall",
      //     "class_id": 0,
      //     "detection_id": "992c037f-b855-4c9d-9a4b-e4b40e447ed0"
      //   },
      //   {
      //     "x": 131.5,
      //     "y": 495.5,
      //     "width": 179,
      //     "height": 9,
      //     "confidence": 0.741,
      //     "class": "wall",
      //     "class_id": 0,
      //     "detection_id": "4b7ed94b-346f-4fd3-8de7-ec13903f49ad"
      //   },
      //   {
      //     "x": 233,
      //     "y": 144,
      //     "width": 6,
      //     "height": 88,
      //     "confidence": 0.73,
      //     "class": "wall",
      //     "class_id": 0,
      //     "detection_id": "2c600414-8e22-41cd-8b30-7f2c3cfb1c58"
      //   },
      //   {
      //     "x": 44.5,
      //     "y": 288,
      //     "width": 7,
      //     "height": 26,
      //     "confidence": 0.701,
      //     "class": "wall",
      //     "class_id": 0,
      //     "detection_id": "8ca07ae2-efee-41b6-85ea-b3039c3e89af"
      //   },
      //   {
      //     "x": 289,
      //     "y": 432,
      //     "width": 150,
      //     "height": 8,
      //     "confidence": 0.681,
      //     "class": "wall",
      //     "class_id": 0,
      //     "detection_id": "466b0086-9b81-416a-af1d-9d91941f595e"
      //   },
      //   {
      //     "x": 309,
      //     "y": 308.5,
      //     "width": 112,
      //     "height": 7,
      //     "confidence": 0.672,
      //     "class": "wall",
      //     "class_id": 0,
      //     "detection_id": "19e7f4eb-ada1-42c9-a2c9-694ce9bffdce"
      //   },
      //   {
      //     "x": 362.5,
      //     "y": 371.5,
      //     "width": 7,
      //     "height": 117,
      //     "confidence": 0.671,
      //     "class": "wall",
      //     "class_id": 0,
      //     "detection_id": "95a0a4b7-5221-48fa-bd09-5c9025f331b9"
      //   },
      //   {
      //     "x": 218,
      //     "y": 359.5,
      //     "width": 6,
      //     "height": 137,
      //     "confidence": 0.654,
      //     "class": "wall",
      //     "class_id": 0,
      //     "detection_id": "3af04ed6-9e67-486d-b11a-99ea3651c6e2"
      //   },
      //   {
      //     "x": 281.5,
      //     "y": 231.5,
      //     "width": 167,
      //     "height": 13,
      //     "confidence": 0.636,
      //     "class": "wall",
      //     "class_id": 0,
      //     "detection_id": "7385d549-4d68-49c2-b506-54965e6f98f9"
      //   },
      //   {
      //     "x": 257,
      //     "y": 370,
      //     "width": 6,
      //     "height": 118,
      //     "confidence": 0.612,
      //     "class": "wall",
      //     "class_id": 0,
      //     "detection_id": "4c5e8512-9994-4d44-8ca2-f31eb2d5624d"
      //   },
      //   {
      //     "x": 298.5,
      //     "y": 288.5,
      //     "width": 5,
      //     "height": 35,
      //     "confidence": 0.612,
      //     "class": "wall",
      //     "class_id": 0,
      //     "detection_id": "2e241ead-3aa8-465f-a509-d81a52fd009c"
      //   },
      //   {
      //     "x": 164,
      //     "y": 142,
      //     "width": 6,
      //     "height": 90,
      //     "confidence": 0.602,
      //     "class": "wall",
      //     "class_id": 0,
      //     "detection_id": "7dae2d9f-d246-4a80-873c-f715a97cd539"
      //   },
      //   {
      //     "x": 164,
      //     "y": 288.5,
      //     "width": 6,
      //     "height": 27,
      //     "confidence": 0.588,
      //     "class": "wall",
      //     "class_id": 0,
      //     "detection_id": "ae6b9e8a-35f6-40a5-b0a0-61268ca11817"
      //   },
      //   {
      //     "x": 199.5,
      //     "y": 189,
      //     "width": 73,
      //     "height": 6,
      //     "confidence": 0.564,
      //     "class": "wall",
      //     "class_id": 0,
      //     "detection_id": "aeb2b758-092e-4035-8f89-4ed901f9e195"
      //   },
      //   {
      //     "x": 163.5,
      //     "y": 208,
      //     "width": 5,
      //     "height": 32,
      //     "confidence": 0.507,
      //     "class": "wall",
      //     "class_id": 0,
      //     "detection_id": "9e73ce28-e0e4-4f07-8d74-5c873aa985e1"
      //   },
      //   {
      //     "x": 182.5,
      //     "y": 227,
      //     "width": 37,
      //     "height": 8,
      //     "confidence": 0.473,
      //     "class": "wall",
      //     "class_id": 0,
      //     "detection_id": "c8c1342a-fe86-4907-9eaa-7c85825c6c43"
      //   },
      //   {
      //     "x": 131.5,
      //     "y": 274,
      //     "width": 179,
      //     "height": 8,
      //     "confidence": 0.465,
      //     "class": "wall",
      //     "class_id": 0,
      //     "detection_id": "2a9cf40c-ebfc-4c21-a673-6c562c58590b"
      //   },
      //   {
      //     "x": 352,
      //     "y": 137,
      //     "width": 22,
      //     "height": 84,
      //     "confidence": 0.459,
      //     "class": "wall",
      //     "class_id": 0,
      //     "detection_id": "18f98428-75a7-4576-b8fa-6cef37a172b8"
      //   },
      //   {
      //     "x": 164,
      //     "y": 249.5,
      //     "width": 6,
      //     "height": 39,
      //     "confidence": 0.412,
      //     "class": "wall",
      //     "class_id": 0,
      //     "detection_id": "cda05fc3-dafc-444d-a86e-87d492c8195b"
      //   },
      //   {
      //     "x": 190,
      //     "y": 94,
      //     "width": 312,
      //     "height": 20,
      //     "confidence": 0.376,
      //     "class": "wall",
      //     "class_id": 0,
      //     "detection_id": "20f7c51b-66a6-4539-9d83-410840749ad8"
      //   },
      //   {
      //     "x": 128.5,
      //     "y": 303,
      //     "width": 167,
      //     "height": 6,
      //     "confidence": 0.374,
      //     "class": "wall",
      //     "class_id": 0,
      //     "detection_id": "2f7f6dd1-e875-4838-825f-26cb521a03b4"
      //   },
      //   {
      //     "x": 226.5,
      //     "y": 209,
      //     "width": 5,
      //     "height": 32,
      //     "confidence": 0.354,
      //     "class": "wall",
      //     "class_id": 0,
      //     "detection_id": "7c88236c-1095-4ce9-9a0d-94d9be19d7c1"
      //   },
      //   {
      //     "x": 362,
      //     "y": 217.5,
      //     "width": 8,
      //     "height": 255,
      //     "confidence": 0.317,
      //     "class": "wall",
      //     "class_id": 0,
      //     "detection_id": "fa896477-f985-4f46-8080-1c2e5a07f524"
      //   }
      // ]
      // setWallStoreV2(wallstor2);
      console.log("findRectanglesT=", findRectanglesT)
      setWallStoreV2(findRectanglesT);
      setWallStore(wallThreejs);
      setGridSize(dataDeepFloorplan.sizeImg);
    }
  }, [dataDeepFloorplan]);


  function getSizeAlongAxis(box3, axis) {
    const points = [
      new THREE.Vector3(box3.min.x, box3.min.y, box3.min.z),
      new THREE.Vector3(box3.max.x, box3.min.y, box3.min.z),
      new THREE.Vector3(box3.min.x, box3.max.y, box3.min.z),
      new THREE.Vector3(box3.min.x, box3.min.y, box3.max.z),
      new THREE.Vector3(box3.max.x, box3.max.y, box3.min.z),
      new THREE.Vector3(box3.max.x, box3.min.y, box3.max.z),
      new THREE.Vector3(box3.min.x, box3.max.y, box3.max.z),
      new THREE.Vector3(box3.max.x, box3.max.y, box3.max.z),
    ];

    let min = Infinity, max = -Infinity;

    for (const p of points) {
      const projection = p.dot(axis);
      min = Math.min(min, projection);
      max = Math.max(max, projection);
    }

    return max - min;
  }
  function addGroupToBox(model, target) {
    // === Bọc model vào group để pivot về giữa
    const modelGroup = new THREE.Group();
    modelGroup.add(model);

    // === Tính bbox gốc để dời pivot về center
    const modelBox = new THREE.Box3().setFromObject(modelGroup);
    const modelCenter = new THREE.Vector3();
    modelBox.getCenter(modelCenter);
    modelGroup.position.sub(modelCenter); // Đưa model về gốc hình học

    // === Gộp vào pivotGroup để xoay + scale
    const pivotGroup = new THREE.Group();
    pivotGroup.add(modelGroup);

    // === Tính hướng model
    const modelSize = new THREE.Vector3();
    modelBox.getSize(modelSize);
    const isModelAlongX = modelSize.x > modelSize.z;
    const modelForward = modelSize.z > modelSize.x
      ? new THREE.Vector3(0, 0, 1)
      : new THREE.Vector3(1, 0, 0);

    // === Tính hướng boxDoor
    const boxDoorBox = new THREE.Box3().setFromObject(target);
    const boxDoorSize = new THREE.Vector3();
    boxDoorBox.getSize(boxDoorSize);
    const boxDoorCenter = new THREE.Vector3();
    boxDoorBox.getCenter(boxDoorCenter);
    const isDoorAlongX = boxDoorSize.x > boxDoorSize.z;
    const boxForward = boxDoorSize.z > boxDoorSize.x
      ? new THREE.Vector3(0, 0, 1)
      : new THREE.Vector3(1, 0, 0);

    // === Xoay model để trùng hướng box
    const angle = Math.atan2(boxForward.z, boxForward.x) - Math.atan2(modelForward.z, modelForward.x);
    pivotGroup.rotation.y = angle;

    // === Đưa model đến đúng vị trí box
    pivotGroup.position.copy(boxDoorCenter);

    // === Cập nhật để đo kích thước sau xoay
    pivotGroup.updateMatrixWorld(true, true);
    const rotatedBox = new THREE.Box3().setFromObject(pivotGroup);
    const rotatedSize = new THREE.Vector3();
    rotatedBox.getSize(rotatedSize);

    // Trục định hướng theo quaternion sau xoay
    const axisX = new THREE.Vector3(1, 0, 0).applyQuaternion(pivotGroup.quaternion).normalize();
    const axisY = new THREE.Vector3(0, 1, 0).applyQuaternion(pivotGroup.quaternion).normalize();
    const axisZ = new THREE.Vector3(0, 0, 1).applyQuaternion(pivotGroup.quaternion).normalize();

    const boxpivotGroup = new THREE.Box3().setFromObject(pivotGroup);

    const sizeX = getSizeAlongAxis(boxpivotGroup, axisX);
    const sizeY = getSizeAlongAxis(boxpivotGroup, axisY);
    const sizeZ = getSizeAlongAxis(boxpivotGroup, axisZ);


    const scaleY = boxDoorSize.y / sizeY;
    let scaleX, scaleZ;

    if (isModelAlongX && isDoorAlongX) {
      scaleX = boxDoorSize.x / sizeX;
      scaleZ = boxDoorSize.z / sizeZ;
    } else if (isModelAlongX && !isDoorAlongX) {
      scaleX = boxDoorSize.z / sizeX;
      scaleZ = boxDoorSize.x / sizeZ;
    } else if (!isModelAlongX && isDoorAlongX) {
      scaleX = boxDoorSize.x / sizeZ;
      scaleZ = boxDoorSize.z / sizeX;
    } else {
      scaleX = boxDoorSize.z / sizeZ;
      scaleZ = boxDoorSize.x / sizeX;
    }

    pivotGroup.scale.set(scaleX, scaleY, scaleZ);
    return { obj: pivotGroup }
  }
  useEffect(() => {
    console.log("watch floorsotore......")
    if (!containerRef.current) return;

    const sceneWidth = containerRef.current.clientWidth;
    const sceneHeight = containerRef.current.clientHeight;

    // Scene setup
    const scene = sceneRef.current;

    // Camera
    const camera = cameraRef.current;
    // camera.position.set(gridSize[0], gridSize[0], gridSize[1]);
    // camera.lookAt(gridSize[0] / 2, 0, gridSize[1] / 2);

    // Renderer
    const renderer = rendererRef.current;

    // Controls
    // const controls = new OrbitControls(camera, renderer.domElement);
    // controls.target.set(gridSize[0] / 2, 0, gridSize[1] / 2);
    // controls.update();
    // controlsRef.current = controls;
    const controls = controlsRef.current;
    controls.enabled = true;
    controls.update();

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

    // 
    // // tạo 1 box cửa ở đây để substract;
    // const boxDoor = new THREE.Mesh(
    //   new THREE.BoxGeometry(100, 150, 100), // rộng, cao, sâu
    //   new THREE.MeshNormalMaterial({ color: 'red' })
    // );
    // boxDoor.position.set(111, 0, 181);
    // boxDoor.visible = false
    // scene.add(boxDoor)

    let arrayDoor = {};
    let arrUpdateDoorWindow = {};
    if (doorStoreV2 && doorStoreV2.length) {
      const doorMaterial = new THREE.MeshStandardMaterial({
        color: 'red',
        roughness: 0.6,
        metalness: 0.2,
      });

      const heightDoor = 1 * 100; // chiều cao tường
      const windowHeight = 0.6 * 100; // chiều cao cửa sổ (có thể điều chỉnh tùy thực tế)
      const windowBaseY = 0.5 * 100;  // cách mặt đất 10 đơn vị

      const modelThreeCommonRefT = modelThreeCommonRef.current;
      let modelDoor;
      try {
        modelDoor =
          modelThreeCommonRefT["door"][
          Object.keys(modelThreeCommonRefT["door"])[0]
          ];
      } catch { }
      let modelWindow;
      try {
        modelWindow =
          modelThreeCommonRefT["window"][
          Object.keys(modelThreeCommonRefT["window"])[0]
          ];
      } catch { }
      doorStoreV2.forEach((door, i) => {
        const { x, y, width, height, class: doorClass } = door;
        let boxGeom, boxDoor;
        const boxWidth = width;
        const boxDepth = height;
        const boxHeight = (doorClass === 'window') ? windowHeight : heightDoor;
        if (doorClass === 'window') {
          // Cửa sổ: chiều cao = windowHeight
          boxGeom = new THREE.BoxGeometry(width, windowHeight, height);
          boxDoor = new THREE.Mesh(boxGeom, doorMaterial);
          // Đặt tâm cửa sổ ở giữa và cách nền 10 đơn vị
          boxDoor.position.set(
            x + width / 2,
            windowBaseY + windowHeight / 2,
            y + height / 2
          );
          boxDoor.name = `window-${i}`;

          // === Clone modelWindow ===
          const windowClone = modelWindow.clone(true);
          windowClone.traverse(child => {
            if (child.isMesh) {
              if (child.material.map) {
                child.material.map = null; // Bỏ texture để màu trắng hiện ra
              }
              child.material.color.set(0xffffff)
            }
          });

          const { obj: windowGroup } = addGroupToBox(windowClone, boxDoor)
          // === Add vào scene
          scene.add(windowGroup);
          arrUpdateDoorWindow[windowGroup.uuid] = windowGroup;

        } else {
          // === Tạo boxDoor (hộp mô phỏng vị trí cửa)
          const boxGeom = new THREE.BoxGeometry(width, heightDoor, height);
          boxDoor = new THREE.Mesh(boxGeom, doorMaterial);
          boxDoor.position.set(
            x + width / 2,
            heightDoor / 2,
            y + height / 2
          );
          boxDoor.name = `door-${i}`;
          // === Clone model cửa
          const doorClone = modelDoor.clone(true);

          doorClone.traverse(child => {
            if (child.isMesh) {
              if (child.material.map) {
                child.material.map = null; // Bỏ texture để màu trắng hiện ra
              }
              child.material.color.set(0xffffff)
            }
          });

          const { obj: doorGroup } = addGroupToBox(doorClone, boxDoor)
          // === Add vào scene
          scene.add(doorGroup);
          arrUpdateDoorWindow[doorGroup.uuid] = doorGroup;
        }
        arrayDoor[boxDoor.uuid] = boxDoor;
        // scene.add(boxDoor);
      });
    }






    wallStoreV2.forEach(({ x, y, width, height }) => {
      const wallMesh = Wall3({
        x,
        z: y,
        xWidth: width,
        zWidth: height,
        height: wallHeightC,
        scene,
        color: wallColor,
        doors: arrayDoor
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
      floorStore.minX != null &&
      floorStore.maxX != null &&
      floorStore.maxZ != null &&
      floorStore.minZ != null
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
      try {
        controls.update();
        renderer.render(scene, camera);
      } catch { }
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
      try {
        if (arrUpdateDoorWindow) {
          for (let key in arrUpdateDoorWindow) {
            scene.remove(arrUpdateDoorWindow[key])
          }
        }
      } catch { }

      controls.update();
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
  }, [wallStore, wallStoreV2, doorStoreV2, gridSize, floorStore]);

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
    let modeSave = ''
    if (modeRef.current == newMode) {
      modeSave = null

    } else {
      modeSave = newMode
    }
    modeRef.current = modeSave;
    setModeUI(modeSave);
  };
  const handleDeleteSelected = () => {
    const obj = selectedObjectRef.current;
    if (obj) {
      if (obj.isGroup) {
        obj.traverse(child => {
          worldCannonRemoveObj(child)
        })
        if (obj.userData && obj.userData.pivot) {
          sceneRef.current.remove(obj.userData.pivot)
        }
      }
      sceneRef.current.remove(obj)
      worldCannonRemoveObj(obj)

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
  // function createTrimesh(mesh) {
  //   const geometry = mesh.geometry.clone();
  //   geometry.applyMatrix4(mesh.matrixWorld);
  //   const posAttr = geometry.getAttribute('position');
  //   const vertices = Array.from(posAttr.array);
  //   const indices = geometry.index ? Array.from(geometry.index.array) : [...Array(vertices.length / 3).keys()];

  //   return new CANNON.Trimesh(vertices, indices);
  // }
  function createTrimesh(mesh) {
    const geometry = mesh.geometry.clone();

    if (!geometry) {
      throw new Error("Geometry không tồn tại");
    }

    geometry.applyMatrix4(mesh.matrixWorld); // ✅ apply trước

    const posAttr = geometry.getAttribute("position"); // ✅ lấy sau khi transform
    if (!posAttr) {
      throw new Error("Geometry không có attribute position");
    }

    const vertices = Array.from(posAttr.array);

    let indices;
    if (geometry.index) {
      indices = Array.from(geometry.index.array);
    } else {
      indices = [];
      for (let i = 0; i < vertices.length / 3; i += 3) {
        indices.push(i, i + 1, i + 2);
      }
    }

    return new CANNON.Trimesh(vertices, indices);
  }

  function createMeshFromTrimesh(trimesh, color = 0xff6600) {
    const geometry = new THREE.BufferGeometry();

    const vertices = [];
    const indices = [];

    for (let i = 0; i < trimesh.vertices.length; i += 3) {
      vertices.push(
        trimesh.vertices[i],
        trimesh.vertices[i + 1],
        trimesh.vertices[i + 2]
      );
    }

    for (let i = 0; i < trimesh.indices.length; i += 3) {
      indices.push(
        trimesh.indices[i],
        trimesh.indices[i + 1],
        trimesh.indices[i + 2]
      );
    }

    geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(vertices, 3)
    );
    geometry.setIndex(indices);
    geometry.computeVertexNormals(); // tùy, không bắt buộc

    const material = new THREE.MeshBasicMaterial({
      color,
      wireframe: true,
      depthTest: false, // để nó nổi lên trên model thật
      transparent: true,
      opacity: 0.6,
    });

    const mesh = new THREE.Mesh(geometry, material);
    return mesh;
  }
  function createThreeMeshFromConvexPolyhedron(convexShape) {
    const geometry = new THREE.BufferGeometry();
    const vertices = [];
    const indices = [];

    // Đẩy từng đỉnh vào mảng
    for (const v of convexShape.vertices) {
      vertices.push(v.x, v.y, v.z);
    }

    // Đẩy từng mặt (face) dưới dạng chỉ số
    for (const face of convexShape.faces) {
      if (face.length === 3) {
        indices.push(...face);
      } else if (face.length > 3) {
        // Tự động phân tam giác hóa nếu là polygon > 3 đỉnh
        for (let i = 1; i < face.length - 1; i++) {
          indices.push(face[0], face[i], face[i + 1]);
        }
      }
    }

    geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(vertices, 3)
    );
    geometry.setIndex(indices);
    geometry.computeVertexNormals();

    const material = new THREE.MeshStandardMaterial({
      color: 0xff6600, // Màu cam
      opacity: 0.5,
      transparent: true,
      side: THREE.DoubleSide,
    });

    const mesh = new THREE.Mesh(geometry, material);
    return mesh;
  }
  // function createBufferGeometryFromMesh(mesh) {
  //   if (!mesh.geometry) {
  //     console.warn("Mesh không có geometry!");
  //     return null;
  //   }

  //   // Clone geometry để tạo geometry mới độc lập
  //   const geometry = mesh.geometry.clone();

  //   // Nếu mesh có transform scale/rotation/position cần apply vào geometry, có thể áp dụng như này:
  //   // geometry.applyMatrix4(mesh.matrixWorld);

  //   return geometry;
  // }
  function createBufferGeometryFromMesh(mesh) {
    if (!mesh.geometry) {
      console.warn("Mesh không có geometry!");
      return null;
    }

    // Clone geometry để tạo geometry mới độc lập
    const geometry = mesh.geometry.clone();

    // Nếu mesh có transform scale/rotation/position cần apply vào geometry, có thể áp dụng như này:
    // Chuyển geometry sang trục toàn cục
    // Lấy transform thế giới của mesh
    const worldMatrix = new THREE.Matrix4();
    mesh.updateWorldMatrix(true, false); // Đảm bảo matrixWorld mới nhất
    worldMatrix.copy(mesh.matrixWorld);

    geometry.applyMatrix4(worldMatrix);

    return geometry;
  }
  const handlerImportAddModel = async (event) => {
    const scene = sceneRef.current;
    if (!scene) return;
    let arrMeshs = [];
    try {
      let scaleModel = 1;
      let scaleX_Model = 1,
        scaleY_Model = 1,
        scaleZ_Model = 1;
      //  const scaleModel = 1
      const modelOrigin = await new Promise(async (resolve) => {
        const file = event.target.files[0];
        if (!file) {
          return resolve();
        }
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
                resolve(gltf.scene);
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
            resolve(gltf.scene);
            return;
          } catch { }
          resolve();
        }
      });
      if (modelOrigin) {
        try {
          const model = modelOrigin.clone();
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
          const useGroup = useGroupRef.current;
          const meshSet = new Set();
          model.traverse((child) => {
            if (child.isMesh) {
              if (!meshSet.has(child)) {
                arrMeshs.push(child);
              }
              // if (Array.isArray(child.material)) {
              //   child.material.forEach(mat => mat.wireframe = true);
              // } else {
              //   child.material.wireframe = true;
              // }
              // child.castShadow = true;
              // child.material.side = THREE.DoubleSide;
              // child.userData.selectable = true;
              // child.userData.SelectionBox = true;
              // child.isSelectionBox = true;
              if (!useGroup) {
                interactableMeshes.current.push(child);
              }
            }
            if (!meshSet.has(child)) {
              meshSet.add(child);
            }
          });

          const childArr = Array.from(meshSet);
          // console.log("childArr", childArr)
          // const mergedGeometry = mergeMeshesToSingleGeometry(model);
          // console.log("mergedGeometry=", mergedGeometry)
          // const convexShape = geometryToConvexPolyhedron(mergedGeometry);

          // const bodyCannon = new CANNON.Body({
          //   mass: 1, // có khối lượng để vật lý tính toán
          //   shape: convexShape,
          //   position: new CANNON.Vec3( /* vị trí ghế */),
          // });
          // console.log("bodyCannon=", bodyCannon)
          // // Visualize bằng Three.js
          // const visualMesh = createThreeMeshFromConvexPolyhedron(convexShape);
          // visualMesh.position.copy(bodyCannon.position);
          // scene.add(visualMesh);

          // model.scale.set(0.001 * scaleModel, 0.001 * scaleModel, 0.001 * scaleModel);
          // model.scale.set(1 * scaleModel, 1 * scaleModel, 1 * scaleModel);
          model.scale.set(scaleModel / 10, scaleModel / 10, scaleModel / 10);
          // model.scale.set(1, 1, 1);
          //  model.scale.set(sizeX, sizeX, sizeX);
          model.position.set(gridSize[0] / 2, 0, gridSize[1] / 2);
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
              model.disabledSplit = true;
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
              arrUuidBoxMeshGroup.current.push(bboxMesh.uuid);
              model.userData.bboxMesh = bboxMesh;
              // scene.add(bboxMesh);
              simulatedMesh.current = model;

              // --- THÊM ĐOẠN NÀY: TẠO PIVOT ---
              const pivot = new THREE.Object3D();
              pivot.position.copy(center); // tâm group
              scene.add(pivot);
              pivot.add(model);
              pivot.add(bboxMesh);
              model.position.sub(center); // ✅ đúng: giữ vị trí cũ sau khi vào pivot
              bboxMesh.position.copy(center); // đặt về world
              bboxMesh.position.sub(pivot.position); // ✅ chuyển về local trong pivot

              // Gán pivot vào userData
              model.userData.pivot = pivot;
              bboxMesh.userData.pivot = pivot; // để bắt sau này
              selectedObjectRef.current = model;
            }
          } else {
            try {
              if (childArr && childArr.length) {
                childArr.forEach((objTTT) => {
                  if (objTTT.isMesh) {
                    objTTT.updateMatrixWorld(true);

                    // Tạo geometry đã "bake" transform vào
                    // const clonedGeometry = objTTT.geometry.clone();

                    // // Apply toàn bộ matrixWorld vào geometry để giữ nguyên hình dáng/rotate
                    // clonedGeometry.applyMatrix4(objTTT.matrixWorld);

                    // // Reset transform về mặc định vì transform đã được bake rồi
                    // const objTT = new CustomMesh(
                    //   clonedGeometry,
                    //   objTTT.material.clone()
                    // );
                    // // Tạo bản sao mới
                    // const objTT = new CustomMesh(
                    //   objTTT.geometry.clone(),
                    //   objTTT.material.clone()
                    // );
                    // const objTT = new THREE.Mesh(
                    //   objTTT.geometry.clone(),
                    //   objTTT.material.clone()
                    // );

                    // // Copy transform
                    // objTT.position.setFromMatrixPosition(objTTT.matrixWorld);
                    // objTT.quaternion.copy(
                    //   objTTT.getWorldQuaternion(new THREE.Quaternion())
                    // );
                    // objTT.scale.copy(objTTT.getWorldScale(new THREE.Vector3()));
                    // objTT.updateMatrixWorld(true);
                    // 1. Clone và bake transform
                    const clonedGeometry = objTTT.geometry.clone();
                    clonedGeometry.applyMatrix4(objTTT.matrixWorld);

                    // 2. Tính lại bounding box
                    clonedGeometry.computeBoundingBox();
                    const bbox = clonedGeometry.boundingBox;
                    const center = new THREE.Vector3();
                    bbox.getCenter(center);

                    // 3. Dịch geometry sao cho center về (0,0,0)
                    clonedGeometry.translate(-center.x, -center.y, -center.z);

                    // 4. Tạo mesh với pivot tại center của object
                    const objTT = new CustomMesh(
                      clonedGeometry,
                      objTTT.material.clone()
                    );

                    // 5. Gán transform: mesh ở đúng vị trí cũ
                    objTT.position.copy(center); // đây chính là vị trí thật sự
                    objTT.rotation.set(0, 0, 0);
                    objTT.scale.set(1, 1, 1);
                    objTT.updateMatrixWorld(true);

                    // Gán thông tin bổ sung
                    objTT.name = objTTT.name;
                    objTT.userData = { ...objTTT.userData };
                    objTT.castShadow = true;
                    objTT.material.side = THREE.DoubleSide;
                    objTT.userData.selectable = true;
                    objTT.userData.SelectionBox = true;
                    objTT.isSelectionBox = true;

                    // Tính bounding box world để dùng cho collider
                    const bboxWorld = new THREE.Box3().setFromObject(objTT);
                    const sizeWorld = new THREE.Vector3();
                    bboxWorld.getSize(sizeWorld);
                    const centerWorld = new THREE.Vector3();
                    bboxWorld.getCenter(centerWorld);

                    // Tính bounding box local để debug (vẽ bounding box mesh)
                    const geometry = objTT.geometry;
                    geometry.computeBoundingBox();
                    const bboxLocal = geometry.boundingBox;
                    const sizeLocal = new THREE.Vector3();
                    bboxLocal.getSize(sizeLocal);
                    const centerLocal = new THREE.Vector3();
                    bboxLocal.getCenter(centerLocal);

                    // Tạo bounding box debug mesh đúng vị trí (dịch geometry về tâm)
                    const geo = new THREE.BoxGeometry(
                      sizeLocal.x,
                      sizeLocal.y,
                      sizeLocal.z
                    );
                    geo.translate(centerLocal.x, centerLocal.y, centerLocal.z); // Dịch geometry về đúng center
                    const mat = new THREE.MeshBasicMaterial({
                      color: "blue",
                      wireframe: true,
                    });
                    // const bboxMesh = new THREE.Mesh(geo, mat);
                    // bboxMesh.name = "DebugBoundingBox";
                    // bboxMesh.visible = false;
                    // objTT.add(bboxMesh);

                    // Thêm vào scene (chỉ objTT thôi, không objTTT)
                    // --- Tạo collider Cannon.js theo bounding box world space ---
                    const halfExtents = new CANNON.Vec3(
                      sizeWorld.x / 2,
                      sizeWorld.y / 2,
                      sizeWorld.z / 2
                    );
                    const boxShape = new CANNON.Box(halfExtents);

                    const floorMaterial = new CANNON.Material("floorMaterial");
                    // Material cho vật
                    const boxMaterial = new CANNON.Material("boxMaterial");
                    const contactMaterial = new CANNON.ContactMaterial(
                      floorMaterial,
                      boxMaterial,
                      {
                        friction: 1, // ma sát: 0 (trơn) → 1 (rất nhám)
                        restitution: 0.0, // độ nảy: 0 (không nảy), 1 (nảy hết lực)
                      }
                    );

                    const boxBody = new CANNON.Body({
                      mass: 10000, // static body
                      shape: boxShape,
                      material: contactMaterial,
                      linearDamping: 0.99, // Giảm trôi
                      angularDamping: 0.99, // Giảm lắc khi va chạm
                    });

                    // Set vị trí và quaternion theo objTT (đã là world space)
                    boxBody.position.set(
                      centerWorld.x,
                      centerWorld.y,
                      centerWorld.z
                    );

                    const worldQuat = new THREE.Quaternion();
                    objTT.getWorldQuaternion(worldQuat);
                    boxBody.quaternion.set(
                      worldQuat.x,
                      worldQuat.y,
                      worldQuat.z,
                      worldQuat.w
                    );

                    boxBody.aabbNeedsUpdate = true;

                    // Thêm collider vào world Cannon.js
                    worldCannonRef.current.addBody(boxBody);

                    // --- Lưu lại để đồng bộ nếu cần ---
                    objects_2_RoiTuDo_Auto_Ref.current[objTT.uuid] = {
                      mesh: objTT,
                      body: boxBody,
                    };
                    objects_TuTacDong_Ref.current[objTT.uuid] = {
                      mesh: objTT,
                      body: boxBody,
                    };
                    scene.attach(objTT);
                    objTT.onTransformChange = (type, axis, newVal) => {
                      if (
                        useTransformFromHand.current &&
                        objects_TuTacDong_Ref.current &&
                        objects_TuTacDong_Ref.current[objTT.uuid]
                      ) {
                        const { mesh, body } =
                          objects_TuTacDong_Ref.current[objTT.uuid];
                        if (
                          type == "position" ||
                          type == "rotation" ||
                          type == "quaternion"
                        ) {
                          updateTransformToFrom(mesh, body);
                        } else if (type == "scale") {
                          mesh.updateMatrixWorld(true);

                          // 3. Loại bỏ body cũ khỏi world
                          worldCannonRef.current.removeBody(body);

                          // 1. Lấy bounding box LOCAL của geometry gốc
                          const bbox =
                            mesh.geometry.boundingBox ||
                            mesh.geometry.clone().computeBoundingBox();
                          const sizeLocal = new THREE.Vector3();
                          bbox.getSize(sizeLocal);
                          const centerLocal = new THREE.Vector3();
                          bbox.getCenter(centerLocal);

                          // 2. Lấy scale của mesh trong thế giới
                          const scaleWorld = new THREE.Vector3();
                          mesh.getWorldScale(scaleWorld);

                          // 3. Tính lại size collider theo scale thực
                          const sizeWorld = sizeLocal
                            .clone()
                            .multiply(scaleWorld);
                          const centerWorld = centerLocal
                            .clone()
                            .applyMatrix4(mesh.matrixWorld);

                          // 3. Tạo collider mới
                          const halfExtents = new CANNON.Vec3(
                            sizeWorld.x / 2,
                            sizeWorld.y / 2,
                            sizeWorld.z / 2
                          );
                          const shape = new CANNON.Box(halfExtents);
                          const newBody = new CANNON.Body({
                            mass: 10000, // static body
                            shape: shape,
                            material: contactMaterial,
                            linearDamping: 0.99, // Giảm trôi
                            angularDamping: 0.99, // Giảm lắc khi va chạm
                          });

                          // 4. Đặt collider đúng vị trí & xoay
                          newBody.position.set(
                            centerWorld.x,
                            centerWorld.y,
                            centerWorld.z
                          );
                          const quat = new THREE.Quaternion();
                          mesh.getWorldQuaternion(quat);
                          newBody.quaternion.set(
                            quat.x,
                            quat.y,
                            quat.z,
                            quat.w
                          );
                          newBody.aabbNeedsUpdate = true;

                          // 7. Thêm vào world mới
                          worldCannonRef.current.addBody(newBody);
                          objects_TuTacDong_Ref.current[objTT.uuid].body =
                            newBody;
                          if (
                            objects_2_RoiTuDo_Auto_Ref &&
                            objects_2_RoiTuDo_Auto_Ref.current &&
                            objects_2_RoiTuDo_Auto_Ref.current[objTT.uuid]
                          ) {
                            objects_2_RoiTuDo_Auto_Ref.current[
                              objTT.uuid
                            ].body = newBody;
                          }
                        }
                      }
                    };
                  } else {
                    // scene.add(objTTT);
                  }
                });
              }
            } catch {
              // scene.add(model);
            }
          }
        } catch (e) {
          console.log("e", e);
        }
      }
    } catch { }
    // try {
    //   if (arrMeshs && arrMeshs.length) {
    //     arrMeshs.forEach(child => {
    //       if (child.isMesh) {
    //         const shape = createTrimesh(child);
    //         // Hiển thị để kiểm tra:
    //         const helper = createMeshFromTrimesh(shape, 'yellow'); // hoặc 0x00ff00
    //         helper.position.copy(child.getWorldPosition(new THREE.Vector3()));
    //         helper.quaternion.copy(child.getWorldQuaternion(new THREE.Quaternion()));
    //         console.log("da add xong roi ne")
    //         // child.add(helper)
    //         // child.userData.bboxMesh = helper
    //         scene.attach(helper)
    //       }
    //     })
    //   }
    // } catch { }
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
    return;
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
        console.log("model", model);
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
    console.log("tao on mouse 33333333333");

    renderer.domElement.addEventListener("mousedown", onMouseDown);
    renderer.domElement.addEventListener("mousemove", onMouseMove);
    renderer.domElement.addEventListener("mouseup", onMouseUp);

    const handleResize = () => {
      const width = mountRef.current.clientWidth;
      const height = mountRef.current.clientHeight;
      console.log("vao day roi nay");
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
          const findRectanglesT = findRectangles(responseJson.data.array);
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
    // console.log("box",box)

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
  const addDoor = async () => {
    try {
      let points = [];
      points = createLabeledArray(
        dataDeepFloorplan.sizeImg,
        dataDeepFloorplan["door/window"][0].points,
        9
      );
      if (!points || !points.length) return;
      let dataSend = {
        points: points,
      };
      try {
        const response = await fetch("http://127.0.0.1:8000/cal-door-window", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(dataSend),
        });

        if (!response.ok) throw new Error("Error");
        const responseJson = await response.json();
        if (responseJson && responseJson.data) {
          const labelAs = 9;
          const findRectanglesT = findRectangles(responseJson.data, labelAs);
          setpositionDoorWindow(findRectanglesT);
        }
      } catch (error) {
        console.error("Lỗi upload:", error);
      }
    } catch { }
  };
  const [selectedRefObJSelected, setselectedRefObJSelected] = useState(null);
  const [positionSelectObjet, setpositionSelectObjet] = useState([0, 0, 0]);

  useEffect(() => {
    if (selectedRefObJSelected) {
      const obj =
        selectedRefObJSelected.userData && selectedRefObJSelected.userData.pivot
          ? selectedRefObJSelected.userData.pivot
          : selectedRefObJSelected;
      const pos = obj.position.toArray();
      setpositionSelectObjet(pos);
    }
  }, [selectedRefObJSelected]);
  useEffect(() => {
    if (selectedRefObJSelected) {
      const obj =
        selectedRefObJSelected.userData && selectedRefObJSelected.userData.pivot
          ? selectedRefObJSelected.userData.pivot
          : selectedRefObJSelected;
      // obj.position.set(...positionSelectObjet);
      obj.position.x = positionSelectObjet[0];
      obj.position.y = positionSelectObjet[1];
      obj.position.z = positionSelectObjet[2];
    }
  }, [positionSelectObjet]);
  const handleChangeSelectObject = (index, value) => {
    const newPos = [...positionSelectObjet];
    newPos[index] = parseFloat(value);
    setpositionSelectObjet(newPos);
  };
  async function rotateBase64(srcBase64, degrees) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const image = new Image();
    image.src = srcBase64;
    canvas.width = degrees % 180 === 0 ? image.width : image.height;
    canvas.height = degrees % 180 === 0 ? image.height : image.width;

    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate(Math.PI);
    ctx.scale(-1, 1);
    ctx.drawImage(image, image.width / -2, image.height / -2);
    return canvas.toDataURL();
  }
  function captureScene() {
    cameraSphereRef.current.visible = false;
    rendererRef.current.render(sceneRef.current, cameraRef.current); // đảm bảo gọi cái này trước
    setTimeout(() => {
      const canvas = rendererRef.current.domElement;
      console.log("canvas", canvas)
      const dataURL = canvas.toDataURL("image/png");
      const link = document.createElement('a');
      link.href = dataURL;
      link.download = 'canvas-snapshot.png';
      link.click();
      cameraSphereRef.current.visible = true;
    }, 1000);

  }

  // 🔧 Hàm này sẽ render 3 input nếu meshRef tồn tại
  const renderPositionInputs = () => {
    if (!selectedRefObJSelected) return;

    return (
      <div className="flex items-center">
        {["X", "Y", "Z"].map((axis, i) => (
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
  function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
  const objects_2_RoiTuDo_Auto_Ref = useRef([]);
  const objects_RoiTuDo_Ref = useRef({});
  const objects_TuTacDong_Ref = useRef({});
  const dropRandomObjectInterValRef = useRef(null);
  const dropRandomObjectInterCheckValRef = useRef(false);
  // Hàm thả vật thể ngẫu nhiên hình cầu hoặc tam giác
  const dropRandomObject = () => {
    dropRandomObjectInterCheckValRef.current =
      !dropRandomObjectInterCheckValRef.current;
    if (!dropRandomObjectInterCheckValRef.current) {
      if (dropRandomObjectInterValRef.current) {
        clearInterval(dropRandomObjectInterValRef.current);
      }
      return;
    }
    dropRandomObjectInterValRef.current = setInterval(() => {
      const scene = sceneRef.current;
      const world = worldCannonRef.current;
      if (!scene || !world) return;
      const type = Math.random() < 0.5 ? "sphere" : "pyramid";
      const color = Math.random() * 0xffffff;

      // Vị trí rơi random gần trung tâm ±30
      const xCeil = Math.ceil(gridSize[0] / 2);
      const zCeil = Math.ceil(gridSize[1] / 2);
      const x = randomInt(-xCeil, xCeil) + xCeil;
      const z = randomInt(-zCeil, zCeil) + zCeil;
      const y = 50;

      let mesh, body;

      if (type === "sphere") {
        const radius = 3 + Math.random() * 2;
        // Three.js mesh
        const sphereGeo = new THREE.SphereGeometry(radius, 50, 50);
        const sphereMat = new THREE.MeshStandardMaterial({ color });
        mesh = new THREE.Mesh(sphereGeo, sphereMat);
        mesh.position.set(x, y, z);
        scene.add(mesh);

        // Cannon body
        const shape = new CANNON.Sphere(radius);
        body = new CANNON.Body({
          mass: 1,
          shape,
          position: new CANNON.Vec3(x, y, z),
          material: new CANNON.Material({ friction: 0.4, restitution: 0.7 }),
        });
        world.addBody(body);
      } else {
        // Pyramid dạng hình chóp tam giác (cylinder 3 cạnh)
        const radius = 5;
        const height = 7;
        const coneGeo = new THREE.ConeGeometry(radius, height, 3);
        const coneMat = new THREE.MeshStandardMaterial({ color });
        mesh = new THREE.Mesh(coneGeo, coneMat);
        mesh.position.set(x, y, z);
        scene.add(mesh);

        // Cannon shape gần đúng: cylinder 3 cạnh
        const shape = new CANNON.Cylinder(0.1, radius, height, 3);
        body = new CANNON.Body({
          mass: 1,
          shape,
          position: new CANNON.Vec3(x, y, z),
          material: new CANNON.Material({ friction: 0.4, restitution: 0.5 }),
        });
        // Xoay thân thẳng đứng
        body.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
        world.addBody(body);
      }
      objects_RoiTuDo_Ref.current[mesh.uuid] = {
        mesh,
        body,
      };
    }, 500);
  };
  function dichuyengaunhien() {
    startRandomBoxMovementIntervalCheck.current =
      !startRandomBoxMovementIntervalCheck.current;
    if (!startRandomBoxMovementIntervalCheck.current) {
      if (startRandomBoxMovementIntervalRef.current) {
        clearInterval(startRandomBoxMovementIntervalRef.current);
      }
      return;
    }
    const boxes = dovatdichuyen.current;
    startRandomBoxMovement(boxes, 400);
  }

  // function arrangeObjectsWithVoxelOptimized({
  //   gridSize,
  //   objects,
  //   scene,
  //   world,
  //   cellSize = 1,
  //   spacing = 0.2,
  //   dropHeight = 5,
  //   maxOffset = 50,
  // }) {
  //   const [m, n] = gridSize;
  //   const centerX = Math.floor(m / 2);
  //   const centerZ = Math.floor(n / 2);

  //   const occupiedBoxes = [];

  //   for (const { mesh, body } of objects) {
  //     const bbox = new THREE.Box3().setFromObject(mesh);
  //     const size = new THREE.Vector3();
  //     bbox.getSize(size);

  //     const sizeX = Math.ceil((size.x + spacing) / cellSize);
  //     const sizeZ = Math.ceil((size.z + spacing) / cellSize);
  //     const halfSize = size.clone().multiplyScalar(0.5);

  //     let placed = false;

  //     for (let offset = 0; offset <= maxOffset && !placed; offset++) {
  //       for (let dx = -offset; dx <= offset && !placed; dx += sizeX) {
  //         for (let dz = -offset; dz <= offset && !placed; dz += sizeZ) {
  //           const i = centerX + dx;
  //           const j = centerZ + dz;

  //           if (i < 0 || j < 0 || i + sizeX > m || j + sizeZ > n) continue;

  //           const x = i * cellSize;
  //           const z = j * cellSize;
  //           const y = halfSize.y + dropHeight;

  //           const min = new THREE.Vector3(x, y, z).sub(halfSize);
  //           const max = new THREE.Vector3(x, y, z).add(halfSize);

  //           const collision = occupiedBoxes.some(box => (
  //             min.x <= box.max.x && max.x >= box.min.x &&
  //             min.y <= box.max.y && max.y >= box.min.y &&
  //             min.z <= box.max.z && max.z >= box.min.z
  //           ));

  //           if (!collision) {
  //             mesh.position.set(x, y, z);
  //             if (body) {
  //               body.position.set(x, y, z);
  //               body.velocity.set(0, 0, 0);
  //               body.angularVelocity.set(0, 0, 0);
  //               if (!world.bodies.includes(body)) world.addBody(body);
  //             }

  //             if (!scene.children.includes(mesh)) scene.add(mesh);

  //             occupiedBoxes.push({ min, max });
  //             placed = true;

  //             console.log(`✅ Đặt vật tại (${x.toFixed(2)}, ${y.toFixed(2)}, ${z.toFixed(2)})`);
  //           }
  //         }
  //       }
  //     }

  //     if (!placed) {
  //       console.warn("❌ Không thể đặt vật:", mesh.name || mesh.uuid);
  //     }
  //   }
  // }

  function arrangeObjectsByBoundingBox({
    gridSize, // [m, n]
    objects, // [{ mesh, body }]
    scene,
    world,
    cellSize = 1,
    spacing = 0.05, // khoảng cách giữa vật
  }) {
    const [m, n] = gridSize;
    const centerX = Math.floor(m / 2);
    const centerZ = Math.floor(n / 2);

    // Lưu vùng đã bị chiếm trên mặt OXZ, dạng array 2D đánh dấu ô đã có vật
    const occupiedGrid = Array(m)
      .fill(null)
      .map(() => Array(n).fill(false));

    // Hàm kiểm tra vùng lưới [x, x+sizeX), [z, z+sizeZ) đã có vật chưa
    function isOccupied(x, z, sizeX, sizeZ) {
      if (x < 0 || z < 0 || x + sizeX > m || z + sizeZ > n) return true;
      for (let i = x; i < x + sizeX; i++) {
        for (let j = z; j < z + sizeZ; j++) {
          if (occupiedGrid[i][j]) return true;
        }
      }
      return false;
    }

    // Đánh dấu vùng đã bị chiếm
    function markOccupied(x, z, sizeX, sizeZ) {
      for (let i = x; i < x + sizeX; i++) {
        for (let j = z; j < z + sizeZ; j++) {
          occupiedGrid[i][j] = true;
        }
      }
    }

    for (const { mesh, body } of objects) {
      if (body._placed) continue;

      const bbox = new THREE.Box3().setFromObject(mesh);
      const size = new THREE.Vector3();
      bbox.getSize(size);

      // Tính số ô chiếm trong lưới theo kích thước bounding box
      const sizeX = Math.max(1, Math.ceil((size.x + spacing) / cellSize));
      const sizeZ = Math.max(1, Math.ceil((size.z + spacing) / cellSize));

      let placed = false;

      // Duyệt vị trí trên lưới, bắt đầu từ tâm, đi ra ngoài
      const maxOffset = Math.max(m, n);
      for (let offset = 0; offset <= maxOffset && !placed; offset++) {
        for (let dx = -offset; dx <= offset && !placed; dx++) {
          for (let dz = -offset; dz <= offset && !placed; dz++) {
            const i = centerX + dx;
            const j = centerZ + dz;

            if (isOccupied(i, j, sizeX, sizeZ)) continue;

            // Tính vị trí đặt vật (trung tâm bounding box)
            const x = i * cellSize + size.x / 2;
            const z = j * cellSize + size.z / 2;
            const y = size.y / 2; // đặt vật trên mặt đất

            mesh.position.set(x, y, z);
            body.position.set(x, y, z);
            body.velocity.set(0, 0, 0);
            body.angularVelocity.set(0, 0, 0);

            if (!scene.children.includes(mesh)) scene.add(mesh);
            if (!body.world) world.addBody(body);

            markOccupied(i, j, sizeX, sizeZ);
            body._placed = true;
            placed = true;

            console.log(
              `✅ Đặt vật tại: (${x.toFixed(2)}, ${y.toFixed(2)}, ${z.toFixed(
                2
              )})`
            );
          }
        }
      }

      if (!placed) {
        console.warn("❌ Không thể đặt vật:", mesh.name || mesh.uuid);
      }
    }
  }
  function handleSelectImgDetect(e) {


    const file = e.target.files[0];
    if (!file) return;
    setdetectedRes(null)
    const reader = new FileReader();

    reader.onload = () => {
      const result = reader.result; // dạng: "data:image/jpeg;base64,..."
      setbase64ImgDetect({
        imgbase64: result,
        file: file
      })
    };

    reader.readAsDataURL(file);
  }
  useEffect(() => {
    if (!base64ImgDetect?.imgbase64) return;

    const canvas = canvasbase64ImgDetect.current;
    const ctx = canvas.getContext("2d");
    const img = new Image();

    img.onload = () => {
      // Set canvas size = container (hoặc ảnh gốc nếu không giới hạn)
      const fixedHeight = 500;
      const scale = fixedHeight / img.height;
      const scaledWidth = img.width * scale;

      canvas.width = scaledWidth;
      canvas.height = fixedHeight;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (showImgDetect) {
        ctx.drawImage(img, 0, 0, scaledWidth, fixedHeight);
      }
      const predictions = detectedRes?.predictions.filter(item => item.confidence != null && item.confidence >= confidenceThreshold / 100)
      // Vẽ box
      if (predictions && predictions.length) {
        predictions.forEach((p) => {
          // const x = (p.x - p.width / 2) * scale;
          // const y = (p.y - p.height / 2) * scale;
          // const boxW = p.width * scale;
          // const boxH = p.height * scale;

          // // Vẽ khung box
          // ctx.strokeStyle = "red";
          // ctx.lineWidth = 2;
          // ctx.strokeRect(x, y, boxW, boxH);

          // // Vẽ nhãn
          // const label = `${p.class || p.name || "label"} (${Math.round(p.confidence * 100)}%)`;
          // ctx.fillStyle = "red";
          // ctx.font = "14px Arial";
          // ctx.fillText(label, x + 4, y - 6);

          const x = (p.x - p.width / 2) * scale;
          const y = (p.y - p.height / 2) * scale;
          const boxW = p.width * scale;
          const boxH = p.height * scale;
          if (modeShowCanvasDetect !== 'Censor Predictions') {
            // VẼ BOX luôn cho cả 3 mode còn lại
            if (p.class == 'door') {
              ctx.strokeStyle = "green";
            } else {
              ctx.strokeStyle = "red";
            }

            ctx.lineWidth = 2;
            ctx.strokeRect(x, y, boxW, boxH);
          }

          if (modeShowCanvasDetect === 'Draw Labels') {
            const label = `${p.class || p.name || "label"} ${Math.round(p.confidence * 100)}%`;
            ctx.fillStyle = "blue";
            ctx.font = "14px Arial";
            ctx.fillText(label, x + 4, y - 6);
          }

          if (modeShowCanvasDetect === 'Draw Confidence') {
            const confidence = `${Math.round(p.confidence * 100)}%`;
            ctx.fillStyle = "blue";
            ctx.font = "14px Arial";
            ctx.fillText(confidence, x + 4, y + boxH + 14);
          }

          if (modeShowCanvasDetect === 'Censor Predictions') {
            ctx.fillStyle = "#add123";
            ctx.fillRect(x, y, boxW, boxH);
          }
        });
      }

    };

    img.src = base64ImgDetect.imgbase64;
  }, [base64ImgDetect, detectedRes, confidenceThreshold, modeShowCanvasDetect, showImgDetect]);

  // function adjustDoorsToFitWalls(doors, walls) {
  //   const adjustedDoors = [];

  //   doors.forEach((door, idx) => {
  //     if (idx != 4) return
  //     const dx1 = door.x;
  //     const dx2 = door.x + door.width;
  //     const dy1 = door.y;
  //     const dy2 = door.y + door.height;

  //     let bestIoU = 0;
  //     let bestWall = null;
  //     console.log("voi door=", door)

  //     walls.forEach((wall) => {
  //       const wx1 = wall.x;
  //       const wx2 = wall.x + wall.width;
  //       const wy1 = wall.y;
  //       const wy2 = wall.y + wall.height;

  //       const ix1 = Math.max(dx1, wx1);
  //       const ix2 = Math.min(dx2, wx2);
  //       const iy1 = Math.max(dy1, wy1);
  //       const iy2 = Math.min(dy2, wy2);
  //       const iw = Math.max(0, ix2 - ix1);
  //       const ih = Math.max(0, iy2 - iy1);
  //       const intersectionArea = iw * ih;

  //       const unionArea =
  //         door.width * door.height + wall.width * wall.height - intersectionArea;

  //       const iou = intersectionArea / unionArea;

  //       if (iou > bestIoU) {
  //         bestIoU = iou;
  //         bestWall = wall;
  //       }
  //     });

  //     if (bestWall) {
  //       console.log("tim thay wall=", bestWall)
  //       const wallIsHorizontal = bestWall.width > bestWall.height;

  //       let adjustedDoor = { ...door };

  //       if (wallIsHorizontal) {
  //         // Tường ngang (theo trục X): cửa nằm dọc theo X, dày theo Y
  //         adjustedDoor.y = bestWall.y; // căn cửa theo Y của tường
  //         adjustedDoor.height = bestWall.height; // lấy độ dày của tường
  //       } else {
  //         // Tường dọc (theo trục Y): cửa nằm dọc theo Y, dày theo X
  //         adjustedDoor.x = bestWall.x; // căn cửa theo X của tường
  //         adjustedDoor.width = bestWall.width; // lấy độ dày của tường
  //       }
  //       console.log("-------sau khi tinh lai", adjustedDoor)

  //       adjustedDoors.push(adjustedDoor);
  //     }
  //   });

  //   return adjustedDoors;
  // }
  function adjustDoorsToFitWalls(doors, walls) {
    const adjustedDoors = [];

    doors.forEach((door, idx) => {
      const dx1 = door.x;
      const dx2 = door.x + door.width;
      const dy1 = door.y;
      const dy2 = door.y + door.height;

      let bestIoU = 0;
      let bestWall = null;

      walls.forEach((wall) => {

        const wx1 = wall.x;
        const wx2 = wall.x + wall.width;
        const wy1 = wall.y;
        const wy2 = wall.y + wall.height;

        const ix1 = Math.max(dx1, wx1);
        const ix2 = Math.min(dx2, wx2);
        const iy1 = Math.max(dy1, wy1);
        const iy2 = Math.min(dy2, wy2);
        const iw = Math.max(0, ix2 - ix1);
        const ih = Math.max(0, iy2 - iy1);
        const intersectionArea = iw * ih;

        const unionArea = door.width * door.height + wall.width * wall.height - intersectionArea;

        const iou = intersectionArea / unionArea;

        if (iou > bestIoU) {
          bestIoU = iou;
          bestWall = wall;
        }
      });

      if (bestWall) {
        const wallIsHorizontal = bestWall.width >= bestWall.height;
        const adjustedDoor = { ...door };

        if (wallIsHorizontal) {
          // Căn lại theo trục OY
          adjustedDoor.y = bestWall.y; // bám mép
          adjustedDoor.height = bestWall.height; // dày khít với tường
        } else {
          // Căn lại theo trục OX
          adjustedDoor.x = bestWall.x;
          adjustedDoor.width = bestWall.width;
        }

        adjustedDoors.push(adjustedDoor);
      }
    });

    return adjustedDoors;
  }

  async function updateDataHouse() {
    const predictions = detectedRes?.predictions.filter(item => {
      item.x = Math.ceil(item.x * unitPixelToThree);
      item.y = Math.ceil(item.y * unitPixelToThree);
      item.width = Math.ceil(item.width * unitPixelToThree);
      item.height = Math.ceil(item.height * unitPixelToThree);
      return item.confidence != null && item.confidence >= confidenceThreshold / 100
    })
    console.log("predictions", predictions)
    let predictionDoor = [];
    let predictWall = [];
    let minX = 0, minY = 0;
    let maxX = -0, maxY = -0;
    if (predictions) {
      const predictions_tem = predictions.map(p => {
        const x_start = p.x - p.width / 2;
        const y_start = p.y - p.height / 2;
        let dataT = {
          ...p,
          x: x_start,
          y: y_start,
        };
        if (dataT.class == 'door' || dataT.class == 'window') {
          predictionDoor.push(dataT)
        }
        if (dataT.class == 'wall') {
          predictWall.push(dataT)
        }
        const x1 = dataT.x;
        const x2 = dataT.x + dataT.width;
        const y1 = dataT.y;
        const y2 = dataT.y + dataT.height;

        if (x1 < minX) minX = x1;
        if (x2 > maxX) maxX = x2;
        if (y1 < minY) minY = y1;
        if (y2 > maxY) maxY = y2;

        return dataT
      });
      setFloorStore({
        minX: minX,
        maxX: maxX,
        minZ: minY,
        maxZ: maxY,
      });
      const kq1 = adjustDoorsToFitWalls(predictionDoor, predictWall);

      const gridSize = detectedRes?.gridSize

      setdoorStoreV2(kq1)
      // setdoorStoreV2(predictionDoor)
      setWallStoreV2(predictWall);
      setGridSize(gridSize);
    }
  }
  async function detectWallDoor() {
    const file = base64ImgDetect.file;
    const modelName = modelSelected
    if (!modelName || !file) return
    let versionModel = 1;
    if (modelName == 'wall-detection-xi9ox') {
      versionModel = 2
    }
    if (modelName == 'floor-plan-walls') {
      versionModel = 5
    }
    if (modelName == 'wall-window-door-detection-zltye') {
      versionModel = 3
    }
    if (modelName == 'floor-plan-walls-wlx1j') {
      versionModel = 2
    }


    try {
      const formData = new FormData();
      formData.append('image', file); // 'image' là tên field backend mong đợi
      formData.append('modelVersion', versionModel); // 'image' là tên field backend mong đợi
      formData.append('modelName', modelName); // 'image' là tên field backend mong đợi
      formData.append('confidenceThreshold', confidenceThreshold); // 'image' là tên field backend mong đợi
      formData.append('overlapThreshold', overlapThreshold); // 'image' là tên field backend mong đợi
      const response = await fetch('http://127.0.0.1:8000/detect-wall-door', {
        method: 'POST',
        body: formData,
      });
      const responseFM = await response.json();
      if (responseFM && responseFM.data) {
        setdetectedRes(responseFM.data)
      }
    } catch { }

  }
  function sapxepdovatngaunhien() {
    const gridSize = [200, 200];
    const objects = Object.values(dovatsapxep.current);
    const spacing = 5;
    const floorY = 2;
    arrangeObjectsByBoundingBox({
      gridSize,
      objects,
      world: worldCannonRef.current,
      scene: sceneRef.current,
    });
    console.log("sortingManager=", sortingManager);
  }
  return (
    <>
      <div
        style={{
          width: "100vw",
          height: "100vh",
        }}
      >
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
          <div>
            <FormControlLabel
              control={
                <Switch
                  checked={showFormDetect}
                  onChange={(e) => setshowFormDetect(e.target.checked)}
                />
              }
              label="Show From Detect:"
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
            <Button
              className="!ml-2"
              onClick={addDoor}
              size="small"
              variant="contained"
            >
              Add Door
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
          <div>camera
            <Button onClick={captureScene} className="ml-4" variant="contained" size="small">Captrue</Button>
          </div>
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
          <div>
            Mouse 3D Position: {mousePos3D.x.toFixed(2)},{" "}
            {mousePos3D.y.toFixed(2)}, {mousePos3D.z.toFixed(2)}{" "}
          </div>
          <div className="flex items-center">
            {" "}
            <FormControlLabel
              control={
                <Switch
                  checked={splitGroup}
                  onChange={(e) => setsplitGroup(e.target.checked)}
                />
              }
              label="Split Group: "
              labelPlacement="start"
            />
            <div style={{ marginLeft: "20px" }}>{renderPositionInputs()}</div>
          </div>
          <Button onClick={dropRandomObject}>Thả ngẫu nhiên vật</Button>
          <Button onClick={dichuyengaunhien}>Di chuyen ngau nhien</Button>
          <Button onClick={sapxepdovatngaunhien}>
            Sắp xếp đồ vật ngẫu nhiên
          </Button>
        </div>
        <div ref={containerRef} style={{ width: "100%", height: "100%" }} />
        <div id="cameraView" style={{ width: '250px', height: '250px', position: 'fixed', bottom: '10px', right: '10px' }}>
          <div ref={containerViewRef}></div>
        </div>
        <div id="miniView" style={{ width: '250px', height: '250px', position: 'fixed', bottom: '10px', right: '260px' }}>
          <div ref={miniViewRef}></div>
        </div>
      </div>
      {showFormDetect ? (
        <div className="fixed top-[150px] right-[10px] border p-4">
          <div>
            <Button variant="contained" onClick={() => { refselectImgDetect.current?.click() }}>Chọn Ảnh</Button>
            <input className="hidden" type="file" ref={refselectImgDetect} onInput={handleSelectImgDetect} />
            <FormControl fullWidth className="ml-2 max-w-[150px]" size="small">
              <InputLabel id="demo-simple-select-label">Model</InputLabel>
              <Select
                labelId="demo-simple-select-label"
                id="demo-simple-select"
                value={modelSelected}
                label="Model"
                onChange={(e) => { setmodelSelected(e.target.value) }}
              >
                <MenuItem value=''></MenuItem>
                {modelNameYolo.map((name) => (
                  <MenuItem key={name} value={name}>
                    {name}
                  </MenuItem>
                ))}
                {/* <MenuItem value='wall-detection-xi9ox'>wall-detection-xi9ox</MenuItem>
              <MenuItem value='walldetector2'>walldetector2</MenuItem>
              <MenuItem value='wall-window-door-detection'>wall-window-door-detection</MenuItem>
              <MenuItem value='test-nsycv'>test-nsycv</MenuItem>
              <MenuItem value='segmentation-wall-door-window-yeaua'>segmentation-wall-door-window-yeaua</MenuItem> */}

              </Select>
            </FormControl>
            <Button variant="contained" onClick={detectWallDoor}>Detection</Button>
            <Button variant="contained" onClick={updateDataHouse}>Update House</Button>
          </div>
          <div className="flex items-start justify-between">
            <div className="predict-img min-w-[500px] h-[500px] border mr-4 p-2">
              {/* <img src={base64ImgDetect?.imgbase64} /> */}
              <canvas ref={canvasbase64ImgDetect} width="500" height="500" className="" />
            </div>
            <div className="predict-container-1 border  p-2">
              <div className="predict-container-param1">
                <label>Confidence Threshold:</label> <br />
                <Slider
                  valueLabelDisplay="on"
                  aria-label="Temperature"
                  defaultValue={30}
                  value={confidenceThreshold}
                  onChange={(e, newVal) => { setconfidenceThreshold(newVal) }}
                  // getAriaValueText={valuetext}
                  color="secondary"
                />
              </div>
              <div className="predict-container-param2">
                <label>Overlap Threshold:</label> <br />
                <Slider
                  valueLabelDisplay="on"
                  aria-label="Temperature"
                  defaultValue={30}
                  value={overlapThreshold}
                  onChange={(e, newVal) => { setoverlapThreshold(newVal) }}
                  // getAriaValueText={valuetext}
                  color="secondary"
                />
              </div>
              <div>
                <FormControlLabel
                  control={<Checkbox checked={showImgDetect}
                    onChange={(e) => setshowImgDetect(e.target.checked)} />}
                  label="Show Image:"
                  labelPlacement="start" // ← Label nằm bên trái
                />
              </div>
              <FormControl fullWidth className="ml-2 max-w-[150px]" size="small">
                <InputLabel id="demo-simple-select-label">Mode show</InputLabel>
                <Select
                  labelId="demo-simple-select-label"
                  id="demo-simple-select"
                  value={modeShowCanvasDetect}
                  label="Model"
                  onChange={(e) => { setmodeShowCanvasDetect(e.target.value) }}
                >
                  <MenuItem value='Draw Confidence'>Draw Confidence</MenuItem>
                  <MenuItem value='Draw Labels'>Draw Labels</MenuItem>
                  <MenuItem value='Draw Boxes'>Draw Boxes</MenuItem>
                  <MenuItem value='Censor Predictions'>Censor Predictions</MenuItem>

                </Select>
              </FormControl>


              <div className="predict-container-response mt-4">
                <TextareaAutosize
                  className="!boder p-2"
                  aria-label="minimum height"
                  minRows={5}
                  maxRows={12}
                  placeholder=""
                  value={detectedRes && detectedRes.predictions ? JSON.stringify(detectedRes?.predictions) : ''}
                  style={{
                    maxWidth: 200,
                    border: '1px solid #ccc',
                    borderRadius: '4px',
                    padding: '8px',
                    outline: 'none',
                    fontFamily: 'inherit',
                    fontSize: '14px',
                    whiteSpace: 'pre-wrap', // giữ định dạng xuống dòng
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      ) : ''}
    </>
  );
});
export default initFunc;
