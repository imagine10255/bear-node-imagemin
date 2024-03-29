import {Body, Controller, Get, Post, UseInterceptors, UploadedFile, Res, Logger} from '@nestjs/common';
import {ConfigService} from '@nestjs/config';
import {FileInterceptor} from '@nestjs/platform-express';
import {unlink} from 'node:fs';
import {losslessSquash, lossySquash, TExtname} from 'bear-node-imagemin';
import {SquashDto} from '../dto/imagemin.dto';
import {contentTypeMap} from '../config/content-type';
import {configKey, IImageminConfig} from '../config/imagemin.config';
import {ulid} from 'ulid';



@Controller()
export class ImageminController {
    private readonly logger = new Logger(ImageminController.name);

    constructor(
        private readonly configService: ConfigService,
    ) {}

    @Get()
    getHelloGet(): string {
        return 'Hello World! Imagemin get';
    }
    @Post()
    getHelloPost(): string {
        return 'Hello World! Imagemin post';
    }

    getConfig(): IImageminConfig {
        return this.configService.get<IImageminConfig>(configKey);
    }

    @Post('squash')
    @UseInterceptors(FileInterceptor('sourceFile'))
    async squash(
        @Res() res,
        @Body() body: SquashDto,
        @UploadedFile() sourceFile: Express.Multer.File,
    ): Promise<void> {

        const id = ulid().toLowerCase();
        const extname = ((body.extname ?? '.webp')
            .replace('.', '')
            .replace('jpeg', 'jpg') as TExtname);

        const isLossLess = !(body.quality && body.quality < 99);
        const params = {
            quality: isLossLess ? undefined: body.quality,
            resize: {
                width: body.resizeWidth,
                height: body.resizeHeight,
                ignoreOverflowSize: body.ignoreOverflowSize,
            },
            extname,
        };
        this.logger.debug(`Squash [${id}] start ${JSON.stringify(params)}`);


        try {
            const contentType = contentTypeMap[extname];

            const newBuff = await (isLossLess ? losslessSquash(sourceFile.path, params) : lossySquash(sourceFile.path, params));

            this.logger.log(`Squash [${id}] success`);

            // 刪除檔案
            unlink(sourceFile.path, err => {
                if (err) {
                    this.logger.error(`Squash [${id}] delete file error: ${sourceFile.path}`, err);
                    return;
                }
                this.logger.log(`Squash [${id}] delete ${sourceFile.path}`);
            });

            res.writeHead(200, {
                'Content-Type': contentType,
                'Content-Disposition': 'attachment; filename=' + `image.${extname}`,
            });

            res.end(newBuff);

        } catch (e) {
            this.logger.error(`Squash [${id}] squash error`, e);

            res.status(500).json({
                message: e,
            });
            return;
        }
    }

}
