import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  Leaf, ShieldCheck, ShoppingBag, Sprout,
  Globe, TrendingUp, ArrowRight, CheckCircle
} from 'lucide-react';

/* ─── Bubbles — visible glowing circles ─── */
const BUBBLES = [
  { id: 0,  left: '6%',  size: 14, duration: 13, delay:  0,  drift: 14,  op: 0.55 },
  { id: 1,  left: '16%', size: 10, duration: 18, delay: -4,  drift: -10, op: 0.45 },
  { id: 2,  left: '26%', size: 18, duration: 11, delay: -7,  drift: 18,  op: 0.60 },
  { id: 3,  left: '36%', size: 12, duration: 16, delay: -2,  drift: -14, op: 0.50 },
  { id: 4,  left: '46%', size: 16, duration: 14, delay: -9,  drift: 12,  op: 0.58 },
  { id: 5,  left: '56%', size: 10, duration: 20, delay: -5,  drift: -8,  op: 0.45 },
  { id: 6,  left: '66%', size: 14, duration: 12, delay: -12, drift: 16,  op: 0.52 },
  { id: 7,  left: '76%', size: 12, duration: 17, delay: -3,  drift: -12, op: 0.48 },
  { id: 8,  left: '86%', size: 16, duration: 15, delay: -8,  drift: 10,  op: 0.56 },
  { id: 9,  left: '11%', size: 10, duration: 22, delay: -10, drift: -10, op: 0.42 },
  { id: 10, left: '31%', size: 12, duration: 10, delay: -6,  drift: 14,  op: 0.50 },
  { id: 11, left: '71%', size: 10, duration: 19, delay: -14, drift: -8,  op: 0.44 },
];

/* ─── Leaf seeds — small SVG leaves ─── */
const SEEDS = [
  { id: 0, left: '20%', size: 16, duration: 16, delay: -1,  drift: -12, op: 0.65, rot: 20 },
  { id: 1, left: '43%', size: 14, duration: 21, delay: -8,  drift:  16, op: 0.55, rot: -15 },
  { id: 2, left: '63%', size: 18, duration: 13, delay: -3,  drift: -14, op: 0.60, rot: 30 },
  { id: 3, left: '82%', size: 14, duration: 18, delay: -11, drift:  10, op: 0.55, rot: -20 },
  { id: 4, left: '50%', size: 16, duration: 15, delay: -16, drift: -8,  op: 0.58, rot: 10 },
  { id: 5, left: '8%',  size: 14, duration: 23, delay: -19, drift:  12, op: 0.52, rot: -25 },
];

/* ─── Ripple rings ─── */
const RINGS = [
  { delay: '0s',    size: 120 },
  { delay: '1.4s',  size: 120 },
  { delay: '2.8s',  size: 120 },
];

/* ─── Role cards ─── */
const roles = [
  {
    id: 'farmer' as const,
    title: 'Farmer',
    subtitle: 'Grow & Earn',
    description: 'Onboard your farm, track NDVI satellite data, and earn verified carbon credits.',
    icon: Sprout,
    accentColor: '#16a34a',
    lightBg: 'rgba(22,163,74,0.08)',
    borderColor: 'rgba(22,163,74,0.25)',
    buttonText: 'Continue as Farmer',
  },
  {
    id: 'admin' as const,
    title: 'Admin / Validator',
    subtitle: 'Validate & Publish',
    description: 'Analyze satellite imagery, validate farm data with AI, and publish verified credits.',
    icon: ShieldCheck,
    accentColor: '#0284c7',
    lightBg: 'rgba(2,132,199,0.08)',
    borderColor: 'rgba(2,132,199,0.25)',
    buttonText: 'Admin Dashboard',
  },
  {
    id: 'buyer' as const,
    title: 'Credit Buyer',
    subtitle: 'Invest & Offset',
    description: 'Invest in verified carbon projects and offset your environmental footprint.',
    icon: ShoppingBag,
    accentColor: '#d97706',
    lightBg: 'rgba(217,119,6,0.08)',
    borderColor: 'rgba(217,119,6,0.25)',
    buttonText: 'Browse Marketplace',
  },
];



