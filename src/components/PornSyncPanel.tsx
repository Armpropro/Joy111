import React, { useState, useRef, useEffect } from 'react';
import { Upload, Play, Pause, Settings, Mic, Video, Volume2, Maximize, MonitorUp, Wifi, MonitorPlay } from 'lucide-react';

export default function PornSyncPanel({
  setVibrationMode,
  setIsVibrating
}: {
  setVibrationMode: (mode: any) => void;
  setIsVibrating: (b: boolean) => void;
}) {
  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const [sensitivity, setSensitivity] = useState(1.5);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volumeThreshold, setVolumeThreshold] = useState(0.1);
  const [motorSplit, setMotorSplit] = useState<'both'|'split'>('split');
  const [sourceMode, setSourceMode] = useState<'file' | 'web'>('file');
  const [webStream, setWebStream] = useState<MediaStream | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyzerRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const raqRef = useRef<number>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      if (videoSrc) {
        URL.revokeObjectURL(videoSrc);
      }
      if (webStream) {
        stopWebCapture();
      }
      setSourceMode('file');
      const url = URL.createObjectURL(e.target.files[0]);
      setVideoSrc(url);
      setIsPlaying(false);
    }
  };

  const startWebCapture = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
        alert('เบราว์เซอร์ของคุณไม่รองรับการแชร์หน้าจอ (getDisplayMedia) กรุณาเปิดแอปในแท็บใหม่ หรือใช้เบราว์เซอร์ที่รองรับบนคอมพิวเตอร์');
        return;
      }

      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true
      });
      
      const audioTracks = stream.getAudioTracks();
      if (audioTracks.length === 0) {
        alert('สำคัญ: กรุณาติ๊กช่อง "Share audio (แชร์เสียง)" ในหน้าต่างเลือกหน้าจอ เพื่อให้ระบบวิเคราะห์เสียงได้');
        stream.getTracks().forEach(t => t.stop());
        return;
      }

      if (videoSrc) {
        URL.revokeObjectURL(videoSrc);
        setVideoSrc(null);
      }
      
      setWebStream(stream);
      setSourceMode('web');
      setIsPlaying(true);
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        // Mute video element to avoid audio feedback if captured locally, 
        // but we want them to hear it. Wait, if it captures another tab, we shouldn't mute here.
        videoRef.current.play();
      }

      stream.getVideoTracks()[0].onended = () => {
        stopWebCapture();
      };
    } catch (err) {
      console.error("Error capturing screen", err);
    }
  };

  const stopWebCapture = () => {
    if (webStream) {
      webStream.getTracks().forEach(t => t.stop());
    }
    setWebStream(null);
    setIsPlaying(false);
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const setupAudio = () => {
    if (!videoRef.current || audioContextRef.current) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = audioCtx;
      const analyzer = audioCtx.createAnalyser();
      analyzer.fftSize = 256;
      analyzer.smoothingTimeConstant = 0.5; // Smooth out the vibration jumps
      analyzerRef.current = analyzer;
      
      sourceRef.current = audioCtx.createMediaElementSource(videoRef.current);
      sourceRef.current.connect(analyzer);
      analyzer.connect(audioCtx.destination);
    } catch (err) {
      console.error("Audio Context setup failed", err);
    }
  };

  const analyzeAudio = () => {
    if (!analyzerRef.current) return;
    const bufferLength = analyzerRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyzerRef.current.getByteFrequencyData(dataArray);

    let lowSum = 0;
    let highSum = 0;
    let peakLow = 0;
    let peakHigh = 0;
    
    // Low frequencies (Thrusts, claps, bass) -> roughly bins 1 to 15
    for (let i = 1; i < 15; i++) {
       lowSum += dataArray[i];
       if (dataArray[i] > peakLow) peakLow = dataArray[i];
    }
    
    // High frequencies (Moans, voices) -> roughly bins 20 to 100
    for (let i = 20; i < 100; i++) {
       highSum += dataArray[i];
       if (dataArray[i] > peakHigh) peakHigh = dataArray[i];
    }
    
    let lowAvg = lowSum / 14;
    let highAvg = highSum / 80;
    
    let lowIntensity = (lowAvg / 255) * sensitivity;
    let highIntensity = (highAvg / 255) * sensitivity;
    
    // Noise gate threshold
    lowIntensity = lowIntensity < volumeThreshold ? 0 : (lowIntensity - volumeThreshold) / (1 - volumeThreshold);
    highIntensity = highIntensity < volumeThreshold ? 0 : (highIntensity - volumeThreshold) / (1 - volumeThreshold);

    // Peak responsiveness
    if (peakLow > 200 * (1/sensitivity)) lowIntensity = Math.max(lowIntensity, 1.0);
    if (peakHigh > 200 * (1/sensitivity)) highIntensity = Math.max(highIntensity, 1.0);

    lowIntensity = Math.min(1, Math.max(0, lowIntensity));
    highIntensity = Math.min(1, Math.max(0, highIntensity));
    
    // Store globally for the vibration loop
    if (motorSplit === 'split') {
      (window as any).__pornSyncIntensity = { left: highIntensity, right: lowIntensity };
    } else {
      const maxInt = Math.max(lowIntensity, highIntensity);
      (window as any).__pornSyncIntensity = maxInt;
    }

    raqRef.current = requestAnimationFrame(analyzeAudio);
  };

  useEffect(() => {
    setVibrationMode('porn-sync');
    setIsVibrating(true);
    return () => {
      if (raqRef.current) cancelAnimationFrame(raqRef.current);
      (window as any).__pornSyncIntensity = 0;
      if (audioContextRef.current) {
         audioContextRef.current.close().catch(console.error);
      }
      if (webStream) {
        webStream.getTracks().forEach(t => t.stop());
      }
    };
  }, [setVibrationMode, setIsVibrating]);

  useEffect(() => {
    if (isPlaying) {
      if (!audioContextRef.current) setupAudio();
      if (audioContextRef.current?.state === 'suspended') {
        audioContextRef.current.resume();
      }
      videoRef.current?.play();
      if (!raqRef.current) analyzeAudio();
    } else {
      videoRef.current?.pause();
      if (raqRef.current) {
        cancelAnimationFrame(raqRef.current);
        raqRef.current = null;
        (window as any).__pornSyncIntensity = 0;
      }
    }
  }, [isPlaying]);

  return (
    <section className="glass apple-shadow rounded-[40px] p-6 sm:p-12 space-y-10 border border-pink-500/20">
      <div className="flex items-center gap-6">
        <div className="w-16 h-16 rounded-[24px] bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center text-white shadow-2xl">
          <Video size={32} />
        </div>
        <div>
          <h3 className="text-3xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-purple-600">Video Sync</h3>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">ซิงค์จังหวะสั่นตามเสียงวิดีโอแบบเรียลไทม์</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Video Player */}
        <div className="space-y-4">
          <div className="flex bg-black/20 p-1 rounded-2xl w-max apple-shadow backdrop-blur-md border border-white/5 mx-auto">
             <button 
               onClick={() => setSourceMode('file')}
               className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all flex items-center gap-2 ${sourceMode === 'file' ? 'bg-white text-black shadow-sm' : 'text-slate-400 hover:text-white'}`}
             >
               <Upload size={14} /> โหลดไฟล์วิดีโอ
             </button>
             <button 
               onClick={() => setSourceMode('web')}
               className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all flex items-center gap-2 ${sourceMode === 'web' ? 'bg-pink-500 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
             >
               <MonitorUp size={14} /> จับภาพเว็บ / สตรีมสด
             </button>
          </div>

          <div className="relative aspect-video bg-black/90 rounded-[32px] overflow-hidden flex items-center justify-center border border-white/10 shadow-inner group">
            {(videoSrc || webStream) ? (
              <video 
                ref={videoRef}
                src={videoSrc || undefined}
                className="w-full h-full object-contain"
                onEnded={() => setIsPlaying(false)}
                controls={false}
              />
            ) : (
              <div className="flex flex-col items-center gap-4 text-slate-500 text-center p-6">
                {sourceMode === 'file' ? (
                  <>
                    <Upload size={48} className="opacity-50 mx-auto" />
                    <p className="font-bold text-sm uppercase tracking-widest">เลือกไฟล์วิดีโอ (MP4)</p>
                  </>
                ) : (
                  <>
                    <MonitorPlay size={48} className="opacity-50 mx-auto text-pink-500" />
                    <p className="font-bold text-sm uppercase tracking-widest text-pink-400">จับหน้าจอจากแท็บอื่น (Pornhub, OnlyFans, ฯลฯ)</p>
                    <p className="text-xs text-slate-500 max-w-[250px] mt-2">ตอนแชร์หน้าจอ อย่าลืมติ๊กเลือก "Share tab audio" เพื่อให้แอปวิเคราะห์เสียงได้</p>
                  </>
                )}
              </div>
            )}
            
            {/* Absolute invisible file input over the whole area if no video and file mode */}
            {(!videoSrc && sourceMode === 'file' && !webStream) && (
              <input 
                type="file" 
                accept="video/*" 
                onChange={handleFileChange}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
            )}
            
            {(videoSrc || webStream) && (
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4 backdrop-blur-sm">
                <button 
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="w-16 h-16 rounded-full bg-pink-500 text-white flex items-center justify-center shadow-2xl hover:scale-110 active:scale-95 transition-all"
                >
                  {isPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" className="ml-1" />}
                </button>
              </div>
            )}
          </div>
          
          <div className="flex gap-4">
            {sourceMode === 'file' ? (
              <label className="flex-1 p-4 rounded-2xl glass border border-white/5 flex items-center justify-center gap-2 cursor-pointer hover:bg-white/5 transition-all text-sm font-bold text-slate-400 dark:text-slate-300">
                <Upload size={18} />
                เปลี่ยนไฟล์วิดีโอ
                <input 
                  type="file" 
                  accept="video/*" 
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            ) : (
              <button 
                onClick={webStream ? stopWebCapture : startWebCapture}
                className={`flex-1 p-4 rounded-2xl border ${webStream ? 'bg-red-500/10 border-red-500/50 text-red-500 hover:bg-red-500/20' : 'bg-pink-500/10 border-pink-500/50 text-pink-500 hover:bg-pink-500/20'} flex items-center justify-center gap-2 transition-all text-sm font-bold`}
              >
                {webStream ? <Pause size={18} /> : <MonitorUp size={18} />}
                {webStream ? 'หยุดแชร์หน้าจอ' : 'เริ่มหน้าต่าง Live Sync'}
              </button>
            )}

            {(videoSrc || webStream) && (
              <button 
                onClick={() => {
                  if(videoRef.current) {
                    if (videoRef.current.requestFullscreen) {
                      videoRef.current.requestFullscreen();
                    }
                  }
                }}
                className="p-4 rounded-2xl glass border border-white/5 flex items-center justify-center hover:bg-white/5 transition-all text-slate-400 dark:text-slate-300"
              >
                <Maximize size={18} />
              </button>
            )}
          </div>
        </div>

        {/* Controls */}
        <div className="space-y-8 glass p-8 rounded-[32px] border border-white/5 bg-gradient-to-b from-transparent to-pink-500/5">
          <div className="space-y-6">
            <h4 className="font-black text-sm uppercase tracking-widest flex items-center gap-2 text-pink-500">
              <Settings size={18} /> Audio Settings
            </h4>
            
            <div className="space-y-4">
              <div className="flex justify-between items-end">
                <span className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-tighter">ความไวต่อเสียง (Sensitivity)</span>
                <span className="text-pink-500 font-mono text-xl font-black">{Math.round(sensitivity * 100)}%</span>
              </div>
              <input 
                type="range" 
                min="0.1" max="3" step="0.1" 
                value={sensitivity} 
                onChange={(e) => setSensitivity(parseFloat(e.target.value))} 
                className="apple-slider w-full !accent-pink-500" 
              />
              <p className="text-xs text-slate-500 dark:text-slate-400">เพิ่มให้สั่นแรงขึ้นจากเสียงที่เบา</p>
            </div>

            <div className="space-y-4 pt-4 border-t border-white/10 dark:border-white/5">
              <div className="flex justify-between items-end">
                <span className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-tighter">ตัดเสียงรบกวน (Noise Gate)</span>
                <span className="text-purple-500 font-mono text-xl font-black">{Math.round(volumeThreshold * 100)}%</span>
              </div>
              <input 
                type="range" 
                min="0" max="0.5" step="0.05" 
                value={volumeThreshold} 
                onChange={(e) => setVolumeThreshold(parseFloat(e.target.value))} 
                className="apple-slider w-full !accent-purple-500" 
              />
              <p className="text-xs text-slate-500 dark:text-slate-400">ตัดเสียงบรรยากาศเบาๆ ออกไป ให้เหลือแต่เสียงกระแทก/คราง</p>
            </div>

            <div className="space-y-4 pt-4 border-t border-white/10 dark:border-white/5">
               <span className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-tighter">การแยกมอเตอร์ (Motor Split)</span>
               <div className="grid grid-cols-2 gap-2">
                 <button 
                   onClick={() => setMotorSplit('both')}
                   className={`p-3 rounded-2xl text-[10px] font-bold uppercase tracking-widest transition-all ${motorSplit === 'both' ? 'bg-pink-500 text-white apple-shadow' : 'bg-white/5 text-slate-500 hover:bg-white/10'}`}
                 >
                   สั่นเท่ากันทั้งคู่
                 </button>
                 <button 
                   onClick={() => setMotorSplit('split')}
                   className={`p-3 rounded-2xl text-[10px] font-bold uppercase tracking-widest transition-all ${motorSplit === 'split' ? 'bg-purple-500 text-white apple-shadow' : 'bg-white/5 text-slate-500 hover:bg-white/10'}`}
                 >
                   ซ้าย: คราง / ขวา: กระแทก
                 </button>
               </div>
               <p className="text-xs text-slate-500 dark:text-slate-400">แยกมอเตอร์ซ้ายตอบสนองเสียงแหลม (คราง) มอเตอร์ขวาตอบสนองเสียงเบส (กระแทกเนื้อ)</p>
            </div>
          </div>
          
          <div className="pt-4 space-y-4">
             <div className="p-4 rounded-2xl bg-pink-500/10 border border-pink-500/20 flex gap-4">
               <Volume2 className="text-pink-500 shrink-0" />
               <div className="space-y-1">
                 <p className="text-sm font-bold text-pink-600 dark:text-pink-400">ระบบทำงานอัตโนมัติ</p>
                 <p className="text-xs text-pink-600/70 dark:text-pink-400/70">กดเล่นวิดีโอแล้วจอยจะสั่นอัตโนมัติตามจังหวะเสียงครางและเสียงกระแทก แนะนำให้ปรับความไวและตัดเสียงรบกวนตามคลิป</p>
               </div>
             </div>
          </div>
        </div>
      </div>
    </section>
  );
}
