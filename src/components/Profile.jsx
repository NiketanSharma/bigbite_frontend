import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import LocationPicker from './LocationPicker';
import fallbackImg from '../assets/fallback.jpg';

const Profile = () => {
  const { user, checkAuth } = useAuth();
  const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:5000';
  const CLOUDINARY_UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
  const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    role: '',
    address: {
      street: '',
      city: '',
      state: '',
      zipCode: '',
      country: '',
      latitude: undefined,
      longitude: undefined,
    },
    restaurantDetails: {
      kitchenName: '',
      cuisine: [],
      description: '',
      address: {
        street: '',
        city: '',
        state: '',
        zipCode: '',
        country: '',
        latitude: undefined,
        longitude: undefined,
      },
    },
    riderDetails: {
      vehicleType: '',
      vehicleNumber: '',
      licenseNumber: '',
      aadharNumber: '',
      bankAccount: '',
      ifscCode: '',
    },
  });
  
  const [avatar, setAvatar] = useState('');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showUserAddressMap, setShowUserAddressMap] = useState(false);
  const [showRestaurantAddressMap, setShowRestaurantAddressMap] = useState(false);
  const fileInputRef = useRef(null);

  const availableCuisines = ['Indian', 'Chinese', 'Italian', 'Mexican', 'Thai', 'Japanese', 'French', 'Mediterranean', 'American', 'Korean', 'Middle Eastern', 'Continental'];

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        role: user.role || '',
        address: {
          street: user.address?.street || '',
          city: user.address?.city || '',
          state: user.address?.state || '',
          zipCode: user.address?.zipCode || '',
          country: user.address?.country || '',
          latitude: user.address?.latitude,
          longitude: user.address?.longitude,
        },
        restaurantDetails: {
          kitchenName: user.restaurantDetails?.kitchenName || '',
          cuisine: user.restaurantDetails?.cuisine || [],
          description: user.restaurantDetails?.description || '',
          address: {
            street: user.restaurantDetails?.address?.street || '',
            city: user.restaurantDetails?.address?.city || '',
            state: user.restaurantDetails?.address?.state || '',
            zipCode: user.restaurantDetails?.address?.zipCode || '',
            country: user.restaurantDetails?.address?.country || '',
            latitude: user.restaurantDetails?.address?.latitude,
            longitude: user.restaurantDetails?.address?.longitude,
          },
        },
        riderDetails: {
          vehicleType: user.riderDetails?.vehicleType || '',
          vehicleNumber: user.riderDetails?.vehicleNumber || '',
          licenseNumber: user.riderDetails?.licenseNumber || '',
          aadharNumber: user.riderDetails?.aadharNumber || '',
          bankAccount: user.riderDetails?.bankAccount || '',
          ifscCode: user.riderDetails?.ifscCode || '',
        },
      });
      setAvatar(user.avatar || '');
    }
  }, [user]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name.startsWith('address.')) {
      const addressField = name.split('.')[1];
      setFormData({
        ...formData,
        address: {
          ...formData.address,
          [addressField]: value,
        },
      });
    } else if (name.startsWith('riderDetails.')) {
      const riderField = name.split('.')[1];
      setFormData({
        ...formData,
        riderDetails: {
          ...formData.riderDetails,
          [riderField]: value,
        },
      });
    } else if (name.startsWith('restaurantDetails.')) {
      const parts = name.split('.');
      if (parts.length === 3 && parts[1] === 'address') {
        // Handle nested restaurant address
        setFormData({
          ...formData,
          restaurantDetails: {
            ...formData.restaurantDetails,
            address: {
              ...formData.restaurantDetails.address,
              [parts[2]]: value,
            },
          },
        });
      } else {
        // Handle top-level restaurant details
        setFormData({
          ...formData,
          restaurantDetails: {
            ...formData.restaurantDetails,
            [parts[1]]: value,
          },
        });
      }
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const toggleCuisine = (cuisine) => {
    const currentCuisines = formData.restaurantDetails.cuisine;
    const updatedCuisines = currentCuisines.includes(cuisine)
      ? currentCuisines.filter(c => c !== cuisine)
      : [...currentCuisines, cuisine];
    
    setFormData({
      ...formData,
      restaurantDetails: {
        ...formData.restaurantDetails,
        cuisine: updatedCuisines,
      },
    });
  };

  const handleUserAddressSelect = (addressData) => {
    console.log('📍 User Address Selected:', addressData);
    setFormData({
      ...formData,
      address: {
        street: addressData.street,
        city: addressData.city,
        state: addressData.state,
        zipCode: addressData.zipCode,
        country: addressData.country,
        latitude: addressData.latitude,
        longitude: addressData.longitude,
      },
    });
  };

  const handleRestaurantAddressSelect = (addressData) => {
    console.log('📍 Restaurant Address Selected:', addressData);
    setFormData({
      ...formData,
      restaurantDetails: {
        ...formData.restaurantDetails,
        address: {
          street: addressData.street,
          city: addressData.city,
          state: addressData.state,
          zipCode: addressData.zipCode,
          country: addressData.country,
          latitude: addressData.latitude,
          longitude: addressData.longitude,
        },
      },
    });
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size should be less than 5MB');
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

    try {
      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
        {
          method: 'POST',
          body: formData,
        }
      );

      const data = await response.json();
      if (data.secure_url) {
        setAvatar(data.secure_url);
        toast.success('Image uploaded successfully!');
      }
    } catch (error) {
      console.error('Image upload error:', error);
      toast.error('Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const dataToSend = {
        ...formData,
        avatar,
      };
      
      console.log('💾 Saving Profile Data:', {
        restaurantDetails: dataToSend.restaurantDetails,
        address: dataToSend.address,
      });

      const token = localStorage.getItem('bigbite_token');
      console.log('🔑 Token for Profile Update:', token ? `${token.substring(0, 20)}...` : 'No token');

      const response = await fetch(`${SERVER_URL}/api/auth/update-profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`, // Add Authorization header
        },
        credentials: 'include',
        body: JSON.stringify(dataToSend),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Profile updated successfully!');
        await checkAuth(); // Refresh user data
      } else {
        throw new Error(data.message || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Profile update error:', error);
      toast.error(error.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'customer':
        return 'bg-blue-100 text-blue-800';
      case 'restaurant':
        return 'bg-green-100 text-green-800';
      case 'rider':
        return 'bg-purple-100 text-purple-800';
      case 'admin':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-red-50 to-pink-50 pt-20 pb-12">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl shadow-2xl overflow-hidden"
        >
          
          <form onSubmit={handleSubmit} className="p-8 space-y-8">
            {/* Profile Picture Section - New Design */}
            <div>
              
              <div className="flex justify-center">
                <div className="relative group">
                  <div className="w-48 h-48 rounded-full  overflow-hidden border-4 border-gray-200 shadow-xl hover:shadow-2xl transition-all duration-300">
                    {avatar ? (
                      <img
                        src={avatar}
                        alt="Profile"
                        onError={(e) => {
                          e.target.src = fallbackImg;
                          e.target.onerror = null;
                        }}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-orange-100 to-red-100 text-gray-400">
                        <svg
                          className="w-16 h-16 mb-2"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                          />
                        </svg>
                        <span className="text-sm font-medium">No Image</span>
                      </div>
                    )}
                  </div>
                  
                  <span className='cursor-pointer bg-gradient-to-r from-orange-500 to-red-500 rounded-full absolute size-12 z-10 right-2 bottom-2 text-white text-3xl font-bold flex items-center justify-center shadow-lg hover:shadow-xl hover:scale-110 transition-all duration-300'>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleImageUpload}
                      accept="image/*"
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      className='text-3xl font-bold leading-none'
                    >
                      +
                    </button>
                  </span>
                  
                  {uploading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-2xl">
                      <div className="w-10 h-10 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Account Type Display (Read-only) */}
            <div className="bg-gradient-to-r flex justify-between from-gray-50 to-gray-100 p-6 rounded-2xl border-2 border-gray-200">
              <label className="text-lg font-bold text-gray-800 mb-3 flex items-center">
                
                Account Type
              </label>
              <div className="flex items-center space-x-3">
                <span className={`px-6 py-3 rounded-xl text-base font-bold shadow-md ${getRoleBadgeColor(formData.role)}`}>
                  {formData.role.charAt(0).toUpperCase() + formData.role.slice(1)}
                </span>
              </div>
            </div>

            {/* Basic Information */}
            <div>
              <div className="md:justify-start justify-center text-2xl font-bold text-gray-900 mb-6 flex items-center">
                
                <span>Personal Information</span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl bg-gray-50 cursor-not-allowed"
                  disabled
                />
                <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Phone Number
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition"
                  placeholder="+1 234 567 8900"
                />
              </div>
            </div>
          </div>

            {/* Address Section - Only for non-restaurant users */}
            {formData.role !== 'restaurant' && (
              <div className="space-y-6">
                <div className="md:justify-start justify-center text-2xl font-bold text-gray-900 mb-6 flex items-center border-b-2 border-gray-200 pb-3">
                  
                  <span>Address Information</span>
                </div>
                
                {/* Toggle Map Button */}
                <button
                  type="button"
                  onClick={() => setShowUserAddressMap(!showUserAddressMap)}
                  className="w-full px-6 py-3 bg-gradient-to-r from-red-500 to-yellow-500 text-white rounded-xl hover:from-red-600 hover:to-yellow-600 transition-all shadow-md hover:shadow-lg font-semibold flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
                    />
                  </svg>
                  {showUserAddressMap ? 'Hide Map' : 'Select Location on Map'}
                </button>

                {/* Map Component */}
                {showUserAddressMap && (
                  <div className="border-2 border-blue-300 rounded-xl p-4 bg-gradient-to-br from-blue-50 to-blue-100 shadow-inner">
                    <LocationPicker onLocationSelect={handleUserAddressSelect} />
                  </div>
                )}
                
                <div className="grid grid-cols-1 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Street Address
                    </label>
                    <input
                      type="text"
                      name="address.street"
                      value={formData.address.street}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition"
                      placeholder="123 Main Street"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        City
                      </label>
                      <input
                        type="text"
                        name="address.city"
                        value={formData.address.city}
                        onChange={handleChange}
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition"
                        placeholder="Mumbai"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        State
                      </label>
                      <input
                        type="text"
                        name="address.state"
                        value={formData.address.state}
                        onChange={handleChange}
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition"
                        placeholder="Maharashtra"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        ZIP Code
                      </label>
                      <input
                        type="text"
                        name="address.zipCode"
                        value={formData.address.zipCode}
                        onChange={handleChange}
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition"
                        placeholder="400001"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Country
                      </label>
                      <input
                        type="text"
                        name="address.country"
                        value={formData.address.country}
                        onChange={handleChange}
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition"
                        placeholder="India"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Rider Details - Only for Riders */}
            {formData.role === 'rider' && (
              <div className="space-y-6">
                <div className="md:justify-start justify-center text-2xl font-bold text-gray-900 mb-6 flex items-center border-b-2 border-gray-200 pb-3">
                  <svg className="w-7 h-7 mr-2 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <span>Rider Details</span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Vehicle Type
                    </label>
                    <select
                      name="riderDetails.vehicleType"
                      value={formData.riderDetails.vehicleType}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition"
                    >
                      <option value="">Select Vehicle Type</option>
                      <option value="bike">Bike</option>
                      <option value="scooter">Scooter</option>
                      <option value="bicycle">Bicycle</option>
                      <option value="car">Car</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Vehicle Number
                    </label>
                    <input
                      type="text"
                      name="riderDetails.vehicleNumber"
                      value={formData.riderDetails.vehicleNumber}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition"
                      placeholder="MH 12 AB 1234"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Driving License Number
                    </label>
                    <input
                      type="text"
                      name="riderDetails.licenseNumber"
                      value={formData.riderDetails.licenseNumber}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition"
                      placeholder="MH0120190012345"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Aadhar Number
                    </label>
                    <input
                      type="text"
                      name="riderDetails.aadharNumber"
                      value={formData.riderDetails.aadharNumber}
                      onChange={handleChange}
                      maxLength={12}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition"
                      placeholder="XXXX XXXX XXXX"
                    />
                  </div>
                </div>

                <div className="text-lg font-bold text-gray-800 mt-6 mb-4 flex items-center">
                  <svg className="w-6 h-6 mr-2 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                  <span>Bank Details</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Bank Account Number
                    </label>
                    <input
                      type="text"
                      name="riderDetails.bankAccount"
                      value={formData.riderDetails.bankAccount}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition"
                      placeholder="Account Number"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      IFSC Code
                    </label>
                    <input
                      type="text"
                      name="riderDetails.ifscCode"
                      value={formData.riderDetails.ifscCode}
                      onChange={handleChange}
                      maxLength={11}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition"
                      placeholder="SBIN0001234"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Restaurant/Kitchen Details - Only for Restaurant Owners */}
            {formData.role === 'restaurant' && (
              <div className="space-y-6">
                <div className="md:justify-start justify-center text-2xl font-bold text-gray-900 mb-6 flex items-center border-b-2 border-gray-200 pb-3">
                  <svg className="w-7 h-7 mr-2 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  <span>Kitchen/Restaurant Details</span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Kitchen/Restaurant Name
                    </label>
                    <input
                      type="text"
                      name="restaurantDetails.kitchenName"
                      value={formData.restaurantDetails.kitchenName}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition"
                      placeholder="Mumbai Spice Kitchen"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    Cuisine Types (Select one or more)
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {availableCuisines.map((cuisine) => (
                      <button
                        key={cuisine}
                        type="button"
                        onClick={() => toggleCuisine(cuisine)}
                        className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                          formData.restaurantDetails.cuisine.includes(cuisine)
                            ? 'bg-primary text-white shadow-md scale-105'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {formData.restaurantDetails.cuisine.includes(cuisine) && '✓ '}
                        {cuisine}
                      </button>
                    ))}
                  </div>
                  {formData.restaurantDetails.cuisine.length > 0 && (
                    <p className="text-sm text-gray-500 mt-2">
                      Selected: {formData.restaurantDetails.cuisine.join(', ')}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    name="restaurantDetails.description"
                    value={formData.restaurantDetails.description}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition"
                    placeholder="Brief description of your restaurant..."
                    rows="3"
                  />
                </div>

                <h4 className="text-md font-semibold text-gray-700 mt-4">Kitchen Address</h4>
                
                {/* Toggle Map Button for Restaurant Address */}
                <button
                  type="button"
                  onClick={() => setShowRestaurantAddressMap(!showRestaurantAddressMap)}
                  className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition font-semibold flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
                    />
                  </svg>
                  {showRestaurantAddressMap ? 'Hide Map' : 'Select Location on Map'}
                </button>

                {/* Map Component for Restaurant */}
                {showRestaurantAddressMap && (
                  <div className="border-2 border-blue-200 rounded-lg p-4 bg-blue-50">
                    <LocationPicker onLocationSelect={handleRestaurantAddressSelect} />
                  </div>
                )}
                
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Street Address
                  </label>
                  <input
                    type="text"
                    name="restaurantDetails.address.street"
                    value={formData.restaurantDetails.address.street}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition"
                    placeholder="456 Kitchen Street"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      City
                    </label>
                    <input
                      type="text"
                      name="restaurantDetails.address.city"
                      value={formData.restaurantDetails.address.city}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition"
                      placeholder="Mumbai"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      State
                    </label>
                    <input
                      type="text"
                      name="restaurantDetails.address.state"
                      value={formData.restaurantDetails.address.state}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition"
                      placeholder="Maharashtra"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      ZIP Code
                    </label>
                    <input
                      type="text"
                      name="restaurantDetails.address.zipCode"
                      value={formData.restaurantDetails.address.zipCode}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition"
                      placeholder="400001"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Country
                    </label>
                    <input
                      type="text"
                      name="restaurantDetails.address.country"
                      value={formData.restaurantDetails.address.country}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition"
                      placeholder="India"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row justify-end gap-4 pt-8 border-t-2 border-gray-200">
              <button
                type="button"
                onClick={() => window.history.back()}
                className="px-8 py-3 border-2 border-gray-300 rounded-xl text-gray-700 font-semibold hover:bg-gray-50 hover:border-gray-400 transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-8 py-3 bg-gradient-to-br from-red-500 to-yellow-500 text-white rounded-xl font-semibold hover:from-red-600 hover:to-yellow-600 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {saving ? (
                  <>
                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Saving...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </div>
  );
};

export default Profile;
