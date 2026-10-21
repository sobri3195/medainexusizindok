"""Local-only Stata diagnosis aggregation. Never exports source rows or labels."""
import argparse
import json
import re
from collections import Counter
from pathlib import Path

import pandas as pd

ICD = re.compile(r"^[A-Z][0-9]{2}(?:\.[A-Z0-9]{1,4})?$")


def aggregate(path, column, threshold=10, synthetic=False, chunksize=50000):
    if threshold < 10:
        raise ValueError("Minimum cell threshold is 10")
    counts = Counter()
    rows = invalid = missing = 0
    with pd.read_stata(path, columns=[column], iterator=True, chunksize=chunksize,
                       convert_categoricals=False, convert_dates=False) as reader:
        for chunk in reader:
            for value in chunk[column]:
                rows += 1
                if pd.isna(value) or str(value).strip() == "":
                    missing += 1
                    continue
                code = str(value).strip().upper()
                if ICD.fullmatch(code):
                    counts[code] += 1
                else:
                    invalid += 1
    if rows < threshold:
        raise ValueError("Dataset below minimum publication threshold; no summary written")
    # No source strings, variable/value labels, record identifiers, or filenames in output.
    groups = [{"code": code, "count": count} for code, count in sorted(counts.items()) if count >= threshold]
    return {"format": "jelas-diagnoses-aggregate-v1",
            "mode": "SYNTHETIC" if synthetic else "USER_AGGREGATE",
            "sourceType": "STATA_LOCAL_AGGREGATION",
            "minCellCount": threshold, "rows": rows, "missing": missing,
            "invalid": invalid, "valid": sum(counts.values()),
            "suppressed": sum(n for n in counts.values() if n < threshold),
            "groups": groups}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("input", type=Path)
    parser.add_argument("--inspect", action="store_true", help="Print column names only, never values/labels")
    parser.add_argument("--diagnosis-column")
    parser.add_argument("--output", type=Path)
    parser.add_argument("--min-cell-count", type=int, default=10)
    parser.add_argument("--synthetic", action="store_true", help="Only if source is genuinely synthetic")
    args = parser.parse_args()
    try:
        if args.inspect:
            with pd.read_stata(args.input, iterator=True, convert_categoricals=False) as reader:
                print(json.dumps({"columns": list(reader.variable_labels().keys())}))
            return
        if not args.diagnosis_column or not args.output:
            parser.error("--diagnosis-column and --output are required")
        if args.input.resolve() == args.output.resolve() or args.output.exists():
            parser.error("Output must be a new file, distinct from the source")
        result = aggregate(args.input, args.diagnosis_column, args.min_cell_count, args.synthetic)
        with args.output.open("x", encoding="utf-8") as output:
            json.dump(result, output, indent=2)
        print("Aggregate written. Review authorization and disclosure risk before sharing.")
    except (ValueError, KeyError, OSError):
        # Do not echo untrusted source values, variable labels, or patient information.
        parser.exit(1, "Processing failed: check file format, column mapping, threshold, and output path.\n")


if __name__ == "__main__":
    main()
