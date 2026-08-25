const { spawn } = require('child_process');

function startTunnel() {
  console.log('Starting localtunnel on careconnect-sos-app...');
  const child = spawn('npx', ['localtunnel', '--port', '8000', '--subdomain', 'careconnect-sos-app'], {
    shell: true,
    stdio: 'inherit'
  });

  child.on('close', (code) => {
    console.log(`localtunnel exited with code ${code}. Restarting in 3 seconds...`);
    setTimeout(startTunnel, 3000);
  });
}

startTunnel();
