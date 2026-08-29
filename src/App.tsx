import {lazy,Suspense,type ComponentType} from 'react'
import {Route,Routes} from 'react-router-dom'
import {CommandPalette} from './components/CommandPalette'
import {Skeleton} from './components/ui'
import {DesktopLayout,MobileLayout,PublicLayout} from './layouts/Shells'
import {DemoAuthProvider} from './lib/auth'

const Landing=lazy(()=>import('./pages/Landing'))
const Desktop=lazy(()=>import('./pages/Desktop'))
const DesktopLogin=lazy(()=>import('./pages/DesktopLogin'))
const LocalDataCenter=lazy(()=>import('./pages/LocalDataCenter'))
const RiskEngine=lazy(()=>import('./pages/RiskEngine'))
const Reports=lazy(()=>import('./pages/Reports'))
const MetricDictionary=lazy(()=>import('./pages/Reports').then(module=>({default:module.MetricDictionary})))
const Capd=lazy(()=>import('./pages/Modules').then(module=>({default:module.Capd})))
const Pharmacy=lazy(()=>import('./pages/Modules').then(module=>({default:module.Pharmacy})))
const Dpjp=lazy(()=>import('./pages/Modules').then(module=>({default:module.Dpjp})))
const MobileHome=lazy(()=>import('./pages/Mobile'))
const ActivityPage=lazy(()=>import('./pages/Mobile').then(module=>({default:module.ActivityPage})))
const TherapyPage=lazy(()=>import('./pages/Mobile').then(module=>({default:module.TherapyPage})))
const ReferralPage=lazy(()=>import('./pages/Mobile').then(module=>({default:module.ReferralPage})))
const AccountPage=lazy(()=>import('./pages/Mobile').then(module=>({default:module.AccountPage})))
const Queue=lazy(()=>import('./pages/Workflow').then(module=>({default:module.Queue})))
const PermitDetail=lazy(()=>import('./pages/Workflow').then(module=>({default:module.PermitDetail})))
const Comparison=lazy(()=>import('./pages/Workflow').then(module=>({default:module.Comparison})))
const NotFound=lazy(()=>import('./pages/System').then(module=>({default:module.NotFound})))

const Page=({component:Component}:{component:ComponentType})=><Suspense fallback={<div className="p-5"><Skeleton/></div>}><Component/></Suspense>

export default function App(){return <DemoAuthProvider><CommandPalette/><Routes>
  <Route element={<PublicLayout/>}><Route index element={<Page component={Landing}/>}/></Route>
  <Route path="apps" element={<MobileLayout/>}>
    <Route index element={<Page component={MobileHome}/>}/>
    <Route path="activity" element={<Page component={ActivityPage}/>}/>
    <Route path="therapy" element={<Page component={TherapyPage}/>}/>
    <Route path="referral" element={<Page component={ReferralPage}/>}/>
    <Route path="account" element={<Page component={AccountPage}/>}/>
  </Route>
  <Route path="desktop/login" element={<Page component={DesktopLogin}/>}/>
  <Route path="desktop" element={<DesktopLayout/>}>
    <Route index element={<Page component={Desktop}/>}/>
    <Route path="queue" element={<Page component={Queue}/>}/>
    <Route path="permit" element={<Page component={Queue}/>}/>
    <Route path="permit/:claimId" element={<Page component={PermitDetail}/>}/>
    <Route path="comparison" element={<Page component={Comparison}/>}/>
    <Route path="capd" element={<Page component={Capd}/>}/>
    <Route path="pharmacy" element={<Page component={Pharmacy}/>}/>
    <Route path="dpjp" element={<Page component={Dpjp}/>}/>
    <Route path="risk-engine" element={<Page component={RiskEngine}/>}/>
    <Route path="reports" element={<Page component={Reports}/>}/>
    <Route path="metrics" element={<Page component={MetricDictionary}/>}/>
    <Route path="settings" element={<Page component={LocalDataCenter}/>}/>
  </Route>
  <Route path="*" element={<Page component={NotFound}/>}/>
</Routes></DemoAuthProvider>}
