import * as Phaser from 'phaser';
import { useEffect, useRef } from 'react';
import { styled } from '@linaria/react';

const Host = styled.div`
  width: 100%;
  aspect-ratio: 16 / 9;
  overflow: hidden;
  border-radius: 18px;
  border: 1px solid #314564;
  background: #17243a;
  canvas { display: block; }
`;

/** Keep Phaser's lifecycle inside this component so the React UI can mount or remove it safely. */
export function PhaserCanvas() {
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!host.current) return;
    const game = new Phaser.Game({
      type: Phaser.CANVAS,
      parent: host.current,
      width: 800,
      height: 450,
      scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
      scene: {
        create: function (this: Phaser.Scene) {
          this.cameras.main.setBackgroundColor('#17243a');
          const lines = this.add.graphics().lineStyle(1, 0x7ba4d0, 0.12);
          for (let x = 0; x <= 800; x += 50) lines.lineBetween(x, 0, x, 450);
          for (let y = 0; y <= 450; y += 50) lines.lineBetween(0, y, 800, y);

          this.add.circle(400, 225, 125, 0x365b84, 0.35);
          const orb = this.add.circle(240, 225, 38, 0x85b4ff);
          this.tweens.add({
            targets: orb,
            x: 560,
            duration: 1400,
            yoyo: true,
            repeat: -1,
            ease: Phaser.Math.Easing.Sine.InOut
          });
          this.add.text(400, 370, 'PHASER CANVAS', {
            fontFamily: 'ui-sans-serif, system-ui, sans-serif',
            fontSize: '17px',
            color: '#c4d8f1'
          }).setOrigin(0.5);
        }
      }
    });

    return () => game.destroy(true);
  }, []);

  return <Host ref={host} aria-label="Animated Phaser demo" />;
}
