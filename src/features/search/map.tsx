"use client";

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
import { circlePolygon } from "./radius-circle";

/*
 * MapLibre resolves its worker next to its own module URL, which the
 * bundler does not emit. Point it at the worker file as a static asset
 * instead (the file is self-contained). This module only runs in the
 * browser: it is loaded with next/dynamic and ssr: false.
 */
setWorkerUrl(new URL("maplibre-gl/dist/maplibre-gl-worker.mjs", import.meta.url).href);

export interface SearchMapProps {
  center: Coordinates;
  radiusMiles: number;
  /** Rows in list order; the pin number is the index plus one. Rows without coordinates get no pin. */
  schools: SchoolSummary[];
  hoveredCds: CdsCode | null;
  onHover: (cds: CdsCode | null) => void;
  /** A pin was clicked: scroll the matching row into view. */
  onSelect: (cds: CdsCode) => void;
  /** Tooltip for a pin: "Result 3: Name". */
  pinTitle: (number: number, name: string) => string;
  homeTitle: string;
  className?: string;
}

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

function ringBounds(center: Coordinates, radiusMiles: number): LngLatBoundsLike {
  const box = boundingBox(center, milesToMeters(radiusMiles));
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
  className,
}: SearchMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markersRef = useRef(new Map<CdsCode, { marker: Marker; pin: HTMLElement }>());
  const homeRef = useRef<Marker | null>(null);
  const [styleReady, setStyleReady] = useState(0);
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
      bounds: ringBounds(center, radiusMiles),
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
    map.on("style.load", () => setStyleReady((n) => n + 1));
    // On narrow maps the attribution is a toggle that MapLibre opens by default, covering a
    // third of a phone-sized map. Start it collapsed; the "i" button still reveals the credits.
    map.once("load", () => {
      const attribution = container.querySelector(".maplibregl-ctrl-attrib.maplibregl-compact");
      attribution?.classList.remove("maplibregl-compact-show");
      attribution?.removeAttribute("open");
    });
    mapRef.current = map;
    return () => {
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
    map.setStyle(next);
  }, [dark]);

  // Ring: (re)add after each style load, then keep its data and color current.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || styleReady === 0) return;
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
    if (!homeRef.current) {
      const el = document.createElement("div");
      el.setAttribute("aria-hidden", "true");
      el.title = homeTitle;
      el.innerHTML =
        '<span class="block size-3.5 rounded-full border-2 border-bg bg-fg shadow-popover"></span>';
      homeRef.current = new Marker({ element: el })
        .setLngLat([center.longitude, center.latitude])
        .addTo(map);
    } else {
      homeRef.current.setLngLat([center.longitude, center.latitude]);
    }
    map.fitBounds(ringBounds(center, radiusMiles), {
      padding: FIT_PADDING,
      animate: !prefersReducedMotion(),
    });
  }, [center, radiusMiles, homeTitle]);

  // Pins follow the rows.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    for (const { marker } of markersRef.current.values()) marker.remove();
    markersRef.current.clear();
    schools.forEach((row, index) => {
      const coords = row.school.coordinates;
      if (!coords) return;
      const cds = row.school.cds;
      const el = document.createElement("div");
      el.setAttribute("aria-hidden", "true");
      el.title = pinTitle(index + 1, row.school.name);
      const pin = document.createElement("span");
      pin.className = `flex size-6 cursor-pointer items-center justify-center rounded-full border-2 border-bg text-xs font-medium text-fg-on-accent shadow-popover transition-transform ${pinClass[row.school.type]}`;
      pin.textContent = String(index + 1);
      el.append(pin);
      el.addEventListener("mouseenter", () => callbacks.current.onHover(cds));
      el.addEventListener("mouseleave", () => callbacks.current.onHover(null));
      el.addEventListener("click", () => callbacks.current.onSelect(cds));
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

  return <div ref={containerRef} className={className} />;
}
