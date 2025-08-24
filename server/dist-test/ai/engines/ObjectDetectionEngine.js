"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ObjectDetectionEngine = void 0;
const child_process_1 = require("child_process");
const path_1 = __importDefault(require("path"));
const logger = logger.child({ name: 'ObjectDetectionEngine' });
class ObjectDetectionEngine {
    constructor(config) {
        this.isInitialized = false;
        this.availableModels = [];
        this.config = config;
    }
    /**
     * Initialize object detection engine
     */
    async initialize() {
        try {
            // Verify Python and dependencies
            await this.verifyDependencies();
            // Load available models
            await this.loadAvailableModels();
            this.isInitialized = true;
            logger.info('Object Detection Engine initialized successfully');
        }
        catch (error) {
            logger.error('Failed to initialize Object Detection Engine:', error);
            throw error;
        }
    }
    /**
     * Detect objects in image
     */
    async detectObjects(imagePath, options = {}) {
        if (!this.isInitialized) {
            await this.initialize();
        }
        const { model = 'yolov8n', confidenceThreshold = 0.5, nmsThreshold = 0.4, maxDetections = 100, enableTracking = false, extractFeatures = false, customClasses = [] } = options;
        logger.info(`Starting object detection for: ${imagePath} with model: ${model}`);
        try {
            // Validate model availability
            if (!this.availableModels.includes(model)) {
                throw new Error(`Model ${model} not available. Available models: ${this.availableModels.join(', ')}`);
            }
            // Run object detection
            const detections = await this.runObjectDetection(imagePath, model, confidenceThreshold, nmsThreshold, maxDetections, customClasses);
            // Extract features if requested
            if (extractFeatures) {
                await this.extractObjectFeatures(detections, imagePath);
            }
            // Apply tracking if requested
            if (enableTracking) {
                this.applyObjectTracking(detections);
            }
            logger.info(`Object detection completed: ${detections.length} objects detected`);
            return detections;
        }
        catch (error) {
            logger.error('Object detection failed:', error);
            throw error;
        }
    }
    /**
     * Detect objects in video
     */
    async detectObjectsInVideo(videoPath, options = {}) {
        if (!this.isInitialized) {
            await this.initialize();
        }
        const { model = 'yolov8n', confidenceThreshold = 0.5, nmsThreshold = 0.4, maxDetections = 100, frameRate = 1, // Process 1 frame per second
        startTime = 0, endTime, enableTemporalSmoothing = true, enableTracking = true } = options;
        logger.info(`Starting video object detection for: ${videoPath}`);
        try {
            const results = await this.runVideoObjectDetection(videoPath, model, confidenceThreshold, nmsThreshold, maxDetections, frameRate, startTime, endTime);
            // Apply temporal smoothing if requested
            if (enableTemporalSmoothing) {
                this.applyTemporalSmoothing(results);
            }
            // Apply tracking across frames if requested
            if (enableTracking) {
                this.applyVideoTracking(results);
            }
            logger.info(`Video object detection completed: ${results.length} frames processed`);
            return results;
        }
        catch (error) {
            logger.error('Video object detection failed:', error);
            throw error;
        }
    }
    /**
     * Run object detection using YOLO models
     */
    async runObjectDetection(imagePath, model, confidenceThreshold, nmsThreshold, maxDetections, customClasses) {
        return new Promise((resolve, reject) => {
            const pythonScript = path_1.default.join(this.config.modelsPath, 'yolo_detection.py');
            const args = [
                pythonScript,
                '--image', imagePath,
                '--model', model,
                '--confidence', confidenceThreshold.toString(),
                '--nms', nmsThreshold.toString(),
                '--max-detections', maxDetections.toString()
            ];
            if (customClasses.length > 0) {
                args.push('--classes', customClasses.join(','));
            }
            if (this.config.enableGPU) {
                args.push('--device', 'cuda');
            }
            const python = (0, child_process_1.spawn)(this.config.pythonPath, args);
            let output = '';
            let errorOutput = '';
            python.stdout.on('data', (data) => {
                output += data.toString();
            });
            python.stderr.on('data', (data) => {
                errorOutput += data.toString();
            });
            python.on('close', (code) => {
                if (code !== 0) {
                    reject(new Error(`Object detection failed with code ${code}: ${errorOutput}`));
                    return;
                }
                try {
                    const results = JSON.parse(output);
                    const detections = this.parseDetectionResults(results, model);
                    resolve(detections);
                }
                catch (parseError) {
                    reject(parseError);
                }
            });
            python.on('error', (error) => {
                reject(new Error(`Failed to spawn object detection: ${error.message}`));
            });
        });
    }
    /**
     * Run video object detection
     */
    async runVideoObjectDetection(videoPath, model, confidenceThreshold, nmsThreshold, maxDetections, frameRate, startTime, endTime) {
        return new Promise((resolve, reject) => {
            const pythonScript = path_1.default.join(this.config.modelsPath, 'yolo_video_detection.py');
            const args = [
                pythonScript,
                '--video', videoPath,
                '--model', model,
                '--confidence', confidenceThreshold.toString(),
                '--nms', nmsThreshold.toString(),
                '--max-detections', maxDetections.toString(),
                '--frame-rate', frameRate.toString()
            ];
            if (startTime !== undefined) {
                args.push('--start-time', startTime.toString());
            }
            if (endTime !== undefined) {
                args.push('--end-time', endTime.toString());
            }
            if (this.config.enableGPU) {
                args.push('--device', 'cuda');
            }
            const python = (0, child_process_1.spawn)(this.config.pythonPath, args);
            let output = '';
            let errorOutput = '';
            python.stdout.on('data', (data) => {
                output += data.toString();
            });
            python.stderr.on('data', (data) => {
                errorOutput += data.toString();
            });
            python.on('close', (code) => {
                if (code !== 0) {
                    reject(new Error(`Video object detection failed with code ${code}: ${errorOutput}`));
                    return;
                }
                try {
                    const results = JSON.parse(output);
                    const frameResults = this.parseVideoDetectionResults(results, model);
                    resolve(frameResults);
                }
                catch (parseError) {
                    reject(parseError);
                }
            });
            python.on('error', (error) => {
                reject(new Error(`Failed to spawn video object detection: ${error.message}`));
            });
        });
    }
    /**
     * Parse detection results from Python script
     */
    parseDetectionResults(results, model) {
        const detections = [];
        for (const detection of results.detections || []) {
            detections.push({
                className: detection.class_name,
                classId: detection.class_id,
                confidence: detection.confidence,
                boundingBox: {
                    x: Math.round(detection.bbox[0]),
                    y: Math.round(detection.bbox[1]),
                    width: Math.round(detection.bbox[2]),
                    height: Math.round(detection.bbox[3]),
                    confidence: detection.confidence
                },
                model,
                features: detection.features || undefined
            });
        }
        return detections;
    }
    /**
     * Parse video detection results
     */
    parseVideoDetectionResults(results, model) {
        const frameResults = [];
        for (const frameResult of results.frames || []) {
            const detections = this.parseDetectionResults(frameResult, model);
            frameResults.push({
                frame: frameResult.frame_number,
                timestamp: frameResult.timestamp,
                detections
            });
        }
        return frameResults;
    }
    /**
     * Extract visual features from detected objects
     */
    async extractObjectFeatures(detections, imagePath) {
        // This would integrate with feature extraction models like ResNet or EfficientNet
        for (const detection of detections) {
            try {
                const features = await this.runFeatureExtraction(imagePath, detection.boundingBox);
                detection.features = features;
            }
            catch (error) {
                logger.warn(`Failed to extract features for object ${detection.className}:`, error);
            }
        }
    }
    /**
     * Run feature extraction for a specific bounding box
     */
    async runFeatureExtraction(imagePath, boundingBox) {
        return new Promise((resolve, reject) => {
            const pythonScript = path_1.default.join(this.config.modelsPath, 'feature_extraction.py');
            const args = [
                pythonScript,
                '--image', imagePath,
                '--bbox', `${boundingBox.x},${boundingBox.y},${boundingBox.width},${boundingBox.height}`
            ];
            const python = (0, child_process_1.spawn)(this.config.pythonPath, args);
            let output = '';
            let errorOutput = '';
            python.stdout.on('data', (data) => {
                output += data.toString();
            });
            python.stderr.on('data', (data) => {
                errorOutput += data.toString();
            });
            python.on('close', (code) => {
                if (code !== 0) {
                    reject(new Error(`Feature extraction failed: ${errorOutput}`));
                    return;
                }
                try {
                    const result = JSON.parse(output);
                    resolve(result.features || []);
                }
                catch (parseError) {
                    reject(parseError);
                }
            });
            python.on('error', (error) => {
                reject(new Error(`Failed to spawn feature extraction: ${error.message}`));
            });
        });
    }
    /**
     * Apply object tracking for single image (placeholder)
     */
    applyObjectTracking(detections) {
        // For single images, we can only assign unique IDs
        detections.forEach((detection, index) => {
            detection.trackingId = `obj_${index}_${Date.now()}`;
        });
    }
    /**
     * Apply tracking across video frames using DeepSORT or similar
     */
    applyVideoTracking(frameResults) {
        // Simple tracking implementation using IoU matching
        const tracks = new Map();
        let nextTrackId = 0;
        for (const frameResult of frameResults) {
            const unmatchedDetections = [...frameResult.detections];
            const activeTrackIds = new Set();
            // Try to match detections with existing tracks
            for (const [trackId, trackHistory] of tracks.entries()) {
                const lastDetection = trackHistory[trackHistory.length - 1];
                // Find best matching detection in current frame
                let bestMatch = null;
                let bestIoU = 0;
                let bestIndex = -1;
                for (let i = 0; i < unmatchedDetections.length; i++) {
                    const detection = unmatchedDetections[i];
                    if (detection.className === lastDetection.className) {
                        const iou = this.calculateIoU(detection.boundingBox, lastDetection.boundingBox);
                        if (iou > bestIoU && iou > 0.3) {
                            bestMatch = detection;
                            bestIoU = iou;
                            bestIndex = i;
                        }
                    }
                }
                if (bestMatch) {
                    bestMatch.trackingId = trackId;
                    trackHistory.push(bestMatch);
                    unmatchedDetections.splice(bestIndex, 1);
                    activeTrackIds.add(trackId);
                }
            }
            // Create new tracks for unmatched detections
            for (const detection of unmatchedDetections) {
                const trackId = `track_${nextTrackId++}`;
                detection.trackingId = trackId;
                tracks.set(trackId, [detection]);
                activeTrackIds.add(trackId);
            }
            // Remove inactive tracks (not updated for several frames)
            for (const [trackId, trackHistory] of tracks.entries()) {
                if (!activeTrackIds.has(trackId)) {
                    const lastFrame = trackHistory[trackHistory.length - 1];
                    const frameGap = frameResult.frame - this.getFrameNumber(lastFrame);
                    if (frameGap > 10) { // Remove if not seen for 10 frames
                        tracks.delete(trackId);
                    }
                }
            }
        }
    }
    /**
     * Apply temporal smoothing to reduce noise in detections
     */
    applyTemporalSmoothing(frameResults) {
        // Group detections by tracking ID across frames
        const trackGroups = new Map();
        for (const frameResult of frameResults) {
            for (const detection of frameResult.detections) {
                if (detection.trackingId) {
                    if (!trackGroups.has(detection.trackingId)) {
                        trackGroups.set(detection.trackingId, []);
                    }
                    trackGroups.get(detection.trackingId).push(detection);
                }
            }
        }
        // Apply smoothing to each track
        for (const track of trackGroups.values()) {
            if (track.length >= 3) {
                this.smoothTrack(track);
            }
        }
    }
    /**
     * Smooth detection track using moving average
     */
    smoothTrack(track) {
        const windowSize = 3;
        for (let i = windowSize - 1; i < track.length; i++) {
            const window = track.slice(i - windowSize + 1, i + 1);
            // Smooth confidence
            const avgConfidence = window.reduce((sum, d) => sum + d.confidence, 0) / window.length;
            track[i].confidence = avgConfidence;
            // Smooth bounding box
            const avgX = window.reduce((sum, d) => sum + d.boundingBox.x, 0) / window.length;
            const avgY = window.reduce((sum, d) => sum + d.boundingBox.y, 0) / window.length;
            const avgWidth = window.reduce((sum, d) => sum + d.boundingBox.width, 0) / window.length;
            const avgHeight = window.reduce((sum, d) => sum + d.boundingBox.height, 0) / window.length;
            track[i].boundingBox = {
                ...track[i].boundingBox,
                x: Math.round(avgX),
                y: Math.round(avgY),
                width: Math.round(avgWidth),
                height: Math.round(avgHeight)
            };
        }
    }
    /**
     * Calculate Intersection over Union (IoU) for bounding boxes
     */
    calculateIoU(box1, box2) {
        const x1 = Math.max(box1.x, box2.x);
        const y1 = Math.max(box1.y, box2.y);
        const x2 = Math.min(box1.x + box1.width, box2.x + box2.width);
        const y2 = Math.min(box1.y + box1.height, box2.y + box2.height);
        if (x2 <= x1 || y2 <= y1)
            return 0;
        const intersectionArea = (x2 - x1) * (y2 - y1);
        const box1Area = box1.width * box1.height;
        const box2Area = box2.width * box2.height;
        const unionArea = box1Area + box2Area - intersectionArea;
        return intersectionArea / unionArea;
    }
    /**
     * Extract frame number from detection (helper method)
     */
    getFrameNumber(detection) {
        // This would be extracted from metadata or tracking info
        return 0; // Placeholder
    }
    /**
     * Verify dependencies
     */
    async verifyDependencies() {
        return new Promise((resolve, reject) => {
            const python = (0, child_process_1.spawn)(this.config.pythonPath, [
                '-c',
                'import ultralytics, cv2, numpy; print("Dependencies OK")'
            ]);
            python.on('close', (code) => {
                if (code === 0) {
                    resolve();
                }
                else {
                    reject(new Error('Required dependencies not found. Please install ultralytics, opencv-python, numpy.'));
                }
            });
            python.on('error', () => {
                reject(new Error('Python not found or dependencies missing.'));
            });
        });
    }
    /**
     * Load available models
     */
    async loadAvailableModels() {
        try {
            const models = [
                'yolov8n', 'yolov8s', 'yolov8m', 'yolov8l', 'yolov8x',
                'yolov9n', 'yolov9s', 'yolov9m', 'yolov9l', 'yolov9x',
                'yolo11n', 'yolo11s', 'yolo11m', 'yolo11l', 'yolo11x'
            ];
            this.availableModels = models;
            logger.info(`Available models: ${this.availableModels.join(', ')}`);
        }
        catch (error) {
            logger.error('Failed to load available models:', error);
            throw error;
        }
    }
    /**
     * Check if object detection engine is ready
     */
    isReady() {
        return this.isInitialized;
    }
    /**
     * Get available models
     */
    getAvailableModels() {
        return [...this.availableModels];
    }
    /**
     * Cleanup resources
     */
    async shutdown() {
        logger.info('Shutting down Object Detection Engine...');
        this.isInitialized = false;
        logger.info('Object Detection Engine shutdown complete');
    }
}
exports.ObjectDetectionEngine = ObjectDetectionEngine;
exports.default = ObjectDetectionEngine;
//# sourceMappingURL=ObjectDetectionEngine.js.map