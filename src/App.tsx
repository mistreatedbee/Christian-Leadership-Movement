import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { InsforgeProvider } from '@insforge/react';
import { getInsForgeBaseUrl, getInsForgeAnonKey } from './lib/connection';
import { ThemeProvider } from './contexts/ThemeContext';
import { LanguageProvider } from './contexts/LanguageContext';
import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/auth/ResetPasswordPage';
import { DashboardLayout } from './components/dashboard/DashboardLayout';
import { DashboardHome } from './pages/dashboard/DashboardHome';
import { ProfilePage } from './pages/dashboard/ProfilePage';
import { ApplicationsPage } from './pages/dashboard/ApplicationsPage';
import { AdminDashboardLayout } from './components/admin/AdminDashboardLayout';
import { AdminDashboardHome } from './pages/admin/AdminDashboardHome';
import { AdminProfilePage } from './pages/admin/AdminProfilePage';
import { UserManagementPage } from './pages/admin/UserManagementPage';
import { ApplicationManagementPage } from './pages/admin/ApplicationManagementPage';
import { CourseManagementPage } from './pages/admin/CourseManagementPage';
import { EventManagementPage } from './pages/admin/EventManagementPage';
import { CertificateManagementPage } from './pages/admin/CertificateManagementPage';
import { AnalyticsPage } from './pages/admin/AnalyticsPage';
import { CommunicationPage } from './pages/admin/CommunicationPage';
import { AdminSettingsPage } from './pages/admin/AdminSettingsPage';
import { ApplyPage } from './pages/ApplyPage';
import { ApplyMembershipPage } from './pages/ApplyMembershipPage';
import { ApplyBibleSchoolPage } from './pages/ApplyBibleSchoolPage';
import { DonationsPage } from './pages/DonationsPage';
import { NotificationsPage } from './pages/dashboard/NotificationsPage';
import { EventsPage as DashboardEventsPage } from './pages/dashboard/EventsPage';
import { CoursesPage } from './pages/dashboard/CoursesPage';
import { CourseLessonPage } from './pages/dashboard/CourseLessonPage';
import { CertificatesPage } from './pages/dashboard/CertificatesPage';
import { ContentManagementPage } from './pages/admin/ContentManagementPage';
import { FeeManagementPage } from './pages/admin/FeeManagementPage';
import { ObjectivesManagementPage } from './pages/admin/ObjectivesManagementPage';
import { PaymentPage } from './pages/PaymentPage';
import { PaymentSuccessPage } from './pages/PaymentSuccessPage';
import { ObjectiveDetailPage } from './pages/ObjectiveDetailPage';
import { AdminRoute } from './components/admin/AdminRoute';
import { FinancialReportsPage } from './pages/admin/FinancialReportsPage';
import { PrayerRequestsPage } from './pages/PrayerRequestsPage';
import { PrayerRequestsManagementPage } from './pages/admin/PrayerRequestsManagementPage';
import { TestimonialsPage } from './pages/TestimonialsPage';
import { ForumPage } from './pages/ForumPage';
import { ForumNewTopicPage } from './pages/ForumNewTopicPage';
import { ReferralProgramPage } from './pages/ReferralProgramPage';
import { ResourceLibraryPage } from './pages/ResourceLibraryPage';
import { BlogPage } from './pages/BlogPage';
import { ForumTopicPage } from './pages/ForumTopicPage';
import { BlogPostPage } from './pages/BlogPostPage';
import { MessagesPage } from './pages/dashboard/MessagesPage';
import { QuizPage } from './pages/dashboard/QuizPage';
import { QuizTakePage } from './pages/dashboard/QuizTakePage';
import { QuizResultsPage } from './pages/dashboard/QuizResultsPage';
import { VolunteerPage } from './pages/dashboard/VolunteerPage';
import { AttendancePage } from './pages/dashboard/AttendancePage';
import { QuizManagementPage } from './pages/admin/QuizManagementPage';
import { QuizQuestionsPage } from './pages/admin/QuizQuestionsPage';
import { VolunteerManagementPage } from './pages/admin/VolunteerManagementPage';
import { GroupsPage } from './pages/GroupsPage';
import { GroupDetailPage } from './pages/GroupDetailPage';
import { BlogManagementPage } from './pages/admin/BlogManagementPage';
import { MentorshipPage } from './pages/MentorshipPage';
import { MentorshipManagementPage } from './pages/admin/MentorshipManagementPage';
import { LiveStreamManagementPage } from './pages/admin/LiveStreamManagementPage';
import { ForumManagementPage } from './pages/admin/ForumManagementPage';
import { GroupsManagementPage } from './pages/admin/GroupsManagementPage';
import { ResourcesManagementPage } from './pages/admin/ResourcesManagementPage';
import { LiveStreamPage } from './pages/LiveStreamPage';
import { AdvancedAnalyticsPage } from './pages/admin/AdvancedAnalyticsPage';
import { CustomReportsPage } from './pages/admin/CustomReportsPage';
import { EmailTemplatesPage } from './pages/admin/EmailTemplatesPage';
import { AuditLogsPage } from './pages/admin/AuditLogsPage';
import { SecuritySettingsPage } from './pages/dashboard/SecuritySettingsPage';
import { SMSNotificationsPage } from './pages/admin/SMSNotificationsPage';
import { PushNotificationsPage } from './pages/admin/PushNotificationsPage';
import { AnnualGivingStatementsPage } from './pages/admin/AnnualGivingStatementsPage';
import { CourseCataloguePage } from './pages/CourseCataloguePage';
import { CourseDetailPage } from './pages/CourseDetailPage';
import { ProgramsPage } from './pages/ProgramsPage';
import { EventsPage } from './pages/EventsPage';
import { BibleSchoolProgramPage } from './pages/BibleSchoolProgramPage';
import { MembershipProgramPage } from './pages/MembershipProgramPage';
import { PartnersPage } from './pages/PartnersPage';

