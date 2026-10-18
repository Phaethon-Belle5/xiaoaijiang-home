/* ═══════════════════════════════════════════════════════════════════
   DomeGallery —— 穹顶照片画廊
   整段搬自参考项目 Your-China-Travel（其原注释：「React Bits DomeGallery
   JS-CSS 的原生单页适配」）。逻辑、结构、参数名一律未改，只把它从内联脚本
   切出来单独成文件，方便直接 <script> 引入。
   用法： new DomeGallery(容器元素, { images:['https://…', …], segments, minRadius, grayscale, overlayBlurColor })
   ═══════════════════════════════════════════════════════════════════ */
const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
  const wrapAngle = deg => {
    const angle = (((deg + 180) % 360) + 360) % 360;
    return angle - 180;
  };

  function buildItems(images, segments) {
    const xColumns = Array.from({ length: segments }, (_, index) => -37 + index * 2);
    const evenRows = [-4, -2, 0, 2, 4];
    const oddRows = [-3, -1, 1, 3, 5];
    const coordinates = xColumns.flatMap((x, column) =>
      (column % 2 === 0 ? evenRows : oddRows).map(y => ({ x, y, sizeX: 2, sizeY: 2 }))
    );
    if (!images.length) return [];
    const normalized = images.map(image => typeof image === 'string'
      ? { src: image, alt: '' }
      : { src: image.src || '', alt: image.alt || '' });
    const used = Array.from({ length: coordinates.length }, (_, index) => normalized[index % normalized.length]);
    for (let index = 1; index < used.length; index++) {
      if (used[index].src !== used[index - 1].src) continue;
      const replacement = used.findIndex((image, nextIndex) => nextIndex > index && image.src !== used[index].src);
      if (replacement > -1) [used[index], used[replacement]] = [used[replacement], used[index]];
    }
    return coordinates.map((coordinate, index) => ({ ...coordinate, ...used[index] }));
  }

class DomeGallery {
    constructor(container, options) {
      if (!container) throw new Error('DomeGallery requires a container element.');
      this.container = container;
      this.options = Object.assign({
        images: [], fit: .5, fitBasis: 'auto', minRadius: 600, maxRadius: Infinity,
        padFactor: .18, overlayBlurColor: '#08182a', maxVerticalRotationDeg: 5,
        dragSensitivity: 20, enlargeTransitionMs: 300, segments: 24, segmentsY: 24,
        dragDampening: .72, openedImageWidth: 460, openedImageHeight: 460,
        imageBorderRadius: '12px', openedImageBorderRadius: '24px', grayscale: true,
        autoRotateSpeed: 1.8
      }, options || {});
      this.rotation = { x: 0, y: 0 };
      this.startRotation = { x: 0, y: 0 };
      this.pointerStart = null;
      this.pointerTile = null;
      this.lastPointer = null;
      this.dragging = false;
      this.moved = false;
      this.inertiaFrame = 0;
      this.dragFrame = 0;
      this.autoRotateFrame = 0;
      this.lastAutoRotateAt = performance.now();
      this.openTile = null;
      this.enlarged = null;
      this.reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      this.onPointerDown = this.onPointerDown.bind(this);
      this.onPointerMove = this.onPointerMove.bind(this);
      this.onPointerUp = this.onPointerUp.bind(this);
      this.onKeyDown = this.onKeyDown.bind(this);
      this.render();
      this.observe();
      this.startAutoRotate();
    }

    render() {
      const items = buildItems(this.options.images, this.options.segments);
      this.container.className = (this.container.className + ' dg-root').trim();
      this.container.style.setProperty('--dg-segments-x', this.options.segments);
      this.container.style.setProperty('--dg-segments-y', this.options.segmentsY);
      this.container.style.setProperty('--dg-surface', this.options.overlayBlurColor);
      this.container.style.setProperty('--dg-tile-radius', this.options.imageBorderRadius);
      this.container.style.setProperty('--dg-enlarge-radius', this.options.openedImageBorderRadius);
      this.container.style.setProperty('--dg-image-filter', this.options.grayscale ? 'grayscale(1)' : 'none');
      this.container.innerHTML = '<main class="dg-main"><div class="dg-stage"><div class="dg-sphere">' +
        items.map(item => '<div class="dg-item" data-src="' + this.escapeAttribute(item.src) + '" style="--dg-offset-x:' + item.x + ';--dg-offset-y:' + item.y + ';--dg-size-x:' + item.sizeX + ';--dg-size-y:' + item.sizeY + '"><div class="dg-image" role="button" tabindex="0" aria-label="' + this.escapeAttribute(item.alt || '查看照片') + '"><img src="' + this.escapeAttribute(item.src) + '" alt="' + this.escapeAttribute(item.alt) + '" draggable="false"></div></div>').join('') +
        '</div></div><div class="dg-overlay"></div><div class="dg-overlay-blur"></div><div class="dg-edge-fade top"></div><div class="dg-edge-fade bottom"></div><div class="dg-viewer"><div class="dg-scrim"></div></div></main>';
      this.main = this.container.querySelector('.dg-main');
      this.sphere = this.container.querySelector('.dg-sphere');
      this.viewer = this.container.querySelector('.dg-viewer');
      this.scrim = this.container.querySelector('.dg-scrim');
      this.main.addEventListener('pointerdown', this.onPointerDown);
      this.main.addEventListener('pointermove', this.onPointerMove);
      this.main.addEventListener('pointerup', this.onPointerUp);
      this.main.addEventListener('pointercancel', this.onPointerUp);
      this.main.addEventListener('keydown', this.onKeyDown);
      this.scrim.addEventListener('click', () => this.close());
      this.applyTransform();
    }

