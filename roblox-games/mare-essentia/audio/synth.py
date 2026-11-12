#!/usr/bin/env python3
"""마리 에센시아 오리지널 음악·효과음 합성기 (코드로 직접 합성한 창작물).
실행: python3 synth.py  → out/*.ogg + manifest.json 생성. 외부 샘플·저작물 사용 없음."""
import numpy as np, subprocess, json, os, wave, sys
SR = 32000
rng = np.random.default_rng(7)
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "out")
os.makedirs(OUT, exist_ok=True)

def mtof(m): return 440.0 * 2 ** ((m - 69) / 12)
def t_(d): return np.arange(int(SR * d)) / SR
def env(n, a=0.01, d=0.1, s=0.7, r=0.1):
    e = np.ones(n)
    a_, d_, r_ = int(a * SR), int(d * SR), int(r * SR)
    a_ = max(1, min(a_, n)); e[:a_] = np.linspace(0, 1, a_)
    d_ = min(d_, max(0, n - a_)); e[a_:a_ + d_] = np.linspace(1, s, d_) if d_ else e[a_:a_ + d_]
    e[a_ + d_:] = s
    r_ = min(r_, n); e[n - r_:] *= np.linspace(1, 0, r_) if r_ else 1
    return e
def lp(x, fc):
    a = np.exp(-2 * np.pi * fc / SR); y = np.zeros_like(x); p = 0.0
    for i in range(len(x)):
        p = (1 - a) * x[i] + a * p; y[i] = p
    return y
def lp_fast(x, fc):
    # FFT 기반 저역 통과 (긴 신호용)
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR)
    X *= 1 / (1 + (f / fc) ** 4); return np.fft.irfft(X, len(x))
def hp_fast(x, fc):
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR)
    X *= 1 - 1 / (1 + (f / fc) ** 4); return np.fft.irfft(X, len(x))
def reverb(x, secs=1.6, wet=0.25):
    n = int(SR * secs); ir = rng.standard_normal(n) * np.exp(-np.arange(n) / (SR * secs / 4)); ir[:int(0.01*SR)] *= np.linspace(0,1,int(0.01*SR))
    y = np.fft.irfft(np.fft.rfft(x, len(x) + n) * np.fft.rfft(ir, len(x) + n), len(x) + n)[:len(x)]
    y /= (np.max(np.abs(y)) + 1e-9); return x * (1 - wet) + y * wet * np.max(np.abs(x))
def norm(x, peak=0.85):
    return x / (np.max(np.abs(x)) + 1e-9) * peak

# --- 악기 ---
def pluck(m, d=0.9, bright=0.5):
    f = mtof(m); n = int(SR * d); p = max(2, int(SR / f)); buf = rng.uniform(-1, 1, p); out = np.zeros(n)
    for i in range(n):
        out[i] = buf[i % p]; buf[i % p] = bright * 0.5 * (buf[i % p] + buf[(i + 1) % p]) + (1 - bright) * 0.5 * buf[i % p] * 0.998 + 0.5 * bright * 0.0
        buf[i % p] = 0.996 * 0.5 * (buf[i % p] + buf[(i + 1) % p])
    return out * np.linspace(1, 0.4, n)
def flute(m, d, vib=5.0):
    n = int(SR * d); t = np.arange(n) / SR; f = mtof(m) * (1 + 0.004 * np.sin(2 * np.pi * vib * t) * np.minimum(1, t * 3))
    ph = 2 * np.pi * np.cumsum(f) / SR
    x = np.sin(ph) + 0.3 * np.sin(2 * ph) + 0.12 * np.sin(3 * ph) + 0.03 * rng.standard_normal(n)
    return x * env(n, 0.06, 0.1, 0.8, 0.12)
def fiddle(m, d):
    n = int(SR * d); t = np.arange(n) / SR; f = mtof(m) * (1 + 0.005 * np.sin(2 * np.pi * 5.5 * t) * np.minimum(1, t * 4))
    ph = 2 * np.pi * np.cumsum(f) / SR; saw = sum(np.sin(k * ph) / k for k in range(1, 9))
    return lp_fast(saw, 3200) * env(n, 0.04, 0.1, 0.75, 0.1) * 0.7
