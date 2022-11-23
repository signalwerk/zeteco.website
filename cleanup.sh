
# Parallel runs in N-process batches
N=16

for file in docs/**/*.html docs/*.html
do
  ((i=i%N)); ((i++==0)) && wait # wait for N jobs to finish
  node ./src/process.js "$file" "clean-up" &
done

wait # for all jobs to finish

gsed -i -E 's/\?v=2//g' docs/index.html
gsed -i -E 's/(href|src)(=")([/])/\1\2.\3/g' docs/index.html
gsed -i -E 's/https:\/\/wiki\.zeteco\.ch\//.\/wiki/g' docs/69d1c7bf4854da0961f1.js
