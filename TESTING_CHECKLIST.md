# Testing Checklist

## Database Setup ✅
- [x] `application_drafts` table created
- [x] `fee_settings` table created with initial fees
- [x] All additional columns added to `applications` table

## Application Forms Testing

### CLM Membership Application Form (`/apply/membership`)
- [ ] Step 1: Personal Information
  - [ ] All required fields validate correctly
  - [ ] ID number validation (13 digits)
  - [ ] Age validation (minimum 16 years)
  - [ ] Disability section shows/hides correctly
- [ ] Step 2: Ministry Involvement
  - [ ] Ministry type checkboxes work
  - [ ] Primary income source validation
- [ ] Step 3: Qualifications & References
  - [ ] Reference information validates
  - [ ] File uploads work (ID copy required)
  - [ ] Declaration signature and date
- [ ] Auto-save functionality
  - [ ] Draft saves every 15 seconds
  - [ ] Draft loads on page refresh
- [ ] Payment Integration
  - [ ] Application fee displays if > 0
  - [ ] Payment record created on submission
  - [ ] Redirects to payment page if fee required
  - [ ] Payment success updates application status

### Bible School / Ordination Application Form (`/apply/bible-school`)
- [ ] Step 1: Personal Information
  - [ ] All required fields validate
  - [ ] ID number validation
  - [ ] Address validation (minimum 10 characters)
- [ ] Step 2: Spiritual Background
  - [ ] Conditional fields show/hide (baptism, church, ministry)
- [ ] Step 3: Leadership Interests
  - [ ] Why join Bible School (minimum 50 characters)
  - [ ] Dynamic leadership roles (add/remove)
- [ ] Step 4: Vision & Calling
  - [ ] Calling statement (minimum 100 characters)
- [ ] Step 5: References & Fees
  - [ ] Registration option selection
  - [ ] Fees display from database
  - [ ] Bank details copy functionality
  - [ ] Payment proof upload (optional)
  - [ ] ID copy upload (required)
- [ ] Auto-save functionality
- [ ] Payment Integration
  - [ ] Registration fees display correctly
  - [ ] Payment record created with correct amount
  - [ ] If payment proof uploaded, status = confirmed
  - [ ] If no proof, redirects to payment page

## Admin Features Testing

### Fee Management (`/admin/fees`)
- [ ] View all fee settings
- [ ] Edit fee amounts
- [ ] Save changes
- [ ] Cancel editing
- [ ] Fee changes reflect in application forms

### Application Management (`/admin/applications`)
- [ ] View all applications
- [ ] Filter by status
- [ ] Search applications
- [ ] Approve/Reject applications
- [ ] PDF Export
  - [ ] Membership applications export correctly
  - [ ] Bible School applications export correctly
  - [ ] All fields included in PDF
- [ ] CSV Export
  - [ ] All applications export correctly

## Payment Flow Testing

### Payment Page (`/payment`)
- [ ] Payment methods display
- [ ] Payment summary shows correct amount
- [ ] Payment gateway URLs generated correctly
- [ ] Redirects to gateway

### Payment Success (`/payment/success`)
- [ ] Payment status updated to confirmed
- [ ] Application payment_status updated
- [ ] Notification created
- [ ] Redirects to dashboard

## PDF Export Verification

### Membership Application PDF
- [ ] Personal Information section
- [ ] Disability Information (if applicable)
- [ ] Ministry Involvement
- [ ] Qualifications
- [ ] Reference Information
- [ ] Declaration
- [ ] Application Status

### Bible School Application PDF
- [ ] Personal Information
- [ ] Spiritual Background
- [ ] Leadership Interests
- [ ] Leadership Roles (if any)
- [ ] Vision & Calling
- [ ] Reference Information
- [ ] Registration & Payment
- [ ] Declaration
- [ ] Application Status

## End-to-End Testing Scenarios

### Scenario 1: Membership Application with Fee
1. User fills out membership form
2. Form auto-saves
3. User submits form
4. Payment record created
5. User redirected to payment page
6. User selects payment method
7. User completes payment
8. Payment confirmed
9. Application status updated
10. Admin can view and download PDF

### Scenario 2: Bible School Application with Bank Payment
1. User fills out Bible School form
2. User selects registration option
3. User uploads payment proof
4. User submits form
5. Payment status = confirmed (proof uploaded)
6. Application created with confirmed payment
7. Admin can view and download PDF

### Scenario 3: Bible School Application with Online Payment
1. User fills out Bible School form
2. User selects registration option
3. User does NOT upload payment proof
4. User submits form
5. Payment record created (status = pending)
6. User redirected to payment page
7. User completes online payment
8. Payment confirmed
9. Application status updated

### Scenario 4: Admin Fee Management
1. Admin navigates to Fee Management
2. Admin edits membership application fee
3. Admin saves changes
4. New application form shows updated fee
5. Existing applications retain old fee

## Known Issues / Notes
- Payment gateway integration requires actual merchant credentials
- Email notifications require edge function deployment
- All database tables created successfully
- All form fields saved to database
- PDF export includes all fields dynamically

