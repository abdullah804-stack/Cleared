// components/Marquee.tsx
// Endless, smooth auto-scroll. Children are drawn twice so the loop has no visible jump.
import { ReactNode, useEffect, useState } from "react";
import { ScrollView, View } from "react-native";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from "react-native-reanimated";

export function Marquee({ children, speed = 28, gap = 10, direction = "right" }: { children: ReactNode; speed?: number; gap?: number; direction?: "left" | "right" }) {
  const [w, setW] = useState(0);
  const x = useSharedValue(0);

  useEffect(() => {
    if (!w) return;
    const from = direction === "right" ? -w : 0;
    const to = direction === "right" ? 0 : -w;
    x.value = from;
    x.value = withRepeat(withTiming(to, { duration: (w / speed) * 1000, easing: Easing.linear }), -1, false);
  }, [w, speed, direction]);

  const style = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));

  return (
    <ScrollView horizontal scrollEnabled={false} showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled">
      <Animated.View style={[{ flexDirection: "row" }, style]}>
        <View style={{ flexDirection: "row", gap, paddingRight: gap }} onLayout={(e) => setW(e.nativeEvent.layout.width)}>
          {children}
        </View>
        <View style={{ flexDirection: "row", gap, paddingRight: gap }}>{children}</View>
      </Animated.View>
    </ScrollView>
  );
}