import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

export default function ThreeLoginCanvas() {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    // 1. Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x020813);
    scene.fog = new THREE.FogExp2(0x020813, 0.025);

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(55, width / height, 0.1, 1000);
    camera.position.set(0, 12, 28);
    camera.lookAt(0, 0, 0);

    // 3. Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // 4. Undulating Cybernetic River Mesh (Digital Twin Wireframe Grid)
    const gridX = 70;
    const gridY = 40;
    const planeGeo = new THREE.PlaneGeometry(80, 50, gridX, gridY);
    planeGeo.rotateX(-Math.PI / 2.2);

    // Custom vertex shader or animated vertices in loop
    const planeMat = new THREE.MeshStandardMaterial({
      color: 0x06b6d4,
      wireframe: true,
      transparent: true,
      opacity: 0.35,
      roughness: 0.2,
      metalness: 0.8
    });

    const riverMesh = new THREE.Mesh(planeGeo, planeMat);
    riverMesh.position.set(0, -2, -5);
    scene.add(riverMesh);

    // 5. Solid water floor underneath wireframe
    const waterFloorGeo = new THREE.PlaneGeometry(120, 80);
    waterFloorGeo.rotateX(-Math.PI / 2);
    const waterFloorMat = new THREE.MeshBasicMaterial({
      color: 0x031728,
      transparent: true,
      opacity: 0.75
    });
    const waterFloor = new THREE.Mesh(waterFloorGeo, waterFloorMat);
    waterFloor.position.set(0, -5.5, 0);
    scene.add(waterFloor);

    // 6. Glowing Telemetry Flow Particles (representing IoT packets)
    const particleCount = 450;
    const particleGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const scales = new Float32Array(particleCount);
    const speeds = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 70;
      positions[i * 3 + 1] = Math.random() * 8 - 2;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 50;
      scales[i] = Math.random() * 0.4 + 0.2;
      speeds[i] = Math.random() * 0.08 + 0.04;
    }

    particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const particleMat = new THREE.PointsMaterial({
      color: 0x38bdf8,
      size: 0.35,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending
    });
    const particles = new THREE.Points(particleGeo, particleMat);
    scene.add(particles);

    // 7. Ambient and Directional Lights
    const ambientLight = new THREE.AmbientLight(0x0e7490, 1.5);
    scene.add(ambientLight);

    const cyanLight = new THREE.PointLight(0x06b6d4, 3, 50);
    cyanLight.position.set(0, 8, 10);
    scene.add(cyanLight);

    const emeraldLight = new THREE.PointLight(0x10b981, 2, 40);
    emeraldLight.position.set(-15, 6, -5);
    scene.add(emeraldLight);

    // 8. Mouse Parallax Tracking
    let mouseX = 0;
    let mouseY = 0;
    let targetCameraX = 0;
    let targetCameraY = 12;

    const onMouseMove = (e) => {
      const windowHalfX = window.innerWidth / 2;
      const windowHalfY = window.innerHeight / 2;
      mouseX = (e.clientX - windowHalfX) / windowHalfX;
      mouseY = (e.clientY - windowHalfY) / windowHalfY;
      targetCameraX = mouseX * 6;
      targetCameraY = 12 - mouseY * 3;
    };
    window.addEventListener('mousemove', onMouseMove);

    // 9. Animation Loop
    let clock = new THREE.Clock();
    let reqId = null;

    const animate = () => {
      reqId = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();

      // Undulate plane geometry vertices to create physical water waves
      const pos = planeGeo.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const u = pos.getX(i);
        const v = pos.getY(i);
        const wave1 = Math.sin(u * 0.15 + elapsed * 1.5) * 1.2;
        const wave2 = Math.cos(v * 0.2 + elapsed * 1.8) * 0.8;
        const wave3 = Math.sin((u + v) * 0.1 + elapsed * 0.9) * 0.6;
        pos.setZ(i, wave1 + wave2 + wave3);
      }
      planeGeo.computeVertexNormals();
      pos.needsUpdate = true;

      // Move flow particles towards camera
      const pArray = particleGeo.attributes.position.array;
      for (let i = 0; i < particleCount; i++) {
        pArray[i * 3 + 2] += speeds[i] * 1.5;
        // Reset particles once they pass the camera
        if (pArray[i * 3 + 2] > 25) {
          pArray[i * 3 + 2] = -25;
          pArray[i * 3] = (Math.random() - 0.5) * 70;
        }
      }
      particleGeo.attributes.position.needsUpdate = true;

      // Smooth camera interpolation towards mouse
      camera.position.x += (targetCameraX - camera.position.x) * 0.04;
      camera.position.y += (targetCameraY - camera.position.y) * 0.04;
      camera.lookAt(0, 0, -5);

      renderer.render(scene, camera);
    };
    animate();

    // 10. Resize handler
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(reqId);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
    };
  }, []);

  return (
    <div 
      ref={containerRef} 
      className="absolute inset-0 w-full h-full pointer-events-none overflow-hidden z-0"
    />
  );
}
