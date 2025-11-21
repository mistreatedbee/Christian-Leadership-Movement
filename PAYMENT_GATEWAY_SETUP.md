# Payment Gateway Setup Guide - PayFast & Ozow

## Overview
This guide explains how to set up PayFast and Ozow payment gateways for your Christian Leadership Movement platform. Both gateways connect directly to major South African banks and are the best options for SA-based transactions.

## Supported Payment Gateways

1. **PayFast** - Most popular, supports cards, EFT, Instant EFT
2. **Ozow** - Instant EFT, connects directly to major SA banks

## Why These Two?

- ✅ **Best for South Africa**: Both are designed specifically for SA market
- ✅ **Bank Integration**: Connect directly to major SA banks (FNB, ABSA, Standard Bank, Nedbank, etc.)
- ✅ **Instant EFT**: Fast payment processing
- ✅ **Low Fees**: Competitive transaction fees
- ✅ **Easy Setup**: Straightforward integration process
- ✅ **Reliable**: Most trusted payment gateways in SA

## Step-by-Step Setup

### 1. PayFast Setup (Recommended)

**Why PayFast?**
- Most popular in South Africa
- Supports multiple payment methods (cards, EFT, Instant EFT)
- Easy integration
- Excellent documentation
- Best for general use

**Sign Up:**
1. Go to: https://www.payfast.co.za/
2. Click "Sign Up" → "Merchant Sign Up"
3. Fill out business details:
   - Business name: **Christian Leadership Movement**
   - Business type: **Non-Profit/Religious Organization**
   - Contact email: **kenstraining04@gmail.com**
   - Phone: **073 204 7642**
   - Address: **Dwarsloop phase 2 house no 1717**
   - Bank account details (where payments will be deposited)
4. Submit required documents:
   - Business registration documents
   - Bank statement (last 3 months)
   - ID of account holder
   - Proof of address
5. Wait for approval (usually 1-2 business days)

**Get Credentials:**
1. After approval, log into PayFast dashboard
2. Go to "Settings" → "Integration"
3. Copy these values:
   - **Merchant ID** (e.g., `10000100`)
   - **Merchant Key** (e.g., `46f0cd694581a`)
   - **Passphrase** (optional but recommended - set one in settings)

**For Testing (Sandbox):**
- Use PayFast Sandbox: https://sandbox.payfast.co.za
- Test Merchant ID: `10000100`
- Test Merchant Key: `46f0cd694581a`
- Test cards available in PayFast documentation

**Add to .env:**
```env
VITE_PAYFAST_MERCHANT_ID=your_merchant_id
VITE_PAYFAST_MERCHANT_KEY=your_merchant_key
VITE_PAYFAST_PASSPHRASE=your_passphrase (if set)
VITE_PAYFAST_MODE=sandbox  # or 'live' for production
```

### 2. Ozow Setup

**Why Ozow?**
- Instant EFT from major SA banks
- Direct bank integration
- Lower fees for EFT transactions
- Fast processing

**Sign Up:**
1. Go to: https://www.ozow.com/
2. Click "Get Started" or "Sign Up"
3. Fill out merchant application:
   - Business name: **Christian Leadership Movement**
   - Business type: **Non-Profit/Religious Organization**
   - Contact details
   - Bank account details
4. Submit required documents
5. Wait for approval (usually 2-3 business days)

**Get Credentials:**
1. After approval, log into Ozow dashboard
2. Go to "Settings" → "API Keys"
3. Copy:
   - **Site Code**
   - **API Key**
   - **Private Key**

**Add to .env:**
```env
VITE_OZOW_SITE_CODE=your_site_code
VITE_OZOW_API_KEY=your_api_key
VITE_OZOW_PRIVATE_KEY=your_private_key
VITE_OZOW_MODE=sandbox  # or 'live' for production
```

## Environment Variables Setup

Add all your payment gateway credentials to your `.env` file:

```env
# PayFast (Recommended)
VITE_PAYFAST_MERCHANT_ID=your_merchant_id
VITE_PAYFAST_MERCHANT_KEY=your_merchant_key
VITE_PAYFAST_PASSPHRASE=your_passphrase
VITE_PAYFAST_MODE=sandbox  # Change to 'live' for production

# Ozow
VITE_OZOW_SITE_CODE=your_site_code
VITE_OZOW_API_KEY=your_api_key
VITE_OZOW_PRIVATE_KEY=your_private_key
VITE_OZOW_MODE=sandbox  # Change to 'live' for production
```

