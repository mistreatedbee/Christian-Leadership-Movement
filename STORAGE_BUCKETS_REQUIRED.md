# Required Storage Buckets

Based on the codebase analysis, here are all the storage buckets that need to be created in your InsForge storage:

## Required Buckets:

1. **`resources`** - For Bible School resources, general resources, and resource library files
   - Used for: PDFs, documents, images, videos, audio files, textbooks, notes
   - Paths: `bible-school/*`, general resources

2. **`courses`** - For course materials, lesson videos, and lesson resources
   - Used for: Course lesson videos, lesson resources (PDFs, documents)
   - Paths: `lessons/*`

3. **`gallery`** - For event images, gallery images, objective images
   - Used for: Event images (multiple per event), gallery photos, strategic objective images
   - Paths: `events/*`, `objectives/*`, general gallery images

4. **`avatars`** - For user profile avatars
   - Used for: User profile pictures
   - Paths: `{user_id}/avatar_*`

## Summary:
- `resources` - Bible School and general resources
- `courses` - Course lesson materials
- `gallery` - Events, gallery, objectives images
- `avatars` - User avatars

Make sure all these buckets are created in your InsForge storage dashboard with appropriate permissions (public read access for resources, courses, gallery; authenticated access for avatars).

