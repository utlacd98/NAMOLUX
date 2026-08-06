import { readFile } from "node:fs/promises"
import { put } from "@vercel/blob"

const source = new URL("../videos/namolux-social-ad/renders/namolux-social-ad-final.mp4", import.meta.url)
const body = await readFile(source)
const blob = await put("deliveries/namolux-social-ad-final.mp4", body, { access: "private", contentType: "video/mp4", addRandomSuffix: false, cacheControlMaxAge: 60 })
console.log(JSON.stringify({ pathname: blob.pathname, url: blob.url, size: body.length }, null, 2))
