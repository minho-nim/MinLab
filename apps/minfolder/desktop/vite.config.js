import { defineConfig } from 'vite'
export default defineConfig({base:'./',build:{target:'es2022',outDir:'../desktop-dist',emptyOutDir:true},server:{fs:{allow:['..']}}})
