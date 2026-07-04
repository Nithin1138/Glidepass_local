"use client";

import { motion, useScroll, useTransform, useSpring, useMotionValue, animate, AnimatePresence } from "framer-motion";
import { Zap, ShieldCheck, Keyboard, RefreshCw, ChevronRight, Monitor, Smartphone, Globe, ArrowRight, Download, BookOpen, Lock, Star, X, Sun, Moon, Menu, FileCode, Check, QrCode, Terminal, Mail, Key, User, Calendar } from "lucide-react";
import { useRef, useState, useEffect } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import React, { createContext, useContext } from "react";
import { QRCodeCanvas } from "qrcode.react";

const RippleGrid = dynamic(() => import("../components/RippleGrid"), { ssr: false });

const copyToClipboard = (text: string) => {
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(text).catch(() => {
      fallbackCopyText(text);
    });
  } else {
    fallbackCopyText(text);
  }
};

const fallbackCopyText = (text: string) => {
  const textArea = document.createElement("textarea");
  textArea.value = text;
  textArea.style.top = "0";
  textArea.style.left = "0";
  textArea.style.position = "fixed";
  textArea.style.opacity = "0";
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();
  try {
    document.execCommand('copy');
  } catch (err) {
    console.error('Fallback copy failed', err);
  }
  document.body.removeChild(textArea);
};

const ThemeContext = createContext({ dk: false, setTheme: (t: string) => { } });
const useTheme = () => useContext(ThemeContext);

// --- UI UTILITIES ---

