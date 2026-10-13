"use client";

import { PinCard } from "./pin-card";
import {
  Map as MapLibreMap,
  Marker,
  setWorkerUrl,
  type GeoJSONSource,
  type LngLatBoundsLike,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useTheme } from "next-themes";
import { useEffect, useRef, useState } from "react";
import { boundingBox, milesToMeters } from "@/lib/domain/geo";
import type { CdsCode, Coordinates, SchoolSummary, SchoolType } from "@/lib/schemas";
import { boundsOf } from "./pin-bounds";
import { circlePolygon } from "./radius-circle";

/*
 * MapLibre resolves its worker next to its own module URL, which the
 * bundler does not emit. Point it at the worker file as a static asset
 * instead (the file is self-contained). This module only runs in the
 * browser: it is loaded with next/dynamic and ssr: false.
 */
setWorkerUrl(new URL("maplibre-gl/dist/maplibre-gl-worker.mjs", import.meta.url).href);

export interface SearchMapProps {
  /**
   * Where the search is centered, and how far it reaches. Both are given for a
   * search around a place: the map shows that circle. Both are left out for
   * results with no center, such as schools found by name, and the map frames
   * the pins instead.
   */
  center?: Coordinates;
  radiusMiles?: number;
  /** Rows in list order; the pin number is the index plus one. Rows without coordinates get no pin. */
  schools: SchoolSummary[];
  hoveredCds: CdsCode | null;
  onHover: (cds: CdsCode | null) => void;
  /** A pin was clicked with a mouse: open that school's page. */
  onSelect: (cds: CdsCode) => void;
  /** Tooltip for a pin: "Result 3: Name". */
  pinTitle: (number: number, name: string) => string;
  /** Tooltip of the center marker. Only used with `center`. */
  homeTitle?: string;
  /** Link to a school's page, used by the card a tap opens on a touch screen. */
  detailsHref?: (cds: CdsCode) => string;
  className?: string;
}

/** A pin's card: which school, where its pin sits in the map box, and whether a tap pinned it open. */
interface CardState {
  cds: CdsCode;
  pinned: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
  /** Where the map box starts in the window, to tell whether a card fits above its pin. */
  top: number;
}

const CARD_HALF_WIDTH = 120;
const CARD_GAP = 18;
/** Room a card needs above its pin before it flips below. */
const CARD_HEIGHT = 150;
/**
 * A card opened by a tap docks to the bottom edge of a map shorter than this,
 * where there is no room to float it beside the pin. Hover cards never dock:
 * a docked card would sit on top of pins near the bottom, including the one
 * being hovered, which takes the hover away and makes the card flicker.
 */
const DOCK_BELOW_HEIGHT = 340;

const STYLE_LIGHT = "https://tiles.openfreemap.org/styles/positron";
const STYLE_DARK = "https://tiles.openfreemap.org/styles/dark";
const RING_SOURCE = "radius-ring";
const RING_LAYER = "radius-ring-line";
const FIT_PADDING = 28;

/* Literal class names so Tailwind generates them; the color comes from the tokens. */
const pinClass: Record<SchoolType, string> = {
  district: "bg-type-district",
  charter: "bg-type-charter",
  private: "bg-type-private",
};

/** Resolved token value for MapLibre paint, which cannot read CSS variables. */
function tokenColor(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || "#000";
}

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** The view to show: the search circle when there is one, otherwise the pins themselves. */
function viewBounds(
  center: Coordinates | undefined,
  radiusMiles: number | undefined,
  schools: readonly SchoolSummary[],
): LngLatBoundsLike {
  const box =
    center && radiusMiles !== undefined
      ? boundingBox(center, milesToMeters(radiusMiles))
      : boundsOf(
          schools.flatMap((row) => (row.school.coordinates ? [row.school.coordinates] : [])),
        );
  return [
    [box.west, box.south],
    [box.east, box.north],
  ];
}

/**
 * MapLibre map with OpenFreeMap tiles: the home marker, a dashed ring at
 * the search radius, and numbered pins colored by school type. Pins and
 * rows share hover state through the parent. The map is decorative for
 * assistive technology: the canvas is hidden and not focusable, and every
 * marker is aria-hidden. The results list is the accessible path.
 */
