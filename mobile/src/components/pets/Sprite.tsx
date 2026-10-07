import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { Image } from 'expo-image';

const COLS = 4;

type Props = {
  sheet: number; // require('...png') of a 4-column sprite grid
  ms: number[]; // how long each frame shows
  frameW: number; // one frame's size in pixel-art pixels
  frameH: number;
  scale: number; // screen points per pixel-art pixel
  loop?: boolean;
  onDone?: () => void; // called once when a non-looping animation ends
};

// Plays a sprite sheet: loops forever, or plays once and calls onDone.
// Uses expo-image with no fade-in so switching animations never blinks.
export default function Sprite({ sheet, ms: msIn, frameW, frameH, scale, loop = true, onDone }: Props) {
  // Fall back to a single still frame if timings are missing, instead of crashing
  const ms = msIn && msIn.length ? msIn : [1000];
  const [frame, setFrame] = useState(0);
  const doneRef = useRef(onDone);
  useEffect(() => {
    doneRef.current = onDone;
  }, [onDone]);

  useEffect(() => {
    let i = 0;
    let timer: ReturnType<typeof setTimeout>;
    setFrame(0);
    const tick = () => {
      timer = setTimeout(() => {
        i += 1;
        if (i >= ms.length) {
          if (!loop) {
            doneRef.current?.();
            return;
          }
          i = 0;
        }
        setFrame(i);
        tick();
      }, ms[i]);
    };
    if (ms.length > 1 || !loop) tick();
    return () => clearTimeout(timer);
  }, [sheet, loop]);

  const w = frameW * scale;
  const h = frameH * scale;
  const rows = Math.ceil(ms.length / COLS);
  return (
    <View style={{ width: w, height: h, overflow: 'hidden' }}>
      <Image
        source={sheet}
        transition={0}
        cachePolicy="memory"
        contentFit="fill"
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: w * COLS,
          height: h * rows,
          transform: [{ translateX: -(frame % COLS) * w }, { translateY: -Math.floor(frame / COLS) * h }],
        }}
      />
    </View>
  );
}

// Loads every sheet into memory ahead of time (invisible), so the first switch
// to a new animation shows up instantly instead of flashing empty.
export function PreloadSheets({ sheets }: { sheets: number[] }) {
  return (
    <View style={{ position: 'absolute', width: 1, height: 1, opacity: 0, overflow: 'hidden' }} pointerEvents="none">
      {sheets.map((s, i) => (
        <Image key={i} source={s} cachePolicy="memory" transition={0} style={{ width: 1, height: 1 }} />
      ))}
    </View>
  );
}