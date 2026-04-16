import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { GameSettings, Character } from '../types';
import { 
  Save, Plus, Trash2, LogOut, Loader2, ShieldCheck, Lock, 
  Settings2, Users, Ghost, Zap, MessageSquare, Gauge 
} from 'lucide-react';

export default function AdminPanel() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'general' | 'difficulty' | 'chaos' | 'characters' | 'dresses' | 'audio'>('general');
  
  const [settings, setSettings] = useState<GameSettings | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const token = localStorage.getItem('admin_token');
    try {
      const res = await fetch('/api/check-auth', {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      if (res.ok) {
        setIsAuthenticated(true);
        fetchSettings();
      } else {
        localStorage.removeItem('admin_token');
      }
    } catch (e) {
      localStorage.removeItem('admin_token');
    }
  };

  const fetchSettings = async () => {
    const token = localStorage.getItem('admin_token');
    try {
      const res = await fetch('/api/settings', {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setSettings(data);
    } catch (e) {
      console.error('Failed to fetch settings');
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setLoginError('');
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.token) {
          localStorage.setItem('admin_token', data.token);
        }
        setIsAuthenticated(true);
        fetchSettings();
      } else {
        setLoginError('Access Denied');
      }
    } catch (e) {
      setLoginError('Server Error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/logout', { method: 'POST' });
    localStorage.removeItem('admin_token');
    setIsAuthenticated(false);
    setSettings(null);
  };

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    const token = localStorage.getItem('admin_token');
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify(settings),
      });
      
      if (res.ok) {
        alert('✅ System Updated Successfully!');
      } else {
        const errorData = await res.json();
        alert(`❌ Error: ${errorData.error}`);
      }
    } catch (e) {
      alert('❌ Fatal Network Error');
    } finally {
      setSaving(false);
    }
  };

  const addCharacter = () => {
    if (!settings) return;
    const newChar: Character = {
      id: Date.now(),
      name: 'Runner #' + (settings.characters.length + 1),
      image: 'https://picsum.photos/seed/' + Math.random() + '/200/200'
    };
    setSettings({
      ...settings,
      characters: [...settings.characters, newChar]
    });
  };

  const removeCharacter = (id: number) => {
    if (!settings) return;
    setSettings({
      ...settings,
      characters: settings.characters.filter(c => c.id !== id)
    });
  };

  const updateCharacter = (index: number, field: keyof Character, value: any) => {
    if (!settings) return;
    const newChars = [...settings.characters];
    newChars[index] = { ...newChars[index], [field]: value };
    setSettings({ ...settings, characters: newChars });
  };

  const addDress = () => {
    if (!settings) return;
    const newDress = {
      id: Date.now(),
      name: 'New Dress',
      image: 'https://picsum.photos/seed/' + Math.random() + '/200/200',
      cost: 100
    };
    setSettings({
      ...settings,
      dresses: [...(settings.dresses || []), newDress]
    });
  };

  const removeDress = (id: number) => {
    if (!settings) return;
    setSettings({
      ...settings,
      dresses: (settings.dresses || []).filter(d => d.id !== id)
    });
  };

  const updateDress = (index: number, field: any, value: any) => {
    if (!settings) return;
    const newDresses = [...(settings.dresses || [])];
    newDresses[index] = { ...newDresses[index], [field]: value };
    setSettings({ ...settings, dresses: newDresses });
  };

  const updateDifficulty = (field: keyof GameSettings['difficulty'], value: number) => {
    if (!settings) return;
    setSettings({
      ...settings,
      difficulty: { ...settings.difficulty, [field]: value }
    });
  };

  const updateChaos = (field: keyof GameSettings['chaos'], value: any) => {
    if (!settings) return;
    setSettings({
      ...settings,
      chaos: { ...settings.chaos, [field]: value }
    });
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-slate-900 p-10 rounded-[2rem] border border-white/5 shadow-2xl w-full max-w-md"
        >
          <div className="flex justify-center mb-8">
            <div className="bg-red-500/10 p-5 rounded-3xl border border-red-500/20">
              <Lock className="w-10 h-10 text-red-500" />
            </div>
          </div>
          <h2 className="text-3xl font-black text-white text-center mb-2 uppercase tracking-tighter italic">Admin Console</h2>
          <p className="text-center text-white/40 text-xs font-bold uppercase tracking-widest mb-10">Restricted Area</p>
          
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">Personnel ID</label>
              <input 
                type="text" 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-black/40 border border-white/5 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-red-500 transition-all shadow-inner"
                placeholder="Username"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">Access Key</label>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-black/40 border border-white/5 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-red-500 transition-all shadow-inner"
                placeholder="••••••••"
                required
              />
            </div>
            {loginError && (
              <p className="text-red-500 text-xs font-black text-center animate-pulse uppercase tracking-wider">{loginError}</p>
            )}
            <button 
              disabled={isLoading}
              className="w-full bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-black py-5 rounded-2xl uppercase tracking-widest transition-all shadow-[0_10px_30px_rgba(220,38,38,0.3)] flex items-center justify-center gap-3 active:scale-95"
            >
              {isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : 'Authenticate System'}
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 md:p-12 font-sans selection:bg-red-500 selection:text-white">
      <div className="max-w-6xl mx-auto pb-32">
        <header className="flex flex-col md:flex-row justify-between items-center gap-6 mb-12 bg-slate-900/50 p-8 rounded-[2.5rem] border border-white/5 backdrop-blur-xl">
           <div className="flex items-center gap-6">
             <div className="bg-green-500/10 p-4 rounded-3xl border border-green-500/20 shadow-[0_0_20px_rgba(34,197,94,0.1)]">
               <ShieldCheck className="w-8 h-8 text-green-500" />
             </div>
             <div>
               <h1 className="text-3xl font-black uppercase tracking-tighter italic">Command Center</h1>
               <div className="flex items-center gap-2">
                 <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                 <p className="text-xs text-white/40 font-bold uppercase tracking-widest">Admin Live Session</p>
               </div>
             </div>
           </div>
           <button 
             onClick={handleLogout}
             className="flex items-center gap-3 px-6 py-3 bg-white/5 hover:bg-red-500/20 rounded-2xl transition-all text-white/40 hover:text-red-400 text-xs font-black uppercase tracking-widest border border-transparent hover:border-red-500/30"
           >
             <LogOut className="w-4 h-4" />
             Terminate Session
           </button>
        </header>

        {settings ? (
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Sidebar Tabs */}
            <aside className="lg:w-64 flex flex-row lg:flex-col gap-2 overflow-x-auto pb-4 lg:pb-0">
               {[
                 { id: 'general', label: 'General', icon: Settings2 },
                 { id: 'difficulty', label: 'Difficulty', icon: Gauge },
                 { id: 'chaos', label: 'Chaos Mode', icon: Ghost },
                 { id: 'characters', label: 'Characters', icon: Users },
               ].map(tab => (
                 <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center gap-4 px-6 py-4 rounded-2xl transition-all whitespace-nowrap font-black uppercase text-xs tracking-widest ${
                      activeTab === tab.id ? 'bg-[#ffcc00] text-black shadow-lg shadow-[#ffcc00]/20' : 'bg-white/5 text-white/40 hover:bg-white/10'
                    }`}
                 >
                   <tab.icon className="w-5 h-5" />
                   {tab.label}
                 </button>
               ))}
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 space-y-8">
               <AnimatePresence mode="wait">
                 {activeTab === 'general' && (
                   <motion.div 
                     initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                     className="bg-slate-900/50 p-8 rounded-[2rem] border border-white/5 space-y-8"
                   >
                     <div className="flex items-center gap-4 border-b border-white/5 pb-6">
                        <Settings2 className="w-6 h-6 text-[#ffcc00]" />
                        <h2 className="text-xl font-black uppercase italic">General Config</h2>
                     </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-4">
                           <label className="text-[10px] font-black uppercase text-white/40 tracking-widest block ml-1">Game Identity</label>
                           <input 
                             type="text" value={settings.gameName}
                             onChange={(e) => setSettings({...settings, gameName: e.target.value})}
                             className="w-full bg-black/40 border border-white/5 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-[#ffcc00] transition-all"
                           />
                        </div>
                        <div className="space-y-4">
                           <label className="text-[10px] font-black uppercase text-white/40 tracking-widest block ml-1">Mafia Dialogue</label>
                           <input 
                             type="text" value={settings.mafiaDialogue}
                             onChange={(e) => setSettings({...settings, mafiaDialogue: e.target.value})}
                             className="w-full bg-black/40 border border-white/5 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-[#ffcc00] transition-all"
                           />
                        </div>
                     </div>
                     <div className="space-y-4">
                        <label className="text-[10px] font-black uppercase text-white/40 tracking-widest block ml-1">Mafia Target Identity</label>
                        <div className="flex flex-col md:flex-row gap-6 p-6 bg-black/30 rounded-3xl border border-white/5 items-center">
                            <div className="w-32 h-32 rounded-3xl overflow-hidden border-2 border-[#ffcc00] shadow-2xl relative group">
                                <img src={settings.mafia.image} className="w-full h-full object-cover" />
                                <label className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                                  <Plus className="w-10 h-10 text-[#ffcc00]" />
                                  <input type="file" className="hidden" accept="image/*" onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (file) {
                                          const reader = new FileReader();
                                          reader.onloadend = () => setSettings({...settings, mafia: {...settings.mafia, image: reader.result as string}});
                                          reader.readAsDataURL(file);
                                      }
                                  }} />
                                </label>
                            </div>
                            <div className="flex-1 space-y-4 w-full">
                                <input 
                                  type="text" value={settings.mafia.name} placeholder="Mafia Name"
                                  onChange={(e) => setSettings({...settings, mafia: {...settings.mafia, name: e.target.value}})}
                                  className="w-full bg-white/5 border border-white/5 rounded-xl px-4 py-3"
                                />
                                <input 
                                  type="text" value={settings.mafia.image} placeholder="Image URL"
                                  onChange={(e) => setSettings({...settings, mafia: {...settings.mafia, image: e.target.value}})}
                                  className="w-full bg-white/5 border border-white/5 rounded-xl px-4 py-3 text-xs text-white/40"
                                />
                            </div>
                        </div>
                     </div>
                   </motion.div>
                 )}

                 {activeTab === 'difficulty' && (
                   <motion.div 
                     initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                     className="bg-slate-900/50 p-8 rounded-[2rem] border border-white/5 space-y-8"
                   >
                     <div className="flex items-center gap-4 border-b border-white/5 pb-6">
                        <Gauge className="w-6 h-6 text-[#ffcc00]" />
                        <h2 className="text-xl font-black uppercase italic">Difficulty Matrix</h2>
                     </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                       {[
                         { key: 'initialSpeed', label: 'Scroll Speed', step: 0.5, unit: 'px/f' },
                         { key: 'gravity', label: 'Gravity Pull', step: 0.1, unit: 'm/s²' },
                         { key: 'jumpForce', label: 'Jump Strength', step: 1, unit: 'N' },
                         { key: 'gapMin', label: 'Min Distance', step: 10, unit: 'px' },
                       ].map(item => (
                         <div key={item.key} className="space-y-4 bg-black/20 p-6 rounded-3xl border border-white/5">
                            <div className="flex justify-between items-center">
                              <label className="text-[10px] font-black uppercase text-white/40 tracking-widest">{item.label}</label>
                              <span className="text-[#ffcc00] font-black text-sm">{settings.difficulty[item.key as keyof typeof settings.difficulty]} {item.unit}</span>
                            </div>
                            <input 
                              type="range" min={item.key === 'jumpForce' ? -30 : 0.1} max={item.key === 'initialSpeed' ? 20 : item.key === 'gapMin' ? 500 : 3} step={item.step}
                              value={settings.difficulty[item.key as keyof typeof settings.difficulty]}
                              onChange={(e) => updateDifficulty(item.key as any, parseFloat(e.target.value))}
                              className="w-full accent-[#ffcc00] hover:accent-yellow-400 cursor-pointer"
                            />
                         </div>
                       ))}
                     </div>
                   </motion.div>
                 )}

                 {activeTab === 'chaos' && (
                   <motion.div 
                     initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                     className="bg-slate-900/50 p-8 rounded-[2rem] border border-white/5 space-y-8"
                   >
                     <div className="flex items-center gap-4 border-b border-white/5 pb-6">
                        <Ghost className="w-6 h-6 text-[#ffcc00]" />
                        <h2 className="text-xl font-black uppercase italic">Chaos Mode Configuration</h2>
                     </div>
                     <div className="p-8 bg-red-600/10 border border-red-600/20 rounded-[2rem] flex items-center justify-between">
                        <div>
                           <h3 className="font-black uppercase text-red-500 italic">Core Hyper-Chaos</h3>
                           <p className="text-xs text-white/30 font-bold uppercase tracking-widest">Toggle system-wide instability</p>
                        </div>
                        <button 
                          onClick={() => updateChaos('enabled', !settings.chaos.enabled)}
                          className={`relative w-20 h-10 rounded-full transition-all duration-300 ${settings.chaos.enabled ? 'bg-red-600' : 'bg-slate-800'}`}
                        >
                          <div className={`absolute top-1 w-8 h-8 rounded-full bg-white transition-all duration-300 ${settings.chaos.enabled ? 'left-11' : 'left-1'}`} />
                        </button>
                     </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-4 bg-black/20 p-8 rounded-[2rem] border border-white/5">
                            <div className="flex justify-between items-center mb-4">
                              <label className="text-[10px] font-black uppercase text-white/40 tracking-widest">Effect Frequency</label>
                              <span className="text-[#ffcc00] font-black text-sm">{settings.chaos.frequency} sec</span>
                            </div>
                            <input type="range" min="5" max="120" step="1" value={settings.chaos.frequency} onChange={(e) => updateChaos('frequency', parseInt(e.target.value))} className="w-full accent-red-500" />
                            <p className="text-[9px] text-white/20 font-bold uppercase">Lower = More frequent chaos</p>
                        </div>
                        <div className="space-y-4 bg-black/20 p-8 rounded-[2rem] border border-white/5">
                            <div className="flex justify-between items-center mb-4">
                              <label className="text-[10px] font-black uppercase text-white/40 tracking-widest">Effect Duration</label>
                              <span className="text-[#ffcc00] font-black text-sm">{settings.chaos.duration} sec</span>
                            </div>
                            <input type="range" min="1" max="15" step="0.5" value={settings.chaos.duration} onChange={(e) => updateChaos('duration', parseFloat(e.target.value))} className="w-full accent-red-500" />
                            <p className="text-[9px] text-white/20 font-bold uppercase">Higher = Longer pain duration</p>
                        </div>
                     </div>
                   </motion.div>
                 )}

                 {activeTab === 'characters' && (
                   <motion.div 
                     initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                     className="bg-slate-900/50 p-8 rounded-[2rem] border border-white/5 space-y-8"
                   >
                     <div className="flex items-center justify-between border-b border-white/5 pb-6">
                        <div className="flex items-center gap-4">
                            <Users className="w-6 h-6 text-[#ffcc00]" />
                            <h2 className="text-xl font-black uppercase italic">Runner Registry</h2>
                        </div>
                        <button 
                          onClick={addCharacter}
                          className="flex items-center gap-2 px-5 py-2.5 bg-[#ffcc00] text-black rounded-2xl font-black uppercase text-[10px] tracking-widest hover:scale-105 transition-all shadow-lg"
                        >
                          <Plus className="w-4 h-4" /> Add Chaser
                        </button>
                     </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                       {settings.characters.map((char, idx) => (
                         <div key={char.id} className="group/card bg-black/30 p-5 rounded-3xl border border-white/5 flex gap-5 relative hover:border-[#ffcc00]/30 transition-all">
                            <div className="w-20 h-20 rounded-2xl overflow-hidden bg-slate-800 border-2 border-white/5 relative group">
                                <img src={char.image} className="w-full h-full object-cover" />
                                <label className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                                  <Zap className="w-6 h-6 text-[#ffcc00]" />
                                  <input type="file" className="hidden" accept="image/*" onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (file) {
                                          const reader = new FileReader();
                                          reader.onloadend = () => updateCharacter(idx, 'image', reader.result as string);
                                          reader.readAsDataURL(file);
                                      }
                                  }} />
                                </label>
                            </div>
                            <div className="flex-1 space-y-2">
                                <input 
                                  type="text" value={char.name}
                                  onChange={(e) => updateCharacter(idx, 'name', e.target.value)}
                                  className="w-full bg-transparent border-none font-black uppercase text-sm focus:text-[#ffcc00] transition-colors"
                                />
                                <input 
                                  type="text" value={char.image}
                                  onChange={(e) => updateCharacter(idx, 'image', e.target.value)}
                                  className="w-full bg-transparent border-none text-[9px] text-white/20 truncate"
                                />
                            </div>
                            <button 
                              onClick={() => removeCharacter(char.id)}
                              className="absolute -top-2 -right-2 w-8 h-8 bg-black rounded-full border border-white/10 flex items-center justify-center opacity-0 group-hover/card:opacity-100 transition-all hover:text-red-500 shadow-xl"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                         </div>
                       ))}
                     </div>
                   </motion.div>
                 )}
               </AnimatePresence>
            </main>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-40 border-2 border-dashed border-white/5 rounded-[3rem]">
            <Loader2 className="w-12 h-12 animate-spin text-[#ffcc00] mb-6" />
            <p className="text-xs font-black uppercase tracking-[0.3em] text-white/20">Establishing Data Pipeline...</p>
          </div>
        )}

        <footer className="fixed bottom-8 left-1/2 -translate-x-1/2 w-full max-w-4xl px-4 z-[100]">
           <button 
             onClick={handleSave} disabled={saving || !settings}
             className="w-full bg-[#ffcc00] hover:bg-white text-black font-black uppercase text-sm tracking-[0.2em] py-8 rounded-[2.5rem] shadow-[0_20px_60px_rgba(255,204,0,0.4)] transition-all flex items-center justify-center gap-4 active:scale-95 disabled:grayscale"
           >
             {saving ? <Loader2 className="w-7 h-7 animate-spin" /> : <Save className="w-7 h-7" />}
             Deploy System Updates & Compile
           </button>
        </footer>
      </div>
    </div>
  );
}
