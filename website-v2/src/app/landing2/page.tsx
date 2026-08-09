"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, useMotionValue, useTransform } from "framer-motion";
import { Zap, Play, Check, Terminal, Download, Globe, Star, ArrowRight, ShieldCheck, QrCode, Smartphone, Laptop, FileCode, RefreshCw, Wifi } from "lucide-react";
import Link from "next/link";
import * as THREE from "three";
import { QRCodeCanvas } from "qrcode.react";

// ─── HELPER HOOKS & UTILITIES ───
const useMagnetic = () => {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const ref = useRef<HTMLButtonElement>(null);

  const handleMouseMove = (e: MouseEvent) => {
    if (!ref.current) return;
    const { clientX, clientY } = e;
    const { left, top, width, height } = ref.current.getBoundingClientRect();
    const x = clientX - (left + width / 2);
    const y = clientY - (top + height / 2);
    setPosition({ x: x * 0.35, y: y * 0.35 });
  };

  const handleMouseLeave = () => {
    setPosition({ x: 0, y: 0 });
  };

  return { ref, position, handleMouseMove, handleMouseLeave };
};

const StatCountUp = ({ to, duration = 1.5 }: { to: number; duration?: number }) => {
  const [val, setVal] = useState(0);
  
  useEffect(() => {
    let start = 0;
    const end = to;
    const totalMiliseconds = duration * 1000;
    const stepTime = 16; // ~60fps
    const totalSteps = totalMiliseconds / stepTime;
    const increment = (end - start) / totalSteps;
    
    let currentStep = 0;
    const timer = setInterval(() => {
      currentStep++;
      setVal(prev => {
        const next = prev + increment;
        if (currentStep >= totalSteps) {
          clearInterval(timer);
          return end;
        }
        return next;
      });
    }, stepTime);
    
    return () => clearInterval(timer);
  }, [to, duration]);

  return <span>{val.toFixed(1)}</span>;
};

// ─── THREE.JS INTERACTIVE CONNECTION LINE ───
interface ConnectionLineProps {
  startRef: React.RefObject<HTMLDivElement | null>;
  endRef: React.RefObject<HTMLSpanElement | null>;
  containerRef: React.RefObject<HTMLDivElement | null>;
}

