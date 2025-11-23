# Christian Leadership Movement - Complete Documentation

## Project Overview

The Christian Leadership Movement (CLM) is a comprehensive web platform built with React, TypeScript, and InsForge for managing Christian leadership programs, courses, events, and community engagement.

## Technology Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS
- **Backend**: InsForge (Database, Authentication, Storage)
- **Deployment**: Vercel
- **State Management**: React Hooks, React Router
- **Forms**: React Hook Form
- **Icons**: Lucide React

## Key Features

### 1. Admin Dashboard
- **User Management**: Manage users, roles, and permissions
- **Application Management**: Review and approve/reject applications for programs
- **Course Management**: Create and manage courses, lessons, and enrollments
- **Event Management**: Create events with online/in-person support, registration fees, multiple images
- **Bible School Management**: Comprehensive Bible School program management
  - Schedule Bible studies (online/in-person)
  - Schedule classes and meetings
  - Manage resources (textbooks, PDFs, videos, audio, links)
  - Categories and organization
- **Resource Management**: Centralized resource library
  - Support for multiple file types (PDF, images, videos, audio, documents, links)
  - Categories and organization
  - Featured resources
  - Public/private visibility
- **Financial Management**: Track donations, payments, fees
- **Content Management**: Blog posts, strategic objectives, gallery
- **Communication**: Email templates, SMS notifications, push notifications
- **Analytics**: Advanced analytics and custom reports

### 2. User Dashboard
- **Profile Management**: Update personal information
- **Applications**: Apply for programs (Membership, Bible School)
- **Courses**: Access enrolled courses, track progress
- **Events**: View and register for events
- **Calendar**: Integrated calendar showing events, Bible school activities, and course lessons
- **Certificates**: View earned certificates
- **Resources**: Access resource library with resources from all sources
- **Bible School**: Access Bible School content (studies, classes, meetings, resources)

### 3. Admin Auto-Access
- Admins automatically have access to all programs without needing to apply
- Admins are auto-enrolled in all courses
- Admins see all resources (public and private)
- Direct access buttons instead of application forms for admins

### 4. Bible School Program
Comprehensive theological education and leadership training program with:
- **About Section**: Program description and benefits
- **Why Apply**: Key benefits and outcomes
- **What You'll Gain**: 
  - Comprehensive Biblical Education
  - Practical Ministry Skills
  - Recognized Certification
  - Mentorship & Support
- **Resources & Materials**:
  - Study Materials (textbooks, study guides, digital library)
  - Video & Audio Content (recorded lectures, demonstrations, sermons)
  - Practical Tools (sermon templates, planning worksheets, counseling frameworks)
  - Community Access (forums, networking, alumni network, webinars)

### 5. Resource Library
Unified resource library showing resources from:
- General resources (public resource library)
- Bible School resources
- Course resources
- Support for multiple file types and external links

## Database Schema

### Key Tables
- `users`: User accounts
- `user_profiles`: Extended user information with roles
- `programs`: Available programs (Bible School, Membership, Short Courses)
- `applications`: Program applications
- `courses`: Course catalog
- `course_lessons`: Individual lessons within courses
- `course_enrollments`: User course enrollments
- `events`: Events with online/in-person support
- `bible_school_studies`: Scheduled Bible studies
- `bible_school_classes`: Scheduled classes
- `bible_school_meetings`: Scheduled meetings
- `bible_school_resources`: Bible School specific resources
- `resources`: General resource library
- `resource_categories`: Categories for organizing resources
- `payments`: Payment records
- `donations`: Donation records
- `notifications`: User notifications

## Authentication & Authorization

- **Authentication**: InsForge Auth
- **Roles**: `user`, `admin`, `super_admin`
- **Row Level Security (RLS)**: Implemented for all tables
- **Admin Access**: Checked via `public.is_current_user_admin()` function

## File Structure

```
src/
├── components/
│   ├── admin/          # Admin-specific components
│   ├── dashboard/      # User dashboard components
│   ├── layout/         # Layout components (TopNav, Footer)
│   └── ui/             # Reusable UI components
├── pages/
│   ├── admin/          # Admin pages
│   ├── dashboard/      # User dashboard pages
│   ├── auth/           # Authentication pages
│   └── ...             # Public pages
├── lib/
│   ├── insforge.ts     # InsForge client setup
│   ├── auth.ts         # Authentication utilities
│   └── connection.ts   # Connection utilities
└── App.tsx             # Main app with routing
```

## Key Routes

### Public Routes
- `/` - Homepage
- `/login` - Login page
- `/register` - Registration page
- `/programs/bible-school` - Bible School program page
- `/bible-school` - Bible School content page
- `/resources` - Resource library
- `/events` - Events listing
- `/events/:id` - Event details

### User Dashboard Routes (`/dashboard/*`)
- `/dashboard` - User dashboard home
- `/dashboard/profile` - User profile
- `/dashboard/applications` - User applications
- `/dashboard/courses` - User courses
- `/dashboard/events` - User events
- `/dashboard/calendar` - Integrated calendar
- `/dashboard/certificates` - User certificates

### Admin Routes (`/admin/*`)
- `/admin` - Admin dashboard home
- `/admin/users` - User management
- `/admin/applications` - Application management
- `/admin/courses` - Course management
- `/admin/events` - Event management
- `/admin/bible-school` - Bible School management
- `/admin/resources` - Resource management
- `/admin/analytics` - Analytics
- `/admin/communication` - Communication tools

## Deployment

### Vercel Deployment
1. Connect GitHub repository to Vercel
2. Configure environment variables in Vercel dashboard
3. Automatic deployments on push to main branch

### Environment Variables
Required environment variables (configure in Vercel):
- InsForge project URL
- InsForge anon key
- Any other API keys or configuration

## Recent Updates

### Admin Auto-Access
- Admins automatically get access to all programs
- No application required for admins
- Direct access buttons for admins
- Auto-enrollment in all courses

### Enhanced Resource Management
- Support for multiple file types (PDF, images, videos, audio, links)
- Category management
- External link support (YouTube, Vimeo, Google Drive, etc.)
- Featured resources
- Public/private visibility

### Bible School Enhancements
- Complete Bible School management interface
- Schedule studies, classes, and meetings
- Online/in-person support
- Resource management with categories
- All features integrated and working

### Unified Resource Library
- Resources from all sources in one place
- Source labels for clarity
- Admin sees all resources
- Users see public resources

## Development

### Running Locally
1. Clone the repository
2. Install dependencies: `npm install`
3. Set up environment variables
4. Run development server: `npm run dev`

### Building for Production
```bash
npm run build
```

## Support & Maintenance

For issues or questions, refer to the codebase or contact the development team.

---

**Last Updated**: 2024
**Version**: 1.0.0

