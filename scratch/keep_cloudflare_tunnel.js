const { spawn } = require('child_process');

function startCloudflare() {
  console.log('Starting Cloudflare Tunnel on http://localhost:8000...');
  const child = spawn('npx', ['cloudflared', 'tunnel', '--url', 'http://localhost:8000'], {
    shell: true,
    stdio: 'pipe'
  });

  child.stdout.on('data', (data) => {
    const text = data.toString();
    console.log(text);
  });

  child.stderr.on('data', (data) => {
    const text = data.toString();
    console.error(text);
  });

  child.on('close', (code) => {
    console.log(`Cloudflare tunnel exited with code ${code}. Restarting in 2 seconds...`);
    setTimeout(startCloudflare, 2000);
  });
}

startCloudflare();
