"use client";

import * as React from "react";
import { motion, type HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils";

/**
 * Liqui Design physical optics and refraction engine for React / Next.js
 * Inspired by https://liqui.design
 *
 * Core architecture:
 * 1. Snell's law (n = 1.5) curvature calculation for realistic edge magnification and bend.
 * 2. Canvas-rendered normal displacement map powering SVG feDisplacementMap.
 * 3. Directional sun specular illumination map (THETA_KEY - top-left, THETA_COUNTER - bottom-right).
 * 4. Multi-layer glass sandwich: Refracting backdrop + Frosted blur + Specular ray plane + Hairline bevel.
 */

const SVG_NS = "http://www.w3.org/2000/svg";
const LUT_SIZE = 128;
const lutCache = new Map<string, { mag: Float32Array; slope: Float32Array }>();

function surfaceLUTs(profile: "squircle" | "convex" | "rim" = "squircle") {
  const cached = lutCache.get(profile);
  if (cached) return cached;

  const mag = new Float32Array(LUT_SIZE);
  const slope = new Float32Array(LUT_SIZE);
  const n = 1.5; // refractive index of optical glass
  const T = 0.6; // slab profile depth

  const h =
    profile === "squircle"
      ? (t: number) => Math.pow(1 - Math.pow(1 - t, 4), 0.25)
      : profile === "convex"
      ? (t: number) => Math.sqrt(1 - (1 - t) * (1 - t))
      : (t: number) => 1 - (1 - t) * (1 - t);

  const eps = 1 / 1024;
  let max = 0;

  for (let i = 0; i < LUT_SIZE; i++) {
    const t = Math.max(i / (LUT_SIZE - 1), eps);
    const hi = Math.min(t + eps, 1);
    const lo = Math.max(t - eps, 0);
    slope[i] = ((h(hi) - h(lo)) / (hi - lo)) * T;

    if (profile === "rim") {
      mag[i] = (1 - t) * (1 - t);
    } else {
      const thetaI = Math.atan(Math.abs(slope[i]));
      const sinThetaT = Math.sin(thetaI) / n;
      const delta = thetaI - Math.asin(Math.min(sinThetaT, 1));
      mag[i] = h(t) * T * Math.tan(delta);
      max = Math.max(max, mag[i]);
    }
  }

  if (max > 0) {
    for (let i = 0; i < LUT_SIZE; i++) mag[i] /= max;
  }

  const luts = { mag, slope };
  lutCache.set(profile, luts);
  return luts;
}

const THETA_KEY = Math.atan2(-0.9, -0.45);
const THETA_COUNTER = Math.atan2(0.9, 0.5);

const imageCache = new Map<string, { map: string; specular: string }>();
const IMAGE_CACHE_MAX = 48;

function glassImages(
  fullW: number,
  fullH: number,
  fullRadius: number,
  fullBezel: number,
  profile: "squircle" | "convex" | "rim" = "squircle"
) {
  const key = `${fullW}x${fullH}r${fullRadius}b${fullBezel}${profile}`;
  const hit = imageCache.get(key);
  if (hit) {
    imageCache.delete(key);
    imageCache.set(key, hit);
    return hit;
  }

  const scale = fullW * fullH > 32000 ? 0.5 : 1;
  const w = Math.ceil(fullW * scale);
  const h = Math.ceil(fullH * scale);
  const radius = fullRadius * scale;
  const bezel = fullBezel * scale;

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const image = ctx.createImageData(w, h);
  const data = image.data;

  const specCanvas = document.createElement("canvas");
  specCanvas.width = w;
  specCanvas.height = h;
  const specCtx = specCanvas.getContext("2d");
  if (!specCtx) return null;

  const specImage = specCtx.createImageData(w, h);
  const spec = specImage.data;

  const { mag: lut } = surfaceLUTs(profile);
  const r = Math.min(radius, w / 2, h / 2);
  const bx = w / 2 - r;
  const by = h / 2 - r;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const px = x + 0.5 - w / 2;
      const py = y + 0.5 - h / 2;
      const qx = Math.abs(px) - bx;
      const qy = Math.abs(py) - by;
      const ox = Math.max(qx, 0);
      const oy = Math.max(qy, 0);
      const depth = -(Math.hypot(ox, oy) + Math.min(Math.max(qx, qy), 0) - r);

      let nx = 0;
      let ny = 0;
      if (qx > 0 && qy > 0) {
        const len = Math.hypot(qx, qy) || 1;
        nx = (Math.sign(px) * qx) / len;
        ny = (Math.sign(py) * qy) / len;
      } else if (qx > qy) {
        nx = Math.sign(px);
      } else {
        ny = Math.sign(py);
      }

      const d = depth / bezel;
      const inRim = d < 1 && d >= 0;
      const idx = inRim ? Math.min(Math.round(d * (LUT_SIZE - 1)), LUT_SIZE - 1) : 0;
      const mag = inRim ? lut[idx] : 0;
      const i = (y * w + x) * 4;

      data[i] = Math.round(128 - nx * mag * 127);
      data[i + 1] = 128;
      data[i + 2] = Math.round(128 - ny * mag * 127);
      data[i + 3] = 255;

      if (inRim) {
        const theta = Math.atan2(py, px);
        const band = Math.exp(-Math.pow((d - 0.2) / 0.4, 2));
        const c1 = Math.max(Math.cos(theta - THETA_KEY), 0);
        const c2 = Math.max(Math.cos(theta - THETA_COUNTER), 0);
        const intensity = Math.min(band * (1.15 * Math.pow(c1, 3) + 0.75 * Math.pow(c2, 3.5)), 1);

        spec[i] = 255;
        spec[i + 1] = 255;
        spec[i + 2] = 255;
        spec[i + 3] = Math.round(intensity * 255);
      }
    }
  }

  ctx.putImageData(image, 0, 0);
  specCtx.putImageData(specImage, 0, 0);

  const result = {
    map: canvas.toDataURL(),
    specular: specCanvas.toDataURL(),
  };

  imageCache.set(key, result);
  if (imageCache.size > IMAGE_CACHE_MAX) {
    const oldest = imageCache.keys().next().value;
    if (oldest) imageCache.delete(oldest);
  }

  return result;
}