export function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <InsforgeProvider
          baseUrl={getInsForgeBaseUrl()}
          anonKey={getInsForgeAnonKey()}
        >
          <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/apply" element={<ApplyPage />} />
          <Route path="/apply/membership" element={<ApplyMembershipPage />} />
          <Route path="/apply/bible-school" element={<ApplyBibleSchoolPage />} />
          <Route path="/donations" element={<DonationsPage />} />
          <Route path="/payment" element={<PaymentPage />} />
          <Route path="/payment/success" element={<PaymentSuccessPage />} />
          <Route path="/objectives/:slug" element={<ObjectiveDetailPage />} />
          <Route path="/courses" element={<CourseCataloguePage />} />
          <Route path="/courses/:id" element={<CourseDetailPage />} />
          <Route path="/programs" element={<ProgramsPage />} />
          <Route path="/programs/bible-school" element={<BibleSchoolProgramPage />} />
          <Route path="/programs/membership" element={<MembershipProgramPage />} />
          <Route path="/events" element={<EventsPage />} />
          <Route path="/partners" element={<PartnersPage />} />
          <Route path="/prayer-requests" element={<PrayerRequestsPage />} />
          <Route path="/testimonials" element={<TestimonialsPage />} />
          <Route path="/forum" element={<ForumPage />} />
          <Route path="/forum/new-topic" element={<ForumNewTopicPage />} />
          <Route path="/forum/topic/:id" element={<ForumTopicPage />} />
          <Route path="/referrals" element={<ReferralProgramPage />} />
          <Route path="/resources" element={<ResourceLibraryPage />} />
          <Route path="/blog" element={<BlogPage />} />
          <Route path="/blog/:slug" element={<BlogPostPage />} />
          <Route path="/groups" element={<GroupsPage />} />
          <Route path="/groups/:id" element={<GroupDetailPage />} />
          <Route path="/mentorship" element={<MentorshipPage />} />
          <Route path="/stream/:id" element={<LiveStreamPage />} />
        <Route path="/dashboard" element={<DashboardLayout />}>
          <Route index element={<DashboardHome />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="applications" element={<ApplicationsPage />} />
            <Route path="notifications" element={<NotificationsPage />} />
            <Route path="events" element={<DashboardEventsPage />} />
            <Route path="courses" element={<CoursesPage />} />
            <Route path="courses/:courseId/lessons/:lessonId" element={<CourseLessonPage />} />
            <Route path="courses/:courseId/quizzes" element={<QuizPage />} />
            <Route path="courses/:courseId/quizzes/:quizId/take" element={<QuizTakePage />} />
            <Route path="courses/:courseId/quizzes/:quizId/results" element={<QuizResultsPage />} />
            <Route path="certificates" element={<CertificatesPage />} />
            <Route path="messages" element={<MessagesPage />} />
            <Route path="volunteer" element={<VolunteerPage />} />
            <Route path="attendance" element={<AttendancePage />} />
          <Route path="security" element={<SecuritySettingsPage />} />
        </Route>
          <Route path="/admin" element={
            <AdminRoute>
              <AdminDashboardLayout />
            </AdminRoute>
          }>
          <Route index element={<AdminDashboardHome />} />
          <Route path="profile" element={<AdminProfilePage />} />
          <Route path="users" element={<UserManagementPage />} />
          <Route path="applications" element={<ApplicationManagementPage />} />
          <Route path="courses" element={<CourseManagementPage />} />
          <Route path="events" element={<EventManagementPage />} />
          <Route path="certificates" element={<CertificateManagementPage />} />
          <Route path="analytics" element={<AnalyticsPage />} />
          <Route path="communication" element={<CommunicationPage />} />
          <Route path="settings" element={<AdminSettingsPage />} />
            <Route path="content" element={<ContentManagementPage />} />
            <Route path="fees" element={<FeeManagementPage />} />
            <Route path="objectives" element={<ObjectivesManagementPage />} />
            <Route path="financial-reports" element={<FinancialReportsPage />} />
            <Route path="prayer-requests" element={<PrayerRequestsManagementPage />} />
            <Route path="quizzes" element={<QuizManagementPage />} />
            <Route path="quizzes/:quizId/questions" element={<QuizQuestionsPage />} />
            <Route path="volunteers" element={<VolunteerManagementPage />} />
            <Route path="blog" element={<BlogManagementPage />} />
            <Route path="mentorship" element={<MentorshipManagementPage />} />
            <Route path="streams" element={<LiveStreamManagementPage />} />
            <Route path="forum" element={<ForumManagementPage />} />
            <Route path="groups" element={<GroupsManagementPage />} />
            <Route path="resources" element={<ResourcesManagementPage />} />
            <Route path="advanced-analytics" element={<AdvancedAnalyticsPage />} />
            <Route path="reports" element={<CustomReportsPage />} />
            <Route path="email-templates" element={<EmailTemplatesPage />} />
            <Route path="audit-logs" element={<AuditLogsPage />} />
            <Route path="sms" element={<SMSNotificationsPage />} />
            <Route path="push" element={<PushNotificationsPage />} />
            <Route path="giving-statements" element={<AnnualGivingStatementsPage />} />
        </Route>
      </Routes>
      </Router>
    </InsforgeProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}