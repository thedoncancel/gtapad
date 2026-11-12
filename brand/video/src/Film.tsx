import type { CSSProperties, ReactNode } from "react";
import { AbsoluteFill, Audio, Easing, Img, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { loadFont as loadAnton } from "@remotion/google-fonts/Anton";
import { loadFont as loadSerif } from "@remotion/google-fonts/InstrumentSerif";
import { loadFont as loadHud } from "@remotion/google-fonts/ChakraPetch";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";

const DISPLAY = loadAnton().fontFamily;
const SERIF = loadSerif("italic").fontFamily;
const HUD = loadHud("normal", { weights: ["500", "700"] }).fontFamily;
const BODY = loadInter("normal", { weights: ["400", "500"], subsets: ["latin"] }).fontFamily;

export const FPS = 60;
const s = (sec: number) => Math.round(sec * FPS);

// gtapad.com palette
const C = {
  bg: "#09070a",
  panel: "#141015",
  panel2: "#1c161d",
  line: "rgba(241,236,228,0.12)",
  text: "#f1ece4",
  muted: "#9d948f",
  pink: "#ff2e88",
  orange: "#ff8a3d",
  gold: "#ffd166",
  teal: "#19e3d0",
};
const HOT = `linear-gradient(90deg, ${C.pink}, ${C.orange})`;

/** Scene starts in seconds. sound.py uses the same timeline. */
export const T = { open: 0, plate: 2.5, streets: 5.5, grabs: 12, one: 17.5, pair: 24, end: 28, out: 33 };
export const TOTAL = s(T.out);

const ease = Easing.bezier(0.22, 1, 0.36, 1);
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const lerp = (f: number, a: number, b: number, from: number, to: number, e = ease) => interpolate(f, [a, b], [from, to], { ...clamp, easing: e });

type It = { id: string; name: string; tag: string };
const item = (id: string, name: string, tag: string): It => ({ id, name, tag });
const STREETS: It[] = [
  item("lucia", "Lucia Caminos", "LUCIA"),
  item("trevor", "Trevor Philips", "TREVOR"),
  item("sprunk", "Sprunk", "SPRUNK"),
  item("maze-bank", "Maze Bank Tower", "MAZE"),
  item("boobie", "Boobie Ike", "BOOBIE"),
  item("zentorno", "Zentorno", "ZENT"),
  item("franklin", "Franklin Clinton", "FRANK"),
  item("cal", "Cal Hampton", "CAL"),
  item("michael", "Michael De Santa", "MIKE"),
  item("raul", "Raul Bautista", "RAUL"),
  item("lamar", "Lamar Davis", "LAMAR"),
  item("sandy-shores", "Sandy Shores", "SANDY"),
];
const GRABS: It[] = [
  item("jason", "Jason Duval", "GTA VI"),
  item("infernus", "Infernus", "Series"),
  item("vice-city", "Vice City", "GTA VI"),
  item("oppressor", "Oppressor Mk II", "GTA Online"),
  item("tommy", "Tommy Vercetti", "Vice City"),
  item("five-stars", "Five Stars", "Series"),
  item("cayo-perico", "Cayo Perico", "GTA Online"),
  item("hydra", "Hydra", "Series"),
  item("cj", "Carl Johnson", "San Andreas"),
];
const pic = (id: string) => staticFile(`img/items/${id}.jpg`);

// ------------------------------------------------------------------ shared pieces

/** Slow liquid light behind everything. */
function Backdrop() {
  const t = useCurrentFrame() / FPS;
  const blob = (x: string, y: string, w: number, color: string, a: number, b: number): CSSProperties => ({
    position: "absolute",
    width: w,
    height: w * 0.8,
    left: x,
    top: y,
    borderRadius: "50%",
    background: color,
    filter: "blur(170px)",
    transform: `translate(${-50 + Math.sin(t / a) * 9}%, ${-50 + Math.cos(t / b) * 7}%)`,
  });
  return (
    <AbsoluteFill style={{ background: C.bg, overflow: "hidden" }}>
      <div style={blob("70%", "30%", 1000, "rgba(255,46,136,0.20)", 4.2, 5.1)} />
      <div style={blob("25%", "75%", 900, "rgba(255,138,61,0.16)", 5.3, 3.9)} />
      <div style={blob("45%", "50%", 700, "rgba(25,227,208,0.06)", 6.1, 4.4)} />
    </AbsoluteFill>
  );
}

/** Each scene arrives out of a soft blur and leaves into one, like liquid settling. */
function Scene({ len, children }: { len: number; children: ReactNode }) {
  const f = useCurrentFrame();
  const inn = lerp(f, 0, s(0.7), 0, 1);
  const out = lerp(f, len - s(0.45), len, 0, 1, Easing.in(Easing.cubic));
  const blur = (1 - inn) * 18 + out * 22;
  return (
    <AbsoluteFill style={{ opacity: inn * (1 - out), filter: blur > 0.2 ? `blur(${blur}px)` : undefined, transform: `scale(${1.04 - inn * 0.04 + out * 0.03})` }}>
      {children}
    </AbsoluteFill>
  );
}

/** Text that rises out of a blur, one word at a time. */
function Words({ text, at, size, font = DISPLAY, color = C.text, italic, upper = true, gap = 0.26, step = 5, style }: { text: string; at: number; size: number; font?: string; color?: string; italic?: boolean; upper?: boolean; gap?: number; step?: number; style?: CSSProperties }) {
  const f = useCurrentFrame();
  return (
    <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: `0 ${size * gap}px`, ...style }}>
      {text.split(" ").map((w, i) => {
        const p = lerp(f, at + i * step, at + i * step + s(0.8), 0, 1);
        return (
          <span key={i} style={{ display: "inline-block", fontFamily: font, fontSize: size, lineHeight: 1, color, fontStyle: italic ? "italic" : "normal", textTransform: upper ? "uppercase" : "none", opacity: p, filter: `blur(${(1 - p) * 14}px)`, transform: `translateY(${(1 - p) * size * 0.35}px)` }}>
            {w}
          </span>
        );
      })}
    </div>
  );
}