let filterHost: SVGSVGElement | null = null;
const filterIds = new Map<string, string>();
let nextFilterId = 0;

function ensureHost(): SVGSVGElement | null {
  if (typeof document === "undefined") return null;
  if (filterHost && filterHost.isConnected) return filterHost;
  filterHost = document.createElementNS(SVG_NS, "svg");
  filterHost.setAttribute("width", "0");
  filterHost.setAttribute("height", "0");
  filterHost.setAttribute("aria-hidden", "true");
  filterHost.style.position = "absolute";
  filterHost.style.pointerEvents = "none";
  document.body.appendChild(filterHost);
  return filterHost;
}

function ensureFilter(params: {
  w: number;
  h: number;
  mapHref: string;
  refraction: number;
}) {
  const { w, h, mapHref, refraction } = params;
  const key = `${w}x${h}|r${refraction}|${mapHref.slice(-24)}`;
  const existing = filterIds.get(key);
  if (existing) return { id: existing };

  const host = ensureHost();
  if (!host) return null;

  const id = `lq-refract-${nextFilterId++}`;
  const filter = document.createElementNS(SVG_NS, "filter");
  filter.setAttribute("id", id);
  filter.setAttribute("x", "0");
  filter.setAttribute("y", "0");
  filter.setAttribute("width", String(w));
  filter.setAttribute("height", String(h));
  filter.setAttribute("filterUnits", "userSpaceOnUse");
  filter.setAttribute("color-interpolation-filters", "sRGB");

  const feImage = document.createElementNS(SVG_NS, "feImage");
  feImage.setAttribute("x", "0");
  feImage.setAttribute("y", "0");
  feImage.setAttribute("width", String(w));
  feImage.setAttribute("height", String(h));
  feImage.setAttribute("result", "map");
  feImage.setAttribute("href", mapHref);
  filter.appendChild(feImage);

  const feDisplacement = document.createElementNS(SVG_NS, "feDisplacementMap");
  feDisplacement.setAttribute("in", "SourceGraphic");
  feDisplacement.setAttribute("in2", "map");
  feDisplacement.setAttribute("scale", String(refraction));
  feDisplacement.setAttribute("xChannelSelector", "R");
  feDisplacement.setAttribute("yChannelSelector", "B");
  filter.appendChild(feDisplacement);

  host.appendChild(filter);
  filterIds.set(key, id);
  return { id };
}

