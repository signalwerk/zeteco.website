# ZeTeCo Backup

This repository contains the backup of the ZeTeCo website. It is used to generate the static pages.
You can see the result under [zeteco2017.signalwerk.ch](https://zeteco2017.signalwerk.ch).

## Backup instructions

```sh
zsh dl.sh            # Download from localhost & zeteco.ch
zsh standardize.sh   # Standardize the files


# move to docs
rm -rf docs
mkdir docs
mv localhost/* docs/

# cleanup
zsh cleanup.sh       # Cleanup for static pages

# add github pages config
echo "zeteco2017.signalwerk.ch" > docs/CNAME
touch docs/.nojekyll
cp docs/wiki/Main_Page.html docs/wiki/index.html
```