const CountUp = ({ to }: { to: number }) => {
  const count = useMotionValue(0);
  const rounded = useTransform(count, (latest) => Math.round(latest).toLocaleString());

  useEffect(() => {
    const controls = animate(count, to, { duration: 2, ease: "easeOut" });
    return controls.stop;
  }, [count, to]);

  return <motion.span>{rounded}</motion.span>;
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

const renderStaggeredHeadline = (text: string) => {
  const words = text.split(" ");
  return (
    <span className="block flex flex-wrap">
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

// --- COMPONENTS ---

const Navbar = ({ globalMouseX, globalMouseY }: { globalMouseX: any; globalMouseY: any }) => {
  const [isOpen, setIsOpen] = useState(false);
  const desktopDragRef = useRef<HTMLAnchorElement>(null);
  const mobileDragRef = useRef<HTMLAnchorElement>(null);
  const [showNavbar, setShowNavbar] = useState(true);
  const lastScrollYRef = useRef(0);

  // Use a ref for lastScrollY to avoid re-registering the listener on every scroll
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY > lastScrollYRef.current && currentScrollY > 80) {
        setShowNavbar(false);
      } else {
        setShowNavbar(true);
      }
      lastScrollYRef.current = currentScrollY;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []); // empty deps — listener registered once, reads ref (never stale)

  // Lock body scroll when mobile menu is open (prevents page jumping behind menu)
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  const bookmarkletCode = `javascript:(function(){if(window.__lanpad_active){showN("ALREADY ACTIVE","#f59e0b");return;}window.__lanpad_active=true;window.__gp_abort=false;const op=Event.prototype.preventDefault;Event.prototype.preventDefault=function(){if(["copy","paste","cut","beforeinput","selectstart"].includes(this.type))return;return op.apply(this,arguments)};function ul(r){const ev=["copy","paste","cut","contextmenu","selectstart","beforeinput"];ev.forEach(t=>r.addEventListener(t,e=>e.stopImmediatePropagation(),true));const al=r.querySelectorAll?r.querySelectorAll("*"):[];al.forEach(el=>{if(el.shadowRoot)ul(el.shadowRoot)})};ul(document);const ob=new MutationObserver(()=>ul(document));ob.observe(document.documentElement,{childList:true,subtree:true});const s=document.createElement("style");s.innerHTML="*{-webkit-user-select:text!important;user-select:text!important;pointer-events:auto!important;}";document.head.appendChild(s);const n=document.createElement("div");n.id="__gp_container";n.innerHTML='<div id="__gp_note" style="position:fixed;top:24px;left:50%;transform:translateX(-50%);background:rgba(5,5,5,0.85);color:#fff;padding:14px 24px;border-radius:16px;border:1px solid rgba(0,119,192,0.3);backdrop-filter:blur(12px);font-family:sans-serif;font-weight:900;font-size:14px;z-index:2147483647;display:flex;align-items:center;gap:10px;box-shadow:0 20px 40px rgba(0,119,192,0.2),inset 0 1px 0 rgba(255,255,255,0.1);transition:all 0.4s cubic-bezier(0.18,0.89,0.32,1.28);opacity:0;transform:translate(-50%,-40px);"><span style="color:#0077c0;font-size:18px;">🛰️</span> LANPAD ACTIVATED</div>';document.body.appendChild(n);function showN(t,c="#0077c0"){const e=document.getElementById("__gp_note");if(!e)return;e.innerHTML=\`<span style="color:\${c};font-size:18px;">🛰️</span> \${t}\`;e.style.opacity="1";e.style.transform="translate(-50%,0)";setTimeout(()=>{e.style.opacity="0";e.style.transform="translate(-50%,-40px)"},3000)}setTimeout(()=>showN("LANPAD ACTIVATED"),10);let lastId=localStorage.getItem("__gp_last_id")||"";let seenIds=new Set();let seenTxt=new Map();let queue=[];const wait=(ms)=>new Promise(res=>setTimeout(res,ms));async function poller(){while(true){if(window.__gp_abort_poller)break;try{const res=await fetch("http://127.0.0.1:8000/api/v1/paste/poll?last_id="+lastId+"&t="+Date.now(),{headers:{"x-device-id":"b8b989d6-dca0-4d98-a0e4-2556c5fbc4a1"},cache:"no-store",mode:"cors",credentials:"omit"});const data=await res.json();if(data.status==="success"){lastId=data.id;localStorage.setItem("__gp_last_id",lastId);const txt=data.text||"";const mode=data.mode||"";if(mode==="system"||txt.indexOf("STOP_PASTE")!==-1){window.__gp_abort=true;queue=[];showN("PASTING STOPPED","#ef4444");continue;}const now=Date.now();const txtHash=btoa(txt.substring(0,100)).replace(/=/g,"");if(seenIds.has(data.id)||(seenTxt.has(txtHash)&&now-seenTxt.get(txtHash)<2000))continue;seenIds.add(data.id);seenTxt.set(txtHash,now);queue.push(data);}else{await wait(500)}}catch(e){console.log("GP Poll Error:",e);await wait(2000)}}}async function executor(){while(true){if(window.__gp_abort){queue=[];window.__gp_abort=false;await wait(100);continue;}if(queue.length>0){const data=queue.shift();if(!data)continue;let wpm=data.wpm||40;let txt=data.text;let isRealistic=data.realistic||false;const el=document.activeElement;if(el&&("value" in el||el.isContentEditable)){const inject=(c)=>{if("value" in el){const start=el.selectionStart;const end=el.selectionEnd;if(start!==undefined&&start!==null){el.value=el.value.substring(0,start)+c+el.value.substring(end);el.selectionStart=el.selectionEnd=start+c.length;}else{el.value+=c;}}else{const sel=window.getSelection();if(sel.rangeCount){const range=sel.getRangeAt(0);range.deleteContents();range.insertNode(document.createTextNode(c));range.collapse(false);sel.removeAllRanges();sel.addRange(range)}}el.dispatchEvent(new Event("input",{bubbles:true}));el.dispatchEvent(new Event("change",{bubbles:true}))};if(isRealistic){for(let i=0;i<txt.length;i++){if(window.__gp_abort)break;inject(txt[i]);let d=60000/(wpm*5);if(txt[i]===' ')d*=1.2;await wait(d*(0.8+Math.random()*0.4))}}else{if(!window.__gp_abort)inject(txt)}}}await wait(100)}}poller();executor();})()`;

  useEffect(() => {
    if (desktopDragRef.current) {
      desktopDragRef.current.setAttribute("href", bookmarkletCode);
    }
    if (mobileDragRef.current) {
      mobileDragRef.current.setAttribute("href", bookmarkletCode);
    }
  }, [bookmarkletCode]);

  return (
    <motion.nav
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: showNavbar ? 0 : -100, opacity: showNavbar ? 1 : 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className="fixed top-6 left-0 right-0 mx-auto w-[calc(100%-2rem)] max-w-7xl z-50 px-8 py-3 flex justify-between items-center backdrop-blur-md bg-[#EDEAE0]/75 rounded-[32px] border border-white/20 shadow-[0_8px_32px_0_rgba(0,0,0,0.03)] font-dmsans"
    >
      <div className="clay-card px-6 py-2.5 flex items-center gap-2.5">
        <img src="/logo.png" alt="LANpad Logo" className="w-8 h-8 object-contain rounded-full shadow-sm" />
        <span className="font-rubik font-black text-xl tracking-tight text-gray-900">LANpad</span>
      </div>

      <div className="hidden lg:flex items-center gap-5 xl:gap-8 text-[10px] font-black tracking-[0.2em] uppercase text-gray-500 font-rubik">
        <a href="#technology" className="hover:text-[#468FEA] transition-colors duration-300">Technology</a>
        <a href="#features" className="hover:text-[#468FEA] transition-colors duration-300">Features</a>
        <a href="#setup" className="hover:text-[#F28500] transition-colors duration-300">How to Use</a>
        <a href="#downloads" className="hover:text-[#F28500] transition-colors duration-300">Downloads</a>
        <Link href="/support" className="hover:text-[#468FEA] transition-colors duration-300">Support</Link>
        <Link href="/resources" className="hover:text-[#468FEA] transition-colors duration-300">Resources</Link>
        <Link href="/provider" className="hover:text-[#468FEA] transition-colors duration-300 uppercase tracking-[0.2em] font-black text-[10px] font-rubik">Provider</Link>
        <Link href="/clipboard" className="hover:text-[#468FEA] transition-colors duration-300 uppercase tracking-[0.2em] font-black text-[10px] font-rubik">Clipboard</Link>
      </div>

      <div className="hidden lg:flex items-center gap-3 md:gap-6 relative">

        <a
          ref={desktopDragRef}
          draggable
          onClick={(e) => {
            e.preventDefault();
          }}
          className="relative group clay-orange text-transparent px-6 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest overflow-hidden transition-all duration-500 block border border-white/10 shadow-[0_4px_12px_rgba(242,133,0,0.15)] cursor-grab active:cursor-grabbing font-rubik after:content-['Drag_Me'] after:text-white after:absolute after:inset-0 after:flex after:items-center after:justify-center"
        >
          LANpad
        </a>

        {/* Floating Tooltip Bookmarklet Bar Guide */}
        <div className="absolute left-[calc(100%+10px)] top-1/2 -translate-y-1/2 p-2 rounded-[14px] clay-card border border-white/20 backdrop-blur-xl flex flex-col gap-1 transition-all duration-300 hover:scale-105 group w-[135px] select-none shadow-[0_8px_24px_rgba(0,0,0,0.04)] z-50">
          {/* Tooltip pointer pointing left to the button */}
          <div className="absolute right-full top-1/2 -translate-y-1/2 translate-x-[4px] w-2 h-2 rotate-45 bg-[#EDEAE0] border-l border-b border-white/20 shadow-[-1px_1px_2px_rgba(0,0,0,0.01)]" />

          <div className="flex items-center justify-center gap-1 text-[8px] uppercase tracking-[0.05em] font-black text-[#F28500] font-rubik">
            <span>🛰️</span>
            <span>Bookmarks Bar</span>
          </div>
          <div className="flex flex-col gap-0.5 font-medium text-gray-700 font-sans">
            <div className="flex items-center gap-1">
              <span className="text-gray-500 text-[8px] font-bold uppercase w-6 shrink-0">Win:</span>
              <kbd className="px-1 py-0.2 bg-white/40 border border-black/5 rounded text-[#1d4ed8] font-bold font-mono text-[8.5px] whitespace-nowrap">Ctrl+Shift+B</kbd>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-gray-500 text-[8px] font-bold uppercase w-6 shrink-0">Mac:</span>
              <kbd className="px-1 py-0.2 bg-white/40 border border-black/5 rounded text-[#1d4ed8] font-bold font-mono text-[8.5px] whitespace-nowrap">⌘+Shift+B</kbd>
            </div>
          </div>
        </div>
      </div>

      <button className="lg:hidden p-2 text-gray-700 font-rubik" onClick={() => setIsOpen(!isOpen)}>
        {isOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="absolute top-[75px] left-0 w-full overflow-hidden rounded-2xl border border-white/20 bg-[#EDEAE0] shadow-xl lg:hidden z-50 font-dmsans"
          >
            <div className="flex flex-col p-6 gap-4 uppercase text-xs font-bold tracking-widest text-gray-700">
              <a href="#technology" onClick={() => setIsOpen(false)}>Technology</a>
              <a href="#features" onClick={() => setIsOpen(false)}>Features</a>
              <a href="#setup" onClick={() => setIsOpen(false)}>How to Use</a>
              <a href="#downloads" onClick={() => setIsOpen(false)}>Downloads</a>
              <Link href="/support" onClick={() => setIsOpen(false)}>Support</Link>
              <div className="border-t border-gray-200/40 pt-3 my-1">
                <div className="text-[9px] text-[#F28500] font-mono mb-2">Show Bookmarks (Ctrl+Shift+B / ⌘+Shift+B)</div>
                <a
                  ref={mobileDragRef}
                  draggable
                  onClick={(e) => e.preventDefault()}
                  className="inline-block px-4 py-2 clay-orange text-transparent rounded-lg text-[9px] font-black uppercase tracking-wider relative after:content-['🚀_Drag_Me'] after:text-white after:absolute after:inset-0 after:flex after:items-center after:justify-center"
                >
                  LANpad
                </a>
              </div>
              <Link href="/resources" className="text-[#F28500] font-bold" onClick={() => setIsOpen(false)}>Resources</Link>
              <Link href="/provider" className="text-[#F28500] font-bold text-left uppercase tracking-widest text-xs" onClick={() => setIsOpen(false)}>Provider</Link>
              <Link href="/clipboard" className="text-[#F28500] font-bold text-left uppercase tracking-widest text-xs" onClick={() => setIsOpen(false)}>Clipboard</Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
};

const Hero = ({
  qrSyncStatus,
  setQrSyncStatus,
  handleQrSync
}: {
  qrSyncStatus: "unlinked" | "scanning" | "linked";
  setQrSyncStatus: React.Dispatch<React.SetStateAction<"unlinked" | "scanning" | "linked">>;
  handleQrSync: () => void;
}) => {
  return (
    <section className="relative min-h-screen flex items-center pt-24 pb-12 px-6 overflow-hidden font-dmsans">
      {/* Ambient background glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#468FEA]/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-[#F28500]/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-7xl mx-auto relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">

          {/* Left Column: Text & CTA */}
          <div className="lg:col-span-7 text-left space-y-8">



            <h1
              className="text-5xl md:text-7xl lg:text-[76px] font-rubik font-black tracking-tighter leading-[0.85] text-[#0f172a] uppercase"
            >
              {renderStaggeredHeadline("Your Phone")}
              <div className="h-2" />
              {renderStaggeredHeadline("as an Intelligent")}
              <div className="h-2" />
              <span className="text-[#0f172a]">
                {renderStaggeredHeadline("Layer")}
              </span>
            </h1>

            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3, duration: 1 }}
              className="text-base md:text-lg text-gray-600 max-w-xl leading-relaxed tracking-tight"
            >
              Instant local text transfer, human-like typing simulation, and real-time input orchestration. Built for power users who demand zero-lag productivity.
            </motion.p>

            {/* Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="flex flex-col sm:flex-row items-center gap-4 pt-2"
            >
              <a href="#setup" className="group relative px-8 py-4 rounded-full font-black text-xs uppercase tracking-widest text-white clay-blue shadow-[0_4px_12px_rgba(70,143,234,0.25)] hover:scale-105 transition-all duration-300 w-full sm:w-auto text-center font-rubik">
                Setup Guide
              </a>
              <a href="#downloads" className="group relative px-8 py-4 rounded-full font-black text-xs uppercase tracking-widest text-gray-700 clay-card hover:scale-105 transition-all duration-300 w-full sm:w-auto text-center font-rubik">
                Download Assets
              </a>
            </motion.div>
          </div>

          {/* Right Column: Interactive 3D Canvas replacing the QR Synchronizer */}
          <div className="hidden lg:flex lg:col-span-5 justify-center relative w-full h-[450px] lg:-translate-x-20">
            <div className="relative w-full max-w-[650px] h-full flex items-center justify-center">
              {/* Outer Clay Frame Card Container (Removed card grid background highlight) */}
              <div className="absolute inset-0 z-10">
                <ThreeDConduit />
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};

// --- INTERACTIVE 3D CONDUIT COMPONENT ---
const ThreeDConduit = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || typeof window === "undefined") return;

    // Completely bypass WebGL canvas rendering on mobile/tablet to ensure buttery smooth scrolling
    if (window.innerWidth < 1024) return;

    const THREE = require("three");

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 100);
    camera.position.set(0, 2.0, 7.8);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.domElement.style.border = "none";
    renderer.domElement.style.outline = "none";
    renderer.domElement.style.boxShadow = "none";
    container.appendChild(renderer.domElement);

    const group = new THREE.Group();
    group.position.x = -0.2; // Centered slightly left inside canvas to avoid clipping
    scene.add(group);

    // Light Setup
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight.position.set(5, 10, 7);
    scene.add(dirLight);

    // --- 1. BUILD 3D LAPTOP ---
    const laptopGroup = new THREE.Group();
    laptopGroup.position.set(1.7, -0.5, 0);
    laptopGroup.rotation.y = -0.3;
    group.add(laptopGroup);

    // Laptop Base
    const baseGeom = new THREE.BoxGeometry(3.6, 0.1, 2.4);
    const baseMat = new THREE.MeshPhysicalMaterial({
      color: 0xe2e8f0,
      roughness: 0.1,
      metalness: 0.8,
      clearcoat: 1.0
    });
    const laptopBase = new THREE.Mesh(baseGeom, baseMat);
    laptopGroup.add(laptopBase);

    // Laptop Screen (Lid)
    const screenGroup = new THREE.Group();
    screenGroup.position.set(0, 0.05, -1.15); // pivot point at hinge
    laptopGroup.add(screenGroup);

    const lidGeom = new THREE.BoxGeometry(3.6, 2.2, 0.08);
    const lidMat = new THREE.MeshPhysicalMaterial({
      color: 0xe2e8f0,
      roughness: 0.2,
      metalness: 0.8
    });
    const laptopLid = new THREE.Mesh(lidGeom, lidMat);
    laptopLid.position.set(0, 1.1, 0);
    screenGroup.add(laptopLid);

    // Laptop Screen Canvas for dynamic code text
    const laptopCanvas = document.createElement("canvas");
    laptopCanvas.width = 512;
    laptopCanvas.height = 300;
    const laptopCtx = laptopCanvas.getContext("2d");
    const laptopTexture = new THREE.CanvasTexture(laptopCanvas);

    // Laptop Inner Screen Panel
    const innerScreenGeom = new THREE.PlaneGeometry(3.4, 2.0);
    const innerScreenMat = new THREE.MeshBasicMaterial({
      map: laptopTexture
    });
    const innerScreen = new THREE.Mesh(innerScreenGeom, innerScreenMat);
    innerScreen.position.set(0, 1.1, 0.045);
    screenGroup.add(innerScreen);

    // --- 2. BUILD 3D PHONE ---
    const phoneGroup = new THREE.Group();
    phoneGroup.position.set(-1.8, -0.2, 1);
    phoneGroup.rotation.y = 0.4;
    group.add(phoneGroup);

    // Phone Body shape with rounded corners (using Extrude)
    const phoneShape = new THREE.Shape();
    const w = 1.0, h = 2.0, r = 0.15;
    phoneShape.moveTo(-w/2 + r, -h/2);
    phoneShape.lineTo(w/2 - r, -h/2);
    phoneShape.quadraticCurveTo(w/2, -h/2, w/2, -h/2 + r);
    phoneShape.lineTo(w/2, h/2 - r);
    phoneShape.quadraticCurveTo(w/2, h/2, w/2 - r, h/2);
    phoneShape.lineTo(-w/2 + r, h/2);
    phoneShape.quadraticCurveTo(-w/2, h/2, -w/2, h/2 - r);
    phoneShape.lineTo(-w/2, -h/2 + r);
    phoneShape.quadraticCurveTo(-w/2, -h/2, -w/2 + r, -h/2);

    const extrudeSettings = { depth: 0.12, bevelEnabled: true, bevelSegments: 3, steps: 1, bevelSize: 0.02, bevelThickness: 0.02 };
    const phoneGeom = new THREE.ExtrudeGeometry(phoneShape, extrudeSettings);
    const phoneMat = new THREE.MeshPhysicalMaterial({
      color: 0x1e293b,
      roughness: 0.2,
      metalness: 0.5,
      clearcoat: 1.0
    });
    const phoneMesh = new THREE.Mesh(phoneGeom, phoneMat);
    phoneMesh.position.set(0, 0, -0.06);
    phoneGroup.add(phoneMesh);

    // Phone Screen Canvas for dynamic text
    const phoneCanvas = document.createElement("canvas");
    phoneCanvas.width = 256;
    phoneCanvas.height = 512;
    const phoneCtx = phoneCanvas.getContext("2d");
    const phoneTexture = new THREE.CanvasTexture(phoneCanvas);

    // Phone Screen
    const phoneScreenGeom = new THREE.PlaneGeometry(0.92, 1.9);
    const phoneScreenMat = new THREE.MeshBasicMaterial({
      map: phoneTexture
    });
    const phoneScreen = new THREE.Mesh(phoneScreenGeom, phoneScreenMat);
    phoneScreen.position.set(0, 0, 0.082);
    phoneGroup.add(phoneScreen);

    // --- 3. DYNAMIC DATA BRIDGE / CONNECTIONS ---
    // Curved bridge spline from Phone center to Laptop screen center
    const startPoint = new THREE.Vector3(-1.8, 0, 1);
    const endPoint = new THREE.Vector3(1.7, 0.6, 0);
    const controlPoint = new THREE.Vector3(0, 2.5, 0.5);

    const curve = new THREE.QuadraticBezierCurve3(startPoint, controlPoint, endPoint);

    // Visual Conduit Line
    const points = curve.getPoints(50);
    const lineGeom = new THREE.BufferGeometry().setFromPoints(points);
    const lineMat = new THREE.LineBasicMaterial({
      color: 0x468fea,
      transparent: true,
      opacity: 0.35
    });
    const connectionLine = new THREE.Line(lineGeom, lineMat);
    group.add(connectionLine);

    // Flying Data Packets (Points moving along the Bezier curve)
    const packetCount = 8;
    const packets: any[] = [];
    const packetColors = [0x468fea, 0xf28500];

    for (let i = 0; i < packetCount; i++) {
      const pGeom = new THREE.SphereGeometry(0.08, 16, 16);
      const pMat = new THREE.MeshBasicMaterial({
        color: packetColors[i % 2],
        transparent: true,
        opacity: 0.9
      });
      const packetMesh = new THREE.Mesh(pGeom, pMat);
      
      // Random starting offsets along curve
      const progress = i / packetCount;
      const pos = curve.getPointAt(progress);
      packetMesh.position.copy(pos);

      group.add(packetMesh);
      packets.push({ mesh: packetMesh, progress });
    }

    // --- 4. MOUSE TRACKING ROTATION ---
    let targetX = 0;
    let targetY = 0;
    let mouseX = 0;
    let mouseY = 0;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const x = e.clientX - rect.left - width / 2;
      const y = e.clientY - rect.top - height / 2;
      targetX = (x / (width / 2)) * 0.3;
      targetY = (y / (height / 2)) * 0.2;
    };

    window.addEventListener("mousemove", handleMouseMove);

    // --- 5. ANIMATION LOOP ---
    let clock = new THREE.Clock();
    let animationFrameId: number;

    const animateScene = () => {
      animationFrameId = requestAnimationFrame(animateScene);

      const elapsedTime = clock.getElapsedTime();

      // Smooth Camera / Scene Easing
      mouseX += (targetX - mouseX) * 0.05;
      mouseY += (targetY - mouseY) * 0.05;

      group.rotation.y = mouseX;
      group.rotation.x = mouseY;

      // Animate screen hinge angle slightly over time
      screenGroup.rotation.x = -0.2 + Math.sin(elapsedTime * 1.5) * 0.04;

      // Float phone up and down slightly
      phoneGroup.position.y = -0.2 + Math.sin(elapsedTime * 2.0) * 0.08;
      phoneGroup.rotation.y = 0.4 + Math.cos(elapsedTime * 1.0) * 0.05;

      // --- ANIMATED CANVAS TEXT DRAWING ---
      const totalLetters = 15;
      const textToType = "SYNC_ACTIVE...";
      const charsTyped = Math.floor((elapsedTime * 6) % (textToType.length + 5));
      const activeText = textToType.slice(0, Math.min(charsTyped, textToType.length));

      // Draw Phone screen UI & Text
      if (phoneCtx) {
        phoneCtx.fillStyle = "#0a0e17";
        phoneCtx.fillRect(0, 0, 256, 512);

        // Header info
        phoneCtx.fillStyle = "rgba(255, 255, 255, 0.4)";
        phoneCtx.font = "bold 14px monospace";
        phoneCtx.fillText("9:41", 20, 35);
        phoneCtx.fillText("100% 🔋", 180, 35);

        // Connection Pill
        phoneCtx.fillStyle = "rgba(70, 143, 234, 0.15)";
        phoneCtx.strokeStyle = "rgba(70, 143, 234, 0.3)";
        phoneCtx.lineWidth = 1.5;
        phoneCtx.beginPath();
        phoneCtx.roundRect(40, 60, 176, 32, 16);
        phoneCtx.fill();
        phoneCtx.stroke();

        phoneCtx.fillStyle = "#468FEA";
        phoneCtx.font = "black 10px sans-serif";
        phoneCtx.textAlign = "center";
        phoneCtx.fillText("TUNNEL CONNECTED", 128, 80);

        // Text Box
        phoneCtx.fillStyle = "#111827";
        phoneCtx.strokeStyle = "rgba(255, 255, 255, 0.1)";
        phoneCtx.beginPath();
        phoneCtx.roundRect(20, 180, 216, 120, 16);
        phoneCtx.fill();
        phoneCtx.stroke();

        // Phone Input Value
        phoneCtx.fillStyle = "#ffffff";
        phoneCtx.font = "bold 15px monospace";
        phoneCtx.textAlign = "left";
        phoneCtx.fillText(activeText + (Math.floor(elapsedTime * 3) % 2 === 0 ? "_" : ""), 35, 245);

        phoneTexture.needsUpdate = true;
      }

      // Draw Laptop screen UI & Terminal Code
      if (laptopCtx) {
        laptopCtx.fillStyle = "#0a0e17";
        laptopCtx.fillRect(0, 0, 512, 300);

        // Fake Title Bar
        laptopCtx.fillStyle = "rgba(255, 255, 255, 0.05)";
        laptopCtx.fillRect(0, 0, 512, 35);

        // Red Yellow Green Window Buttons
        laptopCtx.fillStyle = "#ff5f56";
        laptopCtx.beginPath(); laptopCtx.arc(20, 17, 6, 0, Math.PI * 2); laptopCtx.fill();
        laptopCtx.fillStyle = "#ffbd2e";
        laptopCtx.beginPath(); laptopCtx.arc(38, 17, 6, 0, Math.PI * 2); laptopCtx.fill();
        laptopCtx.fillStyle = "#27c93f";
        laptopCtx.beginPath(); laptopCtx.arc(56, 17, 6, 0, Math.PI * 2); laptopCtx.fill();

        // Terminal path
        laptopCtx.fillStyle = "rgba(255, 255, 255, 0.3)";
        laptopCtx.font = "11px monospace";
        laptopCtx.textAlign = "center";
        laptopCtx.fillText("lanpad — local_node", 256, 21);

        // Editor Code Output
        laptopCtx.textAlign = "left";
        laptopCtx.font = "14px monospace";
        
        // Line 1: setup bridge
        laptopCtx.fillStyle = "rgba(255, 255, 255, 0.4)";
        laptopCtx.fillText("1  const bridge = new LANpadBridge();", 24, 75);

        // Line 2: compiling log
        laptopCtx.fillStyle = "#468FEA";
        laptopCtx.fillText("2  bridge.connect('LocalServer');", 24, 110);

        // Line 3: receiving keystrokes
        laptopCtx.fillStyle = "rgba(255, 255, 255, 0.7)";
        laptopCtx.fillText("3  // Sync Stream input", 24, 145);

        // Line 4: output matching typed phone value
        laptopCtx.fillStyle = "#f59e0b";
        laptopCtx.fillText("4  > " + activeText, 24, 180);

        laptopTexture.needsUpdate = true;
      }

      // Animate packet movements along Bezier Curve
      packets.forEach((p) => {
        p.progress += 0.006;
        if (p.progress > 1) {
          p.progress = 0;
        }
        const pos = curve.getPointAt(p.progress);
        p.mesh.position.copy(pos);

        // Scale pulses slightly
        const scaleVal = 1 + Math.sin(elapsedTime * 8 + p.progress * 10) * 0.15;
        p.mesh.scale.set(scaleVal, scaleVal, scaleVal);
      });

      renderer.render(scene, camera);
    };

    animateScene();

    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        const w = entry.contentRect.width;
        const h = entry.contentRect.height;
        renderer.setSize(w, h);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
      }
    });
    resizeObserver.observe(container);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      
      // Cleanup geometries and materials
      baseGeom.dispose();
      baseMat.dispose();
      lidGeom.dispose();
      lidMat.dispose();
      innerScreenGeom.dispose();
      innerScreenMat.dispose();
      phoneGeom.dispose();
      phoneMat.dispose();
      phoneScreenGeom.dispose();
      phoneScreenMat.dispose();
      lineGeom.dispose();
      lineMat.dispose();
      packets.forEach(p => {
        p.mesh.geometry.dispose();
        p.mesh.material.dispose();
      });
      renderer.dispose();
    };
  }, []);

  return (
    <div 
      ref={containerRef} 
      className="w-full h-full min-h-[360px] relative cursor-pointer border-0 outline-none select-none"
      style={{ border: "none", outline: "none", boxShadow: "none" }}
    />
  );
};

