import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

// ── RENDERER ─────────────────────────────────────────────────
const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setPixelRatio(window.devicePixelRatio)
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.outputEncoding = THREE.sRGBEncoding
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.toneMappingExposure = 1.2
renderer.shadowMap.enabled = true
document.body.appendChild(renderer.domElement)

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x080808)
scene.fog = new THREE.FogExp2(0x080808, 0.04)

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.01, 100)
camera.position.set(0, 1.5, 5)

// ── LIGHTS ───────────────────────────────────────────────────
scene.add(new THREE.AmbientLight(0xffffff, 0.5))

const key = new THREE.DirectionalLight(0xffffff, 1.5)
key.position.set(4, 8, 6)
key.castShadow = true
scene.add(key)

const fill = new THREE.DirectionalLight(0x8899ff, 0.4)
fill.position.set(-4, 2, -4)
scene.add(fill)

const accent = new THREE.PointLight(0x00f0ff, 2, 12)
accent.position.set(0, 3, 2)
scene.add(accent)

const rim = new THREE.DirectionalLight(0x00f0ff, 0.25)
rim.position.set(0, 4, -6)
scene.add(rim)

// Ground plane
const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(20, 20),
  new THREE.MeshStandardMaterial({ color: 0x0a0a0a, roughness: 1 })
)
ground.rotation.x = -Math.PI / 2
ground.position.y = -1.5
ground.receiveShadow = true
scene.add(ground)

// Grid helper
const grid = new THREE.GridHelper(20, 20, 0x111111, 0x111111)
grid.position.y = -1.49
scene.add(grid)

// ── ORBIT CONTROLS (manual) ──────────────────────────────────
let isDown = false, btn = 0
let last = { x: 0, y: 0 }
let sph = { theta: 0, phi: 1.1, r: 5 }
let target = new THREE.Vector3(0, 0, 0)

function updateCam() {
  camera.position.set(
    target.x + sph.r * Math.sin(sph.phi) * Math.sin(sph.theta),
    target.y + sph.r * Math.cos(sph.phi),
    target.z + sph.r * Math.sin(sph.phi) * Math.cos(sph.theta)
  )
  camera.lookAt(target)
}
updateCam()

renderer.domElement.addEventListener('mousedown', e => { isDown = true; btn = e.button; last = { x: e.clientX, y: e.clientY } })
window.addEventListener('mouseup', () => isDown = false)
window.addEventListener('mousemove', e => {
  if (!isDown) return
  const dx = e.clientX - last.x
  const dy = e.clientY - last.y
  if (btn === 0) {
    sph.theta -= dx * 0.008
    sph.phi = Math.max(0.05, Math.min(Math.PI - 0.05, sph.phi + dy * 0.008))
  } else {
    const right = new THREE.Vector3()
    right.crossVectors(new THREE.Vector3().subVectors(camera.position, target).normalize(), camera.up).normalize()
    target.addScaledVector(right, -dx * 0.003 * sph.r * 0.2)
    target.addScaledVector(camera.up, dy * 0.003 * sph.r * 0.2)
  }
  last = { x: e.clientX, y: e.clientY }
  updateCam()
})
renderer.domElement.addEventListener('wheel', e => {
  sph.r = Math.max(0.5, Math.min(20, sph.r + e.deltaY * 0.008))
  updateCam()
})
renderer.domElement.addEventListener('contextmenu', e => e.preventDefault())

// ── LOAD MODEL ───────────────────────────────────────────────
const bar = document.getElementById('bar')
const loadText = document.getElementById('load-text')

