import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { GameState, Character, Obstacle, GameSettings } from '../types';
import { Trophy, Play, RefreshCw, Smartphone, Monitor, Loader2 } from 'lucide-react';

const GRAVITY = 0.6;
const JUMP_FORCE = -13;
const CHARACTER_SIZE = 65; 
const BUS_HEIGHT = 60;
const INITIAL_SPEED = 5;

// Stylized Character for React UI
const UICharacter = ({ image, size, isMafia, label, dressImage }: any) => (
  <div className="relative flex flex-col items-center group">
    {/* Head */}
    <div 
      className={`relative z-10 rounded-full overflow-hidden border-2 mb-[-6px] shadow-2xl transition-transform group-hover:scale-110 ${isMafia ? 'border-red-500 ring-2 ring-red-500/20' : 'border-blue-400 ring-2 ring-blue-400/20'}`} 
      style={{ width: size * 0.55, height: size * 0.55 }}
    >
      <img src={image} className="w-full h-full object-cover" referrerPolicy="no-referrer" alt="Head" />
    </div>
    {/* Torso (Suit / Dress) */}
    <div 
      className={`w-[35%] h-[40%] relative rounded-t-sm shadow-lg overflow-hidden ${isMafia ? 'bg-slate-950' : 'bg-blue-700'}`}
      style={{ width: size * 0.35, height: size * 0.45 }}
    >
      {dressImage ? (
        <img src={dressImage} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
      ) : (
        <>
          {/* Shirt & Tie Detail */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-t-[10px] border-t-white" />
          <div className={`absolute top-2 left-1/2 -translate-x-1/2 w-[2px] h-[40%] ${isMafia ? 'bg-red-600' : 'bg-yellow-400'}`} />
        </>
      )}
      
      {/* Simple Arms */}
      <div className={`absolute -left-[40%] top-[10%] w-[40%] h-[60%] rounded-full origin-top rotate-[20deg] ${isMafia ? 'bg-slate-950' : 'bg-blue-700'}`} />
      <div className={`absolute -right-[40%] top-[10%] w-[40%] h-[60%] rounded-full origin-top -rotate-[20deg] ${isMafia ? 'bg-slate-950' : 'bg-blue-700'}`} />
    </div>
    {/* Legs */}
    <div className="flex justify-between w-[32%] h-4 mt-[-2px]" style={{ width: size * 0.32 }}>
       <div className={`w-[42%] h-full rounded-b-sm ${isMafia ? 'bg-black' : 'bg-blue-900'}`} />
       <div className={`w-[42%] h-full rounded-b-sm ${isMafia ? 'bg-black' : 'bg-blue-900'}`} />
    </div>
    {label && <span className="text-[8px] font-black uppercase mt-2 text-white/40 tracking-widest">{label}</span>}
  </div>
);

// Default Settings to ensure game ALWAYS loads
const DEFAULT_SETTINGS: GameSettings = {
  gameName: "Mafia Runner",
  characters: [
    { id: 0, image: 'https://picsum.photos/seed/p1/200/300', name: 'Agent Blue' },
    { id: 1, image: 'https://picsum.photos/seed/p2/200/300', name: 'Striker' },
    { id: 2, image: 'https://picsum.photos/seed/p3/200/300', name: 'Hoodie' },
    { id: 3, image: 'https://picsum.photos/seed/p4/200/300', name: 'Laugher' },
    { id: 4, image: 'https://picsum.photos/seed/p5/200/300', name: 'Gamer' },
  ],
  mafia: {
    id: 5,
    image: 'https://picsum.photos/seed/m1/200/300',
    name: 'Target Heroine',
  },
  mafiaDialogue: "চালু আসো বেবি আবাসিক এ যাব",
  difficulty: {
    initialSpeed: 5,
    gravity: 0.6,
    jumpForce: -13,
    gapMin: 100,
    gapMax: 200,
  },
  chaos: {
    frequency: 60,
    duration: 3,
    enabled: true,
  }
};

export default function Game() {
  const [gameState, setGameState] = useState<GameState>('platform_selection');
  const [selectedCharIndex, setSelectedCharIndex] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [settings, setSettings] = useState<GameSettings>(DEFAULT_SETTINGS);
  const [platform, setPlatform] = useState<'pc' | 'mobile'>('pc');

  const dimensions = {
    width: platform === 'pc' ? 800 : 400,
    height: platform === 'pc' ? 400 : 600
  };

  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const playerY = useRef(dimensions.height - BUS_HEIGHT - CHARACTER_SIZE);
  const playerVY = useRef(0);
  const isJumping = useRef(false);
  const obstacles = useRef<Obstacle[]>([]);
  const speed = useRef(INITIAL_SPEED);
  const frameId = useRef<number>(0);
  const scrollBackground = useRef(0);
  const [totalCoins, setTotalCoins] = useState(() => {
    const saved = localStorage.getItem('total_coins');
    return saved ? parseInt(saved) : 0;
  });
  const [unlockedIds, setUnlockedIds] = useState<number[]>(() => {
    const saved = localStorage.getItem('unlocked_characters');
    return saved ? JSON.parse(saved) : [0, 1, 2, 3, 4]; // All unlocked by default now
  });
  const [unlockedDressIds, setUnlockedDressIds] = useState<number[]>(() => {
    const saved = localStorage.getItem('unlocked_dresses');
    return saved ? JSON.parse(saved) : [];
  });
  const [selectedDressId, setSelectedDressId] = useState<number | null>(() => {
    const saved = localStorage.getItem('selected_dress_id');
    return saved ? parseInt(saved) : null;
  });
  const [gameCoins, setGameCoins] = useState(0);
  const jumpCount = useRef(0);
  const [currentTheme, setCurrentTheme] = useState<'dhaka' | 'jungle' | 'jail'>('dhaka');

  useEffect(() => {
    // Current theme logic: change every 20 points (200m)
    const themes: ('dhaka' | 'jungle' | 'jail')[] = ['dhaka', 'jungle', 'jail'];
    const themeIndex = Math.floor(score / 20) % themes.length;
    setCurrentTheme(themes[themeIndex]);
  }, [score]);

  useEffect(() => {
    localStorage.setItem('total_coins', totalCoins.toString());
  }, [totalCoins]);

  useEffect(() => {
    localStorage.setItem('unlocked_characters', JSON.stringify(unlockedIds));
  }, [unlockedIds]);

  useEffect(() => {
    localStorage.setItem('unlocked_dresses', JSON.stringify(unlockedDressIds));
  }, [unlockedDressIds]);

  useEffect(() => {
    localStorage.setItem('selected_dress_id', selectedDressId?.toString() || '');
  }, [selectedDressId]);

  // Chaos Features
  const [distraction, setDistraction] = useState(false);
  
  const chaosMode = useRef(true);
  const isInvisible = useRef(false);
  const scrollDir = useRef(1); // 1 = backward, -1 = forward
  const isSlippery = useRef(false);
  const isInverted = useRef(false);
  const lastChaosTime = useRef(0);
  const gameStartTime = useRef(Date.now());
  const [chaosAutoActive, setChaosAutoActive] = useState(false);
  const lastInvisTime = useRef(0);
  const playerSlide = useRef(0);
  const chaosSecretTaps = useRef(0);

  useEffect(() => {
    fetch('/api/settings')
      .then(res => res.json())
      .then(data => {
          if (data && data.gameName) {
            setSettings(prev => ({
              ...prev,
              ...data,
              difficulty: { ...prev.difficulty, ...(data.difficulty || {}) },
              chaos: { ...prev.chaos, ...(data.chaos || {}) }
            }));
          }
      })
      .catch(() => console.log("Using default settings"));
  }, []);

  const startGame = (index: number) => {
    setSelectedCharIndex(index);
    setGameState('playing');
    setScore(0);
    setGameCoins(0);
    jumpCount.current = 0;
    playerY.current = dimensions.height - BUS_HEIGHT - CHARACTER_SIZE;
    playerVY.current = 0;
    isJumping.current = false;
    speed.current = INITIAL_SPEED;
    obstacles.current = generateInitialObstacles();
    gameStartTime.current = Date.now();
    lastChaosTime.current = Date.now();
    setChaosAutoActive(false);
  };

  const generateInitialObstacles = (): Obstacle[] => {
    const initial: Obstacle[] = [];
    let currentX = 0;
    for (let i = 0; i < 10; i++) {
      const busWidth = 200 + Math.random() * 200;
      initial.push({
        id: i,
        x: currentX,
        width: busWidth,
        type: 'bus'
      });
      currentX += busWidth + 100 + Math.random() * 100;
    }
    return initial;
  };

  const jump = useCallback(() => {
    if (gameState !== 'playing') return;
    
    const floorY = dimensions.height - BUS_HEIGHT - CHARACTER_SIZE;
    const isNearFloor = playerY.current >= floorY - 15;
    
    // Check for double jump (max 2 jumps)
    if (!isJumping.current || isNearFloor || jumpCount.current < 2) {
      const jumpForce = settings.difficulty?.jumpForce ?? -13;
      playerVY.current = isInverted.current ? -jumpForce : jumpForce;
      isJumping.current = true;
      jumpCount.current++;
      
      // Play Jump Sound
      if (settings.audio?.jumpSoundUrl) {
          const jumpAudio = new Audio(settings.audio.jumpSoundUrl);
          jumpAudio.play().catch(() => {});
      } else {
        try {
            const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.type = 'sine';
            osc.frequency.setValueAtTime(440, audioCtx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.1);
            gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
            osc.start();
            osc.stop(audioCtx.currentTime + 0.1);
        } catch (e) {}
      }
    }
  }, [gameState, dimensions.height, settings.difficulty, settings.audio]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'ArrowUp') {
        jump();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [jump]);

  const images = useRef<{ [key: string]: HTMLImageElement }>({});

  useEffect(() => {
    if (!settings) return;
    const urls = [
        ...settings.characters.map(c => c.image), 
        settings.mafia.image,
        ...(settings.dresses || []).map(d => d.image)
    ];
    urls.forEach(url => {
      const img = new Image();
      img.src = url;
      images.current[url] = img;
    });
  }, [settings]);

  useEffect(() => {
    if (gameState !== 'playing' || !settings) return;

    let localFrameId: number;
    const MAFIA_X = dimensions.width - 120;
    const PLAYER_X = 100;

    const drawStylizedCharacter = (
      ctx: CanvasRenderingContext2D,
      img: HTMLImageElement | undefined,
      x: number,
      y: number,
      size: number,
      rotation: number = 0,
      isMafia: boolean = false,
      dressImg: HTMLImageElement | undefined = undefined
    ) => {
      ctx.save();
      ctx.translate(x + size / 2, y + size / 2);
      ctx.rotate(rotation);

      // Body Parts Size Constants
      const headRadius = size * 0.25;
      const torsoW = size * 0.35;
      const torsoH = size * 0.4;
      const legW = size * 0.1;
      const legH = size * 0.2;

      // 1. Draw Legs
      ctx.fillStyle = isMafia ? '#020617' : '#1e3a8a';
      const walk = Math.sin(Date.now() / 80) * 5;
      ctx.fillRect(-torsoW/2 + 2, torsoH - 5 + (isMafia ? walk : 0), legW, legH);
      ctx.fillRect(torsoW/2 - legW - 2, torsoH - 5 + (isMafia ? -walk : 0), legW, legH);

      // 2. Draw Torso
      ctx.save();
      ctx.beginPath();
      ctx.rect(-torsoW/2, 0, torsoW, torsoH);
      ctx.clip();
      
      if (dressImg) {
          ctx.drawImage(dressImg, -torsoW/2, 0, torsoW, torsoH);
      } else {
          ctx.fillStyle = isMafia ? '#0f172a' : '#2563eb';
          ctx.fillRect(-torsoW/2, 0, torsoW, torsoH);
          
          // Shirt/Tie Detail
          ctx.fillStyle = '#f8fafc';
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(-torsoW/4, 0);
          ctx.lineTo(0, torsoH/2.5);
          ctx.lineTo(torsoW/4, 0);
          ctx.fill();
          
          ctx.fillStyle = isMafia ? '#ef4444' : '#fbbf24';
          ctx.fillRect(-1.5, 2, 3, torsoH/3);
      }
      ctx.restore();

      // 3. Draw Arms
      ctx.strokeStyle = isMafia ? '#0f172a' : '#2563eb';
      ctx.lineWidth = size * 0.08;
      ctx.lineCap = 'round';
      ctx.beginPath();
      // Arm 1
      ctx.moveTo(-torsoW/2, 5);
      ctx.lineTo(-torsoW/2 - 10, 20 + walk);
      // Arm 2
      ctx.moveTo(torsoW/2, 5);
      ctx.lineTo(torsoW/2 + 10, 20 - walk);
      ctx.stroke();

      // 4. Draw Head
      if (img) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(0, -headRadius, headRadius, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(img, -headRadius, -headRadius*2, headRadius*2, headRadius*2);
        ctx.restore();

        // Face Border/Halo
        ctx.strokeStyle = isMafia ? '#ef4444' : '#60a5fa';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, -headRadius, headRadius, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    };

    const gameLoop = () => {
      const canvas = canvasRef.current;
      if (!canvas) {
          localFrameId = requestAnimationFrame(gameLoop);
          return;
      }
      const ctx = canvas.getContext('2d');
      if (!ctx) {
          localFrameId = requestAnimationFrame(gameLoop);
          return;
      }

      // Chaos Logic
      const now = Date.now();
      const timeElapsed = now - gameStartTime.current;
      const chaos = settings.chaos || { enabled: false, frequency: 60, duration: 3 };
      
      const isChaosActive = chaos.enabled || timeElapsed >= 30000;

      // Notify user when auto-chaos starts
      if (timeElapsed >= 30000 && !chaos.enabled && !chaosAutoActive) {
          setChaosAutoActive(true);
      }
      
      if (isChaosActive && now - lastChaosTime.current > chaos.frequency * 1000) {
          lastChaosTime.current = now;
          const randomEffect = Math.floor(Math.random() * 6); // 0-5
          const chaosDur = (chaos.duration || 3) * 1000;
          
          switch(randomEffect) {
              case 0: // Invisibility
                  isInvisible.current = true;
                  setTimeout(() => isInvisible.current = false, chaosDur);
                  break;
              case 1: // Reverse Scroll
                  scrollDir.current = -1;
                  setTimeout(() => scrollDir.current = 1, chaosDur);
                  break;
              case 2: // Slippery
                  isSlippery.current = true;
                  setTimeout(() => isSlippery.current = false, chaosDur);
                  break;
              case 3: // Distraction
                  setDistraction(true);
                  setTimeout(() => setDistraction(false), chaosDur);
                  break;
              case 4: // Invert Controls
                  isInverted.current = true;
                  setTimeout(() => isInverted.current = false, chaosDur);
                  break;
              case 5: // Just a random jitter
                  playerSlide.current = 40;
                  setTimeout(() => playerSlide.current = 0, chaosDur);
                  break;
          }
      }

      // Logic
      const scrollSpeed = speed.current * scrollDir.current;
      
      obstacles.current.forEach(obs => {
        obs.x -= scrollSpeed;
      });

      // Cleanup and generate new
      if (obstacles.current.length > 0 && (obstacles.current[0].x + obstacles.current[0].width < -200 || (obstacles.current[0].type === 'coin' && obstacles.current[0].x < -50))) {
        const lastObs = obstacles.current[obstacles.current.length - 1];
        if (obstacles.current[0].type === 'bus') {
           setScore(s => s + 1);
           speed.current += 0.05;
        }
        obstacles.current.shift();
        
        if (obstacles.current.filter(o => o.type === 'bus').length < 10) {
            const lastBus = [...obstacles.current].reverse().find(o => o.type === 'bus') || lastObs;
            const busWidth = 200 + Math.random() * 200;
            const gapMin = settings.difficulty?.gapMin ?? 100;
            const gapMax = settings.difficulty?.gapMax ?? 200;
            const gapWidth = gapMin + Math.random() * (gapMax - gapMin);
            
            // Randomly add a coin
            const coinCount = Math.floor(Math.random() * 3);
            for (let i = 0; i < coinCount; i++) {
                 // In gap
                 if (Math.random() > 0.4) {
                      obstacles.current.push({
                          id: Date.now() + Math.random(),
                          x: lastBus.x + lastBus.width + gapWidth / 2 + (i * 40),
                          width: 35,
                          type: 'coin',
                          y: dimensions.height - BUS_HEIGHT - 80 - Math.random() * 120
                      });
                 }
                 // On bus
                 if (Math.random() > 0.3) {
                      obstacles.current.push({
                          id: Date.now() + Math.random() + 10,
                          x: lastBus.x + lastBus.width + gapWidth + (Math.random() * busWidth * 0.8),
                          width: 35,
                          type: 'coin',
                          y: dimensions.height - BUS_HEIGHT - CHARACTER_SIZE - 20
                      });
                 }
            }

            obstacles.current.push({
              id: Date.now(),
              x: lastBus.x + lastBus.width + gapWidth,
              width: busWidth,
              type: 'bus'
            });
        }
      }
      
      // Collision and Coin Pickup Logic
      let collidedWithBus = false;
      const onPlatform = obstacles.current.find(obs => {
        if (obs.type === 'coin') {
            const distX = Math.abs((PLAYER_X + playerSlide.current + CHARACTER_SIZE/2) - (obs.x + obs.width/2));
            const distY = Math.abs((playerY.current + CHARACTER_SIZE/2) - (obs.y! + obs.width/2));
            if (distX < CHARACTER_SIZE/0.6 && distY < CHARACTER_SIZE/0.6) {
                obs.x = -2000;
                setGameCoins(c => c + 1);
                setTotalCoins(c => c + 1);
            }
            return false;
        }
        
        const isPlayerOver = PLAYER_X + playerSlide.current + CHARACTER_SIZE * 0.3 > obs.x && 
                           PLAYER_X + playerSlide.current + CHARACTER_SIZE * 0.7 < obs.x + obs.width;
        
        if (isPlayerOver) {
            const floorY = dimensions.height - BUS_HEIGHT - CHARACTER_SIZE;
            if (playerY.current > floorY + 15) {
                collidedWithBus = true;
            }
            return true;
        }
        return false;
      });

      if (collidedWithBus) {
          gameOver();
          return;
      }

      // Physics
      const currentGravity = isInverted.current ? -(settings.difficulty?.gravity ?? 0.6) * 1.5 : (settings.difficulty?.gravity ?? 0.6);
      playerVY.current += currentGravity;
      playerY.current += playerVY.current;

      // Slippery Effect
      if (isSlippery.current && onPlatform) {
          playerSlide.current = Math.sin(now / 200) * 15;
      } else {
          playerSlide.current = 0;
      }

      const floorY = dimensions.height - BUS_HEIGHT - CHARACTER_SIZE;
      
      if (onPlatform) {
        if (playerY.current >= floorY) {
          playerY.current = floorY;
          playerVY.current = 0;
          isJumping.current = false;
          jumpCount.current = 0;
        }
      } else {
        if (playerY.current >= floorY) {
           isJumping.current = true;
        }
      }

      // Explicit Game Over if below the screen (fell in gap)
      if (playerY.current > dimensions.height + 50) {
        gameOver();
        return;
      }

      // Render
      // Set background colors based on theme
      let skyColorTop = '#020617';
      let skyColorBottom = '#1e1b4b';
      let buildingsColor = 'rgba(15, 23, 42, 0.8)';
      
      if (currentTheme === 'jungle') {
          skyColorTop = '#064e3b';
          skyColorBottom = '#14532d';
          buildingsColor = 'rgba(20, 83, 45, 0.6)';
      } else if (currentTheme === 'jail') {
          skyColorTop = '#111827';
          skyColorBottom = '#1f2937';
          buildingsColor = 'rgba(31, 41, 55, 0.9)';
      }

      ctx.fillStyle = skyColorBottom;
      ctx.fillRect(0, 0, dimensions.width, dimensions.height);
      
      // Real Night City Theme (Parallax)
      scrollBackground.current += speed.current * 0.1;
      const bgOffset = scrollBackground.current % dimensions.width;

      // Dark Sky Gradient
      const skyGrad = ctx.createLinearGradient(0, 0, 0, dimensions.height);
      skyGrad.addColorStop(0, skyColorTop);
      skyGrad.addColorStop(1, skyColorBottom);
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, dimensions.width, dimensions.height);

      // Stars or Jungle Fireflies
      ctx.fillStyle = currentTheme === 'jungle' ? 'rgba(163, 230, 53, 0.6)' : 'rgba(255, 255, 255, 0.4)';
      for(let i = 0; i < 40; i++) {
        const x = (i * 137) % dimensions.width;
        const y = (i * 243) % (dimensions.height - 100);
        ctx.beginPath();
        ctx.arc(x, y, currentTheme === 'jungle' ? 1.5 : 0.8, 0, Math.PI * 2);
        ctx.fill();
      }

      // Parallax Background Elements (Buildings/Trees/Bars)
      ctx.fillStyle = buildingsColor;
      for(let i = 0; i < 10; i++) {
          const bX = (i * 150 - bgOffset) % (dimensions.width + 150);
          const bW = 80;
          const bH = 150 + (i * 30) % 100;
          
          if (currentTheme === 'jungle') {
              // Draw tree-like shapes
              ctx.beginPath();
              ctx.moveTo(bX + bW/2, dimensions.height - 30);
              ctx.lineTo(bX + bW/2, dimensions.height - bH - 30);
              ctx.lineWidth = 10;
              ctx.strokeStyle = '#3f2b1c';
              ctx.stroke();
              
              ctx.beginPath();
              ctx.arc(bX + bW/2, dimensions.height - bH - 30, bW/2 + 20, 0, Math.PI * 2);
              ctx.fill();
          } else if (currentTheme === 'jail') {
              // Draw Bars
              ctx.fillRect(bX, 0, 10, dimensions.height);
              ctx.fillRect(bX + 40, 0, 10, dimensions.height);
          } else {
              // Dhaka City (Buildings)
              ctx.fillRect(bX, dimensions.height - bH - 30, bW, bH);
              // Windows
              ctx.fillStyle = i % 2 === 0 ? '#ffcc0033' : '#38bdf822';
              for(let wy = 10; wy < bH - 20; wy += 20) {
                  ctx.fillRect(bX + 10, dimensions.height - bH - 30 + wy, 15, 10);
                  ctx.fillRect(bX + bW - 25, dimensions.height - bH - 30 + wy, 15, 10);
              }
              ctx.fillStyle = buildingsColor;
          }
      }

      // Obstacles (Buses and Coins)
      obstacles.current.forEach(obs => {
        if (obs.type === 'coin') {
            const coinImg = images.current[settings.mafia.image];
            if (coinImg) {
                ctx.save();
                ctx.beginPath();
                ctx.arc(obs.x + obs.width/2, obs.y! + obs.width/2, obs.width/2, 0, Math.PI * 2);
                ctx.clip();
                ctx.drawImage(coinImg, obs.x, obs.y!, obs.width, obs.width);
                ctx.restore();
                
                // Glow effect
                ctx.strokeStyle = '#ffcc00';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(obs.x + obs.width/2, obs.y! + obs.width/2, obs.width/2 + 2, 0, Math.PI * 2);
                ctx.stroke();
            }
            return;
        }

        ctx.save();
        
        // Flip bus if scrolling reverse
        if (scrollDir.current === -1) {
            ctx.translate(obs.x + obs.width / 2, 0);
            ctx.scale(-1, 1);
            ctx.translate(-(obs.x + obs.width / 2), 0);
        }

        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.fillRect(obs.x + 5, dimensions.height - BUS_HEIGHT + 10, obs.width, 10);

        // Bus Body
        const busGrad = ctx.createLinearGradient(obs.x, 0, obs.x, dimensions.height);
        busGrad.addColorStop(0, '#fde047');
        busGrad.addColorStop(1, '#eab308');
        
        ctx.strokeStyle = '#422006';
        ctx.lineWidth = 3;
        ctx.fillStyle = busGrad;
        
        ctx.beginPath();
        // Fallback for roundRect
        if (ctx.roundRect) {
            try {
              ctx.roundRect(obs.x, dimensions.height - BUS_HEIGHT, obs.width, BUS_HEIGHT, 8);
            } catch (e) {
              ctx.rect(obs.x, dimensions.height - BUS_HEIGHT, obs.width, BUS_HEIGHT);
            }
        } else {
            ctx.rect(obs.x, dimensions.height - BUS_HEIGHT, obs.width, BUS_HEIGHT);
        }
        ctx.fill();
        ctx.stroke();
        
        // Windows
        ctx.fillStyle = 'rgba(2, 6, 23, 0.6)';
        for(let i = 15; i < obs.width - 25; i += 35) {
            ctx.fillRect(obs.x + i, dimensions.height - BUS_HEIGHT + 10, 25, 25);
        }

        // Details
        ctx.fillStyle = '#422006';
        ctx.fillRect(obs.x + 2, dimensions.height - BUS_HEIGHT + 40, obs.width - 4, 4);

        // Wheels
        ctx.fillStyle = '#0f172a';
        ctx.beginPath(); ctx.arc(obs.x + 40, dimensions.height - 5, 15, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(obs.x + obs.width - 40, dimensions.height - 5, 15, 0, Math.PI * 2); ctx.fill();

        ctx.restore();
      });

      // Draw Mafia (Leader)
      const mafiaImg = images.current[settings.mafia.image];
      if (mafiaImg) {
        ctx.shadowBlur = 30;
        ctx.shadowColor = 'rgba(239, 68, 68, 0.4)';
        
        const mafiaY = dimensions.height - BUS_HEIGHT - CHARACTER_SIZE + Math.sin(Date.now() / 150) * 12;
        
        drawStylizedCharacter(
            ctx, 
            mafiaImg, 
            MAFIA_X, 
            mafiaY, 
            CHARACTER_SIZE, 
            0, 
            true
        );
        
        // Target's Speech Bubble
        const bubbleText = settings.mafiaDialogue;
        ctx.font = "bold 14px Arial";
        const textWidth = ctx.measureText(bubbleText).width;
        
        ctx.fillStyle = "white";
        ctx.beginPath();
        if (ctx.roundRect) {
            ctx.roundRect(MAFIA_X - textWidth - 20, mafiaY - 40, textWidth + 20, 30, 10);
        } else {
            ctx.rect(MAFIA_X - textWidth - 20, mafiaY - 40, textWidth + 20, 30);
        }
        ctx.fill();
        
        // Triangle for speech bubble
        ctx.beginPath();
        ctx.moveTo(MAFIA_X - 10, mafiaY - 15);
        ctx.lineTo(MAFIA_X - 25, mafiaY - 15);
        ctx.lineTo(MAFIA_X - 15, mafiaY - 5);
        ctx.fill();
        
        ctx.fillStyle = "#dc2626";
        ctx.fillText(bubbleText, MAFIA_X - textWidth - 10, mafiaY - 20);
        
        ctx.shadowBlur = 0;
      }

      // Draw Player
      if (selectedCharIndex !== null && settings.characters[selectedCharIndex]) {
        const char = settings.characters[selectedCharIndex];
        const playerImg = images.current[char.image];
        if (playerImg) {
          ctx.shadowBlur = 20;
          ctx.shadowColor = 'rgba(56, 189, 248, 0.6)';
          
          const rotation = isJumping.current ? playerVY.current * 0.05 : 0;
          
          if (!isInvisible.current) {
            const currentDress = settings.dresses?.find(d => d.id === selectedDressId);
            const dressImg = currentDress ? images.current[currentDress.image] : undefined;
            
            drawStylizedCharacter(
                ctx, 
                playerImg, 
                PLAYER_X + playerSlide.current, 
                playerY.current, 
                CHARACTER_SIZE, 
                rotation, 
                false,
                dressImg
            );
          }
          
          ctx.shadowBlur = 0;
        }
      }

      localFrameId = requestAnimationFrame(gameLoop);
    };

    localFrameId = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(localFrameId);
  }, [gameState, selectedCharIndex, settings, dimensions.width, dimensions.height]);

  const gameOver = () => {
      setGameState('gameover');
      // Play Game Over Sound
      if (settings.audio?.gameOverSoundUrl) {
          const gameOverAudio = new Audio(settings.audio.gameOverSoundUrl);
          gameOverAudio.play().catch(() => {});
      } else {
        try {
            const msg = new SpeechSynthesisUtterance("আহ... আহ... আহ.. বেবি আমাকে বাঁচাও");
            msg.lang = 'bn-BD';
            window.speechSynthesis.speak(msg);
        } catch (e) {}
      }
  };

  if (!settings) {
      return (
          <div className="w-full h-screen bg-[#0b0e14] flex flex-col items-center justify-center">
              <Loader2 className="w-10 h-10 animate-spin text-[#ffcc00] mb-4" />
              <p className="text-white/40 font-black uppercase tracking-widest text-xs">মিশন ডাটা লোড হচ্ছে...</p>
          </div>
      );
  }

  return (
    <div className="relative w-full h-screen bg-[#0b0e14] flex flex-col items-center justify-center overflow-hidden font-sans">
      {/* City Background Layer */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#1a1c2c] to-[#0b0e14] z-0">
        <div className="absolute top-12 left-12 w-[calc(100%-96px)] h-[300px] stars-bg opacity-30" />
      </div>

      <AnimatePresence mode="wait">
        {gameState === 'platform_selection' && (
            <motion.div 
            key="platform"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="z-10 bg-black/80 p-12 rounded-3xl border border-[#ffcc00]/20 text-center max-w-2xl w-full mx-4"
          >
            <h1 className="text-5xl font-black text-[#ffcc00] mb-8 uppercase tracking-tighter italic">সিস্টেম নির্বাচন করুন</h1>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <button 
                onClick={() => { setPlatform('pc'); setGameState('selection'); }}
                className="group relative bg-[#ffcc00] hover:bg-white text-black p-8 rounded-2xl transition-all overflow-hidden"
              >
                <Monitor className="w-12 h-12 mb-4 mx-auto" />
                <span className="text-2xl font-black uppercase">পিসি ডেস্কটপ</span>
                <p className="text-xs font-bold opacity-60 mt-2">ল্যান্ডস্কেপ ৮০০x৪০০</p>
                <div className="absolute bottom-0 right-0 p-2 opacity-10 group-hover:scale-150 transition-transform">
                  <Monitor className="w-20 h-20" />
                </div>
              </button>
              <button 
                onClick={() => { setPlatform('mobile'); setGameState('selection'); }}
                className="group relative bg-[#dc2626] hover:bg-white text-white hover:text-black p-8 rounded-2xl transition-all overflow-hidden"
              >
                <Smartphone className="w-12 h-12 mb-4 mx-auto" />
                <span className="text-2xl font-black uppercase">মোবাইল ইউনিট</span>
                <p className="text-xs font-bold opacity-60 mt-2">পোর্ট্রেট ৪০০x৬০০</p>
                <div className="absolute bottom-0 right-0 p-2 opacity-10 group-hover:scale-150 transition-transform">
                  <Smartphone className="w-20 h-20" />
                </div>
              </button>
            </div>
          </motion.div>
        )}

        {gameState === 'selection' && (
          <motion.div 
            key="selection"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="z-10 flex flex-col items-center justify-start py-10 md:justify-center w-full h-full bg-black/85 overflow-y-auto"
          >
            <h1 className="text-4xl md:text-6xl font-[900] text-[#ffcc00] mb-8 md:mb-12 text-center uppercase tracking-[-2px] px-4">
              {settings.gameName}
            </h1>
            <div className="flex flex-wrap justify-center gap-4 md:gap-6 max-w-5xl px-4">
              {settings.characters.map((char, index) => {
                const isSelected = selectedCharIndex === index;
                return (
                  <motion.button
                    key={char.id}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setSelectedCharIndex(index)}
                    className={`group relative flex flex-col items-center gap-2 md:gap-4 p-4 md:p-6 rounded-xl transition-all w-32 md:w-40 h-48 md:h-64 glass-morphism ${
                      isSelected ? 'border-[#ffcc00] bg-[#ffcc00]/40 ring-4 ring-[#ffcc00]/20' : 'border-white/5'
                    }`}
                  >
                    {isSelected && (
                      <motion.div 
                        layoutId="active-glow"
                        className="absolute inset-0 bg-[#ffcc00]/5 rounded-xl border border-[#ffcc00] z-0"
                      />
                    )}
                    <div className="z-10 transition-all flex items-center justify-center p-2">
                      <UICharacter 
                        image={char.image} 
                        size={isSelected ? 80 : 65} 
                        label="মাফিয়া চেজার" 
                        dressImage={settings.dresses?.find(d => d.id === selectedDressId)?.image}
                      />
                    </div>
                    <div className="flex flex-col items-center mt-2">
                      <span className="text-xs md:text-sm font-black text-white uppercase tracking-tight text-center truncate w-full px-1">
                        {char.name}
                      </span>
                    </div>
                  </motion.button>
                );
              })}
            </div>

            <div className="flex gap-4 mt-8 md:mt-12">
                <AnimatePresence>
                {selectedCharIndex !== null && (
                    <motion.button 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    onClick={() => startGame(selectedCharIndex)}
                    className="bg-[#ffcc00] text-black px-12 py-4 rounded-full text-xl font-black uppercase hover:bg-white hover:scale-105 active:scale-95 transition-all shadow-[0_10px_40px_rgba(255,204,0,0.4)] flex items-center gap-4"
                    >
                    <Play className="w-8 h-8 fill-black" />
                    মিশন শুরু
                    </motion.button>
                )}
                </AnimatePresence>

                <motion.button 
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setGameState('store')}
                    className="bg-white/10 text-white px-10 py-4 rounded-full text-xl font-black uppercase border border-white/20 hover:bg-white/20 transition-all flex items-center gap-4"
                >
                    <Trophy className="w-8 h-8 text-[#ffcc00]" />
                    স্টোর ( {totalCoins} )
                </motion.button>
            </div>

            <p className="mt-8 text-white/40 text-xs uppercase tracking-widest">
              টার্গেট #৬ কে ধরুন | জেলের গর্তে পড়বেন না
            </p>
          </motion.div>
        )}

        {gameState === 'store' && (
            <motion.div 
                key="store"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="z-50 inset-0 fixed bg-black/95 backdrop-blur-3xl p-6 md:p-12 overflow-y-auto"
            >
                <div className="max-w-4xl mx-auto">
                    <div className="flex justify-between items-center mb-12">
                        <div>
                            <h2 className="text-5xl font-black text-white uppercase italic tracking-tighter">ড্রেস মার্কেট</h2>
                            <p className="text-[#ffcc00] font-bold uppercase tracking-widest text-sm mt-2">জানের ফটো খরচ করে নতুন ড্রেস কিনুন</p>
                        </div>
                        <div className="bg-[#ffcc00] text-black px-8 py-4 rounded-2xl flex items-center gap-4 shadow-[0_0_30px_rgba(255,204,0,0.3)]">
                            <span className="text-[12px] font-black uppercase opacity-60">আপনার ব্যালেন্স</span>
                            <span className="text-3xl font-black">{totalCoins}</span>
                            <img src={settings.mafia.image} className="w-8 h-8 rounded-full border-2 border-black" alt="coin" />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {(settings.dresses || []).map((dress) => {
                            const isUnlocked = unlockedDressIds.includes(dress.id);
                            const isEquipped = selectedDressId === dress.id;
                            const canAfford = totalCoins >= dress.cost;
                            
                            return (
                                <motion.div 
                                    key={dress.id}
                                    whileHover={{ y: -5 }}
                                    className={`relative p-6 rounded-3xl border transition-all flex flex-col items-center ${
                                        isEquipped ? 'border-[#ffcc00] bg-[#ffcc00]/10' : 'bg-white/5 border-white/10'
                                    }`}
                                >
                                    <div className="w-24 h-32 rounded-xl overflow-hidden mb-4 border-2 border-white/10 shadow-lg">
                                        <img src={dress.image} className="w-full h-full object-cover" />
                                    </div>
                                    <h3 className="text-xl font-black text-white uppercase mt-2 tracking-tight">{dress.name}</h3>
                                    
                                    <div className="mt-8 w-full">
                                        {isUnlocked ? (
                                            <button 
                                                onClick={() => setSelectedDressId(isEquipped ? null : dress.id)}
                                                className={`w-full py-3 rounded-xl font-black text-center uppercase tracking-widest text-sm border transition-all ${
                                                    isEquipped 
                                                    ? 'bg-red-600 text-white border-red-400' 
                                                    : 'bg-green-600/20 text-green-400 border-green-400/30 hover:bg-green-600 hover:text-white'
                                                }`}
                                            >
                                                {isEquipped ? 'খুলুন' : 'ব্যবহার করুন'}
                                            </button>
                                        ) : (
                                            <button 
                                                onClick={() => {
                                                    if (canAfford) {
                                                        setTotalCoins(prev => prev - dress.cost);
                                                        setUnlockedDressIds(prev => [...prev, dress.id]);
                                                    }
                                                }}
                                                disabled={!canAfford}
                                                className={`w-full py-4 rounded-xl font-black uppercase text-sm transition-all flex items-center justify-center gap-3 ${
                                                    canAfford 
                                                    ? 'bg-[#ffcc00] text-black hover:scale-105 active:scale-95 shadow-lg' 
                                                    : 'bg-white/5 text-white/20 cursor-not-allowed grayscale'
                                                }`}
                                            >
                                                {canAfford ? 'কিনে নিন' : 'টাকা লাগবে বেবি!'}
                                                <span className="flex items-center gap-1 font-black">
                                                    ( {dress.cost} )
                                                </span>
                                            </button>
                                        )}
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>

                    <button 
                        onClick={() => setGameState('selection')}
                        className="mt-16 w-full py-5 text-white/40 font-black uppercase tracking-[5px] hover:text-[#ffcc00] transition-colors border-t border-white/5"
                    >
                        ফিরে যান ( BACK )
                    </button>
                </div>
            </motion.div>
        )}
        {gameState === 'playing' && (
          <motion.div 
            key="playing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="relative z-10"
          >
            <div className="absolute -top-24 inset-x-0 flex justify-between px-6">
              <div className="flex flex-col gap-2 items-start">
                  <div className="glass-morphism p-3 px-6 rounded-lg min-w-[140px] flex flex-col items-start gap-1">
                    <span className="text-[10px] opacity-50 block uppercase tracking-wider font-black">অপারেটর দূরত্ব</span>
                    <span className="text-2xl font-black text-white">{Math.floor(score * 12.5)} মি:</span>
                  </div>
                  <div className="glass-morphism p-3 px-6 rounded-lg flex flex-col items-start gap-1">
                    <span className="text-[10px] opacity-50 block uppercase tracking-wider font-black">জানের ফটো কালেকশন</span>
                    <span className="text-2xl font-black text-yellow-400 flex items-center gap-2">
                        <img src={settings.mafia.image} className="w-5 h-5 rounded-full" alt="coin" />
                        {gameCoins}
                    </span>
                  </div>
                  {chaosAutoActive && (
                    <motion.div 
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="bg-[#ff4444] text-white px-3 py-1.5 rounded-md font-black text-[10px] uppercase tracking-[2px] shadow-[0_0_20px_rgba(255,68,68,0.4)] flex items-center gap-2 border border-white/20"
                    >
                      <div className="w-1.5 h-1.5 bg-white rounded-full animate-ping" />
                      মাথা নষ্ট মুড চশমায়!
                    </motion.div>
                  )}
              </div>
              <div className="glass-morphism p-2 px-4 rounded-lg text-right flex items-center gap-4">
                <div className="text-right">
                    <span className="text-[10px] opacity-50 block uppercase tracking-wider font-black">টার্গেট প্রোফাইল</span>
                    <span className="text-lg font-black text-[#ffcc00] uppercase leading-none">{settings.mafia.name}</span>
                </div>
                <div 
                    className="w-12 h-12 rounded-md overflow-hidden border border-[#ffcc00]/50 shadow-[0_0_10px_rgba(255,204,0,0.3)] cursor-pointer"
                    onClick={() => {
                        chaosSecretTaps.current += 1;
                        if (chaosSecretTaps.current >= 5) {
                            chaosSecretTaps.current = 0;
                            alert("মাথা নষ্ট মুড সবসময় চালু থাকবে! দয়া না চাইলে মিশন ছাড়ুন। 😈");
                        }
                    }}
                >
                    <img src={settings.mafia.image} className="w-full h-full object-cover" alt="Target" referrerPolicy="no-referrer" />
                </div>
              </div>
            </div>
            
            <div className="relative group w-full max-w-[500px] mx-auto px-4">
                <div style={{ aspectRatio: `${dimensions.width}/${dimensions.height}` }} className="w-full relative">
                    <canvas 
                    ref={canvasRef}
                    width={dimensions.width}
                    height={dimensions.height}
                    className="w-full h-full rounded-xl shadow-[0_0_60px_rgba(0,0,0,0.7)] border-4 border-[#1e293b] cursor-pointer object-contain bg-black"
                    onPointerDown={(e) => {
                        e.preventDefault();
                        jump();
                    }}
                    />
                    
                    {/* Red Tap Button for Jump - Optimized for mobile position, hidden for PC */}
                    {platform === 'mobile' && (
                        <div className="absolute -bottom-36 left-1/2 -translate-x-1/2 z-[100]">
                            <motion.button
                                whileTap={{ scale: 0.7, backgroundColor: '#b91c1c' }}
                                onPointerDown={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    jump();
                                }}
                                className="w-32 h-32 md:w-24 md:h-24 bg-red-600 rounded-full border-8 border-white/20 shadow-[0_0_50px_rgba(220,38,38,0.8)] flex items-center justify-center text-white cursor-pointer touch-none select-none active:bg-red-700 transition-all font-black uppercase text-2xl"
                            >
                                JUMP
                            </motion.button>
                        </div>
                    )}
                </div>
            </div>
            
          </motion.div>
        )}

        {gameState === 'gameover' && (
          <motion.div 
            key="gameover"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="z-20 bg-[#0b0e14]/95 backdrop-blur-2xl p-12 rounded-2xl border border-[#ff4444]/30 shadow-[0_0_100px_rgba(255,68,68,0.15)] text-center max-w-lg w-full mx-4"
          >
            <h2 className="text-6xl font-black text-white mb-2 tracking-tighter uppercase italic drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">
              খতম হোগা মারা শেষ
            </h2>
            <div className="bg-red-600/20 border-l-4 border-red-600 p-4 mb-6">
              <p className="text-white font-black text-lg leading-tight">
                {selectedCharIndex !== null ? settings.characters[selectedCharIndex].name : 'Runner'}, আপনার জানকে নিয়ে গেলাম বাসর করতে!
              </p>
            </div>
            <p className="text-[#ff4444] font-black uppercase tracking-[4px] text-xs mb-10">আবাসিক এ যাও</p>
            
            <div className="relative h-64 mb-10 bg-black/60 rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
               {/* Jail Visual - Selected Character Locked Up */}
               <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                 <div className="relative flex flex-col items-center scale-125">
                    <UICharacter 
                      image={selectedCharIndex !== null ? settings.characters[selectedCharIndex].image : ''} 
                      size={60} 
                    />
                    <div className="absolute inset-0 flex justify-between px-3 pointer-events-none z-20 overflow-hidden">
                       {[...Array(8)].map((_, i) => (
                         <div key={i} className="w-[4px] bg-gradient-to-b from-[#444] via-[#222] to-[#000] h-32 shadow-[2px_0_5px_rgba(0,0,0,0.5)]" />
                       ))}
                    </div>
                    <span className="mt-4 text-[10px] font-black text-[#ff4444] uppercase tracking-tighter">বন্দী আইডি: #{selectedCharIndex}</span>
                 </div>
               </div>

               {/* Escapees Cinematic: Others + Mafia escape together */}
               <div className="absolute top-4 left-0 w-full flex flex-col gap-1 items-start">
                  <span className="ml-4 text-[8px] font-black text-[#ffcc00]/50 uppercase tracking-[2px]">সবাই তোমার জানকে নিয়ে খেলতে যাচ্ছে</span>
               </div>

               <motion.div 
                 initial={{ x: -200 }}
                 animate={{ x: 650 }}
                 transition={{ duration: 6, ease: "linear", repeat: Infinity }}
                 className="absolute bottom-4 left-0 flex items-end gap-6"
               >
                  {/* The Mafia Leader leading the escape */}
                  <UICharacter image={settings.mafia.image} size={50} isMafia label="মাফিয়া বস" />

                  {/* The other characters following the Mafia boss */}
                  <div className="flex items-end gap-3 translate-y-2">
                    {settings.characters.map((char, i) => i !== selectedCharIndex && (
                       <UICharacter key={i} image={char.image} size={35} label="বিশ্বাসঘাতক" />
                    ))}
                  </div>
               </motion.div>

               {/* Police Sirens Effect */}
               <div className="absolute inset-0 pointer-events-none bg-red-600/5 animate-pulse" />
            </div>

            <div className="grid grid-cols-1 gap-4">
              <button 
                onClick={() => startGame(selectedCharIndex!)}
                className="w-full py-5 bg-[#ffcc00] text-black font-black uppercase tracking-widest text-lg rounded-xl hover:bg-[#ffe066] transition-all transform hover:scale-[1.02] active:scale-95 shadow-[0_5px_15px_rgba(255,204,0,0.3)] flex items-center justify-center gap-3"
              >
                <RefreshCw className="w-6 h-6" />
                আবার চেষ্টা করুন
              </button>
              
              <div className="grid grid-cols-2 gap-4">
                  <button 
                    onClick={() => setGameState('store')}
                    className="py-4 bg-white/10 text-white font-black uppercase tracking-widest text-xs rounded-xl border border-white/10 hover:bg-white/20 transition-all flex items-center justify-center gap-2"
                  >
                    <Trophy className="w-5 h-5 text-[#ffcc00]" />
                    স্টোর
                  </button>
                  <button 
                    onClick={() => setGameState('selection')}
                    className="py-4 bg-white/5 text-white/60 font-black uppercase tracking-widest text-xs rounded-xl border border-white/5 hover:bg-white/10 hover:text-white transition-all flex items-center justify-center gap-2"
                  >
                    অপারেটর পরিবর্তন
                  </button>
              </div>
            </div>
            
            <div className="mt-8 flex justify-between items-center px-4">
                <div className="text-left">
                    <span className="block text-[10px] text-white/30 uppercase font-black">সর্বশেষ দূরত্ব</span>
                    <span className="text-xl font-black text-white">{score * 10} মি:</span>
                </div>
                <div className="text-right">
                    <span className="block text-[10px] text-white/30 uppercase font-black">সেরা স্কোর</span>
                    <span className="text-xl font-black text-[#ffcc00]">{highScore * 10} মি:</span>
                </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Jail Alert Overlay */}
      <div className="absolute bottom-6 left-12 flex items-center gap-3 z-30">
          <div className="bg-[#ff4444] px-6 py-2 rounded-sm text-[10px] font-black uppercase tracking-[2px] text-white shadow-lg animate-pulse">
            বিপদ: বাসের নিচে জেল জোন
          </div>
      </div>

      {/* Random Distractions */}
      <AnimatePresence>
        {distraction && settings && (
            <motion.div 
                initial={{ opacity: 0, scale: 4 }}
                animate={{ opacity: 1, scale: 1, rotate: [0, 5, -5, 0] }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[500] pointer-events-none flex items-center justify-center"
            >
                <div className="relative">
                    <img 
                        src={settings.mafia.image} 
                        className="w-80 h-80 object-cover rounded-full border-8 border-yellow-400 shadow-[0_0_100px_rgba(255,204,0,0.8)]" 
                        alt="Distraction"
                        referrerPolicy="no-referrer"
                    />
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-red-600 text-white px-8 py-4 rounded-full font-black text-3xl uppercase rotate-12 shadow-2xl whitespace-nowrap">
                        ধরা খাবি বেবি!
                    </div>
                </div>
            </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