function Kicker({ children, at }: { children: ReactNode; at: number }) {
  const f = useCurrentFrame();
  const p = lerp(f, at, at + s(0.6), 0, 1);
  return (
    <div style={{ fontFamily: HUD, fontWeight: 700, fontSize: 22, letterSpacing: "0.32em", textTransform: "uppercase", color: C.pink, opacity: p, transform: `translateY(${(1 - p) * 12}px)` }}>
      {children}
    </div>
  );
}

function Photo({ id, style }: { id: string; style?: CSSProperties }) {
  return <Img src={pic(id)} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", ...style }} />;
}

// ------------------------------------------------------------------ 1. open

function Open() {
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 18 }}>
      <Words text="Every legend" at={s(0.2)} size={180} />
      <Words text="gets a coin." at={s(0.9)} size={150} font={SERIF} color={C.pink} italic upper={false} gap={0.2} />
    </AbsoluteFill>
  );
}

// ------------------------------------------------------------------ 2. plate

function Plate() {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const k = spring({ frame: f - 4, fps, config: { damping: 16, mass: 0.9, stiffness: 90 } });
  const sheen = lerp(f, s(0.6), s(1.6), -40, 140, Easing.inOut(Easing.cubic));
  const tilt = interpolate(f, [0, s(3)], [8, -4]);
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 46 }}>
      <div style={{ position: "relative", width: 900, transform: `perspective(1600px) rotateX(${tilt}deg) scale(${0.82 + k * 0.18})`, opacity: k, borderRadius: 40, overflow: "hidden", boxShadow: "0 60px 120px rgba(0,0,0,0.6), 0 0 120px rgba(255,46,136,0.18)" }}>
        <Img src={staticFile("brand/plate.svg")} style={{ width: "100%", display: "block" }} />
        <div style={{ position: "absolute", inset: 0, background: `linear-gradient(105deg, transparent ${sheen - 18}%, rgba(255,255,255,0.55) ${sheen}%, transparent ${sheen + 18}%)`, mixBlendMode: "soft-light" }} />
      </div>
      <Kicker at={s(1.2)}>The GTA launchpad on Solana</Kicker>
    </AbsoluteFill>
  );
}

// ------------------------------------------------------------------ 3. streets

