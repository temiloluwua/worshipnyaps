export interface StripeProduct {
  id: string;
  priceId: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  mode: 'payment' | 'subscription';
}

export const stripeProducts: StripeProduct[] = [
  {
    id: 'prod_TuSrRQBMPVuSGo',
    priceId: 'price_1SwdvwGYDeETAPRkR8ueN6MU',
    name: 'Worship n Yaps Card Game',
    description: 'Transform your Bible study with our engaging card game! Perfect for small groups, youth ministries, and family devotions. Each card sparks meaningful conversations about faith, life, and Scripture.',
    price: 29.99,
    currency: 'CAD',
    mode: 'payment'
  }
];

export const getProductById = (id: string): StripeProduct | undefined => {
  return stripeProducts.find(product => product.id === id);
};

export const getProductByPriceId = (priceId: string): StripeProduct | undefined => {
  return stripeProducts.find(product => product.priceId === priceId);
};