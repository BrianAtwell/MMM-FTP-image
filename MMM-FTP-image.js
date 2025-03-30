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

	imgNameList: [], // Type: Array<{ mimeType: string; base64: string }>
	imgBase64: new Object(), // Type: { base64: string; mimeType: string }
	imageDisplayedNumber: 0,

	imageLoadFinished: false,
	finishAllImgInCurrentDirectory: false,

	intervalInstance: null,
	nextDirIntervalInstance: null,

	start: function () {
		this.logMessage('Started.');
		
		config = this.config;
		finishAllImgInCurrentDirectory = this.finishAllImgInCurrentDirectory;
		startObj=this;
		

		
		this.imageDisplayedNumber=0;

		this.getListImgNameFromFTPServer();
	},

	socketNotificationReceived: function (notification, payload) {
		switch (notification) {
			case 'FTP_IMG_LIST_NAME':
				this.logMessage('Images list received !');
				this.imgNameList = payload;
				

				

				if (!this.imageLoadFinished || this.finishAllImgInCurrentDirectory) {
					this.logMessage('scheduleImgUpdateInterval ImgList !');
					this.scheduleImgUpdateInterval();
					this.finishAllImgInCurrentDirectory = false;
				}

				if (this.imageLoadFinished) break;

			case 'FTP_IMG_BASE64':
				this.logMessage('Images received !');
				this.imgBase64 = payload;
				this.incrementImageIndex();
				this.updateDom();
				break;

			case 'RESET':
				this.logMessage('RESET');
				this.imageLoadFinished = false;
				this.finishAllImgInCurrentDirectory = true;
				this.imgNameList = [];
				this.imageDisplayedNumber = 0;
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

		if (!this.imageLoadFinished) {
			wrapper.innerHTML = this.translate('LOADING');
			return wrapper;
		}

		const image = this.imgBase64;

		if (!image) {
			this.logMessage(`Could not load image (index: ${this.imageDisplayedNumber})`);
			wrapper.innerHTML = this.translate('ERROR LOADING');
			return wrapper;
		}

		wrapper.appendChild(this.createImageElement(image));
		return wrapper;
	},

	/**
	 * Send notification of node_helper for get name list from FTP server
	 */
	getListImgNameFromFTPServer: function () {
		this.imageDisplayedNumber = 0;

		// Send FTP_IMG for get img from FTP server
		this.sendSocketNotification('FTP_IMG_CALL_LIST', {
			defaultDirPath: this.config.defaultDirPath,
			dirPathsAuthorized: this.config.dirPathsAuthorized,
			finishAllImgInCurrentDirectory: this.finishAllImgInCurrentDirectory,
		});
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

		const payload = {
			defaultDirPath: this.config.defaultDirPath,
			dirPathsAuthorized: this.config.dirPathsAuthorized,
			finishAllImgInCurrentDirectory: this.finishAllImgInCurrentDirectory,
		};
		
		lFileName=undefined;
		
		// When the list is empty from an empty directory or possibilly a failed ftp it will produce and exception.
		// We can avoid that with try and catch or if statement.
		if(this.imageDisplayedNumber != undefined && this.imgNameList  != undefined && this.imgNameList[this.imageDisplayedNumber] != undefined && 'name' in this.imgNameList[this.imageDisplayedNumber])
		{
			//this.logMessage('Name is undefined Img# ' + this.imageDisplayedNumber+ ' imgNameList \'' + this.imgNameList+"'");
			//this.getListImgNameFromFTPServer();
			//return;
			
			lFileName = this.imgNameList[this.imageDisplayedNumber]['name'];
			
		}
		
		/* //Alternate to the if statement.
		try{
			lFileName = this.imgNameList[this.imageDisplayedNumber]['name'];
		}
		catch(error) {
			this.logMessage('No current image list');
		}
		*/
		
		if(lFileName == undefined)
		{
			return;
		}
		
		// Get first image
		this.sendSocketNotification('FTP_IMG_CALL_BASE64', {
			...payload,
			fileName: lFileName,
		});

		

		this.imageLoadFinished = true;
		this.finishAllImgInCurrentDirectory = false;

		// Set interval to reload image
		this.intervalInstance = setInterval(() => {
			if(this.imgNameList.length > this.imageDisplayedNumber)
			{
				this.sendSocketNotification('FTP_IMG_CALL_BASE64', {
					...payload,
					fileName: this.imgNameList[this.imageDisplayedNumber].name,
				});
			}
		}, this.config.imgChangeInterval);
	},

	incrementImageIndex: function () {
		this.logMessage(`Current image index: ${this.imageDisplayedNumber}`);

		// if you have a directory that is empty or project files for gimp or photoshop the list will be 0.
		// So add a check for that.
		// TODO: test if this will cause a endless loop or other bugs. I think there is a bug producing empty lists.
		if (this.imageDisplayedNumber === this.imgNameList.length - 1 || this.imgNameList.length == 0) {
			clearInterval(this.intervalInstance);
			clearInterval(this.nextDirIntervalInstance);

			// Wait 10s before call next directory
			this.nextDirIntervalInstance = setTimeout(() => {
				console.log("Next Directory");
				this.imgNameList = [];
				this.finishAllImgInCurrentDirectory = true;
				this.sendSocketNotification('FTP_IMG_CALL_NEXT_DIR');
				this.getListImgNameFromFTPServer();
			}, this.config.imgChangeInterval);
			return;
		}

		this.imageDisplayedNumber++;
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
