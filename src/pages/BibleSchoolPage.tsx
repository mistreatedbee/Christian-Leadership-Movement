import React, { useState, useEffect } from 'react';
import { useUser } from '@insforge/react';
import { insforge } from '../lib/insforge';
import { Button } from '../components/ui/Button';
import { TopNav } from '../components/layout/TopNav';
import { Footer } from '../components/layout/Footer';
import { BookOpen, Users, Video, FileText, Calendar, Clock, MapPin, Link as LinkIcon, Download, ExternalLink, CheckCircle } from 'lucide-react';
import { getStorageUrl } from '../lib/connection';
import { getUserRole } from '../lib/auth';

type TabType = 'studies' | 'classes' | 'meetings' | 'resources';

export function BibleSchoolPage() {
  const { user, isLoaded } = useUser();
  const [activeTab, setActiveTab] = useState<TabType>('studies');
  const [studies, setStudies] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [meetings, setMeetings] = useState<any[]>([]);
  const [resources, setResources] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [registrations, setRegistrations] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (isLoaded) {
      fetchData();
    }
  }, [activeTab, isLoaded, user]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Check if user is admin
      let isAdmin = false;
      if (user) {
        try {
          const role = await getUserRole(user.id);
          isAdmin = role === 'admin' || role === 'super_admin';
        } catch (err) {
          console.error('Error checking admin status:', err);
        }
      }

      if (activeTab === 'studies') {
        let query = insforge.database
          .from('bible_school_studies')
          .select('*')
          .gte('scheduled_date', new Date().toISOString())
          .order('scheduled_date', { ascending: true });
        
        // Non-admins only see scheduled studies
        if (!isAdmin) {
          query = query.eq('status', 'scheduled');
        }
        
        const { data } = await query;
        setStudies(data || []);
      } else if (activeTab === 'classes') {
        let query = insforge.database
          .from('bible_school_classes')
          .select('*')
          .gte('scheduled_date', new Date().toISOString())
          .order('scheduled_date', { ascending: true });
        
        if (!isAdmin) {
          query = query.eq('status', 'scheduled');
        }
        
        const { data } = await query;
        setClasses(data || []);
      } else if (activeTab === 'meetings') {
        let query = insforge.database
          .from('bible_school_meetings')
          .select('*')
          .gte('scheduled_date', new Date().toISOString())
          .order('scheduled_date', { ascending: true });
        
        if (!isAdmin) {
          query = query.eq('status', 'scheduled');
        }
        
        const { data } = await query;
        setMeetings(data || []);
      } else if (activeTab === 'resources') {
        let query = insforge.database
          .from('bible_school_resources')
          .select('*')
          .order('created_at', { ascending: false });
        
        // Non-admins only see public resources
        if (!isAdmin) {
          query = query.eq('is_public', true);
        }
        
        const { data } = await query;
        setResources(data || []);
      }

      // Check user registrations
      if (user) {
        const { data: userRegs } = await insforge.database
          .from('bible_school_participants')
          .select('study_id, class_id, meeting_id')
          .eq('user_id', user.id);

        const regMap: Record<string, boolean> = {};
        userRegs?.forEach((reg: any) => {
          if (reg.study_id) regMap[`study_${reg.study_id}`] = true;
          if (reg.class_id) regMap[`class_${reg.class_id}`] = true;
          if (reg.meeting_id) regMap[`meeting_${reg.meeting_id}`] = true;
        });
        setRegistrations(regMap);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (id: string, type: 'study' | 'class' | 'meeting') => {
    if (!user) {
      alert('Please log in to register');
      return;
    }

    try {
      const registrationData: any = {
        user_id: user.id,
        status: 'registered'
      };

      if (type === 'study') {
        registrationData.study_id = id;
      } else if (type === 'class') {
        registrationData.class_id = id;
      } else if (type === 'meeting') {
        registrationData.meeting_id = id;
      }

      await insforge.database.from('bible_school_participants').insert([registrationData]);
      
      // Update local state
      setRegistrations({ ...registrations, [`${type}_${id}`]: true });
      alert('Registration successful!');
    } catch (err: any) {
      console.error('Registration error:', err);
      if (err.message?.includes('duplicate') || err.message?.includes('unique')) {
        alert('You are already registered for this event');
      } else {
        alert('Failed to register. Please try again.');
      }
    }
  };

  const handleDownloadResource = async (resource: any) => {
    if (resource.external_link) {
      window.open(resource.external_link, '_blank');
    } else if (resource.file_url) {
      const url = resource.file_url.startsWith('http') 
        ? resource.file_url 
        : getStorageUrl('resources', resource.file_url);
      window.open(url, '_blank');
    }

    // Increment download count
    try {
      await insforge.database
        .from('bible_school_resources')
        .update({ download_count: (resource.download_count || 0) + 1 })
        .eq('id', resource.id);
    } catch (err) {
      console.error('Error updating download count:', err);
    }
  };

  const tabs = [
    { id: 'studies' as TabType, label: 'Bible Studies', icon: BookOpen },
    { id: 'classes' as TabType, label: 'Classes', icon: Users },
    { id: 'meetings' as TabType, label: 'Meetings', icon: Video },
    { id: 'resources' as TabType, label: 'Resources', icon: FileText }
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <TopNav />
      <main className="flex-grow">
        <div className="container mx-auto px-4 py-8">
          {/* Header Section */}
          <div className="bg-gradient-to-r from-navy-ink to-brand-dark-blue text-white rounded-card shadow-soft p-8 mb-8">
            <h1 className="text-4xl font-bold mb-2">Bible School</h1>
            <p className="text-lg text-blue-100 mb-4">
              Comprehensive theological education and leadership training
            </p>
            <p className="text-blue-50">
              Transform your calling into effective ministry through comprehensive theological education and practical leadership training.
            </p>
          </div>

          {/* What You'll Gain Section */}
          <div className="bg-white rounded-card shadow-soft p-8 mb-8">
            <h2 className="text-3xl font-bold text-navy-ink mb-6">What You'll Gain</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="border-l-4 border-blue-500 pl-4">
                <h3 className="text-xl font-bold text-navy-ink mb-2">📖 Comprehensive Biblical Education</h3>
                <p className="text-gray-600 mb-2">
                  In-depth study of Old and New Testaments, systematic theology, church history, biblical interpretation, and hermeneutics.
                </p>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Complete Bible survey and exegesis</li>
                  <li>• Theological foundations and doctrines</li>
                  <li>• Church history and tradition</li>
                </ul>
              </div>

              <div className="border-l-4 border-gold pl-4">
                <h3 className="text-xl font-bold text-navy-ink mb-2">👥 Practical Ministry Skills</h3>
                <p className="text-gray-600 mb-2">
                  Hands-on training in pastoral care, preaching, teaching, counseling, worship leadership, and community outreach.
                </p>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Sermon preparation and delivery</li>
                  <li>• Pastoral counseling techniques</li>
                  <li>• Worship and service planning</li>
                </ul>
              </div>

              <div className="border-l-4 border-green-500 pl-4">
                <h3 className="text-xl font-bold text-navy-ink mb-2">🏆 Recognized Certification</h3>
                <p className="text-gray-600 mb-2">
                  Earn a certificate of completion that validates your theological education and enhances your ministry credentials.
                </p>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Official CLM Bible School certificate</li>
                  <li>• Enhanced ministry credibility</li>
                  <li>• Recognition in Christian leadership circles</li>
                </ul>
              </div>

              <div className="border-l-4 border-purple-500 pl-4">
                <h3 className="text-xl font-bold text-navy-ink mb-2">🤝 Mentorship & Support</h3>
                <p className="text-gray-600 mb-2">
                  Access to experienced pastors and leaders who provide guidance, answer questions, and support your growth.
                </p>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• One-on-one mentorship sessions</li>
                  <li>• Regular check-ins and feedback</li>
                  <li>• Ongoing support after graduation</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Resources & Materials Section */}
          <div className="bg-white rounded-card shadow-soft p-8 mb-8">
            <h2 className="text-3xl font-bold text-navy-ink mb-6">Resources & Materials You'll Receive</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="border-l-4 border-blue-500 pl-4">
                <h3 className="text-xl font-bold text-navy-ink mb-3">📚 Study Materials</h3>
                <ul className="space-y-2 text-gray-600">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-1" />
                    <span>Comprehensive course textbooks and study guides</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-1" />
                    <span>Digital library access with theological resources</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-1" />
                    <span>Biblical commentaries and reference materials</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-1" />
                    <span>Study notes and lecture materials</span>
                  </li>
                </ul>
              </div>

              <div className="border-l-4 border-gold pl-4">
                <h3 className="text-xl font-bold text-navy-ink mb-3">🎥 Video & Audio Content</h3>
                <ul className="space-y-2 text-gray-600">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-1" />
                    <span>Recorded lectures and teaching sessions</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-1" />
                    <span>Video demonstrations of ministry practices</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-1" />
                    <span>Audio sermons and teaching series</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-1" />
                    <span>Interactive online learning modules</span>
                  </li>
                </ul>
              </div>

              <div className="border-l-4 border-green-500 pl-4">
                <h3 className="text-xl font-bold text-navy-ink mb-3">📝 Practical Tools</h3>
                <ul className="space-y-2 text-gray-600">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-1" />
                    <span>Sermon preparation templates and guides</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-1" />
                    <span>Ministry planning worksheets and checklists</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-1" />
                    <span>Counseling resources and frameworks</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-1" />
                    <span>Leadership assessment tools</span>
                  </li>
                </ul>
              </div>

              <div className="border-l-4 border-purple-500 pl-4">
                <h3 className="text-xl font-bold text-navy-ink mb-3">👥 Community Access</h3>
                <ul className="space-y-2 text-gray-600">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-1" />
                    <span>Access to student forums and discussion groups</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-1" />
                    <span>Networking opportunities with fellow students</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-1" />
                    <span>Access to alumni network after graduation</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-1" />
                    <span>Regular webinars and Q&A sessions</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-3xl font-bold text-navy-ink mb-2">Bible School Activities</h2>
            <p className="text-gray-600">Join our online Bible studies, classes, and meetings</p>
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200 mb-6">
            <div className="flex space-x-4">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center px-4 py-2 border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-gold text-gold font-semibold'
                      : 'border-transparent text-gray-600 hover:text-navy-ink'
                  }`}
                >
                  <tab.icon size={18} className="mr-2" />
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          {loading ? (
            <div className="text-center py-12">Loading...</div>
          ) : (
            <div className="space-y-6">
              {activeTab === 'studies' && (
                <>
                  {studies.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">No upcoming Bible studies scheduled.</p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {studies.map(study => {
                        const isRegistered = registrations[`study_${study.id}`];
                        return (
                          <div key={study.id} className="bg-white rounded-card shadow-soft p-6">
                            <h3 className="text-xl font-bold text-navy-ink mb-2">{study.title}</h3>
                            <p className="text-gray-600 mb-4">{study.description}</p>
                            <div className="space-y-2 mb-4 text-sm text-gray-600">
                              {study.scheduled_date && (
                                <div className="flex items-center">
                                  <Calendar className="mr-2" size={16} />
                                  {new Date(study.scheduled_date).toLocaleDateString('en-US', {
                                    weekday: 'long',
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric'
                                  })}
                                </div>
                              )}
                              {study.scheduled_date && (
                                <div className="flex items-center">
                                  <Clock className="mr-2" size={16} />
                                  {new Date(study.scheduled_date).toLocaleTimeString('en-US', {
                                    hour: 'numeric',
                                    minute: '2-digit'
                                  })}
                                </div>
                              )}
                              {study.is_online ? (
                                <div className="flex items-center text-blue-600">
                                  <LinkIcon className="mr-2" size={16} />
                                  Online Event
                                </div>
                              ) : (
                                <div className="flex items-center">
                                  <MapPin className="mr-2" size={16} />
                                  {study.location}
                                </div>
                              )}
                              {study.duration_minutes && (
                                <div className="text-xs text-gray-500">
                                  Duration: {study.duration_minutes} minutes
                                </div>
                              )}
                            </div>
                            {study.is_online && study.meeting_link && (
                              <div className="mb-4">
                                <a
                                  href={study.meeting_link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:underline flex items-center text-sm"
                                >
                                  <ExternalLink className="mr-1" size={14} />
                                  Join Meeting
                                </a>
                              </div>
                            )}
                            {!isRegistered ? (
                              <Button
                                variant="primary"
                                className="w-full"
                                onClick={() => handleRegister(study.id, 'study')}
                              >
                                Register for Study
                              </Button>
                            ) : (
                              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-2 rounded-card text-center text-sm">
                                ✓ Registered
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              )}

              {activeTab === 'classes' && (
                <>
                  {classes.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">No upcoming classes scheduled.</p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {classes.map(cls => {
                        const isRegistered = registrations[`class_${cls.id}`];
                        return (
                          <div key={cls.id} className="bg-white rounded-card shadow-soft p-6">
                            <h3 className="text-xl font-bold text-navy-ink mb-2">{cls.title}</h3>
                            <p className="text-gray-600 mb-4">{cls.description}</p>
                            <div className="space-y-2 mb-4 text-sm text-gray-600">
                              {cls.scheduled_date && (
                                <>
                                  <div className="flex items-center">
                                    <Calendar className="mr-2" size={16} />
                                    {new Date(cls.scheduled_date).toLocaleDateString('en-US', {
                                      weekday: 'long',
                                      year: 'numeric',
                                      month: 'long',
                                      day: 'numeric'
                                    })}
                                  </div>
                                  <div className="flex items-center">
                                    <Clock className="mr-2" size={16} />
                                    {new Date(cls.scheduled_date).toLocaleTimeString('en-US', {
                                      hour: 'numeric',
                                      minute: '2-digit'
                                    })}
                                  </div>
                                </>
                              )}
                              {cls.is_online ? (
                                <div className="flex items-center text-blue-600">
                                  <LinkIcon className="mr-2" size={16} />
                                  Online Class
                                </div>
                              ) : (
                                <div className="flex items-center">
                                  <MapPin className="mr-2" size={16} />
                                  {cls.location}
                                </div>
                              )}
                            </div>
                            {cls.is_online && cls.meeting_link && (
                              <div className="mb-4">
                                <a
                                  href={cls.meeting_link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:underline flex items-center text-sm"
                                >
                                  <ExternalLink className="mr-1" size={14} />
                                  Join Class
                                </a>
                              </div>
                            )}
                            {!isRegistered ? (
                              <Button
                                variant="primary"
                                className="w-full"
                                onClick={() => handleRegister(cls.id, 'class')}
                              >
                                Register for Class
                              </Button>
                            ) : (
                              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-2 rounded-card text-center text-sm">
                                ✓ Registered
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              )}

              {activeTab === 'meetings' && (
                <>
                  {meetings.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">No upcoming meetings scheduled.</p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {meetings.map(meeting => {
                        const isRegistered = registrations[`meeting_${meeting.id}`];
                        return (
                          <div key={meeting.id} className="bg-white rounded-card shadow-soft p-6">
                            <h3 className="text-xl font-bold text-navy-ink mb-2">{meeting.title}</h3>
                            <p className="text-gray-600 mb-4">{meeting.description}</p>
                            <div className="space-y-2 mb-4 text-sm text-gray-600">
                              {meeting.scheduled_date && (
                                <>
                                  <div className="flex items-center">
                                    <Calendar className="mr-2" size={16} />
                                    {new Date(meeting.scheduled_date).toLocaleDateString('en-US', {
                                      weekday: 'long',
                                      year: 'numeric',
                                      month: 'long',
                                      day: 'numeric'
                                    })}
                                  </div>
                                  <div className="flex items-center">
                                    <Clock className="mr-2" size={16} />
                                    {new Date(meeting.scheduled_date).toLocaleTimeString('en-US', {
                                      hour: 'numeric',
                                      minute: '2-digit'
                                    })}
                                  </div>
                                </>
                              )}
                              {meeting.is_online ? (
                                <div className="flex items-center text-blue-600">
                                  <LinkIcon className="mr-2" size={16} />
                                  Online Meeting
                                </div>
                              ) : (
                                <div className="flex items-center">
                                  <MapPin className="mr-2" size={16} />
                                  {meeting.location}
                                </div>
                              )}
                            </div>
                            {meeting.is_online && meeting.meeting_link && (
                              <div className="mb-4">
                                <a
                                  href={meeting.meeting_link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:underline flex items-center text-sm"
                                >
                                  <ExternalLink className="mr-1" size={14} />
                                  Join Meeting
                                </a>
                              </div>
                            )}
                            {!isRegistered ? (
                              <Button
                                variant="primary"
                                className="w-full"
                                onClick={() => handleRegister(meeting.id, 'meeting')}
                              >
                                Register for Meeting
                              </Button>
                            ) : (
                              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-2 rounded-card text-center text-sm">
                                ✓ Registered
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              )}

              {activeTab === 'resources' && (
                <>
                  {resources.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">No resources available.</p>
                  ) : (
                    <>
                      {/* Resource Categories Filter */}
                      <div className="mb-6">
                        <h3 className="text-lg font-semibold text-navy-ink mb-4">Browse Resources by Category</h3>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                          {['Study Materials', 'Video & Audio', 'Practical Tools', 'All Resources'].map((cat, idx) => (
                            <div key={idx} className="bg-white rounded-card shadow-soft p-4 border-2 border-transparent hover:border-gold transition-colors cursor-pointer">
                              <h4 className="font-semibold text-navy-ink">{cat}</h4>
                              <p className="text-xs text-gray-500 mt-1">
                                {cat === 'Study Materials' && 'Books, Notes, Commentaries'}
                                {cat === 'Video & Audio' && 'Lectures, Sermons, Teaching'}
                                {cat === 'Practical Tools' && 'Templates, Worksheets, Guides'}
                                {cat === 'All Resources' && 'View everything'}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {resources.map(resource => (
                          <div key={resource.id} className="bg-white rounded-card shadow-soft p-6 hover:shadow-lg transition-shadow">
                            <div className="flex items-start justify-between mb-2">
                              <h3 className="text-lg font-bold text-navy-ink flex-1">{resource.title}</h3>
                              <span className={`px-2 py-1 text-xs rounded ml-2 ${
                                resource.resource_type === 'book' ? 'bg-blue-100 text-blue-800' :
                                resource.resource_type === 'notes' ? 'bg-green-100 text-green-800' :
                                resource.resource_type === 'test' ? 'bg-yellow-100 text-yellow-800' :
                                resource.resource_type === 'video' ? 'bg-red-100 text-red-800' :
                                resource.resource_type === 'audio' ? 'bg-purple-100 text-purple-800' :
                                resource.resource_type === 'document' ? 'bg-gray-100 text-gray-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {resource.resource_type}
                              </span>
                            </div>
                            <p className="text-gray-600 text-sm mb-3">{resource.description}</p>
                            {resource.category && (
                              <p className="text-xs text-gray-500 mb-3">
                                <span className="font-medium">Category:</span> {resource.category}
                              </p>
                            )}
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-gray-500">
                                {resource.download_count || 0} downloads
                              </span>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDownloadResource(resource)}
                              >
                                <Download className="mr-1" size={14} />
                                Download
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}

