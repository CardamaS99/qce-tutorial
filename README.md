# Practical Distributed Quantum Computing: NetQMPI over CUNQA

Materials for the **IEEE Quantum Week 2026 (QCE26)** tutorial on programming
distributed quantum applications with [NetQMPI](https://github.com/NetQIR/netqmpi)
over the [CUNQA](https://github.com/CESGA-Quantum-Spain/cunqa) emulator — from
monolithic circuits to multi-QPU networks.

**Friday, September 18, 2026** · 13:00–14:30 and 15:00–16:30 · Metro Toronto Convention Centre

## Quick start

The whole environment ships as one Docker image: NetQMPI, CUNQA, Slurm and
Jupyter, wired together as a small HPC cluster on your own laptop.

```bash
docker pull jvazquezperez/cunqa_netqmpi:latest
docker run --rm -it -p 8888:8888 jvazquezperez/cunqa_netqmpi:latest
```

Then open <http://localhost:8888/?token=cunqa>.

- **`-p 8888:8888` is required.** Jupyter runs inside the container; without
  publishing the port your browser cannot reach it.
- **Apple silicon:** the image is `linux/amd64` only. Enable *Use Rosetta for
  x86_64/amd64 emulation* in Docker Desktop (Settings → General) and add
  `--platform linux/amd64` to both commands.
- **Keep your work:** `--rm` deletes the container on exit. Add
  `-v "$PWD/work:/home/tutorial/work"` and save anything you want to keep in `work/`.

Instructions for installing Docker on Linux, Windows and macOS are in the
*Environment Setup* section of the tutorial website (`index.html`).

## Notebooks

| Notebook | Part | Time |
|---|---|---|
| [`01-foundations`](notebooks/01-foundations.ipynb) | Session 1 · Foundations of Distributed Computing | 13:00–13:30 |
| [`02-mpi-basics`](notebooks/02-mpi-basics.ipynb) | Session 1 · Programming Model: MPI Basics | 13:30–14:00 |
| [`03-netqmpi-basics`](notebooks/03-netqmpi-basics.ipynb) | Session 1 · Programming Model: NetQMPI Basics | 14:00–14:30 |
| [`04-cunqa-foundations`](notebooks/04-cunqa-foundations.ipynb) | Session 2 · CUNQA Foundations | 15:00–15:45 |
| [`05-advanced-algorithms`](notebooks/05-advanced-algorithms.ipynb) | Session 2 · Advanced Distributed Algorithms | 15:45–16:15 |

Worked solutions are in [`notebooks/solutions/`](notebooks/solutions/). Inside
the Docker image they sit in the hidden `/home/tutorial/.solutions/` directory —
try the exercises first.

## Repository layout

```
notebooks/         tutorial notebooks, fetched into the Docker image at build time
  solutions/       one solved notebook per part
docker/            Dockerfile, entrypoint and Slurm configuration of the image
astro-tutorial/    source of the bilingual companion book (Astro)
tutorial/          built companion book, served under /tutorial/
index.html         tutorial website, with styles.css, script.js and images/
```

## Building the Docker image

```bash
cd docker
docker build -t jvazquezperez/cunqa_netqmpi:latest .
```

The first build compiles Slurm and CUNQA from source and takes a while.

The notebooks are **not** taken from your local checkout: the build fetches
`notebooks/` from this repository on GitHub, so push notebook changes before
rebuilding. When only the notebooks have changed, only that step is redone.
Use `--build-arg TUTORIAL_REF=<branch|tag|commit>` to build from another ref;
`NETQMPI_REF` and `CACHEBUST` are documented in the Dockerfile. BuildKit is
required (the default builder since Docker 23).

## Companion book

```bash
cd astro-tutorial
npm install
npm run build   # output in dist/
```

See [`astro-tutorial/README.md`](astro-tutorial/README.md) for details.

## Team

- **Jorge Vázquez-Pérez** — CESGA · [jvazquez@cesga.es](mailto:jvazquez@cesga.es)
- **F. Javier Cardama** — CiTIUS, Universidade de Santiago de Compostela · [javier.cardama@usc.es](mailto:javier.cardama@usc.es)
- **Tomás F. Pena** — CiTIUS, Universidade de Santiago de Compostela
- **Andrés Gómez** — CESGA

## Further reading

- D. Barral, F.J. Cardama, G. Díaz, *et al.* "Review of Distributed Quantum Computing: From Single QPU to High Performance Quantum Computing." *Computer Science Review* 57 (2025), 100747. [doi:10.1016/j.cosrev.2025.100747](https://doi.org/10.1016/j.cosrev.2025.100747)
- F.J. Cardama, J. Vázquez-Pérez, T.F. Pena, A. Gómez. "NetQMPI: An MPI-Inspired Library for Programming Distributed Quantum Applications over Quantum Networks Using NetQASM SDK." *IEEE Access* (2026). [doi:10.1109/ACCESS.2026.3723566](https://ieeexplore.ieee.org/document/11654595)
- J. Vázquez-Pérez, D. Expósito-Patiño, M. Losada, Á. Carballido, A. Gómez, T.F. Pena. "CUNQA: A Distributed Quantum Computing Emulator for HPC." [arXiv:2511.05209](https://arxiv.org/abs/2511.05209) (2025).
- F.J. Cardama, J. Vázquez-Pérez, T.F. Pena, A. Gómez. "Communication-Efficient Distributed Inverse Quantum Fourier Transform." [arXiv:2605.10710](https://arxiv.org/abs/2605.10710) (2026).

## Acknowledgements

NetQMPI and CUNQA are the outcome of publicly funded research, including
Quantum Spain (Quantum ENIA project, Recovery, Transformation and Resilience
Plan – NextGenerationEU), the DeepQuantum project
(MICIU/AEI/10.13039/501100011033/FEDER, UE) and the EuroHPC programme (grant
agreement 101194491). The full list is in the *Acknowledgements* section of the
tutorial website.
