

class ImageData {
	constructor(path, filename, FTPOptions, resetFunc) {
		this.path = path;
		this.filename = filename;
		this.FTPOptions = FTPOptions;
		this.resetFunc = resetFunc;
		//test commit
	}
	
	get path() {
		return this.path;
	}
	
	get filename() {
		return this.filename;
	}
	
	getFile() {
		connectFTPServer();
	}
	
	reset() {
		this.resetFunc();
	}
	
	end() {
		ftp.end();
	}
	
	async sendImgStream(ftp, self, streamPromiseFunc) {
		Log.log("SendBase64Img file: "+fileName);
		await new Promise((resolve, reject) => {
			ftp.get(self.fileName, function (err, stream) {
				if (err) {
					console.warn('Error while getting file', err);
					reject(err);
					self.reset();
				}
				
				streamPromiseFunc(fileName, stream)
					.then(function (res) {
						resolve();
					})
					.catch(function (err) {
					console.warn('Error while converting stream to base64', err);
					self.reset();
					self.end();
					throw new Error(err);
				});
				

				
			});
		});

		//self.sendSocketNotification('FTP_IMG_BASE64', self.imgBase64);
	}
	
	connectFTPServer() {
        const ftp = new FTPClient();
        const self = this;

        ftp.on('ready', function () {
            self.moveDir(ftp, self, self.path);
            self.sendBase64Img(ftp, self);

            ftp.end();
        });

        ftp.connect({
            ...this.FTPOptions,
        });
    }
	
	moveDir(ftp, self, path) {
        //self.curDirectory=path;
        ftp.cwd(path, function (err) {
            if (err) {
                console.warn('Error while moving to directory', err);
                console.log('Path: ' + path);
                self.reset();
                throw err;
            }
        });

    }
	
}

class ImageFTPQueue {
    constructor(FTPOptions) {}

    Peek() {}

    Pop() {}

    IsEmpty() {
        return true;
    }
}

class PlainFTPQueue extends ImageFTPQueue {
    constructor(FTPOptions, nodeHelper) {
		this.curImageIdx = 0;
		
		this.defaultDirPath=null;
		this.dirPathsAuthorized=[];
		this.finishAllImgInCurrentDirectory=false;
		
        this.dirIndex = 0;
        this.dirPathVisited = []; // Array<string>
        this.dirNameList = []; // Array<{ id: number; name: string }>

        this.imgNameList = []; // Array<{ id: number; name: string }>
        this.curDirectory = "";
        this.lastPicture = "";
        this.FTPOptions = FTPOptions;
		this.incrementError=0;
		
		this.nodeHelper = nodeHelper;
		this.imgObj = null;
		
    }
	
	Peek() {
		if(this.imgNameList.length == 0)
		{
			Increment();
		}
		
		return this.imgObj;
	}
	
	IncrementDir() {
		this.dirIndex++;
		if (
			this.dirIndex > this.dirNameList.length
		) {
			//self.dirIndex = -1;
			//self.dirPathVisited = [];
			//Log.log("command 'get'");
			this.restart();
		}
	}
	
	Increment() {
		if(this.imgNameList.length != 0 && this.curImageIdx < this.imgNameList - 1)
		{
			this.curImageIdx++;
		}
		else
		{
			this.incrementError=0;
			this.curImageIdx = 0;
			while(this.imgNameList.length == 0 && this.incrementError == 0)
			{
				
				this.connectFTPServer('list');
				if(this.imgNameList.length == 0)
				{
					IncrementDir();
				}
			}
		}
		this.imgObj = genImgObj();
		
	}

    connectFTPServer(type) {
        const ftp = new FTPClient();
        const self = this;

        ftp.on('ready', function () {
            switch (type) {
            case 'list':
				if (self.getPath(self, type)) {
					self.moveDir(ftp, self, path);
				}
                self.getPathList(ftp, self);
                //self.saveDirList(self);
                break;
            case 'get':
                if (self.getPath(self, type)) {
					self.moveDir(ftp, self, path);
				}
                //self.saveCurFile(self);
                break;
            default:
                throw new Error(`This type is not implemented => ${type}`);
				
            }
            ftp.end();
        });

        ftp.connect({
            ...this.FTPOptions,
        });
    }

    getPath(self, type) {
        let path = null;

        if (self.dirIndex > 0) {
            path = self.defaultDirPath
                 ? `${self.defaultDirPath}/${self.dirNameList[self.dirIndex - 1].name}`
                 : self.dirNameList[self.dirIndex - 1].name;

            if (type === 'list') {
                self.dirPathVisited.push(self.dirNameList[self.dirIndex - 1].name);
            }
        }
        // First call and defaultDirPath is defined
        else if (self.defaultDirPath && !self.finishAllImgInCurrentDirectory) {
            path = self.defaultDirPath;
        }
        // End all directory has been visited and defaultDirPath is defined => restart
        else if (self.defaultDirPath && self.finishAllImgInCurrentDirectory) {
            self.dirIndex = 0;
            self.dirPathVisited = [];
            path = self.defaultDirPath;
            //Log.log('MMM-FTP-image module End all directory has been visited.');
        }
		
		return path;
    }
	
	genImgObj()
	{
		let path = self.getPath(self, type);
		return new ImageData(path, this.imgNameList[this.curImageIdx], FTPOptions, this.reset);
	}

    moveDir(ftp, self, path) {
        //self.curDirectory=path;
        ftp.cwd(path, function (err) {
            if (err) {
                console.warn('Error while moving to directory', err);
                console.log('Path: ' + path);
                self.reset();
                throw err;
            }
        });

    }

    getPathList(ftp, self) {

        ftp.pwd(function (err, path) {
            if (err) {

                console.warn('Error PWD ', err);
            } else {
                self.curDirectory = path;
            }
        });

        ftpList = function (err, list) {
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
                        console.log("Added new Picture: " + file.name);
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
                            self.dirPathsAuthorized.includes(file.name))) {
                        self.dirNameList.push({
                            name: self.curDirectory + file.name,
                            id: self.dirNameList.length + 1,
                        });
                    }
                    break;
                }
            }

            console.log("dirIndex" + self.dirIndex);

            for (var i = 0; i < self.dirPathVisited.length; i++) {
                console.log("PathVisited: " + self.dirPathVisited[i]);
            }

            for (var i = 0; i < self.dirNameList.length; i++) {
                console.log("Dir: " + self.dirNameList[i]['name']);
            }

            ftp.end();

            //self.sendSocketNotification('FTP_IMG_LIST_NAME', self.imgNameList);
        }

        ftp.list(ftpList);
    }
	
	restart() {
		this.incrementError++;
		
		this.dirIndex = 0;
		this.dirPathVisited = [];
		this.dirNameList = [];
		this.imgNameList = [];
		this.imgBase64 = new Object();
		
		//this.resetSavedState(this);
	}

	reset() {
		this.restart();

		this.nodeHelper.sendSocketNotification('RESET');
	}
}


module.exports = {
	"ImageData" : ImageData,
	"PlainFTPQueue" : PlainFTPQueue
	
};