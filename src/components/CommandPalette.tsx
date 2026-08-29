import {useEffect,useMemo,useState} from 'react';
import {FileSearch,Search} from 'lucide-react';
import {useLocation,useNavigate} from 'react-router-dom';
import {cases} from '../lib/data';
import {Input,Modal} from './ui';

const destinations=[
  {label:'Beranda publik',detail:'Website',path:'/'},
  {label:'Aplikasi pasien',detail:'Mobile',path:'/apps'},
  {label:'Ringkasan workbench',detail:'Desktop',path:'/desktop'},
  {label:'Antrian izin',detail:'Workflow',path:'/desktop/queue'},
  {label:'CAPD Homecare',detail:'Modul',path:'/desktop/capd'},
  {label:'PRB Farmasi',detail:'Modul',path:'/desktop/pharmacy'},
  {label:'Konflik DPJP',detail:'Modul',path:'/desktop/dpjp'},
  {label:'Pengaturan data demo',detail:'Privasi & data',path:'/desktop/settings'},
];

export function CommandPalette(){
  const [open,setOpen]=useState(false),[query,setQuery]=useState(''),[active,setActive]=useState(0);
  const nav=useNavigate(),location=useLocation();
  useEffect(()=>{const fn=(e:KeyboardEvent)=>{if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='k'){e.preventDefault();setOpen(x=>!x)}};addEventListener('keydown',fn);return()=>removeEventListener('keydown',fn)},[]);
  useEffect(()=>setOpen(false),[location.pathname]);
  const results=useMemo(()=>{const q=query.trim().toLowerCase();const pages=destinations.filter(x=>!q||`${x.label} ${x.detail}`.toLowerCase().includes(q));const found=q?cases.filter(x=>[x.claimId,x.permitId,x.participantDisplayName,x.participantToken,x.facilityName].join(' ').toLowerCase().includes(q)).slice(0,6).map(x=>({label:x.permitId,detail:`${x.participantDisplayName} · ${x.facilityName}`,path:`/desktop/permit/${x.claimId}`})):[];return [...found,...pages].slice(0,9)},[query]);
  useEffect(()=>setActive(0),[query]);
  const go=(path:string)=>{nav(path);setQuery('');setOpen(false)};
  const keys=(e:React.KeyboardEvent)=>{if(e.key==='ArrowDown'){e.preventDefault();setActive(x=>Math.min(results.length-1,x+1))}if(e.key==='ArrowUp'){e.preventDefault();setActive(x=>Math.max(0,x-1))}if(e.key==='Enter'&&results[active])go(results[active].path)};
  return <Modal open={open} onClose={()=>setOpen(false)} title="Pencarian global"><div role="combobox" aria-expanded="true" aria-controls="global-search-results" aria-haspopup="listbox" className="relative"><Search className="pointer-events-none absolute left-3 top-3 text-slate-400" size={19}/><Input value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={keys} className="pl-10" placeholder="Cari izin, pasien sintetis, fasilitas, atau halaman…" aria-label="Pencarian global" aria-activedescendant={results[active]?`search-${active}`:undefined}/></div><div id="global-search-results" role="listbox" className="mt-3 max-h-[min(24rem,55vh)] space-y-1 overflow-auto">{results.map((item,i)=><button id={`search-${i}`} role="option" aria-selected={active===i} key={`${item.path}-${i}`} onMouseEnter={()=>setActive(i)} onClick={()=>go(item.path)} className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left ${active===i?'bg-blue-50 text-medical-600 dark:bg-blue-950':'hover:bg-slate-100 dark:hover:bg-slate-800'}`}><FileSearch size={18}/><span className="min-w-0"><b className="block text-sm">{item.label}</b><span className="block truncate text-xs text-slate-500">{item.detail}</span></span></button>)}{results.length===0&&<p className="py-8 text-center text-sm text-slate-500">Tidak ada hasil. Periksa ejaan atau coba ID lain.</p>}</div><p className="mt-3 border-t pt-3 text-xs text-slate-500"><kbd>↑</kbd> <kbd>↓</kbd> navigasi · <kbd>Enter</kbd> buka · <kbd>Esc</kbd> tutup</p></Modal>
}
