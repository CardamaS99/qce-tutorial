#!/bin/bash
# CUNQA self-test: raise one vQPU, run a one-qubit circuit on it, drop it.
#
# CUNQA is compiled once, on the machine that builds the image, and then runs
# on whatever laptop pulls it. Some hosts cannot run it even inside Docker (an
# old CPU below the x86-64-v2 baseline, ARM under emulation, ...), and the only
# reliable way to find out is to try on the host itself. The entrypoint runs
# this at container start; attendees can re-run it at any time with
#     cunqa-selftest
#
# Exit status: 0 if CUNQA works, 1 otherwise. The verdict ("ok" / "fail") is
# also written to /var/log/cunqa-selftest.status and the full output to
# /var/log/cunqa-selftest.log.
#
# Environment:
#   CUNQA_SELFTEST_TIMEOUT  seconds before giving up (default 180). The first
#                           Slurm job after boot can sit ~1 minute as
#                           "InvalidAccount" (no slurmdbd), so keep it generous.
set -uo pipefail

TIMEOUT="${CUNQA_SELFTEST_TIMEOUT:-180}"
FAMILY="cunqa_selftest"
LOG=/var/log/cunqa-selftest.log
STATUS=/var/log/cunqa-selftest.status

WORKDIR=$(mktemp -d /tmp/cunqa-selftest.XXXXXX)
# qraise writes its qraise_<jobid> log to the working directory: keep it out of
# the Jupyter root.
cd "$WORKDIR" || exit 1

JOBS_BEFORE=$(squeue -h -o '%i' 2>/dev/null | sort)

cleanup() {
    qdrop --family "$FAMILY" >/dev/null 2>&1 || true
    # If the test died before the vQPU registered, qdrop cannot map the family
    # to a job. Cancel whatever job this test added to the queue.
    local job
    for job in $(comm -13 <(echo "$JOBS_BEFORE") <(squeue -h -o '%i' 2>/dev/null | sort)); do
        scancel "$job" 2>/dev/null || true
    done
    rm -rf "$WORKDIR"
}
trap cleanup EXIT

(
    echo "=== cunqa-selftest $(date -Is) on $(hostname), arch $(uname -m), timeout ${TIMEOUT}s"
    timeout --kill-after=10 "$TIMEOUT" python3 - "$FAMILY" <<'PY'
import sys

family = sys.argv[1]

def stage(name):
    print(f"STAGE {name}", flush=True)

stage("import")
from cunqa.circuit import CunqaCircuit
from cunqa.qjob import gather
from cunqa.qpu import get_QPUs, qraise, run

stage("qraise")
qraise(1, "00:10:00", co_located=True, family=family)
qpus = get_QPUs(co_located=True, family=family) or []
if not qpus:
    sys.exit("qraise returned but no vQPU of the test family is registered")

stage("run")
SHOTS = 16
circuit = CunqaCircuit(1, 1, id="selftest")
circuit.h(0)
circuit.measure(0, 0)
results = gather(run([circuit], qpus[:1], shots=SHOTS))
counts = results[0].counts
print("counts:", counts, flush=True)
if sum(counts.values()) != SHOTS:
    sys.exit(f"expected {SHOTS} shots in the result, got {counts}")

stage("done")
PY
    rc=$?
    echo "=== python exit status: $rc"
    for f in qraise_*; do
        [[ -e "$f" ]] || continue
        echo "=== $f"
        tail -n 40 "$f"
    done
    exit "$rc"
) > "$LOG" 2>&1
RC=$?

if [[ $RC -eq 0 ]]; then
    echo ok > "$STATUS"
    echo "[cunqa-selftest] OK: raised a vQPU and ran a circuit on it. CUNQA works on this machine."
    exit 0
fi

echo fail > "$STATUS"

# --- Diagnosis --------------------------------------------------------------
LAST_STAGE=$(grep -o '^STAGE [a-z]*' "$LOG" | tail -n1 | cut -d' ' -f2)
case "$LAST_STAGE" in
    import) WHAT="importing CUNQA's Python package" ;;
    qraise) WHAT="raising a vQPU (qraise)" ;;
    run)    WHAT="running a circuit on the vQPU (qraise itself worked)" ;;
    *)      WHAT="starting the test" ;;
esac

if [[ $RC -eq 124 || $RC -eq 137 ]]; then
    REASON="no answer within ${TIMEOUT}s"
elif [[ $RC -eq 132 ]] || grep -qi 'illegal instruction\|SIGILL' "$LOG"; then
    REASON="illegal instruction: this CPU cannot execute CUNQA's compiled code"
else
    REASON=$(grep -v '^STAGE\|^===' "$LOG" | grep -i 'error\|exception\|failed' | tail -n1 | cut -c1-200)
    REASON="${REASON:-exit status $RC}"
fi

HINT=""
ARCH=$(uname -m)
CPU_VENDOR=$(grep -m1 '^vendor_id' /proc/cpuinfo 2>/dev/null | cut -d: -f2 | xargs)
CPU_FLAGS=$(grep -m1 '^flags' /proc/cpuinfo 2>/dev/null)
if [[ "$ARCH" != "x86_64" ]]; then
    HINT="The container runs as ${ARCH}, but CUNQA is built for x86-64. On Apple silicon, start it with --platform linux/amd64 and enable Rosetta in Docker Desktop (Settings > General)."
elif [[ "$CPU_VENDOR" == "VirtualApple" || -z "$CPU_FLAGS" ]]; then
    # Rosetta reports a "VirtualApple" CPU; QEMU user-mode emulation leaves the
    # ARM host's /proc/cpuinfo (no x86 "flags" line) visible to the container.
    HINT="This is an ARM machine (e.g. Apple silicon) running x86-64 code under emulation. On a Mac, make sure Docker Desktop uses Rosetta (Settings > General); other ARM hosts may not be able to run CUNQA at all."
else
    MISSING=""
    for flag in ssse3 sse4_1 sse4_2 popcnt cx16; do
        grep -qw "$flag" <<<"$CPU_FLAGS" || MISSING="$MISSING $flag"
    done
    [[ -n "$MISSING" ]] && HINT="This CPU lacks${MISSING}, part of the x86-64-v2 baseline CUNQA is compiled for."
fi

cat <<EOF
====================================================================
  CUNQA SELF-TEST FAILED on this machine.

  Failed at: ${WHAT}
  Reason:    ${REASON}
EOF
if [[ -n "$HINT" ]]; then
    echo
    fold -s -w 62 <<<"$HINT" | sed 's/^/  /'
fi
cat <<EOF

  Slurm and Jupyter are running, but the tutorial exercises that
  use vQPUs will not work on this machine. Please let the
  instructors know.

  Full log: ${LOG}
  Re-run:   cunqa-selftest
====================================================================
EOF
exit 1
