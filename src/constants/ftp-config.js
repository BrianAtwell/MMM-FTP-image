var fs = require('fs');

module.exports = {
	ftpOptions: {
			// FTP server configuration
			port: 201,
			user: 'ftpuser',
			host: '192.168.1.50',
			password: 'password',

			// Display configuration
			opacity: 1.0,
			width: '100%',
			height: '100vh',
			imgChangeInterval: 5000,

			// FTP directory configuration
			defaultDirPath: null,
			dirPathsAuthorized: [],
			finishAllImgInCurrentDirectory: false,
			secure: true,
			secureOptions: {
				ca: [ fs.readFileSync('/etc/ssl/certs/vsftpd_pics.pem') ],
				rejectUnauthorized: false
			},
		},
};

