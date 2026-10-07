import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import type { PetDef } from '../../pets/catalog';
import { PreloadSheets } from './Sprite';

const COLS = 4;

type Props = {
  pet: PetDef;
  mode: 'idle' | 'happy';
  scale?: number; // screen points per pixel-art pixel
  onHappyDone?: () => void;
};

// Plays one pet's idle loop, or its happy animation once and then back to idle.
export default function PetSprite({ pet, mode, scale = 3.5, onHappyDone }: Props) {
  const anim = mode === 'happy' ? pet.happy : pet.idle;
  const [frame, setFrame] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const doneRef = useRef(onHappyDone);
  useEffect(() => {
    doneRef.current = onHappyDone;
  }, [onHappyDone]);

  useEffect(() => {
    let i = 0;
    setFrame(0);
    const tick = () => {
      timer.current = setTimeout(() => {
        i += 1;
        if (i >= anim.ms.length) {
          if (mode === 'happy') {
            doneRef.current?.();
            return;
          }
          i = 0;
        }
        setFrame(i);
        tick();
      }, anim.ms[i]);
    };
    tick();
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [pet.key, mode]);

  const w = pet.frameW * scale;
  const h = pet.frameH * scale;
  const rows = Math.ceil(anim.ms.length / COLS);
  const col = frame % COLS;
  const row = Math.floor(frame / COLS);

  return (
    <View style={{ width: w, height: h, overflow: 'hidden' }}>
      {/* keep both idle + happy ready so picking never blinks */}
      <PreloadSheets sheets={[pet.idle.sheet, pet.happy.sheet]} />
      <Image
        source={anim.sheet}
        transition={0}
        cachePolicy="memory"
        contentFit="fill"
        style={[
          styles.sheet,
          {
            width: w * COLS,
            height: h * rows,
            transform: [{ translateX: -col * w }, { translateY: -row * h }],
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: { position: 'absolute', left: 0, top: 0 },
});