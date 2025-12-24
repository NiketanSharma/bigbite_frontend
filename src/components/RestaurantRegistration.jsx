import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import LocationPicker from './LocationPicker';

const RestaurantRegistration = () => {
  const { user, checkAuth, setShowLoginModal } = useAuth();
  const navigate = useNavigate();
  const SERVER_URL = import.meta.env.VITE_SERVER_URL ;
  const CLOUDINARY_UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
  const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;

  const [formData, setFormData] = useState({
    restaurantDetails: {
      kitchenName: '',
      cuisine: [],
      description: '',
      foodType: 'veg-nonveg',
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
  });

  const [avatar, setAvatar] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const fileInputRef = useRef(null);

  const availableCuisines = [
    'Indian',
    'Chinese',
    'Italian',
    'Mexican',
    'Thai',
    'Japanese',
    'French',
    'Mediterranean',
    'American',
    'Korean',
    'Middle Eastern',
    'Continental',
  ];

  // Redirect if already a restaurant owner
  useEffect(() => {
    if (user && user.role === 'restaurant') {
      navigate('/restaurant-dashboard');
    }
  }, [user, navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name.startsWith('restaurantDetails.')) {
      const parts = name.split('.');
      if (parts.length === 3 && parts[1] === 'address') {
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
        setFormData({
          ...formData,
          restaurantDetails: {
            ...formData.restaurantDetails,
            [parts[1]]: value,
          },
        });
      }
    }
  };

  const toggleCuisine = (cuisine) => {
    const currentCuisines = formData.restaurantDetails.cuisine;
    if (currentCuisines.includes(cuisine)) {
      setFormData({
        ...formData,
        restaurantDetails: {
          ...formData.restaurantDetails,
          cuisine: currentCuisines.filter((c) => c !== cuisine),
        },
      });
    } else {
      setFormData({
        ...formData,
        restaurantDetails: {
          ...formData.restaurantDetails,
          cuisine: [...currentCuisines, cuisine],
        },
      });
    }
  };

  const handleLocationSelect = (addressData) => {
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

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size should be less than 5MB');
      return;
    }

    // Store the file and create a preview
    setImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result);
    };
    reader.readAsDataURL(file);
    toast.success('Image selected! It will be uploaded when you submit the form.');
  };

  const uploadImageToCloudinary = async (file) => {
    const formDataImage = new FormData();
    formDataImage.append('file', file);
    formDataImage.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

    try {
      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
        {
          method: 'POST',
          body: formDataImage,
        }
      );

      const data = await response.json();
      return data.secure_url;
    } catch (error) {
      console.error('Error uploading image:', error);
      throw error;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (!formData.restaurantDetails.kitchenName.trim()) {
      toast.error('Please enter your restaurant name');
      return;
    }

    if (formData.restaurantDetails.cuisine.length === 0) {
      toast.error('Please select at least one cuisine');
      return;
    }

    if (!formData.restaurantDetails.description.trim()) {
      toast.error('Please enter a restaurant description');
      return;
    }

    if (!imageFile) {
      toast.error('Please select a restaurant image');
      return;
    }

    setSubmitting(true);

    try {
      // Upload image to Cloudinary first
      toast.loading('Uploading image...');
      const uploadedImageUrl = await uploadImageToCloudinary(imageFile);
      toast.dismiss();
      
      // Then update the profile with the image URL
      const response = await fetch(`${SERVER_URL}/api/auth/update-profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          role: 'restaurant',
          avatar: uploadedImageUrl,
          restaurantDetails: formData.restaurantDetails,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Restaurant registered successfully!');
        await checkAuth();
        navigate('/restaurant-dashboard');
      } else {
        toast.error(data.message || 'Failed to register restaurant');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('An error occurred. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Show login prompt if user is not logged in
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center"
        >
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg
              className="w-10 h-10 text-primary"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Login Required</h2>
          <p className="text-gray-600 mb-6">
            Please login to register your restaurant with BigBite
          </p>
          <button
            onClick={() => {
              setShowLoginModal(true);
              navigate('/');
            }}
            className="w-full bg-primary text-white py-3 rounded-lg font-semibold hover:bg-red-600 transition"
          >
            Login Now
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 py-12 px-4 pt-20">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-4xl mx-auto"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-3">
            Register Your Restaurant
          </h1>
          <p className="text-lg text-gray-600">
            Join <span className="text-primary font-semibold">BigBite</span> and grow your
            business
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Restaurant Image Upload */}
            <div>
        
              <div className="flex flex-col justify-center md:justify-around md:flex-row items-center gap-6">
                <div className="relative hover:shadow-xl transition-shadow rounded-full">
                  <div className="w-44 h-44  overflow-hidden border-4 rounded-full border-gray-200 shadow-lg">
                    {imagePreview ? (
                      <img
                        src={imagePreview}
                        alt="Restaurant"
                        className="w-full h-full object-cover "
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-400">
                        <svg
                          className="w-12 h-12"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                          />
                        </svg>
                      </div>
                    )}
                    
                  </div>
                  <span className='cursor-pointer bg-red-500 rounded-full absolute size-10 z-10 right-1 bottom-1 text-white text-2xl font-bold flex items-center justify-center'>
                  
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
                    disabled={submitting}
                    className='text-2xl font-bold'
                    >
                    +
                  </button>
        
                  {/* {imageFile && (
                    <p className="text-xs text-green-600 mt-1">
                      ✓ Image ready to upload
                    </p>
                  )} */}
                  </span>
                  {submitting && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-xl">
                      <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  )}
                </div>
                
              </div>
            </div>

            {/* Restaurant Details */}
            <div>
              <div className=" md:justify-start justify-center  text-2xl font-bold text-gray-900 mb-6 flex items-center justify-center">
                <span>Restaurant Details</span>
                
              </div>

              <div className="space-y-6">
                {/* Restaurant Name */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Restaurant Name *
                  </label>
                  <input
                    type="text"
                    name="restaurantDetails.kitchenName"
                    value={formData.restaurantDetails.kitchenName}
                    onChange={handleChange}
                    placeholder="e.g Spice Garden Restaurant"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition"
                    required
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Description *
                  </label>
                  <textarea
                    name="restaurantDetails.description"
                    value={formData.restaurantDetails.description}
                    onChange={handleChange}
                    placeholder="Tell customers about your restaurant..."
                    rows="4"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition resize-none"
                    required
                  />
                </div>

                {/* Food Type Selection */}
                <div className='hidden'>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    Food Type *
                  </label>
                  <div className="flex gap-4">
                    <button
                      type="button"
                      onClick={() => setFormData({
                        ...formData,
                        restaurantDetails: {
                          ...formData.restaurantDetails,
                          foodType: 'vegetarian'
                        }
                      })}
                      className={`flex-1 px-6 py-4 rounded-lg font-medium transition-all border-2 ${
                        formData.restaurantDetails.foodType === 'vegetarian'
                          ? 'bg-green-500 text-white border-green-500 shadow-lg scale-105'
                          : 'bg-white text-gray-700 border-gray-300 hover:border-green-500'
                      }`}
                    >
                      <span className="text-2xl mb-2 block">🌱</span>
                      Vegetarian
                    </button>

                    <button
                      type="button"
                      onClick={() => setFormData({
                        ...formData,
                        restaurantDetails: {
                          ...formData.restaurantDetails,
                          foodType: 'non-vegetarian'
                        }
                      })}
                      className={`flex-1 px-6 py-4 rounded-lg font-medium transition-all border-2 ${
                        formData.restaurantDetails.foodType === 'non-vegetarian'
                          ? 'bg-red-500 text-white border-red-500 shadow-lg scale-105'
                          : 'bg-white text-gray-700 border-gray-300 hover:border-red-500'
                      }`}
                    >
                      <span className="text-2xl mb-2 block">🍖</span>
                      Non-Vegetarian
                    </button>

                    <button
                      type="button"
                      onClick={() => setFormData({
                        ...formData,
                        restaurantDetails: {
                          ...formData.restaurantDetails,
                          foodType: 'veg-nonveg'
                        }
                      })}
                      className={`flex-1 px-6 py-4 rounded-lg font-medium transition-all border-2 ${
                        formData.restaurantDetails.foodType === 'veg-nonveg'
                          ? 'bg-orange-500 text-white border-orange-500 shadow-lg scale-105'
                          : 'bg-white text-gray-700 border-gray-300 hover:border-orange-500'
                      }`}
                    >
                      <span className="text-2xl mb-2 block">🌱🍖</span>
                      Both
                    </button>
                  </div>
                </div>

                {/* Cuisine Selection */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    Cuisines * (Select all that apply)
                  </label>
                  <div className="flex flex-wrap gap-3">
                    {availableCuisines.map((cuisine) => (
                      <button
                        key={cuisine}
                        type="button"
                        onClick={() => toggleCuisine(cuisine)}
                        className={`px-4 py-2 rounded-full font-medium transition-all ${
                          formData.restaurantDetails.cuisine.includes(cuisine)
                            ? 'bg-blue-500 text-white shadow-md scale-105'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {formData.restaurantDetails.cuisine.includes(cuisine) && '✓ '}
                        {cuisine}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Restaurant Address */}
            <div>
              <div className=" text-2xl font-bold text-gray-900 mb-6 flex items-center md:justify-start justify-center">
                <span>Restaurant Address</span>
                
              </div>

              <div className="space-y-6">
                {/* Toggle Map Button */}
                <button
                  type="button"
                  onClick={() => setShowMap(!showMap)}
                  className="w-full px-4 py-3 bg-gradient-to-r from-red-500 to-yellow-500 text-white rounded-lg hover:from-red-600 hover:to-yellow-600 transition font-semibold flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
                    />
                  </svg>
                  {showMap ? 'Hide Map' : 'Select Location on Map'}
                </button>

                {/* Map Component */}
                {showMap && (
                  <div className="border-2 border-blue-200 rounded-lg p-4 bg-blue-50">
                    <LocationPicker onLocationSelect={handleLocationSelect} />
                  </div>
                )}

                {/* Address Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Street Address *
                    </label>
                    <input
                      type="text"
                      name="restaurantDetails.address.street"
                      value={formData.restaurantDetails.address.street}
                      onChange={handleChange}
                      placeholder="123 Main Street"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      City *
                    </label>
                    <input
                      type="text"
                      name="restaurantDetails.address.city"
                      value={formData.restaurantDetails.address.city}
                      onChange={handleChange}
                      placeholder="New York"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      State/Province *
                    </label>
                    <input
                      type="text"
                      name="restaurantDetails.address.state"
                      value={formData.restaurantDetails.address.state}
                      onChange={handleChange}
                      placeholder="NY"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      ZIP/Postal Code *
                    </label>
                    <input
                      type="text"
                      name="restaurantDetails.address.zipCode"
                      value={formData.restaurantDetails.address.zipCode}
                      onChange={handleChange}
                      placeholder="10001"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Country *
                    </label>
                    <input
                      type="text"
                      name="restaurantDetails.address.country"
                      value={formData.restaurantDetails.address.country}
                      onChange={handleChange}
                      placeholder="United States"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition"
                      required
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => navigate('/')}
                className="flex-1 px-6 py-4 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 px-6 py-4 bg-primary text-white rounded-lg font-semibold hover:bg-red-600 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
              >
                {submitting ? (
                  <span className="flex items-center justify-center">
                    <svg
                      className="animate-spin h-5 w-5 mr-3"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Registering...
                  </span>
                ) : (
                  'Complete Registration'
                )}
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
};

export default RestaurantRegistration;
