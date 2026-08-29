import Dexie, { type EntityTable } from 'dexie'
export type CaseStatus='Lolos'|'Pending bukti'|'Perlu review'
export interface ClaimCase { id:string; patient:string; diagnosis:string; unit:string; value:number; score:number; status:CaseStatus; updated:string }
export const cases:ClaimCase[]=[
{id:'CLM-260829-014',patient:'Ny. S-014',diagnosis:'Pneumonia, unspecified',unit:'Rawat Inap',value:12450000,score:92,status:'Lolos',updated:'2026-08-29T08:15:00Z'},
{id:'CLM-260829-011',patient:'Tn. R-208',diagnosis:'Diabetes mellitus tipe 2',unit:'Poli Penyakit Dalam',value:3875000,score:68,status:'Pending bukti',updated:'2026-08-29T07:42:00Z'},
{id:'CLM-260828-087',patient:'An. M-033',diagnosis:'Dengue haemorrhagic fever',unit:'Rawat Inap Anak',value:8230000,score:44,status:'Perlu review',updated:'2026-08-28T16:20:00Z'},
{id:'CLM-260828-071',patient:'Ny. A-119',diagnosis:'Essential hypertension',unit:'Rawat Jalan',value:1260000,score:86,status:'Lolos',updated:'2026-08-28T14:08:00Z'}]
export const trend=[{day:'Sen',lolos:72,review:18},{day:'Sel',lolos:78,review:16},{day:'Rab',lolos:74,review:21},{day:'Kam',lolos:83,review:14},{day:'Jum',lolos:88,review:12},{day:'Sab',lolos:91,review:9}]
export const db=new Dexie('IzinDokLocal') as Dexie & { cases:EntityTable<ClaimCase,'id'> }
db.version(1).stores({cases:'id,status,updated'})
export async function seedDatabase(){if(await db.cases.count()===0) await db.cases.bulkAdd(cases)}
export const rupiah=(n:number)=>new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(n)
