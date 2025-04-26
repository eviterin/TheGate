#!/bin/bash

APP_NAME=TheGate
COMMAND="npm run dev"

pm2 delete $APP_NAME || true
pm2 start $COMMAND --name $APP_NAME --update-env
pm2 save