    escapeAttribute(value) {
      return String(value || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    observe() {
      this.resizeObserver = new ResizeObserver(entries => {
        const rect = entries[0].contentRect;
        const width = Math.max(1, rect.width);
        const height = Math.max(1, rect.height);
        const minDimension = Math.min(width, height);
        const maxDimension = Math.max(width, height);
        let basis = minDimension;
        if (this.options.fitBasis === 'max') basis = maxDimension;
        else if (this.options.fitBasis === 'width') basis = width;
        else if (this.options.fitBasis === 'height') basis = height;
        else if (this.options.fitBasis === 'auto') basis = width / height >= 1.3 ? width : minDimension;
        let radius = Math.min(basis * this.options.fit, height * 1.35);
        radius = clamp(radius, this.options.minRadius, this.options.maxRadius);
        this.container.style.setProperty('--dg-radius', Math.round(radius) + 'px');
        this.container.style.setProperty('--dg-viewer-pad', Math.max(12, Math.round(minDimension * this.options.padFactor)) + 'px');
        this.applyTransform();
      });
      this.resizeObserver.observe(this.container);
      document.addEventListener('keydown', this.onKeyDown, true);
    }

    applyTransform() {
      if (!this.sphere) return;
      this.sphere.style.transform = 'translateZ(calc(var(--dg-radius) * -1)) rotateX(' + this.rotation.x + 'deg) rotateY(' + this.rotation.y + 'deg)';
    }

    scheduleDragTransform() {
      if (this.dragFrame) return;
      this.dragFrame = requestAnimationFrame(() => {
        this.dragFrame = 0;
        this.applyTransform();
      });
    }

    stopInertia() {
      if (this.inertiaFrame) cancelAnimationFrame(this.inertiaFrame);
      this.inertiaFrame = 0;
    }

    startAutoRotate() {
      if (this.reduceMotion || !this.options.autoRotateSpeed) return;
      const step = now => {
        const elapsed = Math.min(50, Math.max(0, now - this.lastAutoRotateAt));
        this.lastAutoRotateAt = now;
        if (!this.dragging && !this.openTile && !this.inertiaFrame && !document.hidden) {
          this.rotation.y = wrapAngle(this.rotation.y + this.options.autoRotateSpeed * elapsed / 1000);
          this.applyTransform();
        }
        this.autoRotateFrame = requestAnimationFrame(step);
      };
      this.autoRotateFrame = requestAnimationFrame(step);
    }

    onPointerDown(event) {
      if (this.openTile || event.button > 0) return;
      this.stopInertia();
      this.dragging = true;
      this.moved = false;
      this.startRotation = { ...this.rotation };
      this.pointerStart = { x: event.clientX, y: event.clientY };
      this.pointerTile = event.target.closest?.('.dg-image') || null;
      this.lastPointer = { x: event.clientX, y: event.clientY, time: performance.now(), vx: 0, vy: 0 };
      this.main.setPointerCapture?.(event.pointerId);
    }

    onPointerMove(event) {
      if (!this.dragging || !this.pointerStart || this.openTile) return;
      const dx = event.clientX - this.pointerStart.x;
      const dy = event.clientY - this.pointerStart.y;
      if (dx * dx + dy * dy > 16) this.moved = true;
      this.rotation.x = clamp(this.startRotation.x - dy / this.options.dragSensitivity, -this.options.maxVerticalRotationDeg, this.options.maxVerticalRotationDeg);
      this.rotation.y = wrapAngle(this.startRotation.y + dx / this.options.dragSensitivity);
      const now = performance.now();
      const elapsed = Math.max(8, now - this.lastPointer.time);
      this.lastPointer = { x: event.clientX, y: event.clientY, time: now, vx: (event.clientX - this.lastPointer.x) / elapsed, vy: (event.clientY - this.lastPointer.y) / elapsed };
      this.scheduleDragTransform();
    }

    onPointerUp(event) {
      if (!this.dragging) return;
      this.dragging = false;
      const wasMoved = this.moved;
      if (this.dragFrame) {
        cancelAnimationFrame(this.dragFrame);
        this.dragFrame = 0;
        this.applyTransform();
      }
      this.main.releasePointerCapture?.(event.pointerId);
      const tile = this.pointerTile;
      if (event.type !== 'pointercancel' && !wasMoved && tile) this.open(tile);
      else if (!this.reduceMotion && this.lastPointer) this.startInertia(this.lastPointer.vx, this.lastPointer.vy);
      this.pointerStart = null;
      this.pointerTile = null;
      this.moved = false;
    }

    startInertia(vx, vy) {
      let speedX = clamp(vx, -1.4, 1.4) * 80;
      let speedY = clamp(vy, -1.4, 1.4) * 80;
      let frames = 0;
      const dampening = clamp(this.options.dragDampening, 0, 1);
      const friction = .94 + .055 * dampening;
      const step = () => {
        speedX *= friction;
        speedY *= friction;
        if (++frames > 280 || Math.abs(speedX) + Math.abs(speedY) < .025) {
          this.inertiaFrame = 0;
          return;
        }
        this.rotation.x = clamp(this.rotation.x - speedY / 200, -this.options.maxVerticalRotationDeg, this.options.maxVerticalRotationDeg);
        this.rotation.y = wrapAngle(this.rotation.y + speedX / 200);
        this.applyTransform();
        this.inertiaFrame = requestAnimationFrame(step);
      };
      this.inertiaFrame = requestAnimationFrame(step);
    }

    onKeyDown(event) {
      if (event.key === 'Escape' && this.openTile) {
        event.preventDefault();
        event.stopImmediatePropagation();
        this.close();
        return;
      }
      if ((event.key === 'Enter' || event.key === ' ') && event.target.classList?.contains('dg-image')) {
        event.preventDefault();
        this.open(event.target);
      }
    }

    open(tile) {
      if (this.openTile || this.moved) return;
      this.openTile = tile;
      const tileRect = tile.getBoundingClientRect();
      const mainRect = this.main.getBoundingClientRect();
      const maxWidth = Math.max(220, mainRect.width - 48);
      const maxHeight = Math.max(220, mainRect.height - 48);
      const targetWidth = Math.min(this.options.openedImageWidth, maxWidth);
      const targetHeight = Math.min(this.options.openedImageHeight, maxHeight);
      const startLeft = tileRect.left - mainRect.left;
      const startTop = tileRect.top - mainRect.top;
      const targetLeft = (mainRect.width - targetWidth) / 2;
      const targetTop = (mainRect.height - targetHeight) / 2;
      const enlarged = document.createElement('div');
      enlarged.className = 'dg-enlarge';
      enlarged.style.cssText = 'left:' + startLeft + 'px;top:' + startTop + 'px;width:' + tileRect.width + 'px;height:' + tileRect.height + 'px;opacity:0;transition:left ' + this.options.enlargeTransitionMs + 'ms ease,top ' + this.options.enlargeTransitionMs + 'ms ease,width ' + this.options.enlargeTransitionMs + 'ms ease,height ' + this.options.enlargeTransitionMs + 'ms ease,opacity ' + this.options.enlargeTransitionMs + 'ms ease;';
      const image = document.createElement('img');
      image.src = tile.parentElement.dataset.src || tile.querySelector('img').src;
      image.alt = tile.querySelector('img').alt || '';
      enlarged.appendChild(image);
      this.viewer.appendChild(enlarged);
      this.enlarged = enlarged;
      tile.style.visibility = 'hidden';
      this.container.dataset.enlarging = 'true';
      requestAnimationFrame(() => {
        enlarged.style.left = targetLeft + 'px';
        enlarged.style.top = targetTop + 'px';
        enlarged.style.width = targetWidth + 'px';
        enlarged.style.height = targetHeight + 'px';
        enlarged.style.opacity = '1';
      });
    }

    close() {
      if (!this.openTile || !this.enlarged) return;
      const tile = this.openTile;
      const enlarged = this.enlarged;
      const tileRect = tile.getBoundingClientRect();
      const mainRect = this.main.getBoundingClientRect();
      this.container.removeAttribute('data-enlarging');
      enlarged.style.left = tileRect.left - mainRect.left + 'px';
      enlarged.style.top = tileRect.top - mainRect.top + 'px';
      enlarged.style.width = tileRect.width + 'px';
      enlarged.style.height = tileRect.height + 'px';
      enlarged.style.opacity = '0';
      const finish = () => {
        enlarged.remove();
        tile.style.visibility = '';
        this.enlarged = null;
        this.openTile = null;
      };
      if (this.reduceMotion) finish();
      else enlarged.addEventListener('transitionend', finish, { once: true });
    }

    destroy() {
      this.stopInertia();
      if (this.dragFrame) cancelAnimationFrame(this.dragFrame);
      this.dragFrame = 0;
      if (this.autoRotateFrame) cancelAnimationFrame(this.autoRotateFrame);
      this.autoRotateFrame = 0;
      this.resizeObserver?.disconnect();
      document.removeEventListener('keydown', this.onKeyDown, true);
      this.main?.removeEventListener('pointerdown', this.onPointerDown);
      this.main?.removeEventListener('pointermove', this.onPointerMove);
      this.main?.removeEventListener('pointerup', this.onPointerUp);
      this.main?.removeEventListener('pointercancel', this.onPointerUp);
      this.container.innerHTML = '';
      this.container.classList.remove('dg-root');
    }
  }

window.DomeGallery = DomeGallery;
