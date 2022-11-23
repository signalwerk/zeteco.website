if [ ! -z ${ZSH_VERSION+x} ]; then
    echo "Running in ZSH"
else
    echo "please use ZSH for this script"
    exit 1
fi

rm -rf localhost

cat pages.txt |
while read url; do
    echo "GET $url"
    # -e robots=off \ #= ignore robots.txt and meta[name="robots"] tags
    wget \
        --recursive \
        --force-directories \
        --no-clobber \
        --page-requisites \
        --recursive \
        --html-extension \
        --convert-links \
        --backup-converted \
        --reject-regex=".*(opensearch_desc|Special:MyTalk|Special:UploadWizard|Special:RecentChanges|Special:CargoTables|Form:EventVillage|Form:OrgaProject|Form:OrgaTeam|Special:Templates|Template:|Special:MyContributions|Special:FormEdit|Special:CreateAccount|Special:Random|Special:Log|Special:Contributions|Special:WhatLinksHere|Special:UserLogin|action=|title=.*oldid|printable=yes).*" \
        --domains localhost \
            $url
done



## download main page

curl https://zeteco.ch/ > localhost/index.html
curl https://zeteco.ch/favicon.ico > localhost/favicon.ico
curl https://zeteco.ch/69d1c7bf4854da0961f1.js > localhost/69d1c7bf4854da0961f1.js
curl https://zeteco.ch/4e84d012042660e123bed4eb05811f1a.css > localhost/4e84d012042660e123bed4eb05811f1a.css


# -----------------------------------------
# copy from source to dest
# -----------------------------------------

soure="localhost"
destination="orig"

rm -rf "$destination"
mkdir -p "$destination"
destination=$(cd -- "$destination" && pwd) # make it an absolute path
cd -- "$source" &&
find "$soure" -type f -name "*.orig" -exec sh -c '
  mkdir -p "$0/${1%/*}"
  echo "$1 --- $0/$1"
  mv "$1" "$0/$1"
' "$destination" {} \;
# -----------------------------------------