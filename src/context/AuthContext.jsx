// import { response } from 'express'
import { createContext,useState,useEffect,useContext } from 'react' 
import toast from 'react-hot-toast'

const AuthContext=createContext()
export const useAuth=()=>{return useContext(AuthContext)}
export const AuthProvider=({children})=>{
    const [user, setuser] = useState(null)
    const [loading, setLoading] = useState(true);
    const [showLoginModal, setShowLoginModal] = useState(false);
    const [showSignupModal, setShowSignupModal] = useState(false);
    const [showKitchenDetailsModal, setShowKitchenDetailsModal] = useState(false);
    const SERVER_URL=import.meta.env.VITE_SERVER_URL||"http://localhost:5000"
    useEffect(() => {
      // Check for token in URL hash (from Google OAuth)
      const hash = window.location.hash;
      if (hash && hash.includes('token=')) {
        const token = hash.split('token=')[1];
        if (token) {
          localStorage.setItem('bigbite_token', token);
          // Clean up the URL
          window.history.replaceState(null, null, window.location.pathname);
        }
      }
      checkAuth()
    }, [])
    const checkAuth=async()=>{
        try{
            const token = localStorage.getItem('bigbite_token');
            const headers = {
                'Content-Type': 'application/json',
            };
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }
            const res=await fetch(`${SERVER_URL}/api/auth/me`,{
                credentials:"include",
                headers,
            })
            if(res.ok){
                const data=await res.json()
                setuser(data.user)
            }
            else{
                setuser(null)
            }
        }catch(error){
            // Silently fail - user is not logged in
            // toast.error("Error checking authentication")
            setuser(null)
        }finally{
            setLoading(false)
        }
    }
    const logout=async()=>{
        try{
        await fetch(`${SERVER_URL}/api/auth/logout`,{
            method:"POST",
            credentials:"include",
        })
        setuser(null)
        localStorage.removeItem('bigbite_token');
    }catch(err){
        console.error("Logout failed:",err)
    }

    }
    const isAuthenticated = !!user; //!!user means if user is not null then true else false
    
    return (
        <AuthContext.Provider value={{user,setuser,loading,checkAuth,logout,isAuthenticated,showLoginModal,setShowLoginModal,showSignupModal,setShowSignupModal,showKitchenDetailsModal,setShowKitchenDetailsModal}}>
        {children}
        </AuthContext.Provider>
    )
}