const ConnectionLine3D: React.FC<ConnectionLineProps> = ({ startRef, endRef, containerRef }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hoverT = useRef(0);
  const hoverIntensity = useRef(0);
  const trailT = useRef<number[]>(Array(10).fill(0));

  useEffect(() => {
    if (!canvasRef.current || !startRef.current || !endRef.current || !containerRef.current) return;

    const canvas = canvasRef.current;
    const container = containerRef.current;

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(
      0, container.clientWidth,
      0, -container.clientHeight,
      1, 1000
    );
    camera.position.z = 100;

    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true
    });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const numPoints = 35;
    const dotGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(numPoints * 3);
    const colors = new Float32Array(numPoints * 3);
    const sizes = new Float32Array(numPoints);
    
    dotGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    dotGeometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    dotGeometry.setAttribute("size", new THREE.BufferAttribute(sizes, 1));

    const createCircleTexture = () => {
      const canvasEl = document.createElement("canvas");
      canvasEl.width = 32;
      canvasEl.height = 32;
      const ctx = canvasEl.getContext("2d");
      if (ctx) {
        ctx.beginPath();
        ctx.arc(16, 16, 12, 0, 2 * Math.PI);
        ctx.fillStyle = "#ffffff";
        ctx.fill();
      }
      return new THREE.CanvasTexture(canvasEl);
    };

    const dotMaterial = new THREE.ShaderMaterial({
      uniforms: {
        pointTexture: { value: createCircleTexture() }
      },
      vertexShader: `
        attribute float size;
        attribute vec3 color;
        varying vec3 vColor;
        void main() {
          vColor = color;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size;
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform sampler2D pointTexture;
        varying vec3 vColor;
        void main() {
          vec4 texColor = texture2D(pointTexture, gl_PointCoord);
          if (texColor.a < 0.1) discard;
          gl_FragColor = vec4(vColor, 1.0) * texColor;
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.NormalBlending
    });

    const pointsMesh = new THREE.Points(dotGeometry, dotMaterial);
    scene.add(pointsMesh);

    const mouse = { x: 0, y: 0, targetX: 0, targetY: 0, isOver: false };
    
    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      mouse.targetX = e.clientX - rect.left;
      mouse.targetY = e.clientY - rect.top;
      mouse.isOver = true;
    };

    const handleMouseLeave = () => {
      mouse.isOver = false;
    };

    container.addEventListener("mousemove", handleMouseMove);
    container.addEventListener("mouseleave", handleMouseLeave);

    const cpOffset = { x: 0, y: 0, targetX: 0, targetY: 0, vx: 0, vy: 0 };
    const springK = 0.08;
    const drag = 0.85;

    let time = 0;

    const animate = () => {
      if (!startRef.current || !endRef.current) return;

      time += 0.05;

      const width = container.clientWidth;
      const height = container.clientHeight;
      if (canvas.width !== width || canvas.height !== height) {
        renderer.setSize(width, height);
        camera.right = width;
        camera.bottom = -height;
        camera.updateProjectionMatrix();
      }

      const containerRect = container.getBoundingClientRect();
      const startRect = startRef.current.getBoundingClientRect();
      const endRect = endRef.current.getBoundingClientRect();

      const p0 = {
        x: startRect.left + startRect.width / 2 - containerRect.left,
        y: startRect.top + startRect.height / 2 - containerRect.top
      };

      const p2 = {
        x: endRect.left + endRect.width / 2 - containerRect.left,
        y: endRect.top + endRect.height / 2 - containerRect.top
      };

      const deltaX = p2.x - p0.x;
      const cp1 = { x: p0.x + deltaX * 0.45, y: p0.y };
      const cp2 = { x: p0.x + deltaX * 0.55, y: p2.y };

      mouse.x += (mouse.targetX - mouse.x) * 0.1;
      mouse.y += (mouse.targetY - mouse.y) * 0.1;

      const midX = (p0.x + p2.x) / 2;
      const midY = (p0.y + p2.y) / 2;
      const distToMid = Math.hypot(mouse.x - midX, mouse.y - midY);

      if (mouse.isOver && distToMid < 250) {
        const pull = (1 - distToMid / 250) * 0.6;
        cpOffset.targetX = (mouse.x - midX) * pull;
        cpOffset.targetY = (mouse.y - midY) * pull;
      } else {
        cpOffset.targetX = 0;
        cpOffset.targetY = 0;
      }

      const ax = (cpOffset.targetX - cpOffset.x) * springK;
      const ay = (cpOffset.targetY - cpOffset.y) * springK;
      cpOffset.vx = (cpOffset.vx + ax) * drag;
      cpOffset.vy = (cpOffset.vy + ay) * drag;
      cpOffset.x += cpOffset.vx;
      cpOffset.y += cpOffset.vy;

      cp1.x += cpOffset.x * 0.5;
      cp1.y += cpOffset.y * 0.5;
      cp2.x += cpOffset.x * 0.5;
      cp2.y += cpOffset.y * 0.5;

      const targetT = Math.max(0, Math.min(1, (mouse.x - p0.x) / deltaX));
      hoverT.current += (targetT - hoverT.current) * 0.15;

      const targetIntensity = mouse.isOver ? 1.0 : 0.0;
      hoverIntensity.current += (targetIntensity - hoverIntensity.current) * 0.1;

      trailT.current.unshift(hoverT.current);
      if (trailT.current.length > 8) {
        trailT.current.pop();
      }

      const posAttr = dotGeometry.attributes.position as THREE.BufferAttribute;
      const colAttr = dotGeometry.attributes.color as THREE.BufferAttribute;
      const sizeAttr = dotGeometry.attributes.size as THREE.BufferAttribute;

      const baseR = 0.56, baseG = 0.53, baseB = 1.0; // Lavender Purple (#8F89FF)
      const hoverR = 0.75, hoverG = 0.5, hoverB = 1.0; // Dynamic Purple

      const autoPulseIndex = (time * 10) % numPoints;

      for (let i = 0; i < numPoints; i++) {
        const t = i / (numPoints - 1);
        const u = 1 - t;
        const x = u*u*u * p0.x + 3 * u*u * t * cp1.x + 3 * u * t*t * cp2.x + t*t*t * p2.x;
        const y = u*u*u * p0.y + 3 * u*u * t * cp1.y + 3 * u * t*t * cp2.y + t*t*t * p2.y;
        
        posAttr.setXYZ(i, x, -y, 0);

        let size = 5.0;
        let r = baseR;
        let g = baseG;
        let b = baseB;

        const distToAutoPulse = Math.abs(i - autoPulseIndex);
        if (distToAutoPulse < 3) {
          const autoGlow = (3 - distToAutoPulse) * 2.0;
          size += autoGlow;
          r = THREE.MathUtils.lerp(r, 1.0, autoGlow / 12);
          g = THREE.MathUtils.lerp(g, 0.8, autoGlow / 12);
          b = THREE.MathUtils.lerp(b, 0.4, autoGlow / 12);
        }

        const distToHover = Math.abs(t - hoverT.current) * numPoints;
        if (distToHover < 6) {
          const hoverGlow = (6 - distToHover) * 4.0 * hoverIntensity.current;
          size += hoverGlow;
          r = THREE.MathUtils.lerp(r, hoverR, hoverIntensity.current);
          g = THREE.MathUtils.lerp(g, hoverG, hoverIntensity.current);
          b = THREE.MathUtils.lerp(b, hoverB, hoverIntensity.current);
        }

        for (let j = 0; j < trailT.current.length; j++) {
          const trailVal = trailT.current[j];
          const distToTrail = Math.abs(t - trailVal) * numPoints;
          if (distToTrail < 4) {
            const trailGlow = (4 - distToTrail) * 2.0 * hoverIntensity.current * (1 - j / trailT.current.length);
            size += trailGlow;
            r = THREE.MathUtils.lerp(r, hoverR, hoverIntensity.current * 0.6);
            g = THREE.MathUtils.lerp(g, hoverG, hoverIntensity.current * 0.6);
            b = THREE.MathUtils.lerp(b, hoverB, hoverIntensity.current * 0.6);
          }
        }

        sizeAttr.setX(i, size);
        colAttr.setXYZ(i, r, g, b);
      }

      posAttr.needsUpdate = true;
      colAttr.needsUpdate = true;
      sizeAttr.needsUpdate = true;

      renderer.render(scene, camera);
    };

    const ticker = () => {
      animate();
      tickerId = requestAnimationFrame(ticker);
    };

    let tickerId = requestAnimationFrame(ticker);

    return () => {
      container.removeEventListener("mousemove", handleMouseMove);
      container.removeEventListener("mouseleave", handleMouseLeave);
      cancelAnimationFrame(tickerId);
      renderer.dispose();
      dotGeometry.dispose();
      dotMaterial.dispose();
    };
  }, [startRef, endRef, containerRef]);

  return <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none z-30" />;
};

const MOCK_SESSIONS = [
  {
    id: "session-1",
    title: "Data Structures & Algorithms",
    code: "DSA-2026",
    questions: [
      { id: "q1", title: "Implement Binary Search Tree", code: "class BSTNode {\n  int val;\n  BSTNode left, right;\n}" },
      { id: "q2", title: "Merge Sort Recursive", code: "void mergeSort(int[] arr, int l, int r) {\n  // recursion\n}" }
    ]
  },
  {
    id: "session-2",
    title: "Java Object Oriented Programming",
    code: "JAVA-OOP",
    questions: [
      { id: "q1", title: "Method Overriding Demo", code: "@Override\npublic void display() {\n  super.display();\n}" },
      { id: "q2", title: "Custom Exception Class", code: "class InvalidExamException extends Exception {\n  // constructor\n}" }
    ]
  },
  {
    id: "session-3",
    title: "Database Management Systems",
    code: "DBMS-301",
    questions: [
      { id: "q1", title: "SQL Transaction Commit", code: "BEGIN TRANSACTION;\nUPDATE accounts SET bal = bal - 100;\nCOMMIT;" }
    ]
  }
];

// ─── MAIN LANDING PAGE ───
type VariantType = "developer" | "creative" | "secure";

interface Preset {
  label: string;
  type: string;
  payload: string;
}

export default function Landing2() {
  const [activeVariant, setActiveVariant] = useState<VariantType>("developer");
  const [phoneText, setPhoneText] = useState("Type script or");
  const [terminalLines, setTerminalLines] = useState<string[]>([
    "~/projects/lanpad-dev",
    "$ npm run dev",
    "[LANpad] Listening on port 8008",
    "[P2P] Verified peer key: SHA256:4a88f..."
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const [isCurtainOpen, setIsCurtainOpen] = useState(false);
  
  // Clay Toggles
  const [toggles, setToggles] = useState({
    flashMode: true,
    injectMode: false,
    liveSync: true
  });

  const [bridgeStatus, setBridgeStatus] = useState<"offline" | "connecting" | "online">("offline");

  const handleInitBridge = () => {
    if (bridgeStatus !== "offline") return;
    setBridgeStatus("connecting");
    setTerminalLines(prev => [
      ...prev,
      "[Bridge] Initializing local bridge loop...",
      "[Bridge] Resolving localhost socket handshake..."
    ]);
    setTimeout(() => {
      setBridgeStatus("online");
      setTerminalLines(prev => [
        ...prev,
        "[Bridge] Status: SECURE_TUNNEL_ESTABLISHED (sub-50ms latency)"
      ]);
    }, 1500);
  };

  const typingTimer = useRef<NodeJS.Timeout | null>(null);

  // References for three.js connection line
  const containerRef = useRef<HTMLDivElement>(null);
  const startAnchorRef = useRef<HTMLDivElement>(null);
  const endAnchorRef = useRef<HTMLSpanElement>(null);

  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [showNavbar, setShowNavbar] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [openFaqIdx, setOpenFaqIdx] = useState<number | null>(null);

  // Global Cursor Spotlight Motion Values
  const globalMouseX = useMotionValue(0);
  const globalMouseY = useMotionValue(0);

  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      globalMouseX.set(e.clientX);
      globalMouseY.set(e.clientY);
    };
    window.addEventListener("mousemove", handleGlobalMouseMove);
    return () => window.removeEventListener("mousemove", handleGlobalMouseMove);
  }, [globalMouseX, globalMouseY]);

  // QR & Code Bank states
  const [qrSyncStatus, setQrSyncStatus] = useState<"unlinked" | "scanning" | "linked">("unlinked");
  const [activeCodeBankIdx, setActiveCodeBankIdx] = useState(0);
  const [codeBankConsoleLines, setCodeBankConsoleLines] = useState<string[]>([
    "~/projects/vit-ap-codebank",
    "[OTA] Core: Ready to receive code packets"
  ]);
  const [isDispatchingCode, setIsDispatchingCode] = useState(false);
  const [dispatchedParticleText, setDispatchedParticleText] = useState("");
  const [flyingParticles, setFlyingParticles] = useState<{ id: number; text: string }[]>([]);

  const handleQrSync = () => {
    if (qrSyncStatus !== "unlinked") return;
    setQrSyncStatus("scanning");
    setTimeout(() => {
      setQrSyncStatus("linked");
      setTerminalLines(prev => [
        ...prev,
        "[OTA] Secure peer paired via QR scan: SHA256:8f2a3..."
      ]);
    }, 1200);
  };

  const handleDispatchCode = (code: string, questionTitle: string) => {
    if (isDispatchingCode) return;
    setIsDispatchingCode(true);
    setDispatchedParticleText(code);
    
    // Trigger flying particle
    const pId = Date.now();
    setFlyingParticles(prev => [...prev, { id: pId, text: code }]);
    
    setCodeBankConsoleLines(prev => [
      ...prev,
      `[OTA] Initiating dispatch for: ${questionTitle}...`
    ]);

    setTimeout(() => {
      setFlyingParticles(prev => prev.filter(p => p.id !== pId));
      setCodeBankConsoleLines(prev => [
        ...prev,
        `[OTA] Decrypting package... OK`,
        `[OTA] Injected ${code.split("\n").length} lines of code into host clipboard.`
      ]);
      setIsDispatchingCode(false);
    }, 950);
  };

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY > lastScrollY && currentScrollY > 80) {
        setShowNavbar(false);
      } else {
        setShowNavbar(true);
      }
      setLastScrollY(currentScrollY);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [lastScrollY]);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const y = ((e.clientY - rect.top) / rect.height) * 2 - 1;
    setMousePos({ x, y });
  };

  const handleMouseLeave = () => {
    setMousePos({ x: 0, y: 0 });
  };

  const renderStaggeredHeadline = (text: string) => {
    const words = text.split(" ");
    return (
      <span className="block">
        {words.map((word, i) => (
          <motion.span
            key={i}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.6,
              delay: i * 0.08,
              ease: [0.16, 1, 0.3, 1]
            }}
            className="inline-block mr-4 select-none"
          >
            {word}
          </motion.span>
        ))}
      </span>
    );
  };

  useEffect(() => {
    resetTerminal();
  }, [activeVariant]);

  const resetTerminal = () => {
    if (typingTimer.current) clearInterval(typingTimer.current);
    setIsTyping(false);
    
    if (activeVariant === "developer") {
      setPhoneText("Type text here...");
      setTerminalLines([
        "~/projects/app",
        "$ npm run dev",
        "[LANpad] Started on port 8008",
        "[P2P] Connected to computer..."
      ]);
    } else if (activeVariant === "creative") {
      setPhoneText("Tap presets below...");
      setTerminalLines([
        "design // local bridge",
        "[Design] Connected to computer",
        "[Shortcuts] Loaded 12 rules",
        "[Status] Ready to run..."
      ]);
    } else {
      setPhoneText("Copying password...");
      setTerminalLines([
        "secure // input node",
        "[Secure] Running only on local computer",
        "[Secure] Safe typing mode active",
        "[Status] Connected and safe..."
      ]);
    }
  };

  const runPresetAnimation = (text: string) => {
    if (isTyping) return;
    setIsTyping(true);
    setPhoneText("");
    
    setTerminalLines(prev => [...prev, `$ `]);
    
    let index = 0;
    const interval = setInterval(() => {
      if (index < text.length) {
        const char = text[index];
        setPhoneText(prev => prev + char);
        
        setTerminalLines(prev => {
          const updated = [...prev];
          updated[updated.length - 1] += char;
          return updated;
        });
        
        index++;
      } else {
        clearInterval(interval);
        setIsTyping(false);
        setTimeout(() => {
          setTerminalLines(prev => [
            ...prev,
            activeVariant === "developer" 
              ? `[LANpad] Sent text in sub-50ms` 
              : activeVariant === "creative"
              ? `[Shortcuts] Done: ${text}`
              : `[Secure] Sent safely (memory cleared)`
          ]);
        }, 300);
      }
    }, 60);
    
    typingTimer.current = interval;
  };

  const handlePhoneInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isTyping) return;
    const val = e.target.value;
    setPhoneText(val);

    setTerminalLines(prev => {
      const updated = [...prev];
      const baseLines = prev.slice(0, 4);
      return [...baseLines, `$ ${val}`];
    });
  };

  const getPresets = (): Preset[] => {
    if (activeVariant === "developer") {
      return [
        { label: "Code", type: "snippet", payload: "let x = 100;" },
        { label: "Git", type: "cmd", payload: "git commit -m 'save'" },
        { label: "Start", type: "cmd", payload: "npm start" }
      ];
    } else if (activeVariant === "creative") {
      return [
        { label: "Group", type: "macro", payload: "Group Items" },
        { label: "Export", type: "macro", payload: "Export Image" },
        { label: "Undo", type: "hotkey", payload: "Undo Action" }
      ];
    } else {
      return [
        { label: "Key", type: "credential", payload: "ssh-key-12345" },
        { label: "Files", type: "token", payload: "decrypt files" }
      ];
    }
  };

  const copyCommandToClipboard = (cmd: string) => {
    navigator.clipboard.writeText(cmd);
    alert("Install command copied to clipboard!");
  };

  return (
    <div className="min-h-screen bg-[#EDEAE0] text-gray-900 font-dmsans relative overflow-x-hidden antialiased">
      
      {/* Premium Cursor Spotlight Overlay */}
      <motion.div
        className="pointer-events-none fixed inset-0 z-30 transition-opacity duration-300 hidden md:block"
        style={{
          background: useTransform(
            [globalMouseX, globalMouseY],
            ([x, y]) => `radial-gradient(400px at ${x}px ${y}px, rgba(70, 143, 234, 0.08) 0%, rgba(242, 133, 0, 0.02) 45%, transparent 80%)`
          )
        }}
      />
      
      {/* Dynamic Clay Style Injections */}
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Rubik:wght@700;900&family=DM+Sans:wght@400;500;700&display=swap');
        
        .font-rubik {
          font-family: 'Rubik', sans-serif;
        }
        .font-dmsans {
          font-family: 'DM Sans', sans-serif;
        }

        .clay-card {
          background: #EDEAE0;
          border-radius: 40px;
          box-shadow: 
            20px 20px 40px rgba(0,0,0,0.06), 
            -20px -20px 40px rgba(255,255,255,1),
            inset 6px 6px 12px rgba(255,255,255,0.9),
            inset -6px -6px 12px rgba(0,0,0,0.04);
        }

        .clay-card-inset {
          background: #EDEAE0;
          box-shadow: 
            inset 4px 4px 8px rgba(0,0,0,0.04),
            inset -4px -4px 8px rgba(255,255,255,0.8);
          border: 1px solid rgba(255,255,255,0.2);
        }

        .clay-blue {
          background: #468FEA;
          box-shadow: 
            16px 16px 32px rgba(70, 143, 234, 0.2),
            inset 8px 8px 16px rgba(255,255,255,0.3),
            inset -8px -8px 16px rgba(0,0,0,0.12);
        }

        .clay-orange {
          background: #F28500;
          box-shadow: 
            16px 16px 32px rgba(242, 133, 0, 0.2),
            inset 10px 10px 20px rgba(255,255,255,0.4),
            inset -10px -10px 20px rgba(0,0,0,0.15);
        }

        @keyframes bob {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        
        .animate-bob { animation: bob 4s ease-in-out infinite; }
        .animate-bob-delayed { animation: bob 4s ease-in-out 1.2s infinite; }
        .animate-bob-slow { animation: bob 5.5s ease-in-out 0.6s infinite; }

        .isometric-stack {
          perspective: 1500px;
          transform-style: preserve-3d;
        }

        .slab {
          width: 280px;
          height: 180px;
          position: absolute;
          border-radius: 32px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          transform: rotateX(45deg) rotateZ(-35deg);
          transition: all 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }

        .isometric-stack:hover .slab-top {
          transform: rotateX(45deg) rotateZ(-35deg) translateZ(150px) translateY(-15px) translateX(15px) !important;
        }
        .isometric-stack:hover .slab-mid {
          transform: rotateX(45deg) rotateZ(-35deg) translateZ(30px) !important;
        }
        .isometric-stack:hover .slab-bot {
          transform: rotateX(45deg) rotateZ(-35deg) translateZ(-90px) translateY(15px) translateX(-15px) !important;
        }

        .curtain-panel {
          position: absolute;
          top: 0;
          width: 50%;
          height: 100%;
          background: #EDEAE0;
          z-index: 20;
          display: flex;
          align-items: center;
          transition: transform 0.9s cubic-bezier(0.77, 0, 0.175, 1);
        }

        .blueprint-grid {
          background-size: 30px 30px;
          background-image: 
            linear-gradient(to right, rgba(99, 102, 241, 0.04) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(99, 102, 241, 0.04) 1px, transparent 1px);
        }

        @keyframes marquee-vertical {
          0% { transform: translateY(0%); }
          100% { transform: translateY(-50%); }
        }
        .animate-marquee-vertical {
          animation: marquee-vertical 24s linear infinite;
        }
        .animate-marquee-vertical:hover {
          animation-play-state: paused;
        }
      `}</style>

      {/* ─── NAVBAR ─── */}
      <motion.nav 
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: showNavbar ? 0 : -100, opacity: showNavbar ? 1 : 0 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="sticky top-6 z-50 px-8 py-3 flex justify-between items-center max-w-7xl mx-auto backdrop-blur-md bg-[#EDEAE0]/75 rounded-[32px] border border-white/20 shadow-[0_8px_32px_0_rgba(0,0,0,0.03)]"
      >
        <div className="clay-card px-6 py-3 flex items-center gap-2.5">
          <div className="w-8 h-8 clay-orange rounded-full flex items-center justify-center">
            <span className="text-white font-black font-rubik text-sm">L</span>
          </div>
          <span className="font-rubik font-black text-xl tracking-tight">LANpad</span>
        </div>
        
        <div className="clay-card px-3 py-2 flex items-center gap-1.5 hidden md:flex relative">
          {[
            { id: "developer", label: "Developer Launch" },
            { id: "creative", label: "Creative Workspace" },
            { id: "secure", label: "Secure Enterprise" }
          ].map((tab) => {
            const isActive = activeVariant === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveVariant(tab.id as VariantType)}
                className={`font-black text-xs uppercase tracking-wider px-5 py-2.5 rounded-full transition-colors relative z-10 ${
                  isActive ? "text-white" : "text-gray-500 hover:text-gray-800"
                }`}
              >
                {tab.label}
                {isActive && (
                  <motion.div
                    layoutId="activeTabPill"
                    className="absolute inset-0 bg-[#468FEA] rounded-full -z-10 shadow-[inset_2px_2px_4px_rgba(255,255,255,0.25),4px_4px_8px_rgba(70,143,234,0.15)]"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
              </button>
            );
          })}
        </div>
        
        <button 
          onClick={() => setActiveVariant(activeVariant === "developer" ? "creative" : activeVariant === "creative" ? "secure" : "developer")}
          className="clay-blue text-white font-extrabold px-8 py-3.5 rounded-full hover:scale-105 transition-transform text-sm uppercase tracking-wider"
        >
          Toggle Variant
        </button>
      </motion.nav>

      {/* ─── HERO AREA ─── */}
      <main className="max-w-7xl mx-auto px-12 pt-20 pb-32 grid lg:grid-cols-12 gap-12 items-center">
        
        {/* Left Copy Panel */}
        <div className="lg:col-span-6 space-y-10">
          
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full clay-card shadow-[inset:2px_2px_4px_rgba(255,255,255,0.7)]">
            <Zap size={14} className="text-orange-500 fill-orange-500" />
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-600">Pure Local Network Bridge</span>
          </div>

          <div className="min-h-[180px] flex flex-col justify-center">
            <AnimatePresence mode="wait">
              {activeVariant === "developer" && (
                <motion.div
                  key="dev"
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                  className="space-y-4"
                >
                  <h1 className="font-rubik text-5xl lg:text-[76px] font-black text-gray-900 leading-[0.95] tracking-tighter flex flex-wrap">
                    {renderStaggeredHeadline("TYPE ON PHONE. SEE ON DESKTOP.")}
                  </h1>
                  <p className="text-lg text-gray-500 max-w-md leading-relaxed font-medium">
                    Type text blocks or code snippets on your mobile phone and instantly watch them type out inside your host computer's active window.
                  </p>
                </motion.div>
              )}

              {activeVariant === "creative" && (
                <motion.div
                  key="creative"
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                  className="space-y-4"
                >
                  <h1 className="font-rubik text-5xl lg:text-[76px] font-black text-gray-900 leading-[0.95] tracking-tighter flex flex-wrap">
                    {renderStaggeredHeadline("TAP PRESETS. EXECUTE MACROS.")}
                  </h1>
                  <p className="text-lg text-gray-500 max-w-md leading-relaxed font-medium">
                    Trigger custom layout shortcuts, asset exports, or command sequences over local Wi-Fi with sub-millisecond lag.
                  </p>
                </motion.div>
              )}

              {activeVariant === "secure" && (
                <motion.div
                  key="secure"
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                  className="space-y-4"
                >
                  <h1 className="font-rubik text-5xl lg:text-[76px] font-black text-gray-900 leading-[0.95] tracking-tighter flex flex-wrap">
                    {renderStaggeredHeadline("PASTE KEYS. ZERO CLOUD LOGS.")}
                  </h1>
                  <p className="text-lg text-gray-500 max-w-md leading-relaxed font-medium">
                    Pass passwords and security tokens safely. LANpad simulates native system keys so it stays 100% offline.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="flex gap-4">
            <button
              onClick={() => runPresetAnimation(activeVariant === "developer" ? "git commit -m 'feat: local sync'" : activeVariant === "creative" ? "Group & Frame Selection" : "ssh-add ~/.ssh/id_rsa")}
              className="clay-orange text-white font-black py-4.5 px-8 rounded-full text-base hover:scale-105 transition-transform"
            >
              TRY SIMULATOR
            </button>
            <div className="clay-card p-4.5 flex items-center justify-center cursor-pointer hover:bg-white/40 transition-colors">
              <Play size={16} className="text-gray-400 fill-gray-400" />
            </div>
          </div>

        </div>

        {/* Right Simulator Panel */}
        <div className="lg:col-span-6 flex flex-col items-center relative min-h-[520px] w-full">
          
          <div 
            ref={containerRef} 
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            style={{ perspective: 1000 }}
            className="w-full max-w-2xl flex flex-col items-center justify-center gap-8 z-10 relative py-10"
          >
            {/* Three.js interactive connector line */}
            <ConnectionLine3D startRef={startAnchorRef} endRef={endAnchorRef} containerRef={containerRef} />

            {/* Row of Simulator Cards */}
            <div className="flex flex-col sm:flex-row gap-8 items-center justify-center w-full z-10 relative">
              
              {/* Puffy Phone Simulator Card */}
              <motion.div
                animate={{
                  rotateX: mousePos.y * -8 - 2,
                  rotateY: mousePos.x * 8 - 2,
                  x: mousePos.x * 12,
                  y: mousePos.y * 12
                }}
                transition={{ type: "spring", stiffness: 180, damping: 22 }}
                className="w-[270px] h-[450px] bg-white border-[4px] border-zinc-900 rounded-[38px] p-3 pb-2 pt-3 relative overflow-hidden flex flex-col justify-between shadow-[0_25px_50px_-12px_rgba(0,0,0,0.15)] z-10 select-none group"
              >
                <div 
                  className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-0"
                  style={{
                    background: `radial-gradient(180px at ${((mousePos.x + 1) / 2) * 100}% ${((mousePos.y + 1) / 2) * 100}%, rgba(70, 143, 234, 0.08), transparent 80%)`
                  }}
                />
                {/* Dynamic Island */}
                <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-16 h-4 bg-black rounded-full z-20" />
                
                {/* Phone Status Info */}
                <div className="flex justify-between items-center text-[8px] font-black text-gray-800 px-3 pt-0.5 z-10">
                  <span>9:41</span>
                  <span className="flex items-center gap-1">
                    <Wifi size={8} className="text-gray-800" />
                    <Zap size={8} className="text-gray-800 fill-current" />
                  </span>
                </div>

                {/* iPhone Screen Content */}
                <div className="flex-1 mt-6 flex flex-col justify-between bg-white rounded-[26px] p-3 text-gray-800">
                  
                  {/* TYPE MODE title & description */}
                  <div className="text-center space-y-1 mt-6">
                    <h4 className="text-[11px] font-black uppercase text-[#2563EB] tracking-wider font-rubik">TYPE MODE</h4>
                    <p className="text-[8.5px] text-gray-400 leading-normal max-w-[150px] mx-auto font-medium">
                      Tap below or type real keys to instantly inject text:
                    </p>
                  </div>

                  {/* Simulated Input Field */}
                  <div className="relative my-4 w-full">
                    <input
                      type="text"
                      value={phoneText}
                      onChange={handlePhoneInputChange}
                      placeholder="Type script or"
                      className="w-full text-[9.5px] font-mono bg-white rounded-xl pl-3 pr-8 py-3 text-gray-700 border border-gray-200/80 shadow-[0_1px_2px_rgba(0,0,0,0.03)] focus:outline-none"
                    />
                    
                    {/* Anchor Point inside input */}
                    <div 
                      ref={startAnchorRef} 
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 rounded-full bg-[#D2E3FC] border border-[#1A73E8]/25 flex items-center justify-center cursor-pointer shadow-[0_1px_2px_rgba(0,0,0,0.08)] z-20 hover:scale-110 transition-transform"
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-[#1A73E8]" />
                    </div>
                  </div>

                  {/* Preset Controls - Horizontal white keys in gray panel */}
                  <div className="bg-[#F1F3F4] p-2.5 rounded-2xl mt-auto mb-1 border border-gray-100/50">
                    <div className="grid grid-cols-4 gap-1.5">
                      {getPresets().map((preset) => (
                        <button
                          key={preset.label}
                          disabled={isTyping}
                          onClick={() => runPresetAnimation(preset.payload)}
                          className="bg-white border border-gray-200/50 rounded-lg py-2.5 text-[8.5px] font-black uppercase tracking-wider text-gray-700 hover:bg-gray-50 active:scale-95 shadow-[0_1.5px_2px_rgba(0,0,0,0.05)] transition-all"
                        >
                          {preset.label}
                        </button>
                      ))}
                      <button
                        onClick={resetTerminal}
                        className="bg-white border border-gray-200/50 text-[#EA4335] rounded-lg py-2.5 text-[8.5px] font-black uppercase tracking-wider hover:bg-red-50 active:scale-95 shadow-[0_1.5px_2px_rgba(0,0,0,0.05)] transition-all"
                      >
                        Clear
                      </button>
                    </div>
                  </div>
                </div>

                {/* iOS Home Line */}
                <div className="w-16 h-1 bg-gray-300 rounded-full mx-auto mt-1 mb-0.5" />
              </motion.div>

              {/* VS Code Listener Terminal Simulator Card */}
              <motion.div
                animate={{
                  rotateX: mousePos.y * -8 + 2,
                  rotateY: mousePos.x * 8 + 2,
                  x: mousePos.x * 15,
                  y: mousePos.y * 15
                }}
                transition={{ type: "spring", stiffness: 180, damping: 22 }}
                className="w-[380px] h-[260px] bg-white rounded-2xl border border-gray-200/60 p-3 pb-3 flex flex-col shadow-[0_25px_50px_-12px_rgba(0,0,0,0.15)] z-10 select-none group"
              >
                <div 
                  className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-0"
                  style={{
                    background: `radial-gradient(180px at ${((mousePos.x + 1) / 2) * 100}% ${((mousePos.y + 1) / 2) * 100}%, rgba(242, 133, 0, 0.08), transparent 80%)`
                  }}
                />
                
                {/* Header Bar */}
                <div className="relative flex items-center justify-between pb-2.5 px-1">
                  <div className="flex gap-1.5">
                    <span className="w-2.5 h-2.5 bg-[#FF5F56] rounded-full shadow-[inset_0.5px_0.5px_1px_rgba(0,0,0,0.05)]" />
                    <span className="w-2.5 h-2.5 bg-[#FFBD2E] rounded-full shadow-[inset_0.5px_0.5px_1px_rgba(0,0,0,0.05)]" />
                    <span className="w-2.5 h-2.5 bg-[#27C93F] rounded-full shadow-[inset_0.5px_0.5px_1px_rgba(0,0,0,0.05)]" />
                  </div>
                  <span className="absolute left-1/2 -translate-x-1/2 text-[9px] font-mono text-gray-400 font-bold uppercase tracking-wider">
                    vscode // LANpad listener
                  </span>
                  <div className="w-12" />
                </div>

                {/* Console Log Area */}
                <div className="p-4 font-mono text-[9px] text-[#A6ADBA] leading-normal bg-[#0B0F19] rounded-xl shadow-[inset_0_2px_4px_rgba(0,0,0,0.3)] border border-white/5 flex-1 overflow-y-auto space-y-1.5 select-none">
                  
                  {/* Path & LAN Linked badge row */}
                  <div className="flex items-center justify-between w-full mb-2">
                    <span className="text-[#4FA8FF] font-bold">
                      {terminalLines[0] || "~/projects/lanpad-dev"}
                    </span>
                    <span className="flex items-center gap-1 bg-[#0C2A1E]/80 border border-[#10B981]/20 px-2 py-0.5 rounded-full text-[7px] font-black text-[#10B981] uppercase tracking-wider">
                      <span className="w-1 h-1 rounded-full bg-[#10B981] animate-pulse" />
                      LAN LINKED
                    </span>
                  </div>

                  {/* Log lines */}
                  {terminalLines.slice(1).map((line, idx) => {
                    const isCommandLine = line.startsWith("$");

                    if (isCommandLine) {
                      const cmdText = line.replace("$", "").trim();
                      return (
                        <div key={idx} className="flex items-center text-white font-bold">
                          <span className="text-[#10B981] mr-1">$</span>
                          <span>{cmdText}</span>
                          <span ref={endAnchorRef} className="text-[#10B981] font-black animate-pulse ml-0.5 inline-block">_</span>
                        </div>
                      );
                    }

                    if (line.includes("SHA256:4a88f...")) {
                      const parts = line.split("SHA256:4a88f...");
                      return (
                        <div key={idx} className="text-gray-400 font-medium">
                          {parts[0]}<span className="text-[#E4A853]">SHA256:4a88f...</span>{parts[1]}
                        </div>
                      );
                    }

                    return (
                      <div key={idx} className="text-gray-400 font-medium">
                        {line}
                      </div>
                    );
                  })}
                </div>
              </motion.div>

            </div>

            {/* Bottom Caption */}
            <p className="text-gray-400 font-medium text-[10px] md:text-[11px] text-center z-10 select-none">
              ✨ Type in the box above or tap presets to see instant typing on the computer screen.
            </p>
          </div>

        </div>

      </main>

      {/* ─── SECTION 2: PERFORMANCE SLABS ─── */}
      <section className="min-h-[600px] flex items-center bg-[#EDEAE0] overflow-hidden py-32 border-t border-b border-gray-200/40">
        <div className="max-w-7xl mx-auto px-12 w-full flex flex-col lg:flex-row items-center gap-24">
          <div className="lg:w-1/2 space-y-8">
            <motion.h2 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="font-rubik text-5xl lg:text-7xl font-black mb-8 leading-none tracking-tighter"
            >
              SOLID AND<br />SECURE.
            </motion.h2>
            <p className="text-xl text-gray-500 leading-relaxed max-w-md font-medium">
              No slow cloud networks. LANpad sends your keys directly using your local Wi-Fi at maximum speed.
            </p>
            <div className="space-y-8">
              {[
                {
                  title: "Fast Local Connection",
                  desc: "Sends text instantly using your local Wi-Fi router without using the internet."
                },
                {
                  title: "100% Private (No Cloud)",
                  desc: "Your typing stays in your room. There are no server logs and no data tracking."
                },
                {
                  title: "Works Everywhere",
                  desc: "Works like a real physical keyboard on Mac and Windows utilizing Native Input Mode."
                }
              ].map((item, idx) => (
                <motion.div 
                  key={idx}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{ duration: 0.5, delay: idx * 0.1, ease: [0.16, 1, 0.3, 1] }}
                  className="flex gap-4"
                >
                  <div className="w-12 h-12 clay-card shrink-0 flex items-center justify-center shadow-[inset_2px_2px_4px_rgba(255,255,255,0.8)]">
                    <Check className="text-orange-500" size={20} />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-gray-800 text-lg">{item.title}</h4>
                    <p className="text-sm text-gray-500 font-medium mt-1 leading-normal">
                      {item.desc}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Interactive Isometric Stack */}
          <div className="lg:w-1/2 h-[500px] relative isometric-stack flex items-center justify-center group cursor-pointer">
            {/* Top Slab: Stalled Legacy Cloud */}
            <div 
              className="slab slab-top bg-gray-300 shadow-[10px_10px_20px_rgba(0,0,0,0.12)] border border-white/20"
              style={{ transform: "rotateX(45deg) rotateZ(-35deg) translateZ(100px)" }}
            >
              <span className="text-gray-500 text-[10px] font-black uppercase tracking-widest mb-1 font-rubik">Cloud Input</span>
              <span className="text-gray-700 text-3xl font-black font-rubik">STALLED</span>
            </div>

            {/* Middle Slab: Arrow separator */}
            <div 
              className="slab slab-mid clay-blue"
              style={{ transform: "rotateX(45deg) rotateZ(-35deg) translateZ(0px)" }}
            >
              <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 13.5L12 21m0 0l-7.5-7.5M12 21V3" />
              </svg>
            </div>

            {/* Bottom Slab: Speedup */}
            <div 
              className="slab slab-bot clay-orange"
              style={{ transform: "rotateX(45deg) rotateZ(-35deg) translateZ(-100px)" }}
            >
              <span className="text-white/80 text-[10px] font-black uppercase tracking-widest mb-1 font-rubik">Local Engine</span>
              <span className="text-white text-4xl font-black font-rubik tracking-tighter">SUB-50ms SYNC LATENCY</span>
            </div>
          </div>
        </div>
      </section>

      {/* ─── SECTION 3: TACTILE FEATURE SUITE ─── */}
      <section className="py-32 px-12 max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-20 gap-6">
          <div>
            <h2 className="font-rubik text-5xl font-black mb-4">TACTILE SUITE.</h2>
            <p className="text-xl text-gray-500 font-medium">Different ways to send keys, built for zero lag.</p>
          </div>
          <button className="clay-card px-10 py-5 font-black uppercase text-xs tracking-widest hover:scale-105 transition-transform">
            View API Docs
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* Card 1: Interactive Toggles */}
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            whileHover={{ y: -4, scale: 1.01 }}
            className="clay-card p-10 flex flex-col justify-between min-h-[400px]"
          >
            <div className="space-y-6">
              <div className="w-14 h-14 clay-blue rounded-2xl flex items-center justify-center">
                 <Terminal className="text-white" size={24} />
              </div>
              <h3 className="font-rubik text-2xl font-black mb-2">Configure Modes</h3>
              <p className="text-gray-500 font-bold text-sm">
                Turn switches on or off to change how keys are sent to your computer:
              </p>
            </div>

            {/* Clay Switches */}
            <div className="space-y-4 pt-6">
              {[
                { id: "flashMode", label: "Flash Mode (Clipboard Paste)", cost: "Paste large text quickly" },
                { id: "injectMode", label: "Inject Mode (Code Indent strip)", cost: "Keep text layout and formats" },
                { id: "liveSync", label: "Live Sync (WebSockets)", cost: "Send keys as you type" }
              ].map((item) => (
                <div key={item.id} className="flex justify-between items-center p-3.5 clay-card shadow-[inset:2px_2px_4px_rgba(0,0,0,0.05)] rounded-2xl">
                  <div>
                    <span className="font-extrabold text-xs text-gray-800 block">{item.label}</span>
                    <span className="text-[10px] text-gray-400 font-bold">{item.cost}</span>
                  </div>
                  {/* Switch */}
                  <div 
                    onClick={() => setToggles(prev => ({ ...prev, [item.id]: !prev[item.id as keyof typeof toggles] }))}
                    className={`w-[60px] h-[30px] rounded-full p-1 cursor-pointer transition-colors duration-300 relative ${
                      toggles[item.id as keyof typeof toggles] ? "bg-[#468FEA]" : "bg-gray-300 shadow-[inset_2px_2px_4px_rgba(0,0,0,0.15)]"
                    }`}
                  >
                    <motion.div 
                      layout
                      className="w-5.5 h-5.5 bg-white rounded-full shadow-[2px_2px_5px_rgba(0,0,0,0.15)]"
                      animate={{ x: toggles[item.id as keyof typeof toggles] ? 28 : 0 }}
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Card 2: Interactive Receipt */}
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            whileHover={{ y: -4, scale: 1.01 }}
            className="clay-card p-10 flex flex-col justify-between min-h-[400px]"
          >
            <div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400 font-black tracking-widest uppercase text-[10px] font-rubik">LAN Connection Info</span>
                <span className={`text-[8px] font-black uppercase px-2.5 py-1 rounded-full border transition-all duration-300 ${
                  bridgeStatus === "online" 
                    ? "bg-emerald-50 text-emerald-600 border-emerald-200" 
                    : bridgeStatus === "connecting"
                    ? "bg-amber-50 text-amber-600 border-amber-200 animate-pulse"
                    : "bg-gray-50 text-gray-500 border-gray-200"
                }`}>
                  {bridgeStatus}
                </span>
              </div>
              <h3 className="font-rubik text-3xl font-black mt-2 mb-6">CONNECTION STATUS</h3>
              
              <div className="space-y-4 mb-8">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-500 font-bold">Computer IP Address</span>
                  <span className="font-extrabold">192.168.1.84</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-500 font-bold">Connection Port</span>
                  <span className={`font-extrabold transition-all duration-300 ${toggles.liveSync ? "text-[#468FEA]" : "text-gray-400"}`}>
                    {toggles.liveSync ? "8008 (WS)" : "HTTP Polling"}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-500 font-bold">App Protocol</span>
                  <span className="font-extrabold text-orange-500">lanpad://</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-500 font-bold">Quick Paste</span>
                  <span className={`font-extrabold transition-all duration-300 ${toggles.flashMode ? "text-emerald-500" : "text-gray-400"}`}>
                    {toggles.flashMode ? "Ready (Paste)" : "Bypassed"}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-500 font-bold">Typing Speed</span>
                  <span className={`font-extrabold transition-all duration-300 ${toggles.injectMode ? "text-orange-500 font-black" : "text-gray-600"}`}>
                    {toggles.injectMode ? "Instant" : "Normal"}
                  </span>
                </div>
              </div>
            </div>

            <div className="border-t border-dashed border-gray-300 pt-6 flex justify-between items-end">
              <div>
                <p className="text-gray-400 text-[10px] font-black uppercase mb-1">Response Time</p>
                <h3 className="font-rubik text-3xl font-black text-emerald-500">SUB-50ms</h3>
              </div>
              <span className="text-[#468FEA] font-extrabold text-xs">SAFE NETWORK</span>
            </div>
          </motion.div>

          {/* Card 3: Unified Core Accent Card */}
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            whileHover={{ y: -4, scale: 1.01 }}
            className={`p-10 flex flex-col justify-between min-h-[400px] rounded-[40px] text-white transition-all duration-500 ${
              bridgeStatus === "online" ? "bg-emerald-600 shadow-[16px_16px_32px_rgba(16,185,129,0.3)]" : "clay-blue"
            }`}
          >
            <div className="space-y-6">
              <span className="inline-block px-3 py-1.5 bg-white/20 text-white rounded-full text-[9px] font-black tracking-wider uppercase font-mono">
                {bridgeStatus === "online" ? "Connected" : "Connection Engine"}
              </span>
              <h3 className="font-rubik text-3xl font-black leading-tight">Simulates Real Keyboard Inputs.</h3>
              <p className="text-white/80 text-sm font-medium leading-relaxed">
                Works like a real physical keyboard on both Mac and Windows. This lets you send text even to websites that block pasting.
              </p>
            </div>
            <button 
              onClick={handleInitBridge}
              className={`w-full font-black py-4.5 rounded-2xl text-sm transition-all hover:scale-105 shadow-md ${
                bridgeStatus === "online" 
                  ? "bg-white text-emerald-700 hover:bg-emerald-50" 
                  : bridgeStatus === "connecting"
                  ? "bg-amber-400 text-amber-950 animate-pulse cursor-wait"
                  : "bg-[#EDEAE0] hover:bg-white text-gray-800"
              }`}
            >
              {bridgeStatus === "online" 
                ? "CONNECTED ✓" 
                : bridgeStatus === "connecting"
                ? "CONNECTING..."
                : "CONNECT NOW"}
            </button>
          </motion.div>
        </div>
      </section>

      {/* ─── SECTION 3.15: VIT-AP CODE BANK & QR SYNC GATEWAY ─── */}
      <section className="py-24 bg-[#EDEAE0] border-t border-b border-gray-200/40 relative overflow-hidden">
        
        {/* Floating background decorative shape for parallax */}
        <motion.div 
          animate={{ y: [0, -30, 0], rotate: [0, 10, 0] }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -right-20 -top-20 w-80 h-80 rounded-full border-[16px] border-orange-500/5 pointer-events-none" 
        />
        <motion.div 
          animate={{ y: [0, 45, 0], rotate: [0, -15, 0] }}
          transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -left-20 -bottom-20 w-96 h-96 rounded-full border-[20px] border-blue-500/5 pointer-events-none" 
        />

        <div className="max-w-7xl mx-auto px-12 relative z-10">
          
          <div className="text-center mb-16">
            <span className="text-[10px] font-black uppercase tracking-widest text-[#468FEA] bg-blue-50 px-3.5 py-1.5 rounded-full border border-blue-100/50">
              OTA Core Services
            </span>
            <h2 className="font-rubik text-4xl lg:text-6xl font-black mt-4 tracking-tighter">
              SYNC & DISPATCH.
            </h2>
            <p className="text-gray-500 font-medium text-base max-w-lg mx-auto mt-2">
              Connect your phone instantly. Pick codes from the vault and send them to your laptop with sub-50ms local sync latency.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-stretch">
            
            {/* Left Card: QR Synchronizer */}
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="lg:col-span-5 clay-card p-8 flex flex-col justify-between min-h-[520px] border border-white/20"
            >
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400 font-black tracking-widest uppercase text-[10px] font-rubik">Link Phone</span>
                  <div className="flex items-center gap-1.5 bg-blue-500/10 border border-blue-400/20 px-2.5 py-1 rounded-full text-[9px] font-black text-[#468FEA] uppercase tracking-wider">
                    <QrCode size={11} />
                    <span>EASY SYNC</span>
                  </div>
                </div>
                
                {/* Neumorphic Smartphone Wrapper */}
                <div className="w-56 h-80 bg-white border-[4px] border-zinc-900 rounded-[32px] mx-auto p-3 relative flex flex-col justify-between shadow-[0_20px_40px_-10px_rgba(0,0,0,0.12)]">
                  {/* Dynamic Island */}
                  <div className="absolute top-1.5 left-1/2 -translate-x-1/2 w-14 h-3 bg-black rounded-full z-20" />
                  
                  {/* Phone Header */}
                  <div className="text-[7px] font-black text-gray-400 flex justify-between items-center px-2 pt-1">
                    <span>9:41</span>
                    <span>🔋</span>
                  </div>

                  {/* QR Canvas Center */}
                  <div className="flex-1 flex flex-col items-center justify-center relative my-2">
                    <AnimatePresence mode="wait">
                      {qrSyncStatus === "unlinked" && (
                        <motion.div 
                          key="qr"
                          initial={{ scale: 0.8, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0.8, opacity: 0 }}
                          className="relative p-3 bg-white rounded-2xl border border-gray-100 shadow-[inset_1px_1px_2px_rgba(0,0,0,0.05)]"
                        >
                          <QRCodeCanvas 
                            value="lanpad://connect?ip=192.168.1.84&port=8008" 
                            size={110}
                            bgColor="#ffffff"
                            fgColor="#111827"
                            level="M"
                          />
                          {/* Radial scanning glow overlay */}
                          <motion.div 
                            animate={{ y: [-10, 120, -10] }}
                            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                            className="absolute left-0 right-0 h-[2px] bg-[#468FEA] shadow-[0_0_8px_rgba(70,143,234,0.8)] pointer-events-none"
                          />
                        </motion.div>
                      )}

                      {qrSyncStatus === "scanning" && (
                        <motion.div 
                          key="scanning"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="flex flex-col items-center justify-center space-y-3"
                        >
                          <div className="w-10 h-10 border-2 border-[#468FEA] border-t-transparent rounded-full animate-spin" />
                          <span className="text-[9px] font-mono text-gray-500 font-bold uppercase tracking-wider">Connecting...</span>
                        </motion.div>
                      )}

                      {qrSyncStatus === "linked" && (
                        <motion.div 
                          key="linked"
                          initial={{ scale: 0.8, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0.8, opacity: 0 }}
                          className="flex flex-col items-center justify-center space-y-2 text-center"
                        >
                          <div className="w-12 h-12 bg-emerald-50 rounded-full border border-emerald-100 flex items-center justify-center text-emerald-500 shadow-md">
                            <Check size={20} />
                          </div>
                          <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest font-rubik">CONNECTED ✓</span>
                          <span className="text-[8px] text-gray-400 font-mono">Device paired successfully</span>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Status Indicator Bar */}
                  <div className="bg-gray-50 border border-gray-100 rounded-xl p-2 text-center">
                    <span className="text-[7.5px] font-bold text-gray-500 block uppercase tracking-wider">
                      {qrSyncStatus === "unlinked" && "Scan the code..."}
                      {qrSyncStatus === "scanning" && "Connecting device..."}
                      {qrSyncStatus === "linked" && "Safe connection live"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Sync Trigger button */}
              <button
                disabled={qrSyncStatus !== "unlinked"}
                onClick={handleQrSync}
                className={`w-full font-black py-4.5 rounded-2xl text-xs transition-all shadow-md flex items-center justify-center gap-2 ${
                  qrSyncStatus === "linked" 
                    ? "bg-emerald-600 text-white" 
                    : qrSyncStatus === "scanning"
                    ? "bg-amber-400 text-amber-950 animate-pulse cursor-wait"
                    : "clay-orange text-white hover:scale-[1.02]"
                }`}
              >
                {qrSyncStatus === "linked" ? (
                  <>PHONE CONNECTED ✓</>
                ) : qrSyncStatus === "scanning" ? (
                  <>CONNECTING PHONE...</>
                ) : (
                  <>SIMULATE QR SCAN <ArrowRight size={13} /></>
                )}
              </button>
            </motion.div>

            {/* Right Card: Code Bank Dispatcher */}
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
              className="lg:col-span-7 clay-card p-8 flex flex-col justify-between min-h-[520px] relative border border-white/20 overflow-hidden"
            >
              
              {/* Floating Flying Particles Canvas / Container */}
              <AnimatePresence>
                {flyingParticles.map(p => (
                  <motion.div
                    key={p.id}
                    initial={{ x: 50, y: 150, opacity: 1, scale: 0.6 }}
                    animate={{ x: 340, y: 220, opacity: 0.2, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.9, ease: "easeInOut" }}
                    className="absolute z-50 bg-[#F28500] text-white font-mono text-[8px] p-2 rounded-lg shadow-lg pointer-events-none whitespace-pre border border-white/20"
                    style={{ top: "15%", left: "10%" }}
                  >
                    🚀 Packet: {p.text.split("\n")[0]}
                  </motion.div>
                ))}
              </AnimatePresence>

              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400 font-black tracking-widest uppercase text-[10px] font-rubik">VIT-AP Code Repository</span>
                  <div className="flex items-center gap-1 bg-orange-500/10 border border-orange-400/20 px-2.5 py-1 rounded-full text-[9px] font-black text-orange-600 uppercase tracking-wider">
                    <FileCode size={11} />
                    <span>CODE BANK</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch">
                  
                  {/* Left Column: Active Session selection */}
                  <div className="md:col-span-5 space-y-2.5">
                    <span className="text-[9px] font-mono text-gray-400 font-bold uppercase tracking-wider block mb-1">Today's Exam Sessions:</span>
                    {MOCK_SESSIONS.map((session, sIdx) => {
                      const isActive = activeCodeBankIdx === sIdx;
                      return (
                        <div 
                          key={session.id}
                          onClick={() => {
                            setActiveCodeBankIdx(sIdx);
                            setCodeBankConsoleLines(prev => [
                              ...prev,
                              `[OTA] Switched to session: ${session.code}`
                            ]);
                          }}
                          className={`p-3 rounded-xl cursor-pointer transition-all duration-300 border ${
                            isActive 
                              ? "bg-white border-blue-300 shadow-[2px_2px_4px_rgba(0,0,0,0.02)]" 
                              : "bg-[#EDEAE0]/40 border-transparent hover:bg-white/40"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-[9.5px] font-black uppercase tracking-wider text-gray-500">{session.code}</span>
                            {sIdx === 0 && <span className="text-[6.5px] bg-[#468FEA]/15 border border-[#468FEA]/25 text-[#468FEA] px-1.5 py-0.5 rounded font-black">PINNED</span>}
                          </div>
                          <h4 className="text-xs font-bold text-gray-800 truncate mt-1">{session.title}</h4>
                        </div>
                      );
                    })}
                  </div>

                  {/* Right Column: Code viewer & dispatch */}
                  <div className="md:col-span-7 flex flex-col justify-between bg-[#F8F9FA]/80 border border-gray-200/50 rounded-2xl p-4.5">
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-[9px] font-mono text-gray-400 font-bold uppercase tracking-wider">Active Question List</span>
                        <span className="text-[8px] bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full font-bold">
                          {MOCK_SESSIONS[activeCodeBankIdx].questions.length} Questions
                        </span>
                      </div>

                      <div className="space-y-3.5">
                        {MOCK_SESSIONS[activeCodeBankIdx].questions.map((q) => (
                          <div 
                            key={q.id} 
                            className="bg-white border border-gray-150 rounded-xl p-3.5 flex justify-between items-center shadow-[0_1.5px_2px_rgba(0,0,0,0.02)]"
                          >
                            <div className="max-w-[70%]">
                              <h5 className="text-[11px] font-extrabold text-gray-800 truncate">{q.title}</h5>
                              <pre className="text-[7.5px] font-mono text-gray-400 mt-1 truncate bg-gray-50 p-1 rounded border border-gray-100">{q.code}</pre>
                            </div>
                            
                            <button
                              disabled={isDispatchingCode}
                              onClick={() => handleDispatchCode(q.code, q.title)}
                              className="clay-blue text-white font-extrabold text-[8.5px] uppercase tracking-wider px-3.5 py-2 rounded-lg hover:scale-105 active:scale-95 transition-transform"
                            >
                              Dispatch
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                </div>
              </div>

              {/* Console log display for the Code Bank */}
              <div className="mt-6">
                <span className="text-[9px] font-mono text-gray-400 font-bold uppercase tracking-wider block mb-2">P2P Node Logging Terminal:</span>
                <div className="p-4 font-mono text-[9px] text-[#A6ADBA] bg-[#0B0F19] rounded-xl shadow-[inset_0_2px_4px_rgba(0,0,0,0.3)] border border-white/5 h-28 overflow-y-auto space-y-1 select-none">
                  {codeBankConsoleLines.map((line, idx) => (
                    <div key={idx} className="flex items-start text-gray-400 font-medium">
                      <span className="text-[#10B981] mr-1.5">&gt;</span>
                      <span>{line}</span>
                    </div>
                  ))}
                </div>
              </div>

            </motion.div>
            
          </div>

        </div>
      </section>

      {/* ─── SECTION 3.25: SECURITY GUARANTEES ─── */}
      <section className="py-24 bg-[#EDEAE0] border-t border-b border-gray-200/40 overflow-hidden">
        <div className="max-w-7xl mx-auto px-12">
          <div className="text-center mb-16">
            <span className="text-[10px] font-black uppercase tracking-widest text-[#F28500] bg-orange-50 px-3.5 py-1.5 rounded-full border border-orange-100/50">
              Security Architecture
            </span>
            <h2 className="font-rubik text-4xl lg:text-6xl font-black mt-4 tracking-tighter">
              OFFLINE BY PRINCIPLE.
            </h2>
            <p className="text-gray-500 font-medium text-base max-w-lg mx-auto mt-2">
              LANpad requires zero cloud sync and stores no keystrokes. Built strictly for local developer security.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                title: "100% Local Residency",
                desc: "All socket links bind strictly to your local host IP. Data packets never cross your physical Wi-Fi gateway, preventing public leak vectors.",
                accent: "clay-blue"
              },
              {
                title: "Cryptographic Peer Keying",
                desc: "Host servers require manual confirmation and signature matches of peer keys before execution requests are processed.",
                accent: "clay-orange"
              },
              {
                title: "Ephemeral RAM Executions",
                desc: "Virtual keystroke scancodes are fired instantly and flushed from local memory registers, leaving no data footprint on storage disks.",
                accent: "bg-emerald-600"
              }
            ].map((pillar, idx) => (
              <motion.div
                key={idx}
                whileHover={{ y: -6, scale: 1.01 }}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.5, delay: idx * 0.1 }}
                className="clay-card p-8 flex flex-col justify-between h-72 border border-white/20"
              >
                <div>
                  <div className={`w-10 h-10 ${pillar.accent} rounded-xl mb-6 flex items-center justify-center text-white font-extrabold text-sm`}>
                    0{idx + 1}
                  </div>
                  <h3 className="font-rubik text-xl font-black text-gray-800 mb-2">{pillar.title}</h3>
                  <p className="text-xs text-gray-400 font-bold leading-relaxed">{pillar.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── SECTION 3.5: DOWNLOADS & COMPATIBILITY ─── */}
      <section id="downloads" className="py-32 px-12 max-w-7xl mx-auto border-t border-gray-200/40">
        <div className="text-center mb-20">
          <h2 className="font-rubik text-5xl lg:text-7xl font-black mb-4 tracking-tighter">READY TO SYNC?</h2>
          <p className="text-gray-500 font-medium text-lg max-w-xl mx-auto">
            Download the native local backend client for your host operating system. Free, secure, and offline.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* macOS Card */}
          <motion.div 
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            whileHover={{ y: -6, scale: 1.01 }}
            className="clay-card p-10 flex flex-col justify-between relative overflow-hidden group transition-all"
          >
            <div className="space-y-6 z-10">
              <div className="flex justify-between items-start">
                <div className="w-14 h-14 bg-white/40 rounded-2xl flex items-center justify-center text-gray-800 shadow-[inset_2px_2px_4px_rgba(255,255,255,0.7)]">
                  <Download size={24} />
                </div>
                <div className="text-right">
                  <div className="text-[10px] font-black uppercase tracking-widest text-[#F28500]">v1.5.8.7</div>
                  <div className="text-[9px] font-mono uppercase tracking-widest text-gray-400 font-bold mt-0.5">macOS 12.0+</div>
                </div>
              </div>
              
              <h3 className="font-rubik text-3xl font-black">macOS Client</h3>
              <p className="text-gray-500 font-bold text-sm leading-relaxed">
                Native menu-bar utility written in Python with CoreGraphics Quartz integrations. Fits seamlessly into Apple ecosystem.
              </p>

              <div className="space-y-2 pt-4">
                <span className="text-[9px] font-mono text-gray-400 font-bold uppercase tracking-wider block">One-Line Terminal Install:</span>
                <div className="p-3 clay-card shadow-[inset_2px_2px_4px_rgba(0,0,0,0.05)] rounded-xl font-mono text-[9px] text-gray-600 break-all select-all leading-normal border border-white/20">
                  curl -sSL lanpad.app/mac | bash
                </div>
              </div>
            </div>

            <button 
              onClick={() => copyCommandToClipboard("curl -sSL lanpad.app/mac | bash")}
              className="mt-8 w-full clay-orange text-white font-black py-4.5 rounded-2xl text-sm transition-all hover:scale-105 active:scale-95 shadow-md flex items-center justify-center gap-2"
            >
              COPY MAC INSTALL CMD <ArrowRight size={14} />
            </button>
          </motion.div>

          {/* Windows Card */}
          <motion.div 
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
            whileHover={{ y: -6, scale: 1.01 }}
            className="clay-card p-10 flex flex-col justify-between relative overflow-hidden group transition-all"
          >
            <div className="space-y-6 z-10">
              <div className="flex justify-between items-start">
                <div className="w-14 h-14 bg-white/40 rounded-2xl flex items-center justify-center text-gray-800 shadow-[inset_2px_2px_4px_rgba(255,255,255,0.7)]">
                  <Download size={24} />
                </div>
                <div className="text-right">
                  <div className="text-[10px] font-black uppercase tracking-widest text-[#468FEA]">v1.5.8.7</div>
                  <div className="text-[9px] font-mono uppercase tracking-widest text-gray-400 font-bold mt-0.5">Windows 10/11</div>
                </div>
              </div>
              
              <h3 className="font-rubik text-3xl font-black">Windows Client</h3>
              <p className="text-gray-500 font-bold text-sm leading-relaxed">
                Native system tray backend utility with ctypes user32 wrappers. Safe, clean, and runs with standard user privileges.
              </p>

              <div className="space-y-2 pt-4">
                <span className="text-[9px] font-mono text-gray-400 font-bold uppercase tracking-wider block">One-Line Powershell Install:</span>
                <div className="p-3 clay-card shadow-[inset_2px_2px_4px_rgba(0,0,0,0.05)] rounded-xl font-mono text-[9px] text-gray-600 break-all select-all leading-normal border border-white/20">
                  powershell -c "irm https://raw.githubusercontent.com/Nithin1138/Glidepass_local/main/website-v2/public/install-windows.ps1 | iex"
                </div>
              </div>
            </div>

            <button 
              onClick={() => copyCommandToClipboard('powershell -c "irm https://raw.githubusercontent.com/Nithin1138/Glidepass_local/main/website-v2/public/install-windows.ps1 | iex"')}
              className="mt-8 w-full clay-blue text-white font-black py-4.5 rounded-2xl text-sm transition-all hover:scale-105 active:scale-95 shadow-md flex items-center justify-center gap-2"
            >
              COPY WIN INSTALL CMD <ArrowRight size={14} />
            </button>
          </motion.div>
        </div>
        <div className="mt-8 p-4 rounded-2xl border border-gray-200/50 bg-gray-50/50 text-[10px] text-gray-500 leading-relaxed font-sans text-center max-w-5xl mx-auto">
          <span className="font-bold text-[#F28500]">⚠️ SECURITY DISCLOSURE & TRUST NOTICE:</span> Running terminal scripts directly from the internet is a potential security risk. 
          These commands fetch and execute convenience setup scripts that automate dependency checks and installer downloading. 
          Always review script contents before executing them. You can inspect the source code of these scripts directly in our public repository at{" "}
          <a 
            href="https://github.com/Nithin1138/Glidepass_local/tree/main/website-v2/public" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="underline hover:text-gray-900 transition-colors font-bold"
          >
            github.com/Nithin1138/Glidepass_local
          </a>.
        </div>
      </section>
      {/* ─── SECTION 3.75: FAQ ─── */}
      <section className="py-32 px-12 max-w-4xl mx-auto border-t border-gray-200/40">
        <div className="space-y-12">
          
          {/* FAQ Header */}
          <div className="text-center">
            <span className="text-[10px] font-black uppercase tracking-widest text-[#F28500]">Support Knowledge</span>
            <h2 className="font-rubik text-4xl lg:text-5xl font-black mt-2 tracking-tighter">COMMON RUN LOOPS.</h2>
            <p className="text-gray-500 font-medium text-sm mt-1">Answers to key operational architecture queries.</p>
          </div>

          <div className="space-y-4">
            {[
              {
                q: "How is the connection kept at sub-50ms local sync latency?",
                a: "LANpad communicates strictly via local WebSockets using your home router. By skipping the external internet entirely, packets travel instantly between your phone and host PC without round-tripping to cloud servers."
              },
              {
                q: "Is my keystroke history logged or sent to any server?",
                a: "Never. LANpad runs 100% locally. The software does not connect to the cloud, requires no internet access to execute scripts, and does not write log metrics to disk."
              },
              {
                q: "Do I need standard user permissions or administrator privileges?",
                a: "LANpad runs under standard system user privileges. On macOS, it requires standard Accessibility privileges to send virtual keystroke inputs (via Quartz CGEvent). On Windows, it binds locally via ctypes to user32.dll."
              },
              {
                q: "Can I map custom keyboard shortcut macros?",
                a: "Yes! Through our simple config, you can map arbitrary string payloads, shell scripts, or keystroke combinations (e.g. Cmd+Alt+Z) to custom preset buttons."
              }
            ].map((item, idx) => {
              const isOpen = openFaqIdx === idx;
              return (
                <div key={idx} className="clay-card overflow-hidden transition-all duration-300 border border-white/20">
                  <button
                    onClick={() => setOpenFaqIdx(isOpen ? null : idx)}
                    className="w-full text-left p-6 flex justify-between items-center hover:bg-white/10 transition-colors"
                  >
                    <span className="font-extrabold text-sm text-gray-800">{item.q}</span>
                    <motion.span 
                      animate={{ rotate: isOpen ? 180 : 0 }}
                      transition={{ duration: 0.2 }}
                      className="text-gray-400"
                    >
                      ▼
                    </motion.span>
                  </button>
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                        className="border-t border-dashed border-gray-200/50"
                      >
                        <p className="p-6 text-xs text-gray-500 font-medium leading-relaxed bg-[#EDEAE0]/30">
                          {item.a}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>

        </div>
      </section>
      {/* ─── SECTION 4: INTERACTIVE CURTAIN-PULL REVEAL ─── */}
      <section className="h-[600px] bg-[#468FEA] relative overflow-hidden flex items-center justify-center border-t-8 border-white/30">
        
        {/* Under-Curtain Content (Revealed CTA) */}
        <div className="text-center z-10 px-6 max-w-xl">
          <h2 className="font-rubik text-5xl md:text-7xl font-black text-white mb-8 tracking-tighter leading-none">
            READY TO TYPE<br />WITHOUT BOUNDS?
          </h2>
          <button className="clay-orange text-white text-xl md:text-2xl font-black py-6 px-12 rounded-full hover:scale-105 transition-transform shadow-[0_20px_40px_rgba(242,133,0,0.3)]">
            DOWNLOAD LANPAD NOW
          </button>
        </div>

        {/* Left Curtain Panel */}
        <div 
          className="curtain-panel left-0 border-r-[12px] border-white/20 shadow-[20px_0_40px_rgba(0,0,0,0.12)] cursor-pointer"
          style={{ transform: isCurtainOpen ? "translateX(-90%)" : "translateX(0)" }}
          onClick={() => setIsCurtainOpen(!isCurtainOpen)}
        >
          {/* Pull Handle */}
          <div className="ml-auto mr-8 w-8 h-32 clay-card shadow-[inset_2px_2px_4px_rgba(255,255,255,0.8),inset_-2px_-2px_4px_rgba(0,0,0,0.05)] flex items-center justify-center hover:scale-105 transition-transform">
            <span className="text-[10px] font-black text-gray-400 rotate-90 select-none">PULL</span>
          </div>
        </div>

        {/* Right Curtain Panel */}
        <div 
          className="curtain-panel right-0 border-l-[12px] border-white/20 flex-row-reverse shadow-[-20px_0_40px_rgba(0,0,0,0.12)] cursor-pointer"
          style={{ transform: isCurtainOpen ? "translateX(90%)" : "translateX(0)" }}
          onClick={() => setIsCurtainOpen(!isCurtainOpen)}
        >
          {/* Pull Handle */}
          <div className="mr-auto ml-8 w-8 h-32 clay-card shadow-[inset_2px_2px_4px_rgba(255,255,255,0.8),inset_-2px_-2px_4px_rgba(0,0,0,0.05)] flex items-center justify-center hover:scale-105 transition-transform">
            <span className="text-[10px] font-black text-gray-400 -rotate-90 select-none">PULL</span>
          </div>
        </div>

      </section>

      {/* ─── FOOTER ─── */}
      <footer className="pt-32 pb-16 border-t border-gray-200/40 bg-[#EDEAE0] relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-12 relative z-10">
          
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-12 mb-24">
            {/* Brand Column */}
            <div className="col-span-2 space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 clay-orange rounded-[12px] flex items-center justify-center shadow-lg">
                  <span className="text-white font-black font-rubik text-lg">L</span>
                </div>
                <span className="font-rubik font-black text-2xl tracking-tight text-gray-800 mt-1">LANPAD</span>
              </div>
              <p className="text-sm text-gray-500 font-bold max-w-xs leading-relaxed">
                Building the intelligent local-first layer between your phone and your computer. Zero-lag synchronization for power users.
              </p>
              
              <div className="flex gap-5">
                {[
                  { icon: <Globe size={18} />, label: "Web" },
                  { icon: <Star size={18} />, label: "GitHub" },
                  { icon: <ShieldCheck size={18} />, label: "Security" }
                ].map((s, i) => (
                  <button key={i} className="group/social relative w-12 h-12 rounded-full clay-card flex items-center justify-center text-gray-400 hover:text-gray-800 transition-all hover:scale-110 shadow-[2px_2px_4px_rgba(0,0,0,0.05),inset_1px_1px_2px_rgba(255,255,255,0.8)]">
                    <div className="relative z-10">{s.icon}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Product Column */}
            <div>
              <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 mb-8 font-rubik">Product</h4>
              <ul className="space-y-4 text-sm font-bold text-gray-500 font-dmsans">
                <li><a href="#features" className="hover:text-gray-800 transition-colors">Features</a></li>
                <li><a href="#downloads" className="hover:text-gray-800 transition-colors">Downloads</a></li>
                <li><Link href="/contributors" className="hover:text-gray-800 transition-colors">Contributors</Link></li>
              </ul>
            </div>

            {/* Resources Column */}
            <div>
              <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 mb-8 font-rubik">Resources</h4>
              <ul className="space-y-4 text-sm font-bold text-gray-500 font-dmsans">
                <li><Link href="/docs" className="hover:text-gray-800 transition-colors">Documentation</Link></li>
                <li><Link href="/setup" className="hover:text-gray-800 transition-colors">Setup Guide</Link></li>
                <li><Link href="/status" className="hover:text-gray-800 transition-colors">API Status</Link></li>
                <li><Link href="/support" className="hover:text-gray-800 transition-colors">Support & Queries</Link></li>
              </ul>
            </div>

            {/* Legal Column */}
            <div>
              <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 mb-8 font-rubik">Legal</h4>
              <ul className="space-y-4 text-sm font-bold text-gray-500 font-dmsans">
                <li><Link href="/privacy" className="hover:text-gray-800 transition-colors">Privacy Policy</Link></li>
                <li><Link href="/terms" className="hover:text-gray-800 transition-colors">Terms of Service</Link></li>
                <li><Link href="/cookies" className="hover:text-gray-800 transition-colors">Cookie Policy</Link></li>
                <li><Link href="/legal/content-policy" className="hover:text-gray-800 transition-colors">Content Policy</Link></li>
                <li><Link href="/legal/copyright-takedown" className="hover:text-gray-800 transition-colors">Copyright Takedown</Link></li>
                <li><Link href="/legal/refund-policy" className="hover:text-gray-800 transition-colors">Refund Policy</Link></li>
              </ul>
            </div>
          </div>

          {/* Legal Disclaimer Box */}
          <div className="mt-12 p-6 clay-card shadow-[inset_2px_2px_4px_rgba(0,0,0,0.05)] border border-white/20 rounded-2xl text-[11px] leading-relaxed text-gray-500 font-bold">
            <p className="font-black uppercase tracking-wider mb-2 text-orange-500 font-rubik">Legal Disclaimer</p>
            LANpad is provided as a productivity utility for local network synchronization and keyboard input simulation. The developers, contributors, and founders assume no liability or responsibility for any misuse of this tool, including but not limited to academic misconduct, exam-related violations, policy infractions on external platforms, data security compromises arising from user-configured networks, or system disruption. Users are solely responsible for compliance with their local institution rules, terms of service of third-party platforms, and all applicable privacy laws.
          </div>

          {/* Bottom Row */}
          <div className="mt-16 pt-12 border-t border-gray-200/40 flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full clay-card shadow-[inset_1.5px_1.5px_3px_rgba(255,255,255,0.7)] text-[10px] font-black uppercase tracking-widest text-emerald-600">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                All Systems Operational
              </div>
              <span className="text-[10px] font-mono text-gray-400 uppercase tracking-widest">v1.5.8.7-stable</span>
            </div>
            <p className="text-[10px] text-gray-400 font-mono tracking-widest">© 2026 LANPAD. ALL RIGHTS RESERVED.</p>
          </div>

        </div>
      </footer>

    </div>
  );
}
