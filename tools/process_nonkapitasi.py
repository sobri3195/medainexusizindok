"""Local nonkapitasi structural-quality analysis; raw rows and IDs are never exported."""
import argparse
import hashlib
import json
import math
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest
from sklearn.model_selection import GroupShuffleSplit
from process_diagnoses import aggregate

FEATURES = ['primary_present','primary_format_supported','detail_present','detail_format_supported','prefix_consistent','detail_canonical_representation']


def canonical(value):
    if pd.isna(value):
        return ''
    text = str(value).strip().upper()
    import re
    if re.fullmatch(r'[A-Z][0-9]{2}(?:\.[A-Z0-9]{1,4})?',text):
        return text
    if re.fullmatch(r'[A-Z][0-9]{2}[A-Z0-9]{1,4}',text):
        return text[:3]+'.'+text[3:]
    return None if text else ''


def build_features(frame, primary, detail):
    rows=[]
    for p,d in zip(frame[primary],frame[detail]):
        a,b=canonical(p),canonical(d)
        present=lambda value:not pd.isna(value) and bool(str(value).strip())
        rows.append([int(present(p)),int(bool(a)),int(present(d)),int(bool(b)),int(bool(a) and bool(b) and a[:3]==b[:3]),int(bool(b) and str(d).strip().upper()==b)])
    return np.asarray(rows,dtype=float)


def average_path(n):
    if n<=1:return 0.
    if n==2:return 1.
    return 2*(math.log(n-1)+np.euler_gamma)-2*(n-1)/n


def export_forest(model):
    return {'format':'jelas-isolation-forest-v1','features':FEATURES,'threshold':float(-model.offset_),
            'maxSamples':int(model.max_samples_), 'trees':[{'left':e.tree_.children_left.tolist(),
            'right':e.tree_.children_right.tolist(),'feature':e.tree_.feature.tolist(),
            'threshold':e.tree_.threshold.tolist(),'samples':e.tree_.n_node_samples.tolist()} for e in model.estimators_]}


def score_forest(artifact, x):
    scores=[]
    for row in x:
        path=0.
        for tree in artifact['trees']:
            node=depth=0
            while tree['left'][node]!=-1:
                node=tree['left'][node] if row[tree['feature'][node]]<=tree['threshold'][node] else tree['right'][node]
                depth+=1
            path+=depth+average_path(tree['samples'][node])
        scores.append(2**(-path/(len(artifact['trees'])*average_path(artifact['maxSamples']))))
    return np.asarray(scores)


def analyze(path, primary='PNK13A', detail='PNK14', member='PSTV01', synthetic=False):
    if len({primary,detail,member})!=3:raise ValueError('Columns must be distinct')
    frame=pd.read_stata(path,columns=[primary,detail,member],convert_categoricals=False,convert_dates=False)
    if len(frame)<100 or frame[member].isna().any() or frame[member].nunique()<20:
        raise ValueError('Need at least 100 rows and 20 complete participant groups')
    x=build_features(frame,primary,detail)
    groups=frame[member].to_numpy()
    train,test=next(GroupShuffleSplit(n_splits=1,test_size=.2,random_state=42).split(x,groups=groups))
    if len(train)<20 or len(test)<10:raise ValueError('Insufficient split sizes')
    if np.unique(x[train],axis=0).shape[0]<2:raise ValueError('No feature variation to learn')
    model=IsolationForest(n_estimators=100,max_samples=min(256,len(train)),contamination=.05,random_state=42,n_jobs=1)
    model.fit(x[train])
    artifact=export_forest(model)
    # Verify the portable forest against sklearn on all source feature vectors.
    portable=score_forest(artifact,x)
    reference=-model.score_samples(x)
    if not np.allclose(portable,reference,atol=1e-12):raise ValueError('Model export parity failed')
    threshold=artifact['threshold']
    def band(indices):
        percent=float(np.mean(portable[indices]>threshold)*100)
        low=min(90,int(percent//10)*10)
        return f'{low}-{low+10}%'
    # Suppress small feature counts; do not export participant IDs or source values.
    quality=[{'feature':name,'falseCount':int((x[:,i]==0).sum()) if int((x[:,i]==0).sum())>=10 else None} for i,name in enumerate(FEATURES)]
    diagnosis=aggregate(path,primary,synthetic=synthetic,dataset='NONKAPITASI')
    report={'format':'jelas-nonkapitasi-analysis-v1','dataset':'NONKAPITASI',
            'mode':'SYNTHETIC' if synthetic else 'USER_AGGREGATE','sourceSha256':hashlib.sha256(Path(path).read_bytes()).hexdigest(),
            'rows':len(frame),'minCellCount':10,'diagnosis':diagnosis,'quality':quality,
            'model':{'algorithm':'IsolationForest','trainingSource':'UPLOADED_DATA' if not synthetic else 'SYNTHETIC',
                     'features':FEATURES,'trainRows':len(train),'holdoutRows':len(test),
                     'trainGroups':len(np.unique(groups[train])),'holdoutGroups':len(np.unique(groups[test])),
                     'groupOverlap':len(set(groups[train])&set(groups[test])),
                     'distinctFeaturePatterns':len(np.unique(x[train],axis=0)),'trees':100,'seed':42,'contamination':.05,'trainReviewBand':band(train),'holdoutReviewBand':band(test),
                     'threshold':threshold,'portableParityMaxError':float(np.max(np.abs(portable-reference))),
                     'evaluation':'UNLABELLED_HOLDOUT_NO_ACCURACY_CLAIM'}}
    return report,artifact


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('input',type=Path)
    parser.add_argument('--output-dir',type=Path,required=True)
    parser.add_argument('--primary-column',default='PNK13A')
    parser.add_argument('--detail-column',default='PNK14')
    parser.add_argument('--member-column',default='PSTV01')
    parser.add_argument('--synthetic',action='store_true')
    args=parser.parse_args()
    if args.output_dir.exists():parser.error('Output directory must be new; existing data is not overwritten')
    try:
        report,artifact=analyze(args.input,args.primary_column,args.detail_column,args.member_column,args.synthetic)
        args.output_dir.mkdir(parents=True,mode=0o700)
        for name,value in [('nonkapitasi-analysis.json',report),('nonkapitasi-model.json',artifact),('nonkapitasi-diagnosis-summary.json',report['diagnosis'])]:
            target=args.output_dir/name
            target.write_text(json.dumps(value,indent=2,allow_nan=False)+'\n')
            target.chmod(0o600)
        print(json.dumps({'rows':report['rows'],'trainingRows':report['model']['trainRows'],'holdoutRows':report['model']['holdoutRows'],'groupOverlap':report['model']['groupOverlap'],'modelExportParity':report['model']['portableParityMaxError']}))
    except (ValueError,KeyError,OSError):parser.exit(1,'Processing failed; verify mappings, source format, permissions and sample variation. No row values printed.\n')


if __name__=='__main__':main()