/* ─── Component ─── */
export default function LandingPage({
  onSelectRole,
  isLoading = false,
}: {
  onSelectRole: (role: 'admin' | 'farmer' | 'buyer') => void;
  isLoading?: boolean;
}) {
  const [hoveredRole, setHoveredRole] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<string | null>(null);

  const handleRoleClick = (roleId: 'admin' | 'farmer' | 'buyer') => {
    setSelectedRole(roleId);
    onSelectRole(roleId);
  };

  return (
    <div className="min-h-screen w-full flex" style={{ background: '#0d1117' }}>

      {/* ─── Keyframe styles ─── */}
      <style>{`
        /* Ripple rings */
        @keyframes cc-ripple {
          0%   { transform: scale(1);   opacity: 0.6; }
          100% { transform: scale(4);   opacity: 0; }
        }
        /* Blob breathing */
        @keyframes cc-breathe-a {
          0%,100% { transform: translate(0px,0px) scale(1); }
          40%     { transform: translate(18px,-12px) scale(1.07); }
          70%     { transform: translate(-10px,14px) scale(0.94); }
        }
        @keyframes cc-breathe-b {
          0%,100% { transform: translate(0px,0px) scale(1); }
          35%     { transform: translate(-16px,10px) scale(1.05); }
          65%     { transform: translate(12px,-16px) scale(0.96); }
        }
        @keyframes cc-breathe-c {
          0%,100% { transform: translate(0px,0px) scale(1); }
          50%     { transform: translate(10px,8px) scale(1.08); }
        }
        /* Logo sway */
        @keyframes cc-sway {
          0%,100% { transform: rotate(-6deg) scale(1); }
          50%     { transform: rotate(6deg) scale(1.04); }
        }
        /* Satellite orbits along ellipse */
        @keyframes cc-orbit {
          0%   { offset-distance: 0%;   }
          100% { offset-distance: 100%; }
        }
        /* Satellite body rotate */
        @keyframes cc-sat-spin {
          0%   { transform: rotate(0deg);   }
          100% { transform: rotate(360deg); }
        }
        /* Scan beam sweeps down */
        @keyframes cc-scan {
          0%   { top: 5%;   opacity: 0.7; }
          80%  { top: 92%;  opacity: 0.5; }
          100% { top: 92%;  opacity: 0;   }
        }
        /* NDVI heatmap blob pulse */
        @keyframes cc-ndvi {
          0%,100% { transform: scale(1);   opacity: 0.18; }
          50%      { transform: scale(1.15); opacity: 0.28; }
        }
        /* Starfield twinkle */
        @keyframes cc-twinkle {
          0%,100% { opacity: 0.15; }
          50%      { opacity: 0.7;  }
        }
        /* Signal ping from satellite */
        @keyframes cc-ping {
          0%   { transform: scale(0.5); opacity: 0.9; }
          100% { transform: scale(3);   opacity: 0;   }
        }
        ${
          /* Per-bubble keyframes with drift baked in */
          BUBBLES.map(b => `
            @keyframes cc-bubble-${b.id} {
              0%   { transform: translateY(0) translateX(0);          opacity: 0; }
              7%   { opacity: ${b.op}; }
              93%  { opacity: ${b.op}; }
              100% { transform: translateY(-105vh) translateX(${b.drift}px); opacity: 0; }
            }
          `).join('')
        }
        ${
          /* Per-seed keyframes with drift + rotation baked in */
          SEEDS.map(s => `
            @keyframes cc-seed-${s.id} {
              0%   { transform: translateY(0) translateX(0) rotate(${s.rot}deg);              opacity: 0; }
              7%   { opacity: ${s.op}; }
              50%  { transform: translateY(-52vh) translateX(${s.drift/2}px) rotate(${s.rot + 25}deg); }
              93%  { opacity: ${s.op}; }
              100% { transform: translateY(-105vh) translateX(${s.drift}px) rotate(${s.rot + 50}deg); opacity: 0; }
            }
          `).join('')
        }
      `}</style>

      {/* ══════════════════════════════════
          LEFT PANEL
      ══════════════════════════════════ */}
      <div
        className="hidden lg:flex flex-col justify-start w-[42%] min-h-screen p-10 relative overflow-hidden"
        style={{
          background: 'linear-gradient(145deg, #0a4a24 0%, #15803d 50%, #16a34a 80%, #22c55e 100%)',
        }}
      >

        {/* ── Breathing blobs ── */}
        <div style={{
          position: 'absolute', top: '-100px', right: '-100px',
          width: 360, height: 360, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255,255,255,0.10) 0%, transparent 70%)',
          animation: 'cc-breathe-a 18s ease-in-out infinite',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', bottom: '40px', left: '-80px',
          width: 280, height: 280, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255,255,255,0.08) 0%, transparent 70%)',
          animation: 'cc-breathe-b 22s ease-in-out infinite',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', top: '45%', left: '55%',
          width: 180, height: 180, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(134,239,172,0.12) 0%, transparent 70%)',
          animation: 'cc-breathe-c 14s ease-in-out infinite',
          pointerEvents: 'none',
        }} />

        {/* ── Floating bubbles ── */}
        {BUBBLES.map((b) => (
          <div
            key={b.id}
            style={{
              position: 'absolute',
              bottom: -20,
              left: b.left,
              width: b.size,
              height: b.size,
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.18)',
              border: '1.5px solid rgba(255,255,255,0.60)',
              boxShadow: `0 0 ${b.size}px ${b.size / 2}px rgba(134,239,172,0.25)`,
              animation: `cc-bubble-${b.id} ${b.duration}s ${b.delay}s linear infinite`,
              pointerEvents: 'none',
              overflow: 'hidden',
            }}
          >
            {/* Bubble highlight shine */}
            <div style={{
              position: 'absolute', top: '12%', left: '14%',
              width: '36%', height: '36%',
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.70)',
            }} />
          </div>
        ))}

        {/* ── Floating leaf seeds ── */}
        {SEEDS.map((s) => (
          <div
            key={s.id}
            style={{
              position: 'absolute',
              bottom: -20,
              left: s.left,
              width: s.size,
              height: s.size,
              animation: `cc-seed-${s.id} ${s.duration}s ${s.delay}s linear infinite`,
              pointerEvents: 'none',
              opacity: 0,
              filter: 'drop-shadow(0 0 4px rgba(187,247,208,0.6))',
            }}
          >
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
              <path
                d="M12 3C12 3 4 9 4 16C4 19.5 7.5 21 12 21C16.5 21 20 19.5 20 16C20 9 12 3 12 3Z"
                fill="rgba(187,247,208,0.85)"
                stroke="rgba(255,255,255,0.6)"
                strokeWidth="0.8"
              />
              <line x1="12" y1="3" x2="12" y2="21" stroke="rgba(255,255,255,0.5)" strokeWidth="0.8" />
              <path d="M12 10 Q16 12 14 16" stroke="rgba(255,255,255,0.4)" strokeWidth="0.6" fill="none" />
            </svg>
          </div>
        ))}

        {/* ── Ripple rings (centered lower-third) ── */}
        <div style={{
          position: 'absolute',
          bottom: '22%',
          left: '50%',
          transform: 'translateX(-50%)',
          pointerEvents: 'none',
        }}>
          {RINGS.map((r, i) => (
            <div
              key={i}
              style={{
                position: 'absolute',
                top: '50%', left: '50%',
                width: r.size, height: r.size,
                marginLeft: -(r.size / 2), marginTop: -(r.size / 2),
                borderRadius: '50%',
                border: '1.5px solid rgba(255,255,255,0.30)',
                animation: `cc-ripple 4.2s ${r.delay} ease-out infinite`,
              }}
            />
          ))}
          {/* Center glow dot */}
          <div style={{
            width: 10, height: 10, borderRadius: '50%',
            background: 'rgba(255,255,255,0.55)',
            boxShadow: '0 0 16px 8px rgba(134,239,172,0.35)',
            position: 'absolute', top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
          }} />
        </div>

        {/* ── Logo + Hero text ── */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className="flex flex-col gap-8 relative z-10"
        >
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div
              className="flex items-center justify-center rounded-2xl shadow-lg"
              style={{
                width: 48, height: 48,
                background: 'rgba(255,255,255,0.15)',
                backdropFilter: 'blur(8px)',
                border: '1px solid rgba(255,255,255,0.25)',
              }}
            >
              <Leaf
                className="w-6 h-6 text-white"
                style={{ animation: 'cc-sway 5s ease-in-out infinite' }}
              />
            </div>
            <span className="text-white font-bold text-xl tracking-tight">CarbonConnect</span>
          </div>

          {/* Hero text */}
          <div>
            <p className="text-green-200 text-sm font-semibold tracking-widest uppercase mb-4">
              The Future of Sustainable Farming
            </p>
            <h1
              className="text-white font-extrabold leading-tight mb-6"
              style={{ fontSize: '2.75rem', letterSpacing: '-0.02em' }}
            >
              Verified<br />Income.<br />
              <span style={{ color: '#bbf7d0' }}>Clean Future.</span>
            </h1>
            <p className="text-green-100 text-base leading-relaxed max-w-xs" style={{ opacity: 0.85 }}>
              Step into the marketplace that values your commitment to the planet.
              Secure, traceable, and direct — powered by AI and satellite intelligence.
            </p>
          </div>
        </motion.div>


      </div>

      {/* ══════════════════════════════════
          RIGHT PANEL — Role Selector
      ══════════════════════════════════ */}
      <div
        className="flex-1 flex flex-col items-center justify-center min-h-screen p-6 lg:p-12 relative"
        style={{ background: 'linear-gradient(160deg, #0d1117 0%, #0f2a1a 40%, #0d1f2d 100%)' }}
      >

        {/* ── Starfield dots ── */}
        {[
          {top:'8%', left:'12%', d:14}, {top:'15%', left:'72%', d:9},
          {top:'28%', left:'88%', d:11},{top:'42%', left:'5%',  d:8},
          {top:'55%', left:'60%', d:13},{top:'70%', left:'30%', d:10},
          {top:'82%', left:'80%', d:7}, {top:'90%', left:'48%', d:12},
          {top:'5%',  left:'50%', d:8}, {top:'35%', left:'40%', d:6},
          {top:'60%', left:'92%', d:9}, {top:'75%', left:'18%', d:11},
        ].map((s,i) => (
          <div key={i} style={{
            position:'absolute', top:s.top, left:s.left,
            width:s.d/5, height:s.d/5,
            borderRadius:'50%', background:'#fff',
            animation:`cc-twinkle ${2+i*0.4}s ${i*0.3}s ease-in-out infinite`,
            pointerEvents:'none',
          }}/>
        ))}

        {/* ── NDVI heatmap blobs ── */}
        {[
          {top:'20%',left:'15%',w:160,h:100,color:'rgba(34,197,94,0.15)',  delay:'0s',  dur:'6s'},
          {top:'50%',left:'55%',w:200,h:130,color:'rgba(22,163,74,0.12)',  delay:'2s',  dur:'8s'},
          {top:'65%',left:'10%',w:140,h:90, color:'rgba(134,239,172,0.10)',delay:'1s',  dur:'7s'},
          {top:'10%',left:'60%',w:120,h:80, color:'rgba(21,128,61,0.14)',  delay:'3s',  dur:'5s'},
          {top:'78%',left:'65%',w:180,h:110,color:'rgba(74,222,128,0.10)', delay:'1.5s','dur':'9s'},
        ].map((b,i) => (
          <div key={i} style={{
            position:'absolute', top:b.top, left:b.left,
            width:b.w, height:b.h,
            borderRadius:'50%',
            background:`radial-gradient(ellipse, ${b.color} 0%, transparent 70%)`,
            animation:`cc-ndvi ${b.dur} ${b.delay} ease-in-out infinite`,
            pointerEvents:'none',
          }}/>
        ))}

        {/* ── Satellite SVG + orbit path ── */}
        <div style={{
          position:'absolute', inset:0,
          pointerEvents:'none', overflow:'hidden',
        }}>
          {/* Orbit ellipse */}
          <svg
            viewBox="0 0 600 700"
            style={{ position:'absolute', top:0, left:0, width:'100%', height:'100%', opacity:0.18 }}
            preserveAspectRatio="xMidYMid meet"
          >
            <ellipse cx="300" cy="350" rx="240" ry="130"
              fill="none" stroke="rgba(134,239,172,0.9)" strokeWidth="1"
              strokeDasharray="6 8"
            />
            {/* Ground scan lines */}
            <line x1="80" y1="220" x2="520" y2="220" stroke="rgba(134,239,172,0.15)" strokeWidth="0.8" />
            <line x1="60" y1="260" x2="540" y2="260" stroke="rgba(134,239,172,0.10)" strokeWidth="0.8" />
            <line x1="40" y1="300" x2="560" y2="300" stroke="rgba(134,239,172,0.08)" strokeWidth="0.8" />
            <line x1="60" y1="340" x2="540" y2="340" stroke="rgba(134,239,172,0.10)" strokeWidth="0.8" />
            <line x1="80" y1="380" x2="520" y2="380" stroke="rgba(134,239,172,0.08)" strokeWidth="0.8" />
          </svg>

          {/* Satellite: uses offset-path to follow the ellipse */}
          <div style={{
            position:'absolute', top:0, left:0, width:'100%', height:'100%',
          }}>
            <div style={{
              position:'absolute',
              top:'50%', left:'50%',
              offsetPath:'ellipse(40% 18.5% at 50% 50%)',
              offsetRotate:'0deg',
              animation:'cc-orbit 18s linear infinite',
              transform:'translate(-50%,-50%)',
            }}>
              {/* Satellite body */}
              <div style={{ position:'relative', animation:'cc-sat-spin 18s linear infinite' }}>
                <svg width="42" height="28" viewBox="0 0 42 28" fill="none">
                  {/* Body */}
                  <rect x="14" y="9" width="14" height="10" rx="2" fill="rgba(200,230,255,0.9)" />
                  {/* Left solar panel */}
                  <rect x="1" y="10" width="11" height="8" rx="1.5"
                    fill="none" stroke="rgba(134,239,172,0.9)" strokeWidth="1.2" />
                  <line x1="6" y1="10" x2="6" y2="18" stroke="rgba(134,239,172,0.6)" strokeWidth="0.8"/>
                  <rect x="2" y="11" width="3" height="6" rx="0.5" fill="rgba(22,163,74,0.6)"/>
                  <rect x="6.5" y="11" width="3" height="6" rx="0.5" fill="rgba(22,163,74,0.6)"/>
                  {/* Right solar panel */}
                  <rect x="30" y="10" width="11" height="8" rx="1.5"
                    fill="none" stroke="rgba(134,239,172,0.9)" strokeWidth="1.2" />
                  <line x1="35" y1="10" x2="35" y2="18" stroke="rgba(134,239,172,0.6)" strokeWidth="0.8"/>
                  <rect x="30.5" y="11" width="3" height="6" rx="0.5" fill="rgba(22,163,74,0.6)"/>
                  <rect x="35" y="11" width="3" height="6" rx="0.5" fill="rgba(22,163,74,0.6)"/>
                  {/* Antenna */}
                  <line x1="21" y1="9" x2="21" y2="4" stroke="rgba(200,230,255,0.8)" strokeWidth="1"/>
                  <circle cx="21" cy="3.5" r="1.5" fill="rgba(134,239,172,0.9)"/>
                  {/* Signal ping */}
                  <circle cx="21" cy="3.5" r="3"
                    fill="none" stroke="rgba(134,239,172,0.7)" strokeWidth="0.8"
                    style={{ animation:'cc-ping 2s ease-out infinite' }}
                  />
                </svg>
              </div>
            </div>
          </div>

          {/* Vertical scan beam */}
          <div style={{
            position:'absolute', left:'48%', width:2, height:'18%',
            background:'linear-gradient(to bottom, rgba(134,239,172,0) 0%, rgba(134,239,172,0.6) 50%, rgba(134,239,172,0) 100%)',
            animation:'cc-scan 6s 1s ease-in-out infinite',
            borderRadius:2,
            boxShadow:'0 0 8px 2px rgba(134,239,172,0.3)',
          }}/>
        </div>

        {/* Mobile logo */}
        <div className="lg:hidden flex items-center gap-2 mb-8 self-start">
          <div
            className="flex items-center justify-center rounded-xl"
            style={{ width: 36, height: 36, background: '#16a34a' }}
          >
            <Leaf className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-lg text-white">CarbonConnect</span>
        </div>

        <div className="w-full max-w-lg">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55 }}
            className="mb-8"
          >
            {/* Sign-in label */}
            <div
              className="inline-flex items-center gap-2 rounded-full px-3 py-1 mb-4"
              style={{
                background: 'rgba(22,163,74,0.15)',
                border: '1px solid rgba(22,163,74,0.35)',
              }}
            >
              <div className="w-2 h-2 rounded-full bg-green-400" style={{ boxShadow: '0 0 6px #4ade80' }} />
              <span className="text-green-400 text-xs font-semibold tracking-wider uppercase">Sign In</span>
            </div>

            <h2
              className="font-extrabold text-white mb-2"
              style={{ fontSize: '2rem', letterSpacing: '-0.02em' }}
            >
              Welcome Back
            </h2>
            <p className="text-green-300 text-sm" style={{ opacity: 0.75 }}>
              Select your role below to sign in and access your dashboard.
            </p>
          </motion.div>

          {/* Divider */}
          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 h-px" style={{ background: 'rgba(134,239,172,0.15)' }} />
            <span className="text-xs font-medium" style={{ color: 'rgba(134,239,172,0.5)' }}>Choose your role</span>
            <div className="flex-1 h-px" style={{ background: 'rgba(134,239,172,0.15)' }} />
          </div>

          {/* Role Cards */}
          <div className="flex flex-col gap-3">
            {roles.map((role, i) => {
              const Icon = role.icon;
              const isHovered = hoveredRole === role.id;
              const isSelected = selectedRole === role.id;
              const isThisLoading = isLoading && isSelected;

              return (
                <motion.button
                  key={role.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.1 + i * 0.1 }}
                  onMouseEnter={() => setHoveredRole(role.id)}
                  onMouseLeave={() => setHoveredRole(null)}
                  onClick={() => handleRoleClick(role.id)}
                  disabled={isLoading}
                  className="w-full text-left"
                  style={{ background: 'none', border: 'none', padding: 0, cursor: isLoading ? 'not-allowed' : 'pointer' }}
                >
                  <motion.div
                    animate={{
                      borderColor: isHovered || isSelected ? role.accentColor : 'rgba(255,255,255,0.12)',
                      boxShadow: isHovered || isSelected
                        ? `0 0 0 2px ${role.accentColor}44, 0 8px 32px ${role.accentColor}30`
                        : '0 2px 12px rgba(0,0,0,0.4)',
                      background: isHovered || isSelected
                        ? `rgba(255,255,255,0.10)`
                        : 'rgba(255,255,255,0.06)',
                    }}
                    transition={{ duration: 0.22 }}
                    className="rounded-2xl p-5 border-2 flex items-center gap-4"
                    style={{
                      borderWidth: 2, borderStyle: 'solid',
                      backdropFilter: 'blur(16px)',
                    }}
                  >
                    {/* Icon bubble */}
                    <motion.div
                      animate={{
                        background: isHovered || isSelected ? role.accentColor : role.lightBg,
                      }}
                      transition={{ duration: 0.22 }}
                      className="rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ width: 52, height: 52 }}
                    >
                      <Icon
                        className="w-6 h-6"
                        style={{
                          color: isHovered || isSelected ? '#fff' : role.accentColor,
                          transition: 'color 0.22s',
                        }}
                      />
                    </motion.div>

                    {/* Text */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-bold text-white text-base">{role.title}</span>
                        <span
                          className="text-xs font-semibold px-2 py-0.5 rounded-full"
                          style={{
                            background: role.lightBg,
                            color: role.accentColor,
                            border: `1px solid ${role.borderColor}`,
                          }}
                        >
                          {role.subtitle}
                        </span>
                      </div>
                      <p className="text-green-300 text-sm leading-snug" style={{ opacity: 0.8 }}>{role.description}</p>
                    </div>

                    {/* Arrow / Spinner */}
                    <div className="flex-shrink-0">
                      {isThisLoading ? (
                        <div
                          className="w-5 h-5 rounded-full border-2 animate-spin"
                          style={{
                            borderColor: `${role.accentColor} ${role.accentColor} ${role.accentColor} transparent`,
                          }}
                        />
                      ) : (
                        <motion.div
                          animate={{ x: isHovered ? 4 : 0, opacity: isHovered ? 1 : 0.35 }}
                          transition={{ duration: 0.2 }}
                        >
                          <ArrowRight className="w-5 h-5" style={{ color: role.accentColor }} />
                        </motion.div>
                      )}
                    </div>
                  </motion.div>
                </motion.button>
              );
            })}
          </div>

          {/* Footer trust badges */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="mt-8 pt-6"
            style={{ borderTop: '1px solid rgba(134,239,172,0.10)' }}
          >
            <div className="flex items-center justify-center gap-2 mb-3">
              <CheckCircle className="w-4 h-4" style={{ color: '#4ade80' }} />
              <span className="text-xs tracking-wide" style={{ color: 'rgba(134,239,172,0.6)' }}>
                Secured by Google Authentication &amp; Firestore
              </span>
            </div>
            <p className="text-center text-xs" style={{ color: 'rgba(134,239,172,0.35)' }}>
              By signing in you agree to our Terms of Service and Privacy Policy.
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
