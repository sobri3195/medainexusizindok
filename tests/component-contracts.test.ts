import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
const app=readFileSync('src/App.tsx','utf8'),ui=readFileSync('src/components/ui.tsx','utf8'),login=readFileSync('src/pages/DesktopLogin.tsx','utf8');
test('critical mobile and review workflows are routed',()=>{for(const path of ['activity','therapy','referral','account','queue','permit/:claimId','comparison'])assert.match(app,new RegExp(`path=\\"${path.replace(/[/:]/g,'\\$&')}\\"`))});
test('modal and form errors expose accessible semantics',()=>{assert.match(ui,/aria-modal="true"/);assert.match(ui,/aria-live="polite"/);assert.match(login,/role="alert"/);assert.match(login,/aria-invalid/)});
