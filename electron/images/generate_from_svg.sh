# apt install inkscape
# apt install imagemagick

# -b FFFFFF used for white bg
inkscape -w 512 -h 512 prostgles-logo-rounded.svg -o ./rounded/icon512.png
inkscape -w 512 -h 512 prostgles-logo-rounded.svg -o ./rounded/512x512.png
inkscape -w 256 -h 256 prostgles-logo-rounded.svg -o ./rounded/256x256.png
inkscape -w 64 -h 64 prostgles-logo-rounded.svg   -o ./rounded/64x64.png
# convert prostgles-logo-rounded.svg -define icon:auto-resize=256 ./rounded/icon256.ico
# convert icon512rounded.png -define icon:auto-resize=32 ./rounded/favicon.ico
convert -define 'icon:auto-resize=16,24,32,64,128,256' prostgles-logo-rounded.svg ./rounded/icon.ico


