// Single source of truth for where "buy the card game" sends people (physical
// product). Amazon only ships within Canada, so buyers pick their region and
// international orders go to the Stripe checkout instead.
export const CARD_GAME_BUY_URL = 'https://www.amazon.ca/dp/B0HHBW23VR';          // Canada — Amazon.ca
export const CARD_GAME_BUY_URL_INTL = 'https://buy.stripe.com/28E14neCvcIfe6h4U80oM01'; // Outside Canada — Stripe

export type CardGameRegion = 'canada' | 'intl';

export const openCardGameBuy = (region: CardGameRegion) => {
  const url = region === 'canada' ? CARD_GAME_BUY_URL : CARD_GAME_BUY_URL_INTL;
  const w = window.open(url, '_blank', 'noopener,noreferrer');
  if (w) w.opener = null;
};
