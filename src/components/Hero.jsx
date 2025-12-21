import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import CountUp from '../designs/CountUp'
import TextType from '../designs/TextType';

const Hero = () => {
  const { searchQuery, setSearchQuery, location } = useApp();
  const [localSearch, setLocalSearch] = useState('');
  const [currentTextIndex, setCurrentTextIndex] = useState(0);

  const handleSearch = (e) => {
    e.preventDefault();
    setSearchQuery(localSearch);
    // Scroll to restaurants section
    document.getElementById('restaurants-section')?.scrollIntoView({ behavior: 'smooth' });
  };

  const popularSearches = [
    'Pizza',
    'Burger',
    'Biryani',
    'Chinese',
    'Desserts',
    'Healthy',
  ];

  // Content variants for each text type
  const contentVariants = [
    {
      // Customer/Food ordering - "Hungry? Order Food Now!"
      image: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&h=600&fit=crop",
      card1: {
        icon: "clock",
        label: "Delivery in",
        value: "25-30 min",
        bgColor: "bg-[#FFC107]"
      },
      card2: {
        icon: "discount",
        label: "Discount",
        value: "50% OFF",
        bgColor: "bg-[#FF3B30]"
      }
    },
    {
      // Restaurant - "Give your food a bigger stage"
      image: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=600&h=600&fit=crop",
      card1: {
        icon: "star",
        label: "Join Us",
        value: "1000+ Rest.",
        bgColor: "bg-[#4CAF50]"
      },
      card2: {
        icon: "trending",
        label: "Grow Sales",
        value: "2x Revenue",
        bgColor: "bg-[#2196F3]"
      }
    },
    {
      // Rider - "Deliver happiness and get paid for it"
      image: "https://images.unsplash.com/photo-1526367790999-0150786686a2?w=600&h=600&fit=crop",
      card1: {
        icon: "money",
        label: "Earn upto",
        value: "₹25K/month",
        bgColor: "bg-[#9C27B0]"
      },
      card2: {
        icon: "schedule",
        label: "Work Hours",
        value: "Flexible",
        bgColor: "bg-[#FF9800]"
      }
    }
  ];

  // Sync with TextType component rotation
  useEffect(() => {
    const texts = ["Hungry?\nOrder Food Now!", "Give your food a bigger stage", "Deliver happiness and get paid for it"];
    const typingSpeed = 75; // ms per character
    const pauseDuration = 2000; // ms pause after typing completes
    const deletingSpeed = 30; // ms per character when deleting
    
    // Calculate exact duration matching TextType component's timing
    const calculateDuration = (text) => {
      const charCount = text.length; // Include all characters including newlines
      const typingTime = charCount * typingSpeed; // Time to type all characters
      const deletingTime = charCount * deletingSpeed; // Time to delete all characters
      return typingTime + pauseDuration + deletingTime;
    };
    
    const durations = texts.map(calculateDuration);
    let currentIndex = 0;
    
    const rotateContent = () => {
      currentIndex = (currentIndex + 1) % texts.length;
      setCurrentTextIndex(currentIndex);
      
      // Schedule next rotation
      setTimeout(rotateContent, durations[currentIndex]);
    };
    
    // Initial rotation after first text completes
    const initialTimer = setTimeout(rotateContent, durations[0]);
    
    return () => clearTimeout(initialTimer);
  }, []);

  const currentContent = contentVariants[currentTextIndex];

  // Helper function to render icons
  const renderIcon = (iconType) => {
    switch(iconType) {
      case 'clock':
        return (
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        );
      case 'discount':
        return (
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        );
      case 'star':
        return (
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
          />
        );
      case 'trending':
        return (
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
          />
        );
      case 'money':
        return (
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        );
      case 'schedule':
        return (
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="relative bg-gradient-to-br from-[#FF3B30] via-[#ff5549] to-[#FFC107] pt-24 pb-16 overflow-hidden">
      {/* Decorative Background Elements */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-10 left-10 w-64 h-64 bg-white rounded-full blur-3xl"></div>
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-white rounded-full blur-3xl"></div>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <div className="text-white space-y-6">
            <div className="space-y-6 h-52">

              <TextType
                text={["Hungry? \nOrder Food Now!", "Give your food a bigger stage", "Deliver happiness and get paid for it"]}
                wordColors={[["#FFD54F","#FFFFFF", "#FFFFFF", "#FFFFFF"],["#FFFFFF", "#FFFFFF","##FFFFFF","FFFFFF" ,"#FFBF00","#FFFFFF"],["#FFFFFF", "#FFD54F", "#FFFFFF", "#FFFFFF", "#FFFFFF","#FFFFFF"] ]}
                typingSpeed={75}
                pauseDuration={2000}
                showCursor={true}
                cursorCharacter=""
                className="text-6xl md:text-7xl font-bold leading-tight" 
              />
              {/* <h1 className="text-5xl md:text-6xl font-bold leading-tight">
                Hungry?
              </h1>
              <h2 className="text-4xl md:text-5xl font-bold leading-tight">
                Order Food <span className="text-amber-400">Now!</span>
              </h2> */}
            </div>

            <p className="text-xl text-white/90 max-w-md">
              Discover the best restaurants near you. Get your favorite food delivered fast and fresh.
            </p>

            {/* Search Bar */}
            {/* <form onSubmit={handleSearch} className="mt-8">
              <div className="bg-white rounded-full shadow-2xl p-2 flex items-center ">
                <div className="flex items-center px-4 border-r border-gray-300">
                  <svg
                    className="w-5 h-5 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
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
                  <span className="ml-2 text-gray-700 font-medium text-sm truncate max-w-[120px]">
                    {location}
                  </span>
                </div>

                <input
                  type="text"
                  placeholder="Search for restaurants or cuisines..."
                  value={localSearch}
                  onChange={(e) => setLocalSearch(e.target.value)}
                  className="flex-1 px-4 py-3 text-gray-700 focus:outline-none"
                />

                <button
                  type="submit"
                  className="bg-[#FF3B30] text-white px-8 py-3 rounded-full font-semibold hover:bg-[#e63329] transition-all duration-300 shadow-lg hover:shadow-xl"
                >
                  Search
                </button>
              </div>
            </form> */}

            {/* Popular Searches */}
            <div className="mt-6">
              <p className="text-white/80 text-sm mb-3">Popular searches:</p>
              <div className="flex flex-wrap gap-2">
                {popularSearches.map((search) => (
                  <button
                    key={search}
                    onClick={() => {
                      setLocalSearch(search);
                      setSearchQuery(search);
                    }}
                    className="px-4 py-2 bg-white/20 backdrop-blur-sm text-white rounded-full text-sm font-medium hover:bg-white/30 transition-all duration-300 border border-white/30"
                  >
                    {search}
                  </button>
                ))}
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-6 mt-8 pt-8 border-t border-white/20">
              <div>
                <div>
                  <CountUp
                    from={0}
                    to={1000}
                    separator=","
                    direction="up"
                    duration={1}
                    className="count-up-text text-3xl font-bold display-inline"
                  /><span className="text-3xl font-bold">+</span>
                </div>
                <p className="text-white/80 text-sm">Restaurants</p>
              </div>
              <div>
                <div>
                  <CountUp
                    from={0}
                    to={50}
                    separator=","
                    direction="up"
                    duration={9}
                    className="count-up-text text-3xl font-bold display-inline"
                  /><span className="text-3xl font-bold">K+</span>
                </div>
                {/* <h3 className="text-3xl font-bold">50K+</h3> */}
                <p className="text-white/80 text-sm">Users</p>
              </div>
              <div>
                <div>
                  <CountUp
                    from={0}
                    to={100}
                    separator=","
                    direction="up"
                    duration={9} //
                    className="count-up-text text-3xl font-bold display-inline"
                  /><span className="text-3xl font-bold">K+</span>
                </div>
                {/* <h3 className="text-3xl font-bold">100K+</h3> */}
                <p className="text-white/80 text-sm">Deliveries</p>
              </div>
            </div>
          </div>

          {/* Right Image */}
          <div className="hidden md:block relative">
            <div className="relative z-10">
              <div className="relative overflow-hidden rounded-3xl aspect-square bg-gray-100">
                {contentVariants.map((variant, index) => (
                  <img
                    key={index}
                    src={variant.image}
                    alt="Delicious Food"
                    className={`absolute inset-0 w-full h-full object-cover rounded-3xl shadow-2xl transition-opacity duration-700 ease-in-out ${
                      index === currentTextIndex ? 'opacity-100' : 'opacity-0'
                    }`}
                  />
                ))}
              </div>

              {/* Floating Card 1 */}
              <div className="absolute -left-6 top-20 bg-white rounded-2xl p-4 shadow-xl transform hover:scale-110 transition-all duration-500">
                <div className="flex items-center space-x-3">
                  <div className={`w-12 h-12 ${currentContent.card1.bgColor} rounded-xl flex items-center justify-center transition-all duration-700 ease-in-out`}>
                    <svg
                      className="w-6 h-6 text-white transition-all duration-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      key={`icon1-${currentTextIndex}`}
                    >
                      {renderIcon(currentContent.card1.icon)}
                    </svg>
                  </div>
                  <div className="transition-all duration-500">
                    <p className="text-gray-500 text-xs transition-all duration-500">{currentContent.card1.label}</p>
                    <p className="text-gray-900 font-bold transition-all duration-500">{currentContent.card1.value}</p>
                  </div>
                </div>
              </div>

              {/* Floating Card 2 */}
              <div className="absolute -right-6 bottom-20 bg-white rounded-2xl p-4 shadow-xl transform hover:scale-110 transition-all duration-500">
                <div className="flex items-center space-x-3">
                  <div className={`w-12 h-12 ${currentContent.card2.bgColor} rounded-xl flex items-center justify-center transition-all duration-700 ease-in-out`}>
                    <svg
                      className="w-6 h-6 text-white transition-all duration-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      key={`icon2-${currentTextIndex}`}
                    >
                      {renderIcon(currentContent.card2.icon)}
                    </svg>
                  </div>
                  <div className="transition-all duration-500">
                    <p className="text-gray-500 text-xs transition-all duration-500">{currentContent.card2.label}</p>
                    <p className="text-gray-900 font-bold transition-all duration-500">{currentContent.card2.value}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Decorative Elements */}
            <div className="absolute inset-0 -z-10">
              <div className="absolute top-10 right-10 w-40 h-40 bg-white/20 rounded-full blur-2xl animate-pulse"></div>
              <div className="absolute bottom-10 left-10 w-32 h-32 bg-[#FFC107]/30 rounded-full blur-2xl animate-pulse delay-700"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Wave Divider */}
      <div className=" absolute -bottom-1 left-0 right-0 z-20">
        <svg
          viewBox="0 0 1440 120"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-auto"
        >
          <path
            d="M0 120L60 110C120 100 240 80 360 70C480 60 600 60 720 65C840 70 960 80 1080 85C1200 90 1320 90 1380 90L1440 90V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0Z"
            fill="white"
          />
        </svg>
      </div>
    </div>
  );
};

export default Hero;
