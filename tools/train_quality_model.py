"""Train and evaluate a synthetic-only data-quality review classifier, never a clinical model."""
import argparse
import json
from pathlib import Path

import numpy as np
import sklearn
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (average_precision_score, balanced_accuracy_score, brier_score_loss,
                             confusion_matrix, precision_score, recall_score, roc_auc_score)
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler

FEATURES = ['missing_rate', 'invalid_rate', 'suppressed_valid_rate', 'log_rows', 'largest_code_share']


def features(s):
    return [s['missing']/s['rows'], s['invalid']/s['rows'], s['suppressed']/s['valid'],
            np.log(s['rows']), max(g['count'] for g in s['groups'])/s['valid']]


def generate(seed, n):
    rng = np.random.default_rng(seed)
    vectors, labels = [], []
    for _ in range(n):
        rows = int(np.exp(rng.uniform(np.log(300), np.log(100000))))
        missing = int(rows * min(rng.beta(1.6, 14), .4))
        invalid = int(rows * min(rng.beta(1.3, 18), .35))
        valid = rows-missing-invalid
        suppressed = int(valid * min(rng.beta(1.2, 12), .3))
        parts = rng.dirichlet([2, 2, 2])*(valid-suppressed-30)
        counts = [int(parts[0])+10, int(parts[1])+10]
        counts.append(valid-suppressed-sum(counts))
        summary = dict(rows=rows, missing=missing, invalid=invalid, valid=valid,
                       suppressed=suppressed, groups=[{'count': c} for c in counts])
        x = features(summary)
        # Synthetic annotation mechanism. This is not clinical ground truth.
        latent = -3.1 + 11*x[0] + 16*x[1] + 4*x[2] + 1.2*x[4] - .025*x[3]
        probability = 1/(1+np.exp(-latent))
        vectors.append(x)
        labels.append(int(rng.random() < probability))
    return np.asarray(vectors), np.asarray(labels)


def train():
    x_train,y_train = generate(20261022,4000)
    x_val,y_val = generate(20261023,1000)
    x_test,y_test = generate(20261024,1000)
    pipeline = make_pipeline(StandardScaler(),LogisticRegression(random_state=42,max_iter=1000))
    pipeline.fit(x_train,y_train)
    validation = pipeline.predict_proba(x_val)[:,1]
    candidates = np.linspace(.1,.9,81)
    threshold = float(max(candidates,key=lambda t: balanced_accuracy_score(y_val,validation>=t)))
    p = pipeline.predict_proba(x_test)[:,1]
    pred = p>=threshold
    baseline = np.full(len(y_test),y_train.mean())
    scaler,model = pipeline.steps[0][1],pipeline.steps[1][1]
    metrics = {'roc_auc':roc_auc_score(y_test,p),'average_precision':average_precision_score(y_test,p),
               'balanced_accuracy':balanced_accuracy_score(y_test,pred),'precision':precision_score(y_test,pred,zero_division=0),
               'recall':recall_score(y_test,pred,zero_division=0),'brier':brier_score_loss(y_test,p),
               'baseline_brier':brier_score_loss(y_test,baseline),'baseline_average_precision':float(y_test.mean()),
               'confusion_matrix':confusion_matrix(y_test,pred,labels=[0,1]).tolist()}
    return {'format':'jelas-quality-logistic-v1','id':'SYNTHETIC-QUALITY-20261022',
            'trainingMode':'SYNTHETIC_ONLY','task':'SYNTHETIC_DATA_QUALITY_REVIEW',
            'features':FEATURES,'mean':scaler.mean_.tolist(),'scale':scaler.scale_.tolist(),
            'weights':model.coef_[0].tolist(),'intercept':float(model.intercept_[0]),
            'threshold':threshold,'minimum':x_train.min(axis=0).tolist(),'maximum':x_train.max(axis=0).tolist(),
            'split':{'train':4000,'validation':1000,'test':1000,'seeds':[20261022,20261023,20261024]},
            'metrics':metrics,'sklearnVersion':sklearn.__version__,
            'parity':[{'features':x.tolist(),'probability':float(prob)} for x,prob in zip(x_test[:5],p[:5])],
            'limitations':['Synthetic labels are generated, not reviewer/clinical ground truth.',
                           'No DM2024 source file was accessible or used.',
                           'Not validated for real aggregates, clinical outcomes, fraud or eligibility.']}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output',type=Path,default=Path('src/models/quality-model.json'))
    args = parser.parse_args()
    artifact = train()
    args.output.parent.mkdir(parents=True,exist_ok=True)
    args.output.write_text(json.dumps(artifact,indent=2,allow_nan=False)+'\n')
    print(json.dumps({'model':artifact['id'],'split':artifact['split'],'held_out_synthetic_metrics':artifact['metrics']},indent=2))


if __name__ == '__main__':
    main()