function CoinCard({ it, i }: { it: It; i: number }) {
  const f = useCurrentFrame();
  const land = lerp(f, s(0.3) + i * 3, s(1.3) + i * 3, 0, 1);
  const fill = 0.18 + ((i * 37) % 70) / 100;
  const prog = lerp(f, s(1) + i * 3, s(4.5) + i * 3, 0.05, fill, Easing.inOut(Easing.cubic));
  return (
    <div style={{ width: 300, background: C.panel, border: `1px solid ${C.line}`, borderRadius: 16, overflow: "hidden", opacity: land, transform: `translateY(${(1 - land) * 60}px)`, boxShadow: "0 30px 60px rgba(0,0,0,0.45)" }}>
      <div style={{ height: 260, position: "relative" }}>
        <Photo id={it.id} />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, transparent 55%, rgba(9,7,10,0.85))" }} />
        <div style={{ position: "absolute", left: 14, bottom: 12, fontFamily: HUD, fontSize: 14, letterSpacing: "0.12em", color: C.text, textTransform: "uppercase" }}>{it.name}</div>
      </div>
      <div style={{ padding: "14px 16px 18px", display: "grid", gap: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <span style={{ fontFamily: DISPLAY, fontSize: 30, color: C.text }}>${it.tag}</span>
          <span style={{ fontFamily: HUD, fontSize: 14, color: C.muted }}>{Math.round(prog * 100)}%</span>
        </div>
        <div style={{ height: 6, borderRadius: 3, background: "rgba(241,236,228,0.08)", overflow: "hidden" }}>
          <div style={{ width: `${prog * 100}%`, height: "100%", background: HOT, borderRadius: 3 }} />
        </div>
      </div>
    </div>
  );
}

const CHIPS = ["Hot", "New", "Near graduation", "Characters", "Rides", "Places"];

function Streets() {
  const f = useCurrentFrame();
  const drift = interpolate(f, [0, s(6.5)], [120, -420]);
  const active = Math.min(2, Math.floor(Math.max(0, f - s(1.6)) / s(1.4)));
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: 120, top: 150, width: 640, display: "grid", gap: 26 }}>
        <Kicker at={s(0.2)}>Live coins</Kicker>
        <div style={{ textAlign: "left" }}>
          <Words text="The" at={s(0.35)} size={150} style={{ justifyContent: "flex-start" }} />
          <Words text="Streets." at={s(0.55)} size={150} font={SERIF} color={C.pink} italic upper={false} style={{ justifyContent: "flex-start" }} />
        </div>
        <div style={{ fontFamily: BODY, fontSize: 30, lineHeight: 1.4, color: C.muted, opacity: lerp(f, s(1.2), s(2), 0, 1) }}>
          Every coin on GTApad, live on its pump.fun curve.
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 10 }}>
          {CHIPS.map((c, i) => {
            const on = i === active;
            const p = lerp(f, s(1.4) + i * 4, s(2) + i * 4, 0, 1);
            return (
              <span key={c} style={{ fontFamily: HUD, fontWeight: 500, fontSize: 18, letterSpacing: "0.08em", textTransform: "uppercase", padding: "10px 18px", borderRadius: 999, border: `1px solid ${on ? C.pink : C.line}`, background: on ? "rgba(255,46,136,0.16)" : "transparent", color: on ? C.text : C.muted, opacity: p, transform: `scale(${on ? 1.05 : 1})` }}>
                {c}
              </span>
            );
          })}
        </div>
      </div>
      <div style={{ position: "absolute", left: 820, top: 0, width: 1300, height: 1080, perspective: 2200, overflow: "visible" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 300px)", gap: 28, transform: `rotateX(18deg) rotateY(-14deg) rotateZ(3deg) translateY(${drift}px)`, transformOrigin: "50% 30%" }}>
          {STREETS.map((it, i) => <CoinCard key={it.id} it={it} i={i} />)}
        </div>
      </div>
    </AbsoluteFill>
  );
}

// ------------------------------------------------------------------ 4. up for grabs

