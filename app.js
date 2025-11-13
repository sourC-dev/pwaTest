// app.js
const installBtn = document.getElementById('installBtn');
const updateBtn = document.getElementById('updateBtn');
const checkUpdateBtn = document.getElementById('checkUpdateBtn');
const statusEl = document.getElementById('status');

let deferredInstallPrompt = null;
let swRegistration = null;

function logStatus(msg) {
  statusEl.textContent = 'Status: ' + msg;
}

// Register service worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      swRegistration = await navigator.serviceWorker.register('/service-worker.js');
      logStatus('service worker registered');
      // Check if there's an update already waiting
      if (swRegistration.waiting) {
        showUpdateUI();
      }
      // Listen for updates found
      swRegistration.addEventListener('updatefound', () => {
        const newWorker = swRegistration.installing;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed') {
            // If there's a controller, it's an update.
            if (navigator.serviceWorker.controller) {
              showUpdateUI();
            } else {
              console.log('Content cached for offline use.');
            }
          }
        });
      });
    } catch (err) {
      logStatus('sw register failed: ' + err);
    }
  });

  // Listen for controllerchange to reload when the new SW takes control
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    console.log('controller changed — reloading to use new service worker');
    window.location.reload();
  });
}

// BEFOREINSTALLPROMPT -> show custom install button
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault(); // prevent automatic prompt
  deferredInstallPrompt = e;
  installBtn.hidden = false;
});

installBtn.addEventListener('click', async () => {
  if (!deferredInstallPrompt) return;
  deferredInstallPrompt.prompt();
  const { outcome } = await deferredInstallPrompt.userChoice;
  console.log('User response to install prompt:', outcome);
  installBtn.hidden = true;
  deferredInstallPrompt = null;
});

// show update UI
function showUpdateUI() {
  updateBtn.hidden = false;
}

// when user clicks update, tell the waiting SW to skipWaiting
updateBtn.addEventListener('click', async () => {
  updateBtn.disabled = true;
  if (!swRegistration || !swRegistration.waiting) {
    console.log('No waiting service worker to activate');
    return;
  }
  // Send message to the waiting SW to skip waiting
  swRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
});

// manual check for updates
checkUpdateBtn.addEventListener('click', async () => {
  if (!swRegistration) {
    logStatus('No service worker registration found.');
    return;
  }
  try {
    const updated = await swRegistration.update();
    logStatus('Checked for updates.');
  } catch (err) {
    logStatus('Update check failed.');
  }
});

// display online/offline
window.addEventListener('online', () => logStatus('online'));
window.addEventListener('offline', () => logStatus('offline'));

