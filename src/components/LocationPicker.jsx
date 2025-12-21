import { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import toast from 'react-hot-toast';

// Fix for default marker icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const LocationMarker = ({ position, setPosition, onLocationSelect, allowCoordinatesOnly }) => {
  useMapEvents({
    click(e) {
      setPosition([e.latlng.lat, e.latlng.lng]);
      fetchAddress(e.latlng.lat, e.latlng.lng, onLocationSelect, allowCoordinatesOnly);
    },
  });

  return position ? <Marker position={position} /> : null;
};

const fetchAddress = async (lat, lon, callback, allowCoordinatesOnly = false) => {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&addressdetails=1&extratags=1&namedetails=1&zoom=18`
    );
    const data = await response.json();
    
    if (data.address) {
      // Create display name from address parts
      const parts = [];
      if (data.name && data.name !== data.address.city && data.name !== data.address.state) {
        parts.push(data.name);
      }
      if (data.address.road || data.address.neighbourhood) {
        parts.push(data.address.road || data.address.neighbourhood);
      }
      if (data.address.city || data.address.town || data.address.village) {
        parts.push(data.address.city || data.address.town || data.address.village);
      }
      if (data.address.state) {
        parts.push(data.address.state);
      }
      const displayName = parts.filter(Boolean).slice(0, 3).join(', ');
      
      const addressData = {
        street: data.display_name || 'N/A',
        city: data.address.city || data.address.town || data.address.village || 'N/A',
        state: data.address.state || 'N/A',
        zipCode: data.address.postcode || '',
        country: data.address.country || 'N/A',
        latitude: lat,
        longitude: lon,
        fullAddress: data.display_name,
        displayName: displayName || (data.display_name.split(',').slice(0, 3).join(', ')),
      };
      console.log('📍 LocationPicker - fetchAddress callback:', addressData);
      callback(addressData);
      toast.success('Location selected!');
    } else {
      // No address found
      if (allowCoordinatesOnly) {
        // Only allow coordinates-only selection if explicitly enabled
        console.warn('⚠️ No address found, using coordinates only');
        const addressData = {
          street: '',
          city: '',
          state: '',
          zipCode: '',
          country: '',
          latitude: lat,
          longitude: lon,
          fullAddress: '',
          displayName: '',
        };
        callback(addressData);
        toast.success('Location selected with coordinates!');
      } else {
        toast.error('Address not found. Please select a valid location.');
      }
    }
  } catch (error) {
    console.error('Error fetching address:', error);
    // Even if API fails, pass coordinates to callback only if allowed
    if (allowCoordinatesOnly) {
      const addressData = {
        street: '',
        city: '',
        state: '',
        zipCode: '',
        country: '',
        latitude: lat,
        longitude: lon,
        fullAddress: '',
        displayName: '',
      };
      callback(addressData);
      toast.success('Location selected with coordinates!');
    } else {
      toast.error('Failed to fetch address details. Please try again.');
    }
  }
};

const LocationPicker = ({ onLocationSelect, initialPosition = null, initialSearch = '', allowCoordinatesOnly = false }) => {
  const defaultPosition = [28.6139, 77.2090]; // Default to Delhi
  const [position, setPosition] = useState(initialPosition || defaultPosition);
  const [searching, setSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [mapLayer, setMapLayer] = useState('satellite'); // street, satellite, terrain
  const searchRef = useRef(null);

  // Update position when initialPosition changes
  useEffect(() => {
    if (initialPosition) {
      setPosition(initialPosition);
    }
  }, [initialPosition]);

  // Update search query when initialSearch changes
  useEffect(() => {
    if (initialSearch) {
      setSearchQuery(initialSearch);
    }
  }, [initialSearch]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounce search to avoid too many API calls
  useEffect(() => {
    if (searchQuery.trim().length < 3) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const timer = setTimeout(() => {
      fetchSuggestions(searchQuery);
    }, 500); // Wait 500ms after user stops typing

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const fetchSuggestions = async (query) => {
    try {
      // Using Photon API - more powerful geocoding with fuzzy matching (India only)
      // Bounding box for India: [68.1766451354, 7.96553477623, 97.4025614766, 35.4940095078]
      const response = await fetch(
        `https://photon.komoot.io/api/?q=${encodeURIComponent(
          query
        )}&limit=10&lang=en&bbox=68.1766,7.9655,97.4026,35.4940`
      );
      const data = await response.json();
      
      // Convert Photon response to Nominatim-like format
      const formattedResults = data.features.map(feature => ({
        lat: feature.geometry.coordinates[1],
        lon: feature.geometry.coordinates[0],
        display_name: feature.properties.name 
          ? `${feature.properties.name}, ${feature.properties.city || feature.properties.state || ''}, ${feature.properties.country || ''}`
          : `${feature.properties.street || ''} ${feature.properties.housenumber || ''}, ${feature.properties.city || ''}, ${feature.properties.state || ''}, ${feature.properties.country || ''}`,
        address: {
          road: feature.properties.street,
          house_number: feature.properties.housenumber,
          city: feature.properties.city,
          town: feature.properties.city,
          village: feature.properties.city,
          state: feature.properties.state,
          postcode: feature.properties.postcode,
          country: feature.properties.country,
          neighbourhood: feature.properties.district || feature.properties.locality,
        },
        name: feature.properties.name,
      }));
      
      setSuggestions(formattedResults);
      setShowSuggestions(formattedResults.length > 0);
    } catch (error) {
      console.error('Error fetching suggestions:', error);
      // Fallback to Nominatim with fuzzy search enabled
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
            query
          )}&addressdetails=1&limit=10&extratags=1&namedetails=1&dedupe=1`
        );
        const data = await response.json();
        setSuggestions(data);
        setShowSuggestions(data.length > 0);
      } catch (fallbackError) {
        console.error('Fallback search also failed:', fallbackError);
      }
    }
  };

  const selectSuggestion = (suggestion) => {
    const lat = parseFloat(suggestion.lat);
    const lon = parseFloat(suggestion.lon);
    setPosition([lat, lon]);
    
    // Set search query to show selected location
    const displayText = suggestion.display_name;
    setSearchQuery(displayText);
    setShowSuggestions(false);
    setSuggestions([]); // Clear suggestions to prevent re-triggering
    
    // Create a concise display name from the suggestion
    let displayName = '';
    if (suggestion.name && suggestion.address) {
      // For specific places like "LPU Ground", show name with city/state
      const parts = [suggestion.name];
      if (suggestion.address.city || suggestion.address.town || suggestion.address.village) {
        parts.push(suggestion.address.city || suggestion.address.town || suggestion.address.village);
      }
      if (suggestion.address.state) {
        parts.push(suggestion.address.state);
      }
      displayName = parts.filter(Boolean).join(', ');
    } else {
      // Use first 2-3 parts of display_name
      const parts = suggestion.display_name.split(',').map(p => p.trim());
      displayName = parts.slice(0, Math.min(3, parts.length)).join(', ');
    }
    
    const addressData = {
      street: suggestion.display_name || 'N/A',
      city: suggestion.address?.city || suggestion.address?.town || suggestion.address?.village || 'N/A',
      state: suggestion.address?.state || 'N/A',
      zipCode: suggestion.address?.postcode || '',
      country: suggestion.address?.country || 'N/A',
      latitude: lat,
      longitude: lon,
      fullAddress: suggestion.display_name,
      displayName: displayName, // Add the concise display name
    };
    console.log('📍 LocationPicker - Selected:', displayName);
    onLocationSelect(addressData);
    toast.success('Location selected!');
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      toast.error('Please enter a location to search');
      return;
    }

    setSearching(true);
    try {
      // Using Photon API for better fuzzy matching (India only)
      // Bounding box for India: [68.1766451354, 7.96553477623, 97.4025614766, 35.4940095078]
      const response = await fetch(
        `https://photon.komoot.io/api/?q=${encodeURIComponent(
          searchQuery
        )}&limit=1&lang=en&bbox=68.1766,7.9655,97.4026,35.4940`
      );
      const data = await response.json();

      if (data.features && data.features.length > 0) {
        const feature = data.features[0];
        const lat = feature.geometry.coordinates[1];
        const lon = feature.geometry.coordinates[0];
        setPosition([lat, lon]);
        
        // Create display name
        const parts = [];
        if (feature.properties.name) parts.push(feature.properties.name);
        if (feature.properties.city) parts.push(feature.properties.city);
        if (feature.properties.state) parts.push(feature.properties.state);
        const displayName = parts.filter(Boolean).slice(0, 3).join(', ');
        
        const addressData = {
          street: feature.properties.name 
            ? `${feature.properties.name}, ${feature.properties.street || ''} ${feature.properties.housenumber || ''}`.trim()
            : `${feature.properties.street || ''} ${feature.properties.housenumber || ''}`.trim() || 'N/A',
          city: feature.properties.city || 'N/A',
          state: feature.properties.state || 'N/A',
          zipCode: feature.properties.postcode || '',
          country: feature.properties.country || 'N/A',
          latitude: lat,
          longitude: lon,
          fullAddress: `${feature.properties.name || ''}, ${feature.properties.city || ''}, ${feature.properties.state || ''}, ${feature.properties.country || ''}`,
          displayName: displayName,
        };
        onLocationSelect(addressData);
        toast.success('Location found!');
      } else {
        toast.error('Location not found');
      }
    } catch (error) {
      console.error('Error searching location:', error);
      toast.error('Failed to search location');
    } finally {
      setSearching(false);
    }
  };

  const getMapTileLayer = () => {
    switch (mapLayer) {
      case 'satellite':
        return {
          url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
          attribution: '&copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
        };
      case 'terrain':
        return {
          url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
          attribution: 'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, <a href="http://viewfinderpanoramas.org">SRTM</a> | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a>'
        };
      case 'street':
      default:
        return {
          url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        };
    }
  };

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      toast.loading('Getting your location...');
      navigator.geolocation.getCurrentPosition(
        (position) => {
          toast.dismiss();
          const lat = position.coords.latitude;
          const lon = position.coords.longitude;
          setPosition([lat, lon]);
          fetchAddress(lat, lon, onLocationSelect, allowCoordinatesOnly);
        },
        (error) => {
          toast.dismiss();
          console.error('Error getting location:', error);
          toast.error('Failed to get your location. Please enable location access.');
        }
      );
    } else {
      toast.error('Geolocation is not supported by your browser');
    }
  };

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="relative flex gap-2">
        <div className="flex-1 relative" ref={searchRef}>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
            placeholder="Search for a location e.g Ambala (Haryana)"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
          />
          
          {/* Suggestions Dropdown */}
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
              {suggestions.map((suggestion, index) => (
                <div
                  key={index}
                  onClick={() => selectSuggestion(suggestion)}
                  className="px-4 py-3 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0 transition"
                >
                  <div className="flex items-start gap-2">
                    <svg className="w-5 h-5 text-blue-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                      />
                    </svg>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {suggestion.address?.road || suggestion.address?.neighbourhood || suggestion.name}
                      </p>
                      <p className="text-xs text-gray-500 line-clamp-2">
                        {suggestion.display_name}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={handleSearch}
          disabled={searching}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition disabled:opacity-50"
        >
          {searching ? 'Searching...' : 'Search'}
        </button>
        <button
          type="button"
          onClick={getCurrentLocation}
          className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition flex items-center gap-2"
          title="Use my current location"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
          My Location
        </button>
      </div>

      {/* Map */}
      <div className="border-4 border-gray-200 rounded-lg overflow-hidden shadow-lg relative z-0">
        {/* Map Layer Controls Overlay */}
        <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-2">
          <button
            type="button"
            onClick={() => setMapLayer('street')}
            className={`px-3 py-2 rounded-lg font-medium text-sm shadow-lg transition-all ${
              mapLayer === 'street'
                ? 'bg-green-500 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
            title="Street View"
          >
            Street
          </button>
          <button
            type="button"
            onClick={() => setMapLayer('satellite')}
            className={`px-3 py-2 rounded-lg font-medium text-sm shadow-lg transition-all ${
              mapLayer === 'satellite'
                ? 'bg-green-500 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
            title="Satellite View"
          >
            Satellite
          </button>
          <button
            type="button"
            onClick={() => setMapLayer('terrain')}
            className={`px-3 py-2 rounded-lg font-medium text-sm shadow-lg transition-all ${
              mapLayer === 'terrain'
                ? 'bg-green-500 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
            title="Terrain View"
          >
            Terrain
          </button>
        </div>
        <MapContainer
          center={position}
          zoom={13}
          style={{ height: '400px', width: '100%', zIndex: 0 }}
          key={`${position[0]}-${position[1]}-${mapLayer}`}
        >
          <TileLayer
            attribution={getMapTileLayer().attribution}
            url={getMapTileLayer().url}
          />
          <LocationMarker
            position={position}
            setPosition={setPosition}
            onLocationSelect={onLocationSelect}
            allowCoordinatesOnly={allowCoordinatesOnly}
          />
        </MapContainer>
      </div>
    </div>
  );
};

export default LocationPicker;
