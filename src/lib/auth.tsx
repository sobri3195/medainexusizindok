import {createContext,useContext,useEffect,useState,type ReactNode} from 'react'

export const roles=['DPJP','Perawat CAPD','Apoteker FKTP','Verifikator','Komite Medik','Admin Demo'] as const
export type DemoRole=typeof roles[number]
export interface DemoSession{role:DemoRole;name:string;expiresAt:number}
export const DEMO_PASSWORD='demo123'
const KEY='izin-dok-demo-session',TIMEOUT=30*60*1000
const names:Record<DemoRole,string>={'DPJP':'dr. Ratna Wibowo','Perawat CAPD':'Ns. Maya Putri','Apoteker FKTP':'apt. Rafi Akbar','Verifikator':'Dina Prameswari','Komite Medik':'dr. Bima Santoso','Admin Demo':'Admin Workspace'}
export const permissions:Record<DemoRole,string[]>={
  DPJP:['Ringkasan','Antrian Izin','Detail Izin','Konflik DPJP','Medical Necessity','Rujukan'],
  'Perawat CAPD':['Ringkasan','Antrian Izin','Detail Izin','CAPD Homecare'],
  'Apoteker FKTP':['Ringkasan','Antrian Izin','Detail Izin','PRB Farmasi'],
  Verifikator:['Ringkasan','Antrian Izin','Detail Izin','CAPD Homecare','PRB Farmasi','Konflik DPJP','Medical Necessity','Rujukan','Audit Trail','Risk Engine','Laporan','Metric Dictionary'],
  'Komite Medik':['Ringkasan','Antrian Izin','Detail Izin','Konflik DPJP','Medical Necessity','Audit Trail','Risk Engine','Laporan','Metric Dictionary'],
  'Admin Demo':['Ringkasan','Antrian Izin','Detail Izin','CAPD Homecare','PRB Farmasi','Konflik DPJP','Medical Necessity','Rujukan','Audit Trail','Risk Engine','Laporan','Metric Dictionary','Pengaturan Demo']}
type Auth={session:DemoSession|null;login:(r:DemoRole,p:string)=>boolean;logout:()=>void;switchRole:(r:DemoRole)=>void}
const C=createContext<Auth|null>(null)
const read=():DemoSession|null=>{try{const s=JSON.parse(localStorage.getItem(KEY)||'null');return s?.expiresAt>Date.now()?s:null}catch{return null}}
export function DemoAuthProvider({children}:{children:ReactNode}){const [session,setSession]=useState<DemoSession|null>(read);const save=(s:DemoSession|null)=>{setSession(s);if(s)localStorage.setItem(KEY,JSON.stringify(s));else localStorage.removeItem(KEY)};useEffect(()=>{const timer=setInterval(()=>{if(session&&session.expiresAt<=Date.now())save(null)},1000);return()=>clearInterval(timer)},[session]);const login=(role:DemoRole,password:string)=>{if(password!==DEMO_PASSWORD)return false;save({role,name:names[role],expiresAt:Date.now()+TIMEOUT});return true};const switchRole=(role:DemoRole)=>save({role,name:names[role],expiresAt:Date.now()+TIMEOUT});return <C.Provider value={{session,login,logout:()=>save(null),switchRole}}>{children}</C.Provider>}
export const useDemoAuth=()=>{const x=useContext(C);if(!x)throw new Error('DemoAuthProvider missing');return x}
