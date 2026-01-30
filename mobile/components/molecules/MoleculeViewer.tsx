import React, { useRef, useEffect, useState } from 'react';
import { View, StyleSheet, Text, ActivityIndicator } from 'react-native';
import { GLView, ExpoWebGLRenderingContext } from 'expo-gl';
import { Renderer, THREE } from 'expo-three';
import { colors, typography, spacing, borderRadius } from '../../theme';

// Atom colors based on CPK coloring
const ATOM_COLORS: Record<string, number> = {
  C: 0x909090, // Carbon - gray
  N: 0x3050f8, // Nitrogen - blue
  O: 0xff0d0d, // Oxygen - red
  H: 0xffffff, // Hydrogen - white
  S: 0xffff30, // Sulfur - yellow
  P: 0xff8000, // Phosphorus - orange
  F: 0x90e050, // Fluorine - green
  Cl: 0x1ff01f, // Chlorine - green
  Br: 0xa62929, // Bromine - dark red
  I: 0x940094, // Iodine - purple
  default: 0xff69b4, // Default - pink
};

const ATOM_RADII: Record<string, number> = {
  C: 0.77,
  N: 0.75,
  O: 0.73,
  H: 0.37,
  S: 1.02,
  P: 1.06,
  default: 0.8,
};

interface Atom {
  element: string;
  x: number;
  y: number;
  z: number;
}

interface Bond {
  atom1: number;
  atom2: number;
  order: number;
}

interface MoleculeViewerProps {
  atoms?: Atom[];
  bonds?: Bond[];
  smiles?: string;
  pdbData?: string;
  style?: 'ball-stick' | 'space-fill' | 'wireframe';
  backgroundColor?: string;
  rotationSpeed?: number;
  interactive?: boolean;
  onLoad?: () => void;
  onError?: (error: Error) => void;
}

// Parse simple XYZ or mock data for demonstration
const parseMoleculeData = (
  atoms?: Atom[],
  pdbData?: string
): { atoms: Atom[]; bonds: Bond[] } => {
  if (atoms) {
    // Generate bonds based on distance
    const bonds: Bond[] = [];
    for (let i = 0; i < atoms.length; i++) {
      for (let j = i + 1; j < atoms.length; j++) {
        const dx = atoms[i].x - atoms[j].x;
        const dy = atoms[i].y - atoms[j].y;
        const dz = atoms[i].z - atoms[j].z;
        const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (distance < 1.9) {
          bonds.push({ atom1: i, atom2: j, order: 1 });
        }
      }
    }
    return { atoms, bonds };
  }

  if (pdbData) {
    // Parse PDB format
    const parsedAtoms: Atom[] = [];
    const lines = pdbData.split('\n');

    for (const line of lines) {
      if (line.startsWith('ATOM') || line.startsWith('HETATM')) {
        const element = line.substring(76, 78).trim() || line.substring(12, 14).trim();
        const x = parseFloat(line.substring(30, 38));
        const y = parseFloat(line.substring(38, 46));
        const z = parseFloat(line.substring(46, 54));
        parsedAtoms.push({ element, x, y, z });
      }
    }

    // Generate bonds
    const bonds: Bond[] = [];
    for (let i = 0; i < parsedAtoms.length; i++) {
      for (let j = i + 1; j < parsedAtoms.length; j++) {
        const dx = parsedAtoms[i].x - parsedAtoms[j].x;
        const dy = parsedAtoms[i].y - parsedAtoms[j].y;
        const dz = parsedAtoms[i].z - parsedAtoms[j].z;
        const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (distance < 1.9) {
          bonds.push({ atom1: i, atom2: j, order: 1 });
        }
      }
    }

    return { atoms: parsedAtoms, bonds };
  }

  // Default demo molecule (caffeine-like structure)
  const demoAtoms: Atom[] = [
    { element: 'C', x: 0, y: 0, z: 0 },
    { element: 'C', x: 1.4, y: 0, z: 0 },
    { element: 'N', x: 2.1, y: 1.2, z: 0 },
    { element: 'C', x: 1.4, y: 2.4, z: 0 },
    { element: 'C', x: 0, y: 2.4, z: 0 },
    { element: 'N', x: -0.7, y: 1.2, z: 0 },
    { element: 'O', x: 2.1, y: -1.2, z: 0 },
    { element: 'N', x: -0.7, y: 3.6, z: 0 },
    { element: 'C', x: 0, y: 4.8, z: 0 },
    { element: 'N', x: 1.4, y: 4.8, z: 0 },
    { element: 'C', x: 2.1, y: 3.6, z: 0 },
    { element: 'O', x: 3.3, y: 3.6, z: 0 },
  ];

  const demoBonds: Bond[] = [
    { atom1: 0, atom2: 1, order: 1 },
    { atom1: 1, atom2: 2, order: 1 },
    { atom1: 2, atom2: 3, order: 1 },
    { atom1: 3, atom2: 4, order: 2 },
    { atom1: 4, atom2: 5, order: 1 },
    { atom1: 5, atom2: 0, order: 2 },
    { atom1: 1, atom2: 6, order: 2 },
    { atom1: 4, atom2: 7, order: 1 },
    { atom1: 7, atom2: 8, order: 1 },
    { atom1: 8, atom2: 9, order: 2 },
    { atom1: 9, atom2: 10, order: 1 },
    { atom1: 10, atom2: 3, order: 1 },
    { atom1: 10, atom2: 11, order: 2 },
  ];

  return { atoms: demoAtoms, bonds: demoBonds };
};

