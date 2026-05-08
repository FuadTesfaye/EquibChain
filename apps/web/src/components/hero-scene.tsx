"use client";

import { useRef, useEffect, useState, useMemo } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Stars, Float, Text3D } from "@react-three/drei";
import { motion } from "framer-motion";
import * as THREE from "three";
import { useSolana } from "@/providers/solana-provider";

interface Particle {
  position: [number, number, number];
  velocity: [number, number, number];
  size: number;
  color: string;
}

interface ContributionNode {
  id: string;
  position: [number, number, number];
  targetPosition: [number, number, number];
  progress: number;
  amount: number;
}

export function HeroScene() {
  const meshRef = useRef<THREE.Group>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [particles, setParticles] = useState<Particle[]>([]);
  const [contributionNodes, setContributionNodes] = useState<ContributionNode[]>([]);
  const { connected } = useSolana();

  // Generate particles
  useEffect(() => {
    const newParticles: Particle[] = [];
    for (let i = 0; i < 200; i++) {
      newParticles.push({
        position: [
          (Math.random() - 0.5) * 20,
          (Math.random() - 0.5) * 10,
          (Math.random() - 0.5) * 20,
        ],
        velocity: [
          (Math.random() - 0.5) * 0.02,
          (Math.random() - 0.5) * 0.02,
          (Math.random() - 0.5) * 0.02,
        ],
        size: Math.random() * 0.5 + 0.5,
        color: Math.random() > 0.5 ? "#9945ff" : "#14f195",
      });
    }
    setParticles(newParticles);

    // Generate contribution nodes
    const nodes: ContributionNode[] = [];
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      const radius = 8;
      nodes.push({
        id: `node-${i}`,
        position: [
          Math.cos(angle) * radius,
          Math.sin(angle) * radius,
          Math.random() * 2 - 1,
        ],
        targetPosition: [
          Math.cos(angle + Math.PI) * radius * 0.5,
          Math.sin(angle + Math.PI) * radius * 0.5,
          Math.random() * 2 - 1,
        ],
        progress: Math.random(),
        amount: Math.floor(Math.random() * 1000) + 100,
      });
    }
    setContributionNodes(nodes);
  }, []);

  // Handle mouse movement
  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      setMousePosition({
        x: (event.clientX / window.innerWidth) * 2 - 1,
        y: -(event.clientY / window.innerHeight) * 2 + 1,
      });
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  useFrame((state) => {
    if (meshRef.current) {
      // Rotate the entire scene slowly
      meshRef.current.rotation.y += 0.002;
      
      // Animate particles
      particles.forEach((particle, index) => {
        particle.position[0] += particle.velocity[0];
        particle.position[1] += particle.velocity[1];
        particle.position[2] += particle.velocity[2];
        
        // Wrap particles around boundaries
        if (Math.abs(particle.position[0]) > 10) {
          particle.position[0] = -particle.position[0];
        }
        if (Math.abs(particle.position[1]) > 5) {
          particle.position[1] = -particle.position[1];
        }
        if (Math.abs(particle.position[2]) > 10) {
          particle.position[2] = -particle.position[2];
        }
      });

      // Animate contribution nodes
      contributionNodes.forEach((node, index) => {
        const time = state.clock.elapsedTime;
        const floatY = Math.sin(time * 0.5 + index) * 0.5;
        const floatX = Math.cos(time * 0.3 + index) * 0.2;
        
        node.position[1] = node.position[1] + floatY;
        node.position[0] = node.position[0] + floatX;
        
        // Rotate nodes
        const rotationSpeed = connected ? 0.01 : 0.005;
        meshRef.current.children[index + 1].rotation.y += rotationSpeed;
        
        // Update progress animation
        if (node.progress < 1) {
          node.progress += 0.005;
        }
      });
    }
  });

  const particleGeometry = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particles.length * 3);
    const colors = new Float32Array(particles.length * 3);
    const sizes = new Float32Array(particles.length);

    particles.forEach((particle, i) => {
      positions[i * 3] = particle.position[0];
      positions[i * 3 + 1] = particle.position[1];
      positions[i * 3 + 2] = particle.position[2];
      
      colors[i * 3] = ...new THREE.Color(particle.color).toArray();
      sizes[i] = particle.size;
    });

    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute("size", new THREE.BufferAttribute(sizes, 1));
    
    return geometry;
  }, [particles]);

  return (
    <div className="absolute inset-0 z-0">
      <Canvas
        camera={{ position: [0, 0, 20], fov: 75 }}
        className="bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900"
      >
        {/* Lighting */}
        <ambientLight intensity={0.3} color="#9945ff" />
        <pointLight position={[10, 10, 10]} intensity={1} color="#14f195" />
        <pointLight position={[-10, -10, -10]} intensity={0.5} color="#00d3aa" />
        <pointLight position={[0, 0, 10]} intensity={0.8} color="#ff6b35" />
        
        {/* Animated Background Stars */}
        <Stars
          radius={100}
          depth={50}
          count={5000}
          factor={4}
          saturation={0}
          fade
          speed={1}
        />

        {/* Particle System */}
        <points geometry={particleGeometry} material={particleMaterial}>
          {particles.map((particle, index) => (
            <div key={index} />
          ))}
        </points>

        {/* Contribution Nodes */}
        <group ref={meshRef}>
          {contributionNodes.map((node, index) => (
            <group key={node.id} position={node.position}>
              {/* Connection Lines */}
              <line
                points={[
                  new THREE.Vector3(...node.position),
                  new THREE.Vector3(...node.targetPosition),
                ]}
                color="#9945ff"
                opacity={0.3}
              />
              
              {/* Node Sphere */}
              <Float speed={2} rotationIntensity={1} floatIntensity={2}>
                <mesh>
                  <sphereGeometry args={[0.3, 16, 16]} />
                  <meshStandardMaterial
                    color="#9945ff"
                    emissive="#9945ff"
                    emissiveIntensity={0.5}
                    roughness={0.3}
                    metalness={0.8}
                  />
                </mesh>
              </Float>
              
              {/* Progress Ring */}
              <mesh rotation={[Math.PI / 2, 0, 0]}>
                <ringGeometry args={[0.5, 0.5, 8, 32]} />
                <meshBasicMaterial
                  color="#14f195"
                  opacity={0.6}
                  transparent
                />
              </mesh>
              
              {/* Amount Label */}
              <Text3D
                position={[0, 0.8, 0]}
                fontSize={0.3}
                color="#ffffff"
                anchorX="center"
                anchorY="middle"
              >
                ${node.amount} USDC
              </Text3D>
            </group>
          ))}
        </group>

        {/* Central Logo/Text */}
        <Float speed={3} rotationIntensity={1} floatIntensity={1}>
          <mesh position={[0, 0, 0]}>
            <boxGeometry args={[2, 2, 2]} />
            <meshStandardMaterial
              color="#ffd700"
              emissive="#ffd700"
              emissiveIntensity={0.8}
              roughness={0.2}
              metalness={0.9}
            />
          </mesh>
        </Float>

        <Text3D
          position={[0, 1.5, 0]}
          fontSize={0.8}
          color="#ffffff"
          anchorX="center"
          anchorY="middle"
        >
          EqubChain
        </Text3D>

        {/* Camera Controls */}
        <OrbitControls
          enableZoom={false}
          enablePan={false}
          minDistance={15}
          maxDistance={25}
          minPolarAngle={Math.PI / 3}
          maxPolarAngle={Math.PI / 1.5}
          autoRotate
          autoRotateSpeed={0.5}
        />
      </Canvas>
    </div>
  );
}

const particleMaterial = useMemo(() => {
  return new THREE.PointsMaterial({
    size: 0.1,
    vertexColors: true,
    blending: THREE.AdditiveBlending,
    transparent: true,
    opacity: 0.8,
    sizeAttenuation: true,
  });
}, []);