def bass(m, d):
    n = int(SR * d); ph = 2 * np.pi * mtof(m) * np.arange(n) / SR
    return (np.arcsin(np.sin(ph)) * 2 / np.pi) * env(n, 0.01, 0.1, 0.7, 0.08)
def brass(m, d):
    n = int(SR * d); ph = 2 * np.pi * mtof(m) * np.arange(n) / SR
    x = sum(np.sin(k * ph) / k ** 0.8 for k in range(1, 7)); return lp_fast(x, 2200) * env(n, 0.05, 0.12, 0.8, 0.1)
def pad(ms, d):
    n = int(SR * d); x = np.zeros(n); t = np.arange(n) / SR
    for m in ms:
        for det in (-0.004, 0, 0.004):
            ph = 2 * np.pi * mtof(m) * (1 + det) * t; x += sum(np.sin(k * ph) / k for k in range(1, 5))
    return lp_fast(x, 1400) * env(n, 0.5, 0.3, 0.85, 0.6) * 0.3
def kick(d=0.25):
    n = int(SR * d); t = np.arange(n) / SR; f = 110 * np.exp(-t * 18) + 40
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 12)
def snare(d=0.18):
    n = int(SR * d); t = np.arange(n) / SR
    return (hp_fast(rng.standard_normal(n), 1500) * 0.7 + np.sin(2 * np.pi * 190 * t) * 0.4) * np.exp(-t * 22)
def tamb(d=0.08):
    n = int(SR * d); t = np.arange(n) / SR
    return hp_fast(rng.standard_normal(n), 6000) * np.exp(-t * 45) * 0.5
def tom(f0=90, d=0.35):
    n = int(SR * d); t = np.arange(n) / SR; f = f0 * (1 + 0.6 * np.exp(-t * 20))
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 9)

class Track:
    def __init__(self, secs): self.buf = np.zeros(int(SR * secs) + SR * 4)
    def add(self, x, at, gain=1.0):
        i = int(at * SR); self.buf[i:i + len(x)] += x[:len(self.buf) - i] * gain
    def done(self, secs, rv=0.25):
        x = self.buf[:int(SR * secs)].copy()
        tail = self.buf[int(SR * secs):int(SR * secs) + int(SR * 2)]
        x[:len(tail)] += tail  # 이음매 없이 이어지게 꼬리를 앞에 접는다
        return norm(reverb(x, 1.8, rv), 0.8)

def write_ogg(name, x, quality=3):
    wav = os.path.join(OUT, name + ".wav"); ogg = os.path.join(OUT, name + ".ogg")
    pcm = (np.clip(x, -1, 1) * 32767).astype(np.int16)
    with wave.open(wav, "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", wav, "-c:a", "libvorbis", "-q:a", str(quality), ogg], check=True)
    os.remove(wav)

# --- 음악 ---
def music_harbor():
    bpm = 84; b = 60 / bpm; bars = 16; secs = bars * 4 * b; T = Track(secs)
    prog = [(50, [62, 66, 69]), (55, [59, 62, 67]), (45, [61, 64, 69]), (50, [62, 66, 69])] * 4  # D G A D
    for i, (root, ch) in enumerate(prog):
        t0 = i * 4 * b
        T.add(pad(ch + [root + 12], 4 * b), t0, 0.7)
        T.add(bass(root, b * 1.8), t0, 0.5); T.add(bass(root + 7, b * 1.8), t0 + 2 * b, 0.4)
        for k, nn in enumerate([ch[0], ch[1], ch[2], ch[1]] * 2):
            T.add(pluck(nn, 0.9), t0 + k * b * 0.5, 0.35)
    mel = [(74, 1.5), (73, .5), (74, 1), (76, 1), (78, 2), (76, 1), (74, 1), (71, 2), (74, 1), (73, 1), (69, 4),
           (71, 1.5), (74, .5), (76, 1), (78, 1), (79, 2), (78, 1), (76, 1), (74, 3), (71, 1), (73, 2), (74, 2)] * 2
    t = 4 * b * 2
    for m, d in mel:
        if t > secs - 1: break
        T.add(flute(m, d * b * 0.95), t, 0.55); t += d * b
    return T.done(secs, 0.3)
