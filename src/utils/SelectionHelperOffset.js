import { SelectionHelper } from 'three/examples/jsm/interactive/SelectionHelper.js';

class SelectionHelperOffset extends SelectionHelper {
  /**
   * @param {WebGLRenderer|WebGPURenderer} renderer 
   * @param {string} cssClassName 
   * @param {(event: PointerEvent) => {x: number, y: number}} getMousePosFn - Hàm trả về tọa độ chuột đã tính offset trong container
   */
  constructor(renderer, cssClassName, getMousePosFn = null) {
    super(renderer, cssClassName);
    this.getMousePosFn = typeof getMousePosFn === 'function'
      ? getMousePosFn
      : (e) => ({ x: e.clientX, y: e.clientY });
  }

  _onSelectStart(event) {
    if (!this.enabled) return;

    const pos = this.getMousePosFn(event);

    this.element.style.display = 'none';
    this.renderer.domElement.parentElement.appendChild(this.element);
    const scrollLeft =
      window.pageXOffset || document.documentElement.scrollLeft;
    const scrollTop =
      window.pageYOffset || document.documentElement.scrollTop;

    console.log(`left=${pos.x + scrollLeft} top=${pos.y + scrollTop}`)
    this.element.style.left = (pos.x + scrollLeft) + 'px';
    this.element.style.top = (pos.y + scrollTop) + 'px';
    this.element.style.width = '0px';
    this.element.style.height = '0px';

    this._startPoint.x = pos.x;
    this._startPoint.y = pos.y;
  }

  _onSelectMove(event) {
    if (!this.enabled || !this.isDown) return;

    const pos = this.getMousePosFn(event);

    this.element.style.display = 'block';

    this._pointBottomRight.x = Math.max(this._startPoint.x, pos.x);
    this._pointBottomRight.y = Math.max(this._startPoint.y, pos.y);
    this._pointTopLeft.x = Math.min(this._startPoint.x, pos.x);
    this._pointTopLeft.y = Math.min(this._startPoint.y, pos.y);
    const scrollLeft =
      window.pageXOffset || document.documentElement.scrollLeft;
    const scrollTop =
      window.pageYOffset || document.documentElement.scrollTop;

    this.element.style.left = (this._pointTopLeft.x + scrollLeft) + 'px';
    this.element.style.top = (this._pointTopLeft.y + scrollTop) + 'px';
    this.element.style.width = (this._pointBottomRight.x - this._pointTopLeft.x) + 'px';
    this.element.style.height = (this._pointBottomRight.y - this._pointTopLeft.y) + 'px';
  }
}

export default SelectionHelperOffset;
