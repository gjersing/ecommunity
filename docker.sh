#!/bin/bash

echo What should the version be?
read VERSION

docker build -t csgjersing/ecommunity:$VERSION .
docker push csgjersing/ecommunity:$VERSION