def music_sea():
    bpm = 118; b = 60 / bpm; bars = 24; secs = bars * 3 * b; T = Track(secs)  # 6/8 감각 3박
    prog = [(45, 57), (43, 55), (45, 57), (40, 52)] * 4  # Am G Am Em
    for i, (root, top) in enumerate(prog):
        t0 = i * 3 * b
        T.add(bass(root, b * 0.9), t0, 0.6); T.add(bass(root + 7, b * 0.9), t0 + 1.5 * b, 0.5)
        T.add(kick(), t0, 0.7); T.add(tom(95), t0 + 1.5 * b, 0.5)
        for k in range(6): T.add(tamb(), t0 + k * 0.5 * b, 0.5 if k % 2 == 0 else 0.3)
        T.add(snare(), t0 + 2 * b, 0.35)
        for k, nn in enumerate([top, top + 3 if root == 45 else top + 4, top + 7]):
            T.add(pluck(nn, 0.5, 0.6), t0 + k * b, 0.45)
    mel = [(76, 1), (76, .5), (79, .5), (81, 1), (79, 1), (76, 1.5), (74, .5), (72, 1), (74, 1), (76, 2),
           (79, 1), (79, .5), (81, .5), (83, 1), (81, 1), (79, 1.5), (76, .5), (74, 1), (72, 1), (69, 2)] * 3
    t = 0
    for m, d in mel:
        if t > secs - 1: break
        T.add(fiddle(m, d * b * 0.92), t, 0.6); T.add(flute(m + 12, d * b * 0.9), t, 0.18); t += d * b
    return T.done(secs, 0.22)
def music_battle():
    bpm = 148; b = 60 / bpm; bars = 24; secs = bars * 4 * b; T = Track(secs)
    prog = [38, 38, 34, 36] * 4  # Dm Dm Bb C 근음
    for i, root in enumerate(prog):
        t0 = i * 4 * b
        for k in range(8):
            T.add(bass(root, b * 0.45), t0 + k * 0.5 * b, 0.55)
        for k in (0, 2): T.add(kick(), t0 + k * b, 0.85)
        for k in (1, 3): T.add(snare(), t0 + k * b, 0.6)
        T.add(tom(70), t0 + 3.5 * b, 0.6)
        for k, nn in enumerate([root + 24, root + 27, root + 31, root + 27] * 2):
            T.add(brass(nn if i % 4 < 2 else nn + 2, b * 0.4), t0 + k * 0.5 * b, 0.28)
        T.add(pad([root + 12, root + 19, root + 24], 4 * b), t0, 0.5)
    return T.done(secs, 0.2)
def music_market():
    bpm = 116; b = 60 / bpm; bars = 24; secs = bars * 4 * b; T = Track(secs)
    prog = [(48, [60, 64, 67]), (53, [60, 65, 69]), (55, [59, 62, 67]), (48, [60, 64, 67])] * 4
    for i, (root, ch) in enumerate(prog):
        t0 = i * 4 * b
        T.add(bass(root, b * 0.8), t0, 0.5); T.add(bass(root + 7, b * 0.8), t0 + 2 * b, 0.4)
        for k in range(8):
            T.add(pluck(ch[k % 3] + (12 if k % 2 else 0), 0.45, 0.65), t0 + k * 0.5 * b, 0.4)
        T.add(kick(), t0, 0.45); T.add(snare(), t0 + b, 0.2); T.add(kick(), t0 + 2 * b, 0.45); T.add(snare(), t0 + 3 * b, 0.2)
        for k in range(8): T.add(tamb(), t0 + k * 0.5 * b, 0.3)
    mel = [(76, .5), (79, .5), (77, 1), (76, .5), (74, .5), (72, 1), (74, .5), (76, .5), (79, 1), (77, .5), (76, .5), (72, 1)] * 5
    t = 4 * b
    for m, d in mel:
        if t > secs - 1: break
        T.add(flute(m, d * b * 0.9), t, 0.5); t += d * b
    return T.done(secs, 0.2)


