import React, { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import { SYSTEMS, inr, frameEth } from './content.js';

// ===== LOOK SETTINGS: change these numbers to tune the feel =====
const LOOK = {
  exposure: 1.15,      // overall brightness
  bloom: 0.8,          // glow strength
  bloomRadius: 0.55,   // glow spread
  bloomThreshold: 0.85,// lower = more things glow
  envIntensity: 0.45,  // metal reflections
  autoRotate: 0.35,    // idle camera spin (0 = off)
};

const STATION_X = 6.6;
const SHIELD_R = 5.3;
const MAXN = 60; // max cash bundles shown in each fund

const rand = (a, b) => a + Math.random() * (b - a);
const hdr = (hex, k) => new THREE.Color(hex).multiplyScalar(k);

function canvasTex(size, draw) {
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  draw(c.getContext('2d'), size);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

const dotTex = () => canvasTex(64, (x, s) => {
  const g = x.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.35, 'rgba(255,255,255,0.5)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g;
  x.fillRect(0, 0, s, s);
});

const shadowTex = () => canvasTex(128, (x, s) => {
  const g = x.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  g.addColorStop(0, 'rgba(0,0,0,0.65)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = g;
  x.fillRect(0, 0, s, s);
});

const gridTex = () => canvasTex(1024, (x, s) => {
  x.fillStyle = '#000';
  x.fillRect(0, 0, s, s);
  x.strokeStyle = 'rgba(90,150,255,0.7)';
  x.lineWidth = 2;
  for (let i = 0; i <= 32; i++) {
    const p = i * 32;
    x.beginPath(); x.moveTo(p, 0); x.lineTo(p, s); x.stroke();
    x.beginPath(); x.moveTo(0, p); x.lineTo(s, p); x.stroke();
  }
  const g = x.createRadialGradient(s / 2, s / 2, 60, s / 2, s / 2, s / 2);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, 'rgba(0,0,0,1)');
  x.fillStyle = g;
  x.fillRect(0, 0, s, s);
});

function shieldMaterial(colorHex, base) {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    uniforms: {
      uColor: { value: new THREE.Color(colorHex) },
      uBase: { value: base },
      uPulse: { value: 0 },
      uTime: { value: 0 },
      uHit: { value: new THREE.Vector3(0, 3, 5) },
    },
    vertexShader: `
      varying vec3 vN; varying vec3 vV; varying vec3 vP;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vN = normalize(normalMatrix * normal);
        vV = normalize(-mv.xyz);
        vP = position;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      uniform vec3 uColor; uniform float uBase; uniform float uPulse; uniform float uTime; uniform vec3 uHit;
      varying vec3 vN; varying vec3 vV; varying vec3 vP;
      void main() {
        float fres = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 2.2);
        float scan = smoothstep(0.93, 1.0, sin(vP.y * 9.0 + uTime * 1.2) * 0.5 + 0.5) * 0.25;
        float d = distance(vP, uHit);
        float ripple = uPulse * exp(-d * d * 0.06) * (0.6 + 0.4 * sin(d * 4.0 - uTime * 10.0));
        float a = uBase * (fres * 0.9 + 0.08 + scan) + ripple * 0.9 + uPulse * fres * 0.6;
        vec3 c = uColor * (1.2 + fres * 1.6 + ripple * 2.0);
        gl_FragColor = vec4(c, clamp(a, 0.0, 1.0));
      }`,
  });
}

function html(cls, inner) {
  const d = document.createElement('div');
  d.className = cls;
  d.innerHTML = inner;
  return d;
}

