import * as THREE from "three";
export function watchVector3Safe(vec3, typeName, callback) {
  const originalSet = vec3.set.bind(vec3);
  const originalCopy = vec3.copy.bind(vec3);

  vec3.set = function (x, y, z) {
    const changed = x !== this.x || y !== this.y || z !== this.z;
    const result = originalSet(x, y, z);
    if (changed) callback(typeName, "set", this.clone());
    return result;
  };

  vec3.copy = function (v) {
    const changed = v.x !== this.x || v.y !== this.y || v.z !== this.z;
    const result = originalCopy(v);
    if (changed) callback(typeName, "copy", this.clone());
    return result;
  };
}

export function watchEulerSafe(euler, typeName, callback) {
  const oldCallback = euler._onChangeCallback?.bind(euler);

  euler._onChange(() => {
    if (oldCallback) oldCallback(); // giữ cập nhật quaternion
    callback(typeName, "rotation", euler.clone()); // gọi callback người dùng
  });
}

export default class CustomMesh extends THREE.Mesh {
  constructor(geometry, material) {
    super(geometry, material);
    this._initWatchers();
  }

  _initWatchers() {
    watchVector3Safe(this.position, "position", (...args) =>
      this.onTransformChange(...args)
    );

    watchVector3Safe(this.scale, "scale", (...args) =>
      this.onTransformChange(...args)
    );

    watchEulerSafe(this.rotation, "rotation", (...args) =>
      this.onTransformChange(...args)
    );

    watchEulerSafe(this.quaternion, "quaternion", (...args) =>
      this.onTransformChange(...args)
    );
  }

  onTransformChange(type, axis, value) {}
}
