// utils/haptics.ts
// Vibration feedback that can never crash the app: if the native module or a function is missing, it does nothing.
import * as Haptics from "expo-haptics";

const safe = (fn: () => unknown) => {
  try {
    const r: any = fn();
    if (r && typeof r.catch === "function") r.catch(() => {});
  } catch {}
};

export const tick = () => safe(() => (Haptics as any).selectionAsync?.());
export const tap = () => safe(() => (Haptics as any).impactAsync?.((Haptics as any).ImpactFeedbackStyle?.Light));
export const thud = () => safe(() => (Haptics as any).impactAsync?.((Haptics as any).ImpactFeedbackStyle?.Medium));