function Grabs() {
  const f = useCurrentFrame();
  const x = interpolate(f, [0, s(5.5)], [260, -1260]);
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", top: 110, width: "100%", display: "grid", justifyItems: "center", gap: 18 }}>
        <Kicker at={s(0.15)}>Unclaimed</Kicker>
        <div style={{ display: "flex", alignItems: "baseline", gap: 30 }}>
          <Words text="Up for" at={s(0.3)} size={130} />
          <Words text="grabs." at={s(0.55)} size={130} font={SERIF} color={C.pink} italic upper={false} />
        </div>
      </div>
      <div style={{ position: "absolute", top: 400, left: 0, display: "flex", gap: 30, transform: `translateX(${x}px)` }}>
        {GRABS.map((it, i) => {
          const p = lerp(f, s(0.5) + i * 4, s(1.4) + i * 4, 0, 1);
          const bob = Math.sin((f + i * 23) / 34) * 8;
          return (
            <div key={it.id} style={{ width: 330, height: 460, borderRadius: 18, overflow: "hidden", position: "relative", flex: "none", border: `1px solid ${C.line}`, boxShadow: "0 40px 80px rgba(0,0,0,0.5)", opacity: p, transform: `translateY(${(1 - p) * 80 + bob}px) scale(${0.92 + p * 0.08})` }}>
              <Photo id={it.id} />
              <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(9,7,10,0.1) 40%, rgba(9,7,10,0.9))" }} />
              <span style={{ position: "absolute", top: 16, left: 16, fontFamily: HUD, fontWeight: 700, fontSize: 14, letterSpacing: "0.14em", textTransform: "uppercase", padding: "6px 12px", borderRadius: 999, background: "rgba(9,7,10,0.6)", border: `1px solid ${C.line}`, color: C.gold }}>Up for grabs</span>
              <div style={{ position: "absolute", left: 18, bottom: 18, right: 18 }}>
                <div style={{ fontFamily: DISPLAY, fontSize: 38, color: C.text, textTransform: "uppercase", lineHeight: 1 }}>{it.name}</div>
                <div style={{ fontFamily: HUD, fontSize: 15, letterSpacing: "0.12em", color: C.muted, textTransform: "uppercase", marginTop: 8 }}>{it.tag}</div>
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ position: "absolute", bottom: 90, width: "100%", textAlign: "center", fontFamily: BODY, fontSize: 30, color: C.muted, opacity: lerp(f, s(1.6), s(2.4), 0, 1) }}>
        51 characters, rides, places and brands. Each one waiting for its coin.
      </div>
    </AbsoluteFill>
  );
}

// ------------------------------------------------------------------ 5. one coin per item, picture becomes the logo

