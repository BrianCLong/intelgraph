"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VideoFrameExtractor = void 0;
const fluent_ffmpeg_1 = __importDefault(require("fluent-ffmpeg"));
const path_1 = __importDefault(require("path"));
const promises_1 = __importDefault(require("fs/promises"));
const uuid_1 = require("uuid");
const logger = logger.child({ name: 'VideoFrameExtractor' });
class VideoFrameExtractor {
    constructor(ffmpegPath, ffprobePath, tempDir) {
        this.ffmpegPath = ffmpegPath;
        this.ffprobePath = ffprobePath;
        this.tempDir = tempDir;
        fluent_ffmpeg_1.default.setFfmpegPath(this.ffmpegPath);
        fluent_ffmpeg_1.default.setFfprobePath(this.ffprobePath);
    }
    /**
     * Extracts frames and optionally audio from a video file.
     * @param videoPath Absolute path to the input video file.
     * @param options Frame extraction options.
     * @returns An object containing extracted frames and audio (if requested).
     */
    async extract(videoPath, options = {}) {
        const { frameRate, interval, outputDir = path_1.default.join(this.tempDir, `frames-${(0, uuid_1.v4)()}`), outputFormat = 'png', startTime, endTime, extractAudio = false, } = options;
        await promises_1.default.mkdir(outputDir, { recursive: true });
        logger.info(`Extracting frames to: ${outputDir}`);
        const frames = [];
        let audio;
        let frameCount = 0;
        return new Promise(async (resolve, reject) => {
            const command = (0, fluent_ffmpeg_1.default)(videoPath);
            if (startTime !== undefined) {
                command.seekInput(startTime);
            }
            if (endTime !== undefined) {
                command.duration(endTime - (startTime || 0));
            }
            if (frameRate) {
                command.fps(frameRate);
            }
            else if (interval) {
                command.addOption('-vf', `fps=1/${interval}`);
            }
            else {
                // Default to 1 frame per second if neither frameRate nor interval is specified
                command.fps(1);
            }
            command
                .output(`${outputDir}/frame-%s.${outputFormat}`)
                .on('filenames', (filenames) => {
                filenames.forEach((filename) => {
                    const timestampMatch = filename.match(/frame-(\d+(\.\d+)?)\./);
                    const timestamp = timestampMatch ? parseFloat(timestampMatch[1]) : 0; // Extract timestamp from filename
                    frames.push({
                        framePath: path_1.default.join(outputDir, filename),
                        timestamp: timestamp,
                        frameNumber: frameCount++, // Simple sequential numbering
                    });
                });
            })
                .on('end', async () => {
                logger.info(`Finished frame extraction for ${videoPath}. Extracted ${frames.length} frames.`);
                if (extractAudio) {
                    try {
                        audio = await this.extractAudioStream(videoPath, outputDir, startTime, endTime);
                        logger.info(`Finished audio extraction for ${videoPath}.`);
                    }
                    catch (audioErr) {
                        logger.error(`Failed to extract audio: ${audioErr}`);
                        // Continue without audio if extraction fails
                    }
                }
                resolve({ frames, audio });
            })
                .on('error', (err) => {
                logger.error(`Error during frame extraction for ${videoPath}: ${err.message}`);
                reject(err);
            })
                .run();
        });
    }
    /**
     * Extracts the audio stream from a video file.
     * @param videoPath Absolute path to the input video file.
     * @param outputDir Directory to save the extracted audio file.
     * @param startTime Start time in seconds.
     * @param endTime End time in seconds.
     * @returns Path to the extracted audio file.
     */
    async extractAudioStream(videoPath, outputDir, startTime, endTime) {
        const audioFileName = `audio-${(0, uuid_1.v4)()}.mp3`;
        const audioPath = path_1.default.join(outputDir, audioFileName);
        return new Promise((resolve, reject) => {
            const command = (0, fluent_ffmpeg_1.default)(videoPath);
            if (startTime !== undefined) {
                command.seekInput(startTime);
            }
            if (endTime !== undefined) {
                command.duration(endTime - (startTime || 0));
            }
            command
                .output(audioPath)
                .noVideo()
                .audioCodec('libmp3lame')
                .on('end', async () => {
                // Get audio duration
                const metadata = await this.getVideoMetadata(videoPath);
                const duration = metadata.format.duration || 0;
                resolve({ audioPath, duration });
            })
                .on('error', (err) => {
                reject(err);
            })
                .run();
        });
    }
    /**
     * Gets metadata of a video file using ffprobe.
     * @param videoPath Absolute path to the video file.
     * @returns Video metadata.
     */
    async getVideoMetadata(videoPath) {
        return new Promise((resolve, reject) => {
            fluent_ffmpeg_1.default.ffprobe(videoPath, (err, metadata) => {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(metadata);
                }
            });
        });
    }
    /**
     * Cleans up temporary directories created during extraction.
     * @param dirPath Path to the directory to remove.
     */
    async cleanup(dirPath) {
        try {
            await promises_1.default.rm(dirPath, { recursive: true, force: true });
            logger.info(`Cleaned up temporary directory: ${dirPath}`);
        }
        catch (error) {
            logger.error(`Failed to clean up directory ${dirPath}: ${error}`);
        }
    }
}
exports.VideoFrameExtractor = VideoFrameExtractor;
//# sourceMappingURL=VideoFrameExtractor.js.map