export interface LiquidGlassProps extends React.HTMLAttributes<HTMLDivElement> {
  radius?: number;
  blur?: number;
  refraction?: number;
  bezel?: number;
  specular?: number;
  frost?: number;
  saturation?: number;
  profile?: "squircle" | "convex" | "rim";
  contentClassName?: string;
  elevated?: boolean;
}

export const LiquidGlass = React.forwardRef<HTMLDivElement, LiquidGlassProps>(
  (
    {
      radius = 9999,
      blur = 2,
      refraction = 36,
      bezel = 7,
      specular = 0.4,
      frost = 0.22,
      saturation = 1.9,
      profile = "squircle",
      className,
      contentClassName,
      style,
      children,
      elevated = true,
      ...props
    },
    forwardedRef
  ) => {
    const localRef = React.useRef<HTMLDivElement>(null);
    const [size, setSize] = React.useState<{ w: number; h: number } | null>(null);
    const [isChromium, setIsChromium] = React.useState(false);

    React.useImperativeHandle(forwardedRef, () => localRef.current as HTMLDivElement, []);

    React.useEffect(() => {
      if (typeof window === "undefined") return;
      const ua = navigator.userAgent;
      const isChromeOrEdge =
        /chrome|chromium|crios/i.test(ua) && !/firefox|fxios/i.test(ua);
      if (isChromeOrEdge && CSS.supports("backdrop-filter", "blur(1px)")) {
        setIsChromium(true);
      }
    }, []);

    React.useEffect(() => {
      const el = localRef.current;
      if (!el) return;

      const updateSize = () => {
        const w = el.offsetWidth;
        const h = el.offsetHeight;
        if (w > 0 && h > 0) {
          setSize((prev) => (prev?.w === w && prev?.h === h ? prev : { w, h }));
        }
      };

      updateSize();
      const observer = new ResizeObserver(updateSize);
      observer.observe(el);
      return () => observer.disconnect();
    }, []);

    const glassRefs = React.useMemo(() => {
      if (!size || !isChromium) return null;
      try {
        const images = glassImages(size.w, size.h, radius, bezel, profile);
        if (!images) return null;
        const filter = ensureFilter({
          w: size.w,
          h: size.h,
          mapHref: images.map,
          refraction,
        });
        if (!filter) return null;
        return { images, filterId: filter.id };
      } catch {
        return null;
      }
    }, [size, isChromium, radius, bezel, profile, refraction]);

    const effectiveBlur = Math.round(blur + frost * 12);
    const backdropFilter = `blur(${effectiveBlur}px) saturate(${saturation})`;
    const refractFilter = glassRefs?.filterId ? `url(#${glassRefs.filterId})` : undefined;

    return (
      <div
        ref={localRef}
        className={cn(
          "relative isolate select-none overflow-hidden",
          elevated && "shadow-[0_12px_36px_rgba(0,0,0,0.45),0_3px_10px_rgba(0,0,0,0.2)]",
          className
        )}
        style={{
          borderRadius: `${radius}px`,
          ...style,
        }}
        {...props}
      >
        {/* Layer 1: Optical Backdrop Blur & Saturation */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-0 rounded-[inherit]"
          style={{
            backdropFilter,
            WebkitBackdropFilter: backdropFilter,
          }}
        />

        {/* Layer 2: Refraction Displacement (Chromium true liquid bend) */}
        {refractFilter && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 z-0 rounded-[inherit] transition-opacity duration-300"
            style={{
              backdropFilter: refractFilter,
              WebkitBackdropFilter: refractFilter,
            }}
          />
        )}

        {/* Layer 3: Ultra-clean Liquid Glass Tint (Crisp & transparent, not milky) */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-[1] rounded-[inherit] bg-gradient-to-b from-white/[0.14] via-white/[0.04] to-white/[0.01]"
        />

        {/* Layer 4: Normal-lit Specular Sun Arc (Ray-traced glass curvature) */}
        {glassRefs?.images.specular && specular > 0 && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 z-[2] rounded-[inherit] bg-no-repeat transition-opacity duration-300"
            style={{
              backgroundImage: `url(${glassRefs.images.specular})`,
              backgroundSize: "100% 100%",
              opacity: specular,
            }}
          />
        )}

        {/* Layer 5: Apple Specular Bezel Rim (High-precision top catch-light, subtle bottom rim) */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-[3] rounded-[inherit] border border-white/20 border-t-white/60 shadow-[inset_0_1.5px_1px_0_rgba(255,255,255,0.75),inset_0_-1px_1px_0_rgba(255,255,255,0.12)]"
        />

        {/* Top-edge sharp glint */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-8 top-0 z-[4] h-[1px] bg-gradient-to-r from-transparent via-white/80 to-transparent"
        />

        {/* Layer 6: Content */}
        <div className={cn("relative z-[5] w-full", contentClassName)}>
          {children}
        </div>
      </div>
    );
  }
);
LiquidGlass.displayName = "LiquidGlass";

/**
 * LiquidGlassButton: A high-performance, accessible, tactile iOS Liquid Glass button
 * Powered by Liqui Design optics and Framer Motion spring physics.
 */
export interface LiquidGlassButtonProps
  extends Omit<HTMLMotionProps<"button">, "ref" | "children"> {
  children?: React.ReactNode;
  radius?: number;
  blur?: number;
  refraction?: number;
  bezel?: number;
  specular?: number;
  frost?: number;
  saturation?: number;
  profile?: "squircle" | "convex" | "rim";
  elevated?: boolean;
}

export const LiquidGlassButton = React.forwardRef<
  HTMLButtonElement,
  LiquidGlassButtonProps
>(
  (
    {
      children,
      className,
      radius = 9999,
      blur = 2,
      refraction = 40,
      bezel = 14,
      specular = 0.85,
      frost = 0.28,
      saturation = 1.9,
      profile = "squircle",
      elevated = true,
      whileTap = { scale: 0.96 },
      transition = { type: "spring", stiffness: 450, damping: 25 },
      disabled,
      ...props
    },
    ref
  ) => {
    return (
      <motion.button
        ref={ref}
        disabled={disabled}
        whileTap={disabled ? undefined : whileTap}
        transition={transition}
        className={cn(
          "group relative flex w-full cursor-pointer items-center justify-center p-0 outline-none select-none touch-manipulation disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        {...props}
      >
        <LiquidGlass
          radius={radius}
          blur={blur}
          refraction={refraction}
          bezel={bezel}
          specular={specular}
          frost={frost}
          saturation={saturation}
          profile={profile}
          elevated={elevated}
          className="w-full transition-all duration-200 group-hover:scale-[1.01] group-active:scale-[0.98]"
        >
          {children}
        </LiquidGlass>
      </motion.button>
    );
  }
);
LiquidGlassButton.displayName = "LiquidGlassButton";
