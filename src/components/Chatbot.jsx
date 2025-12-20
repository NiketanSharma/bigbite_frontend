import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import axios from 'axios';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const Chatbot = () => {
  const { user, isAuthenticated } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'Hi! I\'m your BigBite assistant. How can I help you today? 🍕',
      timestamp: new Date()
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [usedVoiceInput, setUsedVoiceInput] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speechTimeout, setSpeechTimeout] = useState(null);
  
  // Order placement state
  const [orderPlacementState, setOrderPlacementState] = useState(null); // null | 'confirming_items' | 'confirming_address' | 'placing_order'
  const [selectedWishlist, setSelectedWishlist] = useState(null);
  const [userWishlists, setUserWishlists] = useState([]);
  
  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);
  const synthRef = useRef(window.speechSynthesis);

  // Fetch user wishlists when chat opens
  useEffect(() => {
    if (isOpen && isAuthenticated) {
      fetchWishlists();
    }
  }, [isOpen, isAuthenticated]);

  const fetchWishlists = async () => {
    try {
      console.log('Chatbot: Fetching wishlists, isAuthenticated:', isAuthenticated);
      console.log('Chatbot: User object:', user);
      
      // Check if we have a valid token
      const token = localStorage.getItem('bigbite_token');
      console.log('Chatbot: Token exists:', !!token);
      
      if (!token) {
        console.log('Chatbot: No token found, skipping wishlist fetch');
        return;
      }
      
      const response = await api.getWishlists();
      console.log('Chatbot: Wishlists response:', response);
      if (response.success) {
        setUserWishlists(response.wishlists);
        console.log('Chatbot: Successfully loaded', response.wishlists.length, 'wishlists');
      } else {
        console.log('Chatbot: Wishlists response not successful:', response);
      }
    } catch (error) {
      console.error('Error fetching wishlists:', error);
      console.error('Error details:', error.response?.data || error.message);
      
      // Handle authentication errors
      if (error.message === 'Authentication required. Please log in again.' || 
          error.response?.status === 401) {
        console.log('Chatbot: Token is invalid or expired, clearing token');
        localStorage.removeItem('bigbite_token');
        setUserWishlists([]);
        // Optionally show login prompt or redirect
      } else {
        setUserWishlists([]);
      }
    }
  };

  // Initialize speech recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = true; 
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onstart = () => {
        setIsListening(true);
        toast.success('Listening... Speak now', { id: 'voice-recognition' });
      };

      recognitionRef.current.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setInputText(transcript);
        setUsedVoiceInput(true);
        toast.success('Voice captured!', { id: 'voice-recognition' });
      };

      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        if (event.error === 'no-speech') {
          toast.error('No speech detected. Please try again.', { id: 'voice-recognition' });
        } else if (event.error === 'not-allowed') {
          toast.error('Microphone access denied. Please enable it in settings.', { id: 'voice-recognition' });
        } else {
          toast.error(`Error: ${event.error}`, { id: 'voice-recognition' });
        }
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (synthRef.current) {
        synthRef.current.cancel();
        setIsSpeaking(false);
      }
      // Clear any pending speech timeout
      if (speechTimeout) {
        clearTimeout(speechTimeout);
        setSpeechTimeout(null);
      }
    };
  }, []);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Text to speech function
  const speakText = (text) => {
    if (!synthRef.current) return;

    // Clear any existing timeout
    if (speechTimeout) {
      clearTimeout(speechTimeout);
    }

    // Cancel any ongoing speech
    synthRef.current.cancel();
    setIsSpeaking(false);

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    // Set up event handlers
    utterance.onstart = () => {
      console.log('Speech started');
      setIsSpeaking(true);
    };

    utterance.onend = () => {
      console.log('Speech ended naturally');
      setIsSpeaking(false);
      if (speechTimeout) {
        clearTimeout(speechTimeout);
        setSpeechTimeout(null);
      }
    };

    utterance.onerror = (event) => {
      console.error('Speech synthesis error:', event.error);
      setIsSpeaking(false);
      if (speechTimeout) {
        clearTimeout(speechTimeout);
        setSpeechTimeout(null);
      }
    };

    // Fallback timeout in case onend doesn't fire (some browsers have issues)
    const fallbackTimeout = setTimeout(() => {
      console.log('Speech fallback timeout triggered - forcing isSpeaking to false');
      setIsSpeaking(false);
      setSpeechTimeout(null);
    }, Math.max(text.length * 50, 3000)); // Estimate based on text length, minimum 3 seconds

    setSpeechTimeout(fallbackTimeout);
    synthRef.current.speak(utterance);
  };

  // Stop speech
  const stopSpeaking = () => {
    if (synthRef.current) {
      synthRef.current.cancel();
      setIsSpeaking(false);
    }

    // Clear any pending fallback timeout
    if (speechTimeout) {
      clearTimeout(speechTimeout);
      setSpeechTimeout(null);
    }
  };

  // Start voice recognition
  const startListening = () => {
    if (recognitionRef.current && !isListening) {
      try {
        recognitionRef.current.start();
      } catch (error) {
        console.error('Error starting recognition:', error);
        toast.error('Could not start voice recognition', { id: 'voice-recognition' });
      }
    }
  };

  // Stop voice recognition
  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
    }
  };

  // Fuzzy string matching to find wishlist by name
  const findWishlistByName = (name) => {
    const normalizedInput = name.toLowerCase().trim();
    
    // Exact match first
    let match = userWishlists.find(w => w.name.toLowerCase() === normalizedInput);
    if (match) return match;
    
    // Partial match
    match = userWishlists.find(w => w.name.toLowerCase().includes(normalizedInput));
    if (match) return match;
    
    // Reverse partial match
    match = userWishlists.find(w => normalizedInput.includes(w.name.toLowerCase()));
    if (match) return match;
    
    // Fuzzy matching with Levenshtein-like distance
    let bestMatch = null;
    let bestScore = 0;
    
    userWishlists.forEach(wishlist => {
      const wishlistName = wishlist.name.toLowerCase();
      let score = 0;
      
      // Character overlap
      for (let char of normalizedInput) {
        if (wishlistName.includes(char)) score++;
      }
      
      score = score / Math.max(normalizedInput.length, wishlistName.length);
      
      if (score > bestScore && score > 0.5) { // 50% match threshold
        bestScore = score;
        bestMatch = wishlist;
      }
    });
    
    return bestMatch;
  };

  // Use AI to detect order intent and extract wishlist name
  const detectOrderIntentWithAI = async (message) => {
    try {
      const response = await api.post('/chatbot/detect-order-intent', { message });
      if (response.success) {
        return response.wantsToOrder ? response.wishlistName : null;
      }
      return null;
    } catch (error) {
      console.error('Error detecting order intent:', error);
      return null;
    }
  };

  // Check if message has order keywords (pre-filter before AI call)
  const hasOrderKeywords = (message) => {
    const lowerMsg = message.toLowerCase();
    const orderKeywords = ['order', 'place', 'get me', 'buy', 'want', 'purchase', 'deliver'];
    return orderKeywords.some(keyword => lowerMsg.includes(keyword));
  };

  // Handle order placement flow
  const handleOrderPlacement = async (userInput) => {
    const lowerInput = userInput.toLowerCase().trim();
    
    // Check if user wants to cancel
    if (lowerInput.includes('cancel') || lowerInput.includes('no') || lowerInput.includes('stop')) {
      setOrderPlacementState(null);
      setSelectedWishlist(null);
      return "Order cancelled. How else can I help you?";
    }

    // Handle address change request
    if (lowerInput.includes('address') || lowerInput.includes('location')) {
      return "To change your delivery address, please go to your Profile page and update your address there. Then come back to place your order.";
    }

    // State: Confirming items
    if (orderPlacementState === 'confirming_items') {
      if (lowerInput.includes('yes') || lowerInput.includes('confirm') || lowerInput.includes('sure') || lowerInput.includes('ok')) {
        // Move to address confirmation
        setOrderPlacementState('confirming_address');
        
        if (!user?.address || !user?.address?.latitude || !user?.address?.longitude) {
          setOrderPlacementState(null);
          setSelectedWishlist(null);
          return "❌ You don't have a delivery address set up. Please go to your Profile and add your address first, then come back to place your order.";
        }
        
        const addressText = user.address.street 
          ? `${user.address.street}, ${user.address.city || ''}, ${user.address.state || ''} ${user.address.zipCode || ''}`
          : `Lat: ${user.address.latitude}, Long: ${user.address.longitude}`;
        
        return `✅ Great! Your order will be delivered to:\n📍 ${addressText}\n\nPayment method: Cash on Delivery (COD)\n\nDo you want to proceed with the order?`;
      } else {
        setOrderPlacementState(null);
        setSelectedWishlist(null);
        return "Order cancelled. Feel free to ask me anything else!";
      }
    }

    // State: Confirming address & placing order
    if (orderPlacementState === 'confirming_address') {
      if (lowerInput.includes('yes') || lowerInput.includes('confirm') || lowerInput.includes('sure') || lowerInput.includes('ok') || lowerInput.includes('proceed')) {
        setOrderPlacementState('placing_order');
        
        try {
          // Log the wishlist structure
          console.log('🔍 Selected wishlist:', selectedWishlist);
          console.log('🔍 Restaurant from wishlist:', selectedWishlist.restaurant);
          console.log('🔍 User data:', user);
          console.log('🔍 User ID check - _id:', user._id, 'id:', user.id);
          
          // Prepare order data
          const restaurant = selectedWishlist.restaurant;
          
          // Extract restaurant ID - handle both populated and unpopulated
          let restaurantId;
          if (typeof restaurant === 'string') {
            restaurantId = restaurant;
          } else if (restaurant && restaurant._id) {
            restaurantId = restaurant._id;
          } else {
            throw new Error('Restaurant information is missing from wishlist');
          }
          
          console.log('🏪 Extracted restaurant ID:', restaurantId);
          
          // Extract customer ID - handle both _id and id
          const customerId = user._id || user.id;
          if (!customerId) {
            throw new Error('Customer ID is missing');
          }
          console.log('👤 Customer ID:', customerId);
          
          // Ensure all item fields are present
          const items = selectedWishlist.items.map(item => ({
            menuItem: item.menuItem._id,
            name: item.menuItem.name,
            price: item.menuItem.price,
            quantity: item.quantity
          }));

          console.log('📋 Formatted items:', items);

          // Get restaurant coordinates
          let restaurantLat, restaurantLon;
          if (restaurant.restaurantDetails?.address) {
            restaurantLat = restaurant.restaurantDetails.address.latitude;
            restaurantLon = restaurant.restaurantDetails.address.longitude;
            console.log(`🏪 Restaurant coordinates: Lat ${restaurantLat}, Lon ${restaurantLon}`);
          } else if (typeof restaurant === 'string') {
            // If restaurant is not populated, we can't calculate distance
            // Use default fee
            console.warn('⚠️ Restaurant not populated, using default delivery fee');
          }

          console.log(`📍 Customer coordinates: Lat ${user.address.latitude}, Lon ${user.address.longitude}`);

          // Calculate distance using Haversine formula
          const calculateDistance = (lat1, lon1, lat2, lon2) => {
            const R = 6371; // Earth's radius in km
            const dLat = ((lat2 - lat1) * Math.PI) / 180;
            const dLon = ((lon2 - lon1) * Math.PI) / 180;
            const a =
              Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos((lat1 * Math.PI) / 180) *
                Math.cos((lat2 * Math.PI) / 180) *
                Math.sin(dLon / 2) *
                Math.sin(dLon / 2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            return R * c;
          };

          // Calculate delivery fee based on distance
          let deliveryFee = 40; // Default fee
          let distance = 0;

          if (restaurantLat && restaurantLon && user.address.latitude && user.address.longitude) {
            distance = calculateDistance(
              restaurantLat,
              restaurantLon,
              user.address.latitude,
              user.address.longitude
            );
            
            console.log(`📏 Calculated distance: ${distance.toFixed(2)} km`);
            console.log(`   From: Restaurant (${restaurantLat}, ${restaurantLon})`);
            console.log(`   To: Customer (${user.address.latitude}, ${user.address.longitude})`);
            
            // Delivery fee calculation: ₹8 per km
            deliveryFee = distance * 8;
            deliveryFee = Math.round(deliveryFee); // Round to nearest rupee
            
            console.log(`🚚 Distance: ${distance.toFixed(2)} km, Delivery Fee: ₹${deliveryFee}`);
          } else {
            console.warn('⚠️ Missing coordinates, using default delivery fee of ₹40');
          }

          // Calculate pricing
          const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
          const platformFee = subtotal * 0.05; // 5%
          const gst = (subtotal + deliveryFee + platformFee) * 0.05; // 5%
          const totalAmount = subtotal + deliveryFee + platformFee + gst;

          // Build complete address string
          const addressParts = [
            user.address.street,
            user.address.city,
            user.address.state,
            user.address.zipCode,
            user.address.country
          ].filter(Boolean);
          
          const fullAddress = addressParts.length > 0 
            ? addressParts.join(', ')
            : `Lat: ${user.address.latitude}, Long: ${user.address.longitude}`;

          const orderData = {
            customerId: customerId,
            restaurantId: restaurantId,
            items: items,
            deliveryAddress: {
              fullAddress: fullAddress,
              latitude: Number(user.address.latitude),
              longitude: Number(user.address.longitude),
              street: user.address.street || '',
              city: user.address.city || '',
              state: user.address.state || '',
              zipCode: user.address.zipCode || '',
              country: user.address.country || ''
            },
            paymentMethod: 'cod',
            pricing: {
              subtotal: Number(subtotal.toFixed(2)),
              deliveryFee: Number(deliveryFee.toFixed(2)),
              platformFee: Number(platformFee.toFixed(2)),
              gst: Number(gst.toFixed(2)),
              totalAmount: Number(totalAmount.toFixed(2))
            }
          };

          console.log('📦 Final order data being sent:', JSON.stringify(orderData, null, 2));
          const response = await api.placeOrder(orderData);
          
          if (response.success) {
            setOrderPlacementState(null);
            setSelectedWishlist(null);
            toast.success('Order placed successfully! 🎉');
            
            // Format order ID to 8 characters
            const shortOrderId = response.order._id.substring(0, 8).toUpperCase();
            
            // Create detailed breakdown
            const breakdown = `🎉 Awesome! Your order has been placed successfully!

📦 Order ID: #${shortOrderId}

💰 Payment Breakdown:
━━━━━━━━━━━━━━━━━━━━
🍽️  Items Subtotal:  ₹${subtotal.toFixed(2)}
🚚  Delivery Fee:     ₹${deliveryFee.toFixed(2)}
📱  Platform Fee:     ₹${platformFee.toFixed(2)}
💳  GST (5%):         ₹${gst.toFixed(2)}
━━━━━━━━━━━━━━━━━━━━
💵  Total Amount:     ₹${totalAmount.toFixed(2)}

📍 Payment: Cash on Delivery (COD)

You can track your order from the "My Orders" section. The restaurant will start preparing your food soon! 🍕`;
            
            return breakdown;
          } else {
            throw new Error(response.message || 'Failed to place order');
          }
        } catch (error) {
          console.error('Order placement error:', error);
          setOrderPlacementState(null);
          setSelectedWishlist(null);
          return `❌ Sorry, there was an error placing your order: ${error.message}. Please try again or contact support.`;
        }
      } else {
        setOrderPlacementState(null);
        setSelectedWishlist(null);
        return "Order cancelled. How else can I help you?";
      }
    }

    // Initial order request - use AI to detect intent
    // Pre-filter: Only use AI if message contains order keywords
    if (!hasOrderKeywords(userInput)) {
      return null; // Not an order request, skip AI call
    }

    if (!isAuthenticated) {
      return "🔒 Please log in first to place an order through the chatbot.";
    }

    if (userWishlists.length === 0) {
      return "📝 You don't have any wishlists yet. Add items to your wishlist first to place orders through the chatbot!";
    }

    // Only call AI if we have order keywords AND user is authenticated
    const wishlistName = await detectOrderIntentWithAI(userInput);
    
    if (wishlistName) {
      const matchedWishlist = findWishlistByName(wishlistName);
      
      if (!matchedWishlist) {
        const availableWishlists = userWishlists.map(w => `"${w.name}"`).join(', ');
        return `❌ Cannot find a wishlist matching "${wishlistName}". \n\nYour available wishlists are: ${availableWishlists}\n\nPlease add items to your wishlist to place orders from the chatbot.`;
      }

      // Found a matching wishlist
      setSelectedWishlist(matchedWishlist);
      setOrderPlacementState('confirming_items');
      
      const itemsList = matchedWishlist.items.map(item => 
        `  • ${item.menuItem.name} x${item.quantity} - ₹${(item.menuItem.price * item.quantity).toFixed(2)}`
      ).join('\n');
      
      const totalItems = matchedWishlist.items.reduce((sum, item) => sum + item.quantity, 0);
      const totalPrice = matchedWishlist.items.reduce((sum, item) => sum + (item.menuItem.price * item.quantity), 0);
      
      return `🛒 Found your "${matchedWishlist.name}" wishlist!\n\n📋 Your order contains:\n${itemsList}\n\n📊 Total Items: ${totalItems}\n💰 Subtotal: ₹${totalPrice.toFixed(2)}\n\nDo you want to continue with this order?`;
    }

    return null; // Not an order request
  };

  // Send message to Gemini API
  const sendMessage = async () => {
    if (!inputText.trim() || isLoading) return;

    const userMessage = {
      role: 'user',
      content: inputText,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    const currentInput = inputText;
    setInputText('');
    setIsLoading(true);

    try {
      // First, check if this is an order placement request
      const orderResponse = await handleOrderPlacement(currentInput);
      
      if (orderResponse) {
        // This is an order-related interaction
        const assistantMessage = {
          role: 'assistant',
          content: orderResponse,
          timestamp: new Date()
        };

        setMessages(prev => [...prev, assistantMessage]);

        // Speak response if user used voice input
        if (usedVoiceInput) {
          speakText(orderResponse);
          setUsedVoiceInput(false);
        }
        
        return;
      }

      // If we're in order placement flow but message wasn't handled, guide user
      if (orderPlacementState) {
        const assistantMessage = {
          role: 'assistant',
          content: "I didn't quite understand that. Please type 'yes' to confirm or 'cancel' to stop the order process.",
          timestamp: new Date()
        };

        setMessages(prev => [...prev, assistantMessage]);

        if (usedVoiceInput) {
          speakText(assistantMessage.content);
          setUsedVoiceInput(false);
        }
        
        return;
      }

      // Otherwise, use backend API for general questions
      try {
        console.log('Sending message to chatbot:', currentInput);
        const response = await api.post('/chatbot/chat', { message: currentInput });
        console.log('Chatbot response:', response);
        const aiResponse = response.success && response.message ? response.message : 'Sorry, I could not process that request.';
        console.log('AI Response:', aiResponse);

        const assistantMessage = {
          role: 'assistant',
          content: aiResponse,
          timestamp: new Date()
        };

        setMessages(prev => [...prev, assistantMessage]);

        // Speak response if user used voice input
        if (usedVoiceInput) {
          speakText(aiResponse);
          setUsedVoiceInput(false);
        }
      } catch (error) {
        console.error('Error in chat:', error);
        console.error('Error details:', error.response?.data || error.message);
        const errorMessage = {
          role: 'assistant',
          content: 'Sorry, I encountered an error. Please try again.',
          timestamp: new Date()
        };
        setMessages(prev => [...prev, errorMessage]);
      } finally {
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Error in sendMessage:', error);
      setIsLoading(false);
    }
  };

  // Handle input key press
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Clear chat
  const clearChat = () => {
    setMessages([
      {
        role: 'assistant',
        content: 'Chat cleared! How can I help you? 🍕',
        timestamp: new Date()
      }
    ]);
    stopSpeaking();
    setOrderPlacementState(null);
    setSelectedWishlist(null);
  };

  return (
    <>
      {/* Floating Chat Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setIsOpen(true)}
            className="fixed bottom-6 right-6 w-16 h-16 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-full shadow-2xl flex items-center justify-center z-50 hover:shadow-3xl transition-shadow"
          >
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            {/* Notification Dot */}
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-white animate-pulse"></span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 100, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 100, scale: 0.8 }}
            className="fixed bottom-6 right-6 w-96 h-[600px] bg-white rounded-2xl shadow-2xl z-50 flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                  🤖
                </div>
                <div>
                  <h3 className="font-bold">BigBite Assistant</h3>
                  <p className="text-xs text-white/80">Always here to help</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={clearChat}
                  className="p-2 hover:bg-white/20 rounded-lg transition"
                  title="Clear chat"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 hover:bg-white/20 rounded-lg transition"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Messages Container */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
              {messages.map((message, index) => {
                console.log('Rendering message:', index, message);
                return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                      message.role === 'user'
                        ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white'
                        : 'bg-white text-gray-800 shadow-md'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{message.content || 'No content'}</p>
                    <p className={`text-xs mt-1 ${message.role === 'user' ? 'text-white/70' : 'text-gray-400'}`}>
                      {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </motion.div>
                );
              })}
              
              {/* Loading indicator */}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-white rounded-2xl px-4 py-3 shadow-md">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 bg-white border-t border-gray-200">
              <div className="flex items-end gap-2">
                <div className="flex-1 relative">
                  <textarea
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Type your message..."
                    rows="1"
                    className="w-full px-4 py-2 pr-12 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
                    style={{ maxHeight: '100px' }}
                  />
                  
                  {/* Voice button inside input */}
                  <button
                    onClick={isListening ? stopListening : startListening}
                    className={`absolute right-2 bottom-2 p-2 rounded-lg transition ${
                      isListening
                        ? 'bg-red-500 text-white animate-pulse'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                    title={isListening ? 'Stop listening' : 'Start voice input'}
                  >
                    {isListening ? (
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M6 6h12v12H6z" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                      </svg>
                    )}
                  </button>
                </div>

                {/* Send button */}
                <button
                  onClick={sendMessage}
                  disabled={!inputText.trim() || isLoading}
                  className="p-3 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </button>

                {/* Speaker button (only show when AI is speaking) */}
                {isSpeaking && (
                  <button
                    onClick={stopSpeaking}
                    className="p-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition animate-pulse"
                    title="Stop speaking"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                    </svg>
                  </button>
                )}
              </div>
              
              {/* Helper text */}
              <p className="text-xs text-gray-400 mt-2 text-center">
                Press Enter to send • Click 🎤 for voice input
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default Chatbot;
