# Database Schema Notes for Application Forms

## Application Drafts Table

For auto-save functionality, create the following table:

```sql
CREATE TABLE application_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  form_type TEXT NOT NULL CHECK (form_type IN ('membership', 'bible_school')),
  form_data JSONB NOT NULL,
  current_step INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, form_type)
);

CREATE INDEX idx_application_drafts_user_id ON application_drafts(user_id);
```

## Applications Table - Additional Columns

The applications table should support all fields from both forms. If using a flexible schema, ensure these columns exist or use JSONB:

### Membership Form Fields:
- id_number, nationality, title, first_name, middle_name, last_name, initials, preferred_name
- province, residential_status, home_language, population_group, city, postal_code
- disabilities (JSONB array)
- current_ministry_name, ministry_types (JSONB array), ministry_position, ministry_website
- years_part_time, years_full_time, primary_income_source, primary_income_other
- high_school, highest_ministry_qualification, highest_other_qualification, other_training
- reference_first_name, reference_last_name, reference_contact, reference_email, reference_title
- signature, declaration_date, additional_documents_url (JSONB array)

### Bible School Form Fields:
- id_number, gender, marital_status, contact_number, physical_address, country
- date_accepted_christ, is_baptized, baptism_date, attends_local_church
- church_name, denomination, pastor_name, serves_in_ministry, ministry_service_description
- why_join_bible_school, leadership_roles (JSONB array), previous_leadership_experience
- calling_statement, leadership_ambitions
- referee_name, referee_contact, relationship_to_referee, registration_option
- payment_proof_url, payment_proof_key, signature, declaration_date

Note: InsForge PostgreSQL tables are flexible and can store additional fields as JSONB or individual columns. The application code handles both scenarios.