**Important:** After updating `.env`, restart your dev server!

## Payment Flow

1. **User makes payment** (donation, application fee, or registration fee)
   - User enters amount
   - System creates payment record in database
   - Status: `pending`

2. **User selects payment method**
   - User chooses PayFast or Ozow
   - System generates secure payment URL with credentials

3. **Redirect to payment gateway**
   - User redirected to PayFast/Ozow website
   - User completes payment on gateway site
   - Gateway connects to user's bank for Instant EFT

4. **Payment confirmation**
   - Gateway redirects back to your site
   - Webhook confirms payment
   - System updates payment status to `confirmed`
   - **Email sent to user** confirming payment

5. **Funds deposited**
   - Payment gateway deposits funds to your bank account
   - Usually within 2-5 business days

## Email Notifications

The system automatically sends confirmation emails for:

1. **Donations**: "Donation Confirmed - Thank You!"
2. **Application Fees**: "Application Fee Payment Confirmed"
3. **Registration Fees**: "Registration Fee Payment Confirmed"

All emails include:
- Payment amount
- Payment method used
- Payment status
- Transaction details

## Webhook Setup (Important!)

Payment gateways need to notify your system when payments are confirmed.

### For PayFast:
1. Log into PayFast dashboard
2. Go to "Settings" → "Integration" → "ITN (Instant Transaction Notification)"
3. Set ITN URL to: `https://your-domain.com/api/payment/webhook`
4. Enable ITN notifications
5. Verify webhook signatures for security

### For Ozow:
1. Log into Ozow dashboard
2. Go to "Settings" → "Webhooks"
3. Set webhook URL to: `https://your-domain.com/api/payment/webhook`
4. Enable webhook notifications
5. Verify webhook signatures

## Testing

### Test Mode (Sandbox):
- Use sandbox/test credentials
- Test with test card numbers (PayFast) or test bank accounts (Ozow)
- No real money transferred
- Perfect for development

### Production Mode:
- Use live credentials
- Real payments processed
- Funds deposited to your account
- Enable only after thorough testing

## Recommended Setup

**For Quick Start:**
1. **Sign up with PayFast** (easiest and most popular)
2. Use sandbox mode for testing
3. Get approved for live mode
4. Add credentials to `.env`
5. Test with small donation
6. Verify funds received
7. Verify email notifications are sent

**For Best Coverage:**
1. Set up PayFast (primary - for cards and general payments)
2. Add Ozow (for Instant EFT users)
3. Users can choose their preferred method
4. Both connect to SA banks

## Payment Gateway Comparison

| Feature | PayFast | Ozow |
|---------|---------|------|
| **Setup Time** | 1-2 days | 2-3 days |
| **Fees** | 2.9% + R2 | 1.5% + R1 |
| **Payment Methods** | Cards, EFT, Instant EFT | Instant EFT, Debit Order |
| **Bank Integration** | All major SA banks | All major SA banks |
| **Best For** | General use, cards | EFT payments |
| **Instant EFT** | ✅ Yes | ✅ Yes |

**Recommendation:** Start with PayFast for the best balance of features and ease of setup. Add Ozow later if you want to offer lower fees for EFT transactions.

## Security Notes

- **Never commit `.env` file to Git**
- Keep credentials secure
- Use environment variables only
- Enable HTTPS in production
- Verify webhook signatures
- Test in sandbox first

## Support Contacts

- **PayFast**: support@payfast.co.za | 021 447 8700
- **Ozow**: support@ozow.com

## Next Steps

1. Choose your primary payment gateway (PayFast recommended)
2. Sign up and get approved
3. Get your credentials
4. Add to `.env` file
5. Restart dev server
6. Test with a small payment
7. Verify payment works
8. Verify email notifications are sent
9. Switch to live mode when ready

## Email Notification Details

### Donation Confirmation Email
- **Subject**: "Donation Confirmed - Thank You!"
- **Content**: Includes donation amount, payment method, campaign (if applicable)
- **Sent when**: Payment is confirmed

### Application Fee Confirmation Email
- **Subject**: "Application Fee Payment Confirmed"
- **Content**: Includes application type, payment amount, payment method
- **Sent when**: Application fee payment is confirmed

### Registration Fee Confirmation Email
- **Subject**: "Registration Fee Payment Confirmed"
- **Content**: Includes payment amount, payment method, confirmation message
- **Sent when**: Registration fee payment is confirmed

All emails are sent automatically when payments are confirmed via the payment gateway.
