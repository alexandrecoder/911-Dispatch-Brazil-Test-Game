import * as THREE from 'three';
import { BaseType, IncidentSeverity, VehicleType } from '../types/game';

export interface VehicleModelRefs {
  group: THREE.Group;
  leftLightMat?: THREE.MeshStandardMaterial;
  rightLightMat?: THREE.MeshStandardMaterial;
  mainRotor?: THREE.Object3D;
  tailRotor?: THREE.Object3D;
  headlightMat?: THREE.MeshStandardMaterial;
}

export interface BaseModelRefs {
  group: THREE.Group;
  beaconMat: THREE.MeshStandardMaterial;
  ringMesh: THREE.Mesh;
}

export interface IncidentModelRefs {
  group: THREE.Group;
  diamond: THREE.Mesh;
  ring: THREE.Mesh;
  coreMat: THREE.MeshStandardMaterial;
}

// Shared low-allocation materials for tires, glass, chrome
const tireMat = new THREE.MeshStandardMaterial({
  color: 0x161920,
  roughness: 0.92,
  metalness: 0.05,
});

const rimMat = new THREE.MeshStandardMaterial({
  color: 0xcbd5e1,
  roughness: 0.22,
  metalness: 0.88,
});

const glassMat = new THREE.MeshStandardMaterial({
  color: 0x0f172a,
  roughness: 0.1,
  metalness: 0.85,
});

const bumperMat = new THREE.MeshStandardMaterial({
  color: 0x1e293b,
  roughness: 0.72,
  metalness: 0.35,
});

function addWheelPair(group: THREE.Group, zPos: number, halfTrack: number, radius: number, width: number): void {
  const wheelGeo = new THREE.CylinderGeometry(radius, radius, width, 16);
  wheelGeo.rotateZ(Math.PI / 2);

  const rimGeo = new THREE.CylinderGeometry(radius * 0.56, radius * 0.56, width + 0.04, 12);
  rimGeo.rotateZ(Math.PI / 2);

  [-1, 1].forEach((side) => {
    const tire = new THREE.Mesh(wheelGeo, tireMat);
    tire.position.set(side * halfTrack, radius, zPos);
    group.add(tire);

    const rim = new THREE.Mesh(rimGeo, rimMat);
    rim.position.set(side * halfTrack, radius, zPos);
    group.add(rim);
  });
}

function addContactShadow(group: THREE.Group, width: number, length: number): void {
  const shadowGeo = new THREE.PlaneGeometry(width, length);
  shadowGeo.rotateX(-Math.PI / 2);
  const shadowMat = new THREE.MeshBasicMaterial({
    color: 0x020617,
    transparent: true,
    opacity: 0.42,
    depthWrite: false,
  });
  const shadow = new THREE.Mesh(shadowGeo, shadowMat);
  shadow.position.y = 0.03;
  group.add(shadow);
}

