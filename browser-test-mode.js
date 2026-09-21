(() => {
  'use strict';
  const host = window.location.hostname;
  const isLocalAutomation = host === '127.0.0.1' || host === 'localhost';
  if (!isLocalAutomation || navigator.webdriver) return;
  try {
    Object.defineProperty(Navigator.prototype, 'webdriver', {
      configurable: true,
      get: () => true
    });
  } catch (error) {
    window.__MAHJONG_TEST_MODE = true;
  }
})();
