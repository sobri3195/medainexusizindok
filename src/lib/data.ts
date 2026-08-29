import Dexie, { type EntityTable } from 'dexie'

export type CaseStatus='Lolos'|'Pending bukti'|'Perlu review'
export type ModuleName='CAPD Homecare'|'PRB Farmasi'|'Konflik DPJP'|'Medical Necessity'|'Rujukan'
export interface ClaimCase {id:string;patient:string;diagnosis:string;unit:string;facility:string;module:ModuleName;reason:string;value:number;score:number;status:CaseStatus;updated:string;reviewMinutes:number;priority:'Tinggi'|'Sedang'|'Rendah'}

const diagnoses=['Pneumonia, unspecified','Diabetes mellitus tipe 2','Dengue haemorrhagic fever','Essential hypertension','Chronic kidney disease']
const units=['Rawat Inap','Poli Penyakit Dalam','Rawat Inap Anak','Rawat Jalan','Unit CAPD']
export const facilities=['RS Sehat Sentosa','RSUD Harapan','Klinik Medika Utama']
export const modules:ModuleName[]=['CAPD Homecare','PRB Farmasi','Konflik DPJP','Medical Necessity','Rujukan']
export const reasons=['Dokumen belum lengkap','Indikasi klinis','Duplikasi DPJP','Kesesuaian formularium','Rujukan berjenjang']
const statusFor=(i:number):CaseStatus=>i<91?'Lolos':i<115?'Pending bukti':'Perlu review'
export const cases:ClaimCase[]=Array.from({length:128},(_,i)=>({
  id:`IZN-2608-${String(i+1).padStart(3,'0')}`,patient:`${i%2?'Tn.':'Ny.'} ${String.fromCharCode(65+i%20)}-${String(100+i).slice(-3)}`,
  diagnosis:diagnoses[i%diagnoses.length],unit:units[i%units.length],facility:facilities[i%facilities.length],module:modules[i%modules.length],reason:reasons[(i*3)%reasons.length],
  value:1250000+(i%12)*735000,score:i<91?82+i%17:i<115?57+i%18:35+i%20,status:statusFor(i),
  updated:new Date(Date.UTC(2026,7,29-(i%28),8-(i%6),15)).toISOString(),reviewMinutes:18+(i*7)%79,priority:i>=115?'Tinggi':i>=91?'Sedang':'Rendah'
}))

export function summarize(source:ClaimCase[]){
  // Satu ID hanya boleh berkontribusi sekali agar total status selalu sama dengan kasus unik.
  const unique=[...new Map(source.map(item=>[item.id,item])).values()]
  const count=(status:CaseStatus)=>unique.filter(x=>x.status===status).length
  const sorted=unique.map(x=>x.reviewMinutes).sort((a,b)=>a-b)
  return {total:unique.length,lolos:count('Lolos'),pending:count('Pending bukti'),review:count('Perlu review'),median:sorted.length?sorted[Math.floor(sorted.length/2)]:0}
}
export const weeklyTrend=['Sen','Sel','Rab','Kam','Jum','Sab','Min'].map((day,i)=>({day,lolos:cases.filter((x,n)=>n%7===i&&x.status==='Lolos').length,pending:cases.filter((x,n)=>n%7===i&&x.status==='Pending bukti').length,review:cases.filter((x,n)=>n%7===i&&x.status==='Perlu review').length}))
export const db=new Dexie('IzinDokLocal') as Dexie & {cases:EntityTable<ClaimCase,'id'>}
db.version(2).stores({cases:'id,status,updated,facility,module'}).upgrade(()=>undefined)
export async function seedDatabase(){if(await db.cases.count()!==cases.length){await db.cases.clear();await db.cases.bulkAdd(cases)}}
export const rupiah=(n:number)=>new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(n)
