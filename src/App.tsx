import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Gamepad, 
  Settings2, 
  Wifi, 
  Bluetooth, 
  Zap, 
  Activity, 
  Info,
  RefreshCw,
  Power,
  ChevronRight,
  MonitorSmartphone,
  Gauge,
  Cpu,
  Scissors,
  Waves,
  HeartPulse,
  Save,
  Play,
  Trash2,
  Square,
  Video
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import Controller from './components/Controller';
import PornSyncPanel from './components/PornSyncPanel';

interface GamepadState {
  id: string;
  index: number;
  mapping: string;
  buttons: readonly GamepadButton[];
  axes: readonly number[];
  connected: boolean;
}

type VibrationMode = 'both' | 'left' | 'right' | 'pulse' | 'wave' | 'heartbeat' | 'engine' | 'explosion' | 'chaos' | 'lightning' | 'soft-wave' | 'emergency' | 'ghost' | 'tsunami' | 'raptor' | 'massage' | 'custom' | 'rapid' | 'tap' | 'massage-back' | 'massage-legs' | 'massage-arms' | 'massage-private' | 'porn-sync';

type AppTab = 'monitor' | 'recorder' | 'presets' | 'logic' | 'massage' | 'porn-sync';

interface CustomPoint {
  time: number;
  intensity: number;
}

interface ActionMapping {
  buttonIndex: number;
  mode: VibrationMode;
}

