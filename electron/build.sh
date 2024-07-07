
rm -rf ./ui && rm -rf ./dist && \
mkdir -p ./dist && \
cd ../ && \
./build-ui.sh && \
cd electron && npm ci && npm run build-tsc && \
cd ./ui/server/ && npm run build && cd ../.. 