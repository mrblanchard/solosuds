cliendash.com
caledash.com
calendhive.com
calenest.com
calenderdash.com
dashender.com

builid locally and then copy output to the server (instead of buildiing on the server)
npm run build
scp -r .next root@45.33.68.189:/app/solosuds/
ssh root@45.33.68.189 "pm2 restart solosuds --update-env"