export default function App() {
  const [gamepads, setGamepads] = useState<Record<number, GamepadState>>({});
  const [activeGamepadIndex, setActiveGamepadIndex] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<AppTab>('presets');
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [leftIntensity, setLeftIntensity] = useState(0.8);
  const [rightIntensity, setRightIntensity] = useState(0.8);
  const [vibrationMode, setVibrationMode] = useState<VibrationMode>('both');
  const [isVibrating, setIsVibrating] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [connectionType, setConnectionType] = useState<'bluetooth' | 'radio' | 'unknown'>('unknown');
  const [orientation, setOrientation] = useState({ pitch: 0, roll: 0, yaw: 0 });
  const [mappings, setMappings] = useState<ActionMapping[]>([]);
  const [history, setHistory] = useState<{ time: number, left: number, right: number }[]>([]);
  const [customPattern, setCustomPattern] = useState<CustomPoint[]>(
    Array.from({ length: 20 }, (_, i) => ({ time: i * 50, intensity: 0.5 }))
  );
  const [isRecording, setIsRecording] = useState(false);
  const [playbackStartTime, setPlaybackStartTime] = useState<number | null>(null);

  const rafeRef = useRef<number>(null);
  const historyRef = useRef<{ time: number, left: number, right: number }[]>([]);
  const mappingActiveRef = useRef<boolean>(false);

  // Sync dark mode class
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const updateGamepadState = useCallback(() => {
    const gps = navigator.getGamepads();
    const newStates: Record<number, GamepadState> = {};
    
    let foundActive = false;
    for (const gp of gps) {
      if (gp) {
        newStates[gp.index] = {
          id: gp.id,
          index: gp.index,
          mapping: gp.mapping,
          buttons: gp.buttons,
          axes: gp.axes,
          connected: gp.connected
        };

        // Check mappings
        let anyMappingPressed = false;
        if (gp.index === activeGamepadIndex) {
          mappings.forEach(m => {
            if (gp.buttons[m.buttonIndex]?.pressed) {
              setVibrationMode(m.mode);
              setIsVibrating(true);
              anyMappingPressed = true;
            }
          });
        }
        
        // If mappings were used but none are pressed now, stop if it was a mapping-induced vibration
        if (mappingActiveRef.current && !anyMappingPressed) {
          setIsVibrating(false);
        }
        mappingActiveRef.current = anyMappingPressed;

        // Heuristic for orientation if available (some controllers map tilt to axes 4+)
        if (gp.index === activeGamepadIndex && gp.axes.length > 4) {
          setOrientation({
            pitch: gp.axes[1] * -15, 
            roll: gp.axes[0] * 15,
            yaw: gp.axes[2] * 5 || 0
          });
        }

        if (activeGamepadIndex === null || activeGamepadIndex === gp.index) {
          foundActive = true;
          if (activeGamepadIndex === null) setActiveGamepadIndex(gp.index);
        }
      }
    }

    if (!foundActive && Object.keys(newStates).length > 0) {
      setActiveGamepadIndex(Number(Object.keys(newStates)[0]));
    } else if (Object.keys(newStates).length === 0) {
      setActiveGamepadIndex(null);
    }

    setGamepads(newStates);
    rafeRef.current = requestAnimationFrame(updateGamepadState);
  }, [activeGamepadIndex, mappings]);

  useEffect(() => {
    const onConnect = (e: GamepadEvent) => {
      if (e.gamepad.id.toLowerCase().includes('bluetooth') || e.gamepad.id.toLowerCase().includes('wireless')) {
        setConnectionType('bluetooth');
      } else if (e.gamepad.id.toLowerCase().includes('xbox') || e.gamepad.id.toLowerCase().includes('2.4g')) {
        setConnectionType('radio');
      } else {
        setConnectionType('unknown');
      }
    };

    window.addEventListener("gamepadconnected", onConnect);
    rafeRef.current = requestAnimationFrame(updateGamepadState);
    
    return () => {
      window.removeEventListener("gamepadconnected", onConnect);
      if (rafeRef.current) cancelAnimationFrame(rafeRef.current);
    };
  }, [updateGamepadState]);

  const triggerVibration = useCallback(async (gpIndex: number, lIntensityOverride?: number, rIntensityOverride?: number) => {
    const gp = navigator.getGamepads()[gpIndex];
    if (!gp?.vibrationActuator) return;

    let weakM = 0;
    let strongM = 0;
    
    const lVal = lIntensityOverride ?? leftIntensity;
    const rVal = rIntensityOverride ?? rightIntensity;

    switch (vibrationMode) {
      case 'both':
        weakM = rVal;
        strongM = lVal;
        break;
      case 'left':
        strongM = lVal;
        break;
      case 'right':
        weakM = rVal;
        break;
      default:
        weakM = rVal;
        strongM = lVal;
    }

    try {
      // Record to history
      historyRef.current = [...historyRef.current.slice(-40), { time: Date.now(), left: strongM, right: weakM }];
      if (Math.random() > 0.5) setHistory([...historyRef.current]); 

      // @ts-ignore
      await gp.vibrationActuator.playEffect("dual-rumble", {
        startDelay: 0,
        duration: 800, 
        weakMagnitude: Math.min(1, Math.max(0, weakM)),
        strongMagnitude: Math.min(1, Math.max(0, strongM)),
      });
    } catch (e) {
      console.error("Vibration failed", e);
    }
  }, [leftIntensity, rightIntensity, vibrationMode]);

  useEffect(() => {
    let interval: number;
    if (isVibrating && activeGamepadIndex !== null) {
      interval = setInterval(() => {
        const time = Date.now();
        const gp = navigator.getGamepads()[activeGamepadIndex];
        if (!gp?.vibrationActuator) return;

        switch (vibrationMode) {
          case 'pulse':
            const pulse = (Math.sin(time / 150) * 0.5 + 0.5);
            triggerVibration(activeGamepadIndex, leftIntensity * pulse, rightIntensity * pulse);
            break;
          case 'wave':
            const wave = Math.sin(time / 300);
            triggerVibration(activeGamepadIndex, wave > 0 ? leftIntensity : 0, wave <= 0 ? rightIntensity : 0);
            break;
          case 'heartbeat':
            const hbCycle = (time % 1200);
            const hb = (hbCycle < 100 || (hbCycle > 250 && hbCycle < 350)) ? 1 : 0;
            triggerVibration(activeGamepadIndex, leftIntensity * hb, rightIntensity * hb);
            break;
          case 'engine':
            const jitter = (Math.random() * 0.3 + 0.7); // Increased jitter for stronger feel
            triggerVibration(activeGamepadIndex, leftIntensity * jitter, rightIntensity * (jitter * 0.9));
            break;
          case 'explosion':
            const expTime = (time % 2000) / 2000; // Longer explosion
            const exp = Math.max(0, 1 - expTime * 4);
            triggerVibration(activeGamepadIndex, leftIntensity * exp, rightIntensity * exp);
            break;
          case 'chaos':
            triggerVibration(activeGamepadIndex, leftIntensity * Math.random(), rightIntensity * Math.random());
            break;
          case 'lightning':
            const lStrike = Math.random() > 0.95 ? 1 : 0;
            triggerVibration(activeGamepadIndex, leftIntensity * lStrike, rightIntensity * lStrike);
            break;
          case 'soft-wave':
            const sw = (Math.sin(time / 1000) * 0.5 + 0.5);
            triggerVibration(activeGamepadIndex, leftIntensity * sw, rightIntensity * (1 - sw));
            break;
          case 'emergency':
            const em = (time % 400 < 200) ? 1 : 0.1;
            triggerVibration(activeGamepadIndex, leftIntensity * em, rightIntensity * (1 - em));
            break;
          case 'massage':
            const cycle = (time % 2000) / 2000;
            const mIntensity = Math.sin(cycle * Math.PI * 4) * 0.3 + 0.7;
            const mSide = Math.sin(cycle * Math.PI * 2);
            triggerVibration(activeGamepadIndex, 
              leftIntensity * mIntensity * (mSide > 0 ? 1 : 0.2), 
              rightIntensity * mIntensity * (mSide <= 0 ? 1 : 0.2)
            );
            break;
          case 'tap':
            const tapCycle = (time % 400);
            const tapIntensity = (tapCycle < 50 || (tapCycle > 150 && tapCycle < 200)) ? 1 : 0;
            triggerVibration(activeGamepadIndex, leftIntensity * tapIntensity, rightIntensity * tapIntensity);
            break;
          case 'rapid':
            const rapid = (time % 80 < 40) ? 1 : 0;
            triggerVibration(activeGamepadIndex, leftIntensity * rapid, rightIntensity * rapid);
            break;
          case 'massage-back':
            const mb = (Math.sin(time / 600) * 0.4 + 0.6);
            triggerVibration(activeGamepadIndex, leftIntensity * mb, rightIntensity * mb);
            break;
          case 'massage-legs':
            const ml = (time % 400 < 200) ? 0.8 : 0.3;
            triggerVibration(activeGamepadIndex, leftIntensity * ml, rightIntensity * ml);
            break;
          case 'massage-arms':
            const ma = (Math.sin(time / 200) * 0.5 + 0.5);
            triggerVibration(activeGamepadIndex, leftIntensity * ma, rightIntensity * (1 - ma));
            break;
          case 'massage-private':
            const mpScale = (Math.sin(time / 100) * 0.5 + 0.5);
            const mpPulse = (time % 50 < 25) ? 1 : 0.2;
            triggerVibration(activeGamepadIndex, leftIntensity * mpPulse * mpScale, rightIntensity * mpPulse * (1 - mpScale));
            break;
          case 'custom':
            if (playbackStartTime) {
              const elapsed = (time - playbackStartTime) % 1000;
              const point = customPattern.find(p => p.time >= elapsed) || customPattern[customPattern.length - 1];
              triggerVibration(activeGamepadIndex, leftIntensity * point.intensity, rightIntensity * point.intensity);
            } else {
              triggerVibration(activeGamepadIndex);
            }
            break;
          case 'ghost':
            const gh = Math.random() > 0.98 ? Math.random() : 0;
            triggerVibration(activeGamepadIndex, leftIntensity * gh, rightIntensity * gh);
            break;
          case 'tsunami':
            const tsu = (Math.sin(time / 2000) * 0.5 + 0.5);
            triggerVibration(activeGamepadIndex, leftIntensity * tsu, rightIntensity * tsu);
            break;
          case 'raptor':
            const rap = (time % 500 < 50) ? 1 : 0;
            triggerVibration(activeGamepadIndex, leftIntensity * rap, rightIntensity * rap);
            break;
          case 'porn-sync':
            const psIntensity = (window as any).__pornSyncIntensity || { left: 0, right: 0 };
            const lVal = typeof psIntensity === 'number' ? psIntensity : (psIntensity.left || 0);
            const rVal = typeof psIntensity === 'number' ? psIntensity : (psIntensity.right || 0);
            triggerVibration(activeGamepadIndex, leftIntensity * lVal, rightIntensity * rVal);
            break;
          default:
            triggerVibration(activeGamepadIndex);
        }
      }, 100) as unknown as number;
    }
    return () => clearInterval(interval);
  }, [isVibrating, activeGamepadIndex, triggerVibration, vibrationMode, leftIntensity, rightIntensity]);

  const addMapping = (btn: number, mode: VibrationMode) => {
    setMappings(prev => [...prev.filter(m => m.buttonIndex !== btn), { buttonIndex: btn, mode }]);
  };

  const togglePlayback = () => {
    if (playbackStartTime) {
      setPlaybackStartTime(null);
      setIsVibrating(false);
    } else {
      setVibrationMode('custom');
      setPlaybackStartTime(Date.now());
      setIsVibrating(true);
    }
  };

  const handleTabChange = (tab: AppTab) => {
    if (tab === activeTab) return;
    setIsTransitioning(true);
    setTimeout(() => {
      setActiveTab(tab);
      setIsTransitioning(false);
    }, 500);
  };

  const handleCustomPatternChange = (index: number, value: number) => {
    setCustomPattern(prev => prev.map((p, i) => i === index ? { ...p, intensity: value } : p));
  };

  const activeGamepad = activeGamepadIndex !== null ? gamepads[activeGamepadIndex] : null;

  const tabs: { id: AppTab; label: string; icon: React.ReactNode }[] = [
    { id: 'presets', label: 'โหมดสั่น', icon: <Zap size={18} /> },
    { id: 'massage', label: 'นวดผ่อนคลาย', icon: <Waves size={18} /> },
    { id: 'recorder', label: 'บันทึกท่า', icon: <Save size={18} /> },
    { id: 'logic', label: 'ตั้งค่าปุ่ม', icon: <Cpu size={18} /> },
    { id: 'porn-sync', label: 'วิดีโอซิงค์', icon: <Video size={18} /> },
  ];

  return (
    <div className="min-h-screen relative text-[#1d1d1f] dark:text-[#f5f5f7] font-sans selection:bg-[#0071e3]/10 overflow-x-hidden pb-24 md:pb-0 transition-colors duration-400">
      {/* Mesh Gradient Background */}
      <div className="fixed inset-0 -z-10 bg-[#f5f5f7] dark:bg-[#000000]">
        <div className="absolute inset-0 bg-[radial-gradient(at_0%_0%,rgba(0,113,227,0.05)_0,transparent_50%),radial-gradient(at_100%_0%,rgba(129,140,248,0.05)_0,transparent_50%),radial-gradient(at_100%_100%,rgba(0,113,227,0.03)_0,transparent_50%),radial-gradient(at_0%_100%,rgba(129,140,248,0.03)_0,transparent_50%)]" />
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-100/30 dark:bg-blue-900/10 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-100/30 dark:bg-indigo-900/10 blur-[120px] rounded-full animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      <header className="fixed top-0 w-full z-50 glass border-b border-white/20 dark:border-white/5 px-4 md:px-8 py-4 sm:py-5">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <motion.div 
              animate={isVibrating ? { 
                x: [-1, 2, -2, 2, -1], 
                y: [1, -1, 1, 0, -1],
                rotate: [-2, 2, -2, 2, 0] 
              } : {}}
              transition={{ duration: 0.1, repeat: Infinity }}
              className="w-8 h-8 sm:w-10 sm:h-10 bg-[#0071e3] rounded-xl sm:rounded-2xl flex items-center justify-center text-white shadow-xl shadow-blue-500/20"
            >
              <Gamepad size={20} className="sm:size-[22px]" />
            </motion.div>
            <div className="flex flex-col">
              <span className="font-bold text-base sm:text-lg tracking-tight leading-none">Rumble Lab TH</span>
              <span className="text-[8px] sm:text-[10px] font-bold text-blue-500 uppercase tracking-widest mt-1">ห้องแล็บระบบสั่น</span>
            </div>
          </div>
          
          <nav className="hidden md:flex gap-1 bg-slate-100/50 dark:bg-zinc-900/50 p-1 rounded-2xl border border-white/50 dark:border-white/5">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  activeTab === tab.id 
                  ? 'bg-white dark:bg-zinc-800 text-[#0071e3] shadow-sm' 
                  : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-white/50 dark:hover:bg-zinc-800/50'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </nav>

          <div className="flex gap-2 sm:gap-4 items-center">
             <button 
                onClick={() => setIsDarkMode(!isDarkMode)}
                className="w-10 h-10 rounded-xl glass border border-white/20 flex items-center justify-center text-slate-500 hover:text-[#0071e3] transition-all"
             >
                {isDarkMode ? <Zap size={18} /> : <MonitorSmartphone size={18} />}
             </button>
             {activeGamepad && (
               <div className="flex items-center gap-2 bg-green-500/10 px-3 py-1.5 rounded-full border border-green-500/20">
                 <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
                 <span className="text-[10px] font-bold text-green-600">เชื่อมต่อแล้ว</span>
               </div>
             )}
          </div>
        </div>
      </header>

      {/* Mobile Tab Bar */}
      <div className="fixed bottom-0 left-0 w-full z-50 md:hidden px-4 pb-4">
        <div className="glass apple-shadow rounded-[32px] border border-white/50 flex justify-around p-2 gap-1 items-center backdrop-blur-3xl">
           {tabs.map((tab) => (
             <button
               key={tab.id}
               onClick={() => handleTabChange(tab.id)}
               className={`flex flex-col items-center gap-1 flex-1 py-3 rounded-2xl transition-all relative ${
                 activeTab === tab.id ? 'text-[#0071e3]' : 'text-slate-400'
               }`}
             >
               {activeTab === tab.id && (
                 <motion.div 
                   layoutId="activeTabMobile"
                   className="absolute inset-0 bg-blue-50/50 rounded-2xl -z-10 border border-blue-100/50"
                   transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                 />
               )}
               {tab.icon}
               <span className="text-[8px] font-black uppercase tracking-tighter">{tab.label}</span>
             </button>
           ))}
        </div>
      </div>

      <motion.main 
        className="pt-24 md:pt-32 pb-20 px-4 sm:px-6 max-w-[1600px] mx-auto overflow-visible"
      >
        <div className="flex flex-col xl:flex-row gap-6">
           {/* ALWAYS VISIBLE MONITOR PANEL */}
           <div className="w-full xl:w-[60%] flex flex-col gap-6">
              <section className="glass apple-shadow rounded-[32px] p-6 sm:p-12 min-h-[400px] flex flex-col items-center justify-center relative overflow-hidden group">
                 {/* Graph Overview */}
                 <div className="absolute bottom-0 left-0 w-full h-32 opacity-30 pointer-events-none">
                    <ResponsiveContainer width="100%" height="100%">
                       <AreaChart data={history}>
                          <defs>
                             <linearGradient id="colorLeft" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#0071e3" stopOpacity={0.8}/>
                                <stop offset="95%" stopColor="#0071e3" stopOpacity={0}/>
                             </linearGradient>
                             <linearGradient id="colorRight" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#818cf8" stopOpacity={0.8}/>
                                <stop offset="95%" stopColor="#818cf8" stopOpacity={0}/>
                             </linearGradient>
                          </defs>
                          <Area type="monotone" dataKey="left" stroke="#0071e3" fillOpacity={1} fill="url(#colorLeft)" isAnimationActive={false} />
                          <Area type="monotone" dataKey="right" stroke="#818cf8" fillOpacity={1} fill="url(#colorRight)" isAnimationActive={false} />
                       </AreaChart>
                    </ResponsiveContainer>
                 </div>

                 <div className="absolute top-8 left-8 flex flex-col gap-1 z-10">
                   <span className="text-[10px] font-bold text-[#0071e3] uppercase tracking-[0.2em]">ข้อมูลแบบเรียลไทม์</span>
                   <h2 className="text-2xl font-black tracking-tight">ตรวจจับการสั่น</h2>
                 </div>
                 {activeGamepad ? (
                   <div className="w-full max-w-2xl py-10 scale-90 sm:scale-100">
                     <Controller 
                       id={activeGamepad.id} 
                       state={activeGamepad}
                       vibratingLeft={isVibrating && (vibrationMode !== 'right')}
                       vibratingRight={isVibrating && (vibrationMode !== 'left')}
                       orientation={orientation}
                     />
                   </div>
                 ) : (
                   <div className="flex flex-col items-center gap-6 opacity-30 py-20 text-center">
                     <RefreshCw size={48} className="animate-spin-slow text-[#0071e3]" />
                     <p className="text-xs font-black uppercase tracking-widest text-slate-500">รอการเชื่อมต่อจอยควบคุม...</p>
                   </div>
                 )}
              </section>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                 <div className="glass apple-shadow rounded-[28px] p-6 flex items-center gap-4 border border-blue-100/50 dark:border-white/5">
                    <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 shrink-0">
                       <Activity size={24} />
                    </div>
                    <div>
                       <h4 className="font-bold text-xs uppercase tracking-wider text-slate-400">สถานะโหลด</h4>
                       <p className="text-lg font-black text-[#1d1d1f] dark:text-white">{isVibrating ? 'กำลังทำงาน' : 'สถานะว่าง'}</p>
                    </div>
                 </div>
                 <div className="glass apple-shadow rounded-[28px] p-6 flex items-center gap-4 border border-indigo-100/50 dark:border-white/5">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center text-indigo-600 shrink-0">
                       <Cpu size={24} />
                    </div>
                    <div>
                       <h4 className="font-bold text-xs uppercase tracking-wider text-slate-400">บล็อกคำสั่ง</h4>
                       <p className="text-lg font-black text-[#1d1d1f] dark:text-white">{mappings.length} คำสั่งที่บันทึก</p>
                    </div>
                 </div>
              </div>

              <section className="glass apple-shadow rounded-[32px] p-8 border border-white/80 dark:border-white/5 space-y-8">
                 <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-2xl bg-slate-900 dark:bg-white flex items-center justify-center text-white dark:text-black">
                      <Gauge size={20} />
                    </div>
                    <h3 className="font-black uppercase text-xs tracking-widest">ระดับการปรับจูน</h3>
                 </div>
                 <div className="space-y-10">
                     <div className="space-y-4">
                       <div className="flex justify-between items-end">
                         <span className="text-[10px] font-black uppercase text-slate-400 tracking-tighter">มอเตอร์หลัก (ซ้าย)</span>
                         <span className="text-blue-600 font-mono text-xl font-black">{(leftIntensity * 100).toFixed(0)}%</span>
                       </div>
                       <input type="range" min="0" max="1" step="0.01" value={leftIntensity} onChange={(e) => setLeftIntensity(parseFloat(e.target.value))} className="apple-slider w-full" />
                     </div>
                     <div className="space-y-4">
                       <div className="flex justify-between items-end">
                         <span className="text-[10px] font-black uppercase text-slate-400 tracking-tighter">มอเตอร์เล็ก (ขวา)</span>
                         <span className="text-indigo-500 font-mono text-xl font-black">{(rightIntensity * 100).toFixed(0)}%</span>
                       </div>
                       <input type="range" min="0" max="1" step="0.01" value={rightIntensity} onChange={(e) => setRightIntensity(parseFloat(e.target.value))} className="apple-slider w-full" />
                     </div>
                 </div>
                 <button
                    disabled={!activeGamepad}
                    onClick={() => setIsVibrating(!isVibrating)}
                    className={`w-full py-6 rounded-[24px] text-lg font-black transition-all shadow-2xl flex items-center justify-center gap-3 active:scale-95 group relative overflow-hidden ${
                      isVibrating ? 'bg-red-500 text-white shadow-red-500/40' : 'bg-[#1d1d1f] dark:bg-[#f5f5f7] text-white dark:text-black shadow-black/30'
                    }`}
                 >
                    {isVibrating ? <Trash2 size={24} /> : <Power size={24} />}
                    <span>{isVibrating ? 'สั่งหยุดเครื่อง' : 'เริ่มการทำงาน'}</span>
                 </button>
              </section>
           </div>
           
           {/* TAB CONTENT PANEL */}
           <div className="w-full xl:w-[40%]">
              <AnimatePresence mode="wait">
                {isTransitioning ? (
                  <motion.div 
                    key="transition"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-40 pointer-events-none flex items-center justify-center"
                  >
                    <div className="relative w-64 h-64">
                       {/* Particle Transition Effect */}
                       {Array.from({ length: 48 }).map((_, i) => (
                          <motion.div 
                            key={i}
                            initial={{ 
                              x: 0, 
                              y: 0, 
                              scale: 1,
                              opacity: 1
                            }}
                            animate={{ 
                              x: (Math.random() - 0.5) * 1200, 
                              y: (Math.random() - 0.5) * 1200,
                              scale: 0,
                              opacity: 0,
                              rotate: Math.random() * 720
                            }}
                            transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
                            className="absolute left-1/2 top-1/2 w-1.5 h-1.5 bg-blue-400 rounded-full shadow-[0_0_10px_rgba(96,165,250,0.5)]"
                          />
                       ))}
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, scale: 0.98, y: 15 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.96, y: -15 }}
                    transition={{ type: "spring", damping: 28, stiffness: 250 }}
                    className="w-full"
                  >


               {activeTab === 'recorder' && (
                 <section className="glass apple-shadow rounded-[40px] p-6 sm:p-12 space-y-10">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-6 px-4">
                       <div className="flex items-center gap-6">
                         <div className="w-16 h-16 rounded-[24px] bg-blue-600 flex items-center justify-center text-white shadow-2xl">
                           <Save size={32} />
                         </div>
                         <div className="text-center sm:text-left">
                            <h3 className="text-3xl font-black tracking-tight">ระบบบันทึกจังหวะ</h3>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">วาดกราฟจังหวะการสั่นที่ต้องการ</p>
                         </div>
                       </div>
                       <div className="flex gap-3 w-full sm:w-auto">
                          <button onClick={togglePlayback} className={`flex-1 sm:flex-none flex items-center justify-center gap-3 px-8 py-5 rounded-[24px] font-black transition-all shadow-xl active:scale-95 ${playbackStartTime ? 'bg-red-500 text-white shadow-red-200' : 'bg-blue-600 text-white shadow-blue-200'}`}>
                             {playbackStartTime ? <Square size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}
                             {playbackStartTime ? 'หยุด' : 'ทดสอบจังหวะ'}
                          </button>
                          <button onClick={() => setCustomPattern(prev => prev.map(p => ({ ...p, intensity: 0 })))} className="p-5 rounded-[24px] glass border border-slate-100 text-slate-400 hover:text-red-500 transition-all dark:bg-zinc-800">
                             <Trash2 size={24} />
                          </button>
                       </div>
                    </div>
                    <div className="relative h-80 w-full bg-slate-900/[0.03] dark:bg-white/[0.03] rounded-[48px] flex items-end px-6 sm:px-12 py-8 gap-1.5 border border-white/80 dark:border-white/5 touch-none overflow-hidden group shadow-inner">
                       {customPattern.map((p, i) => (
                         <div key={i} className="flex-1 transition-all h-full relative" 
                            onMouseMove={(e) => { if (e.buttons === 1) { const rect = e.currentTarget.getBoundingClientRect(); handleCustomPatternChange(i, Math.min(1, Math.max(0, 1 - (e.clientY - rect.top) / rect.height))); }}}
                            onMouseDown={(e) => { const rect = e.currentTarget.getBoundingClientRect(); handleCustomPatternChange(i, Math.min(1, Math.max(0, 1 - (e.clientY - rect.top) / rect.height))); }}
                            onTouchMove={(e) => { e.preventDefault(); const touch = e.touches[0]; const containerRect = e.currentTarget.parentElement?.getBoundingClientRect(); if (containerRect) { const index = Math.floor(((touch.clientX - containerRect.left) / containerRect.width) * customPattern.length); if (index >= 0 && index < customPattern.length) handleCustomPatternChange(index, Math.min(1, Math.max(0, 1 - (touch.clientY - containerRect.top) / containerRect.height))); }}}
                         >
                            <div className={`w-full rounded-full transition-all duration-75 absolute bottom-0 ${playbackStartTime && (Date.now() - playbackStartTime) % 1000 >= p.time && (Date.now() - playbackStartTime) % 1000 < p.time + 50 ? 'bg-blue-600 scale-x-125 shadow-[0_0_15px_rgba(0,113,227,0.5)]' : 'bg-slate-300 dark:bg-zinc-700'}`} style={{ height: `${Math.max(2.5, p.intensity * 100)}%`, opacity: p.intensity > 0 ? 1 : 0.25 }} />
                         </div>
                       ))}
                    </div>
                 </section>
               )}

               {activeTab === 'presets' && (
                 <section className="glass apple-shadow rounded-[40px] p-6 sm:p-12 space-y-10">
                    <div className="flex items-center gap-6">
                       <div className="w-16 h-16 rounded-[24px] bg-orange-600 flex items-center justify-center text-white shadow-2xl">
                          <Zap size={32} />
                       </div>
                       <div>
                          <h3 className="text-3xl font-black tracking-tight">โหมดสั่นมาตรฐาน</h3>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">จังหวะที่เซ็ตไว้แล้วสำหรับคุณ</p>
                       </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-h-[600px] overflow-y-auto pr-1 custom-scrollbar">
                       {[
                         { id: 'tap', label: 'เคาะจังหวะ', icon: <Activity className="text-blue-500" /> },
                         { id: 'rapid', label: 'สั่นรัวต่อเนื่อง', icon: <Zap className="text-orange-500" /> },
                         { id: 'heartbeat', label: 'จังหวะหัวใจ', icon: <HeartPulse className="text-red-500" /> },
                         { id: 'engine', label: 'เครื่องยนต์แรง', icon: <Gauge className="text-slate-600" /> },
                         { id: 'lightning', label: 'สั่นแบบไฟฟ้า', icon: <Zap className="text-yellow-500" /> },
                         { id: 'soft-wave', label: 'คลื่นนุ่มนวล', icon: <Waves className="text-teal-500" /> },
                         { id: 'explosion', label: 'แรงกระแทก', icon: <Zap className="text-slate-900 dark:text-white" /> },
                         { id: 'massage', label: 'นวดคลายเส้น', icon: <Waves className="text-indigo-400" /> },
                       ].map(mode => (
                         <button key={mode.id} onClick={() => { setVibrationMode(mode.id as VibrationMode); if(!isVibrating) setIsVibrating(true); }} className={`p-8 rounded-[32px] flex flex-col items-center justify-center gap-4 text-[10px] font-black transition-all border-2 active:scale-95 ${vibrationMode === mode.id ? 'bg-[#1d1d1f] dark:bg-[#f5f5f7] border-[#1d1d1f] dark:border-[#f5f5f7] text-white dark:text-black shadow-2xl' : 'bg-white dark:bg-zinc-800 border-white dark:border-zinc-800 text-slate-700 dark:text-slate-200 hover:border-slate-100 dark:hover:border-zinc-700'}`}>
                            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-zinc-900">{mode.icon}</div>
                            {mode.label}
                         </button>
                       ))}
                    </div>
                 </section>
               )}

               {activeTab === 'massage' && (
                 <section className="glass apple-shadow rounded-[40px] p-6 sm:p-12 space-y-10">
                    <div className="flex items-center gap-6">
                       <div className="w-16 h-16 rounded-[24px] bg-indigo-600 flex items-center justify-center text-white shadow-2xl">
                          <Scissors size={32} />
                       </div>
                       <div>
                          <h3 className="text-3xl font-black tracking-tight">ระบบนวดตัว</h3>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">โหมดนวดเฉพาะจุดที่เหมาะสมสำหรับคุณ</p>
                       </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                       {[
                         { id: 'massage-back', label: 'นวดแผ่นหลัง', desc: 'เน้นความนุ่มนวลผ่อนคลายลึก', icon: <Waves className="text-blue-500" /> },
                         { id: 'massage-legs', label: 'นวดขาและต้นขา', desc: 'คลายความเมื่อยล้าจากการเดิน', icon: <Gauge className="text-green-500" /> },
                         { id: 'massage-arms', label: 'นวดแขนและไหล่', desc: 'สลับซ้ายขวาคลายความตึง', icon: <Cpu className="text-orange-500" /> },
                         { id: 'massage-private', label: 'จุดซ่อนเร้น', desc: 'จังหวะถี่และปรับเปลี่ยนรัวๆ', icon: <HeartPulse className="text-pink-500" /> },
                       ].map(mode => (
                         <button 
                            key={mode.id} 
                            onClick={() => { setVibrationMode(mode.id as VibrationMode); if(!isVibrating) setIsVibrating(true); }} 
                            className={`p-8 rounded-[40px] flex flex-col items-start gap-4 text-left transition-all border-2 active:scale-95 ${vibrationMode === mode.id ? 'bg-[#1d1d1f] dark:bg-[#f5f5f7] border-[#1d1d1f] dark:border-[#f5f5f7] text-white dark:text-black shadow-2xl scale-105' : 'bg-white dark:bg-zinc-800 border-white dark:border-zinc-800 text-slate-700 dark:text-slate-200 hover:border-slate-100 dark:hover:border-zinc-700'}`}
                         >
                            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-zinc-900">{mode.icon}</div>
                            <div className="space-y-1">
                               <h4 className="font-black text-lg">{mode.label}</h4>
                               <p className={`text-[10px] ${vibrationMode === mode.id ? 'opacity-60' : 'text-slate-400'}`}>{mode.desc}</p>
                            </div>
                         </button>
                       ))}
                    </div>
                 </section>
               )}

               {activeTab === 'logic' && (
                 <section className="glass apple-shadow rounded-[40px] p-6 sm:p-12 space-y-10">
                    <div className="flex items-center gap-6">
                       <div className="w-16 h-16 rounded-[24px] bg-zinc-900 dark:bg-white flex items-center justify-center text-white dark:text-black shadow-2xl">
                          <Cpu size={32} />
                       </div>
                       <div>
                          <h3 className="text-3xl font-black tracking-tight">การแมปปิ้งคำสั่ง</h3>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">ตั้งค่าคำสั่งการสั่นเมื่อกดปุ่มบนจอย</p>
                       </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                       {[0, 1, 2, 3, 4, 5, 12, 13, 14, 15].map(btnId => (
                          <div key={btnId} className="glass apple-shadow rounded-[32px] p-6 space-y-4">
                             <div className="flex justify-between items-center">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ปุ่มลำดับที่ {btnId}</span>
                                {mappings.some(m => m.buttonIndex === btnId) && (
                                   <button onClick={() => setMappings(prev => prev.filter(m => m.buttonIndex !== btnId))} className="text-red-500 hover:scale-110 transition-transform"><Trash2 size={16} /></button>
                                )}
                             </div>
                             <select 
                                value={mappings.find(m => m.buttonIndex === btnId)?.mode || ''}
                                onChange={(e) => addMapping(btnId, e.target.value as VibrationMode)}
                                className="w-full py-4 px-4 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-100 dark:border-white/5 text-[10px] font-bold uppercase tracking-widest"
                             >
                                <option value="">--- ไม่ได้ตั้งชื่อ ---</option>
                                <option value="tap">เคาะจังหวะ</option>
                                <option value="rapid">สั่นรัวต่อเนื่อง</option>
                                <option value="explosion">แรงกระแทก</option>
                                <option value="lightning">สั่นแบบไฟฟ้า</option>
                                <option value="soft-wave">คลื่นนุ่มนวล</option>
                             </select>
                          </div>
                       ))}
                    </div>
                 </section>
               )}
               {activeTab === 'porn-sync' && (
                 <PornSyncPanel 
                   setVibrationMode={setVibrationMode}
                   setIsVibrating={setIsVibrating}
                 />
               )}
            </motion.div>
          )}
        </AnimatePresence>
        </div>
       </div>
      </motion.main>

      <footer className="py-20 text-center space-y-6 border-t border-slate-200 mt-20 px-6">
         <div className="opacity-30 flex justify-center gap-6">
            <Gamepad size={20} />
            <Bluetooth size={20} />
            <Cpu size={20} />
         </div>
         <p className="text-[10px] font-bold text-[#86868b] uppercase tracking-[0.2em]">ออกแบบโดย Google AI Studio Experimental : ไทยจัดเต็ม</p>
      </footer>

      <style dangerouslySetInnerHTML={{ __html: `
        .glass {
          background: rgba(255, 255, 255, 0.7);
          backdrop-filter: blur(25px);
          -webkit-backdrop-filter: blur(25px);
          border: 1px solid rgba(255, 255, 255, 0.4);
        }
        .dark .glass {
          background: rgba(28, 28, 30, 0.7);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
        .apple-shadow {
          box-shadow: 0 20px 60px -10px rgba(0, 0, 0, 0.05);
        }
        .dark .apple-shadow {
          box-shadow: 0 20px 60px -10px rgba(0, 0, 0, 0.4);
        }
        .animate-spin-slow {
          animation: spin 4s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        input[type="range"].apple-slider {
          -webkit-appearance: none;
          width: 100%;
          height: 6px;
          background: #f1f5f9;
          border-radius: 10px;
          outline: none;
        }
        .dark input[type="range"].apple-slider {
          background: #2a2a2c;
        }
        input[type="range"].apple-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 22px;
          height: 22px;
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 50%;
          cursor: pointer;
          box-shadow: 0 4px 10px rgba(0,0,0,0.08);
          transition: all 0.2s ease;
        }
        .dark input[type="range"].apple-slider::-webkit-slider-thumb {
          background: #f5f5f7;
          border-color: #444;
        }
        input[type="range"].apple-slider::-webkit-slider-thumb:hover {
          scale: 1.1;
          border-color: #0071e3;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e2e8f0;
          border-radius: 10px;
        }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #3a3a3c;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #cbd5e1;
        }
        select {
          -webkit-appearance: none;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2386868b'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 1rem center;
          background-size: 1rem;
        }
      `}} />
    </div>
  );
}

