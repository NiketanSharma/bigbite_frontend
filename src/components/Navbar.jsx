import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import LocationPicker from './LocationPicker';
import heart from "../assets/heart.png";
import fallbackImg from "../assets/fallback.jpg";

const Navbar = () => {
  const { location, setLocation, cart, setUserLocation, userLocation } = useApp();
  const { user, isAuthenticated, logout, setShowLoginModal, setShowSignupModal } = useAuth();
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const navigate = useNavigate();
  const userMenuRef = useRef(null);

  // Set user location coordinates from profile if available (but don't change location text)
  useEffect(() => {
    if (user && user.address && user.address.latitude && user.address.longitude && !userLocation) {
      console.log('📍 Navbar - Setting user coordinates from profile:', { lat: user.address.latitude, lon: user.address.longitude });
      setUserLocation({
        latitude: user.address.latitude,
        longitude: user.address.longitude
      });
      // Don't set location text - let user explicitly select it
    }
  }, [user, userLocation, setUserLocation]);

  // Close user menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setShowUserMenu(false);
      }
    };

    if (showUserMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showUserMenu]);

  const handleLocationSelect = (addressData) => {
    // Use the display name if provided, otherwise construct from address parts
    let locationText = 'Selected Location';

    if (addressData.displayName) {
      // Use the exact display name from the selection
      locationText = addressData.displayName;
    } else if (addressData.fullAddress) {
      // Use first 2-3 parts of full address for better context
      const parts = addressData.fullAddress.split(',').map(p => p.trim());
      locationText = parts.slice(0, Math.min(3, parts.length)).join(', ');
    } else if (addressData.city !== 'N/A' && addressData.state !== 'N/A') {
      locationText = `${addressData.city}, ${addressData.state}`;
    } else if (addressData.city !== 'N/A') {
      locationText = addressData.city;
    } else if (addressData.state !== 'N/A') {
      locationText = addressData.state;
    }

    setLocation(locationText);

    // Set user location coordinates
    if (addressData.latitude && addressData.longitude) {
      setUserLocation({
        latitude: addressData.latitude,
        longitude: addressData.longitude
      });
      console.log('📍 Navbar - Location selected:', {
        displayText: locationText,
        coordinates: { latitude: addressData.latitude, longitude: addressData.longitude },
        fullAddressData: addressData
      });
    }

    setShowLocationPicker(false);
  };

  const locations = [
    'Mumbai, Maharashtra',
    'Delhi, NCR',
    'Bangalore, Karnataka',
    'Hyderabad, Telangana',
    'Pune, Maharashtra',
    'Chennai, Tamil Nadu',
  ];

  const cartItemsCount = cart.reduce((total, item) => total + item.quantity, 0);

  return (
    <nav className="fixed top-0 left-0 right-0 bg-white shadow-md z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center space-x-8">
            <div onClick={() => navigate("/")} className="flex-shrink-0 cursor-pointer">
              <h1 className="text-2xl font-bold text-[#FF3B30]">
                Big<span className="text-[#FFC107]">Bite</span>
              </h1>
            </div>

            {/* Location Selector */}
            <div className=" md:flex items-center space-x-2">
              <button
                onClick={() => setShowLocationPicker(true)}
                className="flex items-center space-x-2 text-gray-700 hover:text-[#FF3B30] transition-colors"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                <span className="hidden md:block font-medium">{location}</span>
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>
              {location !== 'Select Location' && (
                <button
                  onClick={() => {
                    setLocation('Select Location');
                    setUserLocation(null);
                  }}
                  className="text-gray-400 hover:text-red-500 transition-colors"
                  title="Clear location"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* Right Side Menu */}
          <div className="flex items-center space-x-1 md:space-x-4">
            {/* Cart */}
            <button
              onClick={() => navigate('/cart')}
              className="relative group flex items-center space-x-2 px-2 py-2 md:px-4 rounded-full hover:bg-gradient-to-r hover:from-red-500 hover:to-amber-400 transition-all duration-300"
            >
              <div className="relative">
                <lord-icon
                  src="https://cdn.lordicon.com/wjhxvnmc.json"
                  trigger="hover"
                  colors="primary:#e83a30,secondary:#e8b730"
                  className="size-7">
                </lord-icon>
                {cartItemsCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-gradient-to-r from-[#FF3B30] to-[#ff5549] text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center shadow-lg animate-pulse">
                    {cartItemsCount}
                  </span>
                )}
              </div>
              <span className="hidden md:block font-semibold text-gray-700 group-hover:text-white transition-colors">
                Cart
              </span>
            </button>

            {/* Wishlist */}
            {user && (
              <button
                onClick={() => navigate('/wishlists')}
                className="group flex items-center space-x-2 px-2 py-2 md:px-4 rounded-full hover:bg-gradient-to-r hover:from-red-500 hover:to-amber-400 transition-all duration-300"
              >
                <div className="relative">
                  <img src={heart} className="size-6 group-hover:scale-110 transition-transform duration-300" />
                </div>
                <span className="hidden md:block font-semibold text-gray-700 group-hover:text-white transition-colors">
                  La carte
                </span>
              </button>
            )}

            {/* User Profile */}
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center space-x-2 px-3 py-2 rounded-full text-gray-700 hover:bg-gradient-to-r hover:from-red-500 hover:to-amber-400 hover:text-white transition-all duration-300"
              >
                {user ? (
                  <>
                    {user.avatar ? (
                      <img
                        src={user.avatar}
                        alt={user.name}
                        onError={(e) => {
                          e.target.src = fallbackImg;
                          e.target.onerror = null;
                        }}
                        className="w-8 h-8 rounded-full object-cover border border-gray-100"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-[#FF3B30] text-white flex items-center justify-center font-semibold">
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </>
                ) : (
                  <lord-icon
                    src="https://cdn.lordicon.com/kdduutaw.json"
                    trigger="hover"
                    stroke="bold"
                    colors="primary:#e83a30,secondary:#e83a30"
                    className="size-7">
                  </lord-icon>
                )}
                <span className="hidden md:inline font-medium">
                  {user ? user.name : 'Sign In'}
                </span>
              </button>

              {/* User Menu Dropdown */}
              {showUserMenu && (
                <div
                  ref={userMenuRef}
                  className="poppins-regular absolute right-0 top-full mt-2 w-48 bg-white rounded-lg shadow-xl border border-gray-200 py-2"
                >
                  {isAuthenticated ? (
                    <>
                      <button
                        onClick={() => {
                          navigate('/profile');
                          setShowUserMenu(false);
                        }}
                        className="w-full text-left px-4 py-2 hover:bg-gray-100 text-gray-700 transition-colors"
                      >
                        My Profile
                      </button>
                      {user.role === 'restaurant' && (
                        <button
                          onClick={() => {
                            navigate('/restaurant-dashboard');
                            setShowUserMenu(false);
                          }}
                          className="w-full text-left px-4 py-2 hover:bg-gray-100 text-gray-700 transition-colors"
                        >
                          My Dashboard
                        </button>
                      )}
                      {user.role === 'rider' && (
                        <button
                          onClick={() => {
                            navigate('/rider/dashboard');
                            setShowUserMenu(false);
                          }}
                          className="w-full text-left px-4 py-2 hover:bg-gray-100 text-gray-700 transition-colors"
                        >
                          Rider Dashboard
                        </button>
                      )}
                      <button onClick={() => { navigate("/orders") }} className="w-full text-left px-4 py-2 hover:bg-gray-100 text-gray-700 transition-colors">
                        My Orders
                      </button>

                      <button onClick={() => navigate("/wishlists")} className="md:hidden w-full text-left px-4 py-2 hover:bg-gray-100 text-gray-700 transition-colors">
                        My Wishlist
                      </button>
                      <hr className="my-2" />
                      <button
                        onClick={() => {
                          logout();
                          setShowUserMenu(false);
                          navigate('/');
                        }}
                        className="w-full text-left px-4 py-2 hover:bg-gray-100 text-[#FF3B30] transition-colors"
                      >
                        Logout
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => {
                          setShowLoginModal(true);
                          setShowUserMenu(false);
                        }}
                        className="w-full text-left px-4 py-2 hover:bg-gray-100 text-gray-700 transition-colors"
                      >
                        Login
                      </button>
                      <button
                        onClick={() => {
                          setShowSignupModal(true);
                          setShowUserMenu(false);
                        }}
                        className="w-full text-left px-4 py-2 hover:bg-gray-100 text-gray-700 transition-colors"
                      >
                        Sign Up
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Location Picker Modal */}
      {showLocationPicker && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900">Select Your Location</h3>
              <button
                onClick={() => setShowLocationPicker(false)}
                className="text-gray-500 hover:text-gray-700 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4 overflow-y-auto max-h-[calc(90vh-80px)]">
              <LocationPicker
                onLocationSelect={handleLocationSelect}
                initialPosition={
                  userLocation?.latitude && userLocation?.longitude && location !== 'Select Location'
                    ? [userLocation.latitude, userLocation.longitude]
                    : [20.5937, 78.9629] // Default to center of India
                }
                initialSearch={location !== 'Select Location' ? location : ''}
              />
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
