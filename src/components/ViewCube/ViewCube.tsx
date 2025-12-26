import React, { useRef, useState, useEffect } from "react";
import { Box } from "@mui/material";
import { IfcViewerAPI } from "web-ifc-viewer";
import { Vector3, Box3, Euler } from "three";

interface ViewCubeProps {
  viewer?: IfcViewerAPI;
}

type ViewDirection = 
  | "front" 
  | "back" 
  | "left" 
  | "right" 
  | "top" 
  | "bottom"
  | "front-left"
  | "front-right"
  | "back-left"
  | "back-right"
  | "iso-left"
  | "iso-right";

// Rotation transforms for each view direction (to show that face as front)
const VIEW_ROTATIONS: Record<ViewDirection, { rotateX: number; rotateY: number }> = {
  front: { rotateX: -15, rotateY: 15 },
  back: { rotateX: -15, rotateY: 195 },
  right: { rotateX: -15, rotateY: 105 },
  left: { rotateX: -15, rotateY: -75 },
  top: { rotateX: 75, rotateY: 15 },
  bottom: { rotateX: -105, rotateY: 15 },
  "front-left": { rotateX: -15, rotateY: -30 },
  "front-right": { rotateX: -15, rotateY: 60 },
  "back-left": { rotateX: -15, rotateY: 150 },
  "back-right": { rotateX: -15, rotateY: 240 },
  "iso-left": { rotateX: 30, rotateY: -30 },
  "iso-right": { rotateX: 30, rotateY: 60 },
};

const VIEW_POSITIONS: Record<ViewDirection, { position: [number, number, number]; target: [number, number, number] }> = {
  front: { position: [0, 0, 10], target: [0, 0, 0] },
  back: { position: [0, 0, -10], target: [0, 0, 0] },
  left: { position: [-10, 0, 0], target: [0, 0, 0] },
  right: { position: [10, 0, 0], target: [0, 0, 0] },
  top: { position: [0, 10, 0], target: [0, 0, 0] },
  bottom: { position: [0, -10, 0], target: [0, 0, 0] },
  "front-left": { position: [-7, 5, 7], target: [0, 0, 0] },
  "front-right": { position: [7, 5, 7], target: [0, 0, 0] },
  "back-left": { position: [-7, 5, -7], target: [0, 0, 0] },
  "back-right": { position: [7, 5, -7], target: [0, 0, 0] },
  "iso-left": { position: [-7, 7, 7], target: [0, 0, 0] },
  "iso-right": { position: [7, 7, 7], target: [0, 0, 0] },
};

// Calculate cube rotation from camera position and target
// The cube rotates to show the view from the camera's perspective
// The cube should rotate opposite to the camera to show the correct face
const calculateCubeRotation = (cameraPos: Vector3, target: Vector3): { rotateX: number; rotateY: number } => {
  // Calculate direction vector from target to camera (camera position relative to target)
  const direction = new Vector3().subVectors(cameraPos, target).normalize();
  
  // Calculate spherical coordinates
  // Azimuth: angle in XZ plane (0 = +Z axis, which is front in our coordinate system)
  const azimuth = Math.atan2(direction.x, direction.z) * (180 / Math.PI);
  
  // Elevation: angle from horizontal plane
  const horizontalDistance = Math.sqrt(direction.x * direction.x + direction.z * direction.z);
  const elevation = Math.atan2(direction.y, horizontalDistance) * (180 / Math.PI);
  
  // For the cube to show the correct face, we need to rotate it opposite to the camera direction
  // If camera is looking from front (0,0,1), cube should show front face
  // The cube's front face is at rotateY = 0, so we need to invert the azimuth
  // Base rotation is -15deg X and 15deg Y to show the initial isometric view
  const baseRotateX = -15;
  const baseRotateY = 15;
  
  // Calculate rotation: invert azimuth and adjust for base rotation
  // When camera is at front (azimuth = 0), cube should show front (rotateY = baseRotateY)
  // When camera is at right (azimuth = 90), cube should show right (rotateY = baseRotateY + 90)
  const rotateY = baseRotateY - azimuth;
  
  // For X rotation: when camera is above (elevation > 0), cube should tilt down (rotateX < baseRotateX)
  const rotateX = baseRotateX - elevation;
  
  return { rotateX, rotateY };
};

