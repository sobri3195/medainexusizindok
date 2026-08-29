import Dexie, { type EntityTable } from 'dexie'

export type CaseStatus='Lolos'|'Pending bukti'|'Perlu review'|'Dalam antrian'
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
const diagnoses=['J18.9','E11.9','N18.5','I10','Z49.2']; const procedures=['89.03','54.98','99.17','87.44','93.90']; const meds=['MED-SYN-A12','MED-SYN-B07','MED-SYN-C31','MED-SYN-D04']
export const facilities=['RS Sehat Sentosa','RSUD Harapan','Klinik Medika Utama']; export const reviewers=['Belum ditugaskan','dr. Rani (Demo)','Verifikator B (Demo)','Tim Klinis (Demo)']
export const modules:ModuleName[]=['CAPD Homecare','PRB Farmasi','Konflik DPJP','Medical Necessity','Rujukan']
export const reasons=['DOC_MISSING','CLINICAL_MISMATCH','DUPLICATE_PRACTITIONER','FORMULARY_CHECK','REFERRAL_SEQUENCE']
const statusFor=(i:number):CaseStatus=>i<74?'Lolos':i<96?'Pending bukti':i<116?'Perlu review':'Dalam antrian'
const iso=(i:number,h=8)=>new Date(Date.UTC(2026,7,29-(i%28),h,i%60)).toISOString()
export const cases:ClaimCase[]=Array.from({length:128},(_,i)=>{const status=statusFor(i), riskScore=status==='Lolos'?18+i%24:status==='Dalam antrian'?62+i%29:45+i%46;const reason=reasons[(i*3)%reasons.length];return {
  id:`CLM-SYN-26-${String(i+1).padStart(4,'0')}`,claimId:`CLM-SYN-26-${String(i+1).padStart(4,'0')}`,permitId:`IZN-2608-${String(i+1).padStart(3,'0')}`,episodeId:`EPS-SYN-${String(Math.floor(i/2)+1).padStart(4,'0')}`,prescriptionId:i%3===0?`RX-SYN-${String(i+1).padStart(4,'0')}`:undefined,
  participantToken:`SYN-P-${String(142+i).padStart(6,'0')}`,participantDisplayName:`${i%2?'Tn.':'Ny.'} Demo ${String.fromCharCode(65+i%20)}`,
  facilityId:`FAC-SYN-0${i%3+1}`,facilityName:facilities[i%3],practitionerId:`PRC-SYN-${String(i%12+1).padStart(3,'0')}`,practitionerName:`dr. Klinisi ${String.fromCharCode(65+i%12)} (Demo)`,module:modules[i%5],serviceDate:iso(i).slice(0,10),
  diagnosisCode:diagnoses[i%5],procedureCode:procedures[(i*2)%5],medicationCode:meds[i%4],referralNumber:`REF-SYN-${String(3000+i).padStart(6,'0')}`,controlLetterNumber:`SKDP-SYN-${String(5000+i).padStart(6,'0')}`,
  evidenceStatus:i%7===0?'Tidak ada':i%3===0?'Sebagian':'Lengkap',riskScore,riskLevel:riskScore>=70?'Tinggi':riskScore>=40?'Sedang':'Rendah',reasonCodes:[reason,...(i%4===0?[reasons[(i+1)%5]]:[])],ruleHits:[`RULE-${(i%7)+1}`,...(i%4===0?[`RULE-${(i%5)+8}`]:[])],workflowStatus:status,reviewer:reviewers[i%4],createdAt:iso(i,7),updatedAt:iso(i,9),
  auditEvents:[{id:`AUD-${i}-1`,at:iso(i,7),actor:'Mesin aturan lokal',action:'Kasus dibuat',reason:`${i%4===0?2:1} rule hit terdeteksi`},{id:`AUD-${i}-2`,at:iso(i,9),actor:'Sistem',action:'Masuk workflow',reason:'Keputusan otomatis hanya rekomendasi; bukan penolakan final'}],
  evidence:[{id:`EV-${i}-1`,name:'Ringkasan medis sintetis.pdf',type:'application/pdf',status:i%7===0?'Belum ada':'Tersedia',updatedAt:iso(i,8)},{id:`EV-${i}-2`,name:'Hasil pemeriksaan demo.jpg',type:'image/jpeg',status:i%3===0?'Kurang':'Tersedia',updatedAt:iso(i,8)}]
}})
export function summarize(source:ClaimCase[]){const unique=[...new Map(source.map(x=>[x.claimId,x])).values()];const count=(s:CaseStatus)=>unique.filter(x=>x.workflowStatus===s).length;const episodes=new Set(unique.map(x=>x.episodeId)).size;const prescriptions=new Set(unique.flatMap(x=>x.prescriptionId?[x.prescriptionId]:[])).size;const evidence=unique.reduce((n,x)=>n+x.evidence.length,0);return {total:unique.length,lolos:count('Lolos'),pending:count('Pending bukti'),review:count('Perlu review')+count('Dalam antrian'),median:42,episodes,prescriptions,evidence}}
export const weeklyTrend=['Sen','Sel','Rab','Kam','Jum','Sab','Min'].map((day,i)=>({day,lolos:cases.filter((x,n)=>n%7===i&&x.workflowStatus==='Lolos').length,pending:cases.filter((x,n)=>n%7===i&&x.workflowStatus==='Pending bukti').length,review:cases.filter((x,n)=>n%7===i&&['Perlu review','Dalam antrian'].includes(x.workflowStatus)).length}))
export const db=new Dexie('IzinDokLocal') as Dexie & {cases:EntityTable<ClaimCase,'id'>}
db.version(3).stores({cases:'id,claimId,permitId,episodeId,workflowStatus,updatedAt,facilityName,module,reviewer,serviceDate,riskLevel'}).upgrade(tx=>tx.table('cases').clear().then(()=>tx.table('cases').bulkAdd(cases)))
export async function seedDatabase(){if(await db.cases.count()===0)await db.cases.bulkAdd(cases)}
export const rupiah=(n:number)=>new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(n)
