import * as THREE from "three";

function watchVector3(vec3, type, callback) {
  const originalSet = vec3.set.bind(vec3);

  vec3.set = function (x, y, z) {
    originalSet(x, y, z);
    callback(type, "x", vec3.x);
    callback(type, "y", vec3.y);
    callback(type, "z", vec3.z);
  };

  ["x", "y", "z"].forEach((axis) => {
    let value = vec3[axis];
    Object.defineProperty(vec3, axis, {
      get() {
        return value;
      },
      set(newVal) {
        if (newVal !== value) {
          value = newVal;
          callback(type, axis, newVal);
        }
      },
      configurable: true,
      enumerable: true,
    });
  });
}

export function watchEulerSafe(euler, typeName, callback) {
  const oldCallback = euler._onChangeCallback?.bind(euler);

  euler._onChange(() => {
    if (oldCallback) oldCallback(); // giữ cập nhật quaternion
    callback(typeName, "rotation", euler.clone()); // gọi callback người dùng
  });
}

export default class CustomGroup extends THREE.Group {
  constructor() {
    super();

    this._watchedObj = null;

    // Gán sẵn callback trống nếu chưa có
    this.onTransformChange = () => {};
    this._initWatchers();
  }

  _initWatchers() {
    this._watchedObj = this.userData.pivot || this;

    watchVector3(this._watchedObj.position, "position", (type, axis, val) => {
      this.onTransformChange(type, axis, val);
    });

    watchEulerSafe(this._watchedObj.rotation, "rotation", (type, axis, val) => {
      this.onTransformChange(type, axis, val);
    });
    watchEulerSafe(
      this._watchedObj.quaternion,
      "quaternion",
      (type, axis, val) => {
        this.onTransformChange(type, axis, val);
      }
    );

    watchVector3(this._watchedObj.scale, "scale", (type, axis, val) => {
      this.onTransformChange(type, axis, val);
    });
  }

  // Nếu bạn muốn có setter pivot thì có thể thêm:
  setPivot(pivotObj) {
    this.userData.pivot = pivotObj;
    this._watchedObj = pivotObj || this;
    this._initWatchers();
  }

  onTransformChange(type, axis, value) {
    // override khi dùng
  }
}
