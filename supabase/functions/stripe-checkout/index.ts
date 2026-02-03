import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import Stripe from 'npm:stripe@17.7.0';
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';

const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
const stripeSecret = Deno.env.get('STRIPE_SECRET_KEY')!;
const stripe = new Stripe(stripeSecret, {
  appInfo: {
    name: 'Bolt Integration',
    version: '1.0.0',
  },
});

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

function corsResponse(body: string | object | null, status = 200) {
  if (status === 204) {
    return new Response(null, { status, headers: corsHeaders });
  }

  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}

Deno.serve(async (req) => {
  try {
    if (req.method === 'OPTIONS') {
      return corsResponse({}, 204);
    }

    if (req.method !== 'POST') {
      return corsResponse({ error: 'Method not allowed' }, 405);
    }

    const { price_id, success_url, cancel_url, mode, line_items, customer_email } = await req.json();

    const hasLineItems = line_items && Array.isArray(line_items) && line_items.length > 0;
    const hasPriceId = price_id && typeof price_id === 'string';

    if (!hasLineItems && !hasPriceId) {
      return corsResponse({ error: 'Missing required parameter: price_id or line_items' }, 400);
    }

    if (!success_url || typeof success_url !== 'string') {
      return corsResponse({ error: 'Missing required parameter: success_url' }, 400);
    }

    if (!cancel_url || typeof cancel_url !== 'string') {
      return corsResponse({ error: 'Missing required parameter: cancel_url' }, 400);
    }

    const checkoutMode = mode || 'payment';
    if (!['payment', 'subscription'].includes(checkoutMode)) {
      return corsResponse({ error: 'Invalid mode. Must be "payment" or "subscription"' }, 400);
    }

    const authHeader = req.headers.get('Authorization');
    let customerId: string | undefined;
    let userEmail: string | undefined = customer_email;

    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user }, error: getUserError } = await supabase.auth.getUser(token);

      if (!getUserError && user) {
        userEmail = user.email;

        const { data: customer } = await supabase
          .from('stripe_customers')
          .select('customer_id')
          .eq('user_id', user.id)
          .is('deleted_at', null)
          .maybeSingle();

        if (customer?.customer_id) {
          customerId = customer.customer_id;
        } else {
          const newCustomer = await stripe.customers.create({
            email: user.email,
            metadata: { userId: user.id },
          });

          await supabase.from('stripe_customers').insert({
            user_id: user.id,
            customer_id: newCustomer.id,
          });

          customerId = newCustomer.id;

          if (checkoutMode === 'subscription') {
            await supabase.from('stripe_subscriptions').insert({
              customer_id: newCustomer.id,
              status: 'not_started',
            });
          }
        }
      }
    }

    const sessionConfig: Stripe.Checkout.SessionCreateParams = {
      mode: checkoutMode,
      success_url,
      cancel_url,
      billing_address_collection: 'auto',
      shipping_address_collection: checkoutMode === 'payment' ? {
        allowed_countries: ['US', 'CA'],
      } : undefined,
      phone_number_collection: {
        enabled: true,
      },
    };

    if (hasLineItems) {
      sessionConfig.line_items = line_items;
    } else {
      sessionConfig.line_items = [{ price: price_id, quantity: 1 }];
      sessionConfig.allow_promotion_codes = true;
    }

    if (customerId) {
      sessionConfig.customer = customerId;
    } else if (userEmail) {
      sessionConfig.customer_email = userEmail;
    } else {
      sessionConfig.customer_creation = 'if_required';
    }

    const session = await stripe.checkout.sessions.create(sessionConfig);

    console.log(`Created checkout session ${session.id}${customerId ? ` for customer ${customerId}` : ' (guest)'}`);

    return corsResponse({ sessionId: session.id, url: session.url });
  } catch (error: any) {
    console.error(`Checkout error: ${error.message}`);
    return corsResponse({ error: error.message }, 500);
  }
});
