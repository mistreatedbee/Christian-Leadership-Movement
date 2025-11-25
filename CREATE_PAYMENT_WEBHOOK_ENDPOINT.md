# Payment Webhook Endpoint Setup Guide

## Overview
This guide explains how to set up payment webhook endpoints for PayFast and Ozow to handle payment callbacks.

## Webhook Endpoints Required

### 1. PayFast ITN (Instant Transaction Notification)
- **URL**: `/api/payment/webhook/payfast`
- **Method**: POST
- **Content-Type**: application/x-www-form-urlencoded

### 2. Ozow Webhook
- **URL**: `/api/payment/webhook/ozow`
- **Method**: POST
- **Content-Type**: application/x-www-form-urlencoded

## Implementation Notes

The webhook handlers are implemented in `src/lib/paymentWebhooks.ts`. These functions need to be called from your backend API endpoints.

### Backend Endpoint Example (Node.js/Express)

```javascript
// api/payment/webhook/payfast.js
import { handlePayFastITN } from '../lib/paymentWebhooks';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const result = await handlePayFastITN(req.body);
    
    if (result.success) {
      // PayFast expects "OK" response for successful ITN processing
      res.status(200).send('OK');
    } else {
      res.status(400).json({ error: result.message });
    }
  } catch (error) {
    console.error('PayFast webhook error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
```

### Backend Endpoint Example (Ozow)

```javascript
// api/payment/webhook/ozow.js
import { handleOzowWebhook } from '../lib/paymentWebhooks';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const result = await handleOzowWebhook(req.body);
    
    if (result.success) {
      res.status(200).json({ success: true });
    } else {
      res.status(400).json({ error: result.message });
    }
  } catch (error) {
    console.error('Ozow webhook error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
```

## Environment Variables Required

Add these to your `.env` file:

```
VITE_PAYFAST_MERCHANT_ID=your_merchant_id
VITE_PAYFAST_MERCHANT_KEY=your_merchant_key
VITE_PAYFAST_MODE=sandbox|production

VITE_OZOW_SITE_CODE=your_site_code
VITE_OZOW_API_KEY=your_api_key
VITE_OZOW_MODE=sandbox|production
```

## Webhook URL Configuration

### PayFast
1. Log in to your PayFast merchant account
2. Go to Settings > Integration
3. Set ITN URL to: `https://yourdomain.com/api/payment/webhook/payfast`

### Ozow
1. Log in to your Ozow merchant portal
2. Go to Settings > Webhooks
3. Set Webhook URL to: `https://yourdomain.com/api/payment/webhook/ozow`

## Testing

### PayFast Sandbox
- Use PayFast sandbox credentials
- Test payments will trigger webhooks to your development URL
- Use ngrok or similar for local testing

### Ozow Sandbox
- Use Ozow test credentials
- Test payments will trigger webhooks
- Ensure your webhook URL is publicly accessible

## Security

1. **Signature Verification**: Always verify webhook signatures before processing
2. **HTTPS Only**: Only accept webhooks over HTTPS
3. **Idempotency**: Handle duplicate webhook calls gracefully
4. **Rate Limiting**: Implement rate limiting on webhook endpoints

## Database Updates

The webhook handlers automatically:
- Update payment status in `payments` table
- Update application payment status in `applications` table
- Create notifications for users
- Send email notifications

## Troubleshooting

1. **Webhooks not received**: Check firewall/security settings
2. **Signature verification fails**: Verify merchant keys are correct
3. **Database errors**: Check RLS policies and user permissions
4. **Payment status not updating**: Verify webhook is calling the handler correctly

