import json
import sys
import tempfile
import unittest
from pathlib import Path
import numpy as np
import pandas as pd
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'tools'))
import process_nonkapitasi as p


class NonkapitasiTests(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory();self.addCleanup(self.tmp.cleanup)
        self.path=Path(self.tmp.name)/'synthetic.dta'
        pd.DataFrame({'primary':['E11']*400,'detail':['E119','E11.9']*200,
                      'member':[f'DEMO-{i//4}' for i in range(400)],
                      'ignored_private':['DO-NOT-EXPORT']*400}).to_stata(self.path,write_index=False,version=118)

    def test_real_fit_group_split_export_parity_and_privacy(self):
        report,model=p.analyze(self.path,'primary','detail','member',synthetic=True)
        self.assertEqual(report['rows'],400)
        self.assertEqual(report['model']['groupOverlap'],0)
        self.assertEqual(report['model']['trainRows']+report['model']['holdoutRows'],400)
        self.assertLess(report['model']['portableParityMaxError'],1e-12)
        self.assertEqual(report['model']['distinctFeaturePatterns'],2)
        self.assertEqual(len(model['trees']),100)
        self.assertNotIn('DO-NOT-EXPORT',json.dumps([report,model]))
        self.assertNotIn('DEMO-',json.dumps([report,model]))
        self.assertEqual(report['diagnosis']['dataset'],'NONKAPITASI')

    def test_format_normalization_is_not_a_clinical_error(self):
        x=p.build_features(pd.DataFrame({'p':['E11','E11'],'d':['E119','E11.9']}),'p','d')
        np.testing.assert_array_equal(x[:,:5],np.ones((2,5)))
        self.assertEqual(x[0,5],0);self.assertEqual(x[1,5],1)
        self.assertIsNone(p.canonical('FREE TEXT NOT A CODE'))

    def test_reproducible_model_and_failures(self):
        a,m=p.analyze(self.path,'primary','detail','member',synthetic=True)
        b,n=p.analyze(self.path,'primary','detail','member',synthetic=True)
        self.assertEqual(a,b);self.assertEqual(m,n)
        with self.assertRaises(ValueError):p.analyze(self.path,'primary','detail','primary')
        frame=pd.DataFrame({'p':['E11']*100,'d':['E11.9']*100,'g':list(range(100))})
        other=Path(self.tmp.name)/'constant.dta';frame.to_stata(other,write_index=False)
        with self.assertRaises(ValueError):p.analyze(other,'p','d','g')
        frame['g']=1;frame.to_stata(other,write_index=False)
        with self.assertRaises(ValueError):p.analyze(other,'p','d','g')


if __name__=='__main__':unittest.main()
