"""Synthesizes the film's sound: soft pads, liquid drops, whooshes and chimes. Timeline matches src/Film.tsx (T).
Usage: python3 sound.py out.wav
"""
import sys, wave
import numpy as np

SR = 48000
DUR = 33.0
N = int(SR * DUR)
L = np.zeros(N)
R = np.zeros(N)
rng = np.random.default_rng(7)
T = dict(open=0, plate=2.5, streets=5.5, grabs=12, one=17.5, pair=24, end=28, out=33)


def place(sig, at, gain=1.0, pan=0.0):
    i = int(at * SR)
    if i >= N:
        return
    sig = sig[: N - i] * gain
    L[i : i + len(sig)] += sig * np.sqrt(0.5 * (1 - pan))
    R[i : i + len(sig)] += sig * np.sqrt(0.5 * (1 + pan))


def t_of(d):
    return np.arange(int(d * SR)) / SR


def onepole_lp(x, cut):
    """One-pole low-pass; cut may be an array (Hz per sample)."""
    cut = np.broadcast_to(cut, x.shape)
    a = np.exp(-2 * np.pi * cut / SR)
    y = np.empty_like(x)
    acc = 0.0
    for i in range(len(x)):
        acc = (1 - a[i]) * x[i] + a[i] * acc
        y[i] = acc
    return y


# ---------------------------------------------------------------- voices

def drop(f0=700, rise=2.1, d=0.22):
    """Liquid bloop: a sine that glides up fast and dies quickly, like a water drop."""
    t = t_of(d)
    f = f0 * (1 + (rise - 1) * (1 - np.exp(-t / 0.018)))
    ph = 2 * np.pi * np.cumsum(f) / SR
    env = (1 - np.exp(-t / 0.002)) * np.exp(-t / 0.055)
    return np.sin(ph) * env


def tick(f0=2400, d=0.05):
    t = t_of(d)
    return (np.sin(2 * np.pi * f0 * t) * 0.6 + rng.standard_normal(len(t)) * 0.15) * np.exp(-t / 0.008)


def whoosh(d=1.3, peak=0.75, lo=300, hi=5200):
    """Filtered noise that swells to `peak` (fraction of d) and falls away; the filter opens with it."""
    t = t_of(d)
    x = t / d
    env = np.where(x < peak, (x / peak) ** 2.2, np.exp(-(x - peak) / (1 - peak) * 4.0))
    cut = lo + (hi - lo) * env
    n = rng.standard_normal(len(t))
    y = onepole_lp(onepole_lp(n, cut), cut)
    y = y - onepole_lp(y, 120)  # take out the rumble
    return y * env / (np.abs(y).max() + 1e-9)


def chime(f0=1318.5, d=2.6):
    """Glassy bell: inharmonic partials with long, staggered decays."""
    t = t_of(d)
    out = np.zeros(len(t))
    for ratio, amp, dec in ((1, 1, 1.2), (2.01, 0.45, 0.7), (2.76, 0.3, 0.5), (4.07, 0.16, 0.3), (5.43, 0.08, 0.2)):
        out += amp * np.sin(2 * np.pi * f0 * ratio * t) * np.exp(-t / dec)
    return out * (1 - np.exp(-t / 0.003)) / 2


def thud(d=0.9):
    t = t_of(d)
    f = 38 + 90 * np.exp(-t / 0.045)
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.22)
    click = onepole_lp(rng.standard_normal(len(t)), 2500) * np.exp(-t / 0.012) * 0.8
    return body + click


def pulse(d=0.5):
    """Soft heartbeat kick for the middle section."""
    t = t_of(d)
    f = 45 + 55 * np.exp(-t / 0.03)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.16) * (1 - np.exp(-t / 0.004))


def sweep(f0, f1, d):
    t = t_of(d)
    f = f0 * (f1 / f0) ** (t / d)
    env = np.sin(np.pi * t / d) ** 2
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * env


def note(f, d, attack=1.2, release=1.6):
    """Warm pad voice: a few detuned sines plus a soft octave, slow in and out."""
    t = t_of(d)
    v = np.zeros(len(t))
    for det, amp in ((-0.06, 0.5), (0.0, 0.7), (0.07, 0.5)):
        v += amp * np.sin(2 * np.pi * f * (1 + det / 100 * 12 / 12) * t + rng.uniform(0, 6.28))
    v += 0.18 * np.sin(2 * np.pi * f * 2 * t)
    v *= 1 + 0.15 * np.sin(2 * np.pi * 0.23 * t)
    env = np.minimum(1, t / attack) * np.minimum(1, (d - t) / release)
    return v * np.clip(env, 0, 1)


def hz(midi):
    return 440 * 2 ** ((midi - 69) / 12)


# ---------------------------------------------------------------- the bed: chords under each scene

CHORDS = [  # (start, end, midi notes)  F maj9 → A m9 → D m9 → Bb maj7#11 → C sus → F add9
    (0.0, 5.6, [41, 53, 57, 60, 64, 67]),
    (5.4, 12.1, [45, 52, 55, 60, 64, 71]),
    (11.9, 17.6, [38, 50, 53, 57, 60, 64]),
    (17.4, 24.1, [46, 50, 57, 60, 64, 69]),
    (23.9, 28.1, [48, 55, 60, 62, 67, 74]),
    (27.9, 33.0, [41, 53, 57, 60, 67, 72, 76]),
]
for a, b, notes in CHORDS:
    for k, m in enumerate(notes):
        place(note(hz(m), b - a + 0.2, attack=1.4, release=2.2), a, gain=0.05 if m < 50 else 0.032, pan=(k / (len(notes) - 1) - 0.5) * 0.8)

