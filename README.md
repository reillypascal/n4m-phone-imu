# n4m-phone-imu
This project contains a Node.JS server to be run in Node For Max. Node serves a webpage over the local network, and the webpage receives IMU values from a mobile phone and sends the values to Max via websockets.

Requirements:
- Max 8

Instructions:
- Create SSL certificate for the HTTPS server. The key should be named "server.key" and the certificate should be named "server.cert". For MacOS/Linux:
```sh
	openssl req -nodes -new -x509 -days 2000 -keyout server.key -out server.cert
```

- note that you can set another number after the -days flag; this is how long the certificate will be valid
- SSL certificate fields:
	- For "Common Name (e.g. server FQDN or your name)" enter  localhost
	- For email address, enter your email
	- You may leave other fields blank
- Open the performance patch in Max
- Click the "script npm install" message and wait for the packages to install (first time only)
- Click the "script start" message to start the server
- Navigate to https://<your-computer's-ip-address>:8000 on a mobile device and select the performer
- Click "get sensor permissions" on the mobile webpage
- Select the performer from the dropdown
