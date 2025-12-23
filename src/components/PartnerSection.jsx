import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const PartnerSection = () => {
  const { user, setShowSignupModal } = useAuth();
  const navigate = useNavigate();

  const handlePartnerClick = (role) => {
    if (!user) {
      setShowSignupModal(true);
      // We'll set the role in the signup modal
      setTimeout(() => {
        const roleButton = document.querySelector(`button[data-role="${role}"]`);
        if (roleButton) roleButton.click();
      }, 100);
    } else {
      // User is logged in, navigate to registration page
      if (role === 'restaurant') {
        navigate('/restaurant-registration');
      } else if (role === 'rider') {
        // For now, show a message - you can create a RiderRegistration component later
        alert('Rider registration coming soon!');
      }
    }
  };

  return (
    <section className="py-20 bg-gradient-to-br from-gray-50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Grow With <span className="text-[#FF3B30]">Big<span className='text-amber-400'>Bite</span></span>
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Join thousands of partners and riders who are growing their business and earning with us
          </p>
        </div>

        {/* Cards */}
        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {/* Restaurant Partner Card */}
          <div className="group bg-white rounded-2xl shadow-xl overflow-hidden hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2">
            <div className="relative h-64 overflow-hidden bg-gradient-to-br from-[#FF3B30] to-[#ff6b63]">
              {/* Background Pattern */}
              <div className="absolute inset-0 opacity-10">
                <div className="absolute top-0 left-0 w-40 h-40 bg-white rounded-full -translate-x-1/2 -translate-y-1/2"></div>
                <div className="absolute bottom-0 right-0 w-64 h-64 bg-white rounded-full translate-x-1/3 translate-y-1/3"></div>
              </div>

              {/* Content */}
              <div className="relative h-full flex flex-col items-center justify-center text-white p-8">
                <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <svg
                    className="w-10 h-10"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                    />
                  </svg>
                </div>
                <h3 className="text-3xl font-bold mb-2">Restaurant Partner</h3>
                <p className="text-white/90 text-center">Grow your restaurant business</p>
              </div>
            </div>

            <div className="p-8">
              <ul className="space-y-4 mb-8">
                <li className="flex items-start space-x-3">
                  <svg
                    className="w-6 h-6 text-green-500 flex-shrink-0 mt-0.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  <span className="text-gray-700">
                    <strong>Zero commission</strong> for first month
                  </span>
                </li>
                <li className="flex items-start space-x-3">
                  <svg
                    className="w-6 h-6 text-green-500 flex-shrink-0 mt-0.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  <span className="text-gray-700">
                    Reach <strong>thousands of customers</strong>
                  </span>
                </li>
                <li className="flex items-start space-x-3">
                  <svg
                    className="w-6 h-6 text-green-500 flex-shrink-0 mt-0.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  <span className="text-gray-700">
                    <strong>Real-time dashboard</strong> to manage orders
                  </span>
                </li>
                <li className="flex items-start space-x-3">
                  <svg
                    className="w-6 h-6 text-green-500 flex-shrink-0 mt-0.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  <span className="text-gray-700">
                    <strong>Marketing support</strong> and promotions
                  </span>
                </li>
              </ul>

              <button
                onClick={() => handlePartnerClick('restaurant')}
                className="w-full bg-[#FF3B30] text-white py-4 rounded-xl font-semibold hover:bg-[#e63329] transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                Register as Partner
              </button>
            </div>
          </div>

          {/* Delivery Rider Card */}
          <div className="group bg-white rounded-2xl shadow-xl overflow-hidden hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2">
            <div className="relative h-64 overflow-hidden bg-gradient-to-br from-[#FFC107] to-[#ffb300]">
              {/* Background Pattern */}
              <div className="absolute inset-0 opacity-10">
                <div className="absolute top-0 right-0 w-40 h-40 bg-white rounded-full translate-x-1/2 -translate-y-1/2"></div>
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-white rounded-full -translate-x-1/3 translate-y-1/3"></div>
              </div>

              {/* Content */}
              <div className="relative h-full flex flex-col items-center justify-center text-white p-8">
                <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <svg
                    className="w-10 h-10"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 10V3L4 14h7v7l9-11h-7z"
                    />
                  </svg>
                </div>
                <h3 className="text-3xl font-bold mb-2">Delivery Rider</h3>
                <p className="text-white/90 text-center">Earn on your own schedule</p>
              </div>
            </div>

            <div className="p-8">
              <ul className="space-y-4 mb-8">
                <li className="flex items-start space-x-3">
                  <svg
                    className="w-6 h-6 text-green-500 flex-shrink-0 mt-0.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  <span className="text-gray-700">
                    <strong>Flexible hours</strong> - Work when you want
                  </span>
                </li>
                <li className="flex items-start space-x-3">
                  <svg
                    className="w-6 h-6 text-green-500 flex-shrink-0 mt-0.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  <span className="text-gray-700">
                    Earn up to <strong>₹30,000/month</strong>
                  </span>
                </li>
                <li className="flex items-start space-x-3">
                  <svg
                    className="w-6 h-6 text-green-500 flex-shrink-0 mt-0.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  <span className="text-gray-700">
                    <strong>Weekly payouts</strong> directly to your account
                  </span>
                </li>
                <li className="flex items-start space-x-3">
                  <svg
                    className="w-6 h-6 text-green-500 flex-shrink-0 mt-0.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  <span className="text-gray-700">
                    <strong>Insurance coverage</strong> included
                  </span>
                </li>
              </ul>

              <button
                onClick={() => handlePartnerClick('rider')}
                className="w-full bg-[#FFC107] text-gray-900 py-4 rounded-xl font-semibold hover:bg-[#ffb300] transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                Register as Rider
              </button>
            </div>
          </div>
        </div>

        {/* Stats Section */}
        <div className="mt-16 bg-gradient-to-r from-[#FF3B30] to-[#FFC107] rounded-2xl p-8 md:p-12 text-white">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold mb-2">1000+</div>
              <div className="text-white/90">Partner Restaurants</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">5000+</div>
              <div className="text-white/90">Active Riders</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">50K+</div>
              <div className="text-white/90">Daily Orders</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">100+</div>
              <div className="text-white/90">Cities</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PartnerSection;
