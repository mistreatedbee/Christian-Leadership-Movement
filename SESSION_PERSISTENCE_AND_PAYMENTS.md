# Session Persistence & Payment System - Complete Guide

## ✅ Session Persistence

### How It Works
The `InsforgeProvider` automatically handles session persistence using:
- **localStorage**: Stores authentication tokens
- **Automatic token refresh**: Tokens are refreshed automatically
- **Persistent sessions**: Users stay logged in across page refreshes and navigation

### What's Implemented
1. **TopNav Component**: 
   - Shows user name/email when logged in
   - Shows "Login" button when not logged in
   - Shows "Logout" button when logged in
   - Works on both desktop and mobile

2. **Session Management**:
   - Users remain logged in when navigating to home page
   - Session persists after browser refresh
   - Session persists across different pages
   - Logout clears session properly

### Testing Session Persistence
1. Log in to your account
2. Navigate to home page (`/`)
3. Check TopNav - should show your name/email
4. Refresh the page (F5)
5. You should still be logged in
6. Navigate to different pages
7. You should remain logged in throughout

## ✅ Donations Page

### Features
- **Donation Form**: Users can enter amount, campaign, message
- **Anonymous Option**: Users can make anonymous donations
- **Payment Integration**: Redirects to payment page after submission
- **Real-time Data**: All donations saved to database
- **Notifications**: Creates notifications and sends emails

### How It Works
1. User enters donation amount (minimum R1)
2. Optionally adds campaign name and message
3. Can choose to make donation anonymous
4. Clicks "Donate Now"
5. System creates donation and payment records
6. Redirects to payment page
7. User completes payment
8. Payment confirmed
9. Donation status updated to "confirmed"

### Database Tables Used
- `donations` - Stores donation records
- `payments` - Stores payment transactions
- `notifications` - Creates notification for user

## ✅ Payment System

### Supported Payment Gateways

1. **PayFast** (Recommended)
   - Website: https://www.payfast.co.za/
   - Sign Up: https://www.payfast.co.za/sign-up
   - Supports: Credit/Debit Cards, EFT, Instant EFT
   - Fees: 2.9% + R2 per transaction
   - Setup Time: 1-2 business days

2. **Ozow**
   - Website: https://www.ozow.com/
   - Sign Up: https://www.ozow.com/get-started
   - Supports: Instant EFT, Debit Orders
   - Fees: 1.5% + R1 per transaction
   - Setup Time: 2-3 business days

3. **PayU**
   - Website: https://www.payu.co.za/
   - Sign Up: https://www.payu.co.za/merchant-registration
   - Supports: Credit/Debit Cards, EFT
   - Fees: 2.9% + R2 per transaction
   - Setup Time: 2-3 business days

4. **SnapScan**
   - Website: https://www.snapscan.co.za/
   - Sign Up: https://www.snapscan.co.za/get-started
   - Supports: Mobile payments via QR code
   - Fees: 2.75% per transaction
   - Setup Time: 1-2 business days

5. **Zapper**
   - Website: https://www.zapper.com/
   - Sign Up: https://www.zapper.com/merchant-sign-up
   - Supports: Mobile payments via QR code
   - Fees: 2.75% per transaction
   - Setup Time: 1-2 business days

## 🔧 Payment Gateway Setup

### Step 1: Choose Your Payment Gateway

**Recommended: PayFast**
- Most popular in South Africa
- Easiest to set up
- Best documentation
- Supports all payment methods

### Step 2: Sign Up

**For PayFast:**
1. Go to: https://www.payfast.co.za/
2. Click "Sign Up" → "Merchant Sign Up"
3. Fill out:
   - Business name: **Christian Leadership Movement**
   - Business type: **Non-Profit/Religious Organization**
   - Contact email: **kenstraining04@gmail.com**
   - Phone: **073 204 7642**
   - Address: **Dwarsloop phase 2 house no 1717**
   - Bank account details (where payments will be deposited)
4. Upload documents:
   - Business registration documents
   - Bank statement (last 3 months)
   - ID of account holder
   - Proof of address
5. Submit application
6. Wait for approval (usually 1-2 business days)

### Step 3: Get Your Credentials

**After PayFast Approval:**
1. Log into PayFast dashboard
2. Go to "Settings" → "Integration"
3. Copy these values:
   - **Merchant ID** (e.g., `10000100`)
   - **Merchant Key** (e.g., `46f0cd694581a`)
   - **Passphrase** (if you set one - optional but recommended)

### Step 4: Add to .env File

