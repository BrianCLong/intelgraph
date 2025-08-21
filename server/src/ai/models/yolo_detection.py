#!/usr/bin/env python3
"""
YOLO Object Detection Script
Handles object detection using YOLO models from Ultralytics
"""

import argparse
import json
import os
import sys
import warnings
from typing import Any, Optional

import cv2
import numpy as np
import torch
from PIL import Image
from ultralytics import YOLO

# Suppress warnings
warnings.filterwarnings("ignore", category=UserWarning)

class YOLODetection:
    def __init__(self, model_name: str = "yolov8n.pt", device: str = "auto"):
        """Initialize YOLO detection engine"""
        self.device = self._get_device(device)
        self.model = self._load_model(model_name)
        self.class_names = self.model.names if hasattr(self.model, 'names') else {}
    
    def _get_device(self, device: str) -> str:
        """Determine the best device to use"""
        if device == "auto":
            return "cuda" if torch.cuda.is_available() else "cpu"
        return device
    
    def _load_model(self, model_name: str):
        """Load YOLO model"""
        try:
            model = YOLO(model_name)
            if self.device == "cuda" and torch.cuda.is_available():
                model.to(self.device)
            return model
        except Exception as e:
            print(f"Error loading model {model_name}: {e}", file=sys.stderr)
            # Fallback to nano model
            model = YOLO("yolov8n.pt")
            if self.device == "cuda" and torch.cuda.is_available():
                model.to(self.device)
            return model
    
    def detect_objects(
        self,
        image_path: str,
        confidence_threshold: float = 0.5,
        nms_threshold: float = 0.4,
        max_detections: int = 100,
        custom_classes: Optional[list[str]] = None
    ) -> dict[str, Any]:
        """Detect objects in image using YOLO"""
        try:
            # Load and validate image
            image = self._load_image(image_path)
            if image is None:
                return {"error": f"Could not load image: {image_path}", "detections": []}
            
            # Run inference
            results = self.model(
                image,
                conf=confidence_threshold,
                iou=nms_threshold,
                max_det=max_detections,
                device=self.device,
                verbose=False
            )
            
            # Process results
            detections = self._process_detections(
                results[0] if results else None,
                custom_classes
            )
            
            return {
                "detections": detections,
                "image_shape": image.shape[:2] if hasattr(image, 'shape') else [0, 0],
                "model": self.model.model_name if hasattr(self.model, 'model_name') else "yolo"
            }
            
        except Exception as e:
            return {
                "error": f"Object detection failed: {str(e)}",
                "detections": []
            }
    
    def detect_objects_batch(
        self,
        image_paths: list[str],
        confidence_threshold: float = 0.5,
        nms_threshold: float = 0.4,
        max_detections: int = 100
    ) -> list[dict[str, Any]]:
        """Detect objects in multiple images"""
        results = []
        
        for image_path in image_paths:
            result = self.detect_objects(
                image_path,
                confidence_threshold,
                nms_threshold,
                max_detections
            )
            result["image_path"] = image_path
            results.append(result)
        
        return results
    
    def _load_image(self, image_path: str):
        """Load and preprocess image"""
        try:
            # Try OpenCV first
            image = cv2.imread(image_path)
            if image is not None:
                # Convert BGR to RGB
                image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
                return image
            
            # Fallback to PIL
            pil_image = Image.open(image_path)
            image = np.array(pil_image.convert('RGB'))
            return image
            
        except Exception as e:
            print(f"Error loading image {image_path}: {e}", file=sys.stderr)
            return None
    
    def _process_detections(
        self,
        result,
        custom_classes: Optional[list[str]] = None
    ) -> list[dict[str, Any]]:
        """Process YOLO detection results"""
        detections = []
        
        if result is None or not hasattr(result, 'boxes') or result.boxes is None:
            return detections
        
        boxes = result.boxes
        
        # Get detection data
        if boxes.xyxy is not None:
            coords = boxes.xyxy.cpu().numpy()
        else:
            return detections
        
        if boxes.conf is not None:
            confidences = boxes.conf.cpu().numpy()
        else:
            confidences = np.ones(len(coords))
        
        if boxes.cls is not None:
            class_ids = boxes.cls.cpu().numpy().astype(int)
        else:
            class_ids = np.zeros(len(coords), dtype=int)
        
        # Process each detection
        for coord, conf, class_id in zip(coords, confidences, class_ids):
            x1, y1, x2, y2 = coord
            
            # Get class name
            class_name = self.class_names.get(class_id, f"class_{class_id}")
            
            # Filter by custom classes if specified
            if custom_classes and class_name not in custom_classes:
                continue
            
            # Create detection object
            detection = {
                "class_name": class_name,
                "class_id": int(class_id),
                "confidence": float(conf),
                "bbox": [float(x1), float(y1), float(x2 - x1), float(y2 - y1)],  # [x, y, width, height]
                "bbox_xyxy": [float(x1), float(y1), float(x2), float(y2)],  # [x1, y1, x2, y2]
                "area": float((x2 - x1) * (y2 - y1))
            }
            
            detections.append(detection)
        
        # Sort by confidence
        detections.sort(key=lambda x: x["confidence"], reverse=True)
        
        return detections
    
    def draw_detections(
        self,
        image_path: str,
        detections: list[dict[str, Any]],
        output_path: Optional[str] = None,
        show_confidence: bool = True,
        color_map: Optional[dict[str, tuple[int, int, int]]] = None
    ) -> Optional[str]:
        """Draw detection boxes on image"""
        try:
            # Load image
            image = cv2.imread(image_path)
            if image is None:
                return None
            
            # Default colors
            if color_map is None:
                color_map = self._get_default_colors()
            
            # Draw each detection
            for detection in detections:
                class_name = detection["class_name"]
                confidence = detection["confidence"]
                x1, y1, x2, y2 = detection["bbox_xyxy"]
                
                # Get color for class
                color = color_map.get(class_name, (0, 255, 0))  # Default green
                
                # Draw bounding box
                cv2.rectangle(image, (int(x1), int(y1)), (int(x2), int(y2)), color, 2)
                
                # Draw label
                label = f"{class_name}"
                if show_confidence:
                    label += f": {confidence:.2f}"
                
                # Get text size
                (text_width, text_height), baseline = cv2.getTextSize(
                    label, cv2.FONT_HERSHEY_SIMPLEX, 0.6, 2
                )
                
                # Draw label background
                cv2.rectangle(
                    image,
                    (int(x1), int(y1) - text_height - baseline),
                    (int(x1) + text_width, int(y1)),
                    color,
                    -1
                )
                
                # Draw label text
                cv2.putText(
                    image,
                    label,
                    (int(x1), int(y1) - baseline),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    0.6,
                    (255, 255, 255),
                    2
                )
            
            # Save or return image
            if output_path:
                cv2.imwrite(output_path, image)
                return output_path
            else:
                # Return base64 encoded image
                import base64
                _, buffer = cv2.imencode('.jpg', image)
                img_base64 = base64.b64encode(buffer).decode('utf-8')
                return img_base64
                
        except Exception as e:
            print(f"Error drawing detections: {e}", file=sys.stderr)
            return None
    
    def _get_default_colors(self) -> dict[str, tuple[int, int, int]]:
        """Get default colors for different classes"""
        colors = [
            (255, 0, 0),    # Red
            (0, 255, 0),    # Green
            (0, 0, 255),    # Blue
            (255, 255, 0),  # Yellow
            (255, 0, 255),  # Magenta
            (0, 255, 255),  # Cyan
            (128, 0, 128),  # Purple
            (255, 165, 0),  # Orange
            (255, 192, 203), # Pink
            (128, 128, 128)  # Gray
        ]
        
        color_map = {}
        for i, class_name in enumerate(self.class_names.values()):
            color_map[class_name] = colors[i % len(colors)]
        
        return color_map
    
    def get_model_info(self) -> dict[str, Any]:
        """Get information about the loaded model"""
        return {
            "model_name": getattr(self.model, 'model_name', 'unknown'),
            "device": self.device,
            "class_names": self.class_names,
            "num_classes": len(self.class_names)
        }


