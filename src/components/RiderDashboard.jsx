import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { useSocket } from '../contexts/SocketContext';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import axios from 'axios';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import star from '../assets/star.png';

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

const RiderDashboard = () => {
  const { user, loading: authLoading } = useAuth();
  const { calculateDistance } = useApp();
  const { socket, joinRiderPool, leaveRiderPool, updateRiderLocation, acceptRiderOrder, updateOrderStatus: updateOrderStatusSocket } = useSocket();
  const navigate = useNavigate();

  const [orders, setOrders] = useState([]);
  const [availableOrders, setAvailableOrders] = useState(() => {
    // Load from sessionStorage on refresh
    const saved = sessionStorage.getItem('availableOrders');
    if (!saved) return [];
    
    try {
      const orders = JSON.parse(saved);
      // Filter out orders older than 10 minutes
      const tenMinutesAgo = Date.now() - (10 * 60 * 1000);
      return orders.filter(order => {
        const orderTime = new Date(order.createdAt).getTime();
        return orderTime > tenMinutesAgo;
      });
    } catch (e) {
      console.error('Error parsing saved orders:', e);
      return [];
    }
  });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('available'); // available, assigned, completed
  const [isAvailable, setIsAvailable] = useState(false);// Rider availability status
  const [newOrderNotification, setNewOrderNotification] = useState(null);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [viewingOrder, setViewingOrder] = useState(null); // For inline order details modal
  const [hasLocationPermission, setHasLocationPermission] = useState(false); // Track location permission
  const [assignedOrders, setAssignedOrders] = useState([]); // Separate state for assigned orders
  const [completedOrders, setCompletedOrders] = useState([]); // Separate state for completed orders
  const [riderStats, setRiderStats] = useState({
    totalDeliveries: 0,
    totalEarnings: 0,
    todayEarnings: 0,
    rating: 2.5,
    ratingCount: 0,
    activeOrders: 0,
  });
  
  // Update activeOrders count in stats whenever assignedOrders changes
  useEffect(() => {
    setRiderStats(prev => ({
      ...prev,
      activeOrders: assignedOrders.length
    }));
  }, [assignedOrders.length]);
  
  // Update totalDeliveries as sum of assigned and completed orders
  useEffect(() => {
    const totalDeliveries = assignedOrders.length + completedOrders.length;
    setRiderStats(prev => ({
      ...prev,
      totalDeliveries
    }));
  }, [assignedOrders.length, completedOrders.length]);
  
  // Ensure totalDeliveries updates when switching to available tab
  useEffect(() => {
    if (activeTab === 'available') {
      // Recalculate totalDeliveries from current state
      const totalDeliveries = assignedOrders.length + completedOrders.length;
      setRiderStats(prev => ({
        ...prev,
        totalDeliveries
      }));
      // Also fetch latest counts in background
      fetchAllOrderCounts();
    }
  }, [activeTab]);
  
  // PIN verification states
  const [showPickupPinModal, setShowPickupPinModal] = useState(false);
  const [showDeliveryPinModal, setShowDeliveryPinModal] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [selectedOrderForPin, setSelectedOrderForPin] = useState(null);
  const [pinVerifying, setPinVerifying] = useState(false);

  // Audio notification ref
  const audioContextRef = useRef(null);
  const alarmIntervalRef = useRef(null);

  useEffect(() => {
    // Wait for auth to finish loading
    if (authLoading) return;
    
    if (!user || user.role !== 'rider') {
      navigate('/');
      toast.error('Access denied. Rider account required.');
      return;
    }
    // Set initial availability from user's riderDetails
    if (user.riderDetails?.isAvailable !== undefined) {
      setIsAvailable(user.riderDetails.isAvailable);
      // Clear available orders if rider is not available on mount
      if (!user.riderDetails.isAvailable) {
        setAvailableOrders([]);
      }
    }
    fetchOrders();
    fetchRiderStats(); // Fetch rider stats on mount and tab change
    fetchAllOrderCounts(); // Fetch all order counts for badges
  }, [user, activeTab, authLoading]);

  // Periodically refresh all order counts for real-time badge updates
  useEffect(() => {
    if (!user || authLoading) return;
    
    const interval = setInterval(() => {
      console.log('🔄 Auto-refreshing all order counts...');
      fetchAllOrderCounts();
    }, 30000); // Every 30 seconds
    
    return () => clearInterval(interval);
  }, [user, authLoading, isAvailable, currentLocation]);

  useEffect(() => {
    if(user&&user.role==='rider'){
      console.log("rider:",user);
      if(!user.address||user.address.length===0){
        toast.error("Please set your address in profile to receive orders");
        navigate('/rider/profile');
      }
    }
  }, [activeTab])

  // Check location permission on component mount
  useEffect(() => {
    if (user?.role === 'rider' && 'geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setHasLocationPermission(true);
          console.log('✅ Location permission granted');
        },
        (error) => {
          setHasLocationPermission(false);
          console.log('❌ Location permission denied');
        }
      );
    }
  }, [user]);

  // Save available orders to sessionStorage whenever they change
  useEffect(() => {
    sessionStorage.setItem('availableOrders', JSON.stringify(availableOrders));
  }, [availableOrders]);
  
  // Auto-remove orders older than 10 minutes
  useEffect(() => {
    if (activeTab !== 'available') return;
    
    // Check every 30 seconds for expired orders
    const cleanupInterval = setInterval(() => {
      const tenMinutesAgo = Date.now() - (10 * 60 * 1000);
      
      setAvailableOrders(prev => {
        const filtered = prev.filter(order => {
          const orderTime = new Date(order.createdAt).getTime();
          const isValid = orderTime > tenMinutesAgo;
          
          if (!isValid) {
            console.log(`🗑️ Removing expired order ${order.orderId || order._id} (${Math.round((Date.now() - orderTime) / 60000)} minutes old)`);
          }
          
          return isValid;
        });
        
        // Only update state if something was removed
        if (filtered.length !== prev.length) {
          console.log(`🧹 Cleaned up ${prev.length - filtered.length} expired orders`);
          return filtered;
        }
        
        return prev;
      });
    }, 30000); // Check every 30 seconds
    
    return () => clearInterval(cleanupInterval);
  }, [activeTab]);
  
  // Fetch available orders on mount if on available tab
  useEffect(() => {
    if (activeTab === 'available' && !authLoading) {
      fetchOrders();
    }
  }, []); // Run only once on mount
  
  // Auto-refresh available orders every 30 seconds when on available tab
  useEffect(() => {
    if (activeTab !== 'available') {
      console.log('⏭️ Not on available tab, skipping auto-refresh');
      return;
    }

    console.log('🔄 Starting auto-refresh interval for available orders');
    const refreshInterval = setInterval(async () => {
      try {
        console.log('⏰ Auto-refresh triggered');
        // Include location if available
        const params = currentLocation 
          ? { latitude: currentLocation.latitude, longitude: currentLocation.longitude }
          : {};
        console.log('📡 Refreshing with params:', params);

        const response = await axios.get(
          `${import.meta.env.VITE_SERVER_URL}/api/orders/available`,
          { 
            params,
            withCredentials: true 
          }
        );
        if (response.data.success) {
          console.log(`🔄 Auto-refresh: Got ${response.data.orders.length} orders`);
          // Replace orders completely with fresh data from backend
          setAvailableOrders(response.data.orders);
        }
      } catch (error) {
        console.error('❌ Error refreshing available orders:', error);
      }
    }, 30000); // Refresh every 30 seconds

    return () => {
      console.log('🛑 Clearing auto-refresh interval');
      clearInterval(refreshInterval);
    };
  }, [activeTab, currentLocation]);

  // Function to play alarm sound for 10 seconds
  const playAlarmSound = () => {
    try {
      // Stop any existing alarm
      if (alarmIntervalRef.current) {
        clearInterval(alarmIntervalRef.current);
      }

      // Create audio context if not exists
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }

      const audioContext = audioContextRef.current;
      let beepCount = 0;
      const maxBeeps = 20; // Play beep 20 times in 10 seconds (every 0.5s)

      // Function to create a single beep
      const playBeep = () => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        // Alarm sound: alternating between 800Hz and 1000Hz
        oscillator.frequency.value = beepCount % 2 === 0 ? 800 : 1000;
        oscillator.type = 'sine';

        // Volume envelope
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.3);

        beepCount++;
        if (beepCount >= maxBeeps) {
          clearInterval(alarmIntervalRef.current);
          alarmIntervalRef.current = null;
        }
      };

      // Play first beep immediately
      playBeep();

      // Then play every 500ms
      alarmIntervalRef.current = setInterval(playBeep, 500);

    } catch (error) {
      console.error('Error playing alarm sound:', error);
    }
  };

  // Cleanup function for alarm
  useEffect(() => {
    return () => {
      if (alarmIntervalRef.current) {
        clearInterval(alarmIntervalRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  const fetchOrders = async () => {
    try {
      console.log(`🔄 fetchOrders called - activeTab: ${activeTab}`);
      setLoading(true);
      
      if (activeTab === 'available') {
        console.log('📦 Fetching available orders...');
        // Get rider's current location first
        let location = currentLocation;
        console.log('📍 Current location:', location);
        
        // If location not yet set, try to get it
        if (!location && 'geolocation' in navigator) {
          console.log('🔍 Getting fresh location...');
          try {
            const position = await new Promise((resolve, reject) => {
              navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
            });
            location = {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            };
            console.log('✅ Got location:', location);
            setCurrentLocation(location);
          } catch (error) {
            console.error('❌ Error getting location:', error);
          }
        }

        // Fetch all available orders (awaiting_rider status) within distance
        const params = location 
          ? { latitude: location.latitude, longitude: location.longitude }
          : {};
        console.log('📡 Fetching with params:', params);
          
        const response = await axios.get(
          `${import.meta.env.VITE_SERVER_URL}/api/orders/available`,
          { 
            params,
            withCredentials: true 
          }
        );
        console.log('📥 Response:', response.data);
        if (response.data.success) {
          console.log(`✅ Setting ${response.data.orders.length} available orders`);
          setAvailableOrders(response.data.orders);
        } else {
          console.log('❌ Response not successful');
        }
      } else if (activeTab === 'assigned') {
        // Fetch rider's assigned orders
        console.log('📦 Fetching assigned orders...');
        const response = await axios.get(
          `${import.meta.env.VITE_SERVER_URL}/api/orders/rider/${user.id}`,
          { withCredentials: true }
        );
        console.log('📥 Assigned orders response:', response.data);
        if (response.data.success) {
          const assigned = response.data.orders.filter(o => !['delivered', 'cancelled'].includes(o.status));
          console.log(`✅ Setting ${assigned.length} assigned orders`);
          setAssignedOrders(assigned);
          setOrders(assigned); // Also set to orders for backward compatibility
        }
      } else if (activeTab === 'completed') {
        // Fetch completed orders
        console.log('📦 Fetching completed orders...');
        const response = await axios.get(
          `${import.meta.env.VITE_SERVER_URL}/api/orders/rider/${user.id}`,
          { withCredentials: true }
        );
        console.log('📥 Completed orders response:', response.data);
        if (response.data.success) {
          const completed = response.data.orders.filter(o => ['delivered', 'cancelled'].includes(o.status));
          console.log(`✅ Setting ${completed.length} completed orders`);
          setCompletedOrders(completed);
          setOrders(completed); // Also set to orders for backward compatibility
        }
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast.error('Failed to fetch orders');
    } finally {
      setLoading(false);
    }
  };

  // Fetch all order counts independently for real-time badge updates
  const fetchAllOrderCounts = async () => {
    if (!user || !user.id) {
      console.log('⚠️ User not loaded yet, skipping order counts fetch');
      return;
    }
    
    try {
      // Fetch assigned and completed orders
      const response = await axios.get(
        `${import.meta.env.VITE_SERVER_URL}/api/orders/rider/${user.id}`,
        { withCredentials: true }
      );
      if (response.data.success) {
        const allOrders = response.data.orders;
        setAssignedOrders(allOrders.filter(o => !['delivered', 'cancelled'].includes(o.status)));
        setCompletedOrders(allOrders.filter(o => ['delivered', 'cancelled'].includes(o.status)));
      }

      // Fetch available orders if rider is available
      if (isAvailable && currentLocation) {
        const params = { latitude: currentLocation.latitude, longitude: currentLocation.longitude };
        const availableResponse = await axios.get(
          `${import.meta.env.VITE_SERVER_URL}/api/orders/available`,
          { params, withCredentials: true }
        );
        if (availableResponse.data.success) {
          setAvailableOrders(availableResponse.data.orders);
        }
      }
    } catch (error) {
      console.error('Error fetching order counts:', error);
    }
  };

  const fetchRiderStats = async () => {
    try {
      console.log('📊 Fetching rider stats...');
      const response = await axios.get(
        `${import.meta.env.VITE_SERVER_URL}/api/rider/stats`,
        { withCredentials: true }
      );
      console.log('📊 Rider stats response:', response.data);
      if (response.data.success) {
        console.log('✅ Setting rider stats:', response.data.data);
        
        // Calculate totalDeliveries from frontend state only (assigned + completed)
        const totalDeliveries = assignedOrders.length + completedOrders.length;
        const statsData = {
          ...response.data.data,
          totalDeliveries // Always use frontend calculation, no fallback
        };
        
        setRiderStats(statsData);
      } else {
        console.error('❌ Failed to fetch rider stats:', response.data.message);
      }
    } catch (error) {
      console.error('❌ Error fetching rider stats:', error);
      console.error('❌ Error details:', error.response?.data);
    }
  };

  const toggleAvailability = async () => {
    try {
      const newAvailability = !isAvailable;
      
      // Check if rider is trying to go available - verify location permission in real-time
      if (newAvailability) {
        if (!('geolocation' in navigator)) {
          toast.error('Geolocation is not supported by your browser');
          return;
        }

        // Check location permission by attempting to get current position
        try {
          await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(
              (position) => {
                setCurrentLocation({
                  latitude: position.coords.latitude,
                  longitude: position.coords.longitude,
                });
                setHasLocationPermission(true);
                resolve(position);
              },
              (error) => {
                setHasLocationPermission(false);
                reject(error);
              },
              { timeout: 5000 }
            );
          });
        } catch (error) {
          console.error('❌ Location permission error:', error);
          toast.error('Please enable location permissions to become available for deliveries');
          return;
        }
      }

      // Check if rider has assigned orders when trying to go unavailable
      if (!newAvailability) {
        const assignedOrdersResponse = await axios.get(
          `${import.meta.env.VITE_SERVER_URL}/api/orders/rider/${user.id}`,
          { withCredentials: true }
        );
        
        if (assignedOrdersResponse.data.success) {
          const activeOrders = assignedOrdersResponse.data.orders.filter(
            o => !['delivered', 'cancelled'].includes(o.status)
          );
          
          if (activeOrders.length > 0) {
            toast.error(`You cannot go unavailable with ${activeOrders.length} active order(s). Please complete all deliveries first.`);
            return;
          }
        }
      }
      
      const response = await axios.patch(
        `${import.meta.env.VITE_SERVER_URL}/api/rider/availability`,
        { riderId: user.id, isAvailable: newAvailability },
        { withCredentials: true }
      );

      if (response.data.success) {
        setIsAvailable(newAvailability);
        
        // Join or leave rider pool based on availability
        if (newAvailability && currentLocation) {
          joinRiderPool(user.id, currentLocation);
          // Fetch all available orders when becoming available
          const ordersResponse = await axios.get(
            `${import.meta.env.VITE_SERVER_URL}/api/orders/available`,
            { withCredentials: true }
          );
          if (ordersResponse.data.success) {
            setAvailableOrders(ordersResponse.data.orders);
          }
          toast.success('Made available successfully! You can now receive orders.');
        } else {
          leaveRiderPool(user.id);
          // Clear available orders when going unavailable
          setAvailableOrders([]);
          toast.success('Made unavailable successfully! You won\'t receive new orders.');
        }
      }
    } catch (error) {
      console.error('Error toggling availability:', error);
      toast.error('Failed to update availability');
    }
  };

  // Get and track rider's current location
  useEffect(() => {
    // Track location if rider is available OR has assigned orders
    const hasAssignedOrders = assignedOrders && assignedOrders.length > 0;
    const shouldTrackLocation = isAvailable || hasAssignedOrders;
    
    if (!shouldTrackLocation) {
      console.log('⚠️ Rider has no active orders and is not available, skipping location tracking');
      return;
    }

    console.log(`📍 Starting location tracking - Available: ${isAvailable}, Active Orders: ${assignedOrders?.length || 0}`);

    // Get initial location
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coords = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          };
          
          console.log('📍 Current location:', coords);
          setCurrentLocation(coords);
          setHasLocationPermission(true); // Mark permission as granted
          
          // Join rider pool if available OR has assigned orders (needed for location broadcasting)
          if ((isAvailable || hasAssignedOrders) && user?.id) {
            console.log('✅ Joining rider pool with ID:', user.id);
            console.log('   Reason:', isAvailable ? 'Available' : 'Has assigned orders');
            joinRiderPool(user.id, coords);
          }
          
          // Send initial location update for active orders
          if (hasAssignedOrders && user?.id) {
            console.log('📍 Sending initial location for active orders');
            updateRiderLocation(user.id, coords);
          }
        },
        (error) => {
          console.error('❌ Error getting location:', error);
          setHasLocationPermission(false);
          toast.error('Unable to get your location. Please enable location services.');
        }
      );

      // Update location every 10 seconds when available or has active orders
      const locationInterval = setInterval(() => {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const coords = {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            };
            
            console.log('� ========== RIDER SENDING LOCATION ==========');
            console.log('📍 Rider Coordinates:', coords);
            console.log('   Latitude:', coords.latitude);
            console.log('   Longitude:', coords.longitude);
            console.log('👤 Rider ID:', user?.id);
            console.log('📦 Active Orders Count:', assignedOrders?.length || 0);
            setCurrentLocation(coords);
            
            // Update location in rider pool - always send if rider has ID
            if (user?.id) {
              updateRiderLocation(user.id, coords);
              console.log('✅ Location update emitted via socket');
              console.log('   Socket Event: rider_location_update');
              console.log('   Payload: { riderId:', user.id, ', coordinates:', coords, '}');
            }
            console.log('🚀 ============================================');
          },
          (error) => {
            console.error('❌ Error updating location:', error);
          }
        );
      }, 10000); // Update every 10 seconds

      return () => clearInterval(locationInterval);
    } else {
      toast.error('Geolocation is not supported by your browser');
    }
  }, [isAvailable, user?.id, assignedOrders?.length]);

  // Listen for new order notifications
  useEffect(() => {
    if (!socket) {
      console.warn('⚠️ Socket not available in RiderDashboard');
      return;
    }

    console.log('✅ Setting up socket listeners for rider');

    socket.on('new_order_available', (orderData) => {
      console.log('🆕 New order available:', orderData);
      
      // Play alarm sound
      playAlarmSound();
      
      setAvailableOrders((prev) => {
        const updated = [orderData, ...prev];
        console.log(`📈 Added new order, ${prev.length} -> ${updated.length} orders`);
        return updated;
      });
      toast.success(`New order from ${orderData.restaurantName}!`, {
        duration: 5000,
        icon: '🔔',
      });
    });

    socket.on('order_taken', (data) => {
      console.log('🚫 Order taken by another rider:', data.orderId);
      setAvailableOrders((prev) => {
        const updated = prev.filter((order) => order._id !== data.orderId && order.orderId !== data.orderId);
        console.log(`📉 Removed order ${data.orderId}, ${prev.length} -> ${updated.length} orders`);
        return updated;
      });
      // Also refresh all order counts to ensure badges are accurate
      fetchAllOrderCounts();
    });

    // Listen for order status changes to refresh assigned orders
    socket.on('order_status_changed', (data) => {
      console.log('📊 Order status changed:', data);
      
      // Immediately update local state for real-time UI updates
      const { orderId, status } = data;
      
      // If order is delivered, move it from assigned to completed
      if (status === 'delivered') {
        // Remove from assigned orders
        setAssignedOrders((prev) => {
          const orderToMove = prev.find(order => order._id === orderId);
          if (orderToMove) {
            // Add to completed orders
            setCompletedOrders((prevCompleted) => [{...orderToMove, status: 'delivered'}, ...prevCompleted]);
          }
          return prev.filter(order => order._id !== orderId);
        });
        
        // Also update the general orders state
        setOrders((prev) => 
          prev.map(order => order._id === orderId ? { ...order, status: 'delivered' } : order)
        );
      } else {
        // For other status changes, just update the status in assigned orders
        setAssignedOrders((prev) =>
          prev.map(order => order._id === orderId ? { ...order, status } : order)
        );
        setOrders((prev) =>
          prev.map(order => order._id === orderId ? { ...order, status } : order)
        );
      }
      
      // Always refresh all order counts for real-time badge updates
      fetchAllOrderCounts();
      
      // Also refresh current tab view if needed (to sync with backend)
      if (activeTab === 'assigned' || activeTab === 'completed') {
        setTimeout(() => fetchOrders(), 500); // Small delay to ensure DB is updated
      }
      // Refresh stats when order status changes to update active orders count
      fetchRiderStats();
    });

    // Listen for order acceptance confirmation
    socket.on('order_accepted_confirmation', (data) => {
      console.log('✅ Order acceptance confirmed:', data);
      // Refresh all order counts for real-time badge updates
      fetchAllOrderCounts();
      // Refresh assigned orders and stats immediately
      if (activeTab === 'assigned') {
        fetchOrders();
      }
      // Always refresh stats when order is accepted to update active orders count
      fetchRiderStats();
    });

    return () => {
      socket.off('new_order_available');
      socket.off('order_taken');
      socket.off('order_status_changed');
      socket.off('order_accepted_confirmation');
    };
  }, [socket, activeTab]);

  const acceptOrder = async (orderId) => {
    try {
      console.log('✅ Accepting order:', orderId);
      // Use socket to accept order instead of HTTP
      acceptRiderOrder(orderId, user.id);
      toast.success('Order accepted!');
      // Remove from available orders
      setAvailableOrders((prev) => {
        const updated = prev.filter((order) => order._id !== orderId && order.orderId !== orderId);
        console.log(`📉 Removed accepted order ${orderId}, ${prev.length} -> ${updated.length} orders`);
        return updated;
      });
      // Switch to assigned tab and fetch after state updates
      setActiveTab('assigned');
      // Wait for backend to process order assignment and update DB
      setTimeout(() => {
        fetchOrders();
        fetchRiderStats(); // Refresh stats to show updated active orders
        fetchAllOrderCounts(); // Refresh all order counts to update badges
      }, 1000); // Increased delay to ensure DB is updated
    } catch (error) {
      console.error('Error accepting order:', error);
      toast.error('Failed to accept order');
    }
  };

  const updateOrderStatus = async (orderId, status) => {
    try {
      // Optimistically update the UI immediately for all order states
      setOrders((prevOrders) =>
        prevOrders.map((order) =>
          order._id === orderId ? { ...order, status } : order
        )
      );
      setAssignedOrders((prevOrders) =>
        prevOrders.map((order) =>
          order._id === orderId ? { ...order, status } : order
        )
      );
      setCompletedOrders((prevOrders) =>
        prevOrders.map((order) =>
          order._id === orderId ? { ...order, status } : order
        )
      );

      // Use socket to update order status
      updateOrderStatusSocket(orderId, status);
      toast.success(`Order status updated to ${status}!`);
      
      // If status is delivered, refresh rider stats to show updated earnings
      if (status === 'delivered') {
        setTimeout(() => {
          fetchRiderStats();
        }, 1000);
      }
      
      // Fetch fresh data after a short delay to sync with backend
      setTimeout(() => {
        fetchOrders();
        fetchAllOrderCounts();
      }, 1000);
    } catch (error) {
      console.error('Error updating order:', error);
      toast.error('Failed to update order');
      // Revert optimistic update on error
      fetchOrders();
    }
  };

  const markAsDelivered = async (orderId) => {
    // Show delivery PIN modal instead of directly marking as delivered
    setSelectedOrderForPin(orderId);
    setShowDeliveryPinModal(true);
    setPinInput('');
  };

  const handleStartDelivery = (orderId) => {
    // Show pickup PIN modal
    setSelectedOrderForPin(orderId);
    setShowPickupPinModal(true);
    setPinInput('');
  };

  const verifyPickupPin = async () => {
    if (!pinInput || pinInput.length !== 4) {
      toast.error('Please enter a 4-digit PIN');
      return;
    }

    try {
      setPinVerifying(true);
      const response = await axios.post(
        `${import.meta.env.VITE_SERVER_URL}/api/orders/${selectedOrderForPin}/verify-pickup-pin`,
        { pin: pinInput },
        { withCredentials: true }
      );

      if (response.data.success) {
        toast.success('Pickup verified! Starting delivery...');
        setShowPickupPinModal(false);
        setPinInput('');
        setSelectedOrderForPin(null);
        
        // Update local state and then update to on_the_way
        setOrders((prevOrders) =>
          prevOrders.map((order) =>
            order._id === selectedOrderForPin ? { ...order, status: 'picked_up' } : order
          )
        );
        
        // Update to on_the_way after pickup
        setTimeout(() => {
          updateOrderStatus(selectedOrderForPin, 'on_the_way');
        }, 1000);
        
        fetchOrders();
      }
    } catch (error) {
      console.error('Error verifying pickup PIN:', error);
      toast.error(error.response?.data?.message || 'Invalid PIN. Please try again.');
    } finally {
      setPinVerifying(false);
    }
  };

  const verifyDeliveryPin = async () => {
    if (!pinInput || pinInput.length !== 4) {
      toast.error('Please enter a 4-digit PIN');
      return;
    }

    try {
      setPinVerifying(true);
      const response = await axios.post(
        `${import.meta.env.VITE_SERVER_URL}/api/orders/${selectedOrderForPin}/verify-delivery-pin`,
        { pin: pinInput },
        { withCredentials: true }
      );

      if (response.data.success) {
        toast.success('Delivery completed successfully! 🎉');
        setShowDeliveryPinModal(false);
        setPinInput('');
        setSelectedOrderForPin(null);
        
        // Update local state
        setOrders((prevOrders) =>
          prevOrders.map((order) =>
            order._id === selectedOrderForPin ? { ...order, status: 'delivered' } : order
          )
        );
        
        // Refresh stats and orders
        setTimeout(() => {
          fetchOrders();
          fetchRiderStats();
        }, 1000);
      }
    } catch (error) {
      console.error('Error verifying delivery PIN:', error);
      toast.error(error.response?.data?.message || 'Invalid PIN. Please try again.');
    } finally {
      setPinVerifying(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      accepted: 'bg-blue-100 text-blue-800',
      rider_assigned: 'bg-purple-100 text-purple-800',
      preparing: 'bg-orange-100 text-orange-800',
      ready: 'bg-teal-100 text-teal-800',
      picked_up: 'bg-indigo-100 text-indigo-800',
      on_the_way: 'bg-blue-100 text-blue-800',
      delivered: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-screen pt-20 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-20 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Rider Dashboard</h1>
              <p className="text-gray-600 mt-1">Manage your deliveries</p>
            </div>
            
            {/* Availability Toggle */}
            <button
              onClick={toggleAvailability}
              className={`px-6 py-3 rounded-lg font-semibold transition-colors ${
                isAvailable
                  ? 'bg-green-600 text-white hover:bg-green-700'
                  : 'bg-gray-400 text-white hover:bg-gray-500'
              }`}
            >
              {isAvailable ? '🟢 Available' : '🔴 Unavailable'}
            </button>
          </div>
        </motion.div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-lg shadow-md p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Deliveries</p>
                <p className="text-2xl font-bold text-gray-900">{riderStats.totalDeliveries}</p>
              </div>
              <div className="bg-blue-100 p-3 rounded-full">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-lg shadow-md p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Earnings Today</p>
                <p className="text-2xl font-bold text-gray-900">₹{riderStats.todayEarnings}</p>
              </div>
              <div className="bg-green-100 p-3 rounded-full">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-lg shadow-md p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Orders</p>
                <p className="text-2xl font-bold text-gray-900">{riderStats.activeOrders}</p>
              </div>
              <div className="bg-purple-100 p-3 rounded-full">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-lg shadow-md p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Rating</p>
                <div className="text-2xl font-bold text-gray-900 flex items-center gap-1">
                  {riderStats.ratingCount > 0 ? (
                    <>
                      {riderStats.rating.toFixed(1)}
                      <img src={star} alt="star" className="inline-block w-6 h-6 mx-2" />
                    </>
                  ) : (
                    'No ratings yet'
                  )}
                </div>
              </div>
              <div className="bg-yellow-100 p-3 rounded-full">
                <svg className="w-6 h-6 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-md mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              {['available', 'assigned', 'completed'].map((tab) => {
                const count = tab === 'available' 
                  ? availableOrders.length 
                  : tab === 'assigned' 
                    ? assignedOrders.length
                    : completedOrders.length;
                
                return (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                      activeTab === tab
                        ? 'border-primary text-primary'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <span>{tab.charAt(0).toUpperCase() + tab.slice(1).replace('_', ' ')}</span>
                    <span className={`px-1 py-0.5 text-xs font-bold rounded-full ${
                      activeTab === tab 
                        ? 'bg-primary text-white' 
                        : 'bg-gray-200 text-gray-600'
                    }`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Orders List */}
          <div className="p-6">
            {(activeTab === 'available' ? availableOrders : activeTab === 'assigned' ? assignedOrders : completedOrders).length === 0 ? (
              <div className="text-center py-12">
                <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No orders found</h3>
                <p className="text-gray-600">
                  {activeTab === 'available' && 'No orders available at the moment'}
                  {activeTab === 'assigned' && 'You have no assigned orders'}
                  {activeTab === 'completed' && 'You haven\'t completed any deliveries yet'}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <AnimatePresence>
                {(activeTab === 'available' ? availableOrders : activeTab === 'assigned' ? assignedOrders : completedOrders).map((order) => (
                  <motion.div
                    key={order._id || order.orderId}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          Order #{order.orderNumber || (order._id || order.orderId)?.slice(-8).toUpperCase()}
                        </h3>
                        <p className="text-sm text-gray-600">
                          Restaurant: {order.restaurantName || order.restaurant?.restaurantDetails?.kitchenName}
                        </p>
                        {/* For available orders, show detailed distance and earnings info */}
                        {activeTab === 'available' && (
                          <div className="mt-2 space-y-1">
                            {order.distance && (
                              <p className="text-sm text-blue-600 font-medium">
                                🏍️ Distance to Pickup: {order.distance} km
                              </p>
                            )}
                            {(() => {
                              // First try to use the stored distanceToCustomer (for accepted orders or socket data)
                              if (order.distanceToCustomer) {
                                const dist = typeof order.distanceToCustomer === 'number' 
                                  ? order.distanceToCustomer 
                                  : parseFloat(order.distanceToCustomer);
                                if (!isNaN(dist)) {
                                  return (
                                    <p className="text-sm text-purple-600 font-medium">
                                       Delivery Distance: {dist.toFixed(1)} km
                                    </p>
                                  );
                                }
                              }
                              
                              // Try restaurant address from socket event (available orders)
                              if (order.restaurantAddress?.latitude && 
                                  order.restaurantAddress?.longitude &&
                                  order.deliveryAddress?.latitude && 
                                  order.deliveryAddress?.longitude) {
                                const distance = calculateDistance(
                                  order.restaurantAddress.latitude,
                                  order.restaurantAddress.longitude,
                                  order.deliveryAddress.latitude,
                                  order.deliveryAddress.longitude
                                );
                                return (
                                  <p className="text-sm text-purple-600 font-medium">
                                     Delivery Distance: {distance.toFixed(1)} km
                                  </p>
                                );
                              }
                              
                              // Try restaurant from populated order (assigned/completed orders)
                              if (order.restaurant?.restaurantDetails?.address?.latitude && 
                                  order.restaurant?.restaurantDetails?.address?.longitude &&
                                  order.deliveryAddress?.latitude && 
                                  order.deliveryAddress?.longitude) {
                                const distance = calculateDistance(
                                  order.restaurant.restaurantDetails.address.latitude,
                                  order.restaurant.restaurantDetails.address.longitude,
                                  order.deliveryAddress.latitude,
                                  order.deliveryAddress.longitude
                                );
                                return (
                                  <p className="text-sm text-purple-600 font-medium">
                                     Delivery Distance: {distance.toFixed(1)} km
                                  </p>
                                );
                              }
                              
                              return null;
                            })()}
                            {order.riderEarnings && (
                              <p className="text-sm text-green-600 font-bold">
                                💰 Your Earnings: ₹{order.riderEarnings}
                              </p>
                            )}
                            {order.paymentMethod && (
                              <p className="text-sm text-gray-700 font-medium">
                                💳 Payment: {order.paymentMethod === 'cod' ? 'Cash on Delivery' : 'Online Payment'}
                              </p>
                            )}
                          </div>
                        )}
                        {/* For assigned orders, show simpler distance */}
                        {activeTab !== 'available' && order.distance && (
                          <p className="text-sm text-orange-600 font-medium mt-1">
                            {order.distance} km away
                          </p>
                        )}
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status || 'pending')}`}>
                        {(order.status || 'pending').replace('_', ' ').toUpperCase()}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <p className="text-sm text-gray-600">Delivery Address</p>
                        <p className="text-sm font-medium text-gray-900">
                          {order.deliveryAddress?.fullAddress || order.deliveryAddress}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Order Total</p>
                        <p className="text-sm font-medium text-gray-900">
                          ₹{(order.totalAmount || order.pricing?.totalAmount || order.total)?.toFixed(2)}
                        </p>
                      </div>
                    </div>

                    {/* Items Preview */}
                    {order.items && order.items.length > 0 && (
                      <div className="mb-4 pb-4 border-b border-gray-200">
                        <p className="text-sm text-gray-600 mb-2">Items:</p>
                        <div className="space-y-1">
                          {order.items.map((item, idx) => (
                            <p key={idx} className="text-sm text-gray-700">
                              {item.quantity}x {item.name}
                            </p>
                          ))}
                          {/* {order.items.length > 3 && (
                            <p className="text-sm text-gray-500">+{order.items.length - 3} more items</p>
                          )} */}
                        </div>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-3">
                      {activeTab === 'available' && (
                        <button
                          onClick={() => acceptOrder(order.orderId || order._id)}
                          className="flex-1 bg-orange-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-orange-700 transition-colors"
                        >
                          Accept Order
                        </button>
                      )}
                      {activeTab === 'assigned' && (
                        <>
                          {['rider_assigned', 'preparing', 'ready'].includes(order.status) && (
                            <button
                              onClick={() => handleStartDelivery(order._id)}
                              className="flex-1 bg-red-500 text-white py-2 px-4 rounded-lg font-medium hover:bg-red-600 transition-colors"
                            >
                              Start Delivery
                            </button>
                          )}
                          {order.status === 'on_the_way' && (
                            <button
                              onClick={() => markAsDelivered(order._id)}
                              className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-green-700 transition-colors"
                            >
                              ✓ Mark as Delivered
                            </button>
                          )}
                        </>
                      )}
                      <button 
                        onClick={() => {
                          // For available orders, show inline modal to preserve state
                          if (activeTab === 'available') {
                            // Calculate missing fields if needed
                            const enrichedOrder = { ...order };
                            
                            // Calculate distance to restaurant if not present
                            if (!enrichedOrder.distance && currentLocation && order.restaurantAddress?.latitude && order.restaurantAddress?.longitude) {
                              const dist = calculateDistance(
                                currentLocation.latitude,
                                currentLocation.longitude,
                                order.restaurantAddress.latitude,
                                order.restaurantAddress.longitude
                              );
                              enrichedOrder.distance = dist.toFixed(2);
                            }
                            
                            // Calculate riderEarnings if not present
                            if (!enrichedOrder.riderEarnings && order.restaurantAddress?.latitude && order.restaurantAddress?.longitude && order.deliveryAddress?.latitude && order.deliveryAddress?.longitude) {
                              const distanceToCustomer = calculateDistance(
                                order.restaurantAddress.latitude,
                                order.restaurantAddress.longitude,
                                order.deliveryAddress.latitude,
                                order.deliveryAddress.longitude
                              );
                              // Use deliveryFee if available, otherwise calculate based on distance
                              enrichedOrder.riderEarnings = order.deliveryFee > 0 
                                ? order.deliveryFee 
                                : Math.round(distanceToCustomer * 8);
                              
                              // Also add distanceToCustomer if not present
                              if (!enrichedOrder.distanceToCustomer) {
                                enrichedOrder.distanceToCustomer = distanceToCustomer.toFixed(2);
                              }
                            }
                            
                            setViewingOrder(enrichedOrder);
                          } else {
                            // For assigned/completed, can navigate normally
                            navigate(`/track-order/${order._id || order.orderId}`);
                          }
                        }}
                        className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                      >
                        View Details
                      </button>
                    </div>
                  </motion.div>
                ))}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>

        {/* Inline Order Details Modal */}
        <AnimatePresence>
          {viewingOrder && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
              onClick={() => setViewingOrder(null)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Modal Header */}
                <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-50 ">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">
                      Order Details <span className='text-xl text-gray-700'>#{viewingOrder.orderNumber || viewingOrder.orderId?.slice(-8).toUpperCase() || viewingOrder._id?.slice(-8).toUpperCase()}</span>
                    </h2>
                    <p className="text-sm text-gray-600 mt-1">
                      Restaurant: {viewingOrder.restaurantName}
                    </p>
                  </div>
                  <button
                    onClick={() => setViewingOrder(null)}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Modal Content */}
                <div className="p-6 space-y-6">
                  {/* Map */}
                  <div className="h-80 rounded-lg overflow-hidden border border-gray-200 ">
                    <MapContainer
                      center={[
                        viewingOrder.restaurantAddress?.latitude || 0,
                        viewingOrder.restaurantAddress?.longitude || 0
                      ]}
                      zoom={13}
                      style={{ height: '100%', width: '100%' }} 
                      className='z-0'
                    >
                      <TileLayer
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                      />
                      
                      {/* Restaurant Marker */}
                      {viewingOrder.restaurantAddress?.latitude && (
                        <Marker
                          position={[
                            viewingOrder.restaurantAddress.latitude,
                            viewingOrder.restaurantAddress.longitude
                          ]}
                          icon={restaurantIcon}
                        >
                          <Popup>
                            <div className="text-center">
                              <p className="font-semibold">🏪 Restaurant</p>
                              <p className="text-sm">{viewingOrder.restaurantName}</p>
                            </div>
                          </Popup>
                        </Marker>
                      )}

                      {/* Customer/Delivery Marker */}
                      {viewingOrder.deliveryAddress?.latitude && (
                        <Marker
                          position={[
                            viewingOrder.deliveryAddress.latitude,
                            viewingOrder.deliveryAddress.longitude
                          ]}
                          icon={deliveryIcon}
                        >
                          <Popup>
                            <div className="text-center">
                              <p className="font-semibold">📍 Delivery Location</p>
                              <p className="text-sm">{viewingOrder.deliveryAddress.fullAddress}</p>
                            </div>
                          </Popup>
                        </Marker>
                      )}

                      {/* Rider's Current Location */}
                      {currentLocation && (
                        <Marker
                          position={[currentLocation.latitude, currentLocation.longitude]}
                          icon={riderIcon}
                        >
                          <Popup>
                            <div className="text-center">
                              <p className="font-semibold">🏍️ Your Location</p>
                              <p className="text-sm">Current Position</p>
                            </div>
                          </Popup>
                        </Marker>
                      )}
                    </MapContainer>
                  </div>

                  {/* Order Info Grid */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-sm text-gray-600 mb-1">Distance to Restaurant</p>
                      <p className="text-lg font-semibold text-gray-900">
                        {viewingOrder.distance || 'N/A'} km
                      </p>
                    </div>
                    <div className="bg-green-50 p-4 rounded-lg">
                      <p className="text-sm text-gray-600 mb-1">Distance to Customer</p>
                      <p className="text-lg font-semibold text-green-600">
                        {(() => {
                          // First try to use the stored distanceToCustomer (for accepted orders or socket data)
                          if (viewingOrder.distanceToCustomer) {
                            const dist = typeof viewingOrder.distanceToCustomer === 'number' 
                              ? viewingOrder.distanceToCustomer 
                              : parseFloat(viewingOrder.distanceToCustomer);
                            if (!isNaN(dist)) {
                              return `${dist.toFixed(1)} km`;
                            }
                          }
                          
                          // Try restaurant address from socket event (available orders)
                          if (viewingOrder.restaurantAddress?.latitude && 
                              viewingOrder.restaurantAddress?.longitude &&
                              viewingOrder.deliveryAddress?.latitude && 
                              viewingOrder.deliveryAddress?.longitude) {
                            const distance = calculateDistance(
                              viewingOrder.restaurantAddress.latitude,
                              viewingOrder.restaurantAddress.longitude,
                              viewingOrder.deliveryAddress.latitude,
                              viewingOrder.deliveryAddress.longitude
                            );
                            return `${distance.toFixed(1)} km`;
                          }
                          
                          // Try restaurant from populated order (assigned/completed orders)
                          if (viewingOrder.restaurant?.restaurantDetails?.address?.latitude && 
                              viewingOrder.restaurant?.restaurantDetails?.address?.longitude &&
                              viewingOrder.deliveryAddress?.latitude && 
                              viewingOrder.deliveryAddress?.longitude) {
                            const distance = calculateDistance(
                              viewingOrder.restaurant.restaurantDetails.address.latitude,
                              viewingOrder.restaurant.restaurantDetails.address.longitude,
                              viewingOrder.deliveryAddress.latitude,
                              viewingOrder.deliveryAddress.longitude
                            );
                            return `${distance.toFixed(1)} km`;
                          }
                          
                          return 'N/A';
                        })()}
                      </p>
                    </div>
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <p className="text-sm text-gray-600 mb-1">Your Earnings</p>
                      <p className="text-lg font-semibold text-blue-600">
                        ₹{viewingOrder.riderEarnings || 'N/A'}
                      </p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-sm text-gray-600 mb-1">Order Total</p>
                      <p className="text-lg font-semibold text-gray-900">
                        ₹{viewingOrder.totalAmount?.toFixed(2)}
                      </p>
                    </div>
                  </div>

                  {/* Payment Information */}
                  <div className="border border-green-200 rounded-lg p-4 bg-gradient-to-br from-green-50 to-emerald-50">
                    <h3 className="text-sm font-semibold text-gray-900 mb-3">💳 Payment Information</h3>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Payment Method</span>
                        <span className="text-sm font-semibold text-gray-900">
                          {viewingOrder.paymentMethod === 'cod' ? '💵 Cash on Delivery' : '💳 Online Payment'}
                        </span>
                      </div>
                      {viewingOrder.paymentMethod === 'online' && viewingOrder.paymentStatus === 'paid' && (
                        <>
                          <div className="flex items-center justify-between pt-2 border-t border-green-200">
                            <span className="text-sm text-gray-600">Payment Status</span>
                            <span className="text-sm font-semibold text-green-600">
                              ✓ Paid Successfully
                            </span>
                          </div>
                          {viewingOrder.razorpay_payment_id && (
                            <div className="pt-2 border-t border-green-200">
                              <span className="text-xs text-gray-500">Transaction ID</span>
                              <p className="text-xs font-mono text-gray-700 break-all mt-1">
                                {viewingOrder.razorpay_payment_id}
                              </p>
                            </div>
                          )}
                        </>
                      )}
                      {viewingOrder.paymentMethod === 'cod' && (
                        <div className="pt-2 border-t border-green-200">
                          <p className="text-xs text-orange-600 font-medium">
                            💡 Collect ₹{viewingOrder.totalAmount?.toFixed(2)} from customer
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Customer Information */}
                  {/* <div className="border border-blue-200 rounded-lg p-4 bg-gradient-to-br from-blue-50 to-sky-50">
                    <h3 className="text-sm font-semibold text-gray-900 mb-3">👤 Customer Contact</h3>
                    {(() => {
                      // Debug logging
                      console.log('👤 Customer Data Debug:');
                      console.log('   viewingOrder.customer:', viewingOrder.customer);
                      console.log('   viewingOrder.customerName:', viewingOrder.customerName);
                      console.log('   viewingOrder.customerPhone:', viewingOrder.customerPhone);
                      
                      const customerName = viewingOrder.customer?.name || viewingOrder.customerName;
                      const customerPhone = viewingOrder.customer?.phone || viewingOrder.customerPhone;
                      
                      return (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">Name</span>
                            <span className="text-sm font-semibold text-gray-900">
                              {customerName || 'N/A'}
                            </span>
                          </div>
                          <div className="flex items-center justify-between pt-2 border-t border-blue-200">
                            <span className="text-sm text-gray-600">Phone</span>
                            <a 
                              href={`tel:${customerPhone || ''}`}
                              className="text-sm font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                            >
                              📞 {customerPhone || 'N/A'}
                            </a>
                          </div>
                        </div>
                      );
                    })()}
                  </div> */} 

                  {/* Delivery Address */}
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h3 className="text-sm font-semibold text-gray-900 mb-2">📍 Delivery Address</h3>
                    <p className="text-gray-700">
                      {viewingOrder.deliveryAddress?.fullAddress || 'Address not available'}
                    </p>
                  </div>

                  {/* Order Items */}
                  {viewingOrder.items && viewingOrder.items.length > 0 && (
                    <div className="border border-gray-200 rounded-lg p-4">
                      <h3 className="text-sm font-semibold text-gray-900 mb-3">Order Items</h3>
                      <div className="space-y-2">
                        {viewingOrder.items.map((item, idx) => (
                          <div key={idx} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
                            <div>
                              <p className="font-medium text-gray-900">{item.name}</p>
                              <p className="text-sm text-gray-600">Quantity: {item.quantity}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-3 pt-4 border-t border-gray-200">
                    <button
                      onClick={() => {
                        acceptOrder(viewingOrder.orderId || viewingOrder._id);
                        setViewingOrder(null);
                      }}
                      className="flex-1 bg-orange-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-orange-700 transition-colors"
                    >
                      Accept Order
                    </button>
                    <button
                      onClick={() => setViewingOrder(null)}
                      className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Pickup PIN Verification Modal */}
        <AnimatePresence>
          {showPickupPinModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/90  flex items-center justify-center z-50 p-4"
              onClick={() => !pinVerifying && setShowPickupPinModal(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full"
              >
                <h3 className="text-2xl font-bold text-gray-900 mb-4 text-center">
                  🔒 Enter Pickup PIN
                </h3>
                <p className="text-gray-600 text-center mb-6">
                  Ask the restaurant for the 4-digit pickup PIN to verify you're picking up the order
                </p>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength="4"
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ''))}
                  onKeyPress={(e) => e.key === 'Enter' && !pinVerifying && verifyPickupPin()}
                  placeholder="Enter 4-digit PIN"
                  className="w-full bg-green-50 px-4 py-3 text-center text-2xl font-bold border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:outline-none focus:border-transparent mb-6 tracking-widest"
                  autoFocus
                  disabled={pinVerifying}
                />
                <div className="flex gap-3">
                  <button
                    onClick={verifyPickupPin}
                    disabled={pinVerifying || pinInput.length !== 4}
                    className="flex-1 bg-green-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-green-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                  >
                    {pinVerifying ? 'Verifying...' : 'Verify & Start Delivery'}
                  </button>
                  <button
                    onClick={() => {
                      setShowPickupPinModal(false);
                      setPinInput('');
                    }}
                    disabled={pinVerifying}
                    className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Delivery PIN Verification Modal */}
        <AnimatePresence>
          {showDeliveryPinModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4"
              onClick={() => !pinVerifying && setShowDeliveryPinModal(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full"
              >
                <h3 className="text-2xl font-bold text-gray-900 mb-4 text-center">
                  🔒 Enter Delivery PIN
                </h3>
                <p className="text-gray-600 text-center mb-6">
                  Ask the customer for the 4-digit delivery PIN to complete the delivery
                </p>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength="4"
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ''))}
                  onKeyPress={(e) => e.key === 'Enter' && !pinVerifying && verifyDeliveryPin()}
                  placeholder="Enter 4-digit PIN"
                  className="w-full px-4 py-3 text-center text-2xl font-bold border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent mb-6 tracking-widest"
                  autoFocus
                  disabled={pinVerifying}
                />
                <div className="flex gap-3">
                  <button
                    onClick={verifyDeliveryPin}
                    disabled={pinVerifying || pinInput.length !== 4}
                    className="flex-1 bg-green-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-green-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                  >
                    {pinVerifying ? 'Verifying...' : 'Verify & Complete Delivery'}
                  </button>
                  <button
                    onClick={() => {
                      setShowDeliveryPinModal(false);
                      setPinInput('');
                    }}
                    disabled={pinVerifying}
                    className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50"
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

export default RiderDashboard;
