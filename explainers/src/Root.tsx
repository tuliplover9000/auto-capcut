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
import {HordeArtSheet} from './horde/Sheet';
import {StoryArtSheet} from './story/Sheet';
import {WhatIfArtSheet} from './whatif/Sheet';
import {Story} from './story/Story';
import {totalFrames as storyFrames, StoryEpisode} from './story/timeline';
import wojtekEp from '../episodes/wojtek-the-bear.json';
import wojtekTiming from '../episodes/wojtek-the-bear.timing.json';
import {WhatIf} from './whatif/WhatIf';
import asteroidEp from '../episodes/asteroid-missed.json';
import asteroidTiming from '../episodes/asteroid-missed.timing.json';
import {Observe} from './observe/Observe';
import pickpocketEp from '../episodes/pickpocket-station.json';
import pickpocketTiming from '../episodes/pickpocket-station.timing.json';
import {Chain} from './chain/Chain';
import chainEp from '../episodes/chain-paint.json';
import chainTiming from '../episodes/chain-paint.timing.json';
import {Karma} from './chain/Karma';
import karmaEp from '../episodes/chain-karma.json';
import karmaTiming from '../episodes/chain-karma.timing.json';
import {Party} from './chain/Party';
import partyEp from '../episodes/chain-party.json';
import partyTiming from '../episodes/chain-party.timing.json';
import {Blood} from './blood/Blood';
import {PrintSheet} from './prints/PrintSheet';
import {Prints} from './prints/Prints';
import {Liar} from './liar/Liar';
import {Buffering, BufferEpisode, bufferFrames} from './buffer/Buffering';
import bufEp from '../episodes/buffering.json';
import bufTiming from '../episodes/buffering.timing.json';
import liarEp from '../episodes/liar.json';
import liarTiming from '../episodes/liar.timing.json';
import printEp from '../episodes/fingerprint.json';
import printTiming from '../episodes/fingerprint.timing.json';
import bloodEp from '../episodes/blood-spatter.json';
import bloodTiming from '../episodes/blood-spatter.timing.json';
import {Horde} from './horde/Horde';
import {totalFrames as hordeFrames, HordeEpisode} from './horde/timeline';
import gorillaEp from '../episodes/gorilla-vs-100-men.json';
import gorillaTiming from '../episodes/gorilla-vs-100-men.timing.json';
import napoleonEp from '../episodes/napoleon-vs-rabbits.json';
import napoleonTiming from '../episodes/napoleon-vs-rabbits.timing.json';
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
    <Composition id="HordeArtSheet" component={HordeArtSheet} durationInFrames={1} fps={30} width={1080} height={1920} />
    <Composition id="WhatIfArtSheet" component={WhatIfArtSheet} durationInFrames={1} fps={30} width={1080} height={1920} />
    <Composition id="StoryArtSheet" component={StoryArtSheet} durationInFrames={1} fps={30} width={1080} height={1920} />
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
      id="HordeGorilla"
      component={Horde}
      fps={30}
      width={1080}
      height={1920}
      defaultProps={{episode: gorillaEp as HordeEpisode, timing: gorillaTiming as FightTiming}}
      durationInFrames={hordeFrames(gorillaEp as HordeEpisode, gorillaTiming as FightTiming)}
      calculateMetadata={({props}) => ({durationInFrames: hordeFrames(props.episode, props.timing)})}
    />
    <Composition
      id="HordeNapoleon"
      component={Horde}
      fps={30}
      width={1080}
      height={1920}
      defaultProps={{episode: napoleonEp as HordeEpisode, timing: napoleonTiming as FightTiming}}
      durationInFrames={hordeFrames(napoleonEp as HordeEpisode, napoleonTiming as FightTiming)}
      calculateMetadata={({props}) => ({durationInFrames: hordeFrames(props.episode, props.timing)})}
    />
    <Composition
      id="WhatIfAsteroid"
      component={WhatIf}
      fps={30}
      width={1080}
      height={1920}
      defaultProps={{episode: asteroidEp as StoryEpisode, timing: asteroidTiming as FightTiming}}
      durationInFrames={storyFrames(asteroidEp as StoryEpisode, asteroidTiming as FightTiming)}
    />
    <Composition
      id="ObservePickpocket"
      component={Observe}
      fps={30}
      width={1080}
      height={1920}
      defaultProps={{episode: pickpocketEp as StoryEpisode, timing: pickpocketTiming as FightTiming}}
      durationInFrames={storyFrames(pickpocketEp as StoryEpisode, pickpocketTiming as FightTiming)}
    />
    <Composition
      id="ChainPaint"
      component={Chain}
      fps={30}
      width={1080}
      height={1920}
      defaultProps={{episode: chainEp as StoryEpisode, timing: chainTiming as FightTiming}}
      durationInFrames={storyFrames(chainEp as StoryEpisode, chainTiming as FightTiming)}
    />
    <Composition
      id="ChainParty"
      component={Party}
      fps={30}
      width={1080}
      height={1920}
      defaultProps={{episode: partyEp as StoryEpisode, timing: partyTiming as FightTiming}}
      durationInFrames={storyFrames(partyEp as StoryEpisode, partyTiming as FightTiming)}
    />
    <Composition
      id="ChainKarma"
      component={Karma}
      fps={30}
      width={1080}
      height={1920}
      defaultProps={{episode: karmaEp as StoryEpisode, timing: karmaTiming as FightTiming}}
      durationInFrames={storyFrames(karmaEp as StoryEpisode, karmaTiming as FightTiming)}
    />
    <Composition id="PrintSheet" component={PrintSheet} fps={30} width={1080} height={1920} durationInFrames={1} />
    <Composition
      id="BufferingDub"
      component={Buffering}
      fps={30}
      width={1080}
      height={1920}
      defaultProps={{episode: bufEp as unknown as BufferEpisode, timing: bufTiming as FightTiming, mode: 'dub' as const}}
      durationInFrames={bufferFrames(bufEp as unknown as BufferEpisode, bufTiming as FightTiming)}
    />
    <Composition
      id="BufferingClean"
      component={Buffering}
      fps={30}
      width={1080}
      height={1920}
      defaultProps={{episode: bufEp as unknown as BufferEpisode, timing: bufTiming as FightTiming, mode: 'clean' as const}}
      durationInFrames={bufferFrames(bufEp as unknown as BufferEpisode, bufTiming as FightTiming)}
    />
    <Composition
      id="BufferingGuide"
      component={Buffering}
      fps={30}
      width={1080}
      height={1920}
      defaultProps={{episode: bufEp as unknown as BufferEpisode, timing: bufTiming as FightTiming, mode: 'guide' as const}}
      durationInFrames={bufferFrames(bufEp as unknown as BufferEpisode, bufTiming as FightTiming)}
    />
    <Composition
      id="SpotLiar"
      component={Liar}
      fps={30}
      width={1080}
      height={1920}
      defaultProps={{episode: liarEp as StoryEpisode, timing: liarTiming as FightTiming}}
      durationInFrames={storyFrames(liarEp as StoryEpisode, liarTiming as FightTiming)}
    />
    <Composition
      id="Fingerprint"
      component={Prints}
      fps={30}
      width={1080}
      height={1920}
      defaultProps={{episode: printEp as StoryEpisode, timing: printTiming as FightTiming}}
      durationInFrames={storyFrames(printEp as StoryEpisode, printTiming as FightTiming)}
    />
    <Composition
      id="BloodSpatter"
      component={Blood}
      fps={30}
      width={1080}
      height={1920}
      defaultProps={{episode: bloodEp as StoryEpisode, timing: bloodTiming as FightTiming}}
      durationInFrames={storyFrames(bloodEp as StoryEpisode, bloodTiming as FightTiming)}
    />
    <Composition
      id="StoryWojtek"
      component={Story}
      fps={30}
      width={1080}
      height={1920}
      defaultProps={{episode: wojtekEp as StoryEpisode, timing: wojtekTiming as FightTiming}}
      durationInFrames={storyFrames(wojtekEp as StoryEpisode, wojtekTiming as FightTiming)}
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
