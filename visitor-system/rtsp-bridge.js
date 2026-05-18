require('dotenv').config();
const Stream = require('node-rtsp-stream');
const ffmpegPath = require('ffmpeg-static');
const path = require('path');

// Add ffmpeg-static to path so node-rtsp-stream can find it
process.env.PATH = path.dirname(ffmpegPath) + path.delimiter + process.env.PATH;

// RTSP URL provided in the .env file
const streamUrl = process.env.RTSP_CAMERA_URL;

if (!streamUrl) {
    console.error('ERROR: RTSP_CAMERA_URL not found in .env file');
    process.exit(1);
}

try {
    const stream = new Stream({
        name: 'vms_camera',
        streamUrl: streamUrl,
        wsPort: 9997,
        ffmpegOptions: {
            '-stats': '', // Print ffmpeg stats
            '-r': 30,     // 30 fps
            '-s': '1280x720', // Resolution
            '-b:v': '2000k'  // Bitrate
        }
    });

    console.log('================================================');
    console.log('   RTSP TO WEBSOCKET BRIDGE STARTED');
    console.log('================================================');
    console.log('WebSocket Server: ws://127.0.0.1:9997');
    console.log('Source Stream:   ' + streamUrl);
    console.log('Status:          Active and broadcasting');
    console.log('------------------------------------------------');
    console.log('Keep this terminal open to view the live feed.');
} catch (err) {
    console.error('Failed to start RTSP bridge:', err.message);
    console.log('Ensure FFmpeg is installed and node-rtsp-stream is installed.');
}
