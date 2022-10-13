'use strict';

const express = require('express')
const {
  v4: uuidv4,
} = require('uuid');
const path = require('path');
const fs = require('fs');
const multer = require("multer");
const glob = require("glob");
const AdmZip = require("adm-zip");



const app = express()
const hostname = 'http://localhost:3001/';
app.mkdir = function(dir) {
  !fs.existsSync(dir) && fs.mkdirSync(dir);
}

app.iniDirectories = async function() {
  app.mkdir(path.join(__dirname, 'public'));
  app.mkdir(path.join(__dirname, 'public', 'images'));
  app.mkdir(path.join(__dirname, 'public', 'upload'));
}
app.iniDirectories();

handleError = (err, res, fn) => {
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
  dest: "public/upload/"
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

app.post(
  "/api/zip",
  upload.single("file"),
  (req, res) => {
    const tempPath = req.file.path;
    const curFileExt = path.extname(req.file.originalname).toLowerCase();

    const tmpPath = path.join(__dirname, 'tmp');

    const cleanup = function() {
      fs.rmSync(tmpPath, { recursive: true, force: true });
      const uploadFolder = path.join(__dirname, 'public', 'upload');
      fs.readdirSync(uploadFolder).forEach(f => fs.rmSync(`${uploadFolder}/${f}`));
    }


    if ( /\.(zip)$/i.test(curFileExt) ) {
      try {
        app.mkdir(tmpPath);

        var zip = new AdmZip(tempPath);

        zip.extractAllTo(tmpPath, true);

        try {
          const getDirectories = function (src, callback) {
            glob(src + '/**/*', callback);
          };
          getDirectories(tmpPath, function (err, result) {
            if (err) return handleError(err.toString(), res, cleanup);
            else {
              let hasImage = [];
              for(let imagePath of result) {
                const curImageExt = path.extname(imagePath).toLowerCase();
                const newFileName = uuidv4() + curImageExt;
                const targetPath = path.join(__dirname, 'public','images', newFileName);
                const newUrl = hostname + 'images/' + newFileName;
                if ( /\.(jpe?g|png|gif|bmp)$/i.test(curImageExt) ) {
                  hasImage.push(newUrl);
                  fs.rename(imagePath, targetPath, err => {
                    if (err) return handleError(err.toString(), res);
                  });
                }
              }

              if(hasImage.length == 0) {
                return handleError("no image found in zip file", res, cleanup);
              } else {
                cleanup();
                res
                  .status(200)
                  .contentType('application/json')
                  .end(JSON.stringify({ images: hasImage }));
              }
            }
          });
        }
        catch (err) {
          return handleError(err.toString(), res, cleanup);
        }


      }
      catch (err){
        // handle error
        return handleError(err.toString(), res);
      }
    } else {
      fs.unlink(tempPath, err => {
        if (err) return handleError(err.toString(), res);

        res
          .status(403)
          .contentType('application/json')
          .end(JSON.stringify({ err: 'File isn\' a zip' }));
      });
    }
  }
);


module.exports = app;
