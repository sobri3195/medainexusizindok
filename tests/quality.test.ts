import test from 'node:test';
import assert from 'node:assert/strict';
import {backupSchema,evaluateRules,generateCases,summarize} from '../src/lib/data.ts';

test('KPI counts unique claims and calculates median review time',()=>{const rows=generateCases(5);rows.push({...rows[0]});const kpi=summarize(rows);assert.equal(kpi.total,5);assert.equal(kpi.episodes,3);assert.equal(kpi.median,32)});

test('rule engine emits explicit, non-colour reason codes',()=>{assert.deepEqual(evaluateRules({riskScore:80,evidenceStatus:'Sebagian',reasonCodes:['DUPLICATE_PRACTITIONER']}),{hits:['HIGH_RISK','EVIDENCE_GAP','PRACTITIONER_CONFLICT'],needsHumanReview:true});assert.equal(evaluateRules({riskScore:10,evidenceStatus:'Lengkap',reasonCodes:[]}).needsHumanReview,false)});

test('backup schema accepts safe synthetic data and rejects unsafe identifiers',()=>{const base={format:'medai-local-v1' as const,exportedAt:'2026-08-29T12:00:00.000Z',cases:[{id:'CLM-SYN-1',claimId:'CLM-SYN-1',episodeId:'EPS-SYN-1'}],audits:[],meta:[]};assert.equal(backupSchema.safeParse(base).success,true);assert.equal(backupSchema.safeParse({...base,cases:[{id:'x',claimId:'REAL-123',episodeId:'EPS-SYN-1'}]}).success,false)});
