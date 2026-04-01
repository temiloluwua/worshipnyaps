declare global {
  interface Window {
    grecaptcha: {
      enterprise: {
        ready: (callback: () => void) => void;
        execute: (siteKey: string, options: { action: string }) => Promise<string>;
      };
    };
  }
}

const RECAPTCHA_SITE_KEY = '6LfON4EsAAAAAJ4lGaSkQ2o0-S0zhTiJM7_chFkP';

function waitForRecaptcha(timeout = 10000): Promise<void> {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const check = () => {
      if (window.grecaptcha?.enterprise?.ready) {
        resolve();
      } else if (Date.now() - start > timeout) {
        reject(new Error('reCAPTCHA failed to load'));
      } else {
        setTimeout(check, 100);
      }
    };
    check();
  });
}

export async function executeRecaptcha(action: string): Promise<string | undefined> {
  try {
    await waitForRecaptcha();
  } catch {
    console.warn('reCAPTCHA not loaded, proceeding without token');
    return undefined;
  }

  return new Promise<string>((resolve, reject) => {
    window.grecaptcha.enterprise.ready(async () => {
      try {
        const token = await window.grecaptcha.enterprise.execute(RECAPTCHA_SITE_KEY, { action });
        resolve(token);
      } catch (error) {
        reject(error);
      }
    });
  });
}
