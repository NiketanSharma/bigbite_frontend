import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';
import axios from 'axios';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default marker icons in react-leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom icons for different markers
const restaurantIcon = new L.Icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/685/685352.png',
  iconSize: [35, 35],
  iconAnchor: [17, 35],
  popupAnchor: [0, -35],
});

const deliveryIcon = new L.Icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/684/684908.png',
  iconSize: [35, 35],
  iconAnchor: [17, 35],
  popupAnchor: [0, -35],
});

const riderIcon = new L.Icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/3448/3448339.png',
  iconSize: [40, 40],
  iconAnchor: [20, 40],
  popupAnchor: [0, -40],
});

// Component to update map view
const MapUpdater = ({ center }) => { // this function does the panning of map to the rider location
  //here map gets the instance of the map created by MapContainer
  const map = useMap();
  useEffect(() => {
    if (center && center[0] && center[1]) { // center is an array of latitude and longitude
      console.log('🗺️ MAP CENTER UPDATE');
      console.log('   New Center:', center);
      console.log('   [Lat, Lng]:', [center[0], center[1]]);
      map.setView(center, map.getZoom(), {
        animate: true,
        duration: 1
      }); // Keep current zoom level with animation
      console.log('✅ Map view updated with animation');
    }
  }, [center, map]);
  return null;
};

