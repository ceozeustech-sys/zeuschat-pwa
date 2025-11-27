const { spawn } = require('child_process')

function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

function checkGo() {
  return new Promise(resolve => {
    const p = spawn('go', ['version'], { stdio: 'ignore' })
    p.on('error', () => resolve(false))
    p.on('exit', code => resolve(code === 0))
  })
}

async function waitHealth(url, tries, delay) {
  for (let i = 0; i < tries; i++) {
    try { const r = await fetch(`${url}/health`); if (r.ok) return true } catch {}
    await sleep(delay)
  }
  return false
}

async function run() {
  const hasGo = await checkGo()
  if (!hasGo) {
    console.log('run_hkdf_gate_local: skipped (go not installed)')
    process.exit(0)
  }
  const relay = spawn('go', ['run', './server/relay'], { detached: true, stdio: 'ignore' })
  const url = 'http://localhost:8080'
  const ok = await waitHealth(url, 20, 250)
  if (!ok) {
    try { process.kill(-relay.pid) } catch {}
    console.error('run_hkdf_gate_local: relay did not start')
    process.exit(1)
  }
  await new Promise((resolve, reject) => {
    const t = spawn('node', ['harness/gate/hkdf_gate_test.js'], { env: { ...process.env, RELAY_URL: url }, stdio: 'inherit' })
    t.on('exit', code => code === 0 ? resolve() : reject(new Error(`test exit ${code}`)))
  })
  try { process.kill(-relay.pid) } catch {}
  console.log('run_hkdf_gate_local: ok')
}

run()

