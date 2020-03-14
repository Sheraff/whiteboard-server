export const PUBLIC_ROOT = "./public"

export const STYLE_PUSH = [
	'/components/Card.css',
]

export const SCRIPT_PUSH = [
	'/components/Card.js',
	'/modules/ReadySVGNode.js',
	'/modules/IdlePromise.js',
	'/functions/hex2hsl.js',
	'/components/Grid.js',
	'/modules/Routing.js',
	'/functions/extendSVG.js',
	'/functions/svgToImageBlob.js',
	'/interfaces/IdleNetwork.js',
	'/interfaces/IndexedDB.js',
	'/interfaces/SWJpegBlobUploader.js',
	'/interfaces/SWState.js',
	'/modules/Alphabet.js',
	'/modules/SVGAnim.js',
	'/modules/TextToAlphabet.js',
	'/workers/idleNetworkWorker.js',
	'/workers/indexedDBWorker.js',
]

export const SW_PUSH = [
	'/sw/Debouncer.js',
	'/sw/alphabetCaching.js',
	'/data/alphabet.json',
	'/sw/staticImagesCaching.js',
]