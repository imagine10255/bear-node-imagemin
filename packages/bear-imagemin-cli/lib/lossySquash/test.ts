import lossySquash from './index';

// $ ts-node lib/lossySquash/test.ts
lossySquash({sourceFile: './example/source.png', saveFile: './example/lossySquash/image_1024.png', quality: 80, width: 1024});