def main():
    parser = argparse.ArgumentParser(description="YOLO Object Detection")
    parser.add_argument("--image", required=True, help="Path to image file")
    parser.add_argument("--model", default="yolov8n.pt", help="YOLO model to use")
    parser.add_argument("--confidence", type=float, default=0.5, help="Confidence threshold")
    parser.add_argument("--nms", type=float, default=0.4, help="NMS threshold")
    parser.add_argument("--max-detections", type=int, default=100, help="Maximum detections")
    parser.add_argument("--device", default="auto", help="Device to use (auto, cpu, cuda)")
    parser.add_argument("--classes", help="Comma-separated list of classes to detect")
    parser.add_argument("--output-image", help="Path to save image with detection boxes")
    parser.add_argument("--show-info", action="store_true", help="Show model information")
    
    args = parser.parse_args()
    
    # Validate input file
    if not os.path.exists(args.image):
        print(json.dumps({"error": f"Image file not found: {args.image}"}))
        sys.exit(1)
    
    try:
        # Initialize detection engine
        detector = YOLODetection(args.model, args.device)
        
        # Show model info if requested
        if args.show_info:
            model_info = detector.get_model_info()
            print(json.dumps(model_info, indent=2))
            return
        
        # Parse custom classes
        custom_classes = None
        if args.classes:
            custom_classes = [cls.strip() for cls in args.classes.split(',')]
        
        # Perform detection
        result = detector.detect_objects(
            args.image,
            confidence_threshold=args.confidence,
            nms_threshold=args.nms,
            max_detections=args.max_detections,
            custom_classes=custom_classes
        )
        
        # Draw detection boxes if requested
        if args.output_image and result.get("detections"):
            output_path = detector.draw_detections(
                args.image,
                result["detections"],
                args.output_image
            )
            if output_path:
                result["output_image"] = output_path
        
        # Output result
        print(json.dumps(result, indent=2, ensure_ascii=False))
    
    except Exception as e:
        print(json.dumps({"error": f"Detection failed: {str(e)}"}))
        sys.exit(1)


if __name__ == "__main__":
    main()