import { useNavigate } from 'react-router-dom';

const PrivacyPolicy = () => {
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
            Privacy Policy & Cookie Policy
          </h1>
          <p className="text-gray-600">
            Last updated: December 22, 2025
          </p>
        </div>

        {/* Content */}
        <div className="bg-white rounded-2xl shadow-lg p-8 space-y-8">
          {/* Introduction */}
          <section>
            <p className="text-gray-600 leading-relaxed">
              At BigBite, we are committed to protecting your privacy and ensuring the security of your personal information. 
              This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our 
              food delivery platform.
            </p>
          </section>

          {/* Information We Collect */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">1. Information We Collect</h2>
            
            <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-4">Personal Information</h3>
            <p className="text-gray-600 leading-relaxed mb-4">
              When you register or use our services, we may collect:
            </p>
            <ul className="list-disc list-inside text-gray-600 space-y-2 ml-4">
              <li>Name, email address, and phone number</li>
              <li>Delivery addresses</li>
              <li>Payment information (processed securely through third-party providers)</li>
              <li>Order history and preferences</li>
              <li>Profile picture (optional)</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-6">Location Information</h3>
            <p className="text-gray-600 leading-relaxed">
              We collect your location data to provide accurate delivery services, show nearby restaurants, 
              and calculate delivery fees. You can control location permissions through your device settings.
            </p>

            <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-6">Usage Information</h3>
            <p className="text-gray-600 leading-relaxed">
              We automatically collect information about your interactions with our platform, including:
            </p>
            <ul className="list-disc list-inside text-gray-600 space-y-2 ml-4 mt-2">
              <li>Device information (model, operating system, browser type)</li>
              <li>IP address and general location data</li>
              <li>Pages visited and features used</li>
              <li>Search queries and click patterns</li>
            </ul>
          </section>

          {/* How We Use Your Information */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">2. How We Use Your Information</h2>
            <p className="text-gray-600 leading-relaxed mb-4">We use your information to:</p>
            <ul className="list-disc list-inside text-gray-600 space-y-2 ml-4">
              <li>Process and deliver your orders</li>
              <li>Communicate about your orders and account</li>
              <li>Provide customer support</li>
              <li>Improve our services and user experience</li>
              <li>Send promotional offers and updates (with your consent)</li>
              <li>Prevent fraud and ensure platform security</li>
              <li>Comply with legal obligations</li>
            </ul>
          </section>

          {/* Information Sharing */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">3. Information Sharing</h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              We may share your information with:
            </p>
            <ul className="list-disc list-inside text-gray-600 space-y-2 ml-4">
              <li><strong>Restaurants:</strong> To fulfill your orders</li>
              <li><strong>Delivery Partners:</strong> To complete deliveries</li>
              <li><strong>Payment Processors:</strong> To process transactions securely</li>
              <li><strong>Service Providers:</strong> Who assist in operating our platform</li>
              <li><strong>Law Enforcement:</strong> When required by law or to protect our rights</li>
            </ul>
            <p className="text-gray-600 leading-relaxed mt-4">
              We do not sell your personal information to third parties for marketing purposes.
            </p>
          </section>

          {/* Cookie Policy */}
          <section className="bg-gradient-to-br from-orange-50 to-yellow-50 rounded-xl p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">4. Cookie Policy</h2>
            
            <h3 className="text-xl font-semibold text-gray-800 mb-3">What Are Cookies?</h3>
            <p className="text-gray-600 leading-relaxed mb-4">
              Cookies are small text files stored on your device when you visit our website. They help us 
              provide a better experience and understand how you use our platform.
            </p>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">Types of Cookies We Use</h3>
            <ul className="list-disc list-inside text-gray-600 space-y-2 ml-4">
              <li><strong>Essential Cookies:</strong> Required for basic website functionality</li>
              <li><strong>Performance Cookies:</strong> Help us understand how visitors use our site</li>
              <li><strong>Functionality Cookies:</strong> Remember your preferences and settings</li>
              <li><strong>Authentication Cookies:</strong> Keep you logged in during your session</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-4">Managing Cookies</h3>
            <p className="text-gray-600 leading-relaxed">
              You can control cookies through your browser settings. However, disabling certain cookies 
              may affect the functionality of our platform.
            </p>
          </section>

          {/* Data Security */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">5. Data Security</h2>
            <p className="text-gray-600 leading-relaxed">
              We implement industry-standard security measures to protect your information, including:
            </p>
            <ul className="list-disc list-inside text-gray-600 space-y-2 ml-4 mt-4">
              <li>Encryption of sensitive data during transmission</li>
              <li>Secure authentication systems</li>
              <li>Regular security audits and updates</li>
              <li>Limited access to personal information</li>
            </ul>
            <p className="text-gray-600 leading-relaxed mt-4">
              While we take reasonable steps to protect your information, no system is completely secure. 
              Please use strong passwords and keep your account credentials confidential.
            </p>
          </section>

          {/* Your Rights */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">6. Your Rights</h2>
            <p className="text-gray-600 leading-relaxed mb-4">You have the right to:</p>
            <ul className="list-disc list-inside text-gray-600 space-y-2 ml-4">
              <li>Access your personal information</li>
              <li>Correct inaccurate or incomplete data</li>
              <li>Request deletion of your account and data</li>
              <li>Opt-out of promotional communications</li>
              <li>Withdraw consent for data processing</li>
              <li>Export your data in a portable format</li>
            </ul>
            <p className="text-gray-600 leading-relaxed mt-4">
              To exercise these rights, contact us at bharatkumar19030@gmail.com
            </p>
          </section>

          {/* Data Retention */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">7. Data Retention</h2>
            <p className="text-gray-600 leading-relaxed">
              We retain your personal information for as long as necessary to provide our services, 
              comply with legal obligations, resolve disputes, and enforce our agreements. When you 
              delete your account, we will remove or anonymize your personal information within 90 days, 
              except where we are required to retain it by law.
            </p>
          </section>

          {/* Children's Privacy */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">8. Children's Privacy</h2>
            <p className="text-gray-600 leading-relaxed">
              Our services are not intended for children under 13 years of age. We do not knowingly 
              collect personal information from children. If you believe we have collected information 
              from a child, please contact us immediately.
            </p>
          </section>

          {/* Changes to Policy */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">9. Changes to This Policy</h2>
            <p className="text-gray-600 leading-relaxed">
              We may update this Privacy Policy from time to time. We will notify you of significant 
              changes by posting the new policy on our platform and updating the "Last updated" date. 
              Your continued use of our services after changes indicates acceptance of the updated policy.
            </p>
          </section>

          {/* Contact */}
          <section className="bg-gradient-to-r from-[#FF3B30] to-[#FFC107] rounded-xl p-8 text-white">
            <h2 className="text-2xl font-bold mb-4">10. Contact Us</h2>
            <p className="mb-4">
              If you have questions or concerns about this Privacy Policy or our data practices, 
              please contact us:
            </p>
            <div className="space-y-2">
              <p className="flex items-center">
                <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Email: bharatkumar19030@gmail.com
              </p>
              <p className="flex items-center">
                <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                Phone: +91 9729024316
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
