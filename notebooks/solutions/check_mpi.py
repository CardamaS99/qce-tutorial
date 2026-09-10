from mpi4py import MPI

comm = MPI.COMM_WORLD
print(f"rank {comm.Get_rank()} of {comm.Get_size()} reporting in", flush=True)
