import React, { useEffect, useRef, useState } from 'react'
import { createGame } from './game/createGame.js'

export default function App() {
  const stageRef = useRef(null)
  const gameRef = useRef(null)
  const [phase, setPhase] = useState('menu') // menu | play | over
  const [hud, setHud] = useState({ score: 0, orbs: 0, speed: 0 })
  const [best, setBest] = useState(0)
  const [result, setResult] = useState(null)
  const [theme, setTheme] = useState('day')
  const [power, setPower] = useState({ magnet: 0, dbl: 0, shield: false })

  useEffect(() => {
    const game = createGame(stageRef.current, {
      onState: setPhase,
      onHud: (score, orbs, speed) => setHud({ score, orbs, speed }),
      onOver: setResult,
      onBest: setBest,
      onTheme: setTheme,
      onPower: setPower,
    })
    gameRef.current = game
    if (location.hash === '#debug') window.__game = game
    return () => game.dispose()
  }, [])

  const start = () => gameRef.current && gameRef.current.start()

  return (
    <>
      <div id="stage" ref={stageRef} />

      {phase === 'play' && (
        <div className="hud">
          <div>
            <div className="lbl">Distance</div>
            <div className="big">{hud.score}</div>
            <div className="lbl" style={{ marginTop: 6 }}>Best {best}</div>
          </div>
          <div className="r">
            <div className="lbl">Sky orbs</div>
            <div className="big orbs">{hud.orbs}</div>
            <div className="meter"><i style={{ width: `${Math.max(0, hud.speed)}%` }} /></div>
            <div className="chips">
              {power.magnet > 0 && <span className="chip magnet">Magnet {power.magnet}s</span>}
              {power.dbl > 0 && <span className="chip dbl">x2 Orbs {power.dbl}s</span>}
              {power.shield && <span className="chip shield">Shield</span>}
            </div>
          </div>
        </div>
      )}

      {phase === 'menu' && (
        <div className="card">
          <div className="box">
            <h1 className="logo">Sky<span>Runner</span></h1>
            <p className="sub">Escape the floating city</p>
            <button className="go" onClick={start}>Run</button>
            <div><button className="theme" onClick={() => gameRef.current.setTheme(theme === 'day' ? 'dusk' : 'day')}>World: {theme === 'day' ? 'Sunny day' : 'Neon dusk'} (T)</button></div>
            <div className="keys">
              <b>← → / A D</b><span>change lane</span>
              <b>↑ / W / Space</b><span>jump</span>
              <b>↓ / S</b><span>slide (in the air: dive)</span>
              <b>Phone</b><span>swipe, tap to jump</span>
              <b>Pick-ups</b><span>magnet pulls orbs · x2 doubles orbs · shield saves you once</span>
            </div>
          </div>
        </div>
      )}

      {phase === 'over' && result && (
        <div className="card">
          <div className="box">
            <h1 className="logo" style={{ fontSize: 'clamp(34px,9vw,52px)' }}>{result.canRevive ? 'Down, not out' : result.newBest ? 'New record' : 'Grounded'}</h1>
            <p className="sub">{result.canRevive ? `Spend ${result.reviveCost} orbs to keep running` : result.newBest ? 'The city is behind you' : 'The city keeps floating'}</p>
            <div className="stat">
              <div><div className="n">{result.score}</div><div className="l">Score</div></div>
              <div><div className="n">{result.dist}</div><div className="l">Metres</div></div>
              <div><div className="n" style={{ color: 'var(--gold)' }}>{result.orbs}</div><div className="l">Orbs</div></div>
            </div>
            {result.canRevive && <div style={{ marginBottom: 12 }}><button className="go revive" onClick={() => gameRef.current.revive()}>Revive · −{result.reviveCost} orbs</button></div>}
            <button className={result.canRevive ? 'theme' : 'go'} onClick={start}>{result.canRevive ? 'End run / Run again' : 'Run again'}</button>
          </div>
        </div>
      )}
    </>
  )
}
