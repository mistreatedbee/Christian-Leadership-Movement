import React, { useState, useEffect } from 'react';
import { Search, Filter, Plus, Edit, Trash2, Mail, Shield, Save, X, Eye, Download, FileText, X as CloseIcon } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { insforge } from '../../lib/insforge';
import { useUser } from '@insforge/react';
import { getStorageUrl } from '../../lib/connection';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { auditActions } from '../../lib/auditLogger';

interface User {
  id: string;
  user_id: string;
  nickname: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  province: string | null;
  postal_code: string | null;
  address: string | null;
  date_of_birth: string | null;
  role: string;
  created_at: string;
  updated_at: string;
  avatar_url?: string | null;
  bio?: string | null;
  // Additional registration fields
  first_name?: string | null;
  last_name?: string | null;
  gender?: string | null;
  nationality?: string | null;
  country?: string | null;
  home_language?: string | null;
  population_group?: string | null;
  residential_status?: string | null;
}

interface UserApplication {
  id: string;
  program_type: string;
  status: string;
  payment_status: string;
  created_at: string;
  programs?: { title: string };
}

export function UserManagementPage() {
  const { user: currentUser } = useUser();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<User>>({});
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userApplications, setUserApplications] = useState<UserApplication[]>([]);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [loadingApplications, setLoadingApplications] = useState(false);
  const [enrichedUserData, setEnrichedUserData] = useState<any>(null);
  const [syncingEmails, setSyncingEmails] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, [filterRole]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      // SIMPLIFIED LOGIC: Same as Application Management - fetch all columns including email
      // Use select('*') to get all columns - RLS policies should allow admins to see email
      const { data: allUsers, error: usersError } = await insforge.database
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (usersError) {
        console.error('Error fetching users:', usersError);
        throw usersError;
      }

      // Fetch all user profiles (includes email if saved during registration)
      const { data: profiles, error: profilesError } = await insforge.database
        .from('user_profiles')
        .select('*');

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
        throw profilesError;
      }

      // Combine users with their profiles
      // Get email from BOTH sources - users table (primary) and user_profiles (backup)
      const usersData = (allUsers || []).map((user: any) => {
        const profile = profiles?.find((p: any) => p.user_id === user.id);
        
        // EMAIL: Get from users table first, then fallback to user_profiles.email
        // Both should have email, but users.email is the primary source
        const userEmail = user.email || profile?.email || null;
        
        return {
          id: profile?.id || user.id,
          user_id: user.id,
          nickname: user.nickname || user.name || null,
          email: userEmail, // Email from users table (primary) or user_profiles (backup)
          phone: profile?.phone || null,
          city: profile?.city || null,
          province: profile?.province || null,
          postal_code: profile?.postal_code || null,
          address: profile?.address || null,
          date_of_birth: profile?.date_of_birth || null,
          role: profile?.role || 'user',
          created_at: user.created_at,
          updated_at: profile?.updated_at || user.updated_at,
          avatar_url: user.avatar_url || null,
          bio: user.bio || null,
          // Include ALL profile fields for complete information
          first_name: profile?.first_name || null,
          last_name: profile?.last_name || null,
          gender: profile?.gender || null,
          nationality: profile?.nationality || null,
          country: profile?.country || null,
          home_language: profile?.home_language || null,
          population_group: profile?.population_group || null,
          residential_status: profile?.residential_status || null
        };
      });

      setUsers(usersData);
    } catch (err: any) {
      console.error('Error fetching users:', err);
      setMessage({ type: 'error', text: err.message || 'Failed to fetch users' });
    } finally {
      setLoading(false);
    }
  };

  const handleSyncEmails = async () => {
    setSyncingEmails(true);
    setMessage(null);
    try {
      // First, get all users to check current state
      const { data: allUsers } = await insforge.database
        .from('users')
        .select('id, email')
        .order('created_at', { ascending: false });
      
      // Email column doesn't exist in applications - always use form_data JSONB
      // Don't try to select email column as it causes 400 errors
      console.log('Fetching emails from applications.form_data...');
      let applications: any[] = [];
      
      const { data: appsWithFormData, error: formDataError } = await insforge.database
        .from('applications')
        .select('user_id, form_data')
        .not('user_id', 'is', null)
        .not('form_data', 'is', null);
      
      if (formDataError) {
        setMessage({ 
          type: 'error', 
          text: 'Cannot sync emails: Failed to fetch applications form_data. Please ensure applications have form_data with email fields.' 
        });
        setSyncingEmails(false);
        return;
      }
      
      // Extract email from form_data JSONB
      applications = (appsWithFormData || []).map((app: any) => ({
        user_id: app.user_id,
        email: app.form_data?.email || app.form_data?.Email || app.form_data?.EMAIL || null
      })).filter((app: any) => app.email);
      
      // If no applications with emails, check if emails are already in public.users table
      // Emails should be saved there during registration
      if (!applications || applications.length === 0) {
        console.log('No emails found in applications, checking public.users table...');
        
        // Check if users already have emails in public.users table
        const { data: usersWithEmails, error: usersError } = await insforge.database
          .from('users')
          .select('id, email')
          .not('email', 'is', null)
          .neq('email', '');
        
        if (usersError) {
          console.error('Error checking users table:', usersError);
          setMessage({ 
            type: 'error', 
            text: `Error checking users table: ${usersError.message}` 
          });
          setSyncingEmails(false);
          return;
        }
        
        const usersWithEmailCount = usersWithEmails?.length || 0;
        const totalUsers = allUsers?.length || 0;
        
        if (usersWithEmailCount === totalUsers && totalUsers > 0) {
          setMessage({ 
            type: 'success', 
            text: `All ${totalUsers} users already have emails in the users table. No sync needed.` 
          });
        } else if (usersWithEmailCount > 0) {
          setMessage({ 
            type: 'info', 
            text: `Found ${usersWithEmailCount} users with emails in users table. ${totalUsers - usersWithEmailCount} users are missing emails. Emails are stored in InsForge's managed auth table and should be synced during login.` 
          });
        } else {
          setMessage({ 
            type: 'warning', 
            text: `No emails found in public.users table. Emails are stored in InsForge's managed auth table (visible in dashboard). They will be synced to public.users when users log in. For existing users, you may need to manually sync or wait for them to log in.` 
          });
        }
        
        setSyncingEmails(false);
        return;
      }
      
      // Create a map of user_id to email (most recent email per user)
      const emailMap = new Map<string, string>();
      applications.forEach((app: any) => {
        if (app.user_id && app.email && !emailMap.has(app.user_id)) {
          emailMap.set(app.user_id, app.email);
        }
      });
      
      // Update users table with emails
      let updatedCount = 0;
      let errorCount = 0;
      
      for (const [userId, email] of emailMap.entries()) {
        try {
          // Check if user already has email
          const { data: existingUser } = await insforge.database
            .from('users')
            .select('email')
            .eq('id', userId)
            .maybeSingle();
          
          // Only update if email is missing
          if (!existingUser?.email) {
            const { error: updateError } = await insforge.database
              .from('users')
              .update({ email })
              .eq('id', userId);
            
            if (updateError) {
              console.error(`Failed to update email for user ${userId}:`, updateError);
              errorCount++;
            } else {
              updatedCount++;
            }
          }
        } catch (userErr: any) {
          console.error(`Error updating user ${userId}:`, userErr);
          errorCount++;
        }
      }
      
      if (updatedCount > 0) {
        setMessage({ 
          type: 'success', 
          text: `Successfully synced ${updatedCount} email${updatedCount > 1 ? 's' : ''}! ${errorCount > 0 ? `${errorCount} errors occurred.` : ''}` 
        });
        // Refresh the user list
        await fetchUsers();
      } else if (errorCount > 0) {
        setMessage({ 
          type: 'error', 
          text: `Failed to sync emails. ${errorCount} error${errorCount > 1 ? 's' : ''} occurred.` 
        });
      } else {
        setMessage({ 
          type: 'info', 
          text: 'All users already have emails or no emails found in applications.' 
        });
      }
    } catch (err: any) {
      console.error('Error syncing emails:', err);
      setMessage({ 
        type: 'error', 
        text: err.message || 'Failed to sync emails. Please check the console for details.' 
      });
    } finally {
      setSyncingEmails(false);
    }
  };

  const handleViewDetails = async (user: User) => {
    setSelectedUser(user);
    setShowDetailsModal(true);
    setLoadingApplications(true);
    setEnrichedUserData(null);
    setUserApplications([]);
    setMessage(null);

    try {
      // CRITICAL: Email is stored in users table
      // First, use email from the user object (from the list) - this was fetched by fetchUsers from users table
      // This is the most reliable source since fetchUsers already got it with select('*')
      let userEmail = user.email || null;
      
      // Also fetch from users table directly to ensure we have the latest
      const { data: userData, error: userDataError } = await insforge.database
        .from('users')
        .select('*')
        .eq('id', user.user_id)
        .maybeSingle();

      // Debug: Log what we got
      console.log('🔍 User Details Debug:', {
        'user.email (from list)': user.email,
        'userData?.email (from query)': userData?.email,
        'userData object keys': userData ? Object.keys(userData) : null,
        'userDataError': userDataError
      });

      // Use email from direct query if available, otherwise use email from list
      if (userData?.email) {
        userEmail = userData.email;
      } else if (user.email) {
        userEmail = user.email; // Use email from list if direct query didn't return it
      }

      // Fetch from user_profiles table (registration data)
      const { data: profileData } = await insforge.database
        .from('user_profiles')
        .select('*')
        .eq('user_id', user.user_id)
        .maybeSingle();

      // Fetch user's applications (may contain email in form_data)
      const { data: applications } = await insforge.database
        .from('applications')
        .select('*, form_data')
        .eq('user_id', user.user_id)
        .order('created_at', { ascending: false });

      setUserApplications(applications || []);

      // Try to get email from applications form_data as fallback
      if (!userEmail && applications && applications.length > 0) {
        const mostRecentApp = applications[0];
        if (mostRecentApp.form_data) {
          const formEmail = mostRecentApp.form_data.email || 
                           mostRecentApp.form_data.Email || 
                           mostRecentApp.form_data.EMAIL;
          if (formEmail) {
            userEmail = formEmail;
            console.log('📧 Found email in application form_data:', formEmail);
          }
        }
      }

      // Combine data from ALL sources: users table, user_profiles, and applications
      // This ensures we get ALL registration information
      const enriched: any = {
        ...(profileData || {}),
        // EMAIL: Priority: userData.email (from direct query) > user.email (from list) > profileData.email > application form_data > null
        email: userEmail || profileData?.email || null,
        nickname: userData?.nickname || userData?.name || profileData?.nickname || user.nickname || null,
        avatar_url: userData?.avatar_url || profileData?.avatar_url || user.avatar_url || null,
        bio: userData?.bio || profileData?.bio || user.bio || null,
        user_id: user.user_id,
        id: user.id,
        role: profileData?.role || user.role || 'user',
        created_at: user.created_at,
        updated_at: profileData?.updated_at || user.updated_at,
        // Get ALL profile fields
        phone: profileData?.phone || user.phone || null,
        address: profileData?.address || user.address || null,
        city: profileData?.city || user.city || null,
        province: profileData?.province || user.province || null,
        postal_code: profileData?.postal_code || user.postal_code || null,
        date_of_birth: profileData?.date_of_birth || user.date_of_birth || null,
        first_name: profileData?.first_name || user.first_name || null,
        last_name: profileData?.last_name || user.last_name || null,
        gender: profileData?.gender || user.gender || null,
        nationality: profileData?.nationality || user.nationality || null,
        country: profileData?.country || user.country || null,
        home_language: profileData?.home_language || user.home_language || null,
        population_group: profileData?.population_group || user.population_group || null,
        residential_status: profileData?.residential_status || user.residential_status || null,
      };

      // If applications exist, extract ALL data from form_data (for existing users)
      // This ensures admins can see ALL registration information even if not in user_profiles
      if (applications && applications.length > 0) {
        const mostRecentApp = applications[0];
        const formData = mostRecentApp.form_data || {};
        
        // Extract ALL fields from form_data with fallback to application columns
        // Priority: enriched (from profile) > form_data > application columns
        
        // Personal Information
        enriched.id_number = enriched.id_number || formData.idNumber || formData.id_number || mostRecentApp.id_number || null;
        enriched.nationality = enriched.nationality || formData.nationality || mostRecentApp.nationality || null;
        enriched.gender = enriched.gender || formData.gender || mostRecentApp.gender || null;
        enriched.marital_status = enriched.marital_status || formData.maritalStatus || formData.marital_status || mostRecentApp.marital_status || null;
        enriched.country = enriched.country || formData.country || mostRecentApp.country || null;
        
        // Names - extract from form_data
        enriched.first_name = enriched.first_name || formData.firstName || formData.first_name || mostRecentApp.first_name || null;
        enriched.middle_name = enriched.middle_name || formData.middleName || formData.middle_name || mostRecentApp.middle_name || null;
        enriched.last_name = enriched.last_name || formData.lastName || formData.last_name || mostRecentApp.last_name || null;
        enriched.full_name = enriched.full_name || formData.fullName || formData.full_name || mostRecentApp.full_name || 
          (enriched.first_name && enriched.last_name ? `${enriched.first_name} ${enriched.last_name}` : null) ||
          enriched.nickname || null;
        enriched.preferred_name = enriched.preferred_name || formData.preferredName || formData.preferred_name || null;
        enriched.initials = enriched.initials || formData.initials || null;
        enriched.title = enriched.title || formData.title || null;
        
        // Contact Information
        enriched.phone = enriched.phone || formData.phone || formData.contactNumber || mostRecentApp.phone || null;
        enriched.email = enriched.email || formData.email || formData.Email || formData.EMAIL || mostRecentApp.email || userEmail || null;
        
        // Address Information
        enriched.address = enriched.address || formData.address || formData.physicalAddress || mostRecentApp.address || null;
        enriched.city = enriched.city || formData.city || mostRecentApp.city || null;
        enriched.province = enriched.province || formData.province || mostRecentApp.province || null;
        enriched.postal_code = enriched.postal_code || formData.postalCode || formData.postal_code || mostRecentApp.postal_code || null;
        
        // Date of Birth
        enriched.date_of_birth = enriched.date_of_birth || formData.dateOfBirth || formData.date_of_birth || mostRecentApp.date_of_birth || null;
        
        // Additional fields from applications
        enriched.home_language = enriched.home_language || formData.homeLanguage || formData.home_language || null;
        enriched.population_group = enriched.population_group || formData.populationGroup || formData.population_group || null;
        enriched.residential_status = enriched.residential_status || formData.residentialStatus || formData.residential_status || null;
        
        // Ministry Information (if available in applications)
        enriched.current_ministry_name = enriched.current_ministry_name || formData.currentMinistryName || formData.current_ministry_name || null;
        enriched.denomination = enriched.denomination || formData.denomination || null;
        enriched.ministry_position = enriched.ministry_position || formData.ministryPosition || formData.ministry_position || null;
        
        // Store the complete form_data for reference
        enriched.form_data = formData;
      }

      setEnrichedUserData(enriched);
      setMessage(null);
    } catch (err: any) {
      console.error('Error fetching user details:', err);
      setMessage({ type: 'error', text: `Failed to fetch user details: ${err.message || 'Unknown error'}` });
      setUserApplications([]);
      // Fallback: use data from user object
      setEnrichedUserData({
        ...user,
        email: user.email || null,
        phone: user.phone || null,
        address: user.address || null,
        city: user.city || null,
        province: user.province || null
      });
    } finally {
      setLoadingApplications(false);
    }
  };

  const handleExportPDF = async (user: User) => {
    try {
      // Fetch full user data and applications - handle potential join errors
      let applications: any[] = [];
      const result = await insforge.database
        .from('applications')
        .select('*, programs(title)')
        .eq('user_id', user.user_id)
        .order('created_at', { ascending: false });

      if (result.error) {
        // Fallback to fetching without programs join
        const fallbackResult = await insforge.database
          .from('applications')
          .select('*')
          .eq('user_id', user.user_id)
          .order('created_at', { ascending: false });
        
        applications = fallbackResult.data || [];
      } else {
        applications = result.data || [];
      }

      const doc = new jsPDF();
      
      // Title
      doc.setFontSize(18);
      doc.text('User Information Report', 14, 20);
      
      // User Information
      doc.setFontSize(12);
      let yPos = 35;
      
      doc.setFontSize(10);
      doc.setFont(undefined, 'bold');
      doc.text('Personal Information', 14, yPos);
      yPos += 8;
      doc.setFont(undefined, 'normal');
      
      // Fetch enriched data for PDF export to get ALL information
      let enrichedDataForPDF = user;
      try {
        const { data: profileData } = await insforge.database
          .from('user_profiles')
          .select('*')
          .eq('user_id', user.user_id)
          .maybeSingle();
        
        const { data: applications } = await insforge.database
          .from('applications')
          .select('*, form_data')
          .eq('user_id', user.user_id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        
        if (applications?.form_data) {
          const formData = applications.form_data;
          enrichedDataForPDF = {
            ...user,
            ...profileData,
            first_name: user.first_name || profileData?.first_name || formData.firstName || formData.first_name || null,
            last_name: user.last_name || profileData?.last_name || formData.lastName || formData.last_name || null,
            email: user.email || profileData?.email || formData.email || null,
            phone: user.phone || profileData?.phone || formData.phone || formData.contactNumber || null,
            address: user.address || profileData?.address || formData.address || formData.physicalAddress || null,
            city: user.city || profileData?.city || formData.city || null,
            province: user.province || profileData?.province || formData.province || null,
            postal_code: user.postal_code || profileData?.postal_code || formData.postalCode || formData.postal_code || null,
            date_of_birth: user.date_of_birth || profileData?.date_of_birth || formData.dateOfBirth || formData.date_of_birth || null,
            gender: user.gender || profileData?.gender || formData.gender || null,
            nationality: user.nationality || profileData?.nationality || formData.nationality || null,
            country: user.country || profileData?.country || formData.country || null,
            home_language: user.home_language || profileData?.home_language || formData.homeLanguage || formData.home_language || null,
            population_group: user.population_group || profileData?.population_group || formData.populationGroup || formData.population_group || null,
            residential_status: user.residential_status || profileData?.residential_status || formData.residentialStatus || formData.residential_status || null,
            id_number: formData.idNumber || formData.id_number || null
          };
        } else {
          enrichedDataForPDF = { ...user, ...profileData };
        }
      } catch (err) {
        console.log('Could not fetch enriched data for PDF, using basic user data');
      }
      
      // Full name from first_name + last_name or nickname
      const fullName = (enrichedDataForPDF.first_name && enrichedDataForPDF.last_name) 
        ? `${enrichedDataForPDF.first_name} ${enrichedDataForPDF.last_name}` 
        : enrichedDataForPDF.nickname || 'N/A';
      doc.text(`Full Name: ${fullName}`, 14, yPos);
      yPos += 7;
      if (enrichedDataForPDF.first_name) {
        doc.text(`First Name: ${enrichedDataForPDF.first_name}`, 14, yPos);
        yPos += 7;
      }
      if (enrichedDataForPDF.last_name) {
        doc.text(`Last Name: ${enrichedDataForPDF.last_name}`, 14, yPos);
        yPos += 7;
      }
      if (enrichedDataForPDF.id_number) {
        doc.text(`ID Number: ${enrichedDataForPDF.id_number}`, 14, yPos);
        yPos += 7;
      }
      doc.text(`Email Address: ${enrichedDataForPDF.email || user.email || 'N/A'}`, 14, yPos);
      yPos += 7;
      doc.text(`Phone Number: ${enrichedDataForPDF.phone || user.phone || 'N/A'}`, 14, yPos);
      yPos += 7;
      if (enrichedDataForPDF.gender || user.gender) {
        doc.text(`Gender: ${enrichedDataForPDF.gender || user.gender}`, 14, yPos);
        yPos += 7;
      }
      if (enrichedDataForPDF.nationality || user.nationality) {
        doc.text(`Nationality: ${enrichedDataForPDF.nationality || user.nationality}`, 14, yPos);
        yPos += 7;
      }
      doc.text(`Date of Birth: ${(enrichedDataForPDF.date_of_birth || user.date_of_birth) ? new Date(enrichedDataForPDF.date_of_birth || user.date_of_birth).toLocaleDateString() : 'N/A'}`, 14, yPos);
      yPos += 7;
      doc.text(`Physical Address: ${enrichedDataForPDF.address || user.address || 'N/A'}`, 14, yPos);
      yPos += 7;
      doc.text(`City: ${enrichedDataForPDF.city || user.city || 'N/A'}`, 14, yPos);
      yPos += 7;
      doc.text(`Province: ${enrichedDataForPDF.province || user.province || 'N/A'}`, 14, yPos);
      yPos += 7;
      if (enrichedDataForPDF.country || user.country) {
        doc.text(`Country: ${enrichedDataForPDF.country || user.country}`, 14, yPos);
        yPos += 7;
      }
      doc.text(`Postal Code: ${enrichedDataForPDF.postal_code || user.postal_code || 'N/A'}`, 14, yPos);
      yPos += 7;
      if (enrichedDataForPDF.home_language || user.home_language) {
        doc.text(`Home Language: ${enrichedDataForPDF.home_language || user.home_language}`, 14, yPos);
        yPos += 7;
      }
      if (enrichedDataForPDF.population_group || user.population_group) {
        doc.text(`Population Group: ${enrichedDataForPDF.population_group || user.population_group}`, 14, yPos);
        yPos += 7;
      }
      if (enrichedDataForPDF.residential_status || user.residential_status) {
        doc.text(`Residential Status: ${enrichedDataForPDF.residential_status || user.residential_status}`, 14, yPos);
        yPos += 7;
      }
      yPos += 7;
      doc.text(`User Role: ${user.role.charAt(0).toUpperCase() + user.role.slice(1)}`, 14, yPos);
      yPos += 7;
      doc.text(`Account Created: ${new Date(user.created_at).toLocaleString()}`, 14, yPos);
      yPos += 7;
      if (user.updated_at) {
        doc.text(`Last Updated: ${new Date(user.updated_at).toLocaleString()}`, 14, yPos);
        yPos += 7;
      }
      if (user.bio) {
        yPos += 3;
        doc.setFont(undefined, 'bold');
        doc.text('Bio:', 14, yPos);
        yPos += 7;
        doc.setFont(undefined, 'normal');
        const bioLines = doc.splitTextToSize(user.bio, 180);
        bioLines.forEach((line: string) => {
          doc.text(line, 14, yPos);
          yPos += 7;
        });
      }
      yPos += 5;

      // Applications Section
      if (applications && applications.length > 0) {
        doc.setFontSize(14);
        doc.text('Applications', 14, yPos);
        yPos += 10;

        applications.forEach((app: any, index: number) => {
          if (yPos > 270) {
            doc.addPage();
            yPos = 20;
          }

          doc.setFontSize(10);
          doc.text(`Application ${index + 1}:`, 14, yPos);
          yPos += 6;
          doc.text(`  Program: ${app.programs?.title || app.program_type}`, 20, yPos);
          yPos += 6;
          doc.text(`  Status: ${app.status}`, 20, yPos);
          yPos += 6;
          doc.text(`  Payment Status: ${app.payment_status || 'N/A'}`, 20, yPos);
          yPos += 6;
          doc.text(`  Date: ${new Date(app.created_at).toLocaleDateString()}`, 20, yPos);
          yPos += 8;
        });
      } else {
        doc.setFontSize(10);
        doc.text('No applications found', 14, yPos);
      }

      doc.save(`user-${user.user_id.substring(0, 8)}-${Date.now()}.pdf`);
      setMessage({ type: 'success', text: 'PDF exported successfully!' });
    } catch (err: any) {
      console.error('Error exporting PDF:', err);
      setMessage({ type: 'error', text: 'Failed to export PDF' });
    }
  };

  const handleEdit = (user: User) => {
    setEditingUser(user.user_id);
    setEditForm({
      role: user.role,
      phone: user.phone || '',
      city: user.city || '',
      province: user.province || '',
      postal_code: user.postal_code || '',
      address: user.address || '',
      date_of_birth: user.date_of_birth || ''
    });
  };

  const handleSave = async (userId: string) => {
    try {
      // Check if profile exists
      const { data: existingProfile } = await insforge.database
        .from('user_profiles')
        .select('id')
        .eq('user_id', userId)
        .single();

      if (existingProfile) {
        // Update existing profile
        const { error } = await insforge.database
          .from('user_profiles')
          .update({
            role: editForm.role,
            phone: editForm.phone || null,
            city: editForm.city || null,
            province: editForm.province || null,
            postal_code: editForm.postal_code || null,
            address: editForm.address || null,
            date_of_birth: editForm.date_of_birth || null,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', userId);

        if (error) throw error;
      } else {
        // Create new profile
        const { error } = await insforge.database
          .from('user_profiles')
          .insert({
            user_id: userId,
            role: editForm.role || 'user',
            phone: editForm.phone || null,
            city: editForm.city || null,
            province: editForm.province || null,
            postal_code: editForm.postal_code || null,
            address: editForm.address || null,
            date_of_birth: editForm.date_of_birth || null
          });

        if (error) throw error;
      }

      // Update users table if nickname changed
      if (editForm.nickname) {
        await insforge.database
          .from('users')
          .update({ nickname: editForm.nickname })
          .eq('id', userId);
      }

      // Log audit event
      if (currentUser) {
        auditActions.userUpdated(userId, {
          updated_by: currentUser.id,
          changes: editForm,
        });
      }

      setMessage({ type: 'success', text: 'User updated successfully!' });
      setEditingUser(null);
      setEditForm({});
      fetchUsers();
    } catch (err: any) {
      console.error('Error updating user:', err);
      setMessage({ type: 'error', text: err.message || 'Failed to update user' });
    }
  };

  const handleCancel = () => {
    setEditingUser(null);
    setEditForm({});
  };

  const handleDelete = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return;
    }

    try {
      // Get user details before deleting for audit log
      const user = users.find(u => u.user_id === userId);
      
      // Delete user profile first
      await insforge.database
        .from('user_profiles')
        .delete()
        .eq('user_id', userId);

      // Log audit event
      if (currentUser) {
        auditActions.userDeleted(userId, {
          deleted_user_email: user?.email || 'Unknown',
          deleted_user_nickname: user?.nickname || 'Unknown',
          deleted_by: currentUser.id,
        });
      }

      // User record will be cascade deleted from auth.users
      setMessage({ type: 'success', text: 'User deleted successfully!' });
      fetchUsers();
    } catch (err: any) {
      console.error('Error deleting user:', err);
      setMessage({ type: 'error', text: err.message || 'Failed to delete user' });
    }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      const { data: existingProfile } = await insforge.database
        .from('user_profiles')
        .select('id')
        .eq('user_id', userId)
        .single();

      if (existingProfile) {
        await insforge.database
          .from('user_profiles')
          .update({ role: newRole, updated_at: new Date().toISOString() })
          .eq('user_id', userId);
      } else {
        await insforge.database
          .from('user_profiles')
          .insert({ user_id: userId, role: newRole });
      }

      setMessage({ type: 'success', text: 'User role updated successfully!' });
      fetchUsers();
    } catch (err: any) {
      console.error('Error updating role:', err);
      setMessage({ type: 'error', text: err.message || 'Failed to update role' });
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = !searchTerm || 
      user.nickname?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.phone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.province?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = filterRole === 'all' || user.role === filterRole;
    
    return matchesSearch && matchesRole;
  });

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin':
      case 'super_admin':
        return 'bg-purple-100 text-purple-800';
      case 'user':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-navy-ink mb-2">
            User Management
          </h1>
          <p className="text-gray-600">Manage all registered users and their applications</p>
        </div>
        <Button
          variant="outline"
          onClick={handleSyncEmails}
          disabled={syncingEmails}
          className="flex items-center gap-2"
        >
          <Mail size={16} />
          {syncingEmails ? 'Syncing...' : 'Sync Emails from Auth'}
        </Button>
      </div>

      {message && (
        <div className={`p-4 rounded-card ${
          message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
        }`}>
          {message.text}
        </div>
      )}

      {/* Filters */}
      <div className="bg-white p-6 rounded-card shadow-soft">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search users..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold"
            />
          </div>
          <select
            value={filterRole}
            onChange={e => setFilterRole(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-gold"
          >
            <option value="all">All Roles</option>
            <option value="user">User</option>
            <option value="admin">Admin</option>
            <option value="super_admin">Super Admin</option>
          </select>
          <Button variant="outline" onClick={fetchUsers}>
            <Filter size={20} className="mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-card shadow-soft overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted-gray">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-medium text-navy-ink">User</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-navy-ink">Contact</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-navy-ink">Location</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-navy-ink">Role</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-navy-ink">Join Date</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-navy-ink">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-600">
                    Loading users...
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-600">
                    No users found
                  </td>
                </tr>
              ) : (
                filteredUsers.map(user => (
                  <tr key={user.user_id} className="hover:bg-muted-gray/50">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="w-10 h-10 rounded-full bg-gold flex items-center justify-center text-white font-bold mr-3 flex-shrink-0 overflow-hidden">
                          {user.avatar_url ? (
                            <img 
                              src={user.avatar_url.startsWith('http') ? user.avatar_url : getStorageUrl('avatars', user.avatar_url)} 
                              alt={user.nickname || user.first_name || 'User'} 
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                                const displayName = user.nickname || user.first_name || user.email || 'U';
                                target.parentElement!.textContent = displayName.charAt(0).toUpperCase();
                              }}
                            />
                          ) : (
                            (user.nickname || user.first_name || user.email || 'U').charAt(0).toUpperCase()
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-navy-ink">
                            {user.first_name && user.last_name 
                              ? `${user.first_name} ${user.last_name}` 
                              : user.nickname || user.first_name || user.last_name || 'No name'}
                          </p>
                          <p className="text-sm text-gray-600 break-all">{user.email || 'No email'}</p>
                          {user.phone && (
                            <p className="text-xs text-gray-500">{user.phone}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm">
                        <p className="text-gray-600">{user.phone || 'No phone'}</p>
                        {user.date_of_birth && (
                          <p className="text-gray-500 text-xs">
                            DOB: {new Date(user.date_of_birth).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm">
                        {user.address && (
                          <p className="text-gray-600 text-xs mb-1 truncate max-w-xs" title={user.address}>
                            {user.address}
                          </p>
                        )}
                        <p className="text-gray-600">
                          {user.city || 'N/A'}{user.province ? `, ${user.province}` : ''}
                          {user.country && !user.province && `, ${user.country}`}
                        </p>
                        {user.postal_code && (
                          <p className="text-gray-500 text-xs">{user.postal_code}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {editingUser === user.user_id ? (
                        <select
                          value={editForm.role || 'user'}
                          onChange={e => setEditForm({ ...editForm, role: e.target.value })}
                          className="px-2 py-1 border border-gray-300 rounded text-sm"
                        >
                          <option value="user">User</option>
                          <option value="admin">Admin</option>
                          <option value="super_admin">Super Admin</option>
                        </select>
                      ) : (
                        <span className={`inline-flex items-center px-2 py-1 ${getRoleBadgeColor(user.role)} text-sm rounded-full`}>
                          <Shield size={14} className="mr-1" />
                          {user.role}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-gray-600 text-sm">
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      {editingUser === user.user_id ? (
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleSave(user.user_id)}
                            className="p-2 text-green-600 hover:bg-green-50 rounded-card"
                            title="Save"
                          >
                            <Save size={18} />
                          </button>
                          <button
                            onClick={handleCancel}
                            className="p-2 text-gray-600 hover:bg-gray-50 rounded-card"
                            title="Cancel"
                          >
                            <X size={18} />
                          </button>
                        </div>
                      ) : (
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleViewDetails(user)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-card"
                            title="View Details"
                          >
                            <Eye size={18} />
                          </button>
                          <button
                            onClick={() => handleExportPDF(user)}
                            className="p-2 text-purple-600 hover:bg-purple-50 rounded-card"
                            title="Export PDF"
                          >
                            <Download size={18} />
                          </button>
                          <button
                            onClick={() => handleEdit(user)}
                            className="p-2 text-green-600 hover:bg-green-50 rounded-card"
                            title="Edit"
                          >
                            <Edit size={18} />
                          </button>
                          {user.user_id !== currentUser?.id && (
                            <button
                              onClick={() => handleDelete(user.user_id)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-card"
                              title="Delete"
                            >
                              <Trash2 size={18} />
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* User Details Modal */}
      {showDetailsModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowDetailsModal(false)}>
          <div className="bg-white rounded-card p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-navy-ink">User Details</h2>
              <button
                onClick={() => setShowDetailsModal(false)}
                className="p-2 hover:bg-gray-100 rounded-card"
              >
                <CloseIcon size={24} />
              </button>
            </div>

            {loadingApplications ? (
              <div className="text-center py-8">
                <p className="text-gray-600">Loading user information...</p>
              </div>
            ) : (
            <div className="space-y-6">
              {/* User Profile Header */}
              <div className="flex items-start space-x-4 pb-4 border-b">
                <div className="w-20 h-20 rounded-full bg-gold flex items-center justify-center text-white text-2xl font-bold flex-shrink-0 overflow-hidden">
                  {(enrichedUserData?.avatar_url || selectedUser.avatar_url) ? (
                    <img 
                      src={
                        enrichedUserData?.avatar_url 
                          ? (enrichedUserData.avatar_url.includes('http') 
                              ? enrichedUserData.avatar_url 
                              : getStorageUrl('avatars', enrichedUserData.avatar_url))
                          : (selectedUser.avatar_url 
                              ? (selectedUser.avatar_url.includes('http') 
                                  ? selectedUser.avatar_url 
                                  : getStorageUrl('avatars', selectedUser.avatar_url))
                              : '')
                      } 
                      alt={enrichedUserData?.full_name || selectedUser.nickname || 'User'} 
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        const displayName = enrichedUserData?.full_name || selectedUser.nickname || selectedUser.email || 'U';
                        target.style.display = 'none';
                        target.parentElement!.textContent = displayName.charAt(0).toUpperCase();
                      }}
                    />
                  ) : (
                    (enrichedUserData?.full_name || selectedUser.nickname || selectedUser.email || 'U').charAt(0).toUpperCase()
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-navy-ink mb-1">
                    {enrichedUserData?.full_name || enrichedUserData?.nickname || selectedUser.nickname || enrichedUserData?.email || selectedUser.email || 'Unknown User'}
                  </h3>
                  <p className="text-gray-600 mb-2">{enrichedUserData?.email || selectedUser.email || 'No email'}</p>
                  <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getRoleBadgeColor(selectedUser.role)}`}>
                    {selectedUser.role.charAt(0).toUpperCase() + selectedUser.role.slice(1)}
                  </span>
                </div>
              </div>

              {/* User Information */}
              <div>
                <h3 className="text-lg font-semibold text-navy-ink mb-4">Personal Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  {enrichedUserData?.title && (
                    <div>
                      <p className="text-sm text-gray-600">Title</p>
                      <p className="font-medium">{enrichedUserData.title}</p>
                    </div>
                  )}
                  {enrichedUserData?.first_name && (
                    <div>
                      <p className="text-sm text-gray-600">First Name</p>
                      <p className="font-medium">{enrichedUserData.first_name}</p>
                    </div>
                  )}
                  {enrichedUserData?.middle_name && (
                    <div>
                      <p className="text-sm text-gray-600">Middle Name</p>
                      <p className="font-medium">{enrichedUserData.middle_name}</p>
                    </div>
                  )}
                  {enrichedUserData?.last_name && (
                    <div>
                      <p className="text-sm text-gray-600">Last Name</p>
                      <p className="font-medium">{enrichedUserData.last_name}</p>
                    </div>
                  )}
                  {enrichedUserData?.preferred_name && (
                    <div>
                      <p className="text-sm text-gray-600">Preferred Name</p>
                      <p className="font-medium">{enrichedUserData.preferred_name}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-gray-600">Full Name</p>
                    <p className="font-medium">
                      {enrichedUserData?.first_name && enrichedUserData?.last_name
                        ? `${enrichedUserData.first_name} ${enrichedUserData.last_name}`
                        : enrichedUserData?.full_name || enrichedUserData?.nickname || selectedUser.nickname || selectedUser.first_name || 'N/A'}
                    </p>
                  </div>
                  {enrichedUserData?.first_name && (
                    <div>
                      <p className="text-sm text-gray-600">First Name</p>
                      <p className="font-medium">{enrichedUserData.first_name}</p>
                    </div>
                  )}
                  {enrichedUserData?.last_name && (
                    <div>
                      <p className="text-sm text-gray-600">Last Name</p>
                      <p className="font-medium">{enrichedUserData.last_name}</p>
                    </div>
                  )}
                  {enrichedUserData?.nickname && enrichedUserData?.nickname !== `${enrichedUserData?.first_name || ''} ${enrichedUserData?.last_name || ''}`.trim() && (
                    <div>
                      <p className="text-sm text-gray-600">Nickname / Preferred Name</p>
                      <p className="font-medium">{enrichedUserData.nickname}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-gray-600">Email Address</p>
                    <p className="font-medium break-all text-blue-600">
                      {enrichedUserData?.email || selectedUser.email || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Phone Number</p>
                    <p className="font-medium">
                      {enrichedUserData?.phone || selectedUser.phone || 'N/A'}
                      {!enrichedUserData?.phone && !selectedUser.phone && (
                        <span className="text-xs text-red-600 ml-2 block mt-1">⚠️ Phone not found in registration</span>
                      )}
                      {enrichedUserData?.phone && enrichedUserData?.phone !== selectedUser.phone && <span className="text-xs text-green-600 ml-2">(from application)</span>}
                    </p>
                  </div>
                  {enrichedUserData?.id_number && (
                    <div>
                      <p className="text-sm text-gray-600">ID Number</p>
                      <p className="font-medium">{enrichedUserData.id_number}</p>
                    </div>
                  )}
                  {enrichedUserData?.nationality && (
                    <div>
                      <p className="text-sm text-gray-600">Nationality</p>
                      <p className="font-medium">{enrichedUserData.nationality}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-gray-600">Date of Birth</p>
                    <p className="font-medium">
                      {enrichedUserData?.date_of_birth || selectedUser.date_of_birth
                        ? new Date(enrichedUserData?.date_of_birth || selectedUser.date_of_birth).toLocaleDateString() 
                        : 'N/A'}
                      {!enrichedUserData?.date_of_birth && !selectedUser.date_of_birth && (
                        <span className="text-xs text-red-600 ml-2 block mt-1">⚠️ Date of birth not found</span>
                      )}
                    </p>
                  </div>
                  {enrichedUserData?.gender && (
                    <div>
                      <p className="text-sm text-gray-600">Gender</p>
                      <p className="font-medium">{enrichedUserData.gender}</p>
                    </div>
                  )}
                  {enrichedUserData?.marital_status && (
                    <div>
                      <p className="text-sm text-gray-600">Marital Status</p>
                      <p className="font-medium">{enrichedUserData.marital_status}</p>
                    </div>
                  )}
                  <div className="col-span-2">
                    <p className="text-sm text-gray-600">Physical Address</p>
                    <p className="font-medium">
                      {enrichedUserData?.address || selectedUser.address || 'N/A'}
                      {!enrichedUserData?.address && !selectedUser.address && (
                        <span className="text-xs text-red-600 ml-2 block mt-1">⚠️ Address not found in registration</span>
                      )}
                      {enrichedUserData?.address && enrichedUserData?.address !== selectedUser.address && <span className="text-xs text-green-600 ml-2">(from application)</span>}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">City</p>
                    <p className="font-medium">
                      {enrichedUserData?.city || selectedUser.city || 'N/A'}
                      {!enrichedUserData?.city && !selectedUser.city && (
                        <span className="text-xs text-red-600 ml-2 block mt-1">⚠️ City not found</span>
                      )}
                      {enrichedUserData?.city && enrichedUserData?.city !== selectedUser.city && <span className="text-xs text-green-600 ml-2">(from application)</span>}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Province</p>
                    <p className="font-medium">
                      {enrichedUserData?.province || selectedUser.province || 'N/A'}
                      {!enrichedUserData?.province && !selectedUser.province && (
                        <span className="text-xs text-red-600 ml-2 block mt-1">⚠️ Province not found</span>
                      )}
                      {enrichedUserData?.province && enrichedUserData?.province !== selectedUser.province && <span className="text-xs text-green-600 ml-2">(from application)</span>}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Postal Code</p>
                    <p className="font-medium">
                      {enrichedUserData?.postal_code || selectedUser.postal_code || 'N/A'}
                      {!enrichedUserData?.postal_code && !selectedUser.postal_code && (
                        <span className="text-xs text-red-600 ml-2 block mt-1">⚠️ Postal code not found</span>
                      )}
                      {enrichedUserData?.postal_code && enrichedUserData?.postal_code !== selectedUser.postal_code && <span className="text-xs text-green-600 ml-2">(from application)</span>}
                    </p>
                  </div>
                  {enrichedUserData?.country && (
                    <div>
                      <p className="text-sm text-gray-600">Country</p>
                      <p className="font-medium">{enrichedUserData.country}</p>
                    </div>
                  )}
                  {enrichedUserData?.home_language && (
                    <div>
                      <p className="text-sm text-gray-600">Home Language</p>
                      <p className="font-medium">{enrichedUserData.home_language}</p>
                    </div>
                  )}
                  {enrichedUserData?.population_group && (
                    <div>
                      <p className="text-sm text-gray-600">Population Group</p>
                      <p className="font-medium">{enrichedUserData.population_group}</p>
                    </div>
                  )}
                  {enrichedUserData?.residential_status && (
                    <div>
                      <p className="text-sm text-gray-600">Residential Status</p>
                      <p className="font-medium">{enrichedUserData.residential_status}</p>
                    </div>
                  )}
                  {enrichedUserData?.id_number && (
                    <div>
                      <p className="text-sm text-gray-600">ID Number</p>
                      <p className="font-medium">{enrichedUserData.id_number}</p>
                    </div>
                  )}
                  {enrichedUserData?.current_ministry_name && (
                    <div>
                      <p className="text-sm text-gray-600">Current Ministry</p>
                      <p className="font-medium">{enrichedUserData.current_ministry_name}</p>
                    </div>
                  )}
                  {enrichedUserData?.denomination && (
                    <div>
                      <p className="text-sm text-gray-600">Denomination</p>
                      <p className="font-medium">{enrichedUserData.denomination}</p>
                    </div>
                  )}
                  {enrichedUserData?.ministry_position && (
                    <div>
                      <p className="text-sm text-gray-600">Ministry Position</p>
                      <p className="font-medium">{enrichedUserData.ministry_position}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-gray-600">User Role</p>
                    <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getRoleBadgeColor(selectedUser.role)}`}>
                      {selectedUser.role.charAt(0).toUpperCase() + selectedUser.role.slice(1)}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Account Created</p>
                    <p className="font-medium">{new Date(selectedUser.created_at).toLocaleString()}</p>
                  </div>
                  {selectedUser.updated_at && (
                    <div>
                      <p className="text-sm text-gray-600">Last Updated</p>
                      <p className="font-medium">{new Date(selectedUser.updated_at).toLocaleString()}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Bio Section */}
              {selectedUser.bio && (
                <div>
                  <h3 className="text-lg font-semibold text-navy-ink mb-4">Bio</h3>
                  <p className="text-gray-700 whitespace-pre-wrap bg-gray-50 p-4 rounded-card">
                    {selectedUser.bio}
                  </p>
                </div>
              )}

              {/* Debug: Show Raw Application Data */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-card p-4 mb-4">
                <details className="text-sm">
                  <summary className="cursor-pointer font-medium text-yellow-800 mb-2">
                    🔍 Debug: View Data ({userApplications.length} application{userApplications.length !== 1 ? 's' : ''})
                  </summary>
                  <div className="mt-2 space-y-2">
                    <div>
                      <p className="font-medium text-xs text-yellow-800 mb-1">Enriched User Data:</p>
                      <pre className="text-xs overflow-auto max-h-32 bg-white p-2 rounded border">
                        {JSON.stringify(enrichedUserData, null, 2)}
                      </pre>
                    </div>
                    {userApplications.length > 0 && (
                      <div>
                        <p className="font-medium text-xs text-yellow-800 mb-1">Raw Application Data:</p>
                        <pre className="text-xs overflow-auto max-h-32 bg-white p-2 rounded border">
                          {JSON.stringify(userApplications, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                </details>
              </div>

              {/* Applications */}
              <div>
                <h3 className="text-lg font-semibold text-navy-ink mb-4">Applications</h3>
                {loadingApplications ? (
                  <p className="text-gray-600">Loading applications...</p>
                ) : userApplications.length === 0 ? (
                  <p className="text-gray-600">No applications found</p>
                ) : (
                  <div className="space-y-3">
                    {userApplications.map((app: any) => (
                      <div key={app.id} className="p-4 bg-muted-gray rounded-card">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium text-navy-ink">
                              {app.programs?.title || app.program_type?.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()) || 'Application'}
                            </p>
                            <p className="text-sm text-gray-600 mt-1">
                              Status: <span className={`font-medium ${
                                app.status === 'approved' ? 'text-green-600' :
                                app.status === 'rejected' ? 'text-red-600' :
                                'text-amber-600'
                              }`}>{app.status}</span>
                            </p>
                            <p className="text-sm text-gray-600">
                              Payment: <span className={`font-medium ${
                                app.payment_status === 'confirmed' ? 'text-green-600' :
                                app.payment_status === 'pending' ? 'text-amber-600' :
                                'text-gray-600'
                              }`}>{app.payment_status || 'N/A'}</span>
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              Applied: {new Date(app.created_at).toLocaleString()}
                            </p>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(`/admin/applications`, '_blank')}
                          >
                            <FileText size={14} className="mr-1" />
                            View Full Application
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setShowDetailsModal(false)}>
                  Close
                </Button>
                <Button variant="primary" onClick={() => handleExportPDF(selectedUser)}>
                  <Download size={16} className="mr-2" />
                  Export PDF
                </Button>
              </div>
            </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

