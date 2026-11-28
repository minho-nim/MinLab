import { defineConfig } from 'vite'
import {readFile} from 'node:fs/promises'
// HTML links outside this root resolve to /name.css in development. Serve only
// these shared styles; production builds bundle the relative source normally.
const styles=new Map([['/explorer.css',new URL('../explorer.css',import.meta.url)],['/balanced.css',new URL('../balanced.css',import.meta.url)]])
export default defineConfig({base:'./',plugins:[{name:'minfolder-shared-styles',configureServer(server){
  server.middlewares.use(async(req,res,next)=>{
    const file=styles.get(req.url?.split('?')[0]);if(!file)return next()
    try{res.setHeader('Content-Type','text/css; charset=utf-8');res.setHeader('Cache-Control','no-cache');res.end(await readFile(file))}catch(error){next(error)}
  })
}}],build:{target:'es2022',outDir:'../desktop-dist',emptyOutDir:true},server:{fs:{allow:['..']}}})