export const ViewCube: React.FC<ViewCubeProps> = ({ viewer }) => {
  const cubeRef = useRef<HTMLDivElement>(null);
  const [cubeRotation, setCubeRotation] = useState({ rotateX: -15, rotateY: 15 });
  const [isUserInteraction, setIsUserInteraction] = useState(false);
  const animationFrameRef = useRef<number | null>(null);
  const isUserClickingRef = useRef(false);

  // Listen to camera changes and update cube rotation
  useEffect(() => {
    if (!viewer) {
      console.log("ViewCube: No viewer provided");
      return;
    }

    const anyViewer: any = viewer;
    const camera = anyViewer.context?.camera;
    const controls = anyViewer.context?.controls;

    console.log("ViewCube: Initializing", { 
      hasViewer: !!viewer, 
      hasContext: !!anyViewer.context,
      hasCamera: !!camera, 
      hasControls: !!controls 
    });

    if (!camera || !controls) {
      console.warn("ViewCube: Camera or controls not available", { camera, controls });
      return;
    }

    let lastCameraPos = camera.position.clone();
    let lastTarget = controls.target ? controls.target.clone() : new Vector3();
    let lastUpdateTime = 0;
    const throttleMs = 50; // Update at most every 50ms

    const updateCubeRotation = (currentTime: number) => {
      // Skip update if user is clicking (we'll use preset rotation)
      if (isUserClickingRef.current) {
        animationFrameRef.current = requestAnimationFrame(() => updateCubeRotation(performance.now()));
        return;
      }

      // Throttle updates
      if (currentTime - lastUpdateTime < throttleMs) {
        animationFrameRef.current = requestAnimationFrame(() => updateCubeRotation(performance.now()));
        return;
      }

      const currentPos = camera.position.clone();
      const currentTarget = controls.target ? controls.target.clone() : new Vector3();

      // Always update, but check if significant change for smoother performance
      const posChanged = currentPos.distanceTo(lastCameraPos) > 0.01;
      const targetChanged = currentTarget.distanceTo(lastTarget) > 0.01;

      // Always calculate rotation, even if position hasn't changed much (for smooth updates)
      // Get model center for reference
      const models = anyViewer.context?.items?.ifcModels || [];
      let referencePoint = currentTarget;

      if (models.length > 0) {
        const box = new Box3();
        models.forEach((model: any) => {
          if (model.mesh) {
            box.expandByObject(model.mesh);
          }
        });
        if (!box.isEmpty()) {
          referencePoint = box.getCenter(new Vector3());
        }
      }

      // Calculate rotation based on current camera position
      const rotation = calculateCubeRotation(currentPos, referencePoint);
      
      // Only update if there's a significant change to avoid unnecessary re-renders
      if (posChanged || targetChanged) {
        setCubeRotation(rotation);
        lastCameraPos = currentPos.clone();
        lastTarget = currentTarget.clone();
        lastUpdateTime = currentTime;
      } else {
        // Still update for very small changes to keep it smooth
        setCubeRotation(rotation);
      }

      animationFrameRef.current = requestAnimationFrame(() => updateCubeRotation(performance.now()));
    };

    // Start the update loop
    animationFrameRef.current = requestAnimationFrame(() => updateCubeRotation(performance.now()));

      // Listen to control change events for immediate updates
      if (controls.addEventListener) {
        const onControlChange = () => {
          if (!isUserClickingRef.current) {
            const models = anyViewer.context?.items?.ifcModels || [];
            let referencePoint = controls.target ? controls.target.clone() : new Vector3();

            if (models.length > 0) {
              const box = new Box3();
              models.forEach((model: any) => {
                if (model.mesh) {
                  box.expandByObject(model.mesh);
                }
              });
              if (!box.isEmpty()) {
                referencePoint = box.getCenter(new Vector3());
              }
            }

            const rotation = calculateCubeRotation(camera.position, referencePoint);
            setCubeRotation(rotation);
            
            // Update last known positions
            lastCameraPos = camera.position.clone();
            lastTarget = referencePoint.clone();
          }
        };

        controls.addEventListener('change', onControlChange);

        return () => {
          if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
          }
          if (controls.removeEventListener) {
            controls.removeEventListener('change', onControlChange);
          }
        };
      }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [viewer]);

  const setView = (direction: ViewDirection) => {
    if (!viewer) {
      console.warn("ViewCube: viewer not available");
      return;
    }
    
    // Mark that user is clicking to use preset rotation
    isUserClickingRef.current = true;
    setIsUserInteraction(true);

    try {
      const anyViewer: any = viewer;
      const camera = anyViewer.context?.camera;
      const controls = anyViewer.context?.controls;

      if (!camera) {
        console.warn("ViewCube: camera not available");
        return;
      }
      
      if (!controls) {
        console.warn("ViewCube: controls not available");
        return;
      }
      
      console.log("ViewCube: Setting view to", direction, { camera, controls });

      const view = VIEW_POSITIONS[direction];
      const position = new Vector3(...view.position);
      const target = new Vector3(...view.target);

      // Get the bounding box of all loaded models to center the view
      const models = anyViewer.context?.items?.ifcModels || [];
      if (models.length > 0) {
        const box = new Box3();
        models.forEach((model: any) => {
          if (model.mesh) {
            box.expandByObject(model.mesh);
          }
        });

        if (!box.isEmpty()) {
          const center = box.getCenter(new Vector3());
          const size = box.getSize(new Vector3());
          const maxDim = Math.max(size.x, size.y, size.z);
          const distance = maxDim * 1.5;

          // Adjust position relative to center
          position.multiplyScalar(distance / 10).add(center);
          target.copy(center);
        }
      }

      // Calculate the expected cube rotation for this view based on target camera position
      // This ensures the cube rotation matches the camera view
      const expectedRotation = calculateCubeRotation(position, target);
      
      // Update cube rotation immediately to show the target view
      setCubeRotation(expectedRotation);
      
      // Animate camera to new position
      const animationDuration = 1000;
      
      // Try different methods to set camera position
      if (typeof controls.setLookAt === "function") {
        console.log("ViewCube: Using setLookAt method");
        controls.setLookAt(
          position.x,
          position.y,
          position.z,
          target.x,
          target.y,
          target.z,
          true // animate
        );
        
        // Wait for animation to complete before resuming auto-tracking
        setTimeout(() => {
          isUserClickingRef.current = false;
          setIsUserInteraction(false);
        }, animationDuration);
      } else if (controls.target) {
        console.log("ViewCube: Using manual animation");
        // Fallback for other control types
        const startPos = camera.position.clone();
        const startTarget = controls.target.clone();
        const startTime = Date.now();

        const animate = () => {
          const elapsed = Date.now() - startTime;
          const progress = Math.min(elapsed / animationDuration, 1);
          const ease = 1 - Math.pow(1 - progress, 3); // ease out cubic

          camera.position.lerpVectors(startPos, position, ease);
          controls.target.lerpVectors(startTarget, target, ease);
          
          // Update cube rotation during animation to keep it synchronized
          // Interpolate between start and end rotation for smooth transition
          const currentPos = camera.position.clone();
          const currentTarget = controls.target.clone();
          const startRotation = calculateCubeRotation(startPos, startTarget);
          const endRotation = calculateCubeRotation(position, target);
          
          // Interpolate rotation
          const currentRotation = {
            rotateX: startRotation.rotateX + (endRotation.rotateX - startRotation.rotateX) * ease,
            rotateY: startRotation.rotateY + (endRotation.rotateY - startRotation.rotateY) * ease,
          };
          setCubeRotation(currentRotation);
          
          controls.update();

          if (progress < 1) {
            requestAnimationFrame(animate);
          } else {
            // Animation complete, resume auto-tracking
            isUserClickingRef.current = false;
            setIsUserInteraction(false);
          }
        };
        animate();
      } else {
        // No animation, just set position directly
        console.log("ViewCube: Setting position directly");
        camera.position.copy(position);
        if (controls.target) {
          controls.target.copy(target);
        }
        if (typeof controls.update === "function") {
          controls.update();
        }
        
        // Update cube rotation immediately
        const finalRotation = calculateCubeRotation(position, target);
        setCubeRotation(finalRotation);
        
        // Immediately resume auto-tracking
        setTimeout(() => {
          isUserClickingRef.current = false;
          setIsUserInteraction(false);
        }, 100);
      }
    } catch (error) {
      console.error("ViewCube: Error setting view:", error);
      // Reset flags on error
      isUserClickingRef.current = false;
      setIsUserInteraction(false);
    }
  };

  if (!viewer) {
    return null; // Don't render if no viewer
  }

  return (
    <Box
      ref={cubeRef}
      sx={{
        position: "fixed",
        bottom: 16,
        left: 16,
        width: 120,
        height: 120,
        perspective: "1000px",
        zIndex: 1000,
        userSelect: "none",
        pointerEvents: "auto",
        backgroundColor: "transparent",
      }}
    >
      <Box
        sx={{
          width: "100%",
          height: "100%",
          position: "relative",
          transformStyle: "preserve-3d",
          transform: `rotateX(${cubeRotation.rotateX}deg) rotateY(${cubeRotation.rotateY}deg)`,
          transition: isUserInteraction 
            ? "transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)"
            : "transform 0.2s ease-out",
          "&:hover": {
            transform: `rotateX(${cubeRotation.rotateX}deg) rotateY(${cubeRotation.rotateY}deg) scale(1.1)`,
          },
        }}
      >
        {/* Cube faces */}
        {[
          { face: "front", label: "F", transform: "rotateY(0deg) translateZ(60px)", view: "front" as ViewDirection },
          { face: "back", label: "B", transform: "rotateY(180deg) translateZ(60px)", view: "back" as ViewDirection },
          { face: "right", label: "R", transform: "rotateY(90deg) translateZ(60px)", view: "right" as ViewDirection },
          { face: "left", label: "L", transform: "rotateY(-90deg) translateZ(60px)", view: "left" as ViewDirection },
          { face: "top", label: "T", transform: "rotateX(90deg) translateZ(60px)", view: "top" as ViewDirection },
          { face: "bottom", label: "D", transform: "rotateX(-90deg) translateZ(60px)", view: "bottom" as ViewDirection },
        ].map(({ face, label, transform, view }) => (
          <Box
            key={face}
            onClick={(e) => {
              e.stopPropagation();
              console.log("ViewCube: Face clicked", face, view);
              setView(view);
            }}
            sx={{
              position: "absolute",
              width: "100%",
              height: "100%",
              background: "rgba(255, 255, 255, 0.9)",
              border: "2px solid rgba(0, 0, 0, 0.3)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "20px",
              fontWeight: "bold",
              color: "rgba(0, 0, 0, 0.7)",
              cursor: "pointer",
              transform,
              backfaceVisibility: "hidden",
              transition: "all 0.2s ease",
              "&:hover": {
                background: "rgba(25, 118, 210, 0.9)",
                color: "white",
                borderColor: "rgba(25, 118, 210, 1)",
                transform: `${transform} scale(1.05)`,
              },
              "&:active": {
                transform: `${transform} scale(0.95)`,
              },
            }}
          >
            {label}
          </Box>
        ))}

        {/* Corner buttons for isometric views */}
        {[
          { label: "◢", transform: "rotateX(45deg) rotateY(-45deg) translateZ(60px)", view: "iso-left" as ViewDirection },
          { label: "◣", transform: "rotateX(45deg) rotateY(45deg) translateZ(60px)", view: "iso-right" as ViewDirection },
        ].map(({ label, transform, view }, index) => (
          <Box
            key={`corner-${index}`}
            onClick={(e) => {
              e.stopPropagation();
              console.log("ViewCube: Corner clicked", view);
              setView(view);
            }}
            sx={{
              position: "absolute",
              width: "30px",
              height: "30px",
              background: "rgba(100, 100, 100, 0.8)",
              border: "1px solid rgba(0, 0, 0, 0.3)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "14px",
              color: "white",
              cursor: "pointer",
              transform,
              backfaceVisibility: "hidden",
              transition: "all 0.2s ease",
              "&:hover": {
                background: "rgba(25, 118, 210, 0.9)",
                transform: `${transform} scale(1.2)`,
              },
            }}
          >
            {label}
          </Box>
        ))}
      </Box>
    </Box>
  );
};

export default ViewCube;

