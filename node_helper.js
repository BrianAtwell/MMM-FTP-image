var fs = require('fs');
const readline = require('readline');
const FTPClient = require('ftp');
const Log = require('logger');
var NodeHelper = require('node_helper');
const ConcatStream = require('concat-stream');
const { Base64Encode } = require('base64-stream');
const { ExtensionAuthorized, MimeTypesAuthorized, SaveDirFileName, SaveLastFileName } = require('./src/constants/img-authorized');
const { ftpOptions} = require('./src/constants/ftp-config');
const {PlainFTPQueue, ImageData} = require('imageQueue');

module.exports = NodeHelper.create({

	imgQueue : new PlainFTPQueue(FTPOptions, self),
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
			case 'LOAD_PREVIOUS_INDEX_CALL':
				console.log('LOAD_PREVIOUS_INDEX_CALL');
				var lImgNum=this.readLastFile(this);
				this.sendSocketNotification('LOAD_PREVIOUS_INDEX', lImgNum);
				break;
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
	
	resetSavedState: function(self) {
		fs.writeFile(SaveLastFileName, "", err => {
		  if (err) {
			console.error(err);
		  } else {
			// file written successfully
		  }
		});
		
		fs.writeFile(SaveDirFileName, "", err => {
		  if (err) {
			console.error(err);
		  } else {
			// file written successfully
		  }
		});
	},
	
	saveDirList: function(self) {
		
		try {
			fileContent = "";
			
			fileContent+=self.dirIndex+"\n";
			
			for(var lDirIndex=0; lDirIndex < self.dirNameList.length; lDirIndex++)
			{
				if(self.dirNameList[lDirIndex]['name'] !== undefined)
				{
					fileContent+=self.dirNameList[lDirIndex]['id'].toString()+"\n";
					fileContent+=self.dirNameList[lDirIndex]['name'].toString()+"\n";
				}
			}
			
			//Save current File name
			fs.writeFile(SaveDirFileName, fileContent, err => {
			  if (err) {
				console.error(err);
			  } else {
				// file written successfully
			  }
			});
		}
		catch(error)
		{
			console.log("Error SaveDirList failed "+error);
		}
	},
	
	saveCurFile: function(self) {
		content = "";
		//content += self.curDirectory+"\n";
		
		var imgIdx = 0;
		
		for(; imgIdx < self.imgNameList.length; imgIdx++)
		{
			if(self.imgNameList[imgIdx] == self.lastPicture)
			{
				break;
			}
		}
		
		content += imgIdx-1 + "\n";
		content += self.curDirectory + "\n";
		content += self.lastPicture + "\n";
		//Save current File name
		fs.writeFile(SaveLastFileName, content, err => {
		  if (err) {
			console.error(err);
		  } else {
			// file written successfully
		  }
		});
	},
	
	readLastFile: function(self) {
		try {
			const data = fs.readFileSync(SaveLastFileName, 'utf8');
			
			firstLineEndPos=data.indexOf("\n");
			data.indexOf("\n");
			console.log("firstLineEndPos: "+firstLineEndPos);
			
			if(firstLineEndPos != -1)
			{
				var num = Number(data.slice(0,firstLineEndPos));
				console.log("file Index "+num);
				return num;
			}
		} catch (err) {
			console.error(err);
		}
		
		
		
		return 0;
	},
	
	loadPreviousState: async function(self) {
		
		try{
			//var lImgNum=self.readLastFile(self);
			
			const fileStream = fs.createReadStream(SaveDirFileName);

			const rl = readline.createInterface({
				input: fileStream,
				crlfDelay: Infinity // To handle different line endings (CRLF or LF)
			});
			
			var tempDirList = [];
			var tempPathVisited = [];
			
			var lineNum = 0;
			var tempDirIndex=0;
			var curIndex = 0;
			var lId = 0;

			rl.on('line', (line) => {
				if(lineNum == 0)
				{
					tempDirIndex=parseInt(line);
				}
				else
				{
					if(curIndex%2 == 0)
					{
						lId = parseInt(line);
					}
					else
					{
						var dirOBj = {
							id: lId,
							name: line
						};
						
						tempDirList.push(dirOBj);
						if(curIndex/2 <= tempDirIndex)
						{
							tempPathVisited.push(line);
							
						}
					}
					
					
					curIndex++;
				}
				lineNum++;
			});

			rl.on('close', () => {
				console.log('Finished reading the file.');
				
				for(var i=0; i < tempDirList.length; i++)
				{
					console.log(tempDirList[i]);
				}
				console.log("End of dir list");
				self.dirIndex = tempDirIndex;
				self.dirPathVisited = tempPathVisited;
				self.dirNameList = tempDirList;
				self.imgNameList = [];
				self.imgBase64 = new Object();
				
				//self.sendSocketNotification('LOAD_PREVIOUS_STATE', lImgNum);
			});

			rl.on('error', (err) => {
				console.error('Error reading the file:', err);
				//self.sendSocketNotification('LOAD_PREVIOUS_STATE', 0);
			});
		}
		catch(error)
		{
			console.log("Error Loading previous state: "+error);
		}
	},

	sendBase64Img: async function (self, imgObject) {
		Log.log("SendBase64Img file: "+payload.fileName);
		
		imgObject.sendImgStream( function(res) {
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
		this.dirIndex = 0;
		this.dirPathVisited = [];
		this.dirNameList = [];
		this.imgNameList = [];
		this.imgBase64 = new Object();
		
		this.resetSavedState(this);
	},

	reset: function () {
		this.restart();

		this.sendSocketNotification('RESET');
	},
});
