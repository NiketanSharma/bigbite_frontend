import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import LocationPicker from './LocationPicker';

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

      const response = await fetch(`${SERVER_URL}/api/auth/update-profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
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
    <div className="min-h-screen bg-gray-50 pt-20 pb-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-lg overflow-hidden"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-primary to-secondary p-6 text-white">
            <h1 className="text-3xl font-bold">My Profile</h1>
            <p className="text-white/90 mt-1">Manage your account settings</p>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Profile Picture Section */}
            <div className="flex items-center space-x-6">
              <div className="relative">
                <div className="w-24 h-24 rounded-full overflow-hidden bg-gray-200 border-4 border-white shadow-lg">
                  {avatar ? (
                    <img
                      src={avatar}
                      alt="Profile"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-primary text-white text-3xl font-bold">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                {uploading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full">
                    <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
                  </div>
                )}
              </div>
              <div>
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
                  className="px-4 py-2 bg-primary text-white rounded-lg bg-red-500 hover:bg-red-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {uploading ? 'Uploading...' : 'Change Photo'}
                </button>
                <p className="text-sm text-gray-500 mt-2">
                  JPG, PNG or GIF. Max size 5MB
                </p>
              </div>
            </div>

            {/* Account Type Display (Read-only) */}
            <div className="space-y-3">
              <label className="block text-sm font-semibold text-gray-700">
                Account Type
              </label>
              <div className="flex items-center space-x-3">
                <span className={`px-4 py-2 rounded-lg text-sm font-semibold ${getRoleBadgeColor(formData.role)}`}>
                  {formData.role.charAt(0).toUpperCase() + formData.role.slice(1)}
                </span>
              </div>
              <p className="text-xs text-gray-500">
                Account type cannot be changed from profile. Contact support if needed.
              </p>
            </div>

            {/* Basic Information */}
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
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition"
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
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 cursor-not-allowed"
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
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition"
                  placeholder="+1 234 567 8900"
                />
              </div>
            </div>

            {/* Address Section - Only for non-restaurant users */}
            {formData.role !== 'restaurant' && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">
                  Address Information
                </h3>
                
                {/* Toggle Map Button */}
                <button
                  type="button"
                  onClick={() => setShowUserAddressMap(!showUserAddressMap)}
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
                  {showUserAddressMap ? 'Hide Map' : 'Select Location on Map'}
                </button>

                {/* Map Component */}
                {showUserAddressMap && (
                  <div className="border-2 border-blue-200 rounded-lg p-4 bg-blue-50">
                    <LocationPicker onLocationSelect={handleUserAddressSelect} />
                  </div>
                )}
                
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Street Address
                    </label>
                    <input
                      type="text"
                      name="address.street"
                      value={formData.address.street}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition"
                      placeholder="123 Main Street"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        City
                      </label>
                      <input
                        type="text"
                        name="address.city"
                        value={formData.address.city}
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
                        name="address.state"
                        value={formData.address.state}
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
                        name="address.zipCode"
                        value={formData.address.zipCode}
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
                        name="address.country"
                        value={formData.address.country}
                        onChange={handleChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition"
                        placeholder="India"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Rider Details - Only for Riders */}
            {formData.role === 'rider' && (
              <div className="space-y-4 mt-6">
                <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">
                  Rider Details
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Vehicle Type
                    </label>
                    <select
                      name="riderDetails.vehicleType"
                      value={formData.riderDetails.vehicleType}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition"
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
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition"
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
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition"
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
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition"
                      placeholder="XXXX XXXX XXXX"
                    />
                  </div>
                </div>

                <h4 className="text-md font-semibold text-gray-800 mt-4 border-b pb-2">
                  Bank Details
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Bank Account Number
                    </label>
                    <input
                      type="text"
                      name="riderDetails.bankAccount"
                      value={formData.riderDetails.bankAccount}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition"
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
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition"
                      placeholder="SBIN0001234"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Restaurant/Kitchen Details - Only for Restaurant Owners */}
            {formData.role === 'restaurant' && (
              <div className="space-y-4 mt-6">
                <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">
                  Kitchen/Restaurant Details
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            <div className="flex justify-end space-x-4 pt-6 border-t">
              <button
                type="button"
                onClick={() => window.history.back()}
                className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-3 bg-primary text-white rounded-lg bg-green-500 hover:bg-green-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </div>
  );
};

export default Profile;
