import * as THREE from 'three';
import { SelectionBox } from 'three/addons/interactive/SelectionBox.js';

class SelectionBoxExtended extends SelectionBox {
  constructor(camera, scene, deep = Number.MAX_VALUE) {
    super(camera, scene, deep);
  }

  // Ghi đè phương thức _searchChildInFrustum để dùng intersectsBox
  _searchChildInFrustum(frustum, object) {
    if (object.isMesh || object.isLine || object.isPoints) {
      if (object.geometry.boundingBox === null) {
        object.geometry.computeBoundingBox();
      }

      const box = object.geometry.boundingBox.clone();
      box.applyMatrix4(object.matrixWorld);

      if (frustum.intersectsBox(box)) {
        this.collection.push(object);
      }
    }

    for (let i = 0; i < object.children.length; i++) {
      this._searchChildInFrustum(frustum, object.children[i]);
    }
  }
}

export default SelectionBoxExtended;