const loader = new GLTFLoader()
loader.load(
  '/buat_porto.glb',
  (gltf) => {
    bar.style.width = '80%'
    loadText.textContent = 'setting up scene...'

    const model = gltf.scene

    // Auto-center + scale
    const box = new THREE.Box3().setFromObject(model)
    const center = box.getCenter(new THREE.Vector3())
    const size = box.getSize(new THREE.Vector3())
    const maxDim = Math.max(size.x, size.y, size.z)
    const scale = 2.5 / maxDim
    model.scale.setScalar(scale)
    model.position.copy(center.multiplyScalar(-scale))
    // Lift to ground
    const box2 = new THREE.Box3().setFromObject(model)
    model.position.y -= box2.min.y - (-1.5)

    model.traverse(c => {
      if (c.isMesh) { c.castShadow = true; c.receiveShadow = true }
    })
    scene.add(model)
    window._model = model

    // ── ANIMATIONS ───────────────────────────────────────────
    const animData = []
    const animList = document.getElementById('anim-list')
    animList.innerHTML = ''

    gltf.animations.forEach((clip, i) => {
      const mixer = new THREE.AnimationMixer(model)
      const action = mixer.clipAction(clip)
      action.play()
      action.paused = true
      action.time = 0
      mixer.update(0)
      animData.push({ mixer, action, clip })

      const btn = document.createElement('button')
      btn.className = 'anim-btn'
      const cleanName = clip.name
        .replace('Action', '')
        .replace(/[^\x00-\x7F]/g, '?')
        .trim()
        .substring(0, 22)
      btn.textContent = `▶  ${cleanName}  (${clip.duration.toFixed(2)}s)`
      btn.onclick = () => {
        document.querySelectorAll('.anim-btn').forEach(b => b.classList.remove('active'))
        btn.classList.add('active')
        window._activeAnim = i
        document.getElementById('anim-scrub').value = 0
        document.getElementById('time-display').textContent = `t = 0.000s / ${clip.duration.toFixed(3)}s`
      }
      animList.appendChild(btn)
    })

    window._animData = animData
    window._activeAnim = null

    // Scrub
    document.getElementById('anim-scrub').addEventListener('input', (e) => {
      const idx = window._activeAnim
      if (idx === null || idx === undefined) return
      const { mixer, action, clip } = animData[idx]
      const t = parseFloat(e.target.value) * clip.duration
      action.time = t
      mixer.update(0)
      document.getElementById('time-display').textContent = `t = ${t.toFixed(3)}s / ${clip.duration.toFixed(3)}s`
    })

    // ── NODE LIST ─────────────────────────────────────────────
    const nodeList = document.getElementById('node-list')
    nodeList.innerHTML = ''
    const seen = new Set()
    model.traverse(obj => {
      if (!obj.name || seen.has(obj.name)) return
      seen.add(obj.name)
      const el = document.createElement('div')
      const clean = obj.name.replace(/[^\x00-\x7F]/g, '?').substring(0, 26)
      if (obj.isMesh) {
        el.className = 'node-mesh'; el.textContent = clean
      } else {
        el.className = 'node-group'; el.textContent = '▸ ' + clean
      }
      nodeList.appendChild(el)
    })

    // Hide loading
    bar.style.width = '100%'
    setTimeout(() => {
      const el = document.getElementById('loading')
      el.style.opacity = '0'
      setTimeout(() => el.remove(), 600)
    }, 200)
  },
  (xhr) => {
    const pct = Math.round(xhr.loaded / xhr.total * 70)
    bar.style.width = pct + '%'
    loadText.textContent = `loading... ${pct}%`
  },
  (err) => {
    loadText.textContent = 'Error loading model'
    console.error(err)
  }
)

// ── HELPERS ──────────────────────────────────────────────────
let wireframe = false
document.getElementById('btn-reset').onclick = () => {
  sph = { theta: 0, phi: 1.1, r: 5 }
  target.set(0, 0, 0)
  updateCam()
}
document.getElementById('btn-wire').onclick = () => {
  wireframe = !wireframe
  window._model?.traverse(c => {
    if (c.isMesh) {
      const mats = Array.isArray(c.material) ? c.material : [c.material]
      mats.forEach(m => m.wireframe = wireframe)
    }
  })
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
})

// ── RENDER LOOP ───────────────────────────────────────────────
const clock = new THREE.Clock()
function animate() {
  requestAnimationFrame(animate)
  accent.intensity = 1.5 + Math.sin(Date.now() * 0.002) * 0.5
  renderer.render(scene, camera)
}
animate()
