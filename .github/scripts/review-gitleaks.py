"""Classify only individually reviewed false positives, never log finding contents.

Review 2026-11-27: all 11 historical and 5 current matches were inspected at
their exact source locations. They are environment variable names, SQL column
identifiers, a mocked idempotency key and browser localStorage identifiers.
No rule, directory, or credential value is globally ignored.
"""
import hashlib
import json
import pathlib
import sys

RELAY = "core/runtime/pagadito-certification-relay.ts"
TEST = "core/runtime/tests/payment-policy.test.ts"
TEMP = "core/runtime/temporary-event-repository.ts"
HISTORY = {
    ("058ba6efec60e3f849aba8d214f370a853a255d5", RELAY, 101),
    ("9cbe66ad31f36dcf429c9154acbe5d1f7dacbea0", RELAY, 101),
    ("e973711e35e9acdc54f78c175050c172797d4a93", RELAY, 71),
    ("fa0b0acf842fab2b496f6adcb310191975e6b5a2", RELAY, 19),
    ("fa0b0acf842fab2b496f6adcb310191975e6b5a2", RELAY, 36),
    ("113b55a76fb4ae4c2cb513ba0e236d7e821efb8d", RELAY, 19),
    ("113b55a76fb4ae4c2cb513ba0e236d7e821efb8d", RELAY, 35),
    ("a669278a6c364a381e8f3eebc3e60c6ea2695ca1", TEST, 50),
    ("e4aef9476bc3858603345a3e6602fb7fc6e4e6bc", TEMP, 57),
    ("7ad9d6c8055c5aad751d75a9abd403cdaf4ed193", "index.html", 932),
    ("37f6482e880e427f159aeec8903aed5f04ee83a9", "index.html", 908),
}
CURRENT = {
    (RELAY, "53352bb6ffc90137a1b56751380a5e697faf67497e0726a03e1c5c5a2766667c"),
    (RELAY, "8b657ac4e75a90df7f7b19a9729755c0b0c45c644f663b7685e0cfe236d2de87"),
    (TEST, "252d1df922825bea2bf166b53807f1db1444c4460d3614caadfcabc459aef747"),
    (TEMP, "1d648da101738d625488c77716df082e7cf2b1ec1c2ffe9f00be61e7ce15cdb5"),
}


def reviewed(finding, mode, root):
    if finding.get("RuleID") != "generic-api-key":
        return False
    name = finding.get("File", "")
    if name.startswith("/repo/"):
        name = name[len("/repo/"):]
    elif name.startswith("./"):
        name = name[2:]
    line = finding.get("StartLine")
    if type(line) is not int or line < 1:
        return False
    if mode == "history":
        return (finding.get("Commit"), name, line) in HISTORY
    if name not in {item[0] for item in CURRENT}:
        return False
    # Current findings are accepted only if the exact reviewed source line
    # remains byte-for-byte identical. A changed line requires fresh review.
    try:
        source = root / name
        if not source.resolve().is_relative_to(root.resolve()):
            return False
        data = source.read_bytes().splitlines()[line - 1]
        digest = hashlib.sha256(data).hexdigest()
    except (OSError, IndexError):
        return False
    return (name, digest) in CURRENT


def main():
    mode, report, code, workspace = sys.argv[1:]
    if mode not in {"history", "current"} or code not in {"0", "42"}:
        raise ValueError("Scanner did not complete")
    root = pathlib.Path(workspace)
    findings = json.loads(pathlib.Path(report).read_text(encoding="utf-8"))
    if not isinstance(findings, list) or any(not isinstance(f, dict) for f in findings):
        raise ValueError("Invalid scanner report")
    if bool(findings) != (code == "42"):
        raise ValueError("Scanner status and report disagree")
    accepted = sum(reviewed(f, mode, root) for f in findings)
    pending = len(findings) - accepted
    print(f"{mode}: {len(findings)} matches; {accepted} individually reviewed false positives; {pending} unresolved")
    return int(pending > 0)


if __name__ == "__main__":
    try:
        sys.exit(main())
    except (ValueError, OSError, TypeError, KeyError):
        print("Audit inconclusive: invalid scanner output or execution error.")
        sys.exit(1)
