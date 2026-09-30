"""Original instrumental manor waltz. No voices, screams or sampled recordings."""
from pathlib import Path
import json, math, wave, hashlib
import numpy as np
ROOT=Path(__file__).resolve().parent/'generated'
SR=24000;BPM=108;BEAT=60/BPM;BARS=48;DURATION=BARS*3*BEAT
audio=np.zeros((int(DURATION*SR),2),dtype=np.float64)
def note(midi,start,length,amp,kind,pan=0):
    n=int(length*SR);t=np.arange(n)/SR;f=440*2**((midi-69)/12)
    if kind=='keys':
        y=sum((.60**(k-1))*np.sin(2*np.pi*f*k*(1+.00035*k*k)*t)*np.exp(-t*(1.5+k*.65)) for k in range(1,6))
        env=np.minimum(t/.012,1)*np.minimum((length-t)/.10,1)
    elif kind=='pluck':
        y=sum(np.sin(2*np.pi*f*k*t)*np.exp(-t*(5+k))/k**1.3 for k in range(1,6));env=np.minimum(t/.008,1)
    else:
        y=sum(np.sin(2*np.pi*f*k*t)/(k**1.8) for k in range(1,7));env=np.minimum(t/.10,1)*np.minimum((length-t)/.22,1)*.7
    y*=np.clip(env,0,1)*amp
    start=int(start*SR)
    # Reverb/delay is wrapped into the loop, so the seam carries a continuous tail.
    for delay,gain in [(0,1),(.115,.10),(.231,.07)]:
        idx=(np.arange(n)+start+int(delay*SR))%len(audio)
        for ch,g in enumerate([math.sqrt((1-pan)/2),math.sqrt((1+pan)/2)]):np.add.at(audio[:,ch],idx,y*gain*g)
chords=[[50,57,62,65],[46,53,58,62],[43,50,58,62],[45,52,61,67]]
motifs=[[74,69,70,69,65,64],[62,65,69,67,65,62],[67,70,74,72,70,67],[69,73,76,74,73,69]]
for bar in range(BARS):
    chord=chords[(bar//2)%4];base=bar*3*BEAT
    note(chord[0]-12,base,BEAT*.90,.15,'wood',-.1)
    for beat in [1,2]:
        for pitch in chord[1:]:note(pitch,base+beat*BEAT,.32,.045,'pluck',-.45)
    motif=motifs[(bar//2)%4]
    if bar%8 in [6,7]:motif=list(reversed(motif))
    for i,pitch in enumerate(motif):
        if (bar+i)%11==0:continue
        note(pitch-(12 if 16<=bar<24 or 40<=bar else 0),base+i*.5*BEAT,1.2,.065,'keys',.30)
    if bar%4==3:note(chord[1],base+2*BEAT,BEAT*.8,.06,'wood',-.25)
peak=float(abs(audio).max());audio*=.74/max(peak,1e-8)
pcm=(np.clip(audio,-1,1)*32767).astype('<i2')
path=ROOT/'manor-waltz.wav'
with wave.open(str(path),'wb') as out:out.setnchannels(2);out.setsampwidth(2);out.setframerate(SR);out.writeframes(pcm.tobytes())
meta={'title':'Mortimer Misses a Step','originalComposition':True,'vocals':False,'screams':False,'bpm':BPM,'meter':'3/4','durationSeconds':DURATION,'sampleRate':SR,'sha256':hashlib.sha256(path.read_bytes()).hexdigest()}
(ROOT/'music-evidence.json').write_text(json.dumps(meta,indent=2)+'\n');print(json.dumps(meta))
