/** 图片处理：压缩成 dataURL（仅用于发给 AI 的消息图片，不进 CSS） */

const MAX_EDGE = 1024;
const MAX_BYTES = 300 * 1024;
const QUALITY = 0.8;

function readAsDataUrl(file) {
  return new Promise(function (resolve, reject) {
    const reader = new FileReader();
    reader.onload = function () { resolve(String(reader.result || '')); };
    reader.onerror = function () { reject(new Error('读取图片失败')); };
    reader.readAsDataURL(file);
  });
}

function loadImage(src) {
  return new Promise(function (resolve, reject) {
    const img = new Image();
    img.onload = function () { resolve(img); };
    img.onerror = function () { reject(new Error('图片解码失败')); };
    img.src = src;
  });
}

/**
 * @param {File|Blob} file
 * @returns {Promise<{dataUrl:string,width:number,height:number,bytes:number}>}
 */
export async function compressImage(file) {
  const raw = await readAsDataUrl(file);
  const img = await loadImage(raw);
  let w = img.naturalWidth || img.width;
  let h = img.naturalHeight || img.height;
  const scale = Math.min(1, MAX_EDGE / Math.max(w, h));
  w = Math.round(w * scale);
  h = Math.round(h * scale);

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, w, h);

  let dataUrl = canvas.toDataURL('image/jpeg', QUALITY);
  let bytes = Math.round((dataUrl.length - dataUrl.indexOf(',') - 1) * 0.75);

  if (bytes > MAX_BYTES) {
    dataUrl = canvas.toDataURL('image/jpeg', 0.55);
    bytes = Math.round((dataUrl.length - dataUrl.indexOf(',') - 1) * 0.75);
  }

  return { dataUrl: dataUrl, width: w, height: h, bytes: bytes };
}

/** 从图片里取平均色（跨域会失败，调用方要兜底） */
export function extractColors(src) {
  return new Promise(function (resolve, reject) {
    loadImage(src).then(function (img) {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 8;
        canvas.height = 8;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, 8, 8);
        const data = ctx.getImageData(0, 0, 8, 8).data;
        let r = 0, g = 0, b = 0, n = 0;
        const buckets = {};
        for (let i = 0; i < data.length; i += 4) {
          r += data[i]; g += data[i + 1]; b += data[i + 2]; n += 1;
          const key = [data[i] >> 5, data[i + 1] >> 5, data[i + 2] >> 5].join(',');
          buckets[key] = (buckets[key] || 0) + 1;
        }
        if (!n) throw new Error('没有像素');
        const main = { r: r / n, g: g / n, b: b / n };
        const hex = function (c) {
          const p = function (x) { const v = Math.max(0, Math.min(255, Math.round(x))); return v < 16 ? '0' + v.toString(16) : v.toString(16); };
          return '#' + p(c.r) + p(c.g) + p(c.b);
        };
        resolve({
          main: hex(main),
          sub: hex({ r: main.r * 0.7, g: main.g * 0.7, b: main.b * 0.7 })
        });
      } catch (err) {
        reject(new Error('跨域图片无法取色，请手动选色或换图床'));
      }
    }).catch(reject);
  });
}