function buildScene(container) {
  let w = Math.max(container.clientWidth, 2);
  let h = Math.max(container.clientHeight, 2);

  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.setSize(w, h);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = LOOK.exposure;
  renderer.domElement.style.display = 'block';
  container.appendChild(renderer.domElement);

  const labels = new CSS2DRenderer();
  labels.setSize(w, h);
  labels.domElement.className = 'labels3d';
  container.appendChild(labels.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x060912);
  scene.fog = new THREE.FogExp2(0x060912, 0.012);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = LOOK.envIntensity;

  const camera = new THREE.PerspectiveCamera(42, w / h, 0.1, 400);
  camera.position.set(0, 9, 22);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 2.2, 1);
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.minDistance = 10;
  controls.maxDistance = 40;
  controls.maxPolarAngle = Math.PI * 0.485;
  controls.autoRotate = true;
  controls.autoRotateSpeed = LOOK.autoRotate * 6;

  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  composer.addPass(new UnrealBloomPass(new THREE.Vector2(w, h), LOOK.bloom, LOOK.bloomRadius, LOOK.bloomThreshold));
  composer.addPass(new OutputPass());

  const world = new THREE.Group();
  scene.add(world);

  const dotT = dotTex();
  const shadowT = shadowTex();

  // ---------- lights ----------
  scene.add(new THREE.AmbientLight(0x8aa4ff, 0.3));
  const key = new THREE.DirectionalLight(0xdfe9ff, 1.5);
  key.position.set(6, 14, 12);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x6f7dff, 0.9);
  rim.position.set(-10, 6, -10);
  scene.add(rim);

  // ---------- floor ----------
  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(17, 96),
    new THREE.MeshStandardMaterial({ color: 0x090d18, roughness: 0.6, metalness: 0.5, emissive: 0x5a9bff, emissiveMap: gridTex(), emissiveIntensity: 0.55 })
  );
  floor.rotation.x = -Math.PI / 2;
  world.add(floor);

  // ---------- stars and dust ----------
  const starPos = new Float32Array(700 * 3);
  for (let i = 0; i < 700; i++) {
    const r = rand(70, 120), th = rand(0, Math.PI * 2), ph = Math.acos(rand(-0.2, 1));
    starPos[i * 3] = r * Math.sin(ph) * Math.cos(th);
    starPos[i * 3 + 1] = r * Math.cos(ph);
    starPos[i * 3 + 2] = r * Math.sin(ph) * Math.sin(th);
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
  const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ size: 0.9, map: dotT, color: 0x9bb8ff, transparent: true, opacity: 0.85, depthWrite: false, sizeAttenuation: true, fog: false }));
  scene.add(stars);

  const DUST = 140;
  const dustPos = new Float32Array(DUST * 3);
  const dustSpd = new Float32Array(DUST);
  for (let i = 0; i < DUST; i++) {
    dustPos[i * 3] = rand(-16, 16);
    dustPos[i * 3 + 1] = rand(0.5, 10);
    dustPos[i * 3 + 2] = rand(-12, 12);
    dustSpd[i] = rand(0.1, 0.4);
  }
  const dustGeo = new THREE.BufferGeometry();
  const dustAttr = new THREE.BufferAttribute(dustPos, 3);
  dustGeo.setAttribute('position', dustAttr);
  world.add(new THREE.Points(dustGeo, new THREE.PointsMaterial({ size: 0.14, map: dotT, color: 0x86b4ff, transparent: true, opacity: 0.6, depthWrite: false, blending: THREE.AdditiveBlending })));

  // ---------- spark particles ----------
  const MAXP = 500;
  const pPos = new Float32Array(MAXP * 3);
  const pCol = new Float32Array(MAXP * 3);
  const pVel = new Float32Array(MAXP * 3);
  const pBase = new Float32Array(MAXP * 3);
  const pLife = new Float32Array(MAXP);
  const pMax = new Float32Array(MAXP);
  for (let i = 0; i < MAXP; i++) pPos[i * 3 + 1] = -100;
  const pGeo = new THREE.BufferGeometry();
  const pPosA = new THREE.BufferAttribute(pPos, 3);
  const pColA = new THREE.BufferAttribute(pCol, 3);
  pGeo.setAttribute('position', pPosA);
  pGeo.setAttribute('color', pColA);
  const sparks = new THREE.Points(pGeo, new THREE.PointsMaterial({ size: 0.28, map: dotT, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  sparks.frustumCulled = false;
  world.add(sparks);
  let pHead = 0;
  function burst(pos, n, hex, speed, life) {
    const c = hdr(hex, 2.2);
    for (let i = 0; i < n; i++) {
      const k = pHead;
      pHead = (pHead + 1) % MAXP;
      const th = rand(0, Math.PI * 2), ph = Math.acos(rand(-1, 1)), sp = speed * rand(0.3, 1);
      pPos[k * 3] = pos.x; pPos[k * 3 + 1] = pos.y; pPos[k * 3 + 2] = pos.z;
      pVel[k * 3] = Math.sin(ph) * Math.cos(th) * sp;
      pVel[k * 3 + 1] = Math.abs(Math.cos(ph)) * sp + 1;
      pVel[k * 3 + 2] = Math.sin(ph) * Math.sin(th) * sp;
      pBase[k * 3] = c.r; pBase[k * 3 + 1] = c.g; pBase[k * 3 + 2] = c.b;
      pLife[k] = pMax[k] = life * rand(0.6, 1.4);
    }
  }

  // ---------- effects: shockwaves ----------
  const fx = [];
  function shock(x, hex) {
    const m = new THREE.Mesh(
      new THREE.RingGeometry(0.9, 1.05, 80),
      new THREE.MeshBasicMaterial({ color: hdr(hex, 2.5), transparent: true, opacity: 0.9, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false })
    );
    m.rotation.x = -Math.PI / 2;
    m.position.set(x, 0.12, 0);
    world.add(m);
    fx.push({
      t: 0,
      update(dt) {
        this.t += dt;
        const k = this.t / 1.1;
        m.scale.setScalar(1 + k * 7);
        m.material.opacity = Math.max(0, 0.9 * (1 - k));
        if (k >= 1) { world.remove(m); m.geometry.dispose(); m.material.dispose(); return false; }
        return true;
      },
    });
  }

  // ---------- flying banknotes ----------
  const notes = [];
  const noteGeo = new THREE.BoxGeometry(0.55, 0.28, 0.025);
  const noteMat = {
    stolen: new THREE.MeshStandardMaterial({ color: 0xffc247, emissive: 0xff8a00, emissiveIntensity: 1.3, roughness: 0.4 }),
    paid: new THREE.MeshStandardMaterial({ color: 0x41e08c, emissive: 0x0bb35a, emissiveIntensity: 1.1, roughness: 0.4 }),
  };
  function flyNotes(from, to, count, kind) {
    for (let i = 0; i < count && notes.length < 90; i++) {
      const m = new THREE.Mesh(noteGeo, noteMat[kind]);
      m.visible = false;
      world.add(m);
      notes.push({
        m, from: from.clone(), to: to.clone(), t: 0, delay: i * 0.08,
        dur: rand(1.0, 1.4), arc: rand(1.6, 2.8),
        spin: new THREE.Vector3(rand(-6, 6), rand(-6, 6), rand(-6, 6)),
      });
    }
  }

  // ---------- thief drone ----------
  const thief = new THREE.Group();
  const HOME = new THREE.Vector3(0, 3.4, 6.5);
  thief.position.copy(HOME);
  const coreMat = new THREE.MeshStandardMaterial({ color: 0x1a0508, emissive: 0xff1e3c, emissiveIntensity: 1, metalness: 0.8, roughness: 0.25, flatShading: true });
  thief.add(new THREE.Mesh(new THREE.IcosahedronGeometry(0.55, 1), coreMat));
  thief.add(new THREE.Mesh(new THREE.IcosahedronGeometry(0.82, 1), new THREE.MeshBasicMaterial({ color: hdr(0xff3b4e, 2.2), wireframe: true })));
  const ringA = new THREE.Mesh(new THREE.TorusGeometry(1.1, 0.025, 8, 64), new THREE.MeshBasicMaterial({ color: hdr(0xff3b4e, 2.6) }));
  const ringB = new THREE.Mesh(new THREE.TorusGeometry(1.3, 0.025, 8, 64), new THREE.MeshBasicMaterial({ color: hdr(0xffa13b, 2.2) }));
  thief.add(ringA, ringB);
  const thiefLight = new THREE.PointLight(0xff2a3a, 25, 14, 2);
  thief.add(thiefLight);
  const thiefTag = new CSS2DObject(html('chip3d chip3d-bad', 'THIEF'));
  thiefTag.position.set(0, 1.7, 0);
  thief.add(thiefTag);
  world.add(thief);

  // ---------- honest customer ----------
  const customer = new THREE.Group();
  customer.position.set(0, 1.1, 8.8);
  customer.add(new THREE.Mesh(new THREE.SphereGeometry(0.42, 32, 24), new THREE.MeshStandardMaterial({ color: 0x0a2a1c, emissive: 0x35e08f, emissiveIntensity: 1.1, metalness: 0.4, roughness: 0.3 })));
  const cRing = new THREE.Mesh(new THREE.TorusGeometry(0.8, 0.03, 8, 64), new THREE.MeshBasicMaterial({ color: hdr(0x35e08f, 2.4) }));
  cRing.rotation.x = Math.PI / 2;
  customer.add(cRing);
  customer.add(new THREE.PointLight(0x35e08f, 8, 8, 2));
  const custTag = new CSS2DObject(html('chip3d chip3d-good', 'HONEST CUSTOMER'));
  custTag.position.set(0, 1.2, 0);
  customer.add(custTag);
  world.add(customer);

  // ---------- beam ----------
  const beam = new THREE.Mesh(
    new THREE.CylinderGeometry(0.07, 0.07, 1, 12, 1, true),
    new THREE.MeshBasicMaterial({ color: hdr(0xff2a3a, 2.4), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false })
  );
  beam.visible = false;
  world.add(beam);
  const pulses = [];
  for (let i = 0; i < 6; i++) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 8), new THREE.MeshBasicMaterial({ color: hdr(0xff6a3d, 3) }));
    m.visible = false;
    world.add(m);
    pulses.push(m);
  }

  // ---------- the two fund stations ----------
  function makeStation(id, x) {
    const def = SYSTEMS[id];
    const g = new THREE.Group();
    g.position.x = x;
    world.add(g);

    const glowCol = new THREE.Color(def.color).multiplyScalar(2.4);
    const glowMat = new THREE.MeshBasicMaterial({ color: glowCol });
    const ringMat = new THREE.MeshBasicMaterial({ color: glowCol.clone() });
    const dark = new THREE.MeshStandardMaterial({ color: 0x141a27, metalness: 0.9, roughness: 0.35 });
    const steel = new THREE.MeshPhysicalMaterial({ color: def.metal, metalness: 1, roughness: 0.3, clearcoat: 0.6, clearcoatRoughness: 0.2 });
    const plate = new THREE.MeshStandardMaterial({ color: 0x3a4658, metalness: 1, roughness: 0.22 });

    const sh = new THREE.Mesh(new THREE.PlaneGeometry(12, 12), new THREE.MeshBasicMaterial({ map: shadowT, transparent: true, depthWrite: false }));
    sh.rotation.x = -Math.PI / 2;
    sh.position.y = 0.03;
    g.add(sh);

    const base = new THREE.Mesh(new THREE.CylinderGeometry(3.4, 3.7, 0.35, 64), dark);
    base.position.y = 0.175;
    g.add(base);
    const rimRing = new THREE.Mesh(new THREE.TorusGeometry(3.55, 0.05, 12, 96), glowMat);
    rimRing.rotation.x = Math.PI / 2;
    rimRing.position.y = 0.36;
    g.add(rimRing);
    const halo = new THREE.Mesh(new THREE.TorusGeometry(4.6, 0.03, 8, 128), glowMat);
    halo.rotation.x = Math.PI / 2;
    halo.position.y = 0.45;
    g.add(halo);

    const body = new THREE.Mesh(new RoundedBoxGeometry(3.6, 3.2, 3.0, 5, 0.22), steel);
    body.position.y = 1.95;
    g.add(body);
    [-1.64, 1.64].forEach((sx) => {
      const edge = new THREE.Mesh(new THREE.BoxGeometry(0.07, 2.5, 0.07), glowMat);
      edge.position.set(sx, 1.95, 1.5);
      g.add(edge);
    });

    const door = new THREE.Group();
    door.position.set(0, 1.95, 1.52);
    g.add(door);
    const dPlate = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.15, 0.16, 64), plate);
    dPlate.rotation.x = Math.PI / 2;
    door.add(dPlate);
    door.add(new THREE.Mesh(new THREE.TorusGeometry(1.15, 0.07, 16, 96), ringMat));
    const wheel = new THREE.Group();
    wheel.position.z = 0.14;
    door.add(wheel);
    for (let i = 0; i < 3; i++) {
      const sp = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.12, 0.1), plate);
      sp.rotation.z = (i * Math.PI) / 3;
      wheel.add(sp);
    }
    wheel.add(new THREE.Mesh(new THREE.SphereGeometry(0.26, 24, 16), glowMat));

    // glass case with cash
    const glass = new THREE.Mesh(
      new THREE.CylinderGeometry(1.45, 1.45, 1.9, 48),
      new THREE.MeshPhysicalMaterial({ color: 0xbfe9ff, transparent: true, opacity: 0.14, roughness: 0.05, metalness: 0, clearcoat: 1, depthWrite: false })
    );
    glass.position.y = 4.5;
    g.add(glass);
    [3.55, 5.45].forEach((cy) => {
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(1.55, 1.55, 0.12, 48), plate);
      cap.position.y = cy;
      g.add(cap);
    });
    const pile = new THREE.Group();
    g.add(pile);
    const bundles = new THREE.InstancedMesh(new THREE.BoxGeometry(0.62, 0.15, 0.4), new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0x0a3d20, emissiveIntensity: 0.7, roughness: 0.5, metalness: 0.1 }), MAXN);
    bundles.frustumCulled = false;
    const dummy = new THREE.Object3D();
    const greens = [0x2fa866, 0x34b873, 0x2a9a5c, 0x3fc47f];
    for (let i = 0; i < MAXN; i++) {
      const layer = Math.floor(i / 6), idx = i % 6;
      dummy.position.set(((idx % 2) - 0.5) * 0.7, 3.7 + layer * 0.17, (Math.floor(idx / 2) - 1) * 0.46);
      dummy.rotation.y = layer % 2 ? 0.08 : -0.08;
      dummy.updateMatrix();
      bundles.setMatrixAt(i, dummy.matrix);
      bundles.setColorAt(i, new THREE.Color(greens[i % 4]));
    }
    bundles.instanceMatrix.needsUpdate = true;
    bundles.instanceColor.needsUpdate = true;
    pile.add(bundles);
    const moneyLight = new THREE.PointLight(0x7dffa8, 10, 8, 2);
    moneyLight.position.set(0, 4.6, 0);
    g.add(moneyLight);

    // shield dome (strong on the Secured System, only an alarm flash on the Old one)
    const shield = new THREE.Mesh(
      new THREE.SphereGeometry(SHIELD_R, 64, 32, 0, Math.PI * 2, 0, Math.PI / 2),
      shieldMaterial(id === 'v2' ? 0x2ee6c8 : 0xff3b4e, id === 'v2' ? 0.55 : 0)
    );
    shield.position.y = 0.3;
    g.add(shield);

    const light = new THREE.PointLight(new THREE.Color(def.color), 40, 16, 2);
    light.position.set(0, 5.5, 4.5);
    g.add(light);

    const tagEl = html('tag3d tag3d-' + id, '<div class="s-name">' + def.name + '</div><div class="s-money"></div><div class="s-state is-idle">' + def.line + '</div>');
    const tag = new CSS2DObject(tagEl);
    tag.position.set(0, 7.1, 0);
    g.add(tag);

    return {
      id, x, def, glowCol, ringMat, wheel, door, bundles, pile, halo, shield, light,
      moneyEl: tagEl.querySelector('.s-money'), stateEl: tagEl.querySelector('.s-state'),
      shown: 10, target: 10, count: -1, moneyTxt: '',
      flash: 0, flashCol: new THREE.Color(0xffffff), spin: 0, shake: 0, pulse: 0, tagT: 0,
      top: new THREE.Vector3(x, 4.7, 0),
      door3: new THREE.Vector3(x, 1.95, 1.9),
      center: new THREE.Vector3(x, 0.3, 0),
    };
  }
  const st = { v1: makeStation('v1', -STATION_X), v2: makeStation('v2', STATION_X) };

  function setTag(s, text, cls, secs) {
    s.stateEl.textContent = text;
    s.stateEl.className = 's-state ' + cls;
    s.tagT = secs;
  }

  // ---------- state ----------
  let mode = 'normal';
  let modeLocked = false;
  let thiefTarget = null;
  let beamT = 0, beamVault = 'v1';
  let activity = 0, worldShake = 0, thiefGlow = 0;
  const kick = new THREE.Vector3();
  const base = HOME.clone();
  const setM = (m) => { if (!modeLocked) mode = m; };

  const attackPos = (id) => new THREE.Vector3(st[id].x * 0.7, 3.0, 6.2);
  function beamEnd(id) {
    const s = st[id];
    if (id === 'v2') {
      return s.center.clone().add(thief.position.clone().sub(s.center).normalize().multiplyScalar(SHIELD_R));
    }
    return s.door3.clone();
  }
  function shieldHit(s) {
    const d = thief.position.clone().sub(s.center).normalize().multiplyScalar(SHIELD_R);
    s.shield.material.uniforms.uHit.value.copy(d);
    return s.center.clone().add(d);
  }
  const noteCount = (f) => {
    const e = frameEth(f);
    return e ? Math.min(14, Math.max(4, Math.round(e * 2.2 + 3))) : 6;
  };

  // ---------- public API ----------
  const api = {
    setBalances(b, snap) {
      ['v1', 'v2'].forEach((v) => {
        if (b && b[v] != null && Number.isFinite(b[v])) {
          st[v].target = b[v];
          if (snap) st[v].shown = b[v];
        }
      });
    },
    setMode(m, lock) { mode = m; modeLocked = !!lock; },
    reset() {
      notes.splice(0).forEach((n) => world.remove(n.m));
      fx.splice(0);
      pLife.fill(0);
      mode = 'normal';
      thiefTarget = null; beamT = 0; activity = 0; worldShake = 0; thiefGlow = 0;
      kick.set(0, 0, 0);
      ['v1', 'v2'].forEach((v) => {
        const s = st[v];
        s.target = 10; s.shown = 10; s.flash = 0; s.pulse = 0; s.shake = 0;
        setTag(s, s.def.line, 'is-idle', 0);
      });
    },
    playFrame(f) {
      const id = f.vault === 'v2' ? 'v2' : 'v1';
      const s = st[id];
      activity = 5;
      switch (f.event) {
        case 'AttackLaunched':
          if (f.args && f.args.attack === 'normal') break;
          setM('attack');
          thiefTarget = id; beamT = 1.8; beamVault = id; thiefGlow = 1;
          setTag(s, 'Under attack', 'is-warn', 3);
          break;
        case 'ClaimFiled':
        case 'ClaimApproved':
        case 'Funded':
          s.spin = 1;
          s.flash = Math.max(s.flash, 0.5);
          s.flashCol.set(s.def.color);
          break;
        case 'ClaimPaid':
        case 'EmergencyWithdraw': {
          const n = noteCount(f);
          if (mode === 'attack') {
            flyNotes(s.top, thief.position, n, 'stolen');
            burst(s.top, 14, 0xffc247, 4, 0.8);
            s.flashCol.set(0xff3b4e);
          } else {
            flyNotes(s.top, customer.position, n, 'paid');
            s.flashCol.set(0x35e08f);
          }
          s.flash = 1;
          break;
        }
        case 'VaultBroken':
          s.shake = 1; s.flash = 1.6; s.flashCol.set(0xff2a3a); s.pulse = 1;
          shieldHit(s);
          burst(s.door3, 70, 0xff5a2a, 7, 1.1);
          shock(s.x, 0xff3b4e);
          worldShake = 1; thiefGlow = 1.5;
          setTag(s, 'ROBBED', 'is-bad', 4);
          setM('normal');
          break;
        case 'AttackBlocked': {
          const hp = shieldHit(s);
          s.pulse = 1; s.flash = 1; s.flashCol.set(0x2ee6c8);
          burst(hp, 55, 0x2ee6c8, 5, 0.9);
          shock(s.x, 0x2ee6c8);
          kick.copy(thief.position).sub(s.center).setY(0).normalize().multiplyScalar(2.2);
          thiefGlow = 0;
          beamT = Math.min(beamT, 0.25);
          setTag(s, 'ATTACK BLOCKED', 'is-good', 3.5);
          setM('normal');
          break;
        }
        case 'NormalClaimDone':
          s.flash = 1; s.flashCol.set(0x35e08f);
          burst(customer.position, 30, 0x35e08f, 3.5, 0.9);
          setTag(s, 'PAID OUT', 'is-good', 3);
          setM('normal');
          break;
        default:
          break;
      }
    },
  };

  // ---------- resize ----------
  function resize() {
    w = Math.max(container.clientWidth, 2);
    h = Math.max(container.clientHeight, 2);
    renderer.setSize(w, h);
    composer.setSize(w, h);
    labels.setSize(w, h);
    camera.aspect = w / h;
    camera.fov = camera.aspect < 1.45 ? Math.min(72, 42 * (1.45 / camera.aspect)) : 42;
    camera.updateProjectionMatrix();
  }
  const ro = new ResizeObserver(resize);
  ro.observe(container);
  resize();

  // ---------- animation loop ----------
  const clock = new THREE.Clock();
  const UP = new THREE.Vector3(0, 1, 0);
  let raf = 0;
  function tick() {
    raf = requestAnimationFrame(tick);
    const dt = Math.min(clock.getDelta(), 0.05);
    const t = clock.elapsedTime;

    activity = Math.max(0, activity - dt);
    if (activity <= 0 && thiefTarget) thiefTarget = null;
    controls.autoRotate = activity <= 0 && LOOK.autoRotate > 0;

    ['v1', 'v2'].forEach((v) => {
      const s = st[v];
      s.shown += (s.target - s.shown) * Math.min(1, dt * 3.2);
      const n = Math.max(0, Math.min(MAXN, Math.round((s.shown / 10) * MAXN)));
      if (n !== s.count) { s.count = n; s.bundles.count = n; }
      const txt = inr(s.shown);
      if (txt !== s.moneyTxt) { s.moneyTxt = txt; s.moneyEl.textContent = txt; }

      s.flash = Math.max(0, s.flash - dt * 1.8);
      s.ringMat.color.copy(s.glowCol).lerp(s.flashCol, Math.min(1, s.flash)).multiplyScalar(1 + s.flash * 1.4);
      s.light.intensity = 40 + s.flash * 260;
      s.spin *= Math.pow(0.05, dt);
      s.wheel.rotation.z += dt * (0.25 + s.spin * 6);
      s.shake = Math.max(0, s.shake - dt * 1.4);
      s.door.position.x = Math.sin(t * 60) * 0.05 * s.shake;
      s.pile.rotation.y += dt * 0.25;
      s.halo.rotation.z += dt * 0.15;
      s.pulse = Math.max(0, s.pulse - dt * 1.3);
      s.shield.material.uniforms.uPulse.value = s.pulse;
      s.shield.material.uniforms.uTime.value = t;
      if (s.tagT > 0) {
        s.tagT -= dt;
        if (s.tagT <= 0) setTag(s, s.def.line, 'is-idle', 0);
      }
    });

    // thief
    const goal = thiefTarget ? attackPos(thiefTarget) : HOME;
    base.lerp(goal, 1 - Math.pow(0.002, dt));
    kick.multiplyScalar(Math.pow(0.02, dt));
    thief.position.copy(base).add(kick);
    thief.position.y += Math.sin(t * 2) * 0.18;
    ringA.rotation.x += dt * 1.6; ringA.rotation.y += dt * 0.9;
    ringB.rotation.y += dt * 1.3; ringB.rotation.z += dt * 0.7;
    thief.children[1].rotation.y += dt * 0.6;
    thiefGlow = Math.max(0, thiefGlow - dt * 0.7);
    coreMat.emissiveIntensity = 1 + thiefGlow * 2;
    thiefLight.intensity = 25 + thiefGlow * 80;
    cRing.rotation.z += dt * 1.2;
    customer.position.y = 1.1 + Math.sin(t * 1.6) * 0.1;

    // beam
    if (beamT > 0) {
      beamT -= dt;
      const a = thief.position, b = beamEnd(beamVault);
      const dir = b.clone().sub(a);
      const len = Math.max(dir.length(), 0.01);
      beam.visible = true;
      beam.position.copy(a).add(b).multiplyScalar(0.5);
      beam.quaternion.setFromUnitVectors(UP, dir.clone().normalize());
      beam.scale.set(1, len, 1);
      beam.material.opacity = Math.min(1, beamT * 2) * 0.55;
      pulses.forEach((m, i) => {
        m.visible = true;
        m.position.copy(a).addScaledVector(dir, (t * 1.4 + i / pulses.length) % 1);
      });
    } else if (beam.visible) {
      beam.visible = false;
      pulses.forEach((m) => { m.visible = false; });
    }

    // banknotes
    for (let i = notes.length - 1; i >= 0; i--) {
      const n = notes[i];
      if (n.delay > 0) { n.delay -= dt; continue; }
      n.t += dt / n.dur;
      if (n.t >= 1) { world.remove(n.m); notes.splice(i, 1); continue; }
      const e = n.t * n.t * (3 - 2 * n.t);
      n.m.visible = true;
      n.m.position.lerpVectors(n.from, n.to, e);
      n.m.position.y += Math.sin(Math.PI * n.t) * n.arc;
      n.m.rotation.x += n.spin.x * dt; n.m.rotation.y += n.spin.y * dt; n.m.rotation.z += n.spin.z * dt;
      n.m.scale.setScalar(1 - 0.6 * n.t * n.t * n.t);
    }

    // shockwaves
    for (let i = fx.length - 1; i >= 0; i--) if (!fx[i].update(dt)) fx.splice(i, 1);

    // sparks
    for (let k = 0; k < MAXP; k++) {
      if (pLife[k] > 0) {
        pLife[k] -= dt;
        if (pLife[k] <= 0) {
          pPos[k * 3 + 1] = -100; pCol[k * 3] = 0; pCol[k * 3 + 1] = 0; pCol[k * 3 + 2] = 0;
        } else {
          pVel[k * 3 + 1] -= 6 * dt;
          pPos[k * 3] += pVel[k * 3] * dt;
          pPos[k * 3 + 1] += pVel[k * 3 + 1] * dt;
          pPos[k * 3 + 2] += pVel[k * 3 + 2] * dt;
          const f = pLife[k] / pMax[k];
          pCol[k * 3] = pBase[k * 3] * f; pCol[k * 3 + 1] = pBase[k * 3 + 1] * f; pCol[k * 3 + 2] = pBase[k * 3 + 2] * f;
        }
      }
    }
    pPosA.needsUpdate = true;
    pColA.needsUpdate = true;

    // dust and stars
    for (let i = 0; i < DUST; i++) {
      dustPos[i * 3 + 1] += dustSpd[i] * dt;
      if (dustPos[i * 3 + 1] > 10) dustPos[i * 3 + 1] = 0.5;
    }
    dustAttr.needsUpdate = true;
    stars.rotation.y += dt * 0.004;

    // screen shake
    worldShake = Math.max(0, worldShake - dt * 1.6);
    world.position.set((Math.random() - 0.5) * 0.35 * worldShake, (Math.random() - 0.5) * 0.2 * worldShake, 0);

    controls.update();
    composer.render();
    labels.render(scene, camera);
  }
  tick();

  api.dispose = () => {
    cancelAnimationFrame(raf);
    ro.disconnect();
    controls.dispose();
    scene.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) {
        (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => {
          if (m.map) m.map.dispose();
          m.dispose();
        });
      }
    });
    try { composer.dispose(); } catch (e) { /* ignore */ }
    pmrem.dispose();
    renderer.dispose();
    try { renderer.forceContextLoss(); } catch (e) { /* ignore */ }
    try { container.removeChild(renderer.domElement); } catch (e) { /* ignore */ }
    try { container.removeChild(labels.domElement); } catch (e) { /* ignore */ }
  };

  return api;
}

const Scene3D = forwardRef(function Scene3D(props, ref) {
  const mount = useRef(null);
  const api = useRef(null);

  useImperativeHandle(ref, () => ({
    playFrame: (f) => api.current && api.current.playFrame(f),
    setBalances: (b, snap) => api.current && api.current.setBalances(b, snap),
    setMode: (m, lock) => api.current && api.current.setMode(m, lock),
    reset: () => api.current && api.current.reset(),
  }), []);

  useEffect(() => {
    api.current = buildScene(mount.current);
    return () => {
      if (api.current) api.current.dispose();
      api.current = null;
    };
  }, []);

  return <div className="stage" ref={mount} />;
});

export default Scene3D;