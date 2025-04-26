#!/bin/bash

APP_NAME=TheGate
COMMAND="npm run dev"
WORKDIR="/home/ec2-user/TheGate"

cd $WORKDIR || exit
pm2 delete $APP_NAME || true

# Run the app in dev mode with PM2
pm2 start "$COMMAND" --name $APP_NAME --update-env --watch

pm2 save
