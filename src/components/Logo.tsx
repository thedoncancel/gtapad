import { BRAND } from "../../shared/config";

/** The palm-sunset lockup. Outlined SVG, so it looks right without web fonts. */
export function Logo({ dark = false }: { dark?: boolean }) {
  return <img className="logo" src={dark ? "/brand/palm-compact-dark.svg" : "/brand/palm-compact.svg"} alt={BRAND.name} width={120} height={40} />;
}

export const SCENES = Array.from({ length: 10 }, (_, i) => `/img/scenes/s${i + 1}.jpg`);
