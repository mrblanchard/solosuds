## package information

`docker pull git.brattleborofoodcoop.coop/jeremyb/reporttool:latest`

**Digest:** `sha256:2e86e639e58a419d506d89ee7ccff9069cf0cf7ec89fa0da8d5d32f3bfed46ae`

For more information on the Container registry, see the documentation.

---

### Image layers

`# debian.sh --arch 'amd64' out/ 'trixie' '@1763337600'`

`/bin/sh -c apt-get update && apt-get install -y curl git vim python3 python3-pip -y python3-venv -y unixodbc nano`

`ARG USERNAME`

`ARG USERNAME USER_UID`

`ARG USERNAME USER_GID USER_UID`

`|3 USERNAME=dev_user USER_GID=1000 USER_UID=1000 /bin/sh -c groupadd --gid $USER_GID $USERNAME && useradd --uid $USER_UID --gid $USER_GID -m $USERNAME && apt-get update && apt-get install -y sudo && echo $USERNAME ALL=\(root\) NOPASSWD:ALL > /etc/sudoers.d/$USERNAME && chmod 0440 /etc/sudoers.d/$USERNAME`

`COPY file:aed78a510038bfbfc0ddc1bc134dd02cbe2783457da9de7b954344fa9bc7e658 in /usr/local/bin`

`|3 USERNAME=dev_user USER_GID=1000 USER_UID=1000 /bin/sh -c chmod +x /usr/local/bin/pull_and_source.sh`

`WORKDIR /bin`

`COPY file:3e0ed9c158c117e46503e7f301e8ba13636333750ea15267011abcea415ffb6d in /bin`

`|3 USERNAME=dev_user USER_GID=1000 USER_UID=1000 /bin/sh -c gunzip sqla17_client_linux_x86x64.tar.gz`

`|3 USERNAME=dev_user USER_GID=1000 USER_UID=1000 /bin/sh -c tar -xvf sqla17_client_linux_x86x64.tar`

`WORKDIR /bin/client17011`

`|3 USERNAME=dev_user USER_GID=1000 USER_UID=1000 /bin/sh -c ./setup -ss -I_accept_the_license_agreement`

`COPY file:fea5d0002cc50bb2e0e6e59dc6c22692c013eb67db9c96162be0eb5f7fccbe57 in /etc`

`COPY file:5e1e9fedc63df204388c62708874a39d5b6f54226e9f269d337fd6be73d14813 in /etc`

`USER dev_user`

`|3 USERNAME=dev_user USER_GID=1000 USER_UID=1000 /bin/sh -c echo 'export ODBCINI=/etc/odbc.ini' >> /home/dev_user/.bashrc`

`|3 USERNAME=dev_user USER_GID=1000 USER_UID=1000 /bin/sh -c echo 'source /opt/sqlanywhere17/bin64/sa_config.sh' >> /home/dev_user/.bashrc`

`USER root`

`/bin/sh -c cp /etc/odbc.ini /tmp/odbc.ini.bak && cp /etc/odbcinst.ini /tmp/odbcinst.ini.bak && apt-get update && apt-get install -y --no-install-recommends curl gnupg unixodbc && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && apt-get install -y --no-install-recommends nodejs && rm -rf /var/lib/apt/lists/* && cp /tmp/odbc.ini.bak /etc/odbc.ini && cp /tmp/odbcinst.ini.bak /etc/odbcinst.ini`

`/bin/sh -c mkdir -p /home/dev_user/Scripts`

`COPY file:1d82053cf06eead80d9ca56d32b6cb4187f795e70b970f28096224d10e90db88 in /home/dev_user/Scripts/db.x509.pem`

`WORKDIR /app`

`COPY dir:c10fda55ab84ee62c692699369e0d7c875b21c42348dc399d89f476de6994019 in ./`

`COPY dir:7709cae3a30047627c9bb12e64676aeefee1501ea14142c34f38d41c9c5c968e in ./.next/static`

`COPY dir:c7c6685bca8f04e2cdd411f13f6eb39128143c92c70d0ca75d4f608f19ab4408 in ./public`

`ENV NODE_ENV=production`

`ENV PORT=3025`

`ENV HOSTNAME=0.0.0.0`

`ENV SQLANY17=/opt/sqlanywhere17`

`ENV LD_LIBRARY_PATH=/opt/sqlanywhere17/lib64`

`ENV PATH=/opt/sqlanywhere17/bin64:$PATH`

`ENV ODBCINI=/etc/odbc.ini`

`ENV ODBCSYSINI=/etc`

`ENV ODBC_CONNECTION_STRING="DRIVER=/opt/sqlanywhere17/lib64/libdbodbc17_r.so;Host=192.168.4.250;Port=2638;UID=ecrs;PWD=KLio*(0;DatabaseName=catapult;ServerName=catapult;Encryption=TLS(trusted_certificates=/home/dev_user/Scripts/db.x509.pem;skip_certificate_name_check=ON)"`

`ENV GOOGLE_CLIENT_ID=225047214808-i4leluinrr0r472l54oeaen78kf80v5m.apps.googleusercontent.com`

`ENV SMTP_HOST=mail.brattleborofoodcoop.com`

`ENV SMTP_PORT=465`

`ENV SMTP_USER=online@brattleborofoodcoop.com`

`ENV SMTP_FROM_NAME="Brattleboro Food Co-op"`

`EXPOSE 3025`

`CMD ["node", "server.js"]`
