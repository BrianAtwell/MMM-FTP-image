const extensionList = ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp', 'ico', 'dib'];
const mimeTypes = {
	gif: 'image/gif',
	png: 'image/png',
	jpg: 'image/jpg',
	jpeg: 'image/jpg',
	wepb: 'image/webp',
	ico: 'image/ico',
	dib: 'image/dib',
	bmp: 'image/bmp',
};

const saveDirFileName = "dirList.txt";
const saveLastFileName = "lastPicture.txt";

module.exports = {
	MimeTypesAuthorized: mimeTypes,
	ExtensionList: extensionList,
	ExtensionAuthorized: extensionList
		.map(e => e.toUpperCase())
		.join('|')
		.concat(`|${extensionList.join('|')}`),
	SaveDirFileName: saveDirFileName,
	SaveLastFileName: saveLastFileName,
};
