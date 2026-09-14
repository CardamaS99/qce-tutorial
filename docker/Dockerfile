# syntax=docker/dockerfile:1
#
# CUNQA + NetQMPI tutorial image: single-node Slurm (no slurmdbd), sized for
# attendees' laptops. Runs with no special privileges:
#     docker run --rm -it -p 8888:8888 <image> bash
# or straight from the Docker Desktop Run button (map host port 8888).

# ===========================================================================
# Slurm build stage
#
# Ubuntu 24.04 ships Slurm 23.11, whose slurmd unconditionally initialises a
# cgroup plugin. CgroupPlugin=disabled only exists from 24.05, so on 23.11 the
# container needs a writable /sys/fs/cgroup, i.e. --privileged. Building 24.11
# here removes that requirement: with the plugin disabled slurmd never touches
# /sys/fs/cgroup, and srun/sbatch work normally.
# ===========================================================================
FROM ubuntu:24.04 AS slurmbuild

ENV DEBIAN_FRONTEND=noninteractive
ARG SLURM_VERSION=24.11.3

RUN apt-get update && apt-get install -y --no-install-recommends \
        build-essential ca-certificates curl python3 \
        libmunge-dev libjson-c-dev libyaml-dev libhttp-parser-dev \
    && rm -rf /var/lib/apt/lists/*

RUN curl -fsSL -o /tmp/slurm.tar.gz \
      "https://github.com/SchedMD/slurm/archive/refs/tags/slurm-$(echo ${SLURM_VERSION} | tr . -)-1.tar.gz" \
    && mkdir -p /tmp/slurm \
    && tar xzf /tmp/slurm.tar.gz -C /tmp/slurm --strip-components=1

# Own prefix, not /usr/local: the CUNQA stage installs pip packages there and
# the final image copies that tree wholesale.
WORKDIR /tmp/slurm
RUN ./configure --prefix=/opt/slurm --sysconfdir=/etc/slurm \
        --disable-x11 --without-pmix --without-nvml --without-rsmi \
    && make -j"$(nproc)" \
    && make install

# Static libraries and libtool archives are ~240MB of the install and are
# never used at run time.
RUN find /opt/slurm \( -name '*.a' -o -name '*.la' \) -delete \
    && find /opt/slurm -type f -name '*.so' -exec strip --strip-unneeded {} + \
    && find /opt/slurm/sbin /opt/slurm/bin -type f -exec strip --strip-unneeded {} + ; \
    true

# ===========================================================================
FROM ubuntu:24.04 AS base

ENV DEBIAN_FRONTEND=noninteractive

# No slurm-wlm packages here (those are 23.11). Only munge plus the handful of
# libraries the compiled Slurm links against, found with ldd over its plugins.
RUN apt-get update && apt-get install -y --no-install-recommends \
        munge gosu \
        libmunge2 libjson-c5 libyaml-0-2 libhttp-parser2.9 \
    && rm -rf /var/lib/apt/lists/*

# The apt packages used to create this account; a source build does not.
RUN groupadd -r slurm \
    && useradd -r -g slurm -d /var/spool/slurmctld -s /usr/sbin/nologin slurm

COPY --from=slurmbuild /opt/slurm /opt/slurm
RUN echo /opt/slurm/lib > /etc/ld.so.conf.d/slurm.conf && ldconfig
ENV PATH="/opt/slurm/sbin:/opt/slurm/bin:${PATH}"

RUN mkdir -p /var/spool/slurmctld /var/spool/slurmd /var/log/slurm \
             /run/munge /etc/slurm \
    && chown slurm:slurm /var/spool/slurmctld /var/log/slurm \
    && chown munge:munge /run/munge

COPY slurm.conf.template /etc/slurm/slurm.conf.template
COPY cgroup.conf /etc/slurm/cgroup.conf
COPY entrypoint.sh /usr/local/bin/entrypoint.sh

# Normalise every file copied from Windows, not just the entrypoint: a CRLF
# leaves a stray CR glued to the last directive's value in the Slurm configs.
RUN apt-get update && apt-get install -y --no-install-recommends file \
    && for f in /usr/local/bin/entrypoint.sh /etc/slurm/cgroup.conf \
                /etc/slurm/slurm.conf.template; do \
         case "$(file -b --mime-encoding "$f")" in \
           utf-16*) iconv -f UTF-16 -t UTF-8 "$f" -o /tmp/x && mv /tmp/x "$f" ;; \
         esac; \
         sed -i 's/\r$//' "$f"; \
       done \
    && chmod +x /usr/local/bin/entrypoint.sh \
    && apt-get purge -y file && rm -rf /var/lib/apt/lists/*

# ===========================================================================
# CUNQA build stage
#
# Ubuntu 24.04 stock versions satisfy CUNQA: CMake 3.28.3 (needs 3.24),
# Python 3.12, Cython 3.0.8, Boost 1.83, Eigen 3.4. Only qiskit and pybind11
# come from pip (apt's pybind11 2.11.1 is below the 2.12 minimum).
# CUDA is not used. Eigen 3.4 vs the 5.0 in CUNQA's README is a major-version
# gap: if the build breaks, look there first.
# ===========================================================================
FROM base AS build

RUN apt-get update && apt-get install -y --no-install-recommends \
        git cmake build-essential libopenblas-dev cython3 \
        python3-dev python3-pip libeigen3-dev libboost-all-dev libopenmpi-dev \
    && rm -rf /var/lib/apt/lists/*

RUN python3 -m pip install --break-system-packages \
        qiskit==1.2.4 \
        pybind11==2.13.6 \
        PyYAML==6.0.3 \
        notebook==7.6.2

# Built from source on purpose. PyPI's manylinux wheels target the standard
# MPI ABI, which OpenMPI 4.1 does not implement; compiling here binds it to
# libmpi.so.40, matching libopenmpi3t64 in the final stage.
RUN python3 -m pip install --break-system-packages \
        --no-binary=mpi4py mpi4py==4.1.2

# From git, not PyPI: the published 0.3.0 targets the CUNQA 2.x API
# (cunqa.circuit.core, no cunqa.qc_protocols). The 3.x adapter landed on main
# in PR #21 (2026-09-07). Both declare version='0.3.0', so pip cannot tell
# them apart.
#
# A branch name never invalidates the layer cache, so new commits are missed.
# To refresh, pass a commit: docker build --build-arg NETQMPI_REF=<sha> ...
#
# Cloned rather than installed straight from the URL because pip discards the
# source tree, and examples/ is wanted in the final image. Full clone (no
# --depth) so NETQMPI_REF can be a commit, not just a branch or tag.
ARG NETQMPI_REF=main
RUN git clone https://github.com/NetQIR/netqmpi.git /usr/src/netqmpi \
    && git -C /usr/src/netqmpi checkout --quiet "${NETQMPI_REF}" \
    && python3 -m pip install --break-system-packages /usr/src/netqmpi

# PyYAML is declared by NetQMPI (pyyaml>=5.1) but pinned above for
# reproducibility. It is imported lazily inside read_config_block(), so a
# missing copy only breaks `netqmpi --config`, not the import.
#
# The --netqasm and --qoala backends are deliberately absent: they need
# NetSquid from a credentialed private index, which would be baked into the
# layer history, and netqasm 1.x/2.x cannot coexist. --cunqa needs neither.

# Sources under /usr/src so the clone and build tree stay in this stage
# instead of riding along with the artefacts in /opt/cunqa.
WORKDIR /usr/src/cunqa

# STORE must match the final stage. CMake aborts without it
# (cmake/ProjectOptions.cmake) and bakes it into an absolute install path for
# the JSON schemas. Kept outside the prefix: /opt/cunqa is read-only code,
# /var/opt/cunqa is runtime state.
ENV STORE=/var/opt/cunqa
ENV CPATH="/usr/lib/x86_64-linux-gnu/openmpi/include:/usr/include/eigen3:${CPATH}"

# Force a portable x86-64-v2 baseline (SSE4.2, no AVX-512) so the compiled
# binaries run on any x86_64 laptop from roughly the last 12 years, rather
# than whatever instruction set happens to be available on the build machine.
ENV CFLAGS="-march=x86-64-v2 -mtune=generic"
ENV CXXFLAGS="-march=x86-64-v2 -mtune=generic"

# CACHEBUST exists because the clone line never changes, so rebuilds silently
# reuse a stale main. Pass --build-arg CACHEBUST=$(date +%s) to refresh.
ARG CACHEBUST=1
RUN git clone --depth 1 https://github.com/CESGA-Quantum-Spain/cunqa.git .
RUN cmake --preset release \
        -Dpybind11_DIR=$(python3 -m pybind11 --cmakedir) \
        -DCMAKE_INSTALL_PREFIX=/opt/cunqa
RUN cmake --build --preset release --parallel $(nproc)
RUN cmake --install build/release

# ===========================================================================
# Tutorial notebooks stage
#
# Fetched from the public tutorial repository instead of the build context, so
# building needs no local copy of the notebooks. Only notebooks/ is fetched, and
# without .git. BuildKit resolves TUTORIAL_REF to a commit on every build, so
# pushing new notebooks and rebuilding refreshes this stage and the final COPY
# without touching Slurm or CUNQA. If a stale copy ever sticks, rebuild just
# this stage:
#     docker build --no-cache-filter notebooks ...
#
# solutions/ becomes .solutions so Jupyter's file browser hides it.
# ===========================================================================
FROM base AS notebooks

ARG TUTORIAL_REF=main
ADD https://github.com/CardamaS99/qce-tutorial.git#${TUTORIAL_REF}:notebooks /notebooks
RUN if [ -d /notebooks/solutions ]; then mv /notebooks/solutions /notebooks/.solutions; fi

# ===========================================================================
# Final image: installed artefacts only, no compilers or -dev headers.
# ===========================================================================
FROM base AS final

COPY --from=build /opt/cunqa /opt/cunqa

# CUNQA runtime state: holds the JSON schemas from `cmake --install`, and
# qpus.json and the lock files at run time.
COPY --from=build /var/opt/cunqa /var/opt/cunqa

# All of /usr/local, not just dist-packages: pip spreads a package across
# bin/ (netqmpi, jupyter), share/jupyter (kernelspecs, server assets) and
# etc/jupyter (extension config). /usr/local is empty in the base image.
COPY --from=build /usr/local /usr/local

# Runtime libraries. The first three are easy to miss because the build stage
# got them indirectly from -dev packages:
#   libpython3.12t64  libpython3.12.so.1.0, which "python3" does NOT pull in.
#                     CUNQA links Python::Python because aer-cpp embeds the
#                     interpreter.
#   libgomp1          OpenMP runtime; libopenblas0 defaults to the pthread
#                     variant and does not pull it in.
#   libboost-program-options1.83.0
#                     one of the few compiled parts of Boost.
#   openmpi-bin       mpirun; mpi4py imports fine with libopenmpi3t64 alone,
#                     but nothing can be launched in parallel without it.
# liblapack3 is not needed: libopenblas0 provides liblapack.so.3 via
# update-alternatives.
RUN apt-get update && apt-get install -y --no-install-recommends \
        python3 \
        libpython3.12t64 \
        libgomp1 \
        libboost-program-options1.83.0 \
        libopenblas0 \
        libopenmpi3t64 \
        openmpi-bin \
    && rm -rf /var/lib/apt/lists/*

# PYTHONPATH is the install prefix itself, not a site-packages path: CUNQA's
# CMakeLists uses relative DESTINATIONs, so the package lands in
# /opt/cunqa/cunqa/. No trailing ":${PYTHONPATH}" — it would leave a ":" that
# puts the working directory on sys.path.
#
# STORE must match the build stage and stay writable: qpus.json and the lock
# files are created under it.
ENV PATH="/opt/cunqa/bin:${PATH}"
ENV PYTHONPATH="/opt/cunqa"
ENV STORE=/var/opt/cunqa

# Seed a valid empty object: CUNQA's Python qraise() writes the string "{}"
# (quotes included) when the file is missing, which the C++ qraise then fails
# to read as an object.
RUN mkdir -p /var/opt/cunqa/.cunqa && printf '{}\n' > /var/opt/cunqa/.cunqa/qpus.json

# Examples from both repos, kept side by side under the working directory so
# they show up in the Jupyter file browser. NetQMPI's examples/ carries the
# cunqa_*.yaml configs, which is the path that needs PyYAML.
COPY --from=build /usr/src/cunqa/examples   /home/tutorial/examples/cunqa
COPY --from=build /usr/src/netqmpi/examples /home/tutorial/examples/netqmpi

# Notebooks straight into the Jupyter root, the hidden .solutions beside them.
# Kept last of the copies so a notebooks-only change rebuilds nothing before
# this layer.
COPY --from=notebooks /notebooks/ /home/tutorial/

# EXPOSE documents the port; publish it with `docker run -p 8888:8888` or in
# Docker Desktop's optional settings.
EXPOSE 8888
ENV JUPYTER_PORT=8888
ENV JUPYTER_DIR=/home/tutorial
ENV JUPYTER_TOKEN=cunqa

WORKDIR /home/tutorial

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
CMD ["/bin/bash"]
