import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Video, Play, Calendar, Users, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { insforge } from '../lib/insforge';
import { Button } from '../components/ui/Button';

interface LiveStream {
  id: string;
  event_id?: string;
  title: string;
  description?: string;
  stream_url?: string;
  provider?: string;
  status: string;
  scheduled_start: string;
  started_at?: string;
  ended_at?: string;
  recording_url?: string;
  viewer_count: number;
  events?: {
    id: string;
    title: string;
    event_date: string;
  };
}

export function LiveStreamPage() {
  const { id } = useParams<{ id: string }>();
  const [stream, setStream] = useState<LiveStream | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchStream();
    }
  }, [id]);

  const fetchStream = async () => {
    if (!id) return;

    try {
      setLoading(true);
      const { data } = await insforge.database
        .from('live_streams')
        .select('*, events(*)')
        .eq('id', id)
        .single();

      setStream(data);

      // Increment viewer count if live
      if (data && data.status === 'live') {
        await insforge.database
          .from('live_streams')
          .update({ viewer_count: (data.viewer_count || 0) + 1 })
          .eq('id', id);
      }
    } catch (error) {
      console.error('Error fetching stream:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Loading stream...</p>
      </div>
    );
  }

  if (!stream) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white p-12 rounded-card shadow-soft text-center">
          <p className="text-gray-600">Stream not found</p>
        </div>
      </div>
    );
  }

  const isLive = stream.status === 'live';
  const isScheduled = stream.status === 'scheduled' && new Date(stream.scheduled_start) > new Date();
  const hasRecording = stream.recording_url && stream.status === 'recorded';

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <Link
        to="/dashboard/events"
        className="inline-flex items-center text-gold hover:underline mb-6"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Events
      </Link>

      {/* Stream Header */}
      <div className="bg-white p-6 rounded-card shadow-soft mb-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              {isLive && (
                <span className="px-3 py-1 bg-red-500 text-white text-sm font-semibold rounded-full flex items-center gap-1">
                  <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                  LIVE
                </span>
              )}
              {isScheduled && (
                <span className="px-3 py-1 bg-blue-500 text-white text-sm font-semibold rounded-full">
                  Scheduled
                </span>
              )}
              {hasRecording && (
                <span className="px-3 py-1 bg-green-500 text-white text-sm font-semibold rounded-full">
                  Recorded
                </span>
              )}
            </div>
            <h1 className="text-3xl font-bold text-navy-ink mb-2">{stream.title}</h1>
            {stream.description && (
              <p className="text-gray-700 mb-4">{stream.description}</p>
            )}
            {stream.events && (
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {stream.events.title}
                </span>
                <span>
                  {new Date(stream.events.event_date).toLocaleDateString()}
                </span>
              </div>
            )}
          </div>
          {isLive && (
            <div className="flex items-center gap-2 text-red-600">
              <Users className="w-5 h-5" />
              <span className="font-semibold">{stream.viewer_count || 0} viewers</span>
            </div>
          )}
        </div>
      </div>

      {/* Stream Player */}
      <div className="bg-white rounded-card shadow-soft overflow-hidden mb-6">
        {isLive && stream.stream_url ? (
          <div className="relative" style={{ paddingBottom: '56.25%' }}>
            <iframe
              src={stream.stream_url}
              className="absolute top-0 left-0 w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        ) : hasRecording && stream.recording_url ? (
          <div className="relative" style={{ paddingBottom: '56.25%' }}>
            <iframe
              src={stream.recording_url}
              className="absolute top-0 left-0 w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        ) : isScheduled ? (
          <div className="p-12 text-center">
            <Video className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-navy-ink mb-2">Stream Scheduled</h2>
            <p className="text-gray-600 mb-4">
              This stream will begin on{' '}
              {new Date(stream.scheduled_start).toLocaleString()}
            </p>
            <div className="flex items-center justify-center gap-2 text-gray-600">
              <Calendar className="w-5 h-5" />
              <span>
                {new Date(stream.scheduled_start).toLocaleDateString()} at{' '}
                {new Date(stream.scheduled_start).toLocaleTimeString()}
              </span>
            </div>
          </div>
        ) : (
          <div className="p-12 text-center">
            <Video className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">Stream not available</p>
          </div>
        )}
      </div>

      {/* Stream Info */}
      <div className="bg-white p-6 rounded-card shadow-soft">
        <h2 className="text-xl font-bold text-navy-ink mb-4">Stream Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-semibold text-gray-700">Provider:</span>
            <span className="ml-2 text-gray-600 capitalize">{stream.provider || 'N/A'}</span>
          </div>
          <div>
            <span className="font-semibold text-gray-700">Scheduled Start:</span>
            <span className="ml-2 text-gray-600">
              {new Date(stream.scheduled_start).toLocaleString()}
            </span>
          </div>
          {stream.started_at && (
            <div>
              <span className="font-semibold text-gray-700">Started:</span>
              <span className="ml-2 text-gray-600">
                {new Date(stream.started_at).toLocaleString()}
              </span>
            </div>
          )}
          {stream.ended_at && (
            <div>
              <span className="font-semibold text-gray-700">Ended:</span>
              <span className="ml-2 text-gray-600">
                {new Date(stream.ended_at).toLocaleString()}
              </span>
            </div>
          )}
        </div>
        {stream.stream_url && (
          <div className="mt-4">
            <a
              href={stream.stream_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center text-gold hover:underline"
            >
              <Play className="w-4 h-4 mr-2" />
              Open in New Tab
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

