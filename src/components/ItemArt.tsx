import { useState } from "react";
import type { Item } from "../../shared/catalog";

export const itemPhoto = (id: string) => `/img/items/${id}.jpg`;

/**
 * Photographic art for a catalog item. Falls back to the item's sunset gradient
 * if the photo is missing. The box's shape comes from CSS (.item-art--*).
 */
export function ItemArt({ item, size = "md", eager = false }: { item: Item; size?: "sm" | "md" | "lg" | "tall"; eager?: boolean }) {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  return (
    <div
      className={`item-art item-art--${size} ${loaded ? "is-loaded" : ""}`}
      style={{ background: `linear-gradient(160deg, ${item.hue[0]}, ${item.hue[1]})` }}
      role="img"
      aria-label={item.name}
    >
      {!failed && (
        <img
          src={itemPhoto(item.id)}
          alt=""
          loading={eager ? "eager" : "lazy"}
          decoding="async"
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
        />
      )}
      {failed && <span className="item-art__name">{item.name}</span>}
    </div>
  );
}
