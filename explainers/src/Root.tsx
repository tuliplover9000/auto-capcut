import React from 'react';
import {AbsoluteFill, Composition} from 'remotion';
import {Pictogram, ArtKey} from './art/Pictograms';
import {LedText} from './lib/LedText';
import {SpeedTrap} from './speedtrap/SpeedTrap';
import {totalFrames, Episode} from './speedtrap/timeline';
import animals from '../episodes/animals-speeding.json';

const SHEET: ArtKey[] = ['human', 'bear', 'greyhound', 'pronghorn', 'cheetah', 'falcon', 'kangaroo', 'pigeon'];

// Dev-only: every pictogram + an LED sample on one still, for art review.
const ArtSheet: React.FC = () => (
  <AbsoluteFill style={{background: '#6a6e76', padding: 40, display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: 30, alignContent: 'flex-start'}}>
    {SHEET.map((a) => (
      <div key={a} style={{background: '#8a8e96', padding: 10}}>
        <Pictogram art={a} color="#0d0f14" width={290} stride={0.6} />
      </div>
    ))}
    <div style={{background: '#0b0b0c', padding: 24}}>
      <LedText lines={['WHICH ANIMAL', 'GETS A SPEEDING', 'TICKET?']} charCols={15} charRows={3} pitch={10} color="#ffb21a" />
    </div>
    <div style={{background: '#0b0b0c', padding: 24}}>
      <LedText lines={['70']} charCols={2} charRows={1} pitch={30} color="#ff3b2f" dim="#2a1512" />
    </div>
  </AbsoluteFill>
);

export const RemotionRoot: React.FC = () => (
  <>
    <Composition id="ArtSheet" component={ArtSheet} durationInFrames={1} fps={30} width={1080} height={1920} />
    <Composition
      id="SpeedTrap"
      component={SpeedTrap}
      fps={30}
      width={1080}
      height={1920}
      defaultProps={{episode: animals as Episode}}
      durationInFrames={totalFrames(animals as Episode)}
      calculateMetadata={({props}) => ({durationInFrames: totalFrames(props.episode)})}
    />
  </>
);
