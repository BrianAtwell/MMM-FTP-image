// ################################################################ \\
// # 						MMM-FTP-image					  	  # \\
// # 				FTP server image display module				  # \\
// ################################################################ \\

Module.register('MMM-FTP-image', {
	defaults: {
		// FTP directory configuration
		defaultDirPath: null, // Type: string | null => Default directory to retrieve images
		dirPathsAuthorized: [], // Type: Array<string> => List of authorized directories

		// Display configuration
		opacity: 1.0,
		width: '100%',
		height: '100%',
		imgChangeInterval: 10000, // Type: number (ms)
	},

	imgBase64: new Object(), // Type: { base64: string; mimeType: string }

	imageLoadFinished: false,


	failTimeoutInstance: null,
	intervalInstance: null,
	nextDirIntervalInstance: null,

	start: function () {
		this.logMessage('Started.');
		
		config = this.config;
		this.getImageFromFTPServer();

	},

	socketNotificationReceived: function (notification, payload) {
		switch (notification) {

			case 'FTP_IMG_BASE64':
				this.logMessage('Images received !');
				this.IncrementImageIndex();
				this.imgBase64 = payload;
				this.updateDom();
				break;
				

			case 'RESET':
				this.logMessage('RESET');
				this.imageLoadFinished = false;
				clearInterval(this.intervalInstance);
				//clearInterval(this.nextDirIntervalInstance);
				this.getListImgNameFromFTPServer();
				break;
		}
	},

	getDom: function () {
		var wrapper = document.createElement('div');
		
		wrapper.style.display = "grid";
		wrapper.style.height = "100%";

		if (this.error !== null) {
			wrapper.innerHTML = this.translate(this.error);
		}

		const image = this.imgBase64;
		
		if (!this.imageLoadFinished) {
			wrapper.innerHTML = this.translate('LOADING');
			return wrapper;
		}

		if (!image) {
			this.logMessage(`Could not load image (index: ${this.imageDisplayedNumber})`);
			wrapper.innerHTML = this.translate('ERROR LOADING');
			return wrapper;
		}
		else
		{
			this.imageLoadFinished=true;
		}

		wrapper.appendChild(this.createImageElement(image));
		return wrapper;
	},
	
	IncrementImageIndex: function () {
		this.sendSocketNotification('FTP_NEXT_IMG_CALL', {});
	},
	
	getImageFromFTPServer: function () {
		// Send FTP_IMG for get img from FTP server
		this.sendSocketNotification('FTP_IMG_CALL_BASE64', {});
	},

	/**
	 * Send notification of node_helper for get name list from FTP server
	 */
	getListImgNameFromFTPServer: function (isReset=true) {
		if(isReset)
		{
			this.imageDisplayedNumber = 0;
		}
		
		if(this.imgListState == 0)
		{
			this.imgListState=1;
			
			// Send FTP_IMG for get img from FTP server
			this.sendSocketNotification('FTP_IMG_CALL_LIST', {
				defaultDirPath: this.config.defaultDirPath,
				dirPathsAuthorized: this.config.dirPathsAuthorized,
				finishAllImgInCurrentDirectory: this.finishAllImgInCurrentDirectory,
			});
		}
	},

	createImageElement: function (image) {
		var element = document.createElement('img');
		element.src = `data:${image.mimeType};base64, ${image.base64}`;
		element.style.margin = "auto";
		element.style.maxWidth = this.config.width;
		element.style.maxHeight = this.config.height;
		element.style.opacity = this.config.opacity;
		return element;
	},

	/**
	 * Loop to reload image based on user defined interval time
	 */
	scheduleImgUpdateInterval: function () {
		this.logMessage(`Scheduled update interval (${this.config.imgChangeInterval / 1000}s)...`);

		
		// Get first image
		this.sendSocketNotification('FTP_IMG_CALL_BASE64', {});


		// Set interval to reload image
		this.intervalInstance = setInterval(() => {
			this.sendSocketNotification('FTP_IMG_CALL_BASE64', {
				});
		}, this.config.imgChangeInterval);
		
		return true;
	},

	logMessage: function (message, type) {
		switch (type) {
			case 'erorr':
				Log.error(`Module ${this.name} | ${message}`);
				break;
			default:
				Log.info(`Module ${this.name} | ${message}`);
				break;
		}
	},
});
