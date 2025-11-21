# Christian Leadership Movement (CLM)

A comprehensive web platform for the Christian Leadership Movement organization, providing course management, mentorship programs, community forums, prayer walls, and administrative tools.

## 🌟 Features

### User Features
- **User Registration & Authentication** - Secure sign-up and login system
- **Course Management** - Browse and enroll in Bible School and University of Pretoria courses
- **Mentorship Program** - Apply to become a mentor or find a mentor
- **Community Forum** - Engage in discussions and share knowledge
- **Prayer Wall** - Submit and respond to prayer requests
- **Groups** - Create and join community groups
- **Resource Library** - Access educational resources and materials
- **News/Blog** - Stay updated with latest news and articles
- **Events** - View and register for upcoming events
- **Donations** - Support the organization through donations
- **User Dashboard** - Manage applications, courses, certificates, and profile

### Admin Features
- **Admin Dashboard** - Comprehensive overview with real-time statistics
- **User Management** - Manage users, roles, and permissions
- **Application Management** - Review and process applications
- **Course Management** - Create, edit, and manage courses
- **Event Management** - Create and manage events
- **Content Management** - Manage blog posts, resources, and content
- **Forum Moderation** - Moderate forum topics, replies, and categories
- **Group Management** - Manage groups and members
- **Prayer Requests Management** - Moderate prayer wall content
- **Mentorship Management** - Approve mentors and manage mentorship matches
- **Analytics & Reports** - View detailed analytics and generate reports
- **Certificate Management** - Generate and manage certificates
- **Financial Reports** - Track donations and payments

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- InsForge account and project
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/mistreatedbee/Christian-Leadership-Movement.git
   cd Christian-Leadership-Movement
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   
   Create a `.env` file in the root directory:
   ```env
   VITE_INSFORGE_BASE_URL=https://your-project.insforge.app
   VITE_INSFORGE_ANON_KEY=your-anon-key-here
   ```
   
   Get these values from your InsForge dashboard:
   - Base URL: Project Settings → API URL
   - Anon Key: API Keys → Anonymous Key

4. **Set up the database**
   
   - Go to your InsForge dashboard
   - Navigate to Database → SQL Editor
   - Run the `COMPLETE_DATABASE_SETUP_NEW.sql` script
   - Create storage buckets:
     - `applications` (public)
     - `courses` (public)
     - `gallery` (public)
     - `avatars` (public)
     - `certificates` (public or private)

5. **Create admin account**
   
   - Register a user account through the website
   - Run the `MAKE_KENNY_ADMIN.sql` script (or similar) to grant admin access
   - Replace the user ID in the script with your user ID

6. **Run the development server**
   ```bash
   npm run dev
   ```

   The application will be available at `http://localhost:5173`

## 📁 Project Structure

```
Christian-Leadership-Movement/
├── public/
│   └── assets/
│       └── images/          # Static images (logo, gallery, etc.)
├── src/
│   ├── components/         # Reusable React components
│   │   ├── admin/          # Admin-specific components
│   │   ├── dashboard/      # Dashboard components
│   │   ├── home/           # Homepage components
│   │   ├── layout/         # Layout components (Nav, Footer)
│   │   └── ui/             # UI components (Button, etc.)
│   ├── contexts/           # React contexts (Theme, Language)
│   ├── lib/                # Utility functions and helpers
│   ├── pages/              # Page components
│   │   ├── admin/         # Admin pages
│   │   ├── auth/          # Authentication pages
│   │   ├── dashboard/     # User dashboard pages
│   │   └── ...            # Other pages
│   ├── App.tsx            # Main app component
│   └── index.tsx          # Entry point
├── functions/              # Edge functions (email sending)
├── .env                   # Environment variables (not committed)
├── package.json           # Dependencies and scripts
└── vercel.json            # Vercel deployment configuration
```

## 🛠️ Technology Stack

- **Frontend Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Routing**: React Router DOM
- **Styling**: Tailwind CSS
- **Forms**: React Hook Form
- **Icons**: Lucide React
- **Backend**: InsForge (Database, Storage, Authentication)
- **Deployment**: Vercel

## 📝 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build locally
- `npm run lint` - Run ESLint

## 🔐 Admin Access

To create an admin account:

1. Register a user account through the website
2. Get your user ID from the InsForge dashboard or database
3. Run the SQL script to update user role:
   ```sql
   UPDATE public.user_profiles
   SET role = 'admin', updated_at = now()
   WHERE user_id = 'YOUR_USER_ID_HERE';
   ```

## 🚀 Deployment

### Deploying to Vercel

1. **Install Vercel CLI** (if not already installed)
   ```bash
   npm i -g vercel
   ```

2. **Login to Vercel**
   ```bash
   vercel login
   ```

3. **Deploy**
   ```bash
   vercel
   ```

4. **Add Environment Variables**
   - Go to Vercel Dashboard → Project Settings → Environment Variables
   - Add `VITE_INSFORGE_BASE_URL` and `VITE_INSFORGE_ANON_KEY`
   - Redeploy after adding variables

5. **Deploy to Production**
   ```bash
   vercel --prod
   ```

For detailed deployment instructions, see [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)

## 📚 Documentation

- [Deployment Guide](./DEPLOYMENT_GUIDE.md) - Complete deployment instructions
- [Database Setup](./COMPLETE_DATABASE_SETUP_NEW.sql) - Database schema and setup
- [Admin Setup](./ADMIN_SETUP.md) - Admin account creation guide
- [InsForge Setup Guide](./NEW_INSFORGE_SETUP_GUIDE.md) - Backend setup instructions

## 🔒 Security Notes

- Never commit `.env` file (it's in `.gitignore`)
- Environment variables must be set in your deployment platform
- Admin accounts should be created carefully
- All database operations use Row Level Security (RLS) policies

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is private and proprietary to Christian Leadership Movement.

## 📞 Support

For issues, questions, or support, please contact the development team or create an issue in the repository.

## 🎯 Key Features Overview

- ✅ User authentication and authorization
- ✅ Course enrollment and management
- ✅ Mentorship program with matching
- ✅ Community forum with moderation
- ✅ Prayer wall with responses
- ✅ Group creation and management
- ✅ Resource library
- ✅ Blog/News system
- ✅ Event management
- ✅ Donation processing
- ✅ Certificate generation
- ✅ Comprehensive admin dashboard
- ✅ Real-time analytics
- ✅ Email notifications
- ✅ File uploads (avatars, documents, images)

---

**Built with ❤️ for Christian Leadership Movement**