export default function SearchMap({
  center,
  radiusMiles,
  schools,
  hoveredCds,
  onHover,
  onSelect,
  pinTitle,
  homeTitle,
  detailsHref,
  className,
}: SearchMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markersRef = useRef(new Map<CdsCode, { marker: Marker; pin: HTMLElement }>());
  const homeRef = useRef<Marker | null>(null);
  const [styleReady, setStyleReady] = useState(0);
  const [card, setCard] = useState<CardState | null>(null);
  const coordsRef = useRef(new Map<CdsCode, Coordinates>());
  /**
   * Whether the CURRENT map instance has finished loading its style. A ref,
   * not state: when the page is restored from history, React keeps state but
   * the map is created again, so a remembered "ready" would be a lie and
   * adding a source would throw "Style is not done loading".
   */
  const styleLoadedRef = useRef(false);
  const { resolvedTheme } = useTheme();
  const dark = resolvedTheme === "dark";

  // Latest callbacks for listeners attached once per marker.
  const callbacks = useRef({ onHover, onSelect });
  useEffect(() => {
    callbacks.current = { onHover, onSelect };
  }, [onHover, onSelect]);

  // Create the map once.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const markers = markersRef.current;
    const map = new MapLibreMap({
      container,
      style: dark ? STYLE_DARK : STYLE_LIGHT,
      bounds: viewBounds(center, radiusMiles, schools),
      fitBoundsOptions: { padding: FIT_PADDING },
      // Default: full text on wide maps, a toggle on narrow ones so it does not cover the pins.
      attributionControl: {},
    });
    map.keyboard.disable();
    const canvas = map.getCanvas();
    canvas.setAttribute("aria-hidden", "true");
    canvas.tabIndex = -1;
    canvas.removeAttribute("role");
    canvas.removeAttribute("aria-label");
    // Fires on first load and after every setStyle, when sources and layers must be re-added.
    // Keep an open card attached to its pin as the map moves, and close it on a tap elsewhere.
    map.on("move", () =>
      setCard((current) => {
        const coords = current ? coordsRef.current.get(current.cds) : undefined;
        if (!current || !coords) return current;
        const at = map.project([coords.longitude, coords.latitude]);
        return { ...current, x: at.x, y: at.y };
      }),
    );
    map.on("click", () => setCard(null));
    styleLoadedRef.current = false;
    map.on("style.load", () => {
      styleLoadedRef.current = true;
      setStyleReady((n) => n + 1);
    });
    // On narrow maps the attribution is a toggle that MapLibre opens by default, covering a
    // third of a phone-sized map. Start it collapsed; the "i" button still reveals the credits.
    map.once("load", () => {
      const attribution = container.querySelector(".maplibregl-ctrl-attrib.maplibregl-compact");
      attribution?.classList.remove("maplibregl-compact-show");
      attribution?.removeAttribute("open");
    });
    mapRef.current = map;
    return () => {
      styleLoadedRef.current = false;
      map.remove();
      mapRef.current = null;
      markers.clear();
      homeRef.current = null;
    };
    // The initial view is read once; later changes go through the effects below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Swap the base style with the theme.
  const styleRef = useRef(dark ? STYLE_DARK : STYLE_LIGHT);
  useEffect(() => {
    const map = mapRef.current;
    const next = dark ? STYLE_DARK : STYLE_LIGHT;
    if (!map || styleRef.current === next) return;
    styleRef.current = next;
    // The style is unusable until the next "style.load".
    styleLoadedRef.current = false;
    map.setStyle(next);
  }, [dark]);

  // Ring: (re)add after each style load, then keep its data and color current.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !styleLoadedRef.current) return;
    if (!center || radiusMiles === undefined) {
      // No search circle to draw.
      if (map.getLayer(RING_LAYER)) map.removeLayer(RING_LAYER);
      if (map.getSource(RING_SOURCE)) map.removeSource(RING_SOURCE);
      return;
    }
    const data = circlePolygon(center, milesToMeters(radiusMiles));
    const color = tokenColor("--accent");
    const source = map.getSource(RING_SOURCE) as GeoJSONSource | undefined;
    if (source) {
      source.setData(data);
      map.setPaintProperty(RING_LAYER, "line-color", color);
    } else {
      map.addSource(RING_SOURCE, { type: "geojson", data });
      map.addLayer({
        id: RING_LAYER,
        type: "line",
        source: RING_SOURCE,
        paint: { "line-color": color, "line-width": 1.5, "line-dasharray": [2, 2] },
      });
    }
  }, [center, radiusMiles, styleReady, dark]);

  // Home marker and view when the search center or radius changes.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (!center || radiusMiles === undefined) {
      homeRef.current?.remove();
      homeRef.current = null;
      return;
    }
    if (!homeRef.current) {
      const el = document.createElement("div");
      el.setAttribute("aria-hidden", "true");
      el.title = homeTitle ?? "";
      el.innerHTML =
        '<span class="block size-3.5 rounded-full border-2 border-bg bg-fg shadow-popover"></span>';
      homeRef.current = new Marker({ element: el })
        .setLngLat([center.longitude, center.latitude])
        .addTo(map);
    } else {
      homeRef.current.setLngLat([center.longitude, center.latitude]);
    }
    map.fitBounds(viewBounds(center, radiusMiles, []), {
      padding: FIT_PADDING,
      animate: !prefersReducedMotion(),
    });
  }, [center, radiusMiles, homeTitle]);

  // With no search circle the view follows the pins: frame whatever schools are listed.
  const centered = center !== undefined && radiusMiles !== undefined;
  useEffect(() => {
    const map = mapRef.current;
    if (!map || centered) return;
    map.fitBounds(viewBounds(undefined, undefined, schools), {
      padding: FIT_PADDING * 2,
      animate: !prefersReducedMotion(),
    });
  }, [centered, schools]);

  // Pins follow the rows.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    for (const { marker } of markersRef.current.values()) marker.remove();
    markersRef.current.clear();
    coordsRef.current.clear();
    const cardAt = (cds: CdsCode, coords: Coordinates, pinned: boolean): CardState => {
      const at = map.project([coords.longitude, coords.latitude]);
      const box = map.getContainer();
      return {
        cds,
        pinned,
        x: at.x,
        y: at.y,
        width: box.clientWidth,
        height: box.clientHeight,
        top: box.getBoundingClientRect().top,
      };
    };
    schools.forEach((row, index) => {
      const coords = row.school.coordinates;
      if (!coords) return;
      const cds = row.school.cds;
      const el = document.createElement("div");
      el.setAttribute("aria-hidden", "true");
      const pin = document.createElement("span");
      pin.className = `flex size-6 cursor-pointer items-center justify-center rounded-full border-2 border-bg text-xs font-medium text-fg-on-accent shadow-popover transition-transform ${pinClass[row.school.type]}`;
      pin.textContent = String(index + 1);
      el.append(pin);
      coordsRef.current.set(cds, coords);
      let pointerType = "mouse";
      el.addEventListener("pointerdown", (event) => {
        pointerType = event.pointerType;
      });
      el.addEventListener("mouseenter", () => {
        callbacks.current.onHover(cds);
        // A card pinned open by a tap stays until it is closed.
        setCard((current) => (current?.pinned ? current : cardAt(cds, coords, false)));
      });
      el.addEventListener("mouseleave", () => {
        callbacks.current.onHover(null);
        setCard((current) => (current?.pinned ? current : null));
      });
      el.addEventListener("click", (event) => {
        // Do not let the map treat this as a tap on empty space, which closes the card.
        event.stopPropagation();
        if (pointerType === "mouse") {
          // With a mouse the card is already showing; a click opens the school's page.
          callbacks.current.onSelect(cds);
        } else {
          // No hover on a touch screen: a tap opens the card and keeps it open.
          setCard(cardAt(cds, coords, true));
        }
      });
      const marker = new Marker({ element: el })
        .setLngLat([coords.longitude, coords.latitude])
        .addTo(map);
      markersRef.current.set(cds, { marker, pin });
    });
  }, [schools, pinTitle]);

  // Highlight the hovered pin.
  useEffect(() => {
    for (const [cds, { marker, pin }] of markersRef.current) {
      const on = cds === hoveredCds;
      pin.classList.toggle("scale-125", on);
      marker.getElement().style.zIndex = on ? "1" : "";
    }
  }, [hoveredCds, schools]);

  const cardIndex = card ? schools.findIndex((row) => row.school.cds === card.cds) : -1;
  const cardRow = cardIndex >= 0 ? schools[cardIndex] : undefined;
  const docked = card !== null && card.pinned && card.height < DOCK_BELOW_HEIGHT;
  // Above the pin when the window has room there, otherwise below. The card may extend
  // past the map box (the box does not clip it), so it never has to cover its own pin.
  const below = card !== null && card.top + card.y < CARD_HEIGHT + CARD_GAP + 8;
  const left = card
    ? card.width < CARD_HALF_WIDTH * 2 + 16
      ? card.width / 2
      : Math.min(Math.max(card.x, CARD_HALF_WIDTH + 8), card.width - CARD_HALF_WIDTH - 8)
    : 0;

  return (
    <div className={["relative rounded-[inherit]", className].filter(Boolean).join(" ")}>
      {/* The map clips itself to the rounded box; the card is a sibling so it is not clipped. */}
      <div ref={containerRef} className="h-full w-full overflow-hidden rounded-[inherit]" />
      {card && cardRow ? (
        <div
          // A hover card takes no pointer events at all, wrapper included, so it can never
          // come between the pointer and a pin.
          className={card.pinned ? "absolute z-10" : "pointer-events-none absolute z-10"}
          style={
            docked
              ? { left: "50%", bottom: 8, transform: "translateX(-50%)" }
              : {
                  left,
                  top: card.y,
                  transform: below
                    ? `translate(-50%, ${CARD_GAP}px)`
                    : `translate(-50%, calc(-100% - ${CARD_GAP}px))`,
                }
          }
        >
          <PinCard
            summary={cardRow}
            number={cardIndex + 1}
            pinned={card.pinned}
            detailsHref={detailsHref?.(card.cds)}
            onClose={() => setCard(null)}
          />
        </div>
      ) : null}
    </div>
  );
}