# soft pulse from the Streets to the end card (100 bpm), dropping out for the GTA VI line
beat = 60 / 100
t = T["streets"] + 0.3
while t < T["end"] - 0.1:
    place(pulse(), t, gain=0.32)
    t += beat

# ---------------------------------------------------------------- events

SCALE = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21]  # major pentatonic around F
def drop_note(i, base=72):
    return hz(base + SCALE[i % len(SCALE)])

# scene changes: a whoosh that peaks on the cut
for k in ("plate", "streets", "grabs", "one", "pair", "end"):
    place(whoosh(1.3, 0.8), T[k] - 1.04, gain=0.22, pan=rng.uniform(-0.3, 0.3))

# 1. open: one drop per word
for i, at in enumerate([0.2, 0.283, 0.9, 0.983, 1.067]):
    place(drop(drop_note(i, 69), 1.9), at + 0.05, gain=0.42, pan=(i - 2) * 0.2)

# 2. plate: chime, sheen swish, kicker tick
place(chime(hz(84)), T["plate"] + 0.08, gain=0.32)
place(chime(hz(91)), T["plate"] + 0.2, gain=0.16, pan=0.4)
place(whoosh(1.0, 0.5, 1500, 9000), T["plate"] + 0.55, gain=0.1, pan=-0.3)
place(tick(), T["plate"] + 1.2, gain=0.25)

# 3. streets: title drops, cards land as soft ticks, chip taps
place(drop(drop_note(0), 2.0), T["streets"] + 0.37, gain=0.4)
place(drop(drop_note(3), 2.0), T["streets"] + 0.57, gain=0.4)
for i in range(12):
    place(tick(1800 + (i % 4) * 300, 0.04), T["streets"] + 0.3 + i * 0.05, gain=0.08, pan=((i % 3) - 1) * 0.5)
for at in (1.6, 3.0):
    place(tick(3000), T["streets"] + at, gain=0.3)
    place(drop(drop_note(5), 1.5, 0.15), T["streets"] + at + 0.01, gain=0.22)

# 4. grabs: title, then each poster rises with a drop climbing the scale
place(drop(drop_note(1), 2.0), T["grabs"] + 0.32, gain=0.4)
place(drop(drop_note(4), 2.0), T["grabs"] + 0.57, gain=0.4)
for i in range(9):
    place(drop(drop_note(i, 67), 1.8, 0.2), T["grabs"] + 0.55 + i * 0.067, gain=0.2, pan=-0.6 + i * 0.15)

# 5. one per legend: TAKEN stamp, pick, the photo pours into the logo
place(drop(drop_note(2), 2.0), T["one"] + 0.22, gain=0.38)
place(drop(drop_note(4), 2.0), T["one"] + 0.47, gain=0.38)
place(thud(), T["one"] + 1.32, gain=0.75)
place(tick(2600), T["one"] + 3.0, gain=0.32)
place(chime(hz(88), 1.4), T["one"] + 3.02, gain=0.14)
place(sweep(320, 1400, 1.1), T["one"] + 3.8, gain=0.09)
place(whoosh(1.1, 0.6, 400, 4000), T["one"] + 3.8, gain=0.12, pan=0.4)
place(drop(drop_note(7), 2.2, 0.3), T["one"] + 4.88, gain=0.45, pan=0.3)

# 6. paired to TTWO: the ring fills with a rising tone, then graduation chime
place(drop(drop_note(3), 2.0), T["pair"] + 0.32, gain=0.4)
place(sweep(220, 880, 2.3), T["pair"] + 0.8, gain=0.06)
place(chime(hz(86)), T["pair"] + 2.95, gain=0.3)
place(chime(hz(93), 2.0), T["pair"] + 3.05, gain=0.14, pan=-0.4)

# 7. end: low swell on GTA VI, drops on the words, big chime on the plate
place(thud(1.4), T["end"] + 0.1, gain=0.4)
for i, at in enumerate([0.1, 0.55, 0.63, 0.72]):
    place(drop(drop_note(i + 1, 69), 1.9), T["end"] + at + 0.05, gain=0.36)
place(chime(hz(77), 3.5), T["end"] + 2.25, gain=0.32)
place(chime(hz(84), 3.5), T["end"] + 2.3, gain=0.26, pan=-0.3)
place(chime(hz(88), 3.0), T["end"] + 2.36, gain=0.2, pan=0.3)

# ---------------------------------------------------------------- space and master

def reverb(x, d=2.8, decay=0.9):
    n = int(d * SR)
    tt = np.arange(n) / SR
    ir = rng.standard_normal(n) * np.exp(-tt / decay)
    ir = onepole_lp(ir, 5000)
    ir /= np.sqrt((ir ** 2).sum())
    size = 1 << int(np.ceil(np.log2(len(x) + n)))
    y = np.fft.irfft(np.fft.rfft(x, size) * np.fft.rfft(ir, size), size)[: len(x)]
    return y

wetL, wetR = reverb(L), reverb(R)
outL = L + wetL * 0.38
outR = R + wetR * 0.38

# fade in and out
tt = np.arange(N) / SR
fade = np.minimum(1, tt / 0.15) * np.clip((DUR - tt) / 1.6, 0, 1)
outL *= fade
outR *= fade

# gentle soft-clip master
peak = max(np.abs(outL).max(), np.abs(outR).max())
outL, outR = (np.tanh(x / peak * 1.2) / np.tanh(1.2) * 0.89 for x in (outL, outR))

pcm = (np.stack([outL, outR], 1) * 32767).astype("<i2")
with wave.open(sys.argv[1], "wb") as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes(pcm.tobytes())
print("wrote", sys.argv[1], f"{DUR}s")