export function createPoliceCarMesh(): VehicleModelRefs {
  const group = new THREE.Group();
  addContactShadow(group, 2.6, 5.4);

  const darkChassisMat = new THREE.MeshStandardMaterial({
    color: 0x111827,
    roughness: 0.3,
    metalness: 0.55,
  });

  const whiteDoorMat = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    roughness: 0.28,
    metalness: 0.35,
  });

  const blueAccentMat = new THREE.MeshStandardMaterial({
    color: 0x2563eb,
    roughness: 0.35,
    metalness: 0.4,
  });

  // 1. Lower hull / chassis
  const lowerBody = new THREE.Mesh(new THREE.BoxGeometry(1.92, 0.62, 4.7), darkChassisMat);
  lowerBody.position.set(0, 0.66, 0);
  group.add(lowerBody);

  // 2. White police doors band
  const doorBand = new THREE.Mesh(new THREE.BoxGeometry(1.96, 0.54, 1.95), whiteDoorMat);
  doorBand.position.set(0, 0.68, 0.05);
  group.add(doorBand);

  // 3. Blue tactical hood stripe
  const hoodStripe = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.06, 1.35), blueAccentMat);
  hoodStripe.position.set(0, 0.98, 1.55);
  group.add(hoodStripe);

  // 4. Upper cabin
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.66, 0.62, 2.35), darkChassisMat);
  cabin.position.set(0, 1.24, -0.25);
  group.add(cabin);

  // 5. Windshield & rear/side tinted glass wrap
  const glassWrap = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.42, 2.42), glassMat);
  glassWrap.position.set(0, 1.22, -0.22);
  group.add(glassWrap);

  // 6. Front push bumper (bullbar)
  const bullbar = new THREE.Mesh(new THREE.BoxGeometry(1.78, 0.42, 0.24), bumperMat);
  bullbar.position.set(0, 0.56, 2.42);
  group.add(bullbar);

  // 7. Rear bumper
  const rearBumper = new THREE.Mesh(new THREE.BoxGeometry(1.88, 0.24, 0.18), bumperMat);
  rearBumper.position.set(0, 0.42, -2.38);
  group.add(rearBumper);

  // 8. Lightbar base & twin animated emergency beacons
  const barBase = new THREE.Mesh(new THREE.BoxGeometry(1.36, 0.1, 0.34), bumperMat);
  barBase.position.set(0, 1.58, -0.1);
  group.add(barBase);

  const leftLightMat = new THREE.MeshStandardMaterial({
    color: 0xef4444,
    emissive: 0xef4444,
    emissiveIntensity: 1.6,
    roughness: 0.2,
    metalness: 0.2,
  });
  const rightLightMat = new THREE.MeshStandardMaterial({
    color: 0x3b82f6,
    emissive: 0x3b82f6,
    emissiveIntensity: 1.6,
    roughness: 0.2,
    metalness: 0.2,
  });

  const leftLight = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.16, 0.3), leftLightMat);
  leftLight.position.set(0.32, 1.66, -0.1);
  group.add(leftLight);

  const rightLight = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.16, 0.3), rightLightMat);
  rightLight.position.set(-0.32, 1.66, -0.1);
  group.add(rightLight);

  // 9. Emissive headlights
  const headlightMat = new THREE.MeshStandardMaterial({
    color: 0xfef08a,
    emissive: 0xfef08a,
    emissiveIntensity: 1.1,
    roughness: 0.15,
  });
  [-0.68, 0.68].forEach((x) => {
    const hl = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.16, 0.08), headlightMat);
    hl.position.set(x, 0.72, 2.36);
    group.add(hl);
  });

  // 10. Wheels
  addWheelPair(group, 1.45, 0.94, 0.4, 0.26);
  addWheelPair(group, -1.42, 0.94, 0.4, 0.26);

  return { group, leftLightMat, rightLightMat, headlightMat };
}

