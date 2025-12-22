# Complete List of All Application Form Fields

## 📋 BIBLE SCHOOL APPLICATION FORM - ALL FIELDS

### Step 1: Personal Information (7 fields)
1. **fullName** (Full Name) - Required
2. **idNumber** (ID Number) - Required, 13 digits
3. **gender** (Gender) - Required (Male/Female/Other)
4. **maritalStatus** (Marital Status) - Required (Single/Married/Divorced/Widowed)
5. **contactNumber** (Contact Number) - Required, min 10 digits
6. **email** (Email Address) - Required, valid email format
7. **physicalAddress** (Physical Address) - Required, min 10 characters
8. **country** (Country) - Required, min 2 characters

### Step 2: Spiritual Background (9 fields)
9. **dateAcceptedChrist** (Date You Accepted Christ) - Optional, date
10. **isBaptized** (Baptized) - Boolean checkbox
11. **baptismDate** (Baptism Date) - Optional, date (shown if isBaptized = true)
12. **attendsLocalChurch** (Attends Local Church) - Boolean checkbox
13. **churchName** (Church Name) - Optional, text (shown if attendsLocalChurch = true)
14. **denomination** (Denomination) - Optional, text (shown if attendsLocalChurch = true)
15. **pastorName** (Pastor Name) - Optional, text (shown if attendsLocalChurch = true)
16. **servesInMinistry** (Serves in Ministry) - Boolean checkbox
17. **ministryServiceDescription** (Ministry Service Description) - Optional, textarea (shown if servesInMinistry = true)

### Step 3: Leadership Interests (3+ fields)
18. **whyJoinBibleSchool** (Why Join Bible School?) - Required, textarea, min 50 characters
19. **leadershipRoles** (Leadership Roles) - Array of objects, each with:
    - **title** (Role Title) - Optional
    - **description** (Role Description) - Optional
20. **previousLeadershipExperience** (Previous Leadership Experience) - Optional, textarea

### Step 4: Vision & Calling (2 fields)
21. **callingStatement** (Calling Statement) - Required, textarea, min 100 characters
22. **leadershipAmbitions** (Leadership Ambitions) - Optional, textarea

### Step 5: References & Fees (4 fields)
23. **refereeName** (Referee Name) - Required
24. **refereeContact** (Referee Contact) - Required
25. **relationshipToReferee** (Relationship to Referee) - Required
26. **registrationOption** (Registration Option) - Required (with_acrp/without_acrp)
27. **signature** (Signature) - Required
28. **declarationDate** (Declaration Date) - Required, date (auto-filled)

### Uploaded Files
29. **id_passport_url** (ID Copy/Passport) - Required, file upload
30. **payment_proof_url** (Payment Proof) - Optional, file upload

**TOTAL BIBLE SCHOOL FIELDS: 30 fields**

---

## 📋 MEMBERSHIP APPLICATION FORM - ALL FIELDS

### Step 1: Personal Information (18 fields)
1. **idNumber** (South African ID Number) - Required, exactly 13 digits
2. **nationality** (Nationality) - Required
3. **title** (Title) - Optional (Pastor/Bishop/Mr/Mrs/Ms/Dr)
4. **firstName** (First Name) - Required, min 2 characters
5. **middleName** (Middle Name) - Optional
6. **lastName** (Last Name) - Required, min 2 characters
7. **initials** (Initials) - Optional
8. **preferredName** (Preferred Name) - Optional
9. **dateOfBirth** (Date of Birth) - Required, date, must be 16+ years old
10. **gender** (Gender) - Required (Male/Female/Other)
11. **province** (Province) - Required (South African provinces)
12. **residentialStatus** (Residential Status) - Required (Citizen/Permanent Resident/Temporary Resident/Refugee)
13. **phone** (Phone Number) - Required, min 10 digits
14. **email** (Email Address) - Required, valid email format
15. **homeLanguage** (Home Language) - Required
16. **populationGroup** (Population Group) - Required (African/Coloured/Indian-Asian/White/Other)
17. **city** (City) - Optional
18. **postalCode** (Postal Code) - Optional

### Disability Information (6 fields)
19. **disabilityNone** (No Disability) - Boolean checkbox
20. **disabilitySight** (Sight Disability) - Boolean checkbox
21. **disabilityHearing** (Hearing Disability) - Boolean checkbox
22. **disabilitySpeech** (Speech Disability) - Boolean checkbox
23. **disabilityPhysical** (Physical Disability) - Boolean checkbox
24. **disabilityOther** (Other Disability) - Optional, text (shown if disabilityOther checkbox selected)

### Step 2: Ministry Involvement (12 fields)
25. **currentMinistryName** (Current Ministry Name) - Optional
26. **denomination** (Denomination) - Optional
27. **ministryTypeLocalChurch** (Ministry Type: Local Church) - Boolean checkbox
28. **ministryTypeTeaching** (Ministry Type: Teaching Institution) - Boolean checkbox
29. **ministryTypeCounselling** (Ministry Type: Counselling) - Boolean checkbox
30. **ministryTypeYouth** (Ministry Type: Youth/Child) - Boolean checkbox
31. **ministryTypeOther** (Ministry Type: Other) - Boolean checkbox
32. **ministryTypeNotApplicable** (Ministry Type: Not Applicable) - Boolean checkbox
33. **ministryTypeOtherText** (Ministry Type Other Text) - Optional, text (shown if ministryTypeOther = true)
34. **ministryPosition** (Ministry Position) - Optional
35. **ministryWebsite** (Ministry Website) - Optional, URL
36. **yearsPartTime** (Years Part-Time Ministry) - Optional, number
37. **yearsFullTime** (Years Full-Time Ministry) - Optional, number
38. **primaryIncomeSource** (Primary Income Source) - Required
39. **primaryIncomeOther** (Primary Income Other) - Optional, text (shown if primaryIncomeSource = "Other")

### Step 3: Qualifications & References (9 fields)
40. **highSchool** (High School) - Optional
41. **highestMinistryQualification** (Highest Ministry Qualification) - Optional
42. **highestOtherQualification** (Highest Other Qualification) - Optional
43. **otherTraining** (Other Training) - Optional
44. **referenceFirstName** (Reference First Name) - Required
45. **referenceLastName** (Reference Last Name) - Required
46. **referenceContact** (Reference Contact) - Required
47. **referenceEmail** (Reference Email) - Required, valid email format
48. **referenceTitle** (Reference Title) - Optional
49. **signature** (Signature) - Required
50. **declarationDate** (Declaration Date) - Required, date (auto-filled)

### Uploaded Files
51. **id_passport_url** (ID Copy/Passport) - Required, file upload
52. **additional_documents_url** (Additional Documents) - Optional, multiple file uploads (array)

**TOTAL MEMBERSHIP FIELDS: 52 fields**

---

## 📊 SUMMARY

- **Bible School Total Fields**: 30 fields
- **Membership Total Fields**: 52 fields
- **Grand Total**: 82 unique field types across both forms

## ✅ VERIFICATION CHECKLIST

All these fields must be:
- [x] Visible in Admin Application Management Page (Details Modal)
- [x] Included in PDF Export
- [x] Accessible from form_data JSONB column
- [x] Properly formatted and labeled
- [x] Handled for both required and optional fields
- [x] Display boolean values as Yes/No
- [x] Display arrays properly
- [x] Show uploaded files with download links

