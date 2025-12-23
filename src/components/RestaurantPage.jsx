import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import locationpin from '../assets/location-pin.png';
import star from '../assets/star.png';
import fallbackImg from '../assets/fallback.jpg';

const RestaurantPage = () => {
  const { restaurantId, itemId } = useParams();
  const navigate = useNavigate();
  const { addToCart: addToGlobalCart, cart, clearCart, userLocation, calculateDistance } = useApp();
  const { user, setShowLoginModal } = useAuth();
  const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:5000';

  const [restaurant, setRestaurant] = useState(null);
  const [menuItems, setMenuItems] = useState([]);
  const [highlightedItem, setHighlightedItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showConflictModal, setShowConflictModal] = useState(false);
  const [pendingItem, setPendingItem] = useState(null);

  useEffect(() => {
    fetchRestaurantDetails();
  }, [restaurantId]);

  useEffect(() => {
    if (itemId && menuItems.length > 0) {
      const item = menuItems.find(i => i._id === itemId);
      setHighlightedItem(item);
    }
  }, [itemId, menuItems]);

  const fetchRestaurantDetails = async () => {
    try {
      // Fetch all restaurants and find the specific one
      const response = await fetch(`${SERVER_URL}/api/restaurant/all`);
      if (response.ok) {
        const data = await response.json();
        const foundRestaurant = data.data.find(r => r.id === restaurantId);
        if (foundRestaurant) {
          console.log('🍽️ Restaurant found:', foundRestaurant);
          
          let calculatedDistance = 'Select location for precise distance';
          let deliveryTime = '30-40 min';
          
          // Use userLocation from AppContext (same as RestaurantExplore)
          if (userLocation && userLocation.latitude && userLocation.longitude && 
              foundRestaurant.address?.latitude && foundRestaurant.address?.longitude) {
            
            const distanceKm = calculateDistance(
              userLocation.latitude,
              userLocation.longitude,
              foundRestaurant.address.latitude,
              foundRestaurant.address.longitude
            );
            calculatedDistance = `${distanceKm.toFixed(1)} km`;
            
            // Calculate delivery time: 20 min preparation + 1 min per km
            const travelTimeMin = Math.ceil(distanceKm );
            const totalTime = 20 + travelTimeMin;
            deliveryTime = `${totalTime}-${totalTime + 10} min`;
          }
          
          setRestaurant({
            ...foundRestaurant,
            distance: calculatedDistance,
            deliveryTime: deliveryTime
          });
          setMenuItems(foundRestaurant.menuItems || []);
        }
      }
    } catch (error) {
      console.error('Error fetching restaurant:', error);
      toast.error('Failed to load restaurant');
    } finally {
      setLoading(false);
    }
  };

  const addToCart = (item) => {
    console.log('🛒 Adding to cart:', { item, restaurant });
    
    // Check if user is logged in
    if (!user) {
      toast.error('Please login to add items to cart');
      setShowLoginModal(true);
      return;
    }
    
    // Check if cart has items from a different restaurant
    if (cart.length > 0) {
      const firstCartItem = cart[0];
      const cartRestaurantId = firstCartItem.restaurantId?._id || firstCartItem.restaurantId;
      
      console.log('🔍 Checking restaurant conflict:', {
        currentRestaurantId: restaurant?.id,
        cartRestaurantId: cartRestaurantId,
        cartLength: cart.length
      });
      
      if (cartRestaurantId && cartRestaurantId !== restaurant?.id) {
        // Different restaurant - show conflict modal
        console.log('⚠️ Different restaurant detected! Showing conflict modal.');
        setPendingItem(item);
        setShowConflictModal(true);
        return;
      }
    }
    
    // Same restaurant or empty cart - proceed with adding
    const itemWithRestaurant = {
      ...item,
      restaurantName: restaurant?.name,
      restaurantId: restaurant?.id  // This is actually _id from backend
    };
    
    console.log('📦 Item with restaurant:', itemWithRestaurant);
    addToGlobalCart(itemWithRestaurant);
    toast.success(`${item.name} added to cart!`);
  };
  
  const handleClearAndAdd = async () => {
    // Clear cart first and wait for it to complete
    await clearCart();
    
    // Then add the new item
    const itemWithRestaurant = {
      ...pendingItem,
      restaurantName: restaurant?.name,
      restaurantId: restaurant?.id
    };
    await addToGlobalCart(itemWithRestaurant);
    
    toast.success(`Cart cleared! ${pendingItem.name} added to cart!`);
    setShowConflictModal(false);
    setPendingItem(null);
  };
  
  const handleCancelConflict = () => {
    setShowConflictModal(false);
    setPendingItem(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen pt-20 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500"></div>
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="min-h-screen pt-20 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Restaurant not found</h2>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-red-600"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const MenuItemCard = ({ item, isHighlighted = false }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition w-80
      }`}
    >
      <div className="relative h-48 ">
        <img
          src={item.image}
          alt={item.name}
          onError={(e) => {
            e.target.src = fallbackImg;
            e.target.onerror = null;
          }}
          className="w-full h-full object-cover shadow-lg"
        />
        <div className="absolute top-2 right-2 flex gap-2">
          {item.isVeg ? (
            <span className="bg-green-500 text-white px-2 py-1 rounded text-xs">Veg</span>
          ) : (
            <span className="bg-red-500 text-white px-2 py-1 rounded text-xs">Non-Veg</span>
          )}
        </div>
      </div>

      <div className="p-4">
        <div className="flex justify-between items-start mb-2">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900">{item.name}</h3>
          </div>
          <span className="text-primary font-bold">₹{item.price}</span>
        </div>
        
        {/* Show restaurant rating on each item */}
        {restaurant.restaurantDetails?.rating?.count > 0 && (
          <div className="flex items-center gap-1 mb-2">
            <img className="size-4" src={star}/>
            <span className="font-semibold text-sm text-gray-900">
              {restaurant.restaurantDetails.rating.average.toFixed(1)}
            </span>
            <span className="text-xs text-gray-500">
              ({restaurant.restaurantDetails.rating.count} {restaurant.restaurantDetails.rating.count === 1 ? 'review' : 'reviews'})
            </span>
          </div>
        )}
        
        <p className="text-gray-600 text-sm mb-3 line-clamp-2">{item.description}</p>
        
        <div className="flex gap-2 mb-3 flex-wrap">
          <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs">{item.category}</span>
          <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs">{item.cuisine}</span>
          {item.subCategory && (
            <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded text-xs">{item.subCategory}</span>
          )}
        </div>

        <button
          onClick={() => addToCart(item)}
          className="w-full px-4 py-2 bg-primary text-white rounded-lg hover:bg-red-700 transition cursor-pointer"
        >
          Add to Cart
        </button>
      </div>
    </motion.div>
  );

  return (
    <div className="min-h-screen bg-gray-50 pt-20 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <button
            onClick={() => navigate('/')}
            className="hover:underline mb-1 text-gray-600 hover:text-primary flex items-center gap-2 cursor-pointer"
          >
            ← Back to Restaurants
          </button>
        {/* Restaurant Header */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
          
          
          <div className="flex flex-col md:flex-row items-start gap-6 md:gap-10 px-4 md:px-10">
            <img
              src={restaurant.avatar || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=200'}
              alt={restaurant.name}
              onError={(e) => {
                e.target.src = fallbackImg;
                e.target.onerror = null;
              }}
              className="w-44 h-44 md:w-44 md:h-44 rounded-full object-cover shadow-xl mx-auto hover:scale-108 transition-transform duration-300"
            />
            {console.log('🏠 Restaurant details:', restaurant)}
            
            <div className="flex-1 ">
              <div className="flex flex-col md:flex-row items-start justify-between">
                <div className='flex flex-col gap-3'>
                    <h1 className="text-center md:text-left text-2xl md:text-3xl font-bold text-gray-900 ">{restaurant.name}</h1>
                    {restaurant?.address && (
                      <div className='flex gap-1 items-center text-gray-600 font-medium'>
                        <img className="w-5 h-5 hidden md:inline" src={locationpin} alt="location"/>
                        <span className="text-sm">{restaurant.address?.street}</span>
                      </div>
                    )}

                    <div className="text-gray-600 flex gap-2 items-center">
                      <span className="font-medium">Cuisines -</span>
                      <span className="font-medium">{Array.isArray(restaurant.cuisine) ? restaurant.cuisine.join(', ') : restaurant.cuisine}</span>
                    </div>

                    <p className="text-gray-500 text-sm">{restaurant.description}</p>
                  </div>
                
                {/* Rating - Only show if restaurant has ratings */}
                {restaurant.restaurantDetails?.rating?.count > 0 && (
                  <div className="flex items-center gap-2 md:gap-0 md:flex-col my-1 ">
                    <div className="flex items-center rounded-lg">
                      <img src={star} className="w-4 h-4 mr-1" />
                      <span className="font-semibold text-green-600">
                        {restaurant.restaurantDetails.rating.average.toFixed(1)}
                      </span>
                    </div>
                    <span className="text-sm  text-green-500">
                      ({restaurant.restaurantDetails.rating.count} {restaurant.restaurantDetails.rating.count === 1 ? 'review' : 'reviews'})
                    </span>
                  </div>
                )}
              </div>

              <div className="mt-2  md:mt-2 flex flex-col md:flex-row items-start md:items-center justify-end gap-3 text-sm text-gray-600 font-medium">
                <span className="flex items-center gap-1">Just {restaurant.distance} Away</span>
                <span className="hidden md:inline">|</span>
                <span className="flex items-center gap-1">Average Delivery Time: {restaurant.deliveryTime}</span>
                
                {!restaurant.isKitchenOpen && (
                  <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full font-medium">
                    Closed
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Highlighted Item */}
        {highlightedItem && (
          <div className="mb-8 bg-slate-50 rounded-2xl py-6 shadow-xl px-6 flex flex-col">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Featured Item</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 place-items-center">
              <MenuItemCard item={highlightedItem} isHighlighted={true} />
            </div>
          </div>
        )}

        {/* More Items */}
        <div className='flex flex-col bg-slate-50 rounded-2xl py-6 shadow-xl'>
          <h2 className="text-2xl font-bold text-gray-900 mb-4 text-left w-full px-6">
            {highlightedItem ? 'More items from this restaurant' : 'Menu Items'}
          </h2>
          
          {menuItems.filter(item => item._id !== itemId).length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 place-items-center">
              {menuItems
                .filter(item => item._id !== itemId)
                .map((item) => (
                  <MenuItemCard key={item._id} item={item} />
                ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-12">No other items available</p>
          )}
        </div>

        {/* Cart Summary (Fixed Bottom) */}
        {cart.length > 0 && (
          <div className="fixed bottom-0 left-0 right-0 bg-white shadow-2xl border-t-1 border-gray-500 p-4 z-50">
            <div className="max-w-7xl mx-auto flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">{cart.reduce((sum, item) => sum + item.quantity, 0)} items</p>
                <p className="text-lg font-bold text-gray-900">
                  ₹{cart.reduce((sum, item) => {
                    const price = item.menuItem?.price || item.price || 0;
                    const quantity = item.quantity || 0;
                    return sum + (price * quantity);
                  }, 0).toFixed(2)}
                </p>
              </div>
              <button 
                onClick={() => navigate('/cart')}
                className="px-8 py-3 bg-primary text-white rounded-lg font-semibold hover:bg-red-600 transition"
              >
                View Cart
              </button>
            </div>
          </div>
        )}
        
        {/* Restaurant Conflict Modal */}
        <AnimatePresence>
          {showConflictModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
              onClick={handleCancelConflict}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white rounded-lg shadow-xl max-w-md w-full p-6"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Warning Icon */}
                <div className="flex items-center justify-center w-16 h-16 mx-auto bg-amber-100 rounded-full mb-4">
                  <svg className="w-8 h-8 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                
                {/* Modal Header */}
                <h2 className="text-2xl font-bold text-gray-900 text-center mb-2">
                  Items from Different Restaurant
                </h2>
                
                {/* Modal Message */}
                <p className="text-gray-600 text-center mb-6">
                  Your cart contains items from a different restaurant. You can only order from one restaurant at a time.
                </p>
                
                {/* Current Cart Info */}
                {cart.length > 0 && (
                  <div className="bg-gray-50 rounded-lg p-3 mb-6">
                    <p className="text-sm text-gray-600 mb-1">Current cart:</p>
                    <p className="font-semibold text-gray-900">
                      {cart[0].restaurantId?.restaurantDetails?.kitchenName || cart[0].restaurantName}
                    </p>
                    <p className="text-sm text-gray-500">{cart.length} item{cart.length > 1 ? 's' : ''}</p>
                  </div>
                )}
                
                {/* Action Buttons */}
                <div className="space-y-3">
                  <button
                    onClick={handleClearAndAdd}
                    className="w-full px-6 py-3 bg-primary text-white rounded-lg font-semibold hover:bg-red-600 transition-colors"
                  >
                    Clear Cart & Add Item
                  </button>
                  <button
                    onClick={handleCancelConflict}
                    className="w-full px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default RestaurantPage;