function OnePer() {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const stamp = spring({ frame: f - s(1.3), fps, config: { damping: 11, stiffness: 160, mass: 0.8 } });
  const pick = spring({ frame: f - s(3.0), fps, config: { damping: 15, stiffness: 110 } });
  const fly = lerp(f, s(3.8), s(4.9), 0, 1, Easing.inOut(Easing.cubic));
  const caption2 = lerp(f, s(4.6), s(5.3), 0, 1);
  const lucia = lerp(f, s(2.7), s(3.4), 0, 1);
  // the Infernus photo shrinks from the card into the round logo on the coin preview
  // lands in the preview card's logo slot (card at 1260,470 with 30px padding; this box starts at 760,400)
  const logoX = interpolate(fly, [0, 1], [0, 530]);
  const logoY = interpolate(fly, [0, 1], [0, 100]);
  const logoW = interpolate(fly, [0, 1], [400, 120]);
  const logoH = interpolate(fly, [0, 1], [520, 120]);
  const logoR = interpolate(fly, [0, 1], [18, 60]);
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", top: 90, width: "100%", height: 240 }}>
        <div style={{ position: "absolute", inset: 0, display: "grid", justifyItems: "center", alignContent: "start", gap: 10, opacity: 1 - caption2, filter: caption2 > 0.01 ? `blur(${caption2 * 12}px)` : undefined }}>
          <Words text="One coin" at={s(0.2)} size={110} />
          <Words text="per legend." at={s(0.45)} size={100} font={SERIF} color={C.pink} italic upper={false} />
        </div>
        <div style={{ position: "absolute", inset: 0, display: "grid", justifyItems: "center", alignContent: "start", gap: 10, opacity: caption2, filter: `blur(${(1 - caption2) * 12}px)` }}>
          <div style={{ fontFamily: DISPLAY, fontSize: 110, color: C.text, lineHeight: 1, textTransform: "uppercase" }}>Its picture</div>
          <div style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 100, color: C.pink, lineHeight: 1 }}>is your logo.</div>
        </div>
      </div>

      {/* Lucia: taken */}
      <div style={{ position: "absolute", left: 300, top: 400, width: 400, height: 520, borderRadius: 18, overflow: "hidden", border: `1px solid ${C.line}`, opacity: 1 - lucia * 0.85, transform: `translateX(${-lucia * 120}px) scale(${1 - lucia * 0.08})`, filter: `saturate(${1 - stamp * 0.6})` }}>
        <Photo id="lucia" />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, transparent 50%, rgba(9,7,10,0.9))" }} />
        <div style={{ position: "absolute", left: 20, bottom: 18, fontFamily: DISPLAY, fontSize: 40, color: C.text, textTransform: "uppercase" }}>Lucia Caminos</div>
        <div style={{ position: "absolute", left: "50%", top: "42%", transform: `translate(-50%,-50%) rotate(-10deg) scale(${2.2 - stamp * 1.2})`, opacity: Math.min(1, stamp * 1.4), fontFamily: DISPLAY, fontSize: 92, letterSpacing: "0.06em", color: C.pink, border: `6px solid ${C.pink}`, borderRadius: 14, padding: "4px 26px", background: "rgba(9,7,10,0.55)" }}>
          TAKEN
        </div>
      </div>

      {/* Infernus: picked */}
      <div style={{ position: "absolute", zIndex: 2, left: 760, top: 400, width: 400, height: 520, opacity: lerp(f, s(0.6), s(1.2), 0, 1) }}>
        <div style={{ position: "absolute", inset: -10, borderRadius: 26, border: `3px solid ${C.pink}`, opacity: pick * (1 - fly), boxShadow: `0 0 ${60 * pick}px rgba(255,46,136,0.55)` }} />
        <div style={{ position: "absolute", inset: 0, borderRadius: 18, overflow: "hidden", border: `1px solid ${C.line}`, transform: `scale(${1 + pick * 0.04})`, opacity: 1 - fly * 0.65 }}>
          <Photo id="infernus" />
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, transparent 50%, rgba(9,7,10,0.9))" }} />
          <div style={{ position: "absolute", left: 20, bottom: 18, fontFamily: DISPLAY, fontSize: 40, color: C.text, textTransform: "uppercase" }}>Infernus</div>
        </div>
        <div style={{ position: "absolute", zIndex: 5, left: logoX, top: logoY, width: logoW, height: logoH, borderRadius: logoR, overflow: "hidden", opacity: fly > 0.01 ? 1 : 0, boxShadow: "0 20px 50px rgba(0,0,0,0.55)", border: `${fly * 4}px solid ${C.panel}` }}>
          <Photo id="infernus" style={{ objectPosition: "50% 35%" }} />
        </div>
      </div>

      {/* coin preview the logo lands on */}
      <div style={{ position: "absolute", left: 1260, top: 470, width: 470, padding: "30px 30px 30px 180px", borderRadius: 22, background: C.panel, border: `1px solid ${C.line}`, opacity: lerp(f, s(3.6), s(4.2), 0, 1), transform: `translateY(${lerp(f, s(3.6), s(4.3), 30, 0)}px)` }}>
        <div style={{ fontFamily: DISPLAY, fontSize: 52, color: C.text, lineHeight: 1 }}>$INFERNUS</div>
        <div style={{ fontFamily: HUD, fontSize: 16, letterSpacing: "0.12em", color: C.muted, textTransform: "uppercase", marginTop: 10 }}>Series · legendary</div>
        <div style={{ marginTop: 18, height: 6, borderRadius: 3, background: "rgba(241,236,228,0.08)", overflow: "hidden" }}>
          <div style={{ width: `${lerp(f, s(5), s(6.4), 0, 34)}%`, height: "100%", background: HOT }} />
        </div>
      </div>
    </AbsoluteFill>
  );
}

// ------------------------------------------------------------------ 6. paired to TTWO

