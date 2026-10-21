import importlib.util
import json
from pathlib import Path
import unittest
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('trainer',ROOT/'tools/train_quality_model.py')
trainer = importlib.util.module_from_spec(spec)
spec.loader.exec_module(trainer)


class TrainingTests(unittest.TestCase):
    def test_reproducible_training_and_export(self):
        artifact = trainer.train()
        saved = json.loads((ROOT/'src/models/quality-model.json').read_text())
        np.testing.assert_allclose(artifact['weights'],saved['weights'],atol=1e-10)
        self.assertEqual(artifact['threshold'],saved['threshold'])
        self.assertLess(artifact['metrics']['brier'],artifact['metrics']['baseline_brier'])
        self.assertGreater(artifact['metrics']['roc_auc'],.5)
        self.assertEqual(artifact['trainingMode'],'SYNTHETIC_ONLY')

    def test_splits_have_distinct_samples_and_labels_are_not_fixed_rules(self):
        x,y=trainer.generate(20261022,4000)
        v,_=trainer.generate(20261023,1000)
        t,_=trainer.generate(20261024,1000)
        fingerprints=lambda a:{tuple(row) for row in a}
        self.assertFalse(fingerprints(x)&fingerprints(v))
        self.assertFalse(fingerprints(x)&fingerprints(t))
        self.assertFalse(fingerprints(v)&fingerprints(t))
        self.assertEqual(set(y),{0,1})
        self.assertTrue(np.isfinite(x).all())

    def test_exported_scaling_and_weights_match_parity_vectors(self):
        a=json.loads((ROOT/'src/models/quality-model.json').read_text())
        for point in a['parity']:
            z=(np.array(point['features'])-np.array(a['mean']))/np.array(a['scale'])
            score=1/(1+np.exp(-(a['intercept']+z@np.array(a['weights']))))
            self.assertAlmostEqual(score,point['probability'],places=12)


if __name__=='__main__':
    unittest.main()
