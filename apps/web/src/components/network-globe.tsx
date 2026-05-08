"use client";

import { useRef, useMemo, useEffect } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Sphere } from "@react-three/drei";
import * as THREE from "three";
import { useSolana } from "@/providers/solana-provider";

interface NetworkNode {
  id: string;
  position: [number, number, number];
  connections: string[];
  activity: number;
  color: string;
}

export function NetworkGlobe() {
  const globeRef = useRef<THREE.Group>(null);
  const [nodes, setNodes] = useState<NetworkNode[]>([]);
  const [connections, setConnections] = useState<[number, number, number][]>([]);
  const { connected } = useSolana();

  // Generate network nodes
  useEffect(() => {
    const newNodes: NetworkNode[] = [];
    const nodeCount = 50;
    
    for (let i = 0; i < nodeCount; i++) {
      const phi = Math.acos(-1 + (2 * i) / nodeCount);
      const theta = Math.sqrt(nodeCount * Math.PI - phi * phi);
      
      const x = 15 * Math.sin(theta) * Math.cos(phi);
      const y = 15 * Math.sin(theta) * Math.sin(phi);
      const z = 15 * Math.cos(theta);
      
      newNodes.push({
        id: `node-${i}`,
        position: [x, y, z],
        connections: [],
        activity: Math.random(),
        color: Math.random() > 0.5 ? "#9945ff" : "#14f195",
      });
    }
    
    // Generate connections
    const newConnections: [number, number, number][] = [];
    for (let i = 0; i < nodeCount; i++) {
      const node1 = newNodes[i];
      const connectionCount = Math.floor(Math.random() * 3) + 1;
      
      for (let j = 0; j < connectionCount; j++) {
        const targetIndex = Math.floor(Math.random() * nodeCount);
        if (targetIndex !== i) {
          newConnections.push([i, targetIndex]);
          node1.connections.push(`node-${targetIndex}`);
        }
      }
    }
    
    setNodes(newNodes);
    setConnections(newConnections);
  }, []);

  useFrame((state) => {
    if (globeRef.current) {
      // Rotate the globe
      globeRef.current.rotation.y += 0.001;
      
      // Animate node activities
      globeRef.current.children.forEach((child, index) => {
        if (child instanceof THREE.Mesh && index < nodes.length) {
          const node = nodes[index];
          const material = child.material as THREE.MeshStandardMaterial;
          
          // Pulse effect based on activity
          const pulseIntensity = Math.sin(state.clock.elapsedTime * 2 + index) * 0.5 + 0.5;
          material.emissiveIntensity = node.activity * pulseIntensity;
          
          // Rotate nodes
          child.rotation.y += 0.01 * (node.activity + 0.5);
        }
      });
    }
  });

  const globeGeometry = useMemo(() => {
    return new THREE.SphereGeometry(15, 32, 32);
  }, []);

  const globeMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: "#1a1a2a",
      roughness: 0.8,
      metalness: 0.2,
      wireframe: true,
      wireframeLinewidth: 0.5,
    });
  }, []);

  const lineMaterial = useMemo(() => {
    return new THREE.LineBasicMaterial({
      color: "#9945ff",
      opacity: 0.3,
      transparent: true,
    });
  }, []);

  return (
    <group ref={globeRef}>
      {/* Globe */}
      <Sphere args={[15, 32, 32]} material={globeMaterial}>
        <meshStandardMaterial
          color="#1a1a2a"
          roughness={0.8}
          metalness={0.2}
          wireframe={false}
        />
      </Sphere>

      {/* Network Nodes */}
      {nodes.map((node, index) => (
        <mesh key={node.id} position={node.position}>
          <sphereGeometry args={[0.3, 16, 16]} />
          <meshStandardMaterial
            color={node.color}
            emissive={node.color}
            emissiveIntensity={node.activity}
            roughness={0.3}
            metalness={0.8}
          />
        </mesh>
      ))}

      {/* Connections */}
      {connections.map(([from, to], index) => (
        <line
          key={`connection-${index}`}
          points={[nodes[from].position, nodes[to].position]}
          material={lineMaterial}
        />
      ))}

      {/* Orbit Controls */}
      <OrbitControls
        enableZoom={false}
        enablePan={false}
        minDistance={20}
        maxDistance={40}
        autoRotate
        autoRotateSpeed={connected ? 0.5 : 0.1}
        minPolarAngle={Math.PI / 4}
        maxPolarAngle={Math.PI / 1.5}
      />
    </group>
  );
}
