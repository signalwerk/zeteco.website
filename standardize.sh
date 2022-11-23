# remove dynamic data per file
gsed -i -E 's/("wgBackendResponseTime":)[0-9.]+/\1 0/g' (localhost|orig)/**/*(.html|.orig)
gsed -i -E 's/("wgRequestId":)"[^"]+"/\1 ""/g' (localhost|orig)/**/*(.html|.orig)

# Parallel runs in N-process batches
N=16

for file in (localhost|orig)/**/*(.html|.orig)
do
  ((i=i%N)); ((i++==0)) && wait # wait for N jobs to finish
  node ./src/process.js "$file" "standardize"
done

wait # for all jobs to finish

npx prettier --write localhost/index.html
