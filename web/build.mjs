/**
 * 打包 web：esbuild 单文件 app.js（iife + css 内联 + __VERSION__）
 * 复用 focus-companion 的 esbuild（本仓库不装依赖），没有则回退 npx。
 */
import { readFileSync, mkdirSync, copyFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here);
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const version = pkg.version;

const FALLBACK = 'C:/Users/admin/Desktop/roche-新/focus-companion/node_modules/esbuild/lib/main.js';

async function loadEsbuild() {
  try {
    return await import('esbuild');
  } catch (err) {
    if (existsSync(FALLBACK)) {
      console.log('使用 focus-companion 的 esbuild');
      return await import(pathToFileURL(FALLBACK).href);
    }
    throw new Error('找不到 esbuild：请在 web/ 下 npm i -D esbuild，或保留本机 fallback 路径');
  }
}

const esbuild = await loadEsbuild();

mkdirSync(join(root, 'dist'), { recursive: true });

const result = await esbuild.build({
  entryPoints: [join(root, 'src/main.js')],
  bundle: true,
  format: 'iife',
  target: 'es2020',
  outfile: join(root, 'dist/app.js'),
  charset: 'utf8',
  minify: false,
  sourcemap: false,
  loader: { '.css': 'text' },
  define: { __VERSION__: JSON.stringify(version) },
  logLevel: 'warning'
});

if (result.errors.length) {
  console.error(result.errors);
  process.exit(1);
}

/* 静态资源：scenes 快照（存在才拷） */
function copyDir(from, to) {
  if (!existsSync(from)) return 0;
  mkdirSync(to, { recursive: true });
  let n = 0;
  for (const f of readdirSync(from)) {
    const src = join(from, f);
    const dst = join(to, f);
    if (statSync(src).isDirectory()) n += copyDir(src, dst);
    else { copyFileSync(src, dst); n += 1; }
  }
  return n;
}

copyFileSync(join(root, 'index.html'), join(root, 'dist/index.html'));
const assets = copyDir(join(root, 'assets'), join(root, 'dist/assets'));

const size = statSync(join(root, 'dist/app.js')).size;
console.log('built dist/app.js  ' + (size / 1024).toFixed(1) + ' KB  v' + version + (assets ? '  (+' + assets + ' assets)' : '  (无 scenes 快照，预览将走手写场景)'));