export function createFireTruckMesh(): VehicleModelRefs {
  const group = new THREE.Group();
  addContactShadow(group, 3.2, 8.8);

  const redPaintMat = new THREE.MeshStandardMaterial({
    color: 0xdc2626,
    roughness: 0.26,
    metalness: 0.42,
  });

  const whiteStripeMat = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    roughness: 0.35,
    metalness: 0.2,
  });

  const aluminumMat = new THREE.MeshStandardMaterial({
    color: 0xcbd5e1,
    roughness: 0.24,
    metalness: 0.85,
  });

  // 1. Heavy chassis frame
  const chassis = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.45, 8.1), bumperMat);
  chassis.position.set(0, 0.62, 0);
  group.add(chassis);

  // 2. Forward crew cab
  const cab = new THREE.Mesh(new THREE.BoxGeometry(2.42, 1.75, 2.35), redPaintMat);
  cab.position.set(0, 1.62, 2.78);
  group.add(cab);

  // 3. Cab panoramic windshield
  const windshield = new THREE.Mesh(new THREE.BoxGeometry(2.46, 0.72, 1.65), glassMat);
  windshield.position.set(0, 1.92, 3.16);
  group.add(windshield);

  // 4. Rear equipment & water tank body
  const rearBody = new THREE.Mesh(new THREE.BoxGeometry(2.46, 1.95, 5.45), redPaintMat);
  rearBody.position.set(0, 1.72, -1.25);
  group.add(rearBody);

  // 5. Metallic roll-up compartment doors (left & right)
  const shutters = new THREE.Mesh(new THREE.BoxGeometry(2.5, 1.1, 3.8), aluminumMat);
  shutters.position.set(0, 1.48, -1.25);
  group.add(shutters);

  // 6. High-visibility white safety stripe
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(2.52, 0.2, 8.02), whiteStripeMat);
  stripe.position.set(0, 1.05, -0.05);
  group.add(stripe);

  // 7. Chrome front bumper & grille
  const frontBumper = new THREE.Mesh(new THREE.BoxGeometry(2.46, 0.36, 0.32), aluminumMat);
  frontBumper.position.set(0, 0.64, 4.08);
  group.add(frontBumper);

  // 8. Retractable roof ladder assembly (rails + rungs)
  const ladderBase = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.32, 0.92), bumperMat);
  ladderBase.position.set(0, 2.84, -2.9);
  group.add(ladderBase);

  const ladderBeam = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.24, 5.8), aluminumMat);
  ladderBeam.position.set(0, 3.06, -0.45);
  ladderBeam.rotation.x = -0.04;
  group.add(ladderBeam);

  // 9. Twin red/amber beacons on cab roof
  const leftLightMat = new THREE.MeshStandardMaterial({
    color: 0xef4444,
    emissive: 0xef4444,
    emissiveIntensity: 1.8,
    roughness: 0.2,
  });
  const rightLightMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    emissive: 0xf59e0b,
    emissiveIntensity: 1.8,
    roughness: 0.2,
  });

  const leftBeacon = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.2, 0.36), leftLightMat);
  leftBeacon.position.set(0.62, 2.6, 3.45);
  group.add(leftBeacon);

  const rightBeacon = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.2, 0.36), rightLightMat);
  rightBeacon.position.set(-0.62, 2.6, 3.45);
  group.add(rightBeacon);

  // 10. Headlights & 6 heavy wheels
  const headlightMat = new THREE.MeshStandardMaterial({
    color: 0xfef08a,
    emissive: 0xfef08a,
    emissiveIntensity: 1.1,
  });
  [-0.85, 0.85].forEach((x) => {
    const hl = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.2, 0.08), headlightMat);
    hl.position.set(x, 0.98, 3.98);
    group.add(hl);
  });

  addWheelPair(group, 2.75, 1.18, 0.52, 0.34);
  addWheelPair(group, -1.15, 1.18, 0.52, 0.34);
  addWheelPair(group, -2.55, 1.18, 0.52, 0.34);

  return { group, leftLightMat, rightLightMat, headlightMat };
}

