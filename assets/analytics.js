(() => {
  const measurementId = 'G-1TFMPR6V5C';
  const hostname = location.hostname;
  if (hostname !== 'charbelsilva.com' && hostname !== 'www.charbelsilva.com') return;

  const preferenceKey = 'charbel-analytics-preference';
  const disableKey = `ga-disable-${measurementId}`;
  let preference;
  let started = false;

  try {
    preference = localStorage.getItem(preferenceKey);
  } catch {
    // Analytics stays off if no stored choice can be read.
  }

  function pageLocation() {
    const current = new URL(location.href);
    const clean = new URL(current.pathname, current.origin);
    for (const key of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_id', 'utm_content', 'utm_term']) {
      const value = current.searchParams.get(key);
      if (value && /^[\p{L}\p{N} ._~+-]{1,150}$/u.test(value)) clean.searchParams.set(key, value);
    }
    return clean.href;
  }

  function startAnalytics() {
    window[disableKey] = false;
    if (started) {
      window.gtag('consent', 'update', { analytics_storage: 'granted' });
      return;
    }
    started = true;
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () {
      window.dataLayer.push(arguments);
    };
    window.gtag('consent', 'default', {
      analytics_storage: 'granted',
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
    });
    window.gtag('js', new Date());
    const referrer = document.referrer ? new URL(document.referrer) : null;
    window.gtag('config', measurementId, {
      allow_google_signals: false,
      allow_ad_personalization_signals: false,
      page_location: pageLocation(),
      page_referrer: referrer ? referrer.origin + referrer.pathname : '',
    });
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
    document.head.append(script);
  }

  const notice = document.createElement('section');
  notice.className = 'analytics-notice';
  notice.setAttribute('aria-labelledby', 'analytics-notice-title');
  notice.innerHTML = `
    <h2 id="analytics-notice-title" tabindex="-1">Analytics preferences</h2>
    <p>Allow Google Analytics to measure visits and help improve this site. <a href="/privacy-policy/#analytics">Privacy details</a></p>
    <div class="analytics-actions">
      <button class="btn btn-small" type="button" data-analytics-choice="denied">Decline</button>
      <button class="btn btn-small" type="button" data-analytics-choice="granted">Allow analytics</button>
    </div>`;
  notice.hidden = preference === 'granted' || preference === 'denied';
  document.body.append(notice);

  const settings = document.createElement('button');
  settings.type = 'button';
  settings.className = 'analytics-settings';
  settings.textContent = 'Analytics settings';
  settings.setAttribute('aria-controls', 'analytics-preferences');
  notice.id = 'analytics-preferences';
  document.querySelector('.footer-links')?.append(settings);
  settings.addEventListener('click', () => {
    notice.hidden = false;
    notice.querySelector('h2').focus();
  });

  for (const button of notice.querySelectorAll('[data-analytics-choice]')) {
    button.addEventListener('click', () => {
      const choice = button.dataset.analyticsChoice;
      try {
        localStorage.setItem(preferenceKey, choice);
      } catch {
        // The choice still applies to the current page.
      }
      if (choice === 'granted') {
        startAnalytics();
      } else if (started) {
        window[disableKey] = true;
        window.gtag('consent', 'update', { analytics_storage: 'denied' });
        for (const name of ['_ga', `_ga_${measurementId.slice(2)}`]) {
          document.cookie = `${name}=; Max-Age=0; Path=/`;
          document.cookie = `${name}=; Max-Age=0; Path=/; Domain=charbelsilva.com`;
        }
      }
      notice.hidden = true;
    });
  }

  if (preference === 'granted') startAnalytics();
})();