export const MoleculeViewer: React.FC<MoleculeViewerProps> = ({
  atoms: inputAtoms,
  bonds: inputBonds,
  smiles,
  pdbData,
  style = 'ball-stick',
  backgroundColor = colors.background.primary,
  rotationSpeed = 0.005,
  interactive = true,
  onLoad,
  onError,
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const timeoutRef = useRef<number>();
  const sceneRef = useRef<THREE.Scene>();
  const cameraRef = useRef<THREE.PerspectiveCamera>();
  const rendererRef = useRef<Renderer>();
  const moleculeGroupRef = useRef<THREE.Group>();

  const onContextCreate = async (gl: ExpoWebGLRenderingContext) => {
    try {
      // Parse molecule data
      const { atoms, bonds } = parseMoleculeData(inputAtoms, pdbData);

      // Create renderer
      const renderer = new Renderer({ gl });
      renderer.setSize(gl.drawingBufferWidth, gl.drawingBufferHeight);
      renderer.setClearColor(backgroundColor);
      rendererRef.current = renderer;

      // Create scene
      const scene = new THREE.Scene();
      sceneRef.current = scene;

      // Create camera
      const camera = new THREE.PerspectiveCamera(
        50,
        gl.drawingBufferWidth / gl.drawingBufferHeight,
        0.1,
        1000
      );
      camera.position.z = 15;
      cameraRef.current = camera;

      // Add lighting
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
      scene.add(ambientLight);

      const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
      directionalLight.position.set(10, 10, 10);
      scene.add(directionalLight);

      const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.4);
      directionalLight2.position.set(-10, -10, -10);
      scene.add(directionalLight2);

      // Create molecule group
      const moleculeGroup = new THREE.Group();
      moleculeGroupRef.current = moleculeGroup;

      // Calculate center of mass
      let centerX = 0, centerY = 0, centerZ = 0;
      for (const atom of atoms) {
        centerX += atom.x;
        centerY += atom.y;
        centerZ += atom.z;
      }
      centerX /= atoms.length;
      centerY /= atoms.length;
      centerZ /= atoms.length;

      // Create atoms
      for (const atom of atoms) {
        const color = ATOM_COLORS[atom.element] || ATOM_COLORS.default;
        const radius = (ATOM_RADII[atom.element] || ATOM_RADII.default) *
          (style === 'space-fill' ? 1.5 : 0.4);

        const geometry = new THREE.SphereGeometry(radius, 32, 32);
        const material = new THREE.MeshPhongMaterial({
          color,
          shininess: 100,
          specular: 0x444444,
        });

        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(
          atom.x - centerX,
          atom.y - centerY,
          atom.z - centerZ
        );

        moleculeGroup.add(mesh);
      }

      // Create bonds
      if (style !== 'space-fill') {
        for (const bond of bonds) {
          const atom1 = atoms[bond.atom1];
          const atom2 = atoms[bond.atom2];

          const start = new THREE.Vector3(
            atom1.x - centerX,
            atom1.y - centerY,
            atom1.z - centerZ
          );
          const end = new THREE.Vector3(
            atom2.x - centerX,
            atom2.y - centerY,
            atom2.z - centerZ
          );

          const direction = new THREE.Vector3().subVectors(end, start);
          const length = direction.length();

          const geometry = new THREE.CylinderGeometry(0.08, 0.08, length, 8);
          const material = new THREE.MeshPhongMaterial({
            color: 0x666666,
            shininess: 50,
          });

          const mesh = new THREE.Mesh(geometry, material);

          // Position and orient the cylinder
          mesh.position.copy(start.clone().add(direction.multiplyScalar(0.5)));
          mesh.lookAt(end);
          mesh.rotateX(Math.PI / 2);

          moleculeGroup.add(mesh);
        }
      }

      scene.add(moleculeGroup);

      setIsLoading(false);
      onLoad?.();

      // Animation loop
      const animate = () => {
        timeoutRef.current = requestAnimationFrame(animate);

        if (moleculeGroupRef.current && rotationSpeed > 0) {
          moleculeGroupRef.current.rotation.y += rotationSpeed;
          moleculeGroupRef.current.rotation.x += rotationSpeed * 0.3;
        }

        renderer.render(scene, camera);
        gl.endFrameEXP();
      };

      animate();
    } catch (error) {
      setIsLoading(false);
      onError?.(error as Error);
    }
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        cancelAnimationFrame(timeoutRef.current);
      }
    };
  }, []);

  return (
    <View style={styles.container}>
      <GLView
        style={styles.glView}
        onContextCreate={onContextCreate}
      />
      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={colors.primary[500]} />
          <Text style={styles.loadingText}>Loading molecule...</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  glView: {
    flex: 1,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.background.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: spacing[3],
    color: colors.text.secondary,
    fontSize: typography.sizes.sm,
  },
});

export default MoleculeViewer;