export function createAmbulanceMesh(): VehicleModelRefs {
  const group = new THREE.Group();
  addContactShadow(group, 2.8, 6.5);

  const whiteBodyMat = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    roughness: 0.25,
    metalness: 0.25,
  });

  const rescueOrangeMat = new THREE.MeshStandardMaterial({
    color: 0xf97316,
    roughness: 0.35,
    metalness: 0.25,
  });

  const medicalEmeraldMat = new THREE.MeshStandardMaterial({
    color: 0x10b981,
    roughness: 0.35,
    metalness: 0.2,
  });

  // 1. Forward van cab
  const cab = new THREE.Mesh(new THREE.BoxGeometry(2.08, 1.4, 1.95), whiteBodyMat);
  cab.position.set(0, 1.06, 1.95);
  group.add(cab);

  // 2. Cab windshield
  const windshield = new THREE.Mesh(new THREE.BoxGeometry(2.12, 0.62, 1.15), glassMat);
  windshield.position.set(0, 1.32, 2.28);
  group.add(windshield);

  // 3. Tall modular medical compartment
  const box = new THREE.Mesh(new THREE.BoxGeometry(2.24, 1.85, 3.95), whiteBodyMat);
  box.position.set(0, 1.38, -0.95);
  group.add(box);

  // 4. High-visibility SAMU orange/red wrap stripe
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(2.28, 0.32, 4.0), rescueOrangeMat);
  stripe.position.set(0, 1.12, -0.95);
  group.add(stripe);

  // 5. Medical emerald roof cross
  const crossA = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.08, 0.28), medicalEmeraldMat);
  crossA.position.set(0, 2.34, -0.95);
  group.add(crossA);

  const crossB = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.08, 0.95), medicalEmeraldMat);
  crossB.position.set(0, 2.34, -0.95);
  group.add(crossB);

  // 6. Bumpers
  const frontBumper = new THREE.Mesh(new THREE.BoxGeometry(2.14, 0.3, 0.24), bumperMat);
  frontBumper.position.set(0, 0.45, 2.98);
  group.add(frontBumper);

  const rearStep = new THREE.Mesh(new THREE.BoxGeometry(2.24, 0.24, 0.28), rimMat);
  rearStep.position.set(0, 0.42, -3.02);
  group.add(rearStep);

  // 7. Lightbar on medical box leading edge
  const leftLightMat = new THREE.MeshStandardMaterial({
    color: 0xef4444,
    emissive: 0xef4444,
    emissiveIntensity: 1.7,
  });
  const rightLightMat = new THREE.MeshStandardMaterial({
    color: 0x3b82f6,
    emissive: 0x3b82f6,
    emissiveIntensity: 1.7,
  });

  const leftLight = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.18, 0.32), leftLightMat);
  leftLight.position.set(0.55, 2.4, 0.85);
  group.add(leftLight);

  const rightLight = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.18, 0.32), rightLightMat);
  rightLight.position.set(-0.55, 2.4, 0.85);
  group.add(rightLight);

  // 8. Headlights & wheels
  const headlightMat = new THREE.MeshStandardMaterial({
    color: 0xfef08a,
    emissive: 0xfef08a,
    emissiveIntensity: 1.1,
  });
  [-0.75, 0.75].forEach((x) => {
    const hl = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.18, 0.08), headlightMat);
    hl.position.set(x, 0.78, 2.95);
    group.add(hl);
  });

  addWheelPair(group, 1.98, 1.04, 0.42, 0.28);
  addWheelPair(group, -1.78, 1.04, 0.42, 0.28);

  return { group, leftLightMat, rightLightMat, headlightMat };
}

export function createHelicopterMesh(): VehicleModelRefs {
  const group = new THREE.Group();

  const hullMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    roughness: 0.28,
    metalness: 0.48,
  });

  const darkTrimMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.45,
    metalness: 0.6,
  });

  const rotorMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    roughness: 0.38,
    metalness: 0.72,
  });

  // 1. Main fuselage cabin
  const fuselage = new THREE.Mesh(new THREE.BoxGeometry(2.1, 1.75, 4.4), hullMat);
  fuselage.position.set(0, 1.45, 0.45);
  group.add(fuselage);

  // 2. Nose cone & wrap-around glass cockpit
  const nose = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 1.02, 1.5, 12), glassMat);
  nose.rotation.x = Math.PI / 2;
  nose.position.set(0, 1.32, 3.25);
  group.add(nose);

  // 3. Engine cowling
  const cowling = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.72, 2.5), darkTrimMat);
  cowling.position.set(0, 2.58, 0.1);
  group.add(cowling);

  // 4. Tail boom
  const tailBoom = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.46, 4.8, 10), hullMat);
  tailBoom.rotation.x = Math.PI / 2;
  tailBoom.position.set(0, 1.68, -3.9);
  group.add(tailBoom);

  // 5. Vertical tail fin
  const tailFin = new THREE.Mesh(new THREE.BoxGeometry(0.18, 1.55, 0.95), hullMat);
  tailFin.position.set(0, 2.15, -6.1);
  tailFin.rotation.x = -0.22;
  group.add(tailFin);

  // 6. Landing skids
  [-1.08, 1.08].forEach((x) => {
    const skid = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 4.6, 8), rimMat);
    skid.rotation.x = Math.PI / 2;
    skid.position.set(x, 0.14, 0.4);
    group.add(skid);

    [-0.9, 1.5].forEach((z) => {
      const strut = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.72, 8), darkTrimMat);
      strut.position.set(x * 0.85, 0.46, z);
      strut.rotation.z = x > 0 ? 0.35 : -0.35;
      group.add(strut);
    });
  });

  // 7. Spinning main rotor assembly
  const mainRotor = new THREE.Group();
  mainRotor.position.set(0, 3.12, 0.25);

  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.32, 0.36, 12), rimMat);
  mainRotor.add(hub);

  const bladeA = new THREE.Mesh(new THREE.BoxGeometry(9.2, 0.05, 0.34), rotorMat);
  mainRotor.add(bladeA);

  const bladeB = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.05, 9.2), rotorMat);
  mainRotor.add(bladeB);

  group.add(mainRotor);

  // 8. Spinning tail rotor
  const tailRotor = new THREE.Group();
  tailRotor.position.set(0.26, 2.35, -6.15);
  const tailBlade = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.75, 0.18), rotorMat);
  tailRotor.add(tailBlade);
  group.add(tailRotor);

  // 9. Animated strobe beacon & searchlight
  const leftLightMat = new THREE.MeshStandardMaterial({
    color: 0xef4444,
    emissive: 0xef4444,
    emissiveIntensity: 1.8,
  });
  const rightLightMat = new THREE.MeshStandardMaterial({
    color: 0xfef08a,
    emissive: 0xfef08a,
    emissiveIntensity: 1.4,
  });

  const strobe = new THREE.Mesh(new THREE.SphereGeometry(0.18, 10, 10), leftLightMat);
  strobe.position.set(0, 2.95, -6.1);
  group.add(strobe);

  const searchlight = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.28, 0.35, 10), rightLightMat);
  searchlight.rotation.x = Math.PI / 3;
  searchlight.position.set(0, 0.56, 2.55);
  group.add(searchlight);

  return { group, leftLightMat, rightLightMat, mainRotor, tailRotor };
}

