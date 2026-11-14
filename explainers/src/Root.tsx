import React from 'react';
import {AbsoluteFill, Composition} from 'remotion';
import {Pictogram, ArtKey} from './art/Pictograms';
import {LedText} from './lib/LedText';
import {SpeedTrap} from './speedtrap/SpeedTrap';
import {totalFrames, Episode} from './speedtrap/timeline';
import animals from '../episodes/animals-speeding.json';
import {ArtBox, Dandelion, Person, Tree, Car, House, Tornado} from './windtest/art';
import {WindTest} from './windtest/WindTest';
import {totalFrames as windFrames, WindEpisode, Timing} from './windtest/timeline';
import windEp from '../episodes/wind-survival.json';
import windTiming from '../episodes/wind-survival.timing.json';
import {FighterBox, Tulip, Sunflower, Deer, Face} from './fight/art';
import {Fight} from './fight/Fight';
import {totalFrames as fightFrames, FightEpisode, Timing as FightTiming} from './fight/timeline';
import tulipEp from '../episodes/tulip-vs-sunflower.json';
import tulipTiming from '../episodes/tulip-vs-sunflower.timing.json';
import jensenEp from '../episodes/jensen-vs-edison.json';
import jensenTiming from '../episodes/jensen-vs-edison.timing.json';
import {Odds} from './odds/Odds';
import {LiftArtSheet} from './lift/Sheet';
import {Lift} from './lift/Lift';
import balloonsEp from '../episodes/balloons-lift.json';
import balloonsTiming from '../episodes/balloons-lift.timing.json';
import {totalFrames as oddsFrames, OddsEpisode, Timing as OddsTiming} from './odds/timeline';
import pirateEp from '../episodes/pirate-token-odds.json';
import pirateTiming from '../episodes/pirate-token-odds.timing.json';

// Dev-only: Fight art review — every face + key poses.
const FightArtSheet: React.FC = () => (
  <AbsoluteFill style={{background: 'linear-gradient(#7fd3ff, #d9f4ff 70%, #5cc24a 70%)', display: 'flex', flexDirection: 'row',
    flexWrap: 'wrap', alignContent: 'flex-start', padding: 20, gap: 10}}>
    {(['angry', 'hurt', 'smug', 'sad', 'shock', 'happy'] as Face[]).map((f) => (
      <div key={`t${f}`} style={{background: 'rgba(255,255,255,0.2)'}}><FighterBox w={160}><Tulip face={f} arm={f === 'smug' ? 1 : 0} t={0} /></FighterBox></div>
    ))}
    {(['angry', 'hurt', 'smug', 'sad', 'shock', 'happy'] as Face[]).map((f) => (
      <div key={`s${f}`} style={{background: 'rgba(255,255,255,0.2)'}}><FighterBox w={160}><Sunflower face={f} arm={f === 'happy' ? 1 : 0} t={0} glow={f === 'angry' ? 1 : 0} /></FighterBox></div>
    ))}
    <svg width={500} height={400} viewBox="0 0 500 400"><Deer walk={0.2} reach={0} chew={0} /></svg>
    <svg width={500} height={400} viewBox="0 0 500 400" style={{overflow: 'visible'}}><Deer walk={0} reach={1} chew={1} crown={1} /></svg>
    <div style={{background: 'rgba(255,255,255,0.2)'}}><FighterBox w={160}><Tulip face="angry" arm={0} t={0} bite={0.6} droop={0.5} /></FighterBox></div>
    <div style={{background: 'rgba(255,255,255,0.2)'}}><FighterBox w={160}><Sunflower face="sad" arm={0} t={0} tilt={1} droop={0.4} /></FighterBox></div>
  </AbsoluteFill>
);

// Dev-only: Wind Test art review — rest pose + a mid-failure pose of each.
const WindArtSheet: React.FC = () => (
  <AbsoluteFill style={{background: 'linear-gradient(#4fb6f5, #bfe8ff 60%, #5cc24a 60%)', display: 'flex', flexDirection: 'row',
    flexWrap: 'wrap', alignContent: 'flex-start', padding: 30, gap: 20}}>
    {[
      <Dandelion sway={0.2} seedsGone={0} t={0} />, <Dandelion sway={0.8} seedsGone={0.5} t={1} />,
      <Person strain={0.2} t={0} />, <Person strain={1} t={0.3} />,
      <Tree sway={0.3} snap={0} t={0} />, <Tree sway={1} snap={0.25} t={1} />,
      <Car t={0} />, <House roofLift={0} tear={0} />, <House roofLift={0.3} tear={0} />,
      <Tornado grow={1} t={0} />,
    ].map((el, i) => (
      <div key={i} style={{background: 'rgba(255,255,255,0.18)'}}><ArtBox size={320}>{el}</ArtBox></div>
    ))}
  </AbsoluteFill>
);

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
    <Composition id="FightArtSheet" component={FightArtSheet} durationInFrames={1} fps={30} width={1080} height={1920} />
    <Composition id="LiftArtSheet" component={LiftArtSheet} durationInFrames={1} fps={30} width={1080} height={1920} />
    <Composition id="WindArtSheet" component={WindArtSheet} durationInFrames={1} fps={30} width={1080} height={1920} />
    <Composition
      id="Fight"
      component={Fight}
      fps={30}
      width={1080}
      height={1920}
      defaultProps={{episode: tulipEp as FightEpisode, timing: tulipTiming as FightTiming}}
      durationInFrames={fightFrames(tulipEp as FightEpisode, tulipTiming as FightTiming)}
      calculateMetadata={({props}) => ({durationInFrames: fightFrames(props.episode, props.timing)})}
    />
    <Composition
      id="FightJensen"
      component={Fight}
      fps={30}
      width={1080}
      height={1920}
      defaultProps={{episode: jensenEp as FightEpisode, timing: jensenTiming as FightTiming}}
      durationInFrames={fightFrames(jensenEp as FightEpisode, jensenTiming as FightTiming)}
      calculateMetadata={({props}) => ({durationInFrames: fightFrames(props.episode, props.timing)})}
    />
    <Composition
      id="LiftBalloons"
      component={Lift}
      fps={30}
      width={1080}
      height={1920}
      defaultProps={{episode: balloonsEp as OddsEpisode, timing: balloonsTiming as OddsTiming}}
      durationInFrames={oddsFrames(balloonsEp as OddsEpisode, balloonsTiming as OddsTiming)}
      calculateMetadata={({props}) => ({durationInFrames: oddsFrames(props.episode, props.timing)})}
    />
    <Composition
      id="OddsPirate"
      component={Odds}
      fps={30}
      width={1080}
      height={1920}
      defaultProps={{episode: pirateEp as OddsEpisode, timing: pirateTiming as OddsTiming}}
      durationInFrames={oddsFrames(pirateEp as OddsEpisode, pirateTiming as OddsTiming)}
      calculateMetadata={({props}) => ({durationInFrames: oddsFrames(props.episode, props.timing)})}
    />
    <Composition
      id="WindTest"
      component={WindTest}
      fps={30}
      width={1080}
      height={1920}
      defaultProps={{episode: windEp as WindEpisode, timing: windTiming as Timing}}
      durationInFrames={windFrames(windEp as WindEpisode, windTiming as Timing)}
      calculateMetadata={({props}) => ({durationInFrames: windFrames(props.episode, props.timing)})}
    />
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
