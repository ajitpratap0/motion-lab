/* Frame-exact review hook; safe to inline in an HTML document. */
(() => {
  const params = new URLSearchParams(location.search);
  const frozen = params.has('t');
  const time = Number(params.get('t')) || 0;
  const fps = Number(params.get('fps')) || 24;
  let counter;
  if (params.get('counter') === '1') {
    counter = document.createElement('div');
    counter.style.cssText = 'position:fixed;right:12px;bottom:12px;padding:6px 10px;'
      + 'background:#000c;color:white;font:16px monospace;z-index:2147483647;pointer-events:none';
    (document.body || document.documentElement).append(counter);
  }

  async function waitForReadiness() {
    let timeout;
    let poll;
    try {
      await Promise.race([
        (async () => {
          if (window.__ready !== undefined) {
            if (!window.__ready) {
              await new Promise(resolve => {
                poll = setInterval(() => {
                  if (window.__ready) {
                    clearInterval(poll);
                    resolve();
                  }
                }, 10);
              });
            }
            await window.__ready;
          }
          await document.fonts.ready;
        })(),
        new Promise((resolve, reject) => {
          timeout = setTimeout(() => {
            reject(new Error('motion-lab: readiness timed out after 30 seconds'));
          }, 30000);
        })
      ]);
    } finally {
      clearTimeout(timeout);
      clearInterval(poll);
    }
  }

  async function freeze() {
    if (!frozen) return;
    await waitForReadiness();
    if (typeof window.renderAt === 'function') await window.renderAt(time);
    document.getAnimations().forEach(animation => {
      animation.pause();
      animation.currentTime = time * 1000;
    });
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    if (counter) {
      counter.textContent = `frame ${Math.round(time * fps)} · ${time.toFixed(4)}s`;
    }
    window.__frozen = true;
  }

  if (frozen) {
    void freeze();
    document.fonts.ready.then(freeze);
    window.addEventListener('load', freeze);
  } else {
    let paused = false;
    document.addEventListener('keydown', event => {
      if (event.code !== 'Space' || /INPUT|TEXTAREA|SELECT/.test(event.target.tagName)) return;
      event.preventDefault();
      paused = !paused;
      document.getAnimations().forEach(animation => {
        return paused ? animation.pause() : animation.play();
      });
    });
    if (counter) {
      const update = () => {
        const animation = document.getAnimations()[0];
        const currentTime = Number(animation?.currentTime || 0);
        counter.textContent = `frame ${Math.round(currentTime / 1000 * fps)}`;
        requestAnimationFrame(update);
      };
      requestAnimationFrame(update);
    }
  }
})();
