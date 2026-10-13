import { AwarenessMode } from './awareness/AwarenessMode';
import { HeadlessMode } from './headless/HeadlessMode';
import { SphereMode } from './sphere/SphereMode';
import { StillCenterMode } from './still/StillCenterMode';
import type { ComponentType } from 'react';
import type { Mode } from '../rendering/types';
import type { ModeControlsProps } from './types';

export const modes: { id: Mode; title: string; Controls: ComponentType<ModeControlsProps> }[] = [
  { id: 'headless', title: 'Headless mirror', Controls: HeadlessMode },
  { id: 'sphere', title: 'Glass sphere', Controls: SphereMode },
  { id: 'still', title: 'Still center', Controls: StillCenterMode },
  { id: 'awareness', title: 'Universe mirror', Controls: AwarenessMode },
];
