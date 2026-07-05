"use client";

import React, { useState, useEffect, useRef } from "react";
// 1. 引入剛剛建立的作品集網格組件
import PortfolioGrid from "../components/PortfolioGrid";
import SubscriptionCards from "../components/SubscriptionCards";
import ProcessWorkflow from "../components/ProcessWorkflow";
import BackToTop from "../components/BackToTop";
import LiveProjects from "../components/LiveProjects";
import Header from "../components/Header";
import AskAIDialog from "../components/dashboard/AskAIDialog";

interface Point {
  x: number;
  y: number;
}

export default function Home() {
  const [activeTool, setActiveTool] = useState<"select" | "pen" | "node" | "hand">("pen");
  const [showGrid, setShowGrid] = useState(true);
  const [zoom, setZoom] = useState(100);
  const [customPoints, setCustomPoints] = useState<Point[]>([]);
  const [hoveredNode, setHoveredNode] = useState<number | null>(null);
  const [draggedNode, setDraggedNode] = useState<number | null>(null);

  // Real-time canvas mouse coordinates
  const [mouseCanvasPos, setMouseCanvasPos] = useState<Point>({ x: 180, y: 120 });
  const [isHoveringCanvas, setIsHoveringCanvas] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [hoveringTitle, setHoveringTitle] = useState(false);

  const canvasRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [showHeader, setShowHeader] = useState(false);
  const [showVisitorAI, setShowVisitorAI] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setShowHeader(entry.isIntersecting || entry.boundingClientRect.top < 0),
      { threshold: 0.05 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [isClient]);

  // Update mouse position relative to canvas
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = Math.round(e.clientX - rect.left);
    const y = Math.round(e.clientY - rect.top);
    setMouseCanvasPos({ x, y });

    // Handle node dragging for custom drawn points
    if (draggedNode !== null && activeTool === "node") {
      setCustomPoints((prev) =>
        prev.map((pt, idx) => (idx === draggedNode ? { x, y } : pt))
      );
    }
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (activeTool === "pen") {
      // Don't add if we clicked on an existing node or UI button
      const target = e.target as HTMLElement;
      if (target.closest(".node-element") || target.closest(".ui-element")) return;

      if (!canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      const x = Math.round(e.clientX - rect.left);
      const y = Math.round(e.clientY - rect.top);
      setCustomPoints((prev) => [...prev, { x, y }]);
    }
  };

  const handleNodeMouseDown = (idx: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (activeTool === "node") {
      setDraggedNode(idx);
    }
  };

  const handleMouseUp = () => {
    setDraggedNode(null);
  };

  const removePoint = (idx: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setCustomPoints((prev) => prev.filter((_, i) => i !== idx));
    setHoveredNode(null);
  };

  const clearCanvas = () => {
    setCustomPoints([]);
  };

  // Generate SVG path for custom drawn points
  const getCustomPathD = () => {
    if (customPoints.length === 0) return "";
    if (customPoints.length === 1) return `M ${customPoints[0].x} ${customPoints[0].y}`;

    return customPoints.reduce((acc, pt, idx) => {
      if (idx === 0) return `M ${pt.x} ${pt.y}`;
      const prev = customPoints[idx - 1];
      return `${acc} C ${(prev.x + pt.x) / 2} ${prev.y}, ${(prev.x + pt.x) / 2} ${pt.y}, ${pt.x} ${pt.y}`;
    }, "");
  };

  if (!isClient) {
    return <div className="min-h-screen bg-[#121214]" />;
  }

  // Raw code string for SVG Output panel
  const customSvgOutput = customPoints.length > 0
    ? `<path d="${getCustomPathD()}" fill="none" stroke="#FF5500" stroke-width="2" />`
    : `<path d="M94.24 134.59C94.62 135.1..." fill="white" />`;

  return (
    <div className="w-full bg-[#121214] text-white font-sans">
      <Header visible={showHeader} />

      {/* HERO EDITOR BLOCK (限制在一整個螢幕高度且內含絕對定位物件) */}
      <div
        className="h-screen flex flex-col bg-[#121214] select-none overflow-hidden relative border-b border-[#1F1F23]"
        onMouseUp={handleMouseUp}
      >
        {/* 1. TOP NAVBAR / JAGGER OS HEADER */}
        <header className="h-12 border-b border-[#1F1F23] bg-[#0A0A0B] px-3 sm:px-4 flex items-center justify-between text-xs font-mono z-20">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-5 h-5 rounded bg-[#FF5500] flex items-center justify-center font-bold text-black text-sm">
              J
            </div>
            <span className="font-semibold tracking-wider text-zinc-200">
              <span className="hidden sm:inline">JAGGER OS v2.0</span>
              <span className="sm:hidden text-zinc-100">JAGGER</span>
            </span>
            <span className="hidden sm:inline-block px-1.5 py-0.5 rounded bg-white/5 text-[10px] text-zinc-500 border border-[#1F1F23]">
              WORKSPACES
            </span>
          </div>

          {/* Real-time stats display (Hidden on mobile) */}
          <div className="hidden md:flex items-center gap-6 text-zinc-400">
            <div>
              Canvas: <span className="text-white">1000 × 750</span>
            </div>
            <div>
              X: <span className="text-[#FF5500]">{mouseCanvasPos.x}px</span> Y:{" "}
              <span className="text-[#FF5500]">{mouseCanvasPos.y}px</span>
            </div>
            <div>
              Scale: <span className="text-white">{zoom}%</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 ui-element">
            <button
              onClick={clearCanvas}
              className="px-2 py-1 rounded border border-[#1F1F23] hover:border-[#FF5500]/50 text-zinc-400 hover:text-white transition-all hover:bg-white/5 cursor-pointer text-[10px] sm:text-xs"
            >
              <span className="hidden sm:inline">Reset Path</span>
              <span className="sm:hidden">Reset</span>
            </button>
            <button
              onClick={() => setZoom(prev => prev === 100 ? 120 : 100)}
              className="hidden sm:block px-2.5 py-1 rounded border border-[#1F1F23] text-zinc-400 hover:text-white hover:bg-white/5 cursor-pointer text-[10px] sm:text-xs"
            >
              Zoom
            </button>
          </div>
        </header>

        {/* WORKSPACE CONTAINER */}
        <div className="flex-1 flex relative overflow-hidden">

          {/* 2. LEFT SIDEBAR: LAYERS & MODE GUIDE */}
          <aside className="hidden lg:flex w-[260px] border-r border-[#1F1F23] bg-[#0A0A0B] flex-col z-10">
            {/* LAYERS PANEL */}
            <div className="flex-1 flex flex-col min-h-0">
              <div className="p-3 border-b border-[#1F1F23] flex items-center justify-between">
                <span className="text-xs font-bold font-mono tracking-wider text-zinc-400">LAYERS</span>
                <span className="text-[10px] text-zinc-500 font-mono">2 ITEMS</span>
              </div>

              <div className="p-2 font-mono text-xs space-y-1 flex-1 overflow-y-auto">
                <div className="flex items-center justify-between p-2 rounded bg-[#FF5500]/10 text-white border border-[#FF5500]/20">
                  <div className="flex items-center gap-2">
                    <span className="text-[#FF5500] font-bold">✎</span>
                    <span className="truncate">Jagger (Active Edit)</span>
                  </div>
                  <span className="text-[9px] text-[#FF5500] font-semibold bg-[#FF5500]/20 px-1 rounded">VECTOR</span>
                </div>

                <div className="flex items-center justify-between p-2 rounded text-zinc-400 hover:bg-white/5 transition-colors">
                  <div className="flex items-center gap-2">
                    <span className="text-zinc-600">T</span>
                    <span className="truncate">PORTFOLIO Text</span>
                  </div>
                  <span className="text-[9px] text-zinc-600 bg-white/5 px-1 rounded font-semibold">TEXT</span>
                </div>

                <div className="flex items-center justify-between p-2 rounded text-zinc-400 hover:bg-white/5 transition-colors">
                  <div className="flex items-center gap-2">
                    <span className="text-zinc-500">::</span>
                    <span className="truncate">Grid Guidelines</span>
                  </div>
                  <span className="text-[10px] text-emerald-500 font-bold">ACTIVE</span>
                </div>

                {customPoints.length > 0 && (
                  <div className="flex items-center justify-between p-2 rounded bg-zinc-800/40 text-zinc-300 border border-white/5 mt-4">
                    <div className="flex items-center gap-2">
                      <span className="text-orange-400">✎</span>
                      <span className="truncate">User Path ({customPoints.length} nodes)</span>
                    </div>
                    <button
                      onClick={clearCanvas}
                      className="text-zinc-500 hover:text-red-400 text-xs px-1 hover:bg-white/5 rounded ui-element cursor-pointer"
                    >
                      ×
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* VECTOR MODE GUIDE */}
            <div className="p-4 border-t border-[#1F1F23] bg-[#0c0c0e]">
              <span className="text-xs font-bold font-mono tracking-wider text-zinc-400 block mb-2">VECTOR MODE GUIDE</span>
              <p className="text-[11px] leading-relaxed text-zinc-500 font-sans">
                {activeTool === "pen" && "✎ Pen Tool is active. Click anywhere inside the canvas coordinate grid to draw raw anchor nodes. Watch them connect with vector curves."}
                {activeTool === "node" && "⌖ Node Subselect is active. Click and drag the plotted orange custom points to manually shape your custom vectors."}
                {activeTool === "select" && "✦ Select Tool is active. Hover over the Jagger text bounding box to highlight control points."}
                {activeTool === "hand" && "✋ Hand Pan is active. Click and drag your layout workspace freely."}
              </p>
              <div className="flex gap-2 mt-3 text-[9px] font-mono">
                <span className="px-1.5 py-0.5 bg-[#FF5500]/10 text-[#FF5500] rounded">ALT + CLICK</span>
                <span className="px-1.5 py-0.5 bg-white/5 text-zinc-400 rounded">ESC</span>
              </div>
            </div>

            <div className="p-3 border-t border-[#1F1F23] text-[10px] text-zinc-600 font-mono text-center">
              Press [V] to select Jagger Text
            </div>
          </aside>

          {/* 3. CENTER VIEWPORT / DESIGN CANVAS */}
          <main
            ref={canvasRef}
            onClick={handleCanvasClick}
            onMouseMove={handleMouseMove}
            onMouseEnter={() => setIsHoveringCanvas(true)}
            onMouseLeave={() => setIsHoveringCanvas(false)}
            className={`flex-1 w-full relative flex items-center justify-center p-4 sm:p-8 lg:p-12 bg-[#0A0A0B] overflow-hidden transition-all duration-300 ${showGrid ? "vector-grid" : ""
              } ${activeTool === "pen" ? "cursor-none" : activeTool === "hand" ? "cursor-grab active:cursor-grabbing" : "cursor-default"}`}
          >
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[280px] sm:w-[500px] h-[200px] sm:h-[350px] bg-[#FF5500]/5 rounded-full blur-[90px] pointer-events-none z-0" />

            <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
              <line x1="50%" y1="0" x2="50%" y2="100%" stroke="rgba(255, 255, 255, 0.02)" strokeWidth="1" />
              <line x1="0" y1="50%" x2="100%" y2="50%" stroke="rgba(255, 255, 255, 0.02)" strokeWidth="1" />
              <path d="M -50 300 C 400 100, 600 650, 1400 400" fill="none" stroke="rgba(255, 85, 0, 0.07)" strokeWidth="1.5" strokeDasharray="5, 5" />
              {customPoints.length > 0 && (
                <>
                  <path d={getCustomPathD()} fill="none" stroke="#FF5500" strokeWidth="2.5" className="drop-shadow-[0_0_6px_rgba(255,85,0,0.4)]" />
                  <path d={customPoints.reduce((acc, pt, idx) => `${acc} ${idx === 0 ? 'M' : 'L'} ${pt.x} ${pt.y}`, "")} fill="none" stroke="rgba(255, 255, 255, 0.1)" strokeWidth="1" strokeDasharray="2, 2" />
                </>
              )}
            </svg>

            {/* CENTRAL ARTBOARD */}
            <div
              className={`relative flex flex-col items-center justify-center py-10 px-4 sm:py-16 sm:px-12 md:px-16 rounded-2xl border bg-[#0A0A0B]/85 backdrop-blur-xl max-w-full sm:max-w-xl md:max-w-2xl w-full z-10 shadow-2xl transition-all duration-300 ${hoveringTitle || activeTool === "node" ? "border-[#FF5500]/40 shadow-[#FF5500]/5" : "border-[#1F1F23]"
                }`}
              onMouseEnter={() => setHoveringTitle(true)}
              onMouseLeave={() => setHoveringTitle(false)}
            >
              <div className="absolute top-2 left-2 w-3 h-3 border-t border-l border-zinc-600 pointer-events-none" />
              <div className="absolute top-2 right-2 w-3 h-3 border-t border-r border-zinc-600 pointer-events-none" />
              <div className="absolute bottom-2 left-2 w-3 h-3 border-b border-l border-zinc-600 pointer-events-none" />
              <div className="absolute bottom-2 right-2 w-3 h-3 border-b border-r border-zinc-600 pointer-events-none" />

              <div className="absolute -top-3 left-4 sm:left-6 bg-[#0A0A0B] border border-[#1F1F23] px-2.5 py-0.5 text-[9px] font-mono text-zinc-500 rounded flex items-center gap-1.5 pointer-events-none">
                <span className="w-1 h-1 rounded-full bg-[#FF5500]" />
                Artboard: Jagger_Brand (320px)
              </div>

              {/* MAIN LOGO WINDOW */}
              <div className="relative text-center w-full select-none cursor-default group py-4">
                <div className={`absolute -inset-x-2 -inset-y-1 border border-dashed rounded transition-all duration-300 pointer-events-none ${hoveringTitle || activeTool === "node" ? "border-[#FF5500]/50 bg-[#FF5500]/[0.01]" : "border-white/5"
                  }`} />

                <div className="absolute -top-1.5 -left-1.5 w-2.5 h-2.5 bg-[#0A0A0B] border-2 border-[#FF5500] rounded-sm pointer-events-none" />
                <div className="absolute -top-1.5 -right-1.5 w-2.5 h-2.5 bg-[#0A0A0B] border-2 border-[#FF5500] rounded-sm pointer-events-none" />
                <div className="absolute -bottom-1.5 -left-1.5 w-2.5 h-2.5 bg-[#0A0A0B] border-2 border-[#FF5500] rounded-sm pointer-events-none" />
                <div className="absolute -bottom-1.5 -right-1.5 w-2.5 h-2.5 bg-[#0A0A0B] border-2 border-[#FF5500] rounded-sm pointer-events-none" />
                <div className="absolute top-1/2 -left-1.5 -translate-y-1/2 w-2 h-2 bg-[#0A0A0B] border border-zinc-500 rounded-sm pointer-events-none" />
                <div className="absolute top-1/2 -right-1.5 -translate-y-1/2 w-2 h-2 bg-[#0A0A0B] border border-zinc-500 rounded-sm pointer-events-none" />
                <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-2 h-2 bg-[#0A0A0B] border border-zinc-500 rounded-sm pointer-events-none" />
                <div className="absolute -top-5 left-1/2 -translate-x-1/2 w-[1px] h-[15px] bg-[#FF5500]/70 pointer-events-none" />
                <div className="absolute -top-7 left-1/2 -translate-x-1/2 w-3 h-3 bg-white border border-[#FF5500] rounded-full pointer-events-none flex items-center justify-center shadow-lg shadow-[#FF5500]/20">
                  <div className="w-1.5 h-1.5 bg-[#FF5500] rounded-full" />
                </div>

                <div className="relative inline-block w-full max-w-[320px] transition-transform duration-500 group-hover:scale-[1.005]">
                  {/* Solid White SVG Logo */}
                  <svg width="316" height="194" viewBox="0 0 316 194" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M94.2432 134.593C94.6279 135.106 94.8203 135.619 94.8203 136.132C94.8203 137.799 93.9867 138.633 92.3194 138.633C90.6521 138.633 89.8184 137.799 89.8184 136.132C89.8184 135.491 90.0108 134.978 90.3956 134.593V130.553C88.7283 132.99 86.6121 134.978 84.0471 136.517C81.482 137.928 78.2757 138.633 74.4281 138.633C69.4263 138.633 65.4504 137.543 62.5006 135.362C59.6791 133.182 57.627 130.425 56.3445 127.09C55.1902 123.627 54.6131 120.1 54.6131 116.509V100.927C54.6131 97.2073 55.1902 93.6803 56.3445 90.3458C57.4988 87.0112 59.8073 84.2538 63.2701 82.0735C66.8612 79.8932 72.1196 78.803 79.0452 78.803H90.3956V60.7194C90.3956 57.7696 89.8826 54.948 88.8565 52.2547C87.9588 49.4332 86.3556 47.1246 84.0471 45.3291C81.7385 43.4053 78.5322 42.4434 74.4281 42.4434C68.6568 42.4434 64.5527 44.1748 62.1159 47.6376C59.6791 51.1004 58.3965 54.8839 58.2683 58.988C58.653 59.501 58.8454 60.014 58.8454 60.527C58.8454 62.0661 58.0118 62.8356 56.3445 62.8356C54.6772 62.8356 53.8436 62.0661 53.8436 60.527C53.8436 59.7575 54.0359 59.1804 54.4207 58.7956C54.6772 55.3328 55.4467 52.0623 56.7293 48.9843C58.14 45.9062 60.2562 43.4053 63.0778 41.4815C65.8993 39.5577 69.6828 38.5958 74.4281 38.5958C79.43 38.5958 83.3417 39.686 86.1632 41.8663C89.1131 44.0466 91.1651 46.804 92.3194 50.1386C93.6019 53.4731 94.2432 57.0001 94.2432 60.7194V134.593ZM58.4607 116.509C58.4607 119.459 58.9095 122.345 59.8073 125.166C60.7051 127.988 62.3082 130.296 64.6168 132.092C67.0536 133.888 70.324 134.785 74.4281 134.785C78.5322 134.785 81.6744 133.952 83.8547 132.284C86.1632 130.617 87.7664 128.501 88.6642 125.936C89.6902 123.371 90.2673 120.678 90.3956 117.856V82.6506H79.0452C73.0173 82.6506 68.5285 83.5484 65.5787 85.3439C62.6289 87.1394 60.7051 89.448 59.8073 92.2696C58.9095 95.0911 58.4607 97.9768 58.4607 100.927V116.509Z" fill="white" />
                    <path d="M40.592 117.279C40.592 120.87 39.9507 124.333 38.6682 127.667C37.5139 130.874 35.4619 133.503 32.5121 135.555C29.6905 137.607 25.7147 138.633 20.5846 138.633C13.5307 138.633 8.46468 136.645 5.38661 132.669C2.4368 128.693 0.833642 124.14 0.577137 119.01C0.192379 118.625 0 118.048 0 117.279C0 115.612 0.833642 114.778 2.50093 114.778C4.16821 114.778 5.00185 115.612 5.00185 117.279C5.00185 118.048 4.80947 118.625 4.42472 119.01C4.55297 123.371 5.8355 127.09 8.2723 130.168C10.7091 133.246 14.8132 134.785 20.5846 134.785C26.7407 134.785 30.973 132.99 33.2816 129.399C35.5901 125.808 36.7444 121.768 36.7444 117.279V4.35234C36.3596 3.96757 36.1673 3.39044 36.1673 2.62092C36.1673 1.97966 36.4238 1.40252 36.9368 0.889513C37.578 0.376501 38.1552 0.119995 38.6682 0.119995C40.3355 0.119995 41.1691 0.953638 41.1691 2.62092C41.1691 3.39044 40.9767 3.96757 40.592 4.35234V117.279Z" fill="white" />
                    <path d="M265.781 134.593C266.166 134.978 266.358 135.491 266.358 136.132C266.358 137.799 265.525 138.633 263.858 138.633C262.19 138.633 261.357 137.799 261.357 136.132C261.357 135.491 261.549 134.978 261.934 134.593V42.8281C261.549 42.1869 261.357 41.6097 261.357 41.0967C261.357 39.4294 262.19 38.5958 263.858 38.5958C265.525 38.5958 266.358 39.4294 266.358 41.0967C266.358 41.6097 266.166 42.1869 265.781 42.8281V49.5614C267.577 46.6116 269.693 44.3672 272.13 42.8281C274.695 41.2891 277.901 40.5196 281.749 40.5196H285.019C285.661 40.1348 286.238 39.9425 286.751 39.9425C288.418 39.9425 289.252 40.7761 289.252 42.4434C289.252 44.1107 288.418 44.9443 286.751 44.9443C286.238 44.9443 285.661 44.7519 285.019 44.3672H281.749C276.362 44.3672 272.322 46.291 269.629 50.1385C267.064 53.9861 265.781 58.1543 265.781 62.6432V134.593Z" fill="white" />
                    <path d="M136.746 73.9916C142.841 69.7972 148.809 66.5732 154.653 64.3195C160.496 62.0659 165.554 60.939 169.826 60.939C174.099 60.939 176.832 62.1598 178.026 64.6013C180.476 61.7842 183.523 60.2817 187.168 60.0939C188.236 60.0313 189.555 60 191.126 60C192.697 60 193.671 60.2191 194.048 60.6573C194.425 61.0329 194.77 61.7842 195.084 62.911C195.398 64.0378 195.587 64.6639 195.65 64.7891C195.713 64.9143 195.744 65.1334 195.744 65.4464C195.744 65.6968 195.587 66.0411 195.273 66.4793C194.959 66.8549 194.582 67.2306 194.142 67.6062C193.765 67.9818 193.545 68.2009 193.482 68.2635C179.597 88.1084 165.397 110.739 150.883 136.156C165.837 122.947 179.22 113.462 191.032 107.703C191.786 107.327 192.508 107.139 193.199 107.139C194.205 107.139 194.864 107.797 195.179 109.111C195.493 110.363 195.65 112.179 195.65 114.558C195.65 116.937 195.493 118.408 195.179 118.971C194.927 119.535 193.482 120.662 190.843 122.352C188.204 124.042 184.78 126.233 180.57 128.925C176.361 131.617 171.9 134.591 167.187 137.846C155.878 145.671 146.579 153.903 139.291 162.542C129.866 173.873 123.112 183.013 119.028 189.962C117.52 192.654 114.975 194 111.394 194C104.294 194 100.744 190.651 100.744 183.952C100.744 177.129 104.105 170.149 110.828 163.012C115.855 157.691 120.473 153.34 124.682 149.959C128.892 146.579 131.185 144.669 131.562 144.231C136.212 137.282 142.526 127.423 150.506 114.652C143.72 121.726 137.123 127.36 130.714 131.554C124.368 135.749 119.625 137.846 116.483 137.846C106.87 137.846 102.063 133.745 102.063 125.545C102.063 119.034 103.728 112.461 107.058 105.825C110.389 99.189 114.661 93.2731 119.876 88.0771C125.091 82.8185 130.714 78.1233 136.746 73.9916ZM172.654 71.5501C165.365 73.1152 158.517 75.7132 152.108 79.3441C145.699 82.9124 140.422 86.7624 136.275 90.8942C132.128 94.9633 128.547 99.1577 125.531 103.477C119.876 111.553 117.049 117.813 117.049 122.258C117.049 123.322 117.3 123.854 117.803 123.854C118.368 123.854 119.562 123.291 121.384 122.164C123.269 121.037 125.908 119.128 129.301 116.436C132.693 113.681 136.463 110.426 140.61 106.67C150.223 97.843 160.904 86.1364 172.654 71.5501Z" fill="white" />
                    <path d="M136.746 73.9916C142.841 69.7972 148.809 66.5732 154.653 64.3195C160.496 62.0659 165.554 60.939 169.826 60.939C174.099 60.939 176.832 62.1598 178.026 64.6013C180.476 61.7842 183.523 60.2817 187.168 60.0939C188.236 60.0313 189.555 60 191.126 60C192.697 60 193.671 60.2191 194.048 60.6573C194.425 61.0329 194.77 61.7842 195.084 62.911C195.398 64.0378 195.587 64.6639 195.65 64.7891C195.713 64.9143 195.744 65.1334 195.744 65.4464C195.744 65.6968 195.587 66.0411 195.273 66.4793C194.959 66.8549 194.582 67.2306 194.142 67.6062C193.765 67.9818 193.545 68.2009 193.482 68.2635C179.597 88.1084 165.397 110.739 150.883 136.156C165.837 122.947 179.22 113.462 191.032 107.703C191.786 107.327 192.508 107.139 193.199 107.139C194.205 107.139 194.864 107.797 195.179 109.111C195.493 110.363 195.65 112.179 195.65 114.558C195.65 116.937 195.493 118.408 195.179 118.971C194.927 119.535 193.482 120.662 190.843 122.352C188.204 124.042 184.78 126.233 180.57 128.925C176.361 131.617 171.9 134.591 167.187 137.846C155.878 145.671 146.579 153.903 139.291 162.542C129.866 173.873 123.112 183.013 119.028 189.962C117.52 192.654 114.975 194 111.394 194C104.294 194 100.744 190.651 100.744 183.952C100.744 177.129 104.105 170.149 110.828 163.012C115.855 157.691 120.473 153.34 124.682 149.959C128.892 146.579 131.185 144.669 131.562 144.231C136.212 137.282 142.526 127.423 150.506 114.652C143.72 121.726 137.123 127.36 130.714 131.554C124.368 135.749 119.625 137.846 116.483 137.846C106.87 137.846 102.063 133.745 102.063 125.545C102.063 119.034 103.728 112.461 107.058 105.825C110.389 99.189 114.661 93.2731 119.876 88.0771C125.091 82.8185 130.714 78.1233 136.746 73.9916ZM172.654 71.5501C165.365 73.1152 158.517 75.7132 152.108 79.3441C145.699 82.9124 140.422 86.7624 136.275 90.8942C132.128 94.9633 128.547 99.1577 125.531 103.477C119.876 111.553 117.049 117.813 117.049 122.258C117.049 123.322 117.3 123.854 117.803 123.854C118.368 123.854 119.562 123.291 121.384 122.164C123.269 121.037 125.908 119.128 129.301 116.436C132.693 113.681 136.463 110.426 140.61 106.67C150.223 97.843 160.904 86.1364 172.654 71.5501Z" fill="#FF5500" />
                    <path d="M190.899 51.95C194.349 51.2214 196.742 50.8571 198.079 50.8571C198.574 50.8571 198.855 51.0214 198.922 51.35C198.948 51.4786 199.015 51.5786 199.122 51.65C199.229 51.7071 199.336 51.9857 199.443 52.4857C199.563 52.9857 199.63 53.3929 199.644 53.7071V53.9C199.644 54.4 199.47 54.6857 199.122 54.7571C197.839 55.0429 195.746 55.3 192.844 55.5286C189.956 55.7571 188.238 55.9143 187.69 56C187.409 56 186.961 55.8357 186.346 55.5071C186.225 55.3786 186.092 55.15 185.945 54.8214C185.811 54.4929 185.744 54.2071 185.744 53.9643C185.744 53.7214 185.871 53.3286 186.125 52.7857C186.165 52.6857 187.001 51.6786 188.632 49.7643C189.033 49.3071 190.076 48.2857 191.761 46.7C193.459 45.1 194.636 43.9071 195.291 43.1214C195.96 42.3214 197.123 41 198.781 39.1571C200.439 37.3143 201.67 35.8857 202.472 34.8714C203.274 33.8429 203.675 33.1143 203.675 32.6857C203.675 32.4143 203.481 32.2786 203.094 32.2786C202.706 32.2786 202.231 32.4071 201.67 32.6643C201.121 32.9071 200.479 33.2786 199.744 33.7786C198.019 34.9643 196.361 36.75 194.77 39.1357C194.69 39.2071 194.649 39.3571 194.649 39.5857C194.542 39.8714 194.315 40.1071 193.967 40.2929C193.62 40.4786 193.339 40.5714 193.125 40.5714C192.911 40.5714 192.637 40.5 192.303 40.3571C191.982 40.2 191.741 40.0429 191.581 39.8857C191.42 39.7286 191.34 39.4286 191.34 38.9857C191.34 38.5429 191.574 37.9143 192.042 37.1C192.51 36.2714 193.165 35.4 194.008 34.4857C194.85 33.5571 195.786 32.6857 196.816 31.8714C197.859 31.0429 199.022 30.3571 200.306 29.8143C201.589 29.2714 202.679 29 203.575 29C204.471 29 205.133 29.2071 205.561 29.6214C206.35 30.3929 206.744 31.25 206.744 32.1929C206.744 33.1357 206.323 34.2929 205.48 35.6643C204.651 37.0357 203.521 38.5429 202.091 40.1857C200.66 41.8286 199.309 43.3214 198.039 44.6643C196.769 46.0071 195.358 47.4571 193.807 49.0143C192.256 50.5571 191.287 51.5357 190.899 51.95Z" fill="white" />
                    <path d="M15.1265 4.42307C14.7281 4.80768 14.1305 5 13.3336 5C11.6072 5 10.744 4.16666 10.744 2.5C10.744 0.833337 11.6072 -1.50929e-07 13.3336 0C13.8649 4.64399e-08 14.4625 0.192313 15.1265 0.576926L36.5607 0.57693C36.9591 0.192317 37.4904 4.01919e-06 38.1544 4.07724e-06C39.8808 4.22817e-06 40.744 0.833341 40.744 2.5C40.744 4.16667 39.8808 5 38.1544 5C37.4904 5 36.9591 4.80769 36.5607 4.42307L15.1265 4.42307Z" fill="white" />
                    <path d="M293.734 131.512L293.704 131.999C293.704 132.507 293.897 132.943 294.283 133.309C294.668 133.674 295.024 133.857 295.349 133.857C297.786 133.857 299.938 133.491 301.806 132.76C303.695 132.029 304.639 131.298 304.639 130.567C304.639 130.222 304.294 129.928 303.603 129.684C302.933 129.42 301.786 129.105 300.161 128.74C298.557 128.354 297.39 128.059 296.658 127.856C295.927 127.633 295.349 127.43 294.922 127.247C294.496 127.064 294.059 126.81 293.612 126.486C292.658 125.815 292.181 124.82 292.181 123.5C292.181 122.16 292.668 120.84 293.643 119.541C294.638 118.221 295.877 117.094 297.359 116.16C298.841 115.225 300.436 114.403 302.141 113.692C305.512 112.291 308.345 111.59 310.64 111.59C312.894 111.59 314.285 112.078 314.813 113.053C314.975 113.398 315.057 113.784 315.057 114.21V114.423C315.057 115.5 314.823 116.342 314.356 116.951C313.909 117.561 313.188 118.109 312.193 118.596C311.219 119.084 310.437 119.327 309.848 119.327C309.279 119.327 308.914 119.287 308.751 119.206C308.609 119.124 308.487 119.023 308.386 118.901C308.284 118.759 308.152 118.657 307.99 118.596C307.848 118.535 307.776 118.383 307.776 118.139C307.776 117.896 307.878 117.652 308.081 117.408C308.284 117.144 308.426 116.87 308.508 116.586C307.167 116.647 305.766 116.962 304.304 117.53C302.842 118.079 301.583 118.698 300.527 119.388C299.491 120.079 298.628 120.739 297.938 121.368C297.247 121.998 296.902 122.465 296.902 122.769C296.902 123.054 297.369 123.287 298.303 123.47C302.507 124.303 305.269 125.023 306.589 125.633C307.908 126.242 308.822 126.932 309.33 127.704C309.838 128.476 310.091 129.176 310.091 129.806C310.091 131.105 309.574 132.334 308.538 133.491C307.502 134.649 306.223 135.593 304.7 136.324C301.431 137.928 298.577 138.731 296.141 138.731C293.724 138.731 292.049 138.355 291.115 137.604C290.201 136.873 289.744 135.999 289.744 134.984C289.744 133.969 289.998 133.035 290.506 132.182C291.034 131.308 291.704 130.872 292.516 130.872C293.328 130.872 293.734 131.085 293.734 131.512Z" fill="white" />
                    <path d="M295.684 107.387C294.628 107.387 293.846 107.093 293.338 106.504C292.831 105.894 292.577 105.123 292.577 104.189C292.577 103.234 292.922 102.3 293.612 101.386C294.303 100.452 295.318 99.4876 296.658 98.4926C298.019 97.4975 299.156 97 300.07 97C300.537 97 300.862 97.1117 301.045 97.3351C301.228 97.5381 301.4 97.6701 301.563 97.731C301.745 97.792 301.837 97.9747 301.837 98.2793C301.837 98.5839 301.756 98.8073 301.593 98.9495C301.431 99.0713 301.014 99.6094 300.344 100.564C299.694 101.498 299.309 102.117 299.187 102.422C299.512 102.747 299.674 103.255 299.674 103.945C299.674 104.615 299.278 105.356 298.486 106.169C297.694 106.981 296.76 107.387 295.684 107.387Z" fill="white" />
                    <path d="M248.374 83.0547H212.592V116.913C212.592 119.863 213.041 122.749 213.938 125.57C214.964 128.392 216.632 130.701 218.94 132.496C221.377 134.292 224.584 135.189 228.559 135.189C234.587 135.189 238.691 133.522 240.871 130.188C243.18 126.725 244.398 122.877 244.526 118.645C244.142 118.26 243.949 117.747 243.949 117.105C243.949 115.439 244.783 114.605 246.45 114.604C248.117 114.604 248.951 115.438 248.951 117.105C248.951 117.747 248.759 118.26 248.374 118.645C248.117 122.107 247.348 125.378 246.065 128.456C244.783 131.534 242.731 134.099 239.909 136.151C237.216 138.075 233.433 139.037 228.559 139.037C223.558 139.037 219.582 137.947 216.632 135.767C213.81 133.586 211.758 130.829 210.475 127.494C209.321 124.031 208.744 120.504 208.744 116.913V76H212.592V79.207H244.526V76H248.374V83.0547ZM212.592 72H208.744V68H212.592V72ZM248.374 72H244.526V68H248.374V72ZM228.559 39C233.561 39.0001 237.472 40.0904 240.294 42.2705C243.244 44.4508 245.296 47.2084 246.45 50.543C247.733 53.8775 248.374 57.4047 248.374 61.124V64H244.526V61.124C244.526 58.1743 244.077 55.3524 243.18 52.6592C242.282 49.8376 240.679 47.5289 238.37 45.7334C236.062 43.8098 232.791 42.8477 228.559 42.8477C224.584 42.8477 221.377 43.8096 218.94 45.7334C216.632 47.5289 214.964 49.8376 213.938 52.6592C213.041 55.3524 212.592 58.1743 212.592 61.124V64H208.744V61.124C208.744 57.4048 209.321 53.8775 210.475 50.543C211.758 47.2084 213.81 44.4508 216.632 42.2705C219.582 40.0902 223.558 39 228.559 39Z" fill="white" />
                    <path d="M286.656 164C286.656 165.387 286.208 166.485 285.312 167.296C284.438 168.085 283.083 168.48 281.249 168.48C279.414 168.48 278.038 168.085 277.121 167.296C276.225 166.485 275.777 165.387 275.777 164V151.2C275.777 149.813 276.214 148.725 277.089 147.936C277.985 147.125 279.35 146.72 281.185 146.72C283.019 146.72 284.385 147.125 285.281 147.936C286.198 148.725 286.656 149.813 286.656 151.2V164ZM284.417 151.2C284.417 150.389 284.15 149.76 283.617 149.312C283.083 148.864 282.273 148.64 281.185 148.64C280.118 148.64 279.318 148.864 278.785 149.312C278.273 149.76 278.017 150.389 278.017 151.2V164C278.017 164.789 278.283 165.419 278.816 165.888C279.35 166.336 280.161 166.56 281.249 166.56C282.315 166.56 283.105 166.336 283.617 165.888C284.15 165.44 284.417 164.811 284.417 164V151.2Z" fill="white" />
                    <path d="M270.83 168H265.39V166.08H266.99V149.12H265.39V147.2H270.83V149.12H269.23V166.08H270.83V168Z" fill="white" />
                    <path d="M254.413 147.2H256.653V166.08H262.509V168H254.413V147.2Z" fill="white" />
                    <path d="M248.5 164C248.5 165.387 248.052 166.485 247.156 167.296C246.282 168.085 244.927 168.48 243.092 168.48C241.258 168.48 239.882 168.085 238.964 167.296C238.068 166.485 237.62 165.387 237.62 164V151.2C237.62 149.813 238.058 148.725 238.932 147.936C239.828 147.125 241.194 146.72 243.028 146.72C244.863 146.72 246.228 147.125 247.124 147.936C248.042 148.725 248.5 149.813 248.5 151.2V164ZM246.26 151.2C246.26 150.389 245.994 149.76 245.46 149.312C244.927 148.864 244.116 148.64 243.028 148.64C241.962 148.64 241.162 148.864 240.628 149.312C240.116 149.76 239.86 150.389 239.86 151.2V164C239.86 164.789 240.127 165.419 240.66 165.888C241.194 166.336 242.004 166.56 243.092 166.56C244.159 166.56 244.948 166.336 245.46 165.888C245.994 165.44 246.26 164.811 246.26 164V151.2Z" fill="white" />
                    <path d="M224.819 168V147.2H233.619V149.12H227.059V156.48H232.339V158.4H227.059V168H224.819Z" fill="white" />
                    <path d="M209.288 168V147.2H214.12C215.826 147.2 217.096 147.605 217.928 148.416C218.781 149.205 219.208 150.293 219.208 151.68V156.16C219.208 157.205 218.973 158.091 218.504 158.816C218.034 159.52 217.33 160.021 216.392 160.32L220.328 168H217.864L214.12 160.64H211.528V168H209.288ZM216.968 151.68C216.968 150.891 216.722 150.272 216.232 149.824C215.762 149.355 215.058 149.12 214.12 149.12H211.528V158.72H214.12C215.08 158.72 215.794 158.496 216.264 158.048C216.733 157.579 216.968 156.949 216.968 156.16V151.68Z" fill="white" />
                    <path d="M203.375 164C203.375 165.387 202.927 166.485 202.031 167.296C201.157 168.085 199.802 168.48 197.967 168.48C196.133 168.48 194.757 168.085 193.839 167.296C192.943 166.485 192.495 165.387 192.495 164V151.2C192.495 149.813 192.933 148.725 193.807 147.936C194.703 147.125 196.069 146.72 197.903 146.72C199.738 146.72 201.103 147.125 201.999 147.936C202.917 148.725 203.375 149.813 203.375 151.2V164ZM201.135 151.2C201.135 150.389 200.869 149.76 200.335 149.312C199.802 148.864 198.991 148.64 197.903 148.64C196.837 148.64 196.037 148.864 195.503 149.312C194.991 149.76 194.735 150.389 194.735 151.2V164C194.735 164.789 195.002 165.419 195.535 165.888C196.069 166.336 196.879 166.56 197.967 166.56C199.034 166.56 199.823 166.336 200.335 165.888C200.869 165.44 201.135 164.811 201.135 164V151.2Z" fill="white" />
                    <path d="M177.944 168V147.2H182.776C184.483 147.2 185.752 147.605 186.584 148.416C187.437 149.205 187.864 150.293 187.864 151.68V157.12C187.864 158.507 187.448 159.605 186.616 160.416C185.784 161.205 184.504 161.6 182.776 161.6H180.184V168H177.944ZM185.624 151.68C185.624 150.891 185.379 150.272 184.888 149.824C184.419 149.355 183.715 149.12 182.776 149.12H180.184V159.68H182.776C183.736 159.68 184.451 159.456 184.92 159.008C185.389 158.539 185.624 157.909 185.624 157.12V151.68Z" fill="white" />
                  </svg>


                  {/* Overlaying Orange Dashed Stroke Tracing Contour */}
                  <svg width="316" height="194" viewBox="0 0 316 194" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full max-w-[320px] h-auto mx-auto mb-2 absolute inset-0 z-10 pointer-events-none">
                    <path d="M94.2432 134.593C94.6279 135.106 94.8203 135.619 94.8203 136.132C94.8203 137.799 93.9866 138.633 92.3194 138.633C90.6521 138.633 89.8184 137.799 89.8184 136.132C89.8184 135.491 90.0108 134.978 90.3956 134.593V130.553C88.7283 132.99 86.6121 134.978 84.0471 136.517C81.482 137.928 78.2757 138.633 74.4281 138.633C69.4263 138.633 65.4504 137.543 62.5006 135.362C59.6791 133.182 57.627 130.425 56.3445 127.09C55.1902 123.627 54.6131 120.1 54.6131 116.509V100.927C54.6131 97.2073 55.1902 93.6803 56.3445 90.3458C57.4988 87.0112 59.8073 84.2538 63.2701 82.0735C66.8612 79.8932 72.1196 78.803 79.0452 78.803H90.3956V60.7194C90.3956 57.7696 89.8826 54.948 88.8565 52.2547C87.9588 49.4332 86.3556 47.1246 84.0471 45.3291C81.7385 43.4053 78.5322 42.4434 74.4281 42.4434C68.6568 42.4434 64.5527 44.1748 62.1159 47.6376C59.6791 51.1004 58.3965 54.8839 58.2683 58.988C58.653 59.501 58.8454 60.014 58.8454 60.527C58.8454 62.0661 58.0118 62.8356 56.3445 62.8356C54.6772 62.8356 53.8436 62.0661 53.8436 60.527C53.8436 59.7575 54.0359 59.1804 54.4207 58.7956C54.6772 55.3328 55.4467 52.0623 56.7293 48.9843C58.14 45.9062 60.2562 43.4053 63.0778 41.4815C65.8993 39.5577 69.6828 38.5958 74.4281 38.5958C79.43 38.5958 83.3417 39.686 86.1632 41.8663C89.1131 44.0466 91.1651 46.804 92.3194 50.1386C93.6019 53.4731 94.2432 57.0001 94.2432 60.7194V134.593ZM58.4607 116.509C58.4607 119.459 58.9095 122.345 59.8073 125.166C60.7051 127.988 62.3082 130.296 64.6168 132.092C67.0536 133.888 70.324 134.785 74.4281 134.785C78.5322 134.785 81.6744 133.952 83.8547 132.284C86.1632 130.617 87.7664 128.501 88.6642 125.936C89.6902 123.371 90.2673 120.678 90.3956 117.856V82.6506H79.0452C73.0173 82.6506 68.5285 83.5484 65.5787 85.3439C62.6289 87.1395 60.7051 89.448 59.8073 92.2696C58.9095 95.0911 58.4607 97.9768 58.4607 100.927V116.509Z" stroke="#FF5500" strokeWidth="1.2" strokeDasharray="3 3" opacity={hoveringTitle ? "0.85" : "0.4"} />
                    <path d="M40.592 117.279C40.592 120.87 39.9507 124.333 38.6682 127.667C37.5139 130.874 35.4619 133.503 32.5121 135.555C29.6905 137.607 25.7147 138.633 20.5846 138.633C13.5307 138.633 8.46468 136.645 5.38661 132.669C2.4368 128.693 0.833642 124.14 0.577137 119.01C0.192379 118.625 0 118.048 0 117.279C0 115.612 0.833642 114.778 2.50093 114.778C4.16821 114.778 5.00185 115.612 5.00185 117.279C5.00185 118.048 4.80947 118.625 4.42472 119.01C4.55297 123.371 5.8355 127.09 8.2723 130.168C10.7091 133.246 14.8132 134.785 20.5846 134.785C26.7407 134.785 30.973 132.99 33.2816 129.399C35.5901 125.808 36.7444 121.768 36.7444 117.279V4.35234C36.3596 3.96757 36.1673 3.39044 36.1673 2.62092C36.1673 1.97966 36.4238 1.40252 36.9368 0.889513C37.578 0.376501 38.1552 0.119995 38.6682 0.119995C40.3355 0.119995 41.1691 0.953638 41.1691 2.62092C41.1691 3.39044 40.9767 3.96757 40.592 4.35234V117.279Z" stroke="#FF5500" strokeWidth="1.2" strokeDasharray="3 3" opacity={hoveringTitle ? "0.85" : "0.4"} />
                    <path d="M265.781 134.593C266.166 134.978 266.358 135.491 266.358 136.132C266.358 137.799 265.525 138.633 263.858 138.633C262.19 138.633 261.357 137.799 261.357 136.132C261.357 135.491 261.549 134.978 261.934 134.593V42.8281C261.549 42.1869 261.357 41.6097 261.357 41.0967C261.357 39.4294 262.19 38.5958 263.858 38.5958C265.525 38.5958 266.358 39.4294 266.358 41.0967C266.358 41.6097 266.166 42.1869 265.781 42.8281V49.5614C267.577 46.6116 269.693 44.3672 272.13 42.8281C274.695 41.2891 277.901 40.5196 281.749 40.5196H285.019C285.661 40.1348 286.238 39.9425 286.751 39.9425C288.418 39.9425 289.252 40.7761 289.252 42.4434C289.252 44.1107 288.418 44.9443 286.751 44.9443C286.238 44.9443 285.661 44.7519 285.019 44.3672H281.749C276.362 44.3672 272.322 46.291 269.629 50.1385C267.064 53.9861 265.781 58.1543 265.781 62.6432V134.593Z" stroke="#FF5500" strokeWidth="1.2" strokeDasharray="3 3" opacity={hoveringTitle ? "0.85" : "0.4"} />
                    <path d="M136.746 73.9916C142.841 69.7972 148.809 66.5732 154.653 64.3195C160.496 62.0659 165.554 60.939 169.826 60.939C174.099 60.939 176.832 62.1598 178.026 64.6013C180.476 61.7842 183.523 60.2817 187.168 60.0939C188.236 60.0313 189.555 60 191.126 60C192.697 60 193.671 60.2191 194.048 60.6573C194.425 61.0329 194.77 61.7842 195.084 62.911C195.398 64.0378 195.587 64.6639 195.65 64.7891C195.713 64.9143 195.744 65.1334 195.744 65.4464C195.744 65.6968 195.587 66.0411 195.273 66.4793C194.959 66.8549 194.582 67.2306 194.142 67.6062C193.765 67.9818 193.545 68.2009 193.482 68.2635C179.596 88.1084 165.397 110.739 150.883 136.156C165.837 122.947 179.22 113.462 191.032 107.703C191.786 107.327 192.508 107.139 193.199 107.139C194.205 107.139 194.864 107.797 195.179 109.111C195.493 110.363 195.65 112.179 195.65 114.558C195.65 116.937 195.493 118.408 195.179 118.971C194.927 119.535 193.482 120.662 190.843 122.352C188.204 124.042 184.78 126.233 180.57 128.925C176.361 131.617 171.9 134.591 167.187 137.846C155.878 145.671 146.579 153.903 139.291 162.542C129.866 173.873 123.112 183.013 119.028 189.962C117.52 192.654 114.975 194 111.394 194C104.294 194 100.744 190.651 100.744 183.952C100.744 177.129 104.105 170.149 110.828 163.012C115.855 157.691 120.473 153.34 124.682 149.959C128.892 146.579 131.185 144.669 131.562 144.231C136.212 137.282 142.526 127.423 150.506 114.652C143.72 121.726 137.123 127.36 130.714 131.554C124.368 135.749 119.625 137.846 116.483 137.846C106.87 137.846 102.063 133.745 102.063 125.545C102.063 119.034 103.728 112.461 107.058 105.825C110.389 99.189 114.661 93.2731 119.876 88.0771C125.091 82.8185 130.714 78.1233 136.746 73.9916ZM172.654 71.5501C165.365 73.1152 158.517 75.7132 152.108 79.3441C145.699 82.9124 140.422 86.7624 136.275 90.8942C132.128 94.9633 128.547 99.1577 125.531 103.477C119.876 111.553 117.049 117.813 117.049 122.258C117.049 123.322 117.3 123.854 117.803 123.854C118.368 123.854 119.562 123.291 121.384 122.164C123.269 121.037 125.908 119.128 129.301 116.436C132.693 113.681 136.463 110.426 140.61 106.67C150.223 97.843 160.904 86.1364 172.654 71.5501Z" stroke="#FF5500" strokeWidth="1.2" strokeDasharray="3 3" opacity={hoveringTitle ? "0.85" : "0.4"} />
                    <path d="M190.899 51.95C194.349 51.2214 196.742 50.8571 198.079 50.8571C198.574 50.8571 198.855 51.0214 198.922 51.35C198.948 51.4786 199.015 51.5786 199.122 51.65C199.229 51.7071 199.336 51.9857 199.443 52.4857C199.563 52.9857 199.63 53.3929 199.644 53.7071V53.9C199.644 54.4 199.47 54.6857 199.122 54.7571C197.839 55.0429 195.746 55.3 192.844 55.5286C189.956 55.7571 188.238 55.9143 187.69 56C187.409 56 186.961 55.8357 186.346 55.5071C186.225 55.3786 186.092 55.15 185.945 54.8214C185.811 54.4929 185.744 54.2071 185.744 53.9643C185.744 53.9643 185.871 53.3286 186.125 52.7857C186.165 52.6857 187.001 51.6786 188.632 49.7643C189.033 49.3071 190.076 48.2857 191.761 46.7C193.459 45.1 194.636 43.9071 195.291 43.1214C195.96 42.3214 197.123 41 198.781 39.1571C200.439 37.3143 201.67 35.8857 202.472 34.8714C203.274 33.8429 203.675 33.1143 203.675 32.6857C203.675 32.4143 203.481 32.2786 203.094 32.2786C202.706 32.2786 202.231 32.4071 201.67 32.6643C201.121 32.9071 200.479 33.2786 199.744 33.7786C198.019 34.9643 196.361 36.75 194.77 39.1357C194.69 39.2071 194.649 39.3571 194.649 39.5857C194.542 39.8714 194.315 40.1071 193.967 40.2929C193.62 40.4786 193.339 40.5714 193.125 40.5714C192.911 40.5714 192.637 40.5 192.303 40.3571C191.982 40.2 191.741 40.0429 191.581 39.8857C191.42 39.7286 191.34 39.4286 191.34 38.9857C191.34 38.5429 191.574 37.9143 192.042 37.1C192.51 36.2714 193.165 35.4 194.008 34.4857C194.85 33.5571 195.786 32.6857 196.816 31.8714C197.859 31.0429 199.022 30.3571 200.306 29.8143C201.589 29.2714 202.679 29 203.575 29C204.471 29 205.133 29.2071 205.561 29.6214C206.35 30.3929 206.744 31.25 206.744 32.1929C206.744 33.1357 206.323 34.2929 205.48 35.6643C204.651 37.0357 203.521 38.5429 202.091 40.1857C200.66 41.8286 199.309 43.3214 198.039 44.6643C196.769 46.0071 195.358 47.4571 193.807 49.0143C192.256 50.5571 191.286 51.5357 190.899 51.95Z" stroke="#FF5500" strokeWidth="1.2" strokeDasharray="3 3" opacity={hoveringTitle ? "0.85" : "0.4"} />
                    <path d="M15.1265 4.42307C14.7281 4.80768 14.1305 5 13.3336 5C11.6072 5 10.744 4.16666 10.744 2.5C10.744 0.833337 11.6072 -1.50929e-07 13.3336 0C13.8649 4.64399e-08 14.4625 0.192313 15.1265 0.576926L36.5607 0.57693C36.9591 0.192317 37.4904 4.01919e-06 38.1544 4.07724e-06C39.8808 4.22817e-06 40.744 0.833341 40.744 2.5C40.744 4.16667 39.8808 5 38.1544 5C37.4904 5 36.9591 4.80769 36.5607 4.42307L15.1265 4.42307Z" stroke="#FF5500" strokeWidth="1.2" strokeDasharray="3 3" opacity={hoveringTitle ? "0.85" : "0.4"} />
                    <path d="M293.734 131.512L293.704 131.999C293.704 132.507 293.897 132.943 294.283 133.309C294.668 133.674 295.024 133.857 295.349 133.857C297.786 133.857 299.938 133.491 301.806 132.76C303.695 132.029 304.639 131.298 304.639 130.567C304.639 130.222 304.294 129.928 303.603 129.684C302.933 129.42 301.786 129.105 300.161 128.74C298.557 128.354 297.39 128.059 296.658 127.856C295.927 127.633 295.349 127.43 294.922 127.247C294.496 127.064 294.059 126.81 293.612 126.486C292.658 125.815 292.181 124.82 292.181 123.5C292.181 122.16 292.668 120.84 293.643 119.541C294.638 118.221 295.877 117.094 297.359 116.16C298.841 115.225 300.436 114.403 302.141 113.692C305.512 112.291 308.345 111.59 310.64 111.59C312.894 111.59 314.285 112.078 314.813 113.053C314.975 113.398 315.057 113.784 315.057 114.21V114.423C315.057 115.5 314.823 116.342 314.356 116.951C313.909 117.561 313.188 118.109 312.193 118.596C311.219 119.084 310.437 119.327 309.848 119.327C309.279 119.327 308.914 119.287 308.751 119.206C308.609 119.124 308.487 119.023 308.386 118.901C308.284 118.759 308.152 118.657 307.99 118.596C307.848 118.535 307.776 118.383 307.776 118.139C307.776 117.896 307.878 117.652 308.081 117.408C308.284 117.144 308.426 116.87 308.508 116.586C307.167 116.647 305.766 116.962 304.304 117.53C302.842 118.079 301.583 118.698 300.527 119.388C299.491 120.079 298.628 120.739 297.938 121.368C297.247 121.998 296.902 122.465 296.902 122.769C296.902 123.054 297.369 123.287 298.303 123.47C302.507 124.303 305.269 125.023 306.589 125.633C307.908 126.242 308.822 126.932 309.33 127.704C309.838 128.476 310.091 129.176 310.091 129.806C310.091 131.105 309.574 132.334 308.538 133.491C307.502 134.649 306.223 135.593 304.7 136.324C301.431 137.928 298.577 138.731 296.141 138.731C293.724 138.731 292.049 138.355 291.115 137.604C290.201 136.873 289.744 135.999 289.744 134.984C289.744 133.969 289.998 133.035 290.506 132.182C291.034 131.308 291.704 130.872 292.516 130.872C293.328 130.872 293.734 131.085 293.734 131.512Z" stroke="#FF5500" strokeWidth="1.2" strokeDasharray="3 3" opacity={hoveringTitle ? "0.85" : "0.4"} />
                    <path d="M295.684 107.387C294.628 107.387 293.846 107.093 293.338 106.504C292.831 105.894 292.577 105.123 292.577 104.189C292.577 103.234 292.922 102.3 293.612 101.386C294.303 100.452 295.318 99.4876 296.658 98.4926C298.019 97.4975 299.156 97 300.07 97C300.537 97 300.862 97.1117 301.045 97.3351C301.228 97.5381 301.4 97.6701 301.563 97.731C301.745 97.792 301.837 97.9747 301.837 98.2793C301.837 98.5839 301.755 98.8073 301.593 98.9495C301.431 99.0713 301.014 99.6094 300.344 100.564C299.694 101.498 299.309 102.117 299.187 102.422C299.512 102.747 299.674 103.255 299.674 103.945C299.674 104.615 299.278 105.356 298.486 106.169C297.694 106.981 296.76 107.387 295.684 107.387Z" stroke="#FF5500" strokeWidth="1.2" strokeDasharray="3 3" opacity={hoveringTitle ? "0.85" : "0.4"} />
                    <path d="M248.374 83.0547H212.592V116.913C212.592 119.863 213.041 122.749 213.938 125.57C214.964 128.392 216.632 130.701 218.94 132.496C221.377 134.292 224.584 135.189 228.559 135.189C234.587 135.189 238.691 133.522 240.871 130.188C243.18 126.725 244.398 122.877 244.526 118.645C244.142 118.26 243.949 117.747 243.949 117.105C243.949 115.439 244.783 114.605 246.45 114.604C248.117 114.604 248.951 115.438 248.951 117.105C248.951 117.747 248.759 118.26 248.374 118.645C248.117 122.107 247.348 125.378 246.065 128.456C244.783 131.534 242.731 134.099 239.909 136.151C237.216 138.075 233.433 139.037 228.559 139.037C223.558 139.037 219.581 137.947 216.632 135.767C213.81 133.586 211.758 130.829 210.475 127.494C209.321 124.031 208.744 120.504 208.744 116.913V76H212.592V79.207H244.526V76H248.374V83.0547ZM212.592 72H208.744V68 Hem212.592V72ZM248.374 72H244.526V68H248.374V72ZM228.559 39C233.561 39.0001 237.472 40.0904 240.294 42.2705C243.244 44.4508 245.296 47.2084 246.45 50.543C247.733 53.8775 248.374 57.4047 248.374 61.124V64H244.526V61.124C244.526 58.1743 244.077 55.3524 243.18 52.6592C242.282 49.8376 240.679 47.5289 238.37 45.7334C236.062 43.8098 232.791 42.8477 228.559 42.8477C224.584 42.8477 221.377 43.8096 218.94 45.7334C216.632 47.5289 214.964 49.8376 213.938 52.6592C213.041 55.3524 212.592 58.1743 212.592 61.124V64H208.744V61.124C208.744 57.4048 209.321 53.8775 210.475 50.543C211.758 47.2084 213.81 44.4508 216.632 42.2705C219.581 40.0902 223.558 39 228.559 39Z" stroke="#FF5500" strokeWidth="1.2" strokeDasharray="3 3" opacity={hoveringTitle ? "0.85" : "0.4"} />
                    <path d="M286.656 164C286.656 165.387 286.208 166.485 285.312 167.296C284.438 168.085 283.083 168.48 281.249 168.48C279.414 168.48 278.038 168.085 277.121 167.296C276.225 166.485 275.777 165.387 275.777 164V151.2C275.777 149.813 276.214 148.725 277.089 147.936C277.984 147.125 279.35 146.72 281.185 146.72C283.019 146.72 284.385 147.125 285.281 147.936C286.198 148.725 286.656 149.813 286.656 151.2V164ZM284.417 151.2C284.417 150.389 284.15 149.76 283.617 149.312C283.083 148.864 282.273 148.64 281.185 148.64C280.118 148.64 279.318 148.864 278.785 149.312C278.273 149.76 278.017 150.389 278.017 151.2V164C278.017 164.789 278.283 165.419 278.816 165.888C279.35 166.336 280.16 166.56 281.249 166.56C282.315 166.56 283.105 166.336 283.617 165.888C284.15 165.44 284.417 164.811 284.417 164V151.2Z" stroke="#FF5500" strokeWidth="1.2" strokeDasharray="3 3" opacity={hoveringTitle ? "0.85" : "0.4"} />
                    <path d="M270.83 168H265.39V166.08H266.99V149.12H265.39V147.2H270.83V149.12H269.23V166.08H270.83V168Z" stroke="#FF5500" strokeWidth="1.2" strokeDasharray="3 3" opacity={hoveringTitle ? "0.85" : "0.4"} />
                    <path d="M254.413 147.2H256.653V166.08H262.509V168H254.413V147.2Z" stroke="#ff5500ff" strokeWidth="1.2" strokeDasharray="3 3" opacity={hoveringTitle ? "0.85" : "0.4"} />
                    <path d="M248.5 164C248.5 165.387 248.052 166.485 247.156 167.296C246.282 168.085 244.927 168.48 243.092 168.48C241.258 168.48 239.882 168.085 238.964 167.296C238.068 166.485 237.62 165.387 237.62 164V151.2C237.62 149.813 238.058 148.725 238.932 147.936C239.828 147.125 241.194 146.72 243.028 146.72C244.863 146.72 246.228 147.125 247.124 147.936C248.042 148.725 248.5 149.813 248.5 151.2V164ZM246.26 151.2C246.26 150.389 245.994 149.76 245.46 149.312C244.927 148.864 244.116 148.64 243.028 148.64C241.962 148.64 241.162 148.864 240.628 149.312C240.116 149.76 239.86 150.389 239.86 151.2V164C239.86 164.789 240.127 165.419 240.66 165.888C241.194 166.336 242.004 166.56 243.092 166.56C244.159 166.56 244.948 166.336 245.46 165.888C245.994 165.44 246.26 164.811 246.26 164V151.2Z" stroke="#FF5500" strokeWidth="1.2" strokeDasharray="3 3" opacity={hoveringTitle ? "0.85" : "0.4"} />
                    <path d="M224.819 168V147.2H233.619V149.12H227.059V156.48H232.339V158.4H227.059V168H224.819Z" stroke="#FF5500" strokeWidth="1.2" strokeDasharray="3 3" opacity={hoveringTitle ? "0.85" : "0.4"} />
                    <path d="M209.288 168V147.2H214.12C215.826 147.2 217.096 147.605 217.928 148.416C218.781 149.205 219.208 150.293 219.208 151.68V156.16C219.208 157.205 218.973 158.091 218.504 158.816C218.034 159.52 217.33 160.021 216.392 160.32L220.328 168H217.864L214.12 160.64H211.528V168H209.288ZM216.968 151.68C216.968 150.891 216.722 150.272 216.232 149.824C215.762 149.355 215.058 149.12 214.12 149.12H211.528V158.72H214.12C215.08 158.72 215.794 158.496 216.264 158.048C216.733 157.579 216.968 156.949 216.968 156.16V151.68Z" stroke="#FF5500" strokeWidth="1.2" strokeDasharray="3 3" opacity={hoveringTitle ? "0.85" : "0.4"} />
                    <path d="M203.375 164C203.375 165.387 202.927 166.485 202.031 167.296C201.157 168.085 199.802 168.48 197.967 168.48C196.133 168.48 194.757 168.085 193.839 167.296C192.943 166.485 192.495 165.387 192.495 164V151.2C192.495 149.813 192.933 148.725 193.807 147.936C194.703 147.125 196.069 146.72 197.903 146.72C199.738 146.72 201.103 147.125 201.999 147.936C202.917 148.725 203.375 149.813 203.375 151.2V164ZM201.135 151.2C201.135 150.389 200.869 149.76 200.335 149.312C199.802 148.864 198.991 148.64 197.903 148.64C196.837 148.64 196.037 148.864 195.503 149.312C194.991 149.76 194.735 150.389 194.735 151.2V164C194.735 164.789 195.002 165.419 195.535 165.888C196.069 166.336 196.879 166.56 197.967 166.56C199.034 166.56 199.823 166.336 200.335 165.888C200.869 165.44 201.135 164.811 201.135 164V151.2Z" stroke="#FF5500" strokeWidth="1.2" strokeDasharray="3 3" opacity={hoveringTitle ? "0.85" : "0.4"} />
                    <path d="M177.944 168V147.2H182.776C184.483 147.2 185.752 147.605 186.584 148.416C187.437 149.205 187.864 150.293 187.864 151.68V157.12C187.864 158.507 187.448 159.605 186.616 160.416C185.784 161.205 184.504 161.6 182.776 161.6H180.184V168H177.944ZM185.624 151.68C185.624 150.891 185.379 150.272 184.888 149.824C184.419 149.355 183.715 149.12 182.776 149.12H180.184V159.68H182.776C183.736 159.68 184.451 159.456 184.92 159.008C185.389 158.539 185.624 157.909 185.624 157.12V151.68Z" stroke="#FF5500" strokeWidth="1.2" strokeDasharray="3 3" opacity={hoveringTitle ? "0.85" : "0.4"} />
                  </svg>
                </div>
              </div>

              {/* ARTBOARD CONTENT TEXT / SUBTITLE */}
              <p className="mt-6 text-xs sm:text-sm text-zinc-400 font-mono max-w-md text-center leading-relaxed">
                Design system architect & Front-end engineer. Specializing in minimal interactive web experiences & high-fidelity graphics toolchains.
              </p>

              {/* ACTION BUTTONS */}
              <div className="mt-8 flex flex-col sm:flex-row gap-3 items-center w-full sm:w-auto ui-element text-center">
                <a
                  href="#works"
                  className="w-full sm:w-auto px-5 py-3 rounded bg-white text-black font-semibold text-xs tracking-wider uppercase hover:bg-[#FF5500] hover:text-black transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>EXPLORE WORKS</span>
                  <span>➔</span>
                </a>

                <a
                  href="#contact"
                  className="w-full sm:w-auto px-5 py-3 rounded border border-[#1F1F23] bg-[#0A0A0B] text-zinc-300 hover:text-white font-semibold text-xs tracking-wider uppercase hover:border-white/30 transition-all duration-300 flex items-center justify-center cursor-pointer"
                >
                  GET IN TOUCH
                </a>
              </div>

              {/* Technical grid stats footer */}
              <div className="mt-10 pt-5 border-t border-[#1F1F23] w-full flex items-center justify-between text-[9px] font-mono text-zinc-500">
                <div className="flex gap-3">
                  <span>SCALE: 100%</span>
                  <span className="hidden sm:inline">STROKE: #FF5500</span>
                  <span>RENDER: SVG</span>
                </div>
                <div className="flex gap-1.5 items-center text-zinc-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#FF5500] self-center"></span>
                  <span>GRID_OK</span>
                </div>
              </div>
            </div>

            {/* FLOATING PLOTTED USER NODES */}
            {customPoints.map((pt, idx) => (
              <div
                key={idx}
                className="absolute pointer-events-auto node-element group/node"
                style={{ left: pt.x, top: pt.y }}
              >
                <div
                  onMouseDown={(e) => handleNodeMouseDown(idx, e)}
                  onMouseEnter={() => setHoveredNode(idx)}
                  onMouseLeave={() => setHoveredNode(null)}
                  className={`w-3 h-3 -translate-x-1/2 -translate-y-1/2 border transition-all cursor-pointer ${draggedNode === idx
                    ? "bg-[#FF5500] border-white scale-125"
                    : hoveredNode === idx
                      ? "bg-white border-[#FF5500] scale-110"
                      : "bg-[#0A0A0B] border-[#FF5500]"
                    }`}
                />

                {activeTool === "node" && (
                  <>
                    <div className="absolute -translate-x-1/2 -translate-y-1/2 w-10 h-[1px] bg-[#FF5500]/30 -left-5" />
                    <div className="absolute -translate-x-1/2 -translate-y-1/2 w-[5px] h-[5px] rounded-full bg-white border border-[#FF5500] -left-10 -top-[2.5px]" />
                    <div className="absolute -translate-x-1/2 -translate-y-1/2 w-10 h-[1px] bg-[#FF5500]/30 left-5" />
                    <div className="absolute -translate-x-1/2 -translate-y-1/2 w-[5px] h-[5px] rounded-full bg-white border border-[#FF5500] left-10 -top-[2.5px]" />
                  </>
                )}

                {hoveredNode === idx && (
                  <div className="absolute bottom-4 left-0 -translate-x-1/2 bg-zinc-950 border border-[#FF5500] px-2 py-1 rounded text-[9px] font-mono whitespace-nowrap z-50 text-white shadow-xl flex gap-1.5 items-center">
                    <span>Anchor_{idx}: ({pt.x}, {pt.y})</span>
                    <button
                      onClick={(e) => removePoint(idx, e)}
                      className="text-red-400 hover:text-red-300 font-bold px-0.5 ml-1 border-l border-zinc-800 pl-1.5 ui-element cursor-pointer"
                    >
                      DEL
                    </button>
                  </div>
                )}
              </div>
            ))}

            {/* Interactive Mouse Coordinate Cursor */}
            {activeTool === "pen" && isHoveringCanvas && (
              <div
                className="absolute pointer-events-none z-50 flex flex-col gap-1 text-[9px] font-mono text-orange-400"
                style={{ left: mouseCanvasPos.x + 12, top: mouseCanvasPos.y + 12 }}
              >
                <div className="bg-zinc-950/90 border border-[#1F1F23] px-1.5 py-0.5 rounded text-white shadow-md">
                  P: {mouseCanvasPos.x}, {mouseCanvasPos.y}
                </div>
                <div className="text-[#FF5500]/80">Click to plot path node</div>
              </div>
            )}

            {/* Pen Nib SVG Icon cursor follow */}
            {activeTool === "pen" && isHoveringCanvas && (
              <div
                className="absolute pointer-events-none z-50 -translate-x-1/2 -translate-y-1/2"
                style={{ left: mouseCanvasPos.x, top: mouseCanvasPos.y }}
              >
                <svg className="w-6 h-6 text-[#FF5500] drop-shadow-md" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2L2 22l10-6 10 6L12 2z" fill="currentColor" fillOpacity="0.1" />
                  <circle cx="12" cy="11" r="2" fill="white" stroke="#FF5500" strokeWidth="1.5" />
                </svg>
              </div>
            )}
          </main>

          {/* 4. RIGHT SIDEBAR: PROPERTIES INSPECTOR */}
          <aside className="hidden lg:flex w-[280px] border-l border-[#1F1F23] bg-[#0A0A0B] flex-col z-10">
            <div className="p-3 border-b border-[#1F1F23] flex items-center justify-between">
              <span className="text-xs font-bold font-mono tracking-wider text-zinc-400">PROPERTIES</span>
              <span className="text-[10px] text-zinc-500 font-mono">INSPECT</span>
            </div>

            <div className="flex-1 p-3 font-mono text-xs space-y-4 overflow-y-auto">
              <div className="space-y-2">
                <span className="text-[10px] text-zinc-500 block uppercase">Geometric Bounds</span>
                <div className="grid grid-cols-2 gap-2 text-zinc-400">
                  <div className="bg-white/5 p-1.5 rounded border border-[#1F1F23]">
                    <span className="text-[9px] text-zinc-500 block">X (COORD)</span>
                    <span className="text-[#FF5500] font-semibold">{mouseCanvasPos.x} px</span>
                  </div>
                  <div className="bg-white/5 p-1.5 rounded border border-[#1F1F23]">
                    <span className="text-[9px] text-zinc-500 block">Y (COORD)</span>
                    <span className="text-[#FF5500] font-semibold">{mouseCanvasPos.y} px</span>
                  </div>
                  <div className="bg-white/5 p-1.5 rounded border border-[#1F1F23]">
                    <span className="text-[9px] text-zinc-500 block">W (ARTBOARD)</span>
                    <span className="text-white">320 px</span>
                  </div>
                  <div className="bg-white/5 p-1.5 rounded border border-[#1F1F23]">
                    <span className="text-[9px] text-zinc-500 block">H (ARTBOARD)</span>
                    <span className="text-white">194 px</span>
                  </div>
                </div>
              </div>

              <div className="space-y-3 pt-2 border-t border-[#1F1F23]">
                <span className="text-[10px] text-zinc-500 block uppercase">Appearance</span>
                <div className="space-y-2">
                  <div className="flex justify-between items-center bg-white/5 p-2 rounded border border-[#1F1F23]">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-sm bg-white border border-white/10" />
                      <span>Fill</span>
                    </div>
                    <span className="text-zinc-400">#FFFFFF</span>
                  </div>

                  <div className="flex justify-between items-center bg-white/5 p-2 rounded border border-[#1F1F23]">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-sm bg-[#FF5500]" />
                      <span>Stroke</span>
                    </div>
                    <span className="text-[#FF5500]">#FF5500</span>
                  </div>

                  <div className="flex justify-between items-center bg-white/5 p-2 rounded border border-[#1F1F23]">
                    <span>Stroke Width</span>
                    <span className="text-white">1.2px</span>
                  </div>

                  <div className="flex justify-between items-center bg-white/5 p-2 rounded border border-[#1F1F23]">
                    <span>Opacity</span>
                    <span className="text-white">100%</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-[#1F1F23]">
                <span className="text-[10px] text-zinc-500 block uppercase">SVG Path Output</span>
                <div className="bg-black/60 p-2 rounded border border-[#1F1F23] max-h-36 overflow-y-auto text-[9px] text-zinc-400 break-all leading-normal font-mono select-text scrollbar-thin">
                  {customSvgOutput}
                </div>
                <span className="text-[9px] text-zinc-500 block leading-tight">
                  {customPoints.length > 0
                    ? "✎ Shows your plotted pen path nodes in coordinate systems."
                    : "✦ Shows default stylized script SVG title parameters."
                  }
                </span>
              </div>
            </div>

            <div className="p-3 border-t border-[#1F1F23] bg-black/20 text-[10px] text-zinc-500 font-mono">
              Element: <span className="text-[#FF5500]">Artboard_Jagger</span>
            </div>
          </aside>
        </div>

        {/* 5. FLOATING TOOLBAR (BOTTOM CENTERED) */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1.5 sm:px-4 sm:py-2 bg-[#0A0A0B]/95 border border-[#1F1F23] rounded-full flex items-center gap-1 sm:gap-2 shadow-2xl backdrop-blur-md z-30 ui-element max-w-[90%] justify-center">
          <button
            onClick={() => setActiveTool("select")}
            title="Select Tool (V)"
            className={`p-1.5 sm:p-2 rounded-full transition-all cursor-pointer ${activeTool === "select" ? "bg-[#FF5500] text-black font-bold" : "text-zinc-400 hover:text-white hover:bg-white/5"
              }`}
          >
            <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M4 4l7 16 2.5-6.5L20 11z" fill={activeTool === "select" ? "black" : "none"} />
            </svg>
          </button>

          <button
            onClick={() => setActiveTool("node")}
            title="Direct Selection / Node Tool (A)"
            className={`p-1.5 sm:p-2 rounded-full transition-all cursor-pointer ${activeTool === "node" ? "bg-[#FF5500] text-black font-bold" : "text-zinc-400 hover:text-white hover:bg-white/5"
              }`}
          >
            <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M4 4l7 16 2.5-6.5L20 11z" fill="white" />
            </svg>
          </button>

          <button
            onClick={() => setActiveTool("pen")}
            title="Pen / Path Tool (P)"
            className={`p-1.5 sm:p-2 rounded-full transition-all cursor-pointer ${activeTool === "pen" ? "bg-[#FF5500] text-black font-bold" : "text-zinc-400 hover:text-white hover:bg-white/5"
              }`}
          >
            <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
              <path d="M12 12h.01" strokeWidth="3" />
            </svg>
          </button>

          <button
            onClick={() => setActiveTool("hand")}
            title="Hand / Pan Tool (H)"
            className={`p-1.5 sm:p-2 rounded-full transition-all cursor-pointer ${activeTool === "hand" ? "bg-[#FF5500] text-black font-bold" : "text-zinc-400 hover:text-white hover:bg-white/5"
              }`}
          >
            <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v5" />
              <path d="M14 10V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v6" />
              <path d="M10 10.5V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v8.5" />
              <path d="M6 14v-3a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v7a7 7 0 0 0 7 7h3a6 6 0 0 0 6-6V11a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2" />
            </svg>
          </button>

          <div className="w-[1px] h-6 bg-[#1F1F23] mx-1" />

          <button
            onClick={() => setShowGrid(!showGrid)}
            title="Toggle Grid (G)"
            className={`p-1.5 sm:p-2 rounded-full transition-all cursor-pointer ${showGrid ? "text-[#FF5500] bg-white/5" : "text-zinc-500 hover:text-white hover:bg-white/5"
              }`}
          >
            <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <rect width="18" height="18" x="3" y="3" rx="2" />
              <path d="M3 9h18" />
              <path d="M3 15h18" />
              <path d="M9 3v18" />
              <path d="M15 3v18" />
            </svg>
          </button>
        </div>

        {/* 6. BOTTOM FOOTER STATUS */}
        <footer className="h-6 border-t border-[#1F1F23] bg-[#0A0A0B] px-4 flex items-center justify-between text-[9px] font-mono text-zinc-600 z-20">
          <div>
            STATUS: <span className="text-[#FF5500] font-bold">READY</span>
          </div>
          <div className="flex gap-4">
            <span className="hidden sm:inline">WORKSPACE: ACTIVE</span>
            <span>DRAFT: v2.0.0</span>
            <span>COORDINATES: OK</span>
          </div>
        </footer>
      </div>
      {/* 新增：實體線上專案區塊 */}
      <div ref={contentRef}>
        <LiveProjects />
      </div>

      {/* 2. 核心作品集網格區塊 */}
      <div id="works">
        <PortfolioGrid />
      </div>

      {/* 新增：4. 合作流程區塊 */}
      <ProcessWorkflow />

      {/* 3. 設計訂閱制區塊 */}
      <SubscriptionCards />

      <BackToTop />

      {/* 訪客浮動 Ask AI 按鈕 */}
      <button
        onClick={() => setShowVisitorAI(true)}
        className="fixed bottom-6 right-6 z-[100] flex items-center gap-2 bg-[#0A0A0B] border border-[#FF5500]/40 hover:border-[#FF5500] text-[#FF5500] hover:text-white px-4 py-2.5 rounded-full font-mono text-[11px] font-bold tracking-wider shadow-lg shadow-black/40 transition-all hover:bg-[#FF5500] group"
      >
        <span className="w-2 h-2 rounded-full bg-[#FF5500] group-hover:bg-white animate-pulse" />
        Ask AI
      </button>

      {showVisitorAI && (
        <AskAIDialog
          onClose={() => setShowVisitorAI(false)}
          context="訪客詢問，尚未登入。請介紹 JAGGER OS 服務方案與合作流程。"
        />
      )}

    </div>
  );
}