Add these to your `.env` file:

```env
# PayFast Credentials
VITE_PAYFAST_MERCHANT_ID=your_merchant_id_here
VITE_PAYFAST_MERCHANT_KEY=your_merchant_key_here
VITE_PAYFAST_PASSPHRASE=your_passphrase_here (optional)
VITE_PAYFAST_MODE=sandbox  # Use 'sandbox' for testing, 'live' for production
```

**Important:** After updating `.env`, restart your dev server!

### Step 5: Test Payment

1. Use sandbox mode first (VITE_PAYFAST_MODE=sandbox)
2. Make a test donation
3. Use PayFast test card numbers (see PayFast documentation)
4. Verify payment appears in PayFast dashboard
5. Verify payment status updates in your system

### Step 6: Go Live

1. Once testing works, switch to live mode
2. Update `.env`: `VITE_PAYFAST_MODE=live`
3. Use your live credentials
4. Test with a small real payment
5. Verify funds are deposited to your bank account

## 💰 How Payments Work

### Payment Flow

1. **User Initiates Payment**
   - User makes donation or application payment
   - System creates payment record (status: `pending`)

2. **User Selects Payment Method**
   - User chooses PayFast, Ozow, etc.
   - System generates secure payment URL

3. **Redirect to Payment Gateway**
   - User redirected to PayFast/Ozow website
   - User enters payment details on gateway site
   - Gateway processes payment securely

4. **Payment Confirmation**
   - Gateway redirects back to your site
   - System receives payment confirmation
   - Payment status updated to `confirmed`
   - Related records updated (donation/application)

5. **Funds Deposited**
   - Payment gateway deposits funds to your bank account
   - Usually within 2-5 business days
   - You receive email notification from gateway

### Webhook Setup (For Production)

Payment gateways send webhooks to confirm payments. You'll need to:

1. **Create Webhook Endpoint**
   - URL: `https://your-domain.com/api/payment/webhook`
   - This endpoint receives payment confirmations

2. **Configure in PayFast**
   - Log into PayFast dashboard
   - Go to "Settings" → "Integration" → "ITN (Instant Transaction Notification)"
   - Set ITN URL to your webhook endpoint
   - Enable ITN notifications

3. **Verify Webhook Signatures**
   - Always verify webhook signatures for security
   - Prevents fraudulent payment confirmations

## 📋 Quick Setup Checklist

### For PayFast (Recommended):
- [ ] Sign up at https://www.payfast.co.za/
- [ ] Complete merchant application
- [ ] Upload required documents
- [ ] Wait for approval (1-2 days)
- [ ] Get Merchant ID and Merchant Key
- [ ] Add credentials to `.env` file
- [ ] Restart dev server
- [ ] Test with sandbox mode
- [ ] Switch to live mode when ready
- [ ] Set up webhook URL in PayFast dashboard

### For Other Gateways:
- [ ] Sign up with chosen gateway
- [ ] Complete merchant application
- [ ] Get API credentials
- [ ] Add to `.env` file
- [ ] Restart dev server
- [ ] Test payment flow
- [ ] Configure webhooks

## 🔒 Security Notes

1. **Never commit `.env` file to Git**
   - Already in `.gitignore`
   - Keep credentials secret

2. **Use HTTPS in Production**
   - Required for payment processing
   - SSL certificate needed

3. **Verify Webhook Signatures**
   - Always verify webhook data
   - Prevents fraud

4. **Test in Sandbox First**
   - Never test with real money initially
   - Use sandbox/test mode

## 📞 Support Contacts

- **PayFast**: support@payfast.co.za | 021 447 8700
- **Ozow**: support@ozow.com
- **PayU**: support@payu.co.za
- **SnapScan**: support@snapscan.co.za
- **Zapper**: support@zapper.com

## ✅ What's Working

1. ✅ **Session Persistence**: Users stay logged in across pages
2. ✅ **TopNav**: Shows logged-in state
3. ✅ **Donations Page**: Fully functional with payment integration
4. ✅ **Payment Page**: Supports multiple payment gateways
5. ✅ **Payment Success**: Handles payment confirmations
6. ✅ **Database Integration**: All payments saved to database
7. ✅ **Notifications**: Users receive payment confirmations

## 🎯 Next Steps

1. **Sign up with PayFast** (or your preferred gateway)
2. **Get your credentials**
3. **Add to `.env` file**
4. **Restart dev server**
5. **Test payment flow**
6. **Go live when ready**

Your payment system is ready! Just add your payment gateway credentials to start accepting payments.