export function createVehicleMesh(type: VehicleType): VehicleModelRefs {
  switch (type) {
    case 'police_suv':
      return createPoliceCarMesh();
    case 'fire_truck':
      return createFireTruckMesh();
    case 'ambulance':
      return createAmbulanceMesh();
    case 'rescue_heli':
      return createHelicopterMesh();
  }
}

export function createBaseMesh(type: BaseType): BaseModelRefs {
  const group = new THREE.Group();

  const colorMap: Record<BaseType, number> = {
    police: 0x3b82f6,
    fire: 0xef4444,
    medical: 0x10b981,
    heliport: 0xf59e0b,
  };
  const accentHex = colorMap[type];

  const concreteMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.78,
    metalness: 0.2,
  });

  const roofMat = new THREE.MeshStandardMaterial({
    color: 0x334155,
    roughness: 0.5,
    metalness: 0.45,
  });

  const accentMat = new THREE.MeshStandardMaterial({
    color: accentHex,
    emissive: accentHex,
    emissiveIntensity: 0.55,
    roughness: 0.3,
    metalness: 0.4,
  });

  const beaconMat = new THREE.MeshStandardMaterial({
    color: accentHex,
    emissive: accentHex,
    emissiveIntensity: 1.7,
    roughness: 0.2,
  });

  // Ground coverage ring
  const ringGeo = new THREE.RingGeometry(11.5, 13.0, 36);
  ringGeo.rotateX(-Math.PI / 2);
  const ringMat = new THREE.MeshBasicMaterial({
    color: accentHex,
    transparent: true,
    opacity: 0.65,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const ringMesh = new THREE.Mesh(ringGeo, ringMat);
  ringMesh.position.y = 0.08;
  group.add(ringMesh);

  if (type === 'heliport') {
    // Elevated concrete pad + illuminated H + ATC tower
    const pad = new THREE.Mesh(new THREE.CylinderGeometry(9.8, 10.6, 1.4, 24), concreteMat);
    pad.position.y = 0.7;
    group.add(pad);

    const padRim = new THREE.Mesh(new THREE.TorusGeometry(9.6, 0.3, 8, 32), accentMat);
    padRim.rotation.x = Math.PI / 2;
    padRim.position.y = 1.42;
    group.add(padRim);

    const hLeft = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.15, 6.2), accentMat);
    hLeft.position.set(-2.1, 1.46, 0);
    group.add(hLeft);

    const hRight = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.15, 6.2), accentMat);
    hRight.position.set(2.1, 1.46, 0);
    group.add(hRight);

    const hMid = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.15, 1.1), accentMat);
    hMid.position.set(0, 1.46, 0);
    group.add(hMid);

    // Mini control tower on edge
    const tower = new THREE.Mesh(new THREE.BoxGeometry(3.4, 8.2, 3.4), concreteMat);
    tower.position.set(-7.2, 4.1, -6.5);
    group.add(tower);

    const towerGlass = new THREE.Mesh(new THREE.BoxGeometry(3.8, 2.0, 3.8), glassMat);
    towerGlass.position.set(-7.2, 8.6, -6.5);
    group.add(towerGlass);

    const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.7, 12, 12), beaconMat);
    beacon.position.set(-7.2, 10.4, -6.5);
    group.add(beacon);

    return { group, beaconMat, ringMesh };
  }

  // Standard emergency station: foundation + main hall + garage bays + tower
  const foundation = new THREE.Mesh(new THREE.BoxGeometry(17.5, 0.8, 13.5), concreteMat);
  foundation.position.y = 0.4;
  group.add(foundation);

  const mainHall = new THREE.Mesh(new THREE.BoxGeometry(15.2, 6.4, 10.6), concreteMat);
  mainHall.position.set(0, 3.6, -0.6);
  group.add(mainHall);

  const roof = new THREE.Mesh(new THREE.BoxGeometry(15.8, 0.7, 11.2), roofMat);
  roof.position.set(0, 7.1, -0.6);
  group.add(roof);

  // Colored roof trim band
  const trim = new THREE.Mesh(new THREE.BoxGeometry(16.0, 0.65, 11.4), accentMat);
  trim.position.set(0, 6.5, -0.6);
  group.add(trim);

  // 3 garage bay doors facing +Z
  [-4.4, 0, 4.4].forEach((x) => {
    const bay = new THREE.Mesh(new THREE.BoxGeometry(3.2, 3.8, 0.4), glassMat);
    bay.position.set(x, 2.4, 4.7);
    group.add(bay);
  });

  // Communications mast & pulsing beacon
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.48, 5.5, 8), rimMat);
  mast.position.set(5.4, 10.0, -3.5);
  group.add(mast);

  const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.85, 14, 14), beaconMat);
  beacon.position.set(5.4, 13.0, -3.5);
  group.add(beacon);

  return { group, beaconMat, ringMesh };
}

