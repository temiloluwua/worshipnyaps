# Square Payment Setup Guide

Your shop is now integrated with Square for payment processing! Follow these steps to complete the setup.

## 1. Create a Square Account

1. Go to [Square Developer Portal](https://developer.squareup.com/)
2. Sign up for a Square Developer account (or sign in if you have one)
3. Create a new application

## 2. Get Your Credentials

### For Testing (Sandbox):
1. In the Square Developer Dashboard, select your application
2. Go to the "Credentials" tab
3. Copy your **Sandbox Application ID**
4. Copy your **Sandbox Location ID**

### For Production:
1. Switch to "Production" mode in the Square Dashboard
2. Copy your **Production Application ID**
3. Copy your **Production Location ID**

## 3. Configure Your Environment

Add these values to your `.env` file:

```
VITE_SQUARE_APPLICATION_ID=your_application_id_here
VITE_SQUARE_LOCATION_ID=your_location_id_here
```

## 4. Update the Square Script

The app currently uses the **Sandbox** environment for testing. To switch to production:

1. Open `index.html`
2. Change this line:
   ```html
   <script type="text/javascript" src="https://sandbox.web.squarecdn.com/v1/square.js"></script>
   ```

   To:
   ```html
   <script type="text/javascript" src="https://web.squarecdn.com/v1/square.js"></script>
   ```

## 5. Test the Integration

### Sandbox Testing:
Use these test card numbers:
- **Visa**: `4111 1111 1111 1111`
- **Mastercard**: `5105 1051 0510 5100`
- **CVV**: Any 3 digits
- **Expiration**: Any future date
- **Postal Code**: Any valid postal code

### How to Test:
1. Browse products in the Shop tab
2. Add items to cart
3. Click "Proceed to Checkout"
4. Enter test card information
5. Complete the payment

## 6. Processing Payments

When a customer completes checkout:
1. Square processes the payment securely
2. The order is saved to your Supabase database
3. The customer receives a success message
4. The cart is cleared

## Important Notes

- **Security**: Never commit your Square credentials to version control
- **Webhooks**: Set up Square webhooks to receive real-time payment updates
- **Order Fulfillment**: Orders are saved in the `orders` table - build an admin panel to manage them
- **Shipping**: Currently, shipping addresses are not collected. Add a shipping form before checkout if needed

## Support

- [Square Web Payments SDK Documentation](https://developer.squareup.com/docs/web-payments/overview)
- [Square API Reference](https://developer.squareup.com/reference/square)
- [Square Developer Community](https://developer.squareup.com/forums)

## Next Steps

Consider implementing:
- Shipping address collection
- Order tracking for customers
- Admin dashboard for order management
- Email receipts via Square
- Inventory management with stock updates
