import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';

const SocketContext = createContext();

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within SocketProvider');
  }
  return context;
};

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const { user, loading } = useAuth();

  useEffect(() => {
    // Don't initialize socket until auth is loaded
    if (loading) {
      console.log('⏳ Waiting for auth to load...');
      return;
    }

    console.log('🔄 Initializing socket with user:', user);

    // Initialize socket connection
    const newSocket = io(import.meta.env.VITE_SERVER_URL || 'http://localhost:5000', {
      withCredentials: true,
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5
    });

    newSocket.on('connect', () => {
      console.log('🔌 Socket connected:', newSocket.id);
      console.log('👤 Current user state:', user);
      setConnected(true);

      // Authenticate user if logged in
      if (user && user.id) {
        console.log('👤 Authenticating:', user.id, 'Role:', user.role);
        if (user.role === 'rider') {
          newSocket.emit('rider_authenticate', user.id);
        } else {
          newSocket.emit('authenticate', user.id);
        }
      } else {
        console.log('⚠️ No user logged in, skipping authentication');
      }
    });

    newSocket.on('disconnect', () => {
      console.log('❌ Socket disconnected');
      setConnected(false);
    });

    newSocket.on('connect_error', (error) => {
      console.error('❌ Socket connection error:', error);
      setConnected(false);
    });

    setSocket(newSocket);

    // Cleanup on unmount
    return () => {
      console.log('🔌 Closing socket connection');
      newSocket.close();
    };
  }, [loading]);

  // Re-authenticate when user changes
  useEffect(() => {
    if (socket && connected && user && user.id) {
      if (user.role === 'rider') {
        socket.emit('rider_authenticate', user.id);
      } else {
        socket.emit('authenticate', user.id);
      }
    }
  }, [user, socket, connected]);

  // Join order room for tracking
  const joinOrderRoom = (orderId) => {
    if (socket && orderId) {
      console.log('📍 Joining order room:', orderId);
      socket.emit('join_order_tracking', orderId);
    }
  };

  // Leave order room
  const leaveOrderRoom = (orderId) => {
    if (socket && orderId) {
      console.log('📍 Leaving order room:', orderId);
      socket.emit('leave_order_tracking', orderId);
    }
  };

  // Rider joins the active pool (when available)
  const joinRiderPool = (riderId, coordinates) => {
    if (socket && riderId && coordinates) {
      console.log('🏍️ Rider joining active pool:', riderId);
      socket.emit('rider_join_pool', { riderId, coordinates });
    }
  };

  // Rider leaves the active pool (when unavailable)
  const leaveRiderPool = (riderId) => {
    if (socket && riderId) {
      console.log('🏍️ Rider leaving active pool:', riderId);
      socket.emit('rider_leave_pool', { riderId });
    }
  };

  // Update rider location for live tracking (every 10 seconds)
  const updateRiderLocation = (riderId, coordinates) => {
    if (socket && riderId && coordinates) {
      socket.emit('rider_location_update', { riderId, coordinates });
    }
  };

  // Restaurant authenticates to receive orders
  const authenticateRestaurant = (restaurantId) => {
    if (socket && restaurantId) {
      console.log('🏪 Restaurant authenticating:', restaurantId);
      console.log('🔌 Socket connected?', socket.connected);
      console.log('🔌 Socket ID:', socket.id);
      socket.emit('restaurant_authenticate', { restaurantId });
    } else {
      console.error('❌ Cannot authenticate restaurant:', { socket: !!socket, restaurantId, connected: socket?.connected });
    }
  };

  // Restaurant accepts an order
  const acceptOrder = (orderId, restaurantId) => {
    if (socket && orderId && restaurantId) {
      console.log('✅ Restaurant accepting order:', orderId);
      socket.emit('restaurant_accept_order', { orderId, restaurantId });
    }
  };

  // Restaurant rejects an order
  const rejectOrder = (orderId, restaurantId, reason) => {
    if (socket && orderId && restaurantId) {
      console.log('❌ Restaurant rejecting order:', orderId);
      socket.emit('restaurant_reject_order', { orderId, restaurantId, reason });
    }
  };

  // Rider accepts an order
  const acceptRiderOrder = (orderId, riderId) => {
    if (socket && orderId && riderId) {
      console.log('🏍️ Rider accepting order:', orderId);
      socket.emit('rider_accept_order', { orderId, riderId });
    }
  };

  // Update order status
  const updateOrderStatus = (orderId, status) => {
    if (socket && orderId && status) {
      console.log('📦 Updating order status:', orderId, status);
      socket.emit('update_order_status', { orderId, status });
    }
  };

  const value = {
    socket,
    connected,
    joinOrderRoom,
    leaveOrderRoom,
    joinRiderPool,
    leaveRiderPool,
    updateRiderLocation,
    authenticateRestaurant,
    acceptOrder,
    rejectOrder,
    acceptRiderOrder,
    updateOrderStatus,
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};
