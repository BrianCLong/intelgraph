"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const VideoFrameExtractor_1 = require("../VideoFrameExtractor");
const fluent_ffmpeg_1 = __importDefault(require("fluent-ffmpeg"));
const promises_1 = __importDefault(require("fs/promises"));
// Mock ffmpeg and fs/promises
jest.mock('fluent-ffmpeg');
jest.mock('fs/promises');
describe('VideoFrameExtractor', () => {
    let extractor;
    const mockFfmpegPath = '/usr/bin/ffmpeg';
    const mockFfprobePath = '/usr/bin/ffprobe';
    const mockTempDir = '/tmp/test-temp';
    const mockVideoPath = '/path/to/test-video.mp4';
    beforeEach(() => {
        extractor = new VideoFrameExtractor_1.VideoFrameExtractor(mockFfmpegPath, mockFfprobePath, mockTempDir);
        // Reset mocks
        fluent_ffmpeg_1.default.mockClear();
        promises_1.default.mkdir.mockClear();
        promises_1.default.rm.mockClear();
        // Mock ffmpeg chainable methods
        fluent_ffmpeg_1.default.mockImplementation(() => ({
            seekInput: jest.fn().mockReturnThis(),
            duration: jest.fn().mockReturnThis(),
            fps: jest.fn().mockReturnThis(),
            addOption: jest.fn().mockReturnThis(),
            output: jest.fn().mockReturnThis(),
            noVideo: jest.fn().mockReturnThis(),
            audioCodec: jest.fn().mockReturnThis(),
            on: jest.fn((event, callback) => {
                if (event === 'end') {
                    // Simulate successful end
                    callback();
                }
                else if (event === 'filenames') {
                    // Simulate filenames being emitted
                    callback(['frame-0.000.png', 'frame-1.000.png']);
                }
                return this;
            }),
            run: jest.fn(),
        }));
        // Mock ffprobe
        fluent_ffmpeg_1.default.ffprobe.mockImplementation((_path, callback) => {
            callback(null, { format: { duration: 10 } }); // Mock video duration
        });
    });
    it('should extract frames with default options', async () => {
        const { frames, audio } = await extractor.extract(mockVideoPath);
        expect(promises_1.default.mkdir).toHaveBeenCalledWith(expect.stringContaining(mockTempDir), { recursive: true });
        expect(fluent_ffmpeg_1.default).toHaveBeenCalledWith(mockVideoPath);
        expect(fluent_ffmpeg_1.default.mock.results[0].value.fps).toHaveBeenCalledWith(1); // Default fps
        expect(fluent_ffmpeg_1.default.mock.results[0].value.output).toHaveBeenCalledWith(expect.stringContaining('frame-%s.png'));
        expect(fluent_ffmpeg_1.default.mock.results[0].value.run).toHaveBeenCalled();
        expect(frames.length).toBe(2);
        expect(frames[0].framePath).toContain('frame-0.000.png');
        expect(frames[1].framePath).toContain('frame-1.000.png');
        expect(audio).toBeUndefined();
    });
    it('should extract frames with specified frameRate', async () => {
        await extractor.extract(mockVideoPath, { frameRate: 5 });
        expect(fluent_ffmpeg_1.default.mock.results[0].value.fps).toHaveBeenCalledWith(5);
    });
    it('should extract frames with specified interval', async () => {
        await extractor.extract(mockVideoPath, { interval: 2 });
        expect(fluent_ffmpeg_1.default.mock.results[0].value.addOption).toHaveBeenCalledWith('-vf', 'fps=1/2');
    });
    it('should extract audio when extractAudio is true', async () => {
        const { audio } = await extractor.extract(mockVideoPath, { extractAudio: true });
        expect(audio).toBeDefined();
        expect(audio?.audioPath).toContain('audio-');
        expect(audio?.audioPath).toContain('.mp3');
        expect(audio?.duration).toBe(10);
        expect(fluent_ffmpeg_1.default.mock.results[1].value.noVideo).toHaveBeenCalled(); // Second ffmpeg call for audio
        expect(fluent_ffmpeg_1.default.mock.results[1].value.audioCodec).toHaveBeenCalledWith('libmp3lame');
    });
    it('should clean up temporary directory', async () => {
        const tempDirToClean = '/tmp/some-temp-dir';
        await extractor.cleanup(tempDirToClean);
        expect(promises_1.default.rm).toHaveBeenCalledWith(tempDirToClean, { recursive: true, force: true });
    });
    it('should handle ffmpeg errors during frame extraction', async () => {
        fluent_ffmpeg_1.default.mockImplementationOnce(() => ({
            seekInput: jest.fn().mockReturnThis(),
            duration: jest.fn().mockReturnThis(),
            fps: jest.fn().mockReturnThis(),
            addOption: jest.fn().mockReturnThis(),
            output: jest.fn().mockReturnThis(),
            on: jest.fn((event, callback) => {
                if (event === 'error') {
                    callback(new Error('ffmpeg test error'));
                }
                return this;
            }),
            run: jest.fn(),
        }));
        await expect(extractor.extract(mockVideoPath)).rejects.toThrow('ffmpeg test error');
    });
});
//# sourceMappingURL=VideoFrameExtractor.test.js.map