const OrderTracking = () => {
  const { orderId } = useParams();
  const { user, loading: authLoading } = useAuth();
  const { socket, joinOrderRoom } = useSocket();
  const navigate = useNavigate();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [riderLocation, setRiderLocation] = useState(null);
  const [mapCenter, setMapCenter] = useState([28.6139, 77.2090]); // Default: Delhi
  const roomJoinedRef = useRef(false); // Track if room is already joined
  const socketIdRef = useRef(null); // Track socket ID to detect reconnections

  // Debug: Log when rider location state changes
  useEffect(() => {
    if (riderLocation) {
      console.log('🔄 RIDER LOCATION STATE CHANGED:');
      console.log('   New riderLocation:', riderLocation);
      console.log('   Latitude:', riderLocation.latitude);
      console.log('   Longitude:', riderLocation.longitude);
    }
  }, [riderLocation]);

  // Debug: Log when map center changes
  useEffect(() => {
    console.log('🔄 MAP CENTER STATE CHANGED:');
    console.log('   New mapCenter:', mapCenter);
    console.log('   [Lat, Lng]:', mapCenter);
  }, [mapCenter]);

  useEffect(() => {
    // Wait for auth to finish loading
    if (authLoading) return;
    
    if (!user || !user.id) {
      navigate('/');
      return;
    }
    
    fetchOrderDetails();
    
    // Join order tracking room when socket is available
    if (socket && orderId) {
      const currentSocketId = socket.id;
      
      // Check if we need to (re)join the room
      const needsToJoin = !roomJoinedRef.current || socketIdRef.current !== currentSocketId;
      
      if (needsToJoin && socket.connected) {
        console.log('🔌 Socket Status: Connected (ID:', currentSocketId, ')');
        console.log('📍 Joining order tracking room:', orderId);
        joinOrderRoom(orderId);
        roomJoinedRef.current = true;
        socketIdRef.current = currentSocketId;
        console.log('✅ Room joined successfully');
      } else if (!socket.connected) {
        // Socket exists but not connected yet
        console.log('⏳ Socket exists but not connected, waiting...');
        roomJoinedRef.current = false; // Reset flag
        
        const handleConnect = () => {
          console.log('🔌 Socket reconnected! Now joining room:', orderId);
          joinOrderRoom(orderId);
          roomJoinedRef.current = true;
          socketIdRef.current = socket.id;
          console.log('✅ Room joined after reconnection');
        };
        socket.once('connect', handleConnect);
        
        // Cleanup the connect listener
        return () => {
          socket.off('connect', handleConnect);
        };
      } else {
        console.log('✅ Already in room, skipping join');
      }
    } else {
      console.log('⚠️ Waiting for socket or orderId');
      console.log('   Socket:', !!socket);
      console.log('   OrderId:', orderId);
      roomJoinedRef.current = false;
    }
  }, [orderId, socket, joinOrderRoom]);

  // Socket listeners for real-time updates
  useEffect(() => {
    if (!socket) {
      console.log('⚠️ Socket not available in OrderTracking');
      return;
    }

    console.log('✅ Setting up socket listeners for order:', orderId);

    const handleStatusUpdate = (data) => {
      console.log('📦 Order status changed:', data);
      if (data.orderId === orderId || data.orderId?.toString() === orderId) {
        toast(data.message || `Status: ${data.status}`, { icon: '📦' });
        
        // Update order with status and appropriate timestamp
        setOrder((prev) => {
          if (!prev) return null;
          const updates = { status: data.status };
          
          // Set the appropriate timestamp field based on status
          // Only set if not already set to preserve original timestamps
          switch(data.status) {
            case 'accepted':
              if (!prev.acceptedAt) updates.acceptedAt = new Date();
              break;
            case 'awaiting_rider':
              // Restaurant accepted, waiting for rider
              if (!prev.acceptedAt) updates.acceptedAt = new Date();
              break;
            case 'rider_assigned':
              // Rider accepted - set preparingAt as the rider acceptance timestamp
              if (!prev.preparingAt) updates.preparingAt = new Date();
              break;
            case 'preparing':
              if (!prev.preparingAt) updates.preparingAt = new Date();
              break;
            case 'ready':
              if (!prev.readyAt) updates.readyAt = new Date();
              break;
            case 'picked_up':
              if (!prev.pickedUpAt) updates.pickedUpAt = new Date();
              break;
            case 'on_the_way':
              if (!prev.onTheWayAt) updates.onTheWayAt = new Date();
              break;
            case 'delivered':
              if (!prev.deliveredAt) updates.deliveredAt = new Date();
              break;
          }
          
          return { ...prev, ...updates };
        });
        
        // Update rider info if available
        if (data.riderName) {
          setOrder((prev) => prev ? {
            ...prev,
            rider: {
              name: data.riderName,
              phone: data.riderPhone
            }
          } : null);
        }
      }
    };

    const handleOrderAccepted = (data) => {
      console.log('✅ Order accepted by rider:', data);
      if (data.orderId === orderId || data.orderId?.toString() === orderId) {
        toast(data.message || `Rider accepted your order!`, { icon: '🏍️' });
        setOrder((prev) => prev ? {
          ...prev,
          status: data.status,
          preparingAt: new Date(), // Use preparingAt for rider acceptance
          rider: {
            name: data.riderName,
            phone: data.riderPhone
          }
        } : null);
      }
    };

    const handleRiderLocationLive = (data) => {
      console.log('� ========== RIDER LOCATION UPDATE RECEIVED ==========');
      console.log('📦 Order ID (data):', data.orderId);
      console.log('📦 Order ID (current):', orderId);
      console.log('📍 New Coordinates:', {
        latitude: data.latitude,
        longitude: data.longitude,
        timestamp: data.timestamp
      });
      
      if (data.orderId === orderId || data.orderId?.toString() === orderId) {
        console.log('✅ Order ID matches! Updating rider location...');
        const location = {
          latitude: data.latitude,
          longitude: data.longitude
        };
        setRiderLocation(location);
        setMapCenter([data.latitude, data.longitude]);
        console.log('✅ Rider location state updated to:', location);
        console.log('✅ Map center updated to:', [data.latitude, data.longitude]);
      } else {
        console.log('❌ Order ID mismatch - ignoring location update');
      }
      console.log('🚀 ====================================================');
    };

    const handleOrderStatus = (orderData) => {
      console.log('📊 Current order status:', orderData);
      // Update with full order socket data
      if (orderData.riderCoordinates) {
        setRiderLocation(orderData.riderCoordinates);
        setMapCenter([orderData.riderCoordinates.latitude, orderData.riderCoordinates.longitude]);
      }
    };

    socket.on('order_status_changed', handleStatusUpdate);
    socket.on('order_status_update', handleStatusUpdate); // Also listen to status updates
    socket.on('order_accepted', handleOrderAccepted);
    socket.on('rider_location_live', handleRiderLocationLive);
    socket.on('order_status', handleOrderStatus);
    
    console.log('🎧 All socket listeners registered:');
    console.log('   - order_status_changed ✅');
    console.log('   - order_status_update ✅');
    console.log('   - order_accepted ✅');
    console.log('   - rider_location_live ✅ (TRACKING RIDER LOCATION)');
    console.log('   - order_status ✅');

    return () => {
      console.log('🔇 Removing socket listeners for order:', orderId);
      socket.off('order_status_changed', handleStatusUpdate);
      socket.off('order_status_update', handleStatusUpdate);
      socket.off('order_accepted', handleOrderAccepted);
      socket.off('rider_location_live', handleRiderLocationLive);
      socket.off('order_status', handleOrderStatus);
    };
  }, [socket, orderId]);

  const fetchOrderDetails = async () => {
    try {
      setLoading(true);
      const response = await axios.get(
        `${import.meta.env.VITE_SERVER_URL}/api/orders/${orderId}`,
        { withCredentials: true }
      );

      if (response.data.success) {
        setOrder(response.data.order);
        
        // Set initial rider location if available
        if (response.data.order.riderLocation) {
          setRiderLocation(response.data.order.riderLocation);
          setMapCenter([
            response.data.order.riderLocation.latitude,
            response.data.order.riderLocation.longitude,
          ]);
        } else if (response.data.order.deliveryAddress) {
          setMapCenter([
            response.data.order.deliveryAddress.latitude,
            response.data.order.deliveryAddress.longitude,
          ]);
        }
      }
    } catch (error) {
      console.error('Error fetching order:', error);
      toast.error('Failed to fetch order details');
    } finally {
      setLoading(false);
    }
  };

  const getStatusTimeline = () => {
    if (!order) return [];

    const timeline = [
      { status: 'pending', label: 'Order Placed', time: order.createdAt },
      { status: 'accepted', label: 'Restaurant Accepted', time: order.acceptedAt },
      { status: 'rider_assigned', label: 'Rider Accepted', time: order.pickedUpAt || order.readyAt || order.preparingAt },
      { status: 'on_the_way', label: 'On the Way', time: order.onTheWayAt },
      { status: 'delivered', label: 'Delivered', time: order.deliveredAt },
    ];

    // Define status order for comparison
    const statusOrder = ['pending', 'accepted', 'awaiting_rider', 'rider_assigned', 'preparing', 'ready', 'picked_up', 'on_the_way', 'delivered'];
    const currentStatusIndex = statusOrder.indexOf(order.status);

    return timeline.map((item, index) => {
      let completed = false;
      const itemStatusIndex = statusOrder.indexOf(item.status);
      
      // An event is completed if the current order status is further along
      // Special handling for rider_assigned which encompasses multiple statuses
      if (item.status === 'rider_assigned') {
        // Rider accepted is complete if status is rider_assigned or beyond
        completed = ['rider_assigned', 'preparing', 'ready', 'picked_up', 'on_the_way', 'delivered'].includes(order.status);
      } else {
        // For other statuses, check if current status is at or beyond this timeline item
        completed = currentStatusIndex >= itemStatusIndex;
      }

      return {
        ...item,
        completed,
        active: item.status === order.status || 
                (order.status === 'preparing' && item.status === 'rider_assigned') ||
                (order.status === 'ready' && item.status === 'rider_assigned') ||
                (order.status === 'picked_up' && item.status === 'rider_assigned') ||
                (order.status === 'awaiting_rider' && item.status === 'accepted'),
      };
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 pt-24 pb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center py-20">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-orange-500 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading order details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gray-50 pt-24 pb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center py-20">
            <p className="text-gray-600">Order not found</p>
            <button
              onClick={() => navigate(user?.role === 'rider' ? '/rider/dashboard' : '/orders')}
              className="mt-4 px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
            >
              {user?.role === 'rider' ? 'Back to Dashboard' : 'Back to Orders'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const timeline = getStatusTimeline();
  const restaurantLat = order.restaurant?.restaurantDetails?.address?.latitude;
  const restaurantLng = order.restaurant?.restaurantDetails?.address?.longitude;

  return (
    <div className="min-h-screen bg-white pt-20 pb-12">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate(user?.role === 'rider' ? '/rider/dashboard' : '/orders')}
            className="flex items-center text-gray-600 hover:text-orange-600 mb-4 transition-colors group"
          >
            <svg className="w-5 h-5 mr-2 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            {user?.role === 'rider' ? 'Back to Dashboard' : 'Back to Orders'}
          </button>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">Track Your Order</h1>
              <p className="text-gray-600 flex items-center gap-2">
                <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm font-medium">
                  #{order.orderNumber || order._id.slice(-8).toUpperCase()}
                </span>
                <span className="text-sm">
                  {new Date(order.createdAt).toLocaleDateString()} at {new Date(order.createdAt).toLocaleTimeString()}
                </span>
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className={`px-4 py-2 rounded-full text-sm font-semibold ${
                order.status === 'delivered' ? 'bg-green-100 text-green-700' :
                order.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                'bg-blue-100 text-blue-700'
              }`}>
                {order.status.replace('_', ' ').toUpperCase()}
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Left Section - Map (Takes 2 columns on XL screens) */}
          <div className="xl:col-span-2 space-y-6">
            {/* Map Card */}
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100">
              
              <div className="h-[500px] relative z-0">
            <MapContainer
              center={mapCenter}
              zoom={13}
              style={{ height: '100%', width: '100%' }}
              className="z-0"
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <MapUpdater center={mapCenter} />

              {/* Restaurant Marker */}
              {restaurantLat && restaurantLng && (
                <Marker position={[restaurantLat, restaurantLng]} icon={restaurantIcon}>
                  <Popup>
                    <strong>Restaurant</strong>
                    <br />
                    {order.restaurant?.restaurantDetails?.kitchenName}
                  </Popup>
                </Marker>
              )}

              {/* Delivery Marker */}
              <Marker
                position={[order.deliveryAddress.latitude, order.deliveryAddress.longitude]}
                icon={deliveryIcon}
              >
                <Popup>
                  <strong>Delivery Location</strong>
                  <br />
                  {order.deliveryAddress.fullAddress}
                </Popup>
              </Marker>

              {/* Rider Marker (if available) */}
              {riderLocation && (
                <Marker
                  position={[riderLocation.latitude, riderLocation.longitude]}
                  icon={riderIcon}
                >
                  <Popup>
                    <strong>Rider Location</strong>
                    <br />
                    {order.rider?.name}
                    <br />
                    <span className="text-sm text-gray-500">
                      Updated: {new Date(riderLocation.lastUpdated || Date.now()).toLocaleTimeString()}
                    </span>
                  </Popup>
                </Marker>
              )}
            </MapContainer>
              </div>
            </div>

            {/* Status Timeline Card */}
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
              <h2 className="text-2xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
                <svg className="w-6 h-6 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                Order Status Timeline
              </h2>
              <div className="space-y-4">
                {/* {console.log('timeline:',timeline)} */}
                {timeline.map((step, index) => (
                  <motion.div
                    key={step.status}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-start group"
                  >
                    <div className="flex flex-col items-center mr-4">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center shadow-md transition-all ${
                          step.completed
                            ? 'bg-gradient-to-br from-green-500 to-green-600'
                            : step.active
                            ? 'bg-gradient-to-br from-orange-500 to-orange-600 animate-pulse'
                            : 'bg-gray-300'
                        }`}
                      >
                        {step.completed ? (
                          <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path
                              fillRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                        ) : (
                          <div className="w-4 h-4 bg-white rounded-full"></div>
                        )}
                      </div>
                      {index < timeline.length - 1 && (
                        <div
                          className={`w-1 h-16 rounded-full transition-all ${
                            step.completed ? 'bg-gradient-to-b from-green-500 to-green-600' : 'bg-gray-300'
                          }`}
                        ></div>
                      )}
                    </div>
                    <div className="flex-1 pb-8">
                      <p
                        className={`font-semibold text-lg ${
                          step.active ? 'text-orange-600' : step.completed ? 'text-gray-900' : 'text-gray-400'
                        }`}
                      >
                        {step.label}
                      </p>
                      {step.time && (
                        <p className="text-sm text-gray-500 mt-1">
                          {new Date(step.time).toLocaleString()}
                        </p>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Sidebar - Order Details */}
          <div className="xl:col-span-1 space-y-6">
            {/* Restaurant & Items Card */}
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
              <h2 className="text-2xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
                <svg className="w-6 h-6 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
                Order Details
              </h2>
              
              {/* Restaurant Info */}
              <div className="mb-6 p-4 bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl border border-orange-200">
                <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  Restaurant
                </h3>
                <p className="text-gray-900 font-semibold text-lg">{order.restaurant?.restaurantDetails?.kitchenName}</p>
              </div>

              {/* Items */}
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  Items Ordered ({order.items.length})
                </h3>
                <div className="space-y-3">
                  {order.items.map((item, index) => (
                    <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                      <div className="flex items-center gap-3">
                        <span className="w-8 h-8 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center text-sm font-semibold">
                          {item.quantity}x
                        </span>
                        <span className="text-gray-700 font-medium">{item.name}</span>
                      </div>
                      <span className="text-gray-900 font-semibold">
                        ₹{(item.price * item.quantity).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Customer Info (for riders only) */}
              {user?.role === 'rider' && order.customer && (
                <div className="mb-6 p-4 bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl border border-purple-200">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    Customer Contact
                  </h3>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Name</span>
                      <span className="text-sm font-semibold text-gray-900">
                        {order.customer.name}
                      </span>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-purple-200">
                      <span className="text-sm text-gray-600">Phone</span>
                      <a 
                        href={`tel:${order.customer.phone}`}
                        className="text-sm font-semibold text-purple-600 hover:text-purple-700 flex items-center gap-1"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                         {order.customer.phone}
                      </a>
                    </div>
                  </div>
                </div>
              )}

              {/* Rider Info */}
              {order.rider && (
                <div className="mb-6 p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    Delivery Partner
                  </h3>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-blue-200 flex items-center justify-center">
                      <span className="text-blue-700 font-bold text-lg">
                        {order.rider.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="text-gray-900 font-semibold">{order.rider.name}</p>
                      <p className="text-sm text-gray-600 flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                        {order.rider.phone}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Payment Information */}
              <div className="mb-6 p-5 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border-2 border-green-200 shadow-sm">
                <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                  Payment Details
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Payment Method</span>
                    <span className="text-sm font-semibold text-gray-900">
                      {order.paymentMethod === 'cod' ? '💵 Cash on Delivery' : '💳 Online Payment'}
                    </span>
                  </div>
                  {order.paymentMethod === 'online' && order.paymentStatus === 'paid' && (
                    <>
                      <div className="flex items-center justify-between pt-2 border-t border-green-200">
                        <span className="text-sm text-gray-600">Payment Status</span>
                        <span className="text-sm font-semibold text-green-600 flex items-center gap-1">
                          ✓ Payment Successful
                        </span>
                      </div>
                      {order.razorpay_payment_id && (
                        <div className="pt-2 border-t border-green-200">
                          <span className="text-xs text-gray-500">Transaction ID</span>
                          <p className="text-xs font-mono text-gray-700 break-all mt-1 bg-white p-2 rounded">
                            {order.razorpay_payment_id}
                          </p>
                        </div>
                      )}
                    </>
                  )}
                  {order.paymentMethod === 'cod' && (
                    <div className="pt-2 border-t border-green-200">
                      <p className="text-xs text-gray-600">
                        💡 Please keep exact change ready for the delivery partner
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Total */}
              <div className="border-t-2 border-gray-200 pt-4 mt-4">
                <div className="flex justify-between items-center p-4 bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl">
                  <span className="text-lg font-semibold text-gray-700">Total Amount</span>
                  <span className="text-2xl font-bold text-orange-600">₹{order.totalAmount.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Delivery Address Card */}
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
              <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Delivery Address
              </h3>
              <p className="text-gray-700 leading-relaxed bg-gray-50 p-4 rounded-lg">
                {order.deliveryAddress?.fullAddress || 'Address not available'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderTracking;
