// components/Gradient.tsx
// Gradients drawn with react-native-svg (already in the project), so no new native package is needed.
import { ReactNode, useId, useState } from "react";
import { LayoutChangeEvent, StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import Svg, { Defs, LinearGradient, RadialGradient, Rect, Stop } from "react-native-svg";

type Point = { x: number; y: number };

export function Gradient({
  colors,
  start = { x: 0, y: 0 },
  end = { x: 0, y: 1 },
  style,
  children,
}: {
  colors: string[];
  start?: Point;
  end?: Point;
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
}) {
  const id = "g" + useId().replace(/[^a-zA-Z0-9]/g, "");
  // Percent sizes on Android SVG can stay stuck at the first (smaller) width, which painted half-width buttons.
  // Measuring the real size and drawing in pixels fixes that.
  const [box, setBox] = useState<{ w: number; h: number } | null>(null);
  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setBox((b) => (b && Math.abs(b.w - width) < 0.5 && Math.abs(b.h - height) < 0.5 ? b : { w: width, h: height }));
  };
  return (
    <View style={[{ overflow: "hidden" }, style]} onLayout={onLayout}>
      {box && (
      <Svg style={StyleSheet.absoluteFill} width={box.w} height={box.h} viewBox={`0 0 ${box.w} ${box.h}`} pointerEvents="none">
        <Defs>
          <LinearGradient id={id} x1={`${start.x * 100}%`} y1={`${start.y * 100}%`} x2={`${end.x * 100}%`} y2={`${end.y * 100}%`}>
            {colors.map((c, i) => (
              <Stop key={i} offset={colors.length === 1 ? 0 : i / (colors.length - 1)} stopColor={c} />
            ))}
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width={box.w} height={box.h} fill={`url(#${id})`} />
      </Svg>
      )}
      {children}
    </View>
  );
}

/** A soft round glow (used behind logos and in hero corners). Pointer-events are off. */
export function RadialGlow({
  color,
  size,
  opacity = 0.5,
  style,
}: {
  color: string;
  size: number;
  opacity?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const id = "r" + useId().replace(/[^a-zA-Z0-9]/g, "");
  return (
    <View pointerEvents="none" style={[{ width: size, height: size }, style]}>
      <Svg width={size} height={size}>
        <Defs>
          <RadialGradient id={id} cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor={color} stopOpacity={opacity} />
            <Stop offset="100%" stopColor={color} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width={size} height={size} fill={`url(#${id})`} />
      </Svg>
    </View>
  );
}