# --- 오너 창작 서아프리카 타악기 (112 BPM · 16마디 · 외부 샘플 없음) ---
def music_region_w_africa():
    beat=60.0/112; bars=16; n=round(SR*bars*4*beat)
    r=np.random.default_rng(1177); song=np.zeros(n,dtype=np.float64)
    def add(x,at,gain=1.0):
        i=round(at*SR)%n; a=np.asarray(x,dtype=np.float64)*gain; end=i+len(a)
        if end<=n: song[i:end]+=a
        else:
            size=n-i; song[i:]+=a[:size]; song[:len(a)-size]+=a[size:]
    def low_drum(freq=80,dur=.4):
        t=np.arange(round(dur*SR))/SR; hz=freq*(.76+1.1*np.exp(-t*28))
        phase=2*np.pi*np.cumsum(hz)/SR
        body=(np.sin(phase)+.19*np.sin(2*phase))*np.exp(-t*8)
        slap=r.standard_normal(len(t))*np.exp(-t*53)*.14
        return (body+slap)*(1-np.exp(-t*180))
    def hand_drum(freq=185,dur=.23):
        t=np.arange(round(dur*SR))/SR; hz=freq*(.87+.57*np.exp(-t*45))
        phase=np.cumsum(hz)/SR
        sound=(np.sin(2*np.pi*phase)+.3*np.sin(2*np.pi*2.05*phase))*np.exp(-t*19)
        noise=r.standard_normal(len(t)); noise[1:]-=noise[:-1]*.72
        return (sound+noise*np.exp(-t*44)*.21)*(1-np.exp(-t*220))
    def shaker(dur=.085):
        t=np.arange(round(dur*SR))/SR; noise=r.standard_normal(len(t))
        noise-=np.convolve(noise,np.ones(10)/10,mode='same')
        return .24*noise*np.exp(-t*44)*(1-np.exp(-t*360))
    def wood_note(note,dur=.48):
        t=np.arange(round(dur*SR))/SR; f=440*2**((note-69)/12)
        tone=np.sin(2*np.pi*f*t)+.38*np.sin(2*np.pi*f*3.98*t)+.16*np.sin(2*np.pi*f*9.1*t)
        return tone*np.exp(-t*8)*(1-np.exp(-t*150))
    def low_note(note,dur=.52):
        t=np.arange(round(dur*SR))/SR; f=440*2**((note-69)/12)
        tone=np.sin(2*np.pi*f*t)+.2*np.sin(4*np.pi*f*t)
        return tone*np.exp(-t*7)*(1-np.exp(-t*60))
    roots=[38,41,43,38]*4
    motifs=[
      [(0.,65),(.75,69),(1.5,72),(2.5,69),(3.25,67)],
      [(0.,62),(1.,67),(1.75,69),(2.5,65),(3.5,62)],
      [(.25,67),(1.,69),(1.75,72),(2.75,74),(3.5,72)],
      [(0.,69),(.75,65),(1.5,62),(2.5,67),(3.25,65)]]
    for bar in range(bars):
        start=bar*4*beat; root=roots[bar]
        for b,v in [(0,.79),(1.5,.66),(2.75,.75)]:
            add(low_drum(82 if b==0 else 70),start+b*beat,v)
        if bar%4==3: add(low_drum(96,.25),start+3.65*beat,.49)
        for b,f,v in [(.5,205,.48),(1,190,.54),(2.25,225,.46),(3.25,174,.54)]:
            add(hand_drum(f),start+b*beat,v)
        if bar%2==1:
            add(hand_drum(236,.18),start+1.75*beat,.35)
            add(hand_drum(244,.18),start+3.75*beat,.3)
        for step in range(16):
            b=step/4+(.025 if step%2 else 0)
            v=.15 if step%4==0 else (.11 if step%2==0 else .075)
            add(shaker(),start+b*beat,v)
        for b,note,v in [(0,root,.32),(2,root+7,.24)]:
            add(low_note(note),start+b*beat,v)
        for b,note in motifs[bar%4]:
            add(wood_note(note),start+b*beat,.15 if bar<4 else .21)
        if bar%4==3:
            for k,note in enumerate([74,72,69,67]):
                add(wood_note(note,.26),start+(3.05+k*.22)*beat,.11)
    song=np.tanh(song*1.08); song-=np.mean(song)
    song*=.81/max(1e-8,np.max(np.abs(song)))
    write_ogg("music_region_w_africa",song,quality=4)
    print("OWNER_WEST_AFRICA_ORIGINAL",round(n/SR,2),"seconds")

# --- 효과음 ---
def sfx_click(): n = int(SR * .06); t = np.arange(n) / SR; return norm(np.sin(2*np.pi*1400*t) * np.exp(-t*70) + hp_fast(rng.standard_normal(n), 3000) * np.exp(-t*90) * .3, .6)
def sfx_coin():
    x = np.zeros(int(SR * .7)); t = np.arange(len(x)) / SR
    for f, at in ((1568, 0), (2093, .07)):
        i = int(at*SR); tt = t[:len(x)-i]; x[i:] += (np.sin(2*np.pi*f*tt) + .4*np.sin(2*np.pi*f*2.76*tt)) * np.exp(-tt*9)
    return norm(x, .7)
def sfx_buy(): c = sfx_coin(); return norm(c + np.concatenate([np.zeros(int(SR*.12)), sfx_coin()[:-int(SR*.12)]]) * .7, .7)
def sfx_sell():
    x = np.zeros(int(SR * .9)); t = np.arange(len(x)) / SR
    for f, at in ((784, 0), (988, .09), (1319, .18)):
        i = int(at*SR); tt = t[:len(x)-i]; x[i:] += np.sin(2*np.pi*f*tt) * np.exp(-tt*6)
    return norm(x, .7)
def sfx_cannon():
    n = int(SR * 1.8); t = np.arange(n) / SR
    boom = np.sin(2*np.pi*np.cumsum(70*np.exp(-t*3)+30)/SR) * np.exp(-t*3.2)
    crack = lp_fast(rng.standard_normal(n), 2500) * np.exp(-t*7)
    return norm(reverb(boom + crack * .8, 1.2, .3), .9)
def sfx_hit(): n = int(SR*.5); t = np.arange(n)/SR; return norm(lp_fast(rng.standard_normal(n), 1200)*np.exp(-t*14) + np.sin(2*np.pi*90*t)*np.exp(-t*12), .8)
def sfx_splash(): n = int(SR*1.2); t = np.arange(n)/SR; return norm(lp_fast(hp_fast(rng.standard_normal(n), 400), 5000) * (1 - np.exp(-t*40)) * np.exp(-t*3.2), .7)
def loop_noise(secs, fc_lo, fc_hi, swell):
    n = int(SR*secs); x = rng.standard_normal(n); x = lp_fast(hp_fast(x, fc_lo), fc_hi)
    t = np.arange(n)/SR; x *= 0.55 + 0.45*np.sin(2*np.pi*t/swell)**2
    f = int(SR*1.0); x[:f] = x[:f]*np.linspace(0,1,f) + x[-f:]*np.linspace(1,0,f); return norm(x[:-f], .6)
def sfx_waves(): return loop_noise(22, 120, 1800, 7.3)
def sfx_wind(): return loop_noise(18, 200, 900, 5.1)
def sfx_gull():
    n = int(SR*1.4); t = np.arange(n)/SR; x = np.zeros(n)
    for at, f0, d in ((0, 1800, .4), (.5, 1900, .35), (.95, 1700, .4)):
        i = int(at*SR); m = int(d*SR); tt = np.arange(m)/SR; f = f0*(1+.5*np.sin(np.pi*tt/d)) 
        s = np.sin(2*np.pi*np.cumsum(f)/SR) + .4*np.sin(4*np.pi*np.cumsum(f)/SR); x[i:i+m] += s*np.sin(np.pi*tt/d)**.7
    return norm(x*0.6, .5)
