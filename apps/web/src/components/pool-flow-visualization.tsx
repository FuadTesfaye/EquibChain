"use client";

import { useRef, useEffect, useState, useMemo } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Float, Text3D } from "@react-three/drei";
import * as THREE from "three";
import { motion } from "framer-motion";
import { ArrowRight, ArrowDown } from "lucide-react";

interface FlowNode {
  id: string;
  position: [number, number, number];
  targetPosition: [number, number, number];
  progress: number;
  label: string;
  color: string;
}

interface ConnectionLine {
  from: number;
  to: number;
  progress: number;
}

export function PoolFlowVisualization() {
  const groupRef = useRef<THREE.Group>(null);
  const [flowNodes, setFlowNodes] = useState<FlowNode[]>([]);
  const [connections, setConnections] = useState<ConnectionLine[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  // Initialize pool flow data
  useEffect(() => {
    const nodes: FlowNode[] = [
      {
        id: "create",
        position: [-8, 0, 0],
        targetPosition: [-4, 0, 0],
        progress: 1,
        label: "Create Pool",
        color: "#9945ff",
      },
      {
        id: "join",
        position: [-4, -2, 0],
        targetPosition: [0, -2, 0],
        progress: 1,
        label: "Join Pool",
        color: "#14f195",
      },
      {
        id: "contribute1",
        position: [4, -2, 0],
        targetPosition: [4, 0, 0],
        progress: 1,
        label: "Contribute",
        color: "#00d3aa",
      },
      {
        id: "contribute2",
        position: [4, -4, 0],
        targetPosition: [4, 0, 0],
        progress: 1,
        label: "Contribute",
        color: "#00d3aa",
      },
      {
        id: "contribute3",
        position: [4, -6, 0],
        targetPosition: [4, 0, 0],
        progress: 1,
        label: "Contribute",
        color: "#00d3aa",
      },
      {
        id: "disburse",
        position: [8, -8, 0],
        targetPosition: [8, -8, 0],
        progress: 1,
        label: "Disburse",
        color: "#ff6b35",
      },
      {
        id: "complete",
        position: [0, -10, 0],
        targetPosition: [0, -10, 0],
        progress: 1,
        label: "Complete",
        color: "#ffd700",
      },
    ];

    const lines: ConnectionLine[] = [
      { from: 0, to: 1, progress: 1 },
      { from: 1, to: 2, progress: 1 },
      { from: 2, to: 3, progress: 1 },
      { from: 3, to: 4, progress: 1 },
      { from: 4, to: 5, progress: 1 },
      { from: 5, to: 6, progress: 1 },
      { from: 6, to: 7, progress: 1 },
      { from: 7, to: 8, progress: 1 },
      { from: 8, to: 9, progress: 1 },
    ];

    setFlowNodes(nodes);
    setConnections(lines);
    setCurrentStep(0);
    setIsAnimating(true);
  }, []);

  useFrame((state) => {
    if (groupRef.current && isAnimating) {
      // Animate current step
      const time = state.clock.elapsedTime;
      
      groupRef.current.children.forEach((child, index) => {
        if (child instanceof THREE.Mesh && index <= currentStep) {
          const material = child.material as THREE.MeshStandardMaterial;
          material.emissiveIntensity = Math.sin(time * 2) * 0.5 + 0.5;
        }
        
        if (child instanceof THREE.Line && index < currentStep) {
          const material = child.material as THREE.LineBasicMaterial;
          material.opacity = Math.sin(time * 3) * 0.2 + 0.6;
        }
      });

      // Auto-advance through steps
      if (time > 2 && currentStep < 9) {
        setCurrentStep(currentStep + 1);
      }
    }
  });

  const nodeGeometry = useMemo(() => {
    return new THREE.SphereGeometry(0.5, 16, 16);
  }, []);

  const lineGeometry = useMemo(() => {
    return new THREE.CylinderGeometry(0.05, 1, 1, 8);
  }, []);

  return (
    <div className="w-full h-96 bg-gradient-to-br from-slate-900 to-slate-800 rounded-lg cinematic-border">
      <Canvas
        camera={{ position: [0, 0, 20], fov: 60 }}
        className="w-full h-full"
      >
        <ambientLight intensity={0.3} />
        <pointLight position={[10, 10, 10]} intensity={0.8} color="#9945ff" />
        <pointLight position={[-10, -10, -10]} intensity={0.4} color="#14f195" />
        
        <group ref={groupRef}>
          {/* Connection Lines */}
          {connections.map((line, index) => (
            <Float key={index} speed={1} rotationIntensity={0.5}>
              <mesh position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[16, 0.05, 1]} />
                <meshBasicMaterial
                  color="#9945ff"
                  opacity={line.progress * 0.8}
                  transparent
                />
              </mesh>
            </Float>
          ))}

          {/* Flow Nodes */}
          {flowNodes.map((node, index) => (
            <group key={node.id} position={node.position}>
              {/* Connection Point */}
              <mesh position={node.targetPosition}>
                <sphereGeometry args={[0.3, 16, 16]} />
                <meshStandardMaterial
                  color={node.color}
                  emissive={node.color}
                  emissiveIntensity={index <= currentStep ? 1 : 0.3}
                  roughness={0.3}
                  metalness={0.8}
                />
              </mesh>

              {/* Node Label */}
              <Text3D
                position={[0, 0.8, 0]}
                fontSize={0.4}
                color="#ffffff"
                anchorX="center"
                anchorY="middle"
              >
                {node.label}
              </Text3D>

              {/* Progress Ring */}
              {node.progress === 1 && (
                <mesh position={node.position} rotation={[Math.PI / 2, 0, 0]}>
                  <ringGeometry args={[0.8, 0.4, 8, 32]} />
                  <meshBasicMaterial
                    color="#14f195"
                    opacity={0.6}
                    transparent
                  />
                </mesh>
              )}
            </group>
          ))}
        </group>

        {/* Instructions */}
        <Float speed={2} floatIntensity={1}>
          <mesh position={[0, -12, 0]}>
            <boxGeometry args={[8, 2, 2]} />
            <meshStandardMaterial
              color="#ffd700"
              emissive="#ffd700"
              emissiveIntensity={0.5}
              roughness={0.2}
              metalness={0.9}
            />
          </mesh>
          <Text3D
            position={[0, -12, 0]}
            fontSize={0.6}
            color="#ffffff"
            anchorX="center"
            anchorY="middle"
          >
            Pool Flow Visualization
          </Text3D>
        </Float>
      </Canvas>

      {/* Step Indicators */}
      <div className="absolute bottom-8 left-8 right-8 flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <ArrowDown className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            Step {currentStep + 1} of {flowNodes.length}
          </span>
          <ArrowRight className="w-4 h-4 text-muted-foreground" />
        </div>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="btn-primary px-4 py-2"
          onClick={() => {
            if (currentStep > 0) {
              setCurrentStep(currentStep - 1);
            }
          }}
          disabled={currentStep === 0}
        >
          Previous
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="btn-primary px-4 py-2"
          onClick={() => {
            if (currentStep < flowNodes.length - 1) {
              setCurrentStep(currentStep + 1);
            }
          }}
          disabled={currentStep === flowNodes.length - 1}
        >
          Next
        </motion.button>
      </div>
    </div>
  );
}
