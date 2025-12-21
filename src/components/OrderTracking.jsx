import { useState, useEffect } from 'react';
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
    if (center) { // center is an array of latitude and longitude
      map.setView(center, 13); // 13 is the zoom level
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

  useEffect(() => {
    // Wait for auth to finish loading
    if (authLoading) return;
    
    if (!user || !user.id) {
      navigate('/');
      return;
    }
    
    fetchOrderDetails();
    
    // Join order tracking room when component mounts
    if (socket && orderId) {
      console.log('📍 Joining order tracking room:', orderId);
      joinOrderRoom(orderId);
    }

    return () => {
      // Socket will handle cleanup on disconnect
      console.log('📍 Left order tracking room:', orderId);
    };
  }, [orderId, user, socket]);

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
          
          // Set the appropriate timestamp field
          switch(data.status) {
            case 'rider_assigned':
              updates.acceptedAt = new Date();
              break;
            case 'preparing':
              updates.preparingAt = new Date();
              break;
            case 'ready':
              updates.readyAt = new Date();
              break;
            case 'picked_up':
              updates.pickedUpAt = new Date();
              break;
            case 'on_the_way':
              updates.onTheWayAt = new Date();
              break;
            case 'delivered':
              updates.deliveredAt = new Date();
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
          acceptedAt: new Date(),
          rider: {
            name: data.riderName,
            phone: data.riderPhone
          }
        } : null);
      }
    };

    const handleRiderLocationLive = (data) => {
      console.log('📍 Rider live location:', data);
      if (data.orderId === orderId || data.orderId?.toString() === orderId) {
        const location = {
          latitude: data.latitude,
          longitude: data.longitude
        };
        setRiderLocation(location);
        setMapCenter([data.latitude, data.longitude]);
      }
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

    return () => {
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
      { status: 'rider_assigned', label: 'Rider Accepted', time: order.acceptedAt },
      { status: 'on_the_way', label: 'On the Way', time: order.onTheWayAt },
      { status: 'delivered', label: 'Delivered', time: order.deliveredAt },
    ];

    const currentIndex = timeline.findIndex((item) => item.status === order.status);

    return timeline.map((item, index) => {
      let completed = false;
      
      // Handle completion logic for simplified states
      if (order.status === 'pending') {
        completed = index === 0;
      } else if (order.status === 'accepted') {
        completed = index <= 1;
      } else if (['rider_assigned', 'preparing', 'ready', 'picked_up'].includes(order.status)) {
        completed = index <= 2;
      } else if (order.status === 'on_the_way') {
        completed = index <= 3;
      } else if (order.status === 'delivered') {
        completed = true;
      }

      return {
        ...item,
        completed,
        active: item.status === order.status || 
                (order.status === 'preparing' && item.status === 'rider_assigned') ||
                (order.status === 'ready' && item.status === 'rider_assigned') ||
                (order.status === 'picked_up' && item.status === 'rider_assigned'),
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
    <div className="min-h-screen bg-gray-50 pt-24 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate(user?.role === 'rider' ? '/rider/dashboard' : '/orders')}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            {user?.role === 'rider' ? 'Back to Dashboard' : 'Back to Orders'}
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Track Your Order</h1>
          <p className="text-gray-600 mt-2">
            Order #{order._id.slice(-8).toUpperCase()}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Map */}
          <div className="bg-white rounded-lg shadow-sm overflow-hidden h-[500px] relative z-0">
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

          {/* Right Column - Order Details */}
          <div className="space-y-6">
            {/* Status Timeline */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Order Status</h2>
              <div className="space-y-4">
                {/* {console.log('timeline:',timeline)} */}
                {timeline.map((step, index) => (
                  <motion.div
                    key={step.status}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-start"
                  >
                    <div className="flex flex-col items-center mr-4">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          step.completed
                            ? 'bg-green-500'
                            : step.active
                            ? 'bg-orange-500 animate-pulse'
                            : 'bg-gray-300'
                        }`}
                      >
                        {step.completed ? (
                          <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path
                              fillRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                        ) : (
                          <div className="w-3 h-3 bg-white rounded-full"></div>
                        )}
                      </div>
                      {index < timeline.length - 1 && (
                        <div
                          className={`w-0.5 h-12 ${
                            step.completed ? 'bg-green-500' : 'bg-gray-300'
                          }`}
                        ></div>
                      )}
                    </div>
                    <div className="flex-1">
                      <p
                        className={`font-medium ${
                          step.active ? 'text-orange-600' : step.completed ? 'text-gray-900' : 'text-gray-400'
                        }`}
                      >
                        {step.label}
                      </p>
                      {step.time && (
                        <p className="text-sm text-gray-500">
                          {new Date(step.time).toLocaleString()}
                        </p>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Order Details */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Order Details</h2>
              
              {/* Restaurant Info */}
              <div className="mb-4">
                <h3 className="text-sm font-medium text-gray-700">Restaurant</h3>
                <p className="text-gray-900">{order.restaurant?.restaurantDetails?.kitchenName}</p>
              </div>

              {/* Items */}
              <div className="mb-4">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Items</h3>
                <div className="space-y-2">
                  {order.items.map((item, index) => (
                    <div key={index} className="flex justify-between text-sm">
                      <span className="text-gray-600">
                        {item.quantity}x {item.name}
                      </span>
                      <span className="text-gray-900 font-medium">
                        ₹{(item.price * item.quantity).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Rider Info */}
              {order.rider && (
                <div className="mb-4 p-3 bg-orange-50 rounded-lg">
                  <h3 className="text-sm font-medium text-gray-700 mb-1">Delivery Partner</h3>
                  <p className="text-gray-900">{order.rider.name}</p>
                  <p className="text-sm text-gray-600">{order.rider.phone}</p>
                </div>
              )}

              {/* Total */}
              <div className="border-t pt-4">
                <div className="flex justify-between text-lg font-bold">
                  <span>Total Amount</span>
                  <span>₹{order.totalAmount.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderTracking;
