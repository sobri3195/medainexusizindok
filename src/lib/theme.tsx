import {createContext,useContext,useEffect,useState,type ReactNode} from 'react'
const ThemeContext=createContext({dark:false,toggle:()=>{}})
export function ThemeProvider({children}:{children:ReactNode}){const [dark,setDark]=useState(()=>localStorage.getItem('medai-theme')==='dark');useEffect(()=>{document.documentElement.classList.toggle('dark',dark);localStorage.setItem('medai-theme',dark?'dark':'light')},[dark]);return <ThemeContext.Provider value={{dark,toggle:()=>setDark(x=>!x)}}>{children}</ThemeContext.Provider>}
export const useTheme=()=>useContext(ThemeContext)