const Features = () => {
  const features = [
    {
      title: "Instant Text Sync",
      desc: "Send text from your phone to your computer instantly. No lag, works over your local network.",
      icon: <RefreshCw size={22} className="text-[#468FEA]" />,
      span: "md:col-span-2",
      visual: (
        <div className="absolute right-10 bottom-6 flex items-center gap-6">
          <div className="hidden lg:flex flex-col items-end gap-1.5 mr-2">
            <div className="text-[7px] font-mono text-[#468FEA]/60 tracking-[0.2em] uppercase">link_status</div>
            <div className="flex gap-1">
              {[1, 2, 3].map(i => <div key={i} className="w-1 h-1 rounded-full bg-[#468FEA]/40" />)}
              <div className="w-1 h-1 rounded-full bg-[#468FEA] animate-pulse" />
            </div>
          </div>
          <div className="relative w-32 h-10 flex items-center">
            <svg className="absolute inset-0 w-full h-full text-[#468FEA]/20" viewBox="0 0 100 20">
              <motion.path
                d="M 0 10 Q 25 20 50 10 T 100 10"
                fill="none"
                stroke="currentColor"
                strokeWidth="0.5"
                animate={{ d: ["M 0 10 Q 25 0 50 10 T 100 10", "M 0 10 Q 25 20 50 10 T 100 10", "M 0 10 Q 25 0 50 10 T 100 10"] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              />
            </svg>
            <div className="flex-1 h-[1px] bg-gradient-to-r from-transparent via-[#468FEA]/40 to-transparent relative z-10">
              <motion.div
                animate={{ left: ["0%", "100%"] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                className="absolute -top-1 w-2 h-2 bg-[#468FEA] rounded-full blur-[1px]"
              />
            </div>
          </div>
          <div className="px-3 py-2 rounded-lg clay-card-inset flex items-center gap-2">
            <Lock size={10} className="text-[#468FEA]" />
            <span className="text-[8px] font-black uppercase tracking-widest text-[#468FEA]/80">Secure</span>
          </div>
        </div>
      )
    },
    {
      title: "Realistic Auto-Type",
      desc: "Type your text letter by letter automatically. Perfect for websites or windows that block copy-paste.",
      icon: <Keyboard size={22} className="text-[#F28500]" />,
      span: "md:col-span-1",
      visual: (
        <div className="mt-auto pt-6 flex flex-wrap gap-1 opacity-40 group-hover:opacity-80 transition-opacity">
          {["SHIFT", "CMD", "V", "↵"].map(key => (
            <div key={key} className="px-1.5 py-1 rounded-sm border border-gray-300 text-[6px] font-mono text-gray-500 font-bold">{key}</div>
          ))}
        </div>
      )
    },
    {
      title: "100% Private Cache",
      desc: "Your data is never saved online. All messages stay temporarily in memory and only travel over your Wi-Fi.",
      icon: <ShieldCheck size={22} className="text-[#468FEA]" />,
      span: "md:col-span-1"
    },
    {
      title: "Phone Controller",
      desc: "No app setup needed. Just scan the QR code to use your phone or tablet browser as a remote keyboard.",
      icon: <Smartphone size={22} className="text-[#F28500]" />,
      span: "md:col-span-1"
    },
    {
      title: "Snippet Vault",
      desc: "Share and access shared code snippets in real time with trusted team members. Get snippets directly on your screen.",
      icon: <FileCode size={22} className="text-[#468FEA]" />,
      span: "md:col-span-1"
    }
  ];

  return (
    <section id="features" className="min-h-screen flex items-center py-16 md:py-24 px-6 md:px-12 relative overflow-hidden font-dmsans">
      <div className="max-w-6xl mx-auto w-full relative z-10">
        <div className="flex flex-col md:flex-row justify-between items-end gap-4 mb-8">
          <div>
            <h2 className="text-3xl md:text-4xl font-rubik font-black tracking-tighter mb-1.5 text-gray-900">Core Features</h2>
            <p className="text-gray-500 max-w-sm font-bold text-xs leading-relaxed">Simple tools to connect your phone and computer seamlessly.</p>
          </div>
          <div className="h-[1px] flex-1 bg-gradient-to-r from-gray-300/40 to-transparent hidden md:block mb-3 ml-12" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {features.map((f, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              whileHover={{ y: -4, scale: 1.01 }}
              transition={{ delay: i * 0.1, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              onMouseMove={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                e.currentTarget.style.setProperty("--x", `${e.clientX - rect.left}px`);
                e.currentTarget.style.setProperty("--y", `${e.clientY - rect.top}px`);
              }}
              className={`relative group p-5 md:p-6 clay-card border border-white/20 overflow-hidden ${f.span}`}
            >
              {/* Spotlight overlay inside card */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none bg-[radial-gradient(circle_at_var(--x,_50%)_var(--y,_50%),_rgba(70,143,234,0.05)_0%,_transparent_60%)]" />

              <div className="relative z-10 h-full flex flex-col">
                <div className="w-10 h-10 rounded-lg clay-card-inset flex items-center justify-center mb-4 group-hover:scale-105 transition-all duration-500">
                  {f.icon}
                </div>
                <h3 className="text-lg font-black mb-1.5 font-rubik tracking-tight text-gray-900">{f.title}</h3>
                <p className="text-xs text-gray-500 leading-relaxed font-bold max-w-[280px]">
                  {f.desc}
                </p>
                {f.visual}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

const SetupGuide = () => {
  const deviceSteps = [
    {
      step: "01",
      title: "Open & Start",
      desc: "Open the app and start the backend. A QR code or session link will display for your mobile.",
      icon: <Monitor size={24} />
    },
    {
      step: "02",
      title: "Scan to Connect",
      desc: "Scan the QR code or open the link on your mobile to connect your devices directly.",
      icon: <Smartphone size={24} />
    },
    {
      step: "03",
      title: "Ready to Use",
      desc: "That's it! Use all features as needed and experience the intelligent layer.",
      icon: <Zap size={24} />
    }
  ];

  return (
    <div className="max-w-7xl mx-auto px-6 sm:px-12 font-dmsans">
      <div className="flex flex-col md:flex-row justify-between items-end gap-12 mb-12 md:mb-20">
        <div>
          <h3 className="text-5xl md:text-6xl font-black font-rubik tracking-tighter uppercase mb-3 text-gray-900">Setup Guide</h3>
          <p className="text-gray-500 text-base md:text-lg font-bold">Follow the steps below to initialize your link.</p>
        </div>
      </div>

      <div className="relative min-h-[340px]">
        {/* Adjusted connecting line for larger badges */}
        <div className="absolute top-16 left-0 w-full h-[1px] bg-gradient-to-r from-gray-300/40 to-transparent hidden md:block" />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-20">
          {deviceSteps.map((s, i) => (
            <div key={i} className="relative">
              {/* Increased size from w-12 h-12 to w-16 h-16, and text-xs to text-sm */}
              <div className="w-16 h-16 rounded-full clay-orange text-white flex items-center justify-center font-black text-sm mb-6 md:mb-10 relative z-10 shadow-[0_6px_16px_rgba(242,133,0,0.25)] font-rubik">
                {s.step}
              </div>
              {/* Increased size from text-xl to text-2xl */}
              <h4 className="text-2xl font-black mb-5 font-rubik tracking-tight flex items-center gap-3 text-gray-900">
                {s.title}
              </h4>
              {/* Increased size from text-sm to text-base */}
              <p className="text-base text-gray-500 leading-relaxed font-bold">
                {s.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default function Home() {
  const [showComingSoon, setShowComingSoon] = useState(false);
  const [showProviderModal, setShowProviderModal] = useState(false);
  const [providerStep, setProviderStep] = useState(1);
  const [providerEmail, setProviderEmail] = useState("");
  const [providerPassword, setProviderPassword] = useState("");
  const [providerRole, setProviderRole] = useState<"creator" | "contributor" | null>(null);
  const [providerName, setProviderName] = useState("");
  const [providerDob, setProviderDob] = useState("");
  const [providerOccupation, setProviderOccupation] = useState("Student");
  const [providerReferral, setProviderReferral] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [authMethod, setAuthMethod] = useState<"google" | "email" | null>(null);

  const globalMouseX = useMotionValue(0);
  const globalMouseY = useMotionValue(0);

  // FAQ state
  const [openFaqIdx, setOpenFaqIdx] = useState<number | null>(null);

  // QR state
  const [qrSyncStatus, setQrSyncStatus] = useState<"unlinked" | "scanning" | "linked">("unlinked");

  // Tactile suite bridge status and toggles states
  const [bridgeStatus, setBridgeStatus] = useState<"offline" | "connecting" | "online">("offline");
  // Curtain animation states
  const [isCurtainHovered, setIsCurtainHovered] = useState(false);
  const [curtainsInView, setCurtainsInView] = useState(false);
  const [hasHovered, setHasHovered] = useState(false);

  const [toggles, setToggles] = useState({
    flashMode: true,
    injectMode: false,
    liveSync: true
  });

  const handleInitBridge = () => {
    if (bridgeStatus !== "offline") return;
    setBridgeStatus("connecting");
    setTimeout(() => {
      setBridgeStatus("online");
    }, 1500);
  };

  const handleQrSync = () => {
    if (qrSyncStatus !== "unlinked") return;
    setQrSyncStatus("scanning");
    setTimeout(() => {
      setQrSyncStatus("linked");
    }, 1200);
  };

  const handleGlobalMouseMove = (e: React.MouseEvent) => {
    globalMouseX.set(e.clientX);
    globalMouseY.set(e.clientY);
  };

  useEffect(() => {
    if (providerStep === 5) {
      const timer = setTimeout(() => {
        window.location.href = providerRole === "creator" ? "/publish" : "/contributors";
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [providerStep, providerRole]);

  return (
    <div
      onMouseMove={handleGlobalMouseMove}
      className="min-h-screen bg-[#EDEAE0] text-gray-900 font-dmsans relative overflow-x-hidden antialiased"
    >
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
            -20px -20px 40px rgba(255,255,255,0.4),
            inset 6px 6px 12px rgba(255,255,255,0.4),
            inset -6px -6px 12px rgba(0,0,0,0.04);
        }

        .clay-card-blue-bg {
          background: #EDEAE0;
          border-radius: 40px;
          box-shadow: 
            20px 20px 40px rgba(0,0,0,0.08), 
            inset 6px 6px 12px rgba(255,255,255,0.4),
            inset -6px -6px 12px rgba(0,0,0,0.04);
        }

        .clay-card-inset {
          background: #EDEAE0;
          box-shadow: 
            inset 4px 4px 8px rgba(0,0,0,0.04),
            inset -4px -4px 8px rgba(255,255,255,0.3);
          border: 1px solid rgba(255,255,255,0.15);
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

      <AnimatePresence>
        {showComingSoon && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/40 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative max-w-sm w-full clay-card p-8 border border-white/20 shadow-2xl text-center overflow-hidden"
            >
              <div className="relative z-10">
                <div className="w-16 h-16 clay-orange rounded-3xl flex items-center justify-center text-white mx-auto mb-6 shadow-lg">
                  <Globe size={32} className="animate-pulse" />
                </div>

                <h4 className="text-2xl font-black font-rubik uppercase tracking-tighter mb-4 text-gray-900">Thank You!</h4>
                <p className="text-gray-500 font-bold leading-relaxed mb-10 text-sm">
                  The Chrome extension is currently under development and is <span className="text-[#F28500] font-black">Coming Soon</span>.
                  <br /><br />
                  For now, please use the <span className="text-gray-800">Windows</span> or <span className="text-gray-800">macOS</span> backend to bridge your devices.
                </p>

                <div className="flex flex-col gap-3">
                  <button
                    onClick={() => setShowComingSoon(false)}
                    className="w-full py-4 rounded-full clay-blue text-white font-black text-[10px] uppercase tracking-[0.2em] transition-all duration-500 font-rubik"
                  >
                    Got It
                  </button>
                  <Link
                    href="#downloads"
                    onClick={() => setShowComingSoon(false)}
                    className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 hover:text-gray-700 transition-colors py-2 font-rubik"
                  >
                    View Backends
                  </Link>
                </div>
              </div>

              <button
                onClick={() => setShowComingSoon(false)}
                className="absolute top-6 right-6 text-gray-400 hover:text-gray-700 transition-colors"
              >
                <X size={20} />
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="absolute top-0 left-0 w-full h-[120vh] overflow-hidden pointer-events-none z-0 opacity-[0.03]">
        <RippleGrid
          enableRainbow={false}
          gridColor="#000000"
          rippleIntensity={0.02}
          gridSize={12}
          gridThickness={15}
          mouseInteraction={true}
          mouseInteractionRadius={1.2}
          opacity={0.08}
        />
      </div>

      <Navbar globalMouseX={globalMouseX} globalMouseY={globalMouseY} />



      <Hero
        qrSyncStatus={qrSyncStatus}
        setQrSyncStatus={setQrSyncStatus}
        handleQrSync={handleQrSync}
      />

      {/* ─── LATENCY SLABS SECTION (IMAGE 1) ─── */}
      <section id="technology" className="min-h-screen flex items-center py-16 md:py-24 px-6 md:px-12 relative overflow-hidden font-dmsans">
        <div className="max-w-7xl mx-auto w-full relative z-10 flex flex-col lg:flex-row items-center gap-16">
          <div className="lg:w-1/2 space-y-12">
            <span className="text-[10px] font-black uppercase tracking-widest text-[#F28500] bg-orange-50 px-3.5 py-1.5 rounded-full border border-orange-100/50">
              Latency Engine
            </span>
            <motion.h2
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="font-rubik text-5xl lg:text-6xl font-black tracking-tighter leading-none"
            >
              sub-50ms sync speed.
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
                  <div className="w-12 h-12 clay-card shrink-0 flex items-center justify-center shadow-[inset_2px_2px_4px_rgba(255,255,255,0.8)] border border-white/40">
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
          <div className="lg:w-1/2 h-[320px] md:h-[500px] relative isometric-stack flex items-center justify-center group cursor-pointer scale-[0.65] sm:scale-75 md:scale-90 lg:scale-100 transition-transform duration-500">
            {/* Top Slab: Stalled Legacy Cloud */}
            <div
              className="slab slab-top bg-gray-300 shadow-[10px_10px_20px_rgba(0,0,0,0.08)] border border-white/20"
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
              <svg className="w-12 h-12 text-white animate-pulse" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 13.5L12 21m0 0l-7.5-7.5M12 21V3" />
              </svg>
            </div>

            {/* Bottom Slab: Speedup */}
            <div
              className="slab slab-bot clay-orange"
              style={{ transform: "rotateX(45deg) rotateZ(-35deg) translateZ(-90px)" }}
            >
              <span className="text-white/80 text-[10px] font-black uppercase tracking-widest mb-1 font-rubik">Local Engine</span>
              <span className="text-white text-3xl font-black font-rubik tracking-tighter">SUB-50ms SYNC LATENCY</span>
            </div>
          </div>
        </div>
      </section>

      <Features />



      {/* Setup Guide */}
      <section id="setup" className="min-h-screen flex items-center py-24 relative overflow-hidden font-dmsans border-b border-gray-200/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 w-full">
          <SetupGuide />
        </div>
      </section>

      {/* Downloads */}
      <section id="downloads" className="min-h-screen flex flex-col justify-center py-24 relative overflow-hidden font-dmsans">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 mb-20 text-center w-full">
          <h2 className="text-3xl md:text-5xl font-rubik font-black tracking-tighter mb-4 text-gray-900 leading-none">READY TO TYPE<br />WITHOUT BOUNDS?</h2>
          <p className="text-gray-500 max-w-lg mx-auto font-bold text-sm mt-4">Download and run the backend for your OS to start your local sync tunnel.</p>
        </div>

        {/* Full-width Curtain Container (Slightly reduced padding and height) */}
        <div 
          onMouseEnter={() => {
            setIsCurtainHovered(true);
            setHasHovered(true);
          }}
          onMouseLeave={() => setIsCurtainHovered(false)}
          className="relative overflow-hidden w-full py-16 group/curtain bg-[#468FEA] border-t-8 border-white/30 min-h-[420px] flex items-center justify-center"
        >
          <div className="max-w-3xl mx-auto px-6 w-full z-10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                {
                  title: "macOS Backend",
                  icon: <Monitor size={24} />,
                  label: "Copy Install Cmd",
                  installCommand: "curl -sSL lanpad.app/mac | bash",
                  version: "v1.5.8.7",
                  supported: "macOS 12.0+",
                  theme: "amber",
                  btnClass: "clay-orange text-white",
                  borderHover: "hover:border-[#F28500]/40",
                },
                {
                  title: "Windows Backend",
                  icon: <Monitor size={24} />,
                  label: "Copy Install Cmd",
                  installCommand: "powershell -c \"irm https://lanpad.app/install-windows.ps1 | iex\"",
                  version: "v1.5.8.7",
                  supported: "Windows 10/11",
                  theme: "indigo",
                  btnClass: "clay-blue text-white",
                  borderHover: "hover:border-[#468FEA]/40",
                }
              ].map((d, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-50px" }}
                  whileHover={{ y: -4, scale: 1.01 }}
                  transition={{ delay: i * 0.1, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                  onMouseMove={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    e.currentTarget.style.setProperty("--x", `${e.clientX - rect.left}px`);
                    e.currentTarget.style.setProperty("--y", `${e.clientY - rect.top}px`);
                  }}
                  className={`group/card relative p-6 border border-white/20 clay-card-blue-bg rounded-[28px] overflow-hidden ${d.borderHover} min-h-[290px] flex flex-col justify-between`}
                >
                  {/* Spotlight inside download card */}
                  <div className="absolute inset-0 opacity-0 group-hover/card:opacity-100 transition-opacity duration-500 pointer-events-none bg-[radial-gradient(circle_at_var(--x,_50%)_var(--y,_50%),_rgba(70,143,234,0.04)_0%,_transparent_60%)]" />

                  <div className="relative z-10 flex flex-col h-full justify-between">
                    {/* Header */}
                    <div className="flex justify-between items-start mb-4">
                      <div className="w-11 h-11 clay-card-inset rounded-xl flex items-center justify-center text-gray-500">
                        {d.icon}
                      </div>
                      <div className="text-right font-mono">
                        <div className="text-[9px] font-bold text-gray-600 mb-0.5">{d.version}</div>
                        <div className="text-[8px] text-gray-400 uppercase tracking-widest">{d.supported}</div>
                      </div>
                    </div>

                    {/* Title & Action */}
                    <div className="mt-auto">
                      <h3 className="text-xl font-black font-rubik tracking-tighter text-gray-700 group-hover/card:text-gray-900 transition-colors duration-500 mb-4">{d.title}</h3>

                      <button
                        onClick={() => {
                          if (d.installCommand) {
                            copyToClipboard(d.installCommand);
                            alert("Install command copied to clipboard! Paste it in your Terminal.");
                          }
                        }}
                        className={`group/btn relative w-full overflow-hidden rounded-full p-3 flex items-center justify-between transition-all duration-500 shadow-sm ${d.btnClass}`}
                      >
                        <div className="flex items-center gap-3 ml-2 z-10">
                          <span className="text-[9px] font-black uppercase tracking-[0.2em] font-rubik">
                            {d.label}
                          </span>
                        </div>

                        <div className="w-7 h-7 rounded-full bg-white/20 border border-white/10 flex items-center justify-center group-hover/btn:bg-white transition-all duration-500 z-10">
                          <ArrowRight size={12} className="text-white group-hover/btn:text-gray-900 group-hover/btn:-rotate-45 transition-all duration-500" />
                        </div>
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Left Curtain Panel */}
          <motion.div
            initial={{ x: "0%" }}
            animate={curtainsInView ? { x: isCurtainHovered ? "-96%" : "-90%" } : { x: "0%" }}
            onViewportEnter={() => setCurtainsInView(true)}
            viewport={{ once: true, margin: "-120px" }}
            transition={{ duration: 1.6, ease: [0.77, 0, 0.175, 1], delay: 0.2 }}
            className="hidden md:flex absolute top-0 bottom-0 left-0 w-1/2 bg-[#EDEAE0] border-r-[12px] border-white/20 shadow-[20px_0_40px_rgba(0,0,0,0.12)] items-center justify-end z-20 pointer-events-auto cursor-pointer"
          >
            {/* Pull Handle */}
            <div className="mr-8 w-8 h-32 clay-card shadow-[inset_2px_2px_4px_rgba(255,255,255,0.8),inset_-2px_-2px_4px_rgba(0,0,0,0.05)] flex items-center justify-center">
              <span className="text-[10px] font-black text-gray-400 rotate-90 select-none">PULL</span>
            </div>
          </motion.div>

          {/* Right Curtain Panel */}
          <motion.div
            initial={{ x: "0%" }}
            animate={curtainsInView ? { x: isCurtainHovered ? "96%" : "90%" } : { x: "0%" }}
            onViewportEnter={() => setCurtainsInView(true)}
            viewport={{ once: true, margin: "-120px" }}
            transition={{ duration: 1.6, ease: [0.77, 0, 0.175, 1], delay: 0.2 }}
            className="hidden md:flex absolute top-0 bottom-0 right-0 w-1/2 bg-[#EDEAE0] border-l-[12px] border-white/20 shadow-[-20px_0_40px_rgba(0,0,0,0.12)] items-center justify-start z-20 pointer-events-auto cursor-pointer"
          >
            {/* Pull Handle */}
            <div className="ml-8 w-8 h-32 clay-card shadow-[inset_2px_2px_4px_rgba(255,255,255,0.8),inset_-2px_-2px_4px_rgba(0,0,0,0.05)] flex items-center justify-center">
              <span className="text-[10px] font-black text-gray-400 -rotate-90 select-none">PULL</span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ─── FAQS SECTION ─── */}
      <section className="min-h-screen flex items-center py-16 md:py-32 px-6 md:px-12 relative overflow-hidden font-dmsans">
        <div className="max-w-3xl mx-auto w-full relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 35 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="space-y-12"
          >
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-[#F28500]">FAQ</span>
              <h2 className="font-rubik text-4xl lg:text-5xl font-black mt-2 tracking-tighter">GOT QUESTIONS?</h2>
              <p className="text-gray-500 font-medium text-sm mt-1">Simple answers to common questions about LANpad.</p>
            </div>

            <div className="space-y-4">
              {[
                {
                  q: "What is LANpad and how does it work?",
                  a: "LANpad is a simple app that lets you send text from your phone directly to your computer. It runs over your local Wi-Fi, making it very fast and secure."
                },
                {
                  q: "What does a contributor do?",
                  a: "A contributor is a developer who uploads helpful code solutions and snippets to our database. If you contribute code, you help other developers sync solutions directly to their screens during collaboration sessions."
                },
                {
                  q: "How do I get a license key for premium?",
                  a: "You can buy a premium pass (like a Week, Monthly, or Sem Pass) on our pricing page to get a license key. Paste this key into the desktop app to unlock advanced features like live character sync, fast custom typing speeds, and special campus tunnels."
                },
                {
                  q: "How does payment work?",
                  a: "Payments are processed securely through Razorpay. You can pay using UPI, cards, or net banking. Once paid, your premium license key will appear on your screen and will also be sent to your email."
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
                          <p className="p-6 text-xs text-gray-500 font-bold leading-relaxed bg-[#EDEAE0]/30">
                            {item.a}
                          </p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </motion.div>

        </div>
      </section>

      {/* Footer */}
      <footer className="pt-24 pb-16 border-t border-gray-200/40 relative overflow-hidden font-dmsans">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 relative z-10">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-12 mb-20">

            {/* Brand Column */}
            <div className="col-span-2">
              <div className="flex items-center gap-4 font-rubik font-black text-xl md:text-2xl tracking-tighter mb-8 text-gray-900">
                <img src="/logo.png" alt="LANpad Logo" className="w-12 h-12 object-contain rounded-xl shadow-md" />
                <span className="mt-1">LANPAD</span>
              </div>
              <p className="text-sm text-gray-500 font-bold max-w-xs leading-relaxed mb-8">
                Building the intelligent layer between your phone and your machine. Zero-lag, local-first synchronization for power users.
              </p>
              <div className="flex gap-5">
                {[
                  { icon: <Globe size={18} />, label: "Web" },
                  { icon: <Star size={18} />, label: "GitHub" },
                  { icon: <ShieldCheck size={18} />, label: "Security" }
                ].map((s, i) => (
                  <button key={i} className="group/social relative w-12 h-12 rounded-full clay-card flex items-center justify-center text-gray-500 hover:text-gray-800 transition-all hover:scale-110 shadow-sm border border-white/20">
                    <div className="relative z-10">{s.icon}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Product Column */}
            <div>
              <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 mb-8 font-rubik">Product</h4>
              <ul className="space-y-4 text-sm font-bold text-gray-500">
                <li><a href="#features" className="hover:text-gray-800 transition-colors">Features</a></li>
                <li><a href="#visualization" className="hover:text-gray-800 transition-colors">Technology</a></li>
                <li><a href="#downloads" className="hover:text-gray-800 transition-colors">Downloads</a></li>
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
              <ul className="space-y-4 text-sm font-bold text-gray-500">
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
          <div className="mt-12 p-6 clay-card shadow-inner border border-white/20 rounded-2xl text-[11px] leading-relaxed text-gray-500 font-bold">
            <p className="font-black uppercase tracking-wider mb-2 text-orange-500 font-rubik">Legal Disclaimer</p>
            LANpad is provided as a productivity utility for local network synchronization and keyboard input simulation. The developers, contributors, and founders assume no liability or responsibility for any misuse of this tool, including but not limited to restricted input violations, policy infractions on external platforms, data security compromises arising from user-configured networks, or system disruption. Users are solely responsible for compliance with their local institution rules, terms of service of third-party platforms, and all applicable privacy laws.
          </div>

          {/* Bottom Row */}
          <div className="mt-16 pt-12 border-t border-gray-200/40 flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full clay-card text-[10px] font-black uppercase tracking-widest text-emerald-600 border border-white/20">
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
