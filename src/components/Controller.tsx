import React from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface GamepadState {
  buttons: readonly GamepadButton[];
  axes: readonly number[];
}

interface ControllerProps {
  id: string;
  state: GamepadState;
  vibratingLeft: boolean;
  vibratingRight: boolean;
  orientation?: { pitch: number; roll: number; yaw: number };
}

const Controller: React.FC<ControllerProps> = ({ state, vibratingLeft, vibratingRight, orientation }) => {
  const isPressed = (index: number) => state.buttons[index]?.pressed;
  const getButtonValue = (index: number) => state.buttons[index]?.value || 0;
  const getAxisValue = (index: number) => state.axes[index] || 0;

  // Use orientation for 3D tilt if available
  const rotationX = orientation ? orientation.pitch : 0;
  const rotationY = orientation ? orientation.roll : 0;
  const rotationZ = orientation ? orientation.yaw : 0;

  const ButtonBar = ({ value, color = "#0071e3" }: { value: number, color?: string }) => (
    <div className="h-1 bg-gray-200 dark:bg-gray-800 rounded-full w-8 overflow-hidden">
      <motion.div 
        className="h-full" 
        style={{ backgroundColor: color }}
        animate={{ width: `${value * 100}%` }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      />
    </div>
  );

  return (
    <div className="relative w-full max-w-2xl mx-auto py-12">
      {/* 3D Transform Container */}
      <motion.div 
        className="relative z-10"
        style={{ perspective: 1200 }}
        animate={{ 
          rotateX: rotationX * 0.5, 
          rotateY: rotationY * 0.5,
          rotateZ: rotationZ * 0.1
        }}
        transition={{ type: "spring", stiffness: 120, damping: 25 }}
      >
        <div className="relative aspect-[16/10] w-full max-w-[600px] mx-auto">
          {/* Vibration Animation Indicators (GIF-like) */}
          <AnimatePresence>
            {(vibratingLeft || vibratingRight) && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 flex items-center justify-center -z-10 pointer-events-none"
              >
                 {Array.from({ length: 8 }).map((_, i) => (
                   <motion.div
                     key={i}
                     animate={{
                       scale: [1, 2, 1],
                       opacity: [0, 0.4, 0],
                       borderWidth: [1, 4, 1]
                     }}
                     transition={{
                       duration: 2,
                       repeat: Infinity,
                       delay: i * 0.25,
                       ease: "easeInOut"
                     }}
                     className="absolute w-full h-full rounded-full border border-blue-400/30 blur-sm"
                   />
                 ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Enhanced Vibration Beams */}
          <AnimatePresence>
            {vibratingLeft && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ 
                  opacity: [0, 0.6, 0.2, 0.6, 0], 
                  scale: [1, 1.2, 1, 1.3, 1],
                  x: [-5, 5, -5, 5, 0]
                }}
                transition={{ duration: 0.2, repeat: Infinity }}
                className="absolute left-[-15%] top-[10%] w-[250px] h-[300px] bg-blue-500/10 rounded-full blur-[80px] pointer-events-none"
              />
            )}
          </AnimatePresence>
          <AnimatePresence>
            {vibratingRight && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ 
                  opacity: [0, 0.6, 0.2, 0.6, 0], 
                  scale: [1, 1.2, 1, 1.3, 1],
                  x: [5, -5, 5, -5, 0]
                }}
                transition={{ duration: 0.2, repeat: Infinity }}
                className="absolute right-[-15%] top-[10%] w-[250px] h-[300px] bg-indigo-500/10 rounded-full blur-[80px] pointer-events-none"
              />
            )}
          </AnimatePresence>

          <motion.svg
            viewBox="0 0 600 400"
            className="w-full h-full drop-shadow-[0_35px_60px_-15px_rgba(0,0,0,0.3)]"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            animate={(vibratingLeft || vibratingRight) ? {
              x: [-1, 1, -1.5, 1.5, 0],
              y: [1, -1, 1.5, -1.5, 0]
            } : {}}
            transition={{ duration: 0.05, repeat: Infinity }}
          >
            <defs>
              <filter id="inner-shadow">
                <feOffset dx="0" dy="2" />
                <feGaussianBlur stdDeviation="3" result="offset-blur" />
                <feComposite operator="out" in="SourceGraphic" in2="offset-blur" result="inverse" />
                <feFlood floodColor="black" floodOpacity="0.2" result="color" />
                <feComposite operator="in" in="color" in2="inverse" result="shadow" />
                <feComposite operator="over" in="shadow" in2="SourceGraphic" />
              </filter>
              <linearGradient id="bodyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" className="stop-color-[#FFFFFF] dark:stop-color-[#2c2c2e]" />
                <stop offset="50%" className="stop-color-[#F9FAFB] dark:stop-color-[#1c1c1e]" />
                <stop offset="100%" className="stop-color-[#E5E7EB] dark:stop-color-[#000000]" />
              </linearGradient>
            </defs>

            {/* Controller Body Shell - DualShock 4 Style */}
            <path
              d="M140 80 C80 80 40 100 40 180 C40 260 40 320 120 360 C180 390 220 340 300 340 C380 340 420 390 480 360 C560 320 560 260 560 180 C560 100 520 80 460 80 Z"
              fill="url(#bodyGrad)"
              className="fill-white dark:fill-zinc-900"
              stroke="#8e8e93"
              strokeWidth="1.5"
            />

            {/* Touchpad Area */}
            <rect x="180" y="90" width="240" height="120" rx="15" className="fill-zinc-100 dark:fill-zinc-800" stroke="#8e8e93" strokeWidth="1" />
            
            {/* D-Pad Section */}
            <g transform="translate(130, 200)">
               <circle cx="0" cy="0" r="45" className="fill-zinc-50 dark:fill-zinc-800 shadow-inner" filter="url(#inner-shadow)" />
               <path d="M-30 0 H30 M0 -30 V30" className="stroke-zinc-200 dark:stroke-zinc-700" strokeWidth="12" strokeLinecap="round" />
               {isPressed(12) && <path d="M0 -30 V0" stroke="#0071e3" strokeWidth="12" strokeLinecap="round" />}
               {isPressed(13) && <path d="M0 0 V30" stroke="#0071e3" strokeWidth="12" strokeLinecap="round" />}
               {isPressed(14) && <path d="M-30 0 H0" stroke="#0071e3" strokeWidth="12" strokeLinecap="round" />}
               {isPressed(15) && <path d="M0 0 H30" stroke="#0071e3" strokeWidth="12" strokeLinecap="round" />}
            </g>

            {/* Face Buttons Section */}
            <g transform="translate(470, 200)">
               <circle cx="0" cy="0" r="45" className="fill-zinc-50 dark:fill-zinc-800 shadow-inner" filter="url(#inner-shadow)" />
               
               <AnimatePresence>
                  {[0, 1, 2, 3].map(i => isPressed(i) && (
                    <motion.circle
                       key={`shock-${i}`}
                       initial={{ opacity: 0.5, scale: 1 }}
                       animate={{ opacity: 0, scale: 3 }}
                       exit={{ opacity: 0 }}
                       cx={i === 0 ? 0 : i === 1 ? 25 : i === 2 ? -25 : 0}
                       cy={i === 0 ? 25 : i === 1 ? 0 : i === 2 ? 0 : -25}
                       r="12"
                       className="fill-blue-500/30"
                    />
                  ))}
               </AnimatePresence>

               <motion.circle animate={isPressed(0) ? { scale: 1.2 } : { scale: 1 }} cx="0" cy="25" r="12" className={isPressed(0) ? "fill-blue-600" : "fill-zinc-100 dark:fill-zinc-700"} stroke="#8e8e93" />
               <motion.circle animate={isPressed(1) ? { scale: 1.2 } : { scale: 1 }} cx="25" cy="0" r="12" className={isPressed(1) ? "fill-red-600" : "fill-zinc-100 dark:fill-zinc-700"} stroke="#8e8e93" />
               <motion.circle animate={isPressed(2) ? { scale: 1.2 } : { scale: 1 }} cx="-25" cy="0" r="12" className={isPressed(2) ? "fill-pink-600" : "fill-zinc-100 dark:fill-zinc-700"} stroke="#8e8e93" />
               <motion.circle animate={isPressed(3) ? { scale: 1.2 } : { scale: 1 }} cx="0" cy="-25" r="12" className={isPressed(3) ? "fill-green-600" : "fill-zinc-100 dark:fill-zinc-700"} stroke="#8e8e93" />
            </g>

            {/* Left Analog Stick */}
            <g transform="translate(220, 280)">
               <circle cx="0" cy="0" r="35" className="fill-zinc-100 dark:fill-zinc-800" stroke="#8e8e93" strokeWidth="1" />
               <motion.circle
                 cx={getAxisValue(0) * 15}
                 cy={getAxisValue(1) * 15}
                 r="28"
                 className={isPressed(10) ? "fill-blue-500" : "fill-zinc-300 dark:fill-zinc-600 shadow-xl"}
                 stroke="#8e8e93"
                 strokeWidth="1.5"
                 animate={isPressed(10) ? { scale: 0.9 } : { scale: 1 }}
               />
            </g>

            {/* Right Analog Stick */}
            <g transform="translate(380, 280)">
               <circle cx="0" cy="0" r="35" className="fill-zinc-100 dark:fill-zinc-800" stroke="#8e8e93" strokeWidth="1" />
               <motion.circle
                 cx={getAxisValue(2) * 15}
                 cy={getAxisValue(3) * 15}
                 r="28"
                 className={isPressed(11) ? "fill-indigo-500" : "fill-zinc-300 dark:fill-zinc-600 shadow-xl"}
                 stroke="#8e8e93"
                 strokeWidth="1.5"
                 animate={isPressed(11) ? { scale: 0.9 } : { scale: 1 }}
               />
            </g>

            {/* Shoulder Buttons */}
            <motion.path 
              animate={isPressed(4) ? { y: 2, fill: "#0071e3" } : { y: 0 }} 
              d="M60 50 Q100 40 160 50 L160 70 L60 70 Z" 
              className="fill-white dark:fill-zinc-800"
              stroke="#D1D5DB" 
            />
            <motion.path 
              animate={isPressed(5) ? { y: 2, fill: "#0071e3" } : { y: 0 }} 
              d="M440 50 Q500 40 540 50 L540 70 L440 70 Z" 
              className="fill-white dark:fill-zinc-800"
              stroke="#D1D5DB" 
            />

            {/* Home Button */}
            <circle cx="300" cy="270" r="18" className="fill-white dark:fill-zinc-700" stroke="#8e8e93" strokeWidth="2" />
            {isPressed(16) && <circle cx="300" cy="270" r="10" className="fill-blue-500" />}
          </motion.svg>
        </div>
      </motion.div>

      {/* Controller Data Status Board */}
      <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4 px-4 relative z-20">
         {/* Left Analog */}
         <div className="glass p-4 rounded-3xl apple-shadow flex flex-col gap-2">
            <span className="text-blue-500 font-bold text-[10px] uppercase tracking-widest border-b border-white/10 dark:border-white/5 pb-2">อนาล็อกซ้าย</span>
            <div className="flex justify-between text-xs font-mono dark:text-gray-300">
               <span>แกน X</span>
               <span>{getAxisValue(0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-xs font-mono dark:text-gray-300">
               <span>แกน Y</span>
               <span>{getAxisValue(1).toFixed(2)}</span>
            </div>
         </div>
         
         {/* Right Analog */}
         <div className="glass p-4 rounded-3xl apple-shadow flex flex-col gap-2">
            <span className="text-indigo-500 font-bold text-[10px] uppercase tracking-widest border-b border-white/10 dark:border-white/5 pb-2">อนาล็อกขวา</span>
            <div className="flex justify-between text-xs font-mono dark:text-gray-300">
               <span>แกน X</span>
               <span>{getAxisValue(2).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-xs font-mono dark:text-gray-300">
               <span>แกน Y</span>
               <span>{getAxisValue(3).toFixed(2)}</span>
            </div>
         </div>

         {/* Left Triggers */}
         <div className="glass p-4 rounded-3xl apple-shadow flex flex-col gap-2 text-[10px] font-bold text-gray-500 dark:text-gray-400">
            <span className="text-blue-500 uppercase tracking-widest border-b border-white/10 dark:border-white/5 pb-2">ปุ่มบนซ้าย</span>
            <div className="space-y-1">
               <div className="flex justify-between items-center gap-4">
               <span>L1</span>
               <span className="text-[#0071e3] font-mono">{Math.round(getButtonValue(4) * 100)}%</span>
               </div>
               <ButtonBar value={getButtonValue(4)} />
            </div>
            <div className="space-y-1">
               <div className="flex justify-between items-center gap-4">
               <span>L2</span>
               <span className="text-[#0071e3] font-mono">{Math.round(getButtonValue(6) * 100)}%</span>
               </div>
               <ButtonBar value={getButtonValue(6)} />
            </div>
         </div>

         {/* Right Triggers */}
         <div className="glass p-4 rounded-3xl apple-shadow flex flex-col gap-2 text-[10px] font-bold text-gray-500 dark:text-gray-400">
            <span className="text-indigo-500 uppercase tracking-widest border-b border-white/10 dark:border-white/5 pb-2">ปุ่มบนขวา</span>
            <div className="space-y-1">
               <div className="flex justify-between items-center gap-4">
               <span>R1</span>
               <span className="text-[#0071e3] font-mono">{Math.round(getButtonValue(5) * 100)}%</span>
               </div>
               <ButtonBar value={getButtonValue(5)} />
            </div>
            <div className="space-y-1">
               <div className="flex justify-between items-center gap-4">
               <span>R2</span>
               <span className="text-[#0071e3] font-mono">{Math.round(getButtonValue(7) * 100)}%</span>
               </div>
               <ButtonBar value={getButtonValue(7)} />
            </div>
         </div>
      </div>
    </div>
  );
};

export default Controller;
