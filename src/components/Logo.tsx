import { BRAND } from "../../shared/config";

/** The Leonida license-plate mark. Outlined SVG, so it looks right without web fonts. */
export function Logo({ dark = false }: { dark?: boolean }) {
  return <img className="logo" src={dark ? "/brand/plate-compact-dark.svg" : "/brand/plate-compact.svg"} alt={BRAND.name} width={100} height={40} />;
}

export const SCENES = Array.from({ length: 10 }, (_, i) => `/img/scenes/s${i + 1}.jpg`);
