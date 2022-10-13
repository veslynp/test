'use strict';

const express = require('express')
const {
	v4: uuidv4,
} = require('uuid');
const path = require('path');
const fs = require('fs');
const multer = require("multer");



const app = express()
const port = 3000
const hostname = 'http://localhost:3000/';


const handleError = (err, res, fn) => {
	console.log('handle error', err);
	if(fn) {
		fn();
	}
	res
		.status(500)
		.contentType('application/json')
		.end(JSON.stringify({ err: err }));
};

app.use(express.static('public'))

const upload = multer({
	dest: "public/images/"
});

app.post(
	"/api/image",
	upload.single("file"),
	(req, res) => {
		const tempPath = req.file.path;
		const curFileExt = path.extname(req.file.originalname).toLowerCase();
		const newFileName = uuidv4() + curFileExt;
		const targetPath = path.join(__dirname, 'public','images', newFileName);
		const newUrl = hostname + 'images/' + newFileName;

		if ( /\.(jpe?g|png|gif|bmp)$/i.test(curFileExt) ) {
			fs.rename(tempPath, targetPath, err => {
				if (err) return handleError(err.toString(), res);

				res
					.status(200)
					.contentType('application/json')
					.end(JSON.stringify({ image: newUrl }));
			});
		} else {
			fs.unlink(tempPath, err => {
				if (err) return handleError(err.toString(), res);

				res
					.status(403)
					.contentType('application/json')
					.end(JSON.stringify({ err: 'File isn\' an image' }));
			});
		}
	}
);


app.listen(port, () => {
	console.log(`Example app listening on port ${port}`)
})
