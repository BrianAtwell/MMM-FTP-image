var fs = require('fs');
const readline = require('readline');
const FTPClient = require('ftp');
const Log = require('logger');
var NodeHelper = require('node_helper');
const ConcatStream = require('concat-stream');
const { Base64Encode } = require('base64-stream');
const { ExtensionAuthorized, MimeTypesAuthorized, SaveDirFileName, SaveLastFileName } = require('./src/constants/img-authorized');
const { ftpOptions} = require('./src/constants/ftp-config');
const {PlainFTPQueue, ImageData} = require('./src/imagequeue');



module.exports = NodeHelper.create({

	imgQueue : new PlainFTPQueue(ftpOptions, self),
	imgObject: null,
	imgBase64: new Object(), // { base64: string; mimeType: string }

	init: function () {
		Log.log('MMM-FTP-image module helper initialized.');
		//this.loadPreviousState(this);
	},
	
	start: function() {
		Log.log('MMM-FTP-image module helper Started.');
		
	},

	socketNotificationReceived: function (notification, webPayload) {
		payload = this.createPayload(webPayload);
		switch (notification) {

			case 'FTP_NEXT_IMG_CALL':
				imgQueue.Increment();
				break;
			case 'FTP_IMG_CALL_BASE64':
				this.imgBase64 = new Object();
				this.imgObject = imgQueue.Peek();
				sendBase64Img(this, this.imgObject);
				break;
			case 'PRINT_LIST':
				for(var i = 0; i < this.dirNameList.length; i++)
				{
					Log.log('dir['+i+']:['+this.dirNameList[i].id+']'+this.dirNameList[i].name);
				}
				break;
		}
	},

	sendBase64Img: async function (self, imgObject) {
		Log.log("SendBase64Img file: "+payload.fileName);
		
		imgObject.sendImgStream(this, function(res) {
			lPromise = self.streamToBase64(stream, ftp)
			.then(function (res) {
				self.imgBase64 = {
					base64: res,
					mimeType: self.getMimeType(fileName),
				};
				self.sendSocketNotification('FTP_IMG_BASE64', self.imgBase64);
			})
			.catch(function (err) {
				console.warn('Error while converting stream to base64', err);
				imgObject.reset();
				throw new Error(err);
			});
			return lPromise;
		});
		

	},

	streamToBase64: function (stream, imgObject) {
		return new Promise((resolve, reject) => {
			const base64 = new Base64Encode();

			const cbConcat = base64 => {
				resolve(base64);
			};

			stream
				.pipe(base64)
				.pipe(ConcatStream(cbConcat))
				.once('close', function () {
					imgObject.end();
				})
				.on('error', error => {
					console.warn('Error while piping stream', error);
					reject(error);
					imgObject.reset();
				});
		});
	},

	getMimeType: function (filename) {
		for (const s in MimeTypesAuthorized) {
			if (filename.indexOf(s) === 0) {
				return MimeTypesAuthorized[s];
			}
		}
	},
	
	restart: function() {

		this.imgBase64 = new Object();
	},

	reset: function () {
		this.sendSocketNotification('RESET');
	},
});
