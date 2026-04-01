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

export async function executeRecaptcha(action: string): Promise<string | undefined> {
  if (!window.grecaptcha) {
    console.warn('reCAPTCHA not loaded');
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
