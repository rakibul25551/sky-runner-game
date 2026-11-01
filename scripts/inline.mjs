// Builds ONE self-contained file (JS + CSS inlined) that opens by double-click, no server needed.
import fs from 'node:fs'
import path from 'node:path'
const dist = 'dist', assets = path.join(dist, 'assets')
const js = fs.readdirSync(assets).find((f) => f.endsWith('.js'))
const css = fs.readdirSync(assets).find((f) => f.endsWith('.css'))
let html = fs.readFileSync(path.join(dist, 'index.html'), 'utf8')
const jsCode = fs.readFileSync(path.join(assets, js), 'utf8').replace(/<\/script/gi, '<\\/script')
const cssCode = fs.readFileSync(path.join(assets, css), 'utf8')
html = html
  .replace(/<script type="module"[^>]*src="[^"]*"[^>]*><\/script>/, '')
  .replace(/<link rel="stylesheet"[^>]*>/, '')
  .replace('</head>', () => `<style>${cssCode}</style></head>`)
  .replace('</body>', () => `<script type="module">${jsCode}</script></body>`)
fs.mkdirSync('play', { recursive: true })
fs.writeFileSync('play/index.html', html)
console.log('play/index.html written (' + Math.round(html.length / 1024) + ' KB)')