export function createIncidentMesh(severity: IncidentSeverity): IncidentModelRefs {
  const group = new THREE.Group();

  const colorMap: Record<IncidentSeverity, number> = {
    moderate: 0x38bdf8,
    high: 0xf59e0b,
    critical: 0xef4444,
  };
  const hex = colorMap[severity];

  const coreMat = new THREE.MeshStandardMaterial({
    color: hex,
    emissive: hex,
    emissiveIntensity: 1.5,
    roughness: 0.2,
    metalness: 0.35,
  });

  // Ground tactical ring
  const ringGeo = new THREE.RingGeometry(6.5, 8.2, 32);
  ringGeo.rotateX(-Math.PI / 2);
  const ringMat = new THREE.MeshBasicMaterial({
    color: hex,
    transparent: true,
    opacity: 0.8,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.position.y = 0.15;
  group.add(ring);

  // Inner disc
  const discGeo = new THREE.CircleGeometry(4.0, 24);
  discGeo.rotateX(-Math.PI / 2);
  const discMat = new THREE.MeshBasicMaterial({
    color: hex,
    transparent: true,
    opacity: 0.24,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const disc = new THREE.Mesh(discGeo, discMat);
  disc.position.y = 0.12;
  group.add(disc);

  // Floating rotating octahedral beacon
  const diamondGeo = new THREE.OctahedronGeometry(3.4, 0);
  const diamond = new THREE.Mesh(diamondGeo, coreMat);
  diamond.position.y = 10.5;
  group.add(diamond);

  // Vertical light beam
  const beamGeo = new THREE.CylinderGeometry(0.45, 1.35, 9.0, 12, 1, true);
  const beamMat = new THREE.MeshBasicMaterial({
    color: hex,
    transparent: true,
    opacity: 0.28,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const beam = new THREE.Mesh(beamGeo, beamMat);
  beam.position.y = 4.6;
  group.add(beam);

  return { group, diamond, ring, coreMat };
}
