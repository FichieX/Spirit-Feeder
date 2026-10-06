import { Pressable } from 'react-native';
import Svg, { Rect } from 'react-native-svg';

const GOLD = '#D9A441';
const INK = '#1B1612';


const ROWS = [1, 2, 3, 4, 5, 4, 3, 2, 1]; // filled width of each row

type Props = {
  direction: 'left' | 'right';
  onPress: () => void;
  disabled?: boolean;
  label: string;
};

export default function PixelArrow({ direction, onPress, disabled, label }: Props) {
  const P = 5; // screen points per pixel
  const W = 7;
  const H = ROWS.length;
  const flip = direction === 'left';
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={16}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      style={({ pressed }) => ({ opacity: disabled ? 0.25 : pressed ? 0.6 : 1 })}
    >
      <Svg width={W * P} height={H * P} viewBox={`0 0 ${W} ${H}`} shapeRendering="crispEdges">
        {/* ink bar along the flat side */}
        <Rect x={flip ? W - 1 : 0} y={0} width={1} height={H} fill={INK} />
        {ROWS.map((len, y) => {
          const x = flip ? W - 1 - len : 1;
          return [
            <Rect key={`g${y}`} x={x} y={y} width={len} height={1} fill={GOLD} />,
            <Rect key={`o${y}`} x={flip ? x - 1 : x + len} y={y} width={1} height={1} fill={INK} />,
          ];
        })}
      </Svg>
    </Pressable>
  );
}
