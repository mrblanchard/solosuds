import fs from "fs";
import sharp from "sharp";

const svg = fs.readFileSync("public/care-without-the-mess.svg");
const info = await sharp(svg, { limitInputPixels: false })
  .webp({ quality: 85 })
  .toFile("public/care-without-the-mess.webp");
console.log("Done:", info);
