import React from 'react';
import { MapPin, Clock, Users } from 'lucide-react';
import { Button } from './Button';
interface EventCardProps {
  id?: string;
  title: string;
  date: string;
  time: string;
  location: string;
  isOnline: boolean;
  capacity: number;
  registered: number;
  image: string;
  description: string;
}
export function EventCard({
  title,
  date,
  time,
  location,
  isOnline,
  capacity,
  registered,
  image,
  description
}: EventCardProps) {
  const capacityPercentage = registered / capacity * 100;
  const isAlmostFull = capacityPercentage >= 80;
  const isFull = registered >= capacity;
  return <div className="bg-white rounded-card overflow-hidden shadow-soft hover:shadow-lg transition-all">
      <div className="relative h-48">
        <img src={image} alt={title} className="w-full h-full object-cover" />
        <div className="absolute top-4 left-4 bg-brand-dark-blue text-white px-3 py-1 rounded-md font-medium">
          {date}
        </div>
        {isOnline && <div className="absolute top-4 right-4 bg-gold text-white px-3 py-1 rounded-md font-medium">
            Online
          </div>}
      </div>
      <div className="p-6">
        <h3 className="text-xl font-bold text-navy-ink mb-2">{title}</h3>
        <p className="text-gray-600 mb-4 line-clamp-2">{description}</p>
        <div className="flex flex-col space-y-2 mb-4">
          <div className="flex items-center text-gray-600">
            <Clock size={16} className="mr-2" />
            <span>{time}</span>
          </div>
          <div className="flex items-center text-gray-600">
            <MapPin size={16} className="mr-2" />
            <span>{location}</span>
          </div>
          <div className="flex items-center text-gray-600">
            <Users size={16} className="mr-2" />
            <span>
              {registered} / {capacity} registered
            </span>
          </div>
        </div>
        {/* Capacity indicator */}
        <div className="w-full h-2 bg-gray-200 rounded-full mb-4">
          <div className={`h-full rounded-full ${isFull ? 'bg-red-500' : isAlmostFull ? 'bg-amber-500' : 'bg-green-500'}`} style={{
          width: `${Math.min(capacityPercentage, 100)}%`
        }}></div>
        </div>
        <Button variant="primary" className="w-full" disabled={isFull}>
          {isFull ? 'Event Full' : 'Register Now'}
        </Button>
      </div>
    </div>;
}