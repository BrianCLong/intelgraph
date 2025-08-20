import ffmpeg from 'fluent-ffmpeg';
import path from 'path';
import fs from 'fs/promises';
import logger from '../../config/logger';
import { v4 as uuidv4 } from 'uuid';

const logger = logger.child({ name: 'VideoFrameExtractor' });

export interface FrameExtractionOptions {
  frameRate?: number; // Frames per second (e.g., 1 for 1fps)
  interval?: number; // Extract a frame every X seconds
  outputDir?: string; // Directory to save extracted frames
  outputFormat?: string; // e.g., 'png', 'jpg'
  startTime?: number; // Start time in seconds
  endTime?: number; // End time in seconds
  extractAudio?: boolean; // Whether to extract audio stream
}

export interface ExtractedFrame {
  framePath: string; // Path to the extracted image file
  timestamp: number; // Timestamp of the frame in seconds
  frameNumber: number; // Sequential frame number
}

export interface ExtractedAudio {
  audioPath: string; // Path to the extracted audio file
  duration: number; // Duration of the audio in seconds
}

export class VideoFrameExtractor {
  private ffmpegPath: string;
  private ffprobePath: string;
  private tempDir: string;

  constructor(ffmpegPath: string, ffprobePath: string, tempDir: string) {
    this.ffmpegPath = ffmpegPath;
    this.ffprobePath = ffprobePath;
    this.tempDir = tempDir;

    ffmpeg.setFfmpegPath(this.ffmpegPath);
    ffmpeg.setFfprobePath(this.ffprobePath);
  }

  /**
   * Extracts frames and optionally audio from a video file.
   * @param videoPath Absolute path to the input video file.
   * @param options Frame extraction options.
   * @returns An object containing extracted frames and audio (if requested).
   */
  async extract(
    videoPath: string,
    options: FrameExtractionOptions = {}
  ): Promise<{ frames: ExtractedFrame[]; audio?: ExtractedAudio }> {
    const {
      frameRate,
      interval,
      outputDir = path.join(this.tempDir, `frames-${uuidv4()}`),
      outputFormat = 'png',
      startTime,
      endTime,
      extractAudio = false,
    } = options;

    await fs.mkdir(outputDir, { recursive: true });
    logger.info(`Extracting frames to: ${outputDir}`);

    const frames: ExtractedFrame[] = [];
    let audio: ExtractedAudio | undefined;
    let frameCount = 0;

    return new Promise(async (resolve, reject) => {
      const command = ffmpeg(videoPath);

      if (startTime !== undefined) {
        command.seekInput(startTime);
      }
      if (endTime !== undefined) {
        command.duration(endTime - (startTime || 0));
      }

      if (frameRate) {
        command.fps(frameRate);
      } else if (interval) {
        command.addOption('-vf', `fps=1/${interval}`);
      } else {
        // Default to 1 frame per second if neither frameRate nor interval is specified
        command.fps(1);
      }

      command
        .output(`${outputDir}/frame-%s.${outputFormat}`)
        .on('filenames', (filenames: string[]) => {
          filenames.forEach((filename) => {
            const timestampMatch = filename.match(/frame-(\d+(\.\d+)?)\./);
            const timestamp = timestampMatch ? parseFloat(timestampMatch[1]) : 0; // Extract timestamp from filename
            frames.push({
              framePath: path.join(outputDir, filename),
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
            } catch (audioErr) {
              logger.error(`Failed to extract audio: ${audioErr}`);
              // Continue without audio if extraction fails
            }
          }
          resolve({ frames, audio });
        })
        .on('error', (err: Error) => {
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
  private async extractAudioStream(
    videoPath: string,
    outputDir: string,
    startTime?: number,
    endTime?: number
  ): Promise<ExtractedAudio> {
    const audioFileName = `audio-${uuidv4()}.mp3`;
    const audioPath = path.join(outputDir, audioFileName);

    return new Promise((resolve, reject) => {
      const command = ffmpeg(videoPath);

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
        .on('error', (err: Error) => {
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
  private async getVideoMetadata(videoPath: string): Promise<ffmpeg.FfprobeData> {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(videoPath, (err, metadata) => {
        if (err) {
          reject(err);
        } else {
          resolve(metadata);
        }
      });
    });
  }

  /**
   * Cleans up temporary directories created during extraction.
   * @param dirPath Path to the directory to remove.
   */
  async cleanup(dirPath: string): Promise<void> {
    try {
      await fs.rm(dirPath, { recursive: true, force: true });
      logger.info(`Cleaned up temporary directory: ${dirPath}`);
    } catch (error) {
      logger.error(`Failed to clean up directory ${dirPath}: ${error}`);
    }
  }
}
