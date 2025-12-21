import { useNavigate } from 'react-router-dom';

const AboutUs = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 pt-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          className="mb-6 flex items-center text-[#FF3B30] hover:text-[#e63329] transition-colors"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back
        </button>

        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            About <span className="text-[#FF3B30]">Big</span><span className="text-[#FFC107]">Bite</span>
          </h1>
          <p className="text-xl text-gray-600">
            Delivering happiness, one meal at a time
          </p>
        </div>

        {/* Content */}
        <div className="bg-white rounded-2xl shadow-lg p-8 space-y-8">
          {/* Our Story */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Our Story</h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              BigBite was founded with a simple mission: to connect food lovers with their favorite restaurants 
              and deliver delicious meals right to their doorstep. What started as a small idea has grown into 
              a thriving platform serving thousands of customers daily.
            </p>
            <p className="text-gray-600 leading-relaxed">
              We believe that everyone deserves access to great food, whether it's a quick lunch, a family dinner, 
              or a late-night snack. That's why we've partnered with the best restaurants in your area to bring 
              you a diverse selection of cuisines and dishes.
            </p>
          </section>

          {/* What We Do */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">What We Do</h2>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center p-6 bg-gradient-to-br from-orange-50 to-red-50 rounded-xl">
                <div className="w-16 h-16 bg-[#FF3B30] rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <h3 className="font-semibold text-lg mb-2">Easy Ordering</h3>
                <p className="text-gray-600 text-sm">
                  Browse menus, place orders, and track deliveries all in one place
                </p>
              </div>
              <div className="text-center p-6 bg-gradient-to-br from-yellow-50 to-orange-50 rounded-xl">
                <div className="w-16 h-16 bg-[#FFC107] rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="font-semibold text-lg mb-2">Fast Delivery</h3>
                <p className="text-gray-600 text-sm">
                  Get your food delivered hot and fresh within 25-30 minutes
                </p>
              </div>
              <div className="text-center p-6 bg-gradient-to-br from-red-50 to-pink-50 rounded-xl">
                <div className="w-16 h-16 bg-gradient-to-r from-[#FF3B30] to-[#FFC107] rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                  </svg>
                </div>
                <h3 className="font-semibold text-lg mb-2">Quality Service</h3>
                <p className="text-gray-600 text-sm">
                  We ensure the highest standards of food quality and customer service
                </p>
              </div>
            </div>
          </section>

          {/* Our Values */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Our Values</h2>
            <div className="space-y-4">
              <div className="flex items-start">
                <div className="w-8 h-8 bg-[#FF3B30] rounded-full flex items-center justify-center mr-4 mt-1 flex-shrink-0">
                  <span className="text-white font-bold">✓</span>
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-1">Customer First</h3>
                  <p className="text-gray-600">Your satisfaction is our top priority. We're always here to help.</p>
                </div>
              </div>
              <div className="flex items-start">
                <div className="w-8 h-8 bg-[#FF3B30] rounded-full flex items-center justify-center mr-4 mt-1 flex-shrink-0">
                  <span className="text-white font-bold">✓</span>
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-1">Quality Matters</h3>
                  <p className="text-gray-600">We partner only with restaurants that meet our high standards.</p>
                </div>
              </div>
              <div className="flex items-start">
                <div className="w-8 h-8 bg-[#FF3B30] rounded-full flex items-center justify-center mr-4 mt-1 flex-shrink-0">
                  <span className="text-white font-bold">✓</span>
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-1">Community Support</h3>
                  <p className="text-gray-600">We support local restaurants and create opportunities for riders.</p>
                </div>
              </div>
            </div>
          </section>

          {/* Contact */}
          <section className="bg-gradient-to-r from-[#FF3B30] to-[#FFC107] rounded-xl p-8 text-white">
            <h2 className="text-2xl font-bold mb-4">Get in Touch</h2>
            <p className="mb-4">Have questions or feedback? We'd love to hear from you!</p>
            <div className="space-y-2">
              <p className="flex items-center">
                <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                bharatkumar19030@gmail.com
              </p>
              <p className="flex items-center">
                <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                +91 9729024316
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default AboutUs;