function Pair() {
  const f = useCurrentFrame();
  const ring = lerp(f, s(0.8), s(3.0), 0, 1, Easing.inOut(Easing.cubic));
  const R = 190;
  const L = 2 * Math.PI * R;
  const grad = lerp(f, s(2.9), s(3.4), 0, 1);
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 110 }}>
        <div style={{ position: "relative", width: 440, height: 440 }}>
          <svg width={440} height={440} style={{ position: "absolute", inset: 0, transform: "rotate(-90deg)" }}>
            <defs>
              <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor={C.pink} />
                <stop offset="1" stopColor={C.orange} />
              </linearGradient>
            </defs>
            <circle cx={220} cy={220} r={R} fill="none" stroke="rgba(241,236,228,0.08)" strokeWidth={16} />
            <circle cx={220} cy={220} r={R} fill="none" stroke="url(#g)" strokeWidth={16} strokeLinecap="round" strokeDasharray={L} strokeDashoffset={L * (1 - ring)} />
          </svg>
          <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", textAlign: "center" }}>
            <div>
              <div style={{ fontFamily: DISPLAY, fontSize: 110, color: C.text, lineHeight: 1 }}>{Math.round(ring * 100)}%</div>
              <div style={{ fontFamily: HUD, fontSize: 18, letterSpacing: "0.2em", color: grad > 0.5 ? C.gold : C.muted, textTransform: "uppercase", marginTop: 8 }}>{grad > 0.5 ? "Graduated" : "Bonding curve"}</div>
            </div>
          </div>
        </div>
        <div style={{ display: "grid", gap: 22, width: 780 }}>
          <Kicker at={s(0.1)}>Every curve is paired to</Kicker>
          <Words text="$TTWO" at={s(0.3)} size={210} style={{ justifyContent: "flex-start" }} />
          <div style={{ fontFamily: BODY, fontSize: 32, lineHeight: 1.4, color: C.muted, opacity: lerp(f, s(1.2), s(2), 0, 1) }}>
            The tokenized Take-Two share. Fill the curve and the coin graduates to PumpSwap.
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
}

// ------------------------------------------------------------------ 7. end

function End() {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const swap = lerp(f, s(1.9), s(2.5), 0, 1);
  const k = spring({ frame: f - s(2.2), fps, config: { damping: 18, stiffness: 90 } });
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      <div style={{ position: "absolute", opacity: 1 - swap, filter: `blur(${swap * 16}px)`, display: "grid", justifyItems: "center", gap: 10 }}>
        <Words text="GTA VI" at={s(0.1)} size={200} />
        <Words text="is almost here." at={s(0.55)} size={120} font={SERIF} color={C.pink} italic upper={false} gap={0.2} />
      </div>
      <div style={{ display: "grid", justifyItems: "center", gap: 40, opacity: k, transform: `scale(${0.9 + k * 0.1})` }}>
        <Img src={staticFile("brand/plate.svg")} style={{ width: 760, borderRadius: 34, boxShadow: "0 50px 110px rgba(0,0,0,0.6), 0 0 140px rgba(255,46,136,0.2)" }} />
        <div style={{ fontFamily: HUD, fontWeight: 700, fontSize: 40, letterSpacing: "0.24em", color: C.text }}>GTAPAD.COM</div>
      </div>
      <div style={{ position: "absolute", bottom: 40, fontFamily: BODY, fontSize: 16, color: "rgba(157,148,143,0.7)", opacity: k }}>
        Fan-made and unofficial. Not affiliated with Rockstar Games or Take-Two. Images are AI-generated.
      </div>
    </AbsoluteFill>
  );
}

// ------------------------------------------------------------------ film

const SCENES: [number, number, () => ReactNode][] = [
  [T.open, T.plate, Open],
  [T.plate, T.streets, Plate],
  [T.streets, T.grabs, Streets],
  [T.grabs, T.one, Grabs],
  [T.one, T.pair, OnePer],
  [T.pair, T.end, Pair],
  [T.end, T.out, End],
];

export function Film() {
  const { width } = useVideoConfig();
  const k = width / 1920; // everything is laid out for 1920 wide
  return (
    <AbsoluteFill style={{ background: C.bg }}>
      <Backdrop />
      <AbsoluteFill style={{ width: 1920, height: 1080, transform: `scale(${k})`, transformOrigin: "0 0" }}>
        {SCENES.map(([a, b, Comp], i) => (
          <Sequence key={i} from={s(a)} durationInFrames={s(b) - s(a)}>
            <Scene len={s(b) - s(a)}>
              <Comp />
            </Scene>
          </Sequence>
        ))}
      </AbsoluteFill>
      <Audio src={staticFile("video/sound.wav")} />
    </AbsoluteFill>
  );
}
