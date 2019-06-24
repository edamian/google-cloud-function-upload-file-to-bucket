const path = require('path');
const os = require('os');
const fs = require('fs');

const Busboy = require('busboy');
const {Storage} = require('@google-cloud/storage');

const storage = new Storage();

exports.fileUploader = (req, res) => {
    if(req.method === 'POST') {
        let response = {
            code : 0,
            message : ''
        };

        try {
            const bucketName = "";

            // List bucket files 
            storage.bucket(bucketName).getFiles((err, files) => {
                if(!err) {
                    files.forEach(file => {
                        console.log(`File info`);
                        console.log(file);
                    })
                }
            });


            //Upload files to bucket
            const busboy = new Busboy({headers: req.headers});
            const tmpdir = os.tmpdir();
        
            const fields = {};
            const uploads = {};

            busboy.on('field', (fieldname, val) => {
                console.log(`Processed field ${fieldname}: ${val}`);
                fields[fieldname] = val;
            });

            const fileWrites = [];

            busboy.on('file', (fieldname, file, filename) => {
                console.log(`Processed file ${filename}`);
                const filepath = path.join(tmpdir, filename);
                uploads[fieldname] = filepath;

                const writeStream = fs.createWriteStream(filepath);
                file.pipe(writeStream);

                const promise = new Promise((resolve, reject) => {
                    file.on('end', () => {
                        writeStream.end();
                    });
                    writeStream.on('finish', resolve);
                    writeStream.on('error', reject);
                });
                fileWrites.push(promise);
            });
        
            busboy.on('finish', () => {
                Promise.all(fileWrites).then( ()=> {
                        for( const name in uploads) {
                            const file = uploads[name];
                            storage.bucket(bucketName).upload(file, function(err, file, apiResponse) {
                                if(!err) {
                                    console.log(typeof file);
                                    console.log(`File name ${file.name}`);
                                    console.log(apiResponse);
                                } else {
                                    console.error('Error when trying to upload file');
                                    console.error(err);
                                }
                            });
                            console.log(`${file} uploaded to ${bucketName}`);
                        }
                        res.send();
                });
            });

            busboy.end(req.rawBody);

        } catch(error) {
            console.error(error);
        }

        res.setHeader('content-type','application/json');
        res.send(JSON.stringify(response));
       
    } else {
        response.code = 405;
        response.message = `Method ${req.method} now allowed`;
        
        console.error(`Method ${req.method} now allowed`);
        res.status(405).send(JSON.stringify(response)).end();

    }
};