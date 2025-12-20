import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
// https://vite.dev/config/
export default defineConfig({
  plugins: [react(),tailwindcss()],
  server:{
    host:true,
    port:5173,
    allowedHosts:[
      'localhost',
      '.ngrok-free.app',
      '.ngrok-free.dev',
      '.ngrok.io',
      'megasporic-unbrought-janell.ngrok-free.dev'     

    ],
    hmr:{
      clientPort: process.env.NODE_ENV === 'production' ? 443 : 5173
    }
  }
})
