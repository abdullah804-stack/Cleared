// components/LogoMark.tsx
// The Cleared mark: a tooth with a check. Drawn in SVG so it is crisp at any size and can "draw itself".
import Svg, { Path } from "react-native-svg";
import Animated, { SharedValue, useAnimatedProps, useSharedValue } from "react-native-reanimated";

const AnimatedPath = Animated.createAnimatedComponent(Path);

const TOOTH =
  "M50 18 C44 11 32 11 27 19 C22 27 24 38 28 47 C32 56 32 66 34 76 C35 83 41 86 44 80 C47 74 48 66 50 66 C52 66 53 74 56 80 C59 86 65 83 66 76 C68 66 68 56 72 47 C76 38 78 27 73 19 C68 11 56 11 50 18 Z";
const CHECK = "M39 41 L47 49 L61 33";
const TOOTH_LEN = 240; // measured 233
const CHECK_LEN = 34; // measured 32.6

export function LogoMark({
  size = 96,
  toothProgress,
  checkProgress,
  stroke = "#FFFFFF",
  checkColor = "#5EEAD4",
  fill = "rgba(56,189,248,0.18)",
}: {
  size?: number;
  /** 0 → 1. Omit for a fully drawn, static mark. */
  toothProgress?: SharedValue<number>;
  checkProgress?: SharedValue<number>;
  stroke?: string;
  checkColor?: string;
  fill?: string;
}) {
  const full = useSharedValue(1);
  const tooth = toothProgress ?? full;
  const check = checkProgress ?? full;

  const toothProps = useAnimatedProps(() => ({
    strokeDashoffset: TOOTH_LEN * (1 - tooth.value),
    fillOpacity: Math.max(0, Math.min(1, (tooth.value - 0.75) / 0.25)),
  }));
  const checkProps = useAnimatedProps(() => ({
    strokeDashoffset: CHECK_LEN * (1 - check.value),
    opacity: check.value > 0 ? 1 : 0,
  }));

  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <AnimatedPath
        d={TOOTH}
        fill={fill}
        stroke={stroke}
        strokeWidth={3.2}
        strokeLinejoin="round"
        strokeDasharray={`${TOOTH_LEN} ${TOOTH_LEN}`}
        animatedProps={toothProps}
      />
      <AnimatedPath
        d={CHECK}
        fill="none"
        stroke={checkColor}
        strokeWidth={4}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={`${CHECK_LEN} ${CHECK_LEN}`}
        animatedProps={checkProps}
      />
    </Svg>
  );
}