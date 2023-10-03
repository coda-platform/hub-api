rm -r -f ./dist

docker build -t coda-hub-api:dev .

docker tag coda-hub-api:dev coda19/coda19-hub-api:dev
docker push coda19/coda19-hub-api:dev
echo "Finished running script sleeping 30s"
sleep 30