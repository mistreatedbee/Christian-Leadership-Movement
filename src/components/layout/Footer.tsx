import React from 'react';
import { Link } from 'react-router-dom';
import { Phone, Mail, MapPin, Facebook, Instagram, Youtube } from 'lucide-react';
export function Footer() {
  return <footer className="bg-brand-dark-blue text-white pt-12 pb-6">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Organization Info */}
          <div>
            <h3 className="text-xl font-bold mb-4">
              Christian Leadership Movement
            </h3>
            <p className="text-gray-300 mb-4">
              Transforming Leaders Transforming the Nations.
            </p>
            <p className="text-gold font-bold text-lg mb-2">
              TRANSFORM LEADERS!!!!!!!!TRANSFORM THE NATIONS!!!!!!!!
            </p>
            <div className="flex space-x-4">
              <a href="https://facebook.com" className="text-white hover:text-gold">
                <Facebook size={20} />
              </a>
              <a href="https://instagram.com" className="text-white hover:text-gold">
                <Instagram size={20} />
              </a>
              <a href="https://youtube.com" className="text-white hover:text-gold">
                <Youtube size={20} />
              </a>
            </div>
          </div>
          {/* Quick Links */}
          <div>
            <h3 className="text-lg font-bold mb-4">Quick Links</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/about" className="text-gray-300 hover:text-gold">
                  About Us
                </Link>
              </li>
              <li>
                <Link to="/programs" className="text-gray-300 hover:text-gold">
                  Programs
                </Link>
              </li>
              <li>
                <Link to="/events" className="text-gray-300 hover:text-gold">
                  Events
                </Link>
              </li>
              <li>
                <Link to="/partners" className="text-gray-300 hover:text-gold">
                  Partners
                </Link>
              </li>
            </ul>
          </div>
          {/* Contact Info */}
          <div>
            <h3 className="text-lg font-bold mb-4">Contact Us</h3>
            <ul className="space-y-3">
              <li className="flex items-center">
                <Phone size={16} className="mr-2" />
                <a href="tel:+27732047642" className="text-gray-300 hover:text-gold">
                  073 204 7642
                </a>
              </li>
              <li className="flex items-center">
                <Mail size={16} className="mr-2" />
                <a href="mailto:kenstraining04@gmail.com" className="text-gray-300 hover:text-gold">
                  kenstraining04@gmail.com
                </a>
              </li>
              <li className="flex items-start">
                <MapPin size={16} className="mr-2 mt-1" />
                <span className="text-gray-300">
                  Dwarsloop phase 2 house no 1717
                </span>
              </li>
              <li className="flex items-center">
                <a href="https://www.kenstraining.co.za" target="_blank" rel="noopener noreferrer" className="text-gray-300 hover:text-gold">
                  www.kenstraining.co.za
                </a>
              </li>
            </ul>
          </div>
          {/* Newsletter */}
          <div>
            <h3 className="text-lg font-bold mb-4">Stay Updated</h3>
            <p className="text-gray-300 mb-3">Subscribe to our newsletter</p>
            <form className="flex flex-col space-y-3">
              <input type="email" placeholder="Your email" className="px-4 py-2 rounded-card text-navy-ink focus:outline-none focus:ring-2 focus:ring-gold" />
              <button type="submit" className="bg-gold hover:bg-opacity-90 text-white px-4 py-2 rounded-card font-medium transition-all">
                Subscribe
              </button>
            </form>
          </div>
        </div>
        {/* Bottom Footer */}
        <div className="border-t border-gray-700 mt-8 pt-6">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-400 text-sm mb-4 md:mb-0">
              &copy; {new Date().getFullYear()} Christian Leadership Movement.
              All rights reserved.
            </p>
            <div className="flex space-x-4">
              <Link to="/privacy-policy" className="text-gray-400 hover:text-gold text-sm">
                Privacy Policy
              </Link>
              <Link to="/terms-of-service" className="text-gray-400 hover:text-gold text-sm">
                Terms of Service
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>;
}