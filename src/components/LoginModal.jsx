import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

const Login = () => {
  const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:5000';
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const { checkAuth, setShowLoginModal, setShowSignupModal } = useAuth();
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await fetch(`${SERVER_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
        }),
      });

      if (!result.ok) {
        const errorData = await result.json();
        throw new Error(errorData.message || 'Login failed');
      }

      const data = await result.json();

      // Store token in localStorage
      if (data.token) {
        localStorage.setItem('bigbite_token', data.token);
      }

      toast.success('Login successful!');
      await checkAuth();
      setShowLoginModal(false);
    } catch (err) {
      toast.error(err.message || 'Login failed');
    }
    setLoading(false);
  };

  const switchToSignup = () => {
    setShowLoginModal(false);
    setShowSignupModal(true);
  };

  return (
    <AnimatePresence>
      {/* Overlay Background */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={() => setShowLoginModal(false)}
        className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      >
        
        {/* Modal Content */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          onClick={(e) => e.stopPropagation()}
          className="relative bg-white rounded-2xl shadow-2xl  w-full max-w-md max-h-[90vh] overflow-y-auto scrollbar-hide"
        >
          <div className='bg-gradient-to-r from-red-500 to-amber-400 h-2 w-full overflow-hidden'>
            <div className={`bg-gradient-to-r from-transparent via-white to-transparent w-full h-full transition-transform duration-5000 ease-in-out ${loading || googleLoading ? 'animate-slide' : '-translate-x-full'}`}></div>
          </div>
          <div className='p-8'>
          {/* Close Button */}
          <button
            onClick={() => setShowLoginModal(false)}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition cursor-pointer"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-dark mb-2">
              <span className="text-primary">Big</span>
              <span className="text-amber-400">Bite</span>
            </h1>
            <p className="text-gray-600 poppins-regular mt-2">Welcome back! </p>
          </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-dark mb-2">Email</label>
            <div className="relative">
              {/* <FaEnvelope className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" /> */}
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="input-field pl-10"
                placeholder="your@email.com"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-dark mb-2">Password</label>
            <div className="relative">
              {/* <FaLock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" /> */}
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className="input-field pl-10"
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          {/* <div className="flex items-center justify-between">
            <label className="flex items-center">
              <input type="checkbox" className="mr-2" />
              <span className="text-sm text-gray-600">Remember me</span>
            </label>
            <a href="#" className="text-sm text-primary hover:underline">
              Forgot password?
            </a>
          </div> */}

          <button
            type="submit"
            disabled={loading}
            className={`${loading?'bg-red-400 cursor-not-allowed':`bg-red-500 hover:bg-red-600 cursor-pointer`} w-full text-white font-semibold py-3 rounded-lg shadow-md transition duration-300 `}
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        {/* Divider */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300"></div> 
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500">Or continue with</span>
          </div>
        </div>

        {/* Google OAuth Button */}
        <button
          onClick={() => {
            setGoogleLoading(true);
            window.location.href = `${SERVER_URL}/api/auth/google?redirect=${encodeURIComponent(window.location.pathname)}`;
          }}
          disabled={googleLoading || loading}
          className={`${googleLoading || loading ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:bg-gray-50 hover:shadow-md'} w-full flex items-center justify-center gap-3 px-4 py-3 border border-gray-300 rounded-lg transition duration-300 shadow-sm`}
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          <span className="font-medium text-gray-700">{googleLoading ? 'Redirecting to Google...' : 'Continue with Google'}</span>
        </button>

        <div className="mt-6 text-center ">
          <p className="text-gray-600">
            Don't have an account?{' '}
            <button 
              onClick={switchToSignup}
              className="text-primary font-semibold hover:underline cursor-pointer"
            >
              Sign up
            </button>
          </p>
        </div>

        </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default Login;
