import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import axios from 'axios';
import api from '../services/api';
import heart from '../assets/heart.png'
import { encryptPaymentData } from '../utils/encryption';

const WishlistManager = () => {
  const { user, loading: authLoading } = useAuth();
  const { calculateDistance, userLocation } = useApp();
  const navigate = useNavigate();
  const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:5000';

  const [wishlists, setWishlists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedWishlist, setSelectedWishlist] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingName, setEditingName] = useState('');
  const [checkoutWishlist, setCheckoutWishlist] = useState(null);
  const [deliveryInstructions, setDeliveryInstructions] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cod');

  const PLATFORM_FEE = 5;
  const GST_RATE = 0.05;
  const DELIVERY_FEE_PER_KM = 8;
  const FREE_DELIVERY_THRESHOLD = 500;

  useEffect(() => {
    // Wait for auth to finish loading
    if (authLoading) return;

    if (user) {
      fetchWishlists();
    } else {
      navigate('/');
    }
  }, [user, authLoading]);

  const fetchWishlists = async () => {
    try {
      setLoading(true);
      const response = await api.getWishlists();

      if (response.success) {
        setWishlists(response.wishlists);
      } else {
        console.warn('Wishlists response not successful:', response);
        setWishlists([]);
      }
    } catch (error) {
      console.error('Error fetching wishlists:', error);

      // Handle authentication errors
      if (error.message === 'Authentication required. Please log in again.' ||
        error.response?.status === 401) {
        console.log('Token is invalid or expired, redirecting to login');
        localStorage.removeItem('bigbite_token');
        navigate('/');
        toast.error('Session expired. Please log in again.');
      } else {
        toast.error('Failed to fetch wishlists');
        setWishlists([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEditName = async () => {
    if (!editingName.trim()) {
      toast.error('Please enter a name');
      return;
    }

    try {
      const token = localStorage.getItem('bigbite_token');
      const response = await axios.patch(
        `${SERVER_URL}/api/wishlist/${selectedWishlist._id}/name`,
        { name: editingName },
        { 
          withCredentials: true,
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (response.data.success) {
        toast.success('Wishlist name updated');
        fetchWishlists();
        setShowEditModal(false);
        setSelectedWishlist(null);
      }
    } catch (error) {
      console.error('Error updating name:', error);
      toast.error(error.response?.data?.message || 'Failed to update name');
    }
  };

  const handleDeleteWishlist = async (wishlistId) => {
    if (!confirm('Are you sure you want to delete this wishlist?')) return;

    try {
      const token = localStorage.getItem('bigbite_token');
      const response = await axios.delete(
        `${SERVER_URL}/api/wishlist/${wishlistId}`,
        { 
          withCredentials: true,
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (response.data.success) {
        toast.success('Wishlist deleted');
        fetchWishlists();
      }
    } catch (error) {
      console.error('Error deleting wishlist:', error);
      toast.error(error.response?.data?.message || 'Failed to delete wishlist');
    }
  };

  const handleDeleteItem = async (wishlistId, itemId) => {
    try {
      const token = localStorage.getItem('bigbite_token');
      const response = await axios.delete(
        `${SERVER_URL}/api/wishlist/${wishlistId}/items/${itemId}`,
        { 
          withCredentials: true,
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (response.data.success) {
        toast.success('Item removed');
        fetchWishlists();
      }
    } catch (error) {
      console.error('Error removing item:', error);
      toast.error(error.response?.data?.message || 'Failed to remove item');
    }
  };

  const handleUpdateQuantity = async (wishlistId, itemId, newQuantity) => {
    if (newQuantity < 1) return;

    try {
      const token = localStorage.getItem('bigbite_token');
      const response = await axios.patch(
        `${SERVER_URL}/api/wishlist/${wishlistId}/items/${itemId}`,
        { quantity: newQuantity },
        { 
          withCredentials: true,
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (response.data.success) {
        fetchWishlists();
      }
    } catch (error) {
      console.error('Error updating quantity:', error);
      toast.error(error.response?.data?.message || 'Failed to update quantity');
    }
  };

  const handleCheckout = async (wishlist) => {
    // Validate restaurant is open
    const isKitchenOpen = wishlist.restaurant?.restaurantDetails?.isKitchenOpen ?? true;

    if (!isKitchenOpen) {
      toast.error('This restaurant is currently closed and not accepting orders.');
      return;
    }

    // Validate distance (25km check)
    if (!user?.address?.latitude || !user?.address?.longitude) {
      toast.error('Please set your delivery address in profile');
      return;
    }

    const restaurantAddress = wishlist.restaurant?.restaurantDetails?.address;

    if (!restaurantAddress?.latitude || !restaurantAddress?.longitude) {
      toast.error('Restaurant location not available');
      return;
    }

    const distance = calculateDistance(
      user.address.latitude,
      user.address.longitude,
      restaurantAddress.latitude,
      restaurantAddress.longitude
    );

    if (distance > 25) {
      toast.error(
        `Your location is ${distance.toFixed(1)}km away from the restaurant. We only deliver within 25km radius.`,
        { duration: 5000 }
      );
      return;
    }

    // Show checkout modal
    setCheckoutWishlist(wishlist);
  };

  const handleOnlinePayment = async (orderData) => {
    try {
      toast.loading('Preparing payment...', { id: 'payment' });

      // First, create a pending order in database to get order ID
      const pendingOrderResponse = await api.createPendingOrder(orderData);

      if (!pendingOrderResponse.success) {
        throw new Error('Failed to create order');
      }

      const orderId = pendingOrderResponse.order._id;
      const totalAmount = orderData.pricing.totalAmount;

      toast.dismiss('payment');

      // Store order data temporarily in sessionStorage for return
      sessionStorage.setItem('pendingOrder', JSON.stringify({
        orderId,
        totalAmount,
        orderData
      }));

      // COMPLIANCE: Redirect to approved Razorpay website
      const approvedSiteUrl = 'https://bharat-kumar-19030.github.io/Learno-Hub/payment.html';
      const returnUrl = window.location.origin + '/payment-callback';
      
      // Encrypt payment data to prevent URL tampering
      const paymentData = {
        amount: totalAmount,
        ref: orderId,
        returnUrl: returnUrl,
        timestamp: Date.now()
      };
      
      const encryptedData = await encryptPaymentData(paymentData);
      const redirectUrl = `${approvedSiteUrl}?data=${encodeURIComponent(encryptedData)}`;

      console.log('🔄 Redirecting to approved payment site with encrypted data');
      
      // Redirect to approved website (Razorpay checkout will open there)
      window.location.href = redirectUrl;

    } catch (error) {
      console.error('Error in online payment:', error);
      toast.error(error.message || 'Payment initialization failed', {
        id: 'payment',
      });
    }
  };

  const handlePlaceOrder = async () => {
    if (!checkoutWishlist) return;

    try {
      // Calculate pricing
      const subtotal = checkoutWishlist.items.reduce((total, item) => {
        return total + (item.price * item.quantity);
      }, 0);

      const restaurantAddress = checkoutWishlist.restaurant?.restaurantDetails?.address;
      const distance = calculateDistance(
        user.address.latitude,
        user.address.longitude,
        restaurantAddress.latitude,
        restaurantAddress.longitude
      );

      const calculatedDeliveryFee = Math.ceil(distance * DELIVERY_FEE_PER_KM);
      const deliveryFee = subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : calculatedDeliveryFee;
      const gst = subtotal * GST_RATE;
      const total = subtotal + deliveryFee + PLATFORM_FEE + gst;

      const orderData = {
        customerId: user.id,
        restaurantId: checkoutWishlist.restaurant._id,
        items: checkoutWishlist.items.map(item => ({
          menuItem: item.menuItem._id || item.menuItem,
          name: item.name,
          price: item.price,
          quantity: item.quantity
        })),
        deliveryAddress: {
          fullAddress: `${user.address.street}, ${user.address.city}, ${user.address.state} - ${user.address.zipCode}`,
          latitude: user.address.latitude,
          longitude: user.address.longitude,
          instructions: deliveryInstructions || ''
        },
        paymentMethod,
        pricing: {
          subtotal,
          deliveryFee,
          platformFee: PLATFORM_FEE,
          gst,
          totalAmount: total
        }
      };

      // Handle online payment separately
      if (paymentMethod === 'online') {
        await handleOnlinePayment(orderData);
        return;
      }

      // Handle COD payment
      toast.loading('Placing your order...', { id: 'wishlist-order' });

      const token = localStorage.getItem('bigbite_token');
      const response = await axios.post(
        `${SERVER_URL}/api/orders`,
        orderData,
        { 
          withCredentials: true,
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (response.data.success) {
        toast.success('Order placed successfully! 🎉', { id: 'wishlist-order' });
        setCheckoutWishlist(null);
        setDeliveryInstructions('');
        navigate(`/track-order/${response.data.order._id}`);
      }
    } catch (error) {
      console.error('Error placing order:', error);
      toast.error(error.response?.data?.message || 'Failed to place order', { id: 'wishlist-order' });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 pt-20 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-20 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 ">My Wishlist</h1>
          <p className="text-gray-600 mt-2 poppins-regular">Save your favorite orders for later</p>
        </div>

        {/* Wishlists Grid */}
        {wishlists.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center flex flex-col items-center">
            <img src={heart} className="size-40 animate-bounce" style={{ animationIterationCount: 1.5 }} />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">No Wishlists Yet</h2>
            <p className="text-gray-600 mb-4">Add items to your cart and save them as a wishlist</p>
            <button
              onClick={() => navigate('/')}
              className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-red-600 cursor-pointer"
            >
              Start Shopping
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 ">
            {wishlists.map((wishlist) => (
              <motion.div
                key={wishlist._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition m-2 flex flex-col justify-between"
              >
                {/* Wishlist Header */}
                <div className="p-4 bg-gradient-to-r from-orange-500 to-red-500">
                  <h3 className="text-xl font-bold text-white mb-1">{wishlist.name}</h3>
                  <p className="text-white/90 text-sm">
                    {wishlist.restaurant?.restaurantDetails?.kitchenName}
                  </p>
                </div>

                {/* Items */}
                <div className="p-4 max-h-64 overflow-y-auto">
                  {wishlist.items.map((item) => (
                    <div key={item._id} className="flex items-center justify-between mb-3 pb-3 border-b last:border-0 border-gray-200">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{item.name}</p>
                        <p className="text-sm text-gray-600">₹{item.price} × {item.quantity}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleUpdateQuantity(wishlist._id, item._id, item.quantity - 1)}
                          className="font-bold w-6 h-6 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center"
                        ><span>-</span>

                        </button>
                        <span className="w-8 text-center">{item.quantity}</span>
                        <button
                          onClick={() => handleUpdateQuantity(wishlist._id, item._id, item.quantity + 1)}
                          className="font-bold w-6 h-6 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center"
                        ><span>+</span>

                        </button>
                        <button
                          onClick={() => handleDeleteItem(wishlist._id, item._id)}
                          className="ml-2 text-red-500 hover:text-red-700"
                        >
                          <lord-icon
                            src="https://cdn.lordicon.com/jzinekkv.json"
                            trigger="hover"
                            stroke="bold"
                            colors="primary:#e83a30,secondary:#e83a30"
                            className='size-7'
                          >
                          </lord-icon>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Total */}
                <div className="px-4 py-3 bg-gray-50 border-t border-gray-400">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-semibold text-gray-900">Total:</span>
                    <span className="font-bold text-lg text-gray-900">
                      ₹{wishlist.items.reduce((sum, item) => sum + (item.price * item.quantity), 0)}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500">
                    {wishlist.items.length} item{wishlist.items.length !== 1 ? 's' : ''}
                  </div>
                </div>

                {/* Actions */}
                <div className="p-4 flex gap-2">
                  <button
                    onClick={() => handleCheckout(wishlist)}
                    className=" cursor-pointer   flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 hover:shadow-lg font-medium"
                  >
                    Order Now
                  </button>
                  <button
                    onClick={() => {
                      setSelectedWishlist(wishlist);
                      setEditingName(wishlist.name);
                      setShowEditModal(true);
                    }}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                  >
                    <lord-icon
                      src="https://cdn.lordicon.com/exymduqj.json"
                      trigger="hover"
                      stroke="bold"
                      state="hover-line"
                      colors="primary:#e83a30,secondary:#e83a30"
                      className='size-7'>
                    </lord-icon>
                  </button>
                  <button
                    onClick={() => handleDeleteWishlist(wishlist._id)}
                    className="px-4 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200"
                  >
                    <lord-icon
                      src="https://cdn.lordicon.com/jzinekkv.json"
                      trigger="hover"
                      stroke="bold"
                      colors="primary:#e83a30,secondary:#e83a30"
                      className='size-7'
                    >
                    </lord-icon>
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Edit Name Modal */}
        <AnimatePresence>
          {showEditModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
              onClick={() => setShowEditModal(false)}
            >
              <motion.div
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.9 }}
                className="bg-white rounded-lg p-6 max-w-md w-full"
                onClick={(e) => e.stopPropagation()}
              >
                <h3 className="text-xl font-bold mb-4">Edit Wishlist Name</h3>
                <input
                  type="text"
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg mb-4"
                  placeholder="Enter wishlist name"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleEditName}
                    className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-red-600"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setShowEditModal(false)}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Checkout Modal */}
        <AnimatePresence>
          {checkoutWishlist && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
              onClick={() => setCheckoutWishlist(null)}
            >
              <motion.div
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.9 }}
                className="bg-white rounded-lg p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <h3 className="text-2xl font-bold mb-4">Confirm Order</h3>

                {/* Items Summary */}
                <div className="mb-4">
                  <h4 className="font-semibold mb-2">Items:</h4>
                  {checkoutWishlist.items.map((item) => (
                    <div key={item._id} className="flex justify-between text-sm mb-1">
                      <span>{item.name} × {item.quantity}</span>
                      <span>₹{item.price * item.quantity}</span>
                    </div>
                  ))}
                </div>

                {/* Delivery Instructions */}
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-1">Delivery Instructions (Optional)</label>
                  <textarea
                    value={deliveryInstructions}
                    onChange={(e) => setDeliveryInstructions(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg"
                    rows="2"
                    placeholder="Any special instructions?"
                  />
                </div>

                {/* Payment Method */}
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2">Payment Method</label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPaymentMethod('cod')}
                      className={`flex-1 px-4 py-2 rounded-lg border-2 ${paymentMethod === 'cod'
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-gray-300'
                        }`}
                    >
                      Cash on Delivery
                    </button>
                    <button
                      onClick={() => setPaymentMethod('online')}
                      className={`flex-1 px-4 py-2 rounded-lg border-2 ${paymentMethod === 'online'
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-gray-300'
                        }`}
                    >
                      Online Payment
                    </button>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 mt-6">
                  <button
                    onClick={handlePlaceOrder}
                    className="flex-1 px-6 py-3 bg-primary text-white rounded-lg hover:bg-red-600 font-semibold"
                  >
                    Place Order
                  </button>
                  <button
                    onClick={() => setCheckoutWishlist(null)}
                    className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
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

export default WishlistManager;
