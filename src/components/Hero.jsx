import { useState } from 'react';
import { useApp } from '../context/AppContext';

const Hero = () => {
  const { searchQuery, setSearchQuery, location } = useApp();
  const [localSearch, setLocalSearch] = useState('');

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
            <div className="space-y-2">
              <h1 className="text-5xl md:text-6xl font-bold leading-tight">
                Hungry?
              </h1>
              <h2 className="text-4xl md:text-5xl font-bold leading-tight">
                Order Food <span className="text-[#1C1C1E]">Now!</span>
              </h2>
            </div>

            <p className="text-xl text-white/90 max-w-md">
              Discover the best restaurants near you. Get your favorite food delivered fast and fresh.
            </p>

            {/* Search Bar */}
            <form onSubmit={handleSearch} className="mt-8">
              <div className="bg-white rounded-full shadow-2xl p-2 flex items-center max-w-2xl">
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
            </form>

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
                <h3 className="text-3xl font-bold">1000+</h3>
                <p className="text-white/80 text-sm">Restaurants</p>
              </div>
              <div>
                <h3 className="text-3xl font-bold">50K+</h3>
                <p className="text-white/80 text-sm">Users</p>
              </div>
              <div>
                <h3 className="text-3xl font-bold">100K+</h3>
                <p className="text-white/80 text-sm">Deliveries</p>
              </div>
            </div>
          </div>

          {/* Right Image */}
          <div className="hidden md:block relative">
            <div className="relative z-10">
              <img
                src="https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&h=600&fit=crop"
                alt="Delicious Food"
                className="rounded-3xl shadow-2xl transform hover:scale-105 transition-transform duration-500"
              />
              
              {/* Floating Card 1 */}
              <div className="absolute -left-6 top-20 bg-white rounded-2xl p-4 shadow-xl transform hover:scale-110 transition-transform duration-300">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-[#FFC107] rounded-xl flex items-center justify-center">
                    <svg
                      className="w-6 h-6 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs">Delivery in</p>
                    <p className="text-gray-900 font-bold">25-30 min</p>
                  </div>
                </div>
              </div>

              {/* Floating Card 2 */}
              <div className="absolute -right-6 bottom-20 bg-white rounded-2xl p-4 shadow-xl transform hover:scale-110 transition-transform duration-300">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-[#FF3B30] rounded-xl flex items-center justify-center">
                    <svg
                      className="w-6 h-6 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs">Discount</p>
                    <p className="text-gray-900 font-bold">50% OFF</p>
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
      <div className="absolute bottom-[-1px] left-0 right-0">
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
