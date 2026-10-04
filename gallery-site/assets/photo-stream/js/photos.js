// 每张照片在图集里的边长。128 时放大到屏幕约 300px 会明显发糊（用户反馈「照片太模糊」），
// 提到 256：像素变 4 倍；图集边长 = 256*4 = 1024，66 张照片共 5 个图层，
// RGBA 加 mipmap 约 27MB 显存，桌面和主流手机都承受得住。
export const LAYER = 256;
export const ATLAS_GRID = 4;

function decode(src) {
  // 关键：图床（img.231060101.xyz）已返回 Access-Control-Allow-Origin: *，
  // 但必须显式声明 crossOrigin，否则图片会"污染"canvas：
  //   · 下面算平均色的 getImageData 会抛 SecurityError
  //   · 更致命的是 WebGL 的 texSubImage3D 直接拒绝跨域纹理，整个照片流渲染不出来
  // 超时保护：有图片既不 load 也不 error 时，promise 会永远挂着，
  // 表现为"加载进度不动、无任何报错、应用永远不 ready"。超过 12 秒就放弃这张。
  return new Promise((res, rej) => {
    const img = new Image();
    // data: URL 自带同源属性，再声明 crossOrigin 反而可能让某些浏览器不触发 load
    if (!/^data:/i.test(String(src))) img.crossOrigin = 'anonymous';
    img.decoding = 'async';
    let done = false;
    const timer = setTimeout(() => { if (!done) { done = true; rej(new Error('decode timeout')); } }, 12000);
    img.onload = () => { if (!done) { done = true; clearTimeout(timer); res(img); } };
    img.onerror = () => { if (!done) { done = true; clearTimeout(timer); rej(new Error(`Could not load photo: ${String(src).slice(0, 50)}`)); } };
    img.src = src;
  });
}
export async function loadTextures(gl, photos, onProgress) {
  const limit = gl.getParameter(gl.MAX_ARRAY_TEXTURE_LAYERS);
  const perSheet = ATLAS_GRID * ATLAS_GRID, sheets = Math.ceil(photos.length / perSheet);
  if (sheets > limit) throw new Error('照片数量超过当前设备的纹理容量，请通过照片目录浏览原图。');
  const arrTex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D_ARRAY, arrTex);
  gl.texStorage3D(gl.TEXTURE_2D_ARRAY, 1 + Math.log2(LAYER*ATLAS_GRID), gl.RGBA8, LAYER*ATLAS_GRID, LAYER*ATLAS_GRID, sheets);
  const scratch = document.createElement('canvas'); scratch.width = scratch.height = LAYER;
  const ctx = scratch.getContext('2d');
  ctx.imageSmoothingQuality = 'high';
  const tiny = document.createElement('canvas'); tiny.width = tiny.height = 8;
  const tctx = tiny.getContext('2d', { willReadFrequently: true });
  let done = 0;
  const queue = photos.map((_, i) => i);
  const worker = async () => {
    while (queue.length) {
      const i = queue.shift();
      // 一张图解不开不能拖垮整个照片流：失败就画一块占位色，索引照旧占位
      let img = null;
      try { img = await decode(photos[i].src); }
      catch (e) { console.warn('[照片流] 跳过一张读不出的图：', String(photos[i].src).slice(0, 46), e && e.message); }
      ctx.clearRect(0, 0, LAYER, LAYER);
      if (img) {
        photos[i].aspect = img.naturalWidth / img.naturalHeight;
        ctx.drawImage(img, 0, 0, LAYER, LAYER); // stretched to the square layer; the stream restores the aspect
      } else {
        photos[i].aspect = photos[i].aspect || 1;   // 兜底用正方形，不要用 4/3：竖图配 4/3 会显得被横向拉长
        ctx.fillStyle = '#1b2233'; ctx.fillRect(0, 0, LAYER, LAYER);
      }
      tctx.drawImage(scratch, 0, 0, 8, 8);
      // 兜底：万一某张图仍因跨域被污染，不要让整个照片流挂掉，给个中性色继续
      let px; try { px = tctx.getImageData(0, 0, 8, 8).data; } catch (e) { px = null; }
      if (!px) { photos[i].avg = [0.82, 0.66, 0.27]; }
      else { let r = 0, g = 0, b = 0;
        for (let j = 0; j < px.length; j += 4) { r += px[j]; g += px[j + 1]; b += px[j + 2]; }
        photos[i].avg = [r / 64 / 255, g / 64 / 255, b / 64 / 255];
      }
      gl.bindTexture(gl.TEXTURE_2D_ARRAY, arrTex);
      const tile = i % perSheet;
      gl.texSubImage3D(gl.TEXTURE_2D_ARRAY, 0, (tile % ATLAS_GRID)*LAYER, Math.floor(tile/ATLAS_GRID)*LAYER, Math.floor(i/perSheet), LAYER, LAYER, 1, gl.RGBA, gl.UNSIGNED_BYTE, scratch);
      onProgress(++done / photos.length);
    }
  };
  await Promise.all([worker(), worker(), worker(), worker()]);
  gl.bindTexture(gl.TEXTURE_2D_ARRAY, arrTex);
  gl.generateMipmap(gl.TEXTURE_2D_ARRAY);
  gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
  gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return arrTex;
}
