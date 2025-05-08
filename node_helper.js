var fs = require('fs');
const readline = require('readline');
const FTPClient = require('ftp');
const Log = require('logger');
var NodeHelper = require('node_helper');
const ConcatStream = require('concat-stream');
const { Base64Encode } = require('base64-stream');
const { ExtensionAuthorized, MimeTypesAuthorized, SaveDirFileName, SaveLastFileName } = require('./src/constants/img-authorized');
const { ftpOptions} = require('./src/constants/ftp-config');

module.exports = NodeHelper.create({
	dirIndex: 0,
	dirPathVisited: [], // Array<string>
	dirNameList: [], // Array<{ id: number; name: string }>

	imgNameList: [], // Array<{ id: number; name: string }>
	curDirectory: "",
	lastPicture: "",
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
			case 'FTP_IMG_CALL_LIST':
			
				this.saveDirList(this);
				this.imgNameList = [];

				if (payload.dirPathsAuthorized) {
					this.dirPathsAuthorized = payload.dirPathsAuthorized;
					this.connectFTPServer('list', payload);
				} else {
					Log.error('dirPathsAuthorized is not defined !');
				}
				break;
			case 'FTP_IMG_CALL_BASE64':
				this.lastPicture = payload.fileName;
				
				this.imgBase64 = new Object();
				this.connectFTPServer('get', payload);
				break;
			case 'FTP_IMG_CALL_NEXT_DIR':
				this.dirIndex++;
				if (
					this.dirIndex > this.dirNameList.length
				) {
					//self.dirIndex = -1;
					//self.dirPathVisited = [];
					//Log.log("command 'get'");
					this.restart();
				}
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
	
	
	
	createPayload: function(webPayload) {
		payload = {};
		
		Object.assign(payload, ftpOptions);
		Object.assign(payload, webPayload);
		
		return payload;
	},

	connectFTPServer: function (type, webPayload) {
		const ftp = new FTPClient();
		const self = this;

		ftp.on('ready', function () {
			switch (type) {
				case 'list':
					self.dirChangeAlgo(ftp, self, webPayload, type);
					self.sendListName(ftp, self);
					//self.saveDirList(self);
					break;
				case 'get':
					self.dirChangeAlgo(ftp, self, webPayload, type);
					self.sendBase64Img(ftp, self, webPayload);
					self.saveCurFile(self);
					break;
				default:
					throw new Error(`This type is not implemented => ${type}`);
			}
			ftp.end();
		});

		ftp.connect({
			...ftpOptions,
		});
	},

	dirChangeAlgo: function (ftp, self, payload, type) {
		let path = null;
		

		if (self.dirIndex > 0) {
			path = payload.defaultDirPath
				? `${payload.defaultDirPath}/${self.dirNameList[self.dirIndex - 1].name}`
				: self.dirNameList[self.dirIndex - 1].name;

			if (type === 'list') {
				self.dirPathVisited.push(self.dirNameList[self.dirIndex - 1].name);
			}

			if (
				self.dirPathVisited.length > self.dirNameList.length &&
				type === 'get' &&
				payload.finishAllImgInCurrentDirectory
			) {
				//self.dirIndex = -1;
				//self.dirPathVisited = [];
				self.reset();
			}
		}
		// First call and defaultDirPath is defined
		else if (payload.defaultDirPath && !payload.finishAllImgInCurrentDirectory) {
			path = payload.defaultDirPath;
		}
		// End all directory has been visited and defaultDirPath is defined => restart
		else if (payload.defaultDirPath && payload.finishAllImgInCurrentDirectory) {
			self.dirIndex = 0;
			self.dirPathVisited = [];
			path = payload.defaultDirPath;
			//Log.log('MMM-FTP-image module End all directory has been visited.');
		}

		if (path) {
			self.moveDir(ftp, self, path);
		}
	},

	moveDir: function (ftp, self, path) {
		//self.curDirectory=path;
		ftp.cwd(path, function (err) {
			if (err) {
				console.warn('Error while moving to directory', err);
				console.log('Path: '+path);
				self.reset();
				throw err;
			}
		});
		
		
	},

	sendListName: function (ftp, self) {		
		
		ftp.pwd(function (err, path) {
			if (err) {
				
				console.warn('Error PWD ', err);
			}
			else
			{
				self.curDirectory = path;
			}
		});
		
		ftpList = async function (err, list) {
			if (err) {
				console.warn('Error while listing files', err);
				self.reset();
				throw err;
			}

			for (let i = 0; i < list.length; i++) {
				const file = list[i];

				switch (file.type) {
					case '-': // File type
						if (file.name.match(new RegExp(`.(${ExtensionAuthorized}?)$`, 'gm'))) {
							console.log("Added new Picture: "+file.name);
							self.imgNameList.push({
								name: file.name,
								id: self.imgNameList.length + 1,
							});
						}
						break;

					case 'd': // Directory type
						if (
							(!['.', '..'].includes(file.name) &&
								(!self.dirPathsAuthorized || self.dirPathsAuthorized.length === 0)) ||
							(!['.', '..'].includes(file.name) &&
								self.dirPathsAuthorized &&
								self.dirPathsAuthorized.includes(file.name))
						) {
							self.dirNameList.push({
								name: self.curDirectory+file.name,
								id: self.dirNameList.length + 1,
							});
						}
						break;
				}
			}
			
			console.log("dirIndex"+self.dirIndex);
			
			for(var i=0; i<self.dirPathVisited.length; i++)
			{
				console.log("PathVisited: "+self.dirPathVisited[i]);
			}
			
			for(var i=0; i<self.dirNameList.length; i++)
			{
				console.log("Dir: "+self.dirNameList[i]['name']);
			}

			ftp.end();

			self.sendSocketNotification('FTP_IMG_LIST_NAME', self.imgNameList);
		}
		
		ftp.list(ftpList);
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