def sfx_bell():
    n = int(SR*2.5); t = np.arange(n)/SR
    return norm(sum(a*np.sin(2*np.pi*f*t)*np.exp(-t*k) for f, a, k in ((660,1,1.6),(1180,.6,2.4),(1650,.4,3),(2250,.25,4))), .7)
def sfx_creak():
    n = int(SR*1.3); t = np.arange(n)/SR; f = 180 + 90*np.sin(2*np.pi*3.1*t) + 40*rng.standard_normal(n).cumsum()/np.sqrt(n)
    return norm(lp_fast(np.sign(np.sin(2*np.pi*np.cumsum(f)/SR))*.5 + hp_fast(rng.standard_normal(n), 800)*.2, 1500) * np.sin(np.pi*t/1.3), .5)
def sfx_fanfare():
    T = Track(2.4)
    for i, (m, d) in enumerate(((62, .25), (66, .25), (69, .25), (74, 1.2))): T.add(brass(m, d*1.1), i*.25, .8); T.add(brass(m-12, d*1.1), i*.25, .4)
    return norm(reverb(T.buf[:int(SR*2.4)], 1.2, .25), .8)
def sfx_error(): n = int(SR*.35); t = np.arange(n)/SR; return norm(np.sign(np.sin(2*np.pi*110*t))*.5*np.exp(-t*5) + np.sin(2*np.pi*80*t)*.5, .6)
def sfx_horn(): n = int(SR*2); t = np.arange(n)/SR; return norm((np.sin(2*np.pi*98*t)+.5*np.sin(2*np.pi*196*t)+.3*np.sin(2*np.pi*294*t)) * env(n, .15, .2, .8, .6), .75)
def sfx_sail(): n = int(SR*.9); t = np.arange(n)/SR; return norm(lp_fast(hp_fast(rng.standard_normal(n), 300), 2600) * np.sin(np.pi*t/.9)**2 * (1+.6*np.sin(2*np.pi*14*t)), .6)

if __name__ == "__main__":
    if sys.argv[1:] == ["--west-africa"]:
        music_region_w_africa()
        sys.exit(0)
    if sys.argv[1:]: raise SystemExit("Unknown track")
    items = [
        ("music_harbor", music_harbor, "음악: 항구", True), ("music_sea", music_sea, "음악: 항해", True),
        ("music_battle", music_battle, "음악: 해전", True), ("music_market", music_market, "음악: 교역소", True),
        ("sfx_click", sfx_click, "효과음: 클릭", False), ("sfx_coin", sfx_coin, "효과음: 코인", False), ("sfx_buy", sfx_buy, "효과음: 구매", False),
        ("sfx_sell", sfx_sell, "효과음: 판매", False), ("sfx_cannon", sfx_cannon, "효과음: 대포", False), ("sfx_hit", sfx_hit, "효과음: 피격", False),
        ("sfx_splash", sfx_splash, "효과음: 물보라", False), ("sfx_waves", sfx_waves, "앰비언트: 파도", True), ("sfx_wind", sfx_wind, "앰비언트: 바람", True),
        ("sfx_gull", sfx_gull, "효과음: 갈매기", False), ("sfx_bell", sfx_bell, "효과음: 종", False), ("sfx_creak", sfx_creak, "효과음: 선체 삐걱", False),
        ("sfx_fanfare", sfx_fanfare, "효과음: 팡파르", False), ("sfx_error", sfx_error, "효과음: 실패", False), ("sfx_horn", sfx_horn, "효과음: 뱃고동", False),
        ("sfx_sail", sfx_sail, "효과음: 돛", False),
    ]
    manifest = []
    for name, fn, label, loop in items:
        x = fn(); write_ogg(name, x); manifest.append({"name": name, "file": "out/" + name + ".ogg", "label": label, "loop": loop, "seconds": round(len(x) / SR, 1)})
        print(name, round(len(x) / SR, 1), "s")
    json.dump({"source": "OWNER_REQUESTED_ORIGINAL_SYNTH_SCORE", "license": "OWNER_CREATED_AUDIO", "tracks": manifest}, open(os.path.join(os.path.dirname(OUT), "manifest.json"), "w"), ensure_ascii=False, indent=1)
