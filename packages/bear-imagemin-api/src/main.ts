import express from 'express';
import fileUpload from 'express-fileupload';
import bodyParser from 'body-parser';
import {lossySquash, losslessSquash} from 'bear-node-imagemin';
import {contentTypeMap} from './config';
import {handleError, handleUncaughtExceptionOrRejection} from './utils';



const app = express();
app.use(fileUpload());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(handleError);


app.get('/', function(req, res) {
    res.send('bear-imagemin-api! (ex: /api/losslessSquash or /api/lossySquash)');
});


/**
 * 壓縮
 * 有設定 品質則會是有損壓縮, 預設為無損
 */
app.post('/api/squash', async function(req, res, next) {

    // @ts-ignore
    const buff = req.files?.sourceFile?.data;
    const resizeWidth = req.body?.resizeWidth;
    const resizeHeight = req.body?.resizeHeight;
    const reqQuality = req.body?.quality;
    const ignoreOverflowSize = req.body?.ignoreOverflowSize;
    const extname = (req.body?.extname ?? '.webp').replace('.','')
        .replace('jpeg','jpg');
    let isLossLess = true;



    let width = undefined;
    let height = undefined;
    let quality = undefined;
    if(resizeWidth !== undefined && resizeWidth !== ''){
        width = Number(resizeWidth);

        if(Number.isNaN(width) ||width <= 0){
            res.status(400).json({
                message: 'resizeWidth need > 0',
            });
            return;
        }


    }
    if(resizeHeight !== undefined && resizeHeight !== ''){
        height = Number(resizeHeight);

        if(Number.isNaN(height) || height <= 0){
            res.status(400).json({
                message: 'resizeHeight need > 0',
            });
            return;
        }

    }

    if(reqQuality !== undefined && reqQuality !== ''){

        quality = Number(reqQuality);
        if(Number.isNaN(quality) || !(quality >= 10 && quality <= 100)){
            res.status(400).json({
                message: 'quality need 10 ~ 100',
            });
            return;
        }else if(reqQuality < 99){
            isLossLess = false;
        }
    }


    if(!Object.keys(contentTypeMap).includes(extname)){
        res.status(400).json({
            message: 'extname only .jpg, .png, .webp',
        });
        return;
    }

    if(!buff){
        res.status(400).json({
            message: 'sourceFile miss',
        });
        return;
    }


    const params = {
        quality: isLossLess ? undefined: quality,
        resize: {width, height, ignoreOverflowSize},
        extname,
    };

    console.log('squash', JSON.stringify(params));

    // 品質低於100 或是無設定為 無損
    try {
        const newBuff = isLossLess ?
            await losslessSquash(buff, params):
            await lossySquash(buff, params);

        const contentType = contentTypeMap[extname];
        res.writeHead(200, {
            'Content-Type': contentType,
            'Content-Disposition': 'attachment; filename=' + `image.${extname}`,
        });
        res.end(newBuff);
        return;

    }catch (e){
        res.status(500).json({
            message: e,
        });
        return;
    }


});




const server = app.listen(3000, function() {
    console.log('imagemin app listening on port 3000!');
});

process.on('unhandledRejection', (err: any) => handleUncaughtExceptionOrRejection(err, server));
process.on('uncaughtException', (err) => handleUncaughtExceptionOrRejection(err, server))
