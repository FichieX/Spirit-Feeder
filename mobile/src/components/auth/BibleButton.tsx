import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Image, Pressable, StyleSheet, Text, View } from 'react-native';

const SHEET = require('../../../assets/images/bible_sheet.png');
const FRAME_W = 144;
const FRAME_H = 132;
const COLS = 4;
const ROWS = 4;
const FRAME_MS = 90;
const OPEN_FRAMES = [1, 2, 3, 4, 5, 6, 7, 8];
const CLOSE_FRAMES = [9, 10, 11, 12, 13, 14, 15, 0];

type Props = {
  onOpen?: () => void;
  onClose?: () => void;
};

export default function BibleButton({ onOpen, onClose }: Props) {
  const [frame, setFrame] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const busy = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const play = async (frames: number[], done: () => void) => {
    busy.current = true;
    const reduceMotion = await AccessibilityInfo.isReduceMotionEnabled();
    if (reduceMotion) {
      setFrame(frames[frames.length - 1]);
      busy.current = false;
      done();
      return;
    }
    let i = 0;
    const step = () => {
      setFrame(frames[i]);
      i += 1;
      if (i < frames.length) {
        timer.current = setTimeout(step, FRAME_MS);
      } else {
        busy.current = false;
        done();
      }
    };
    step();
  };

  const toggle = () => {
    if (busy.current) return;
    if (isOpen) {
      play(CLOSE_FRAMES, () => {
        setIsOpen(false);
        onClose?.();
      });
    } else {
      play(OPEN_FRAMES, () => {
        setIsOpen(true);
        onOpen?.();
      });
    }
  };

  const col = frame % COLS;
  const row = Math.floor(frame / COLS);

  return (
    <Pressable
      onPress={toggle}
      hitSlop={12}
      style={styles.wrap}
      accessibilityRole="button"
      accessibilityLabel={isOpen ? 'Close the Bible' : 'Open the Bible'}
      accessibilityState={{ expanded: isOpen }}
    >
      <View style={styles.frame}>
        <Image
          source={SHEET}
          style={[
            styles.sheet,
            { transform: [{ translateX: -col * FRAME_W }, { translateY: -row * FRAME_H }] },
          ]}
        />
      </View>
      <Text style={styles.hint}>{isOpen ? 'Tap to close' : 'Tap to open'}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
  },
  frame: {
    width: FRAME_W,
    height: FRAME_H,
    overflow: 'hidden',
  },
  sheet: {
    width: FRAME_W * COLS,
    height: FRAME_H * ROWS,
  },
  hint: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 12,
    color: '#C9B48A',
    marginTop: 6,
  },
});
