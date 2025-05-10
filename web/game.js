"use strict";
(() => {

let videoEl;
let canvas;
let ctx;
let currentWebcamStream = null;
let poseDetector;
let poseDetectorRunning = false;
let currentPose;
let animationFrameRequest;

window.startGame = function(webcamDeviceId) {
	// Show the game div
	document.querySelector('.game').style.display = 'block';
	canvas = document.querySelector('.game canvas');
	ctx = canvas.getContext('2d');
	videoEl = document.querySelector('.game video');
	
	// Start up the video feed
	let constraints = {
		video: {
			width: {exact: 640},
			height: {exact: 360}
		}
	};
	if (webcamDeviceId)
		constraints.video.deviceId = {exact: webcamDeviceId};
	navigator.mediaDevices.getUserMedia(constraints).then((stream) => {
		currentWebcamStream = stream;
		document.querySelector('.game video').srcObject = stream;
	}).then(() => loadTensorFlow())
	.then(() => loadedAndReady());
	
	// Hook the debug stop button
	document.querySelector('.debug a.debugStop').onclick = () => {
		if (currentWebcamStream != null) {
			currentWebcamStream.getTracks().forEach(track => {
				track.stop();
			});
			currentWebcamStream = null;
		}
		
		if (animationFrameRequest != null)
			cancelAnimationFrame(animationFrameRequest);
	}
	
	// Display a loading message
	ctx.save();
	ctx.font = '50px sans-serif';
	ctx.textAlign = 'center';
	ctx.fillStyle = 'white';
	ctx.strokeStyle = 'black';
	ctx.fillText('Loading', 320, 180);
	ctx.strokeText('Loading', 320, 180);
	ctx.restore();
}


async function loadTensorFlow()
{
	const detectorConfig = {
		modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING};
	poseDetector = await poseDetection.createDetector(poseDetection.SupportedModels.MoveNet, detectorConfig);
}

function loadedAndReady()
{
	// Start game loop
	animationFrameRequest = requestAnimationFrame(gameLoop);
	let poseOk = false;
	
	function gameLoop()
	{
		// Set-up next game loop, and start pose detector
		let time = performance.now();
		animationFrameRequest = requestAnimationFrame(gameLoop);
		startPoseDetection();
		
		// Draw the canvas
		ctx.save();
		try {
			ctx.clearRect(0, 0, 640, 360);
			// Once we have a good lock on the pose, we relax our pose
			// tolerances so that we can have a few bad pose detections.
			// But if we lose the pose, we revert back to requiring a good
			// match again
			let minPosePartScore = (poseOk ? 0.05 : 0.25);
			let pose = validatePose(minPosePartScore);
			if (pose == null)
			{
				poseOk = false;
				return;
			}
			poseOk = true;
			// We have a valid pose, so draw the robot
			drawRobot(pose);
			
		} finally {
			ctx.restore();
		}
	}
}

function startPoseDetection()
{
	if (poseDetectorRunning) return;
	poseDetectorRunning = true;
	poseDetector.estimatePoses(videoEl).then((poses) => {
		poseDetectorRunning = false;
		currentPose = poses;
	});
}

function validatePose(minScore)
{
	// TODO: Clean this up so that messages stay shown for longer
	// and it will smooth over occasional dropouts
	
	// Check if nothing is detected
	let msgYSkip = 35;
	let msgY = msgYSkip;
	if (!currentPose || currentPose.length == 0) {
		drawBlackOutlineText("No human detected", 20, msgY);
		return null;
	}
	
	// Check for a few extremities
	const figure = currentPose[0];
	let validated = true;
	msgY += msgYSkip;
	if (figure.keypoints[0].score < minScore) {
		drawBlackOutlineText("No face detected. Move head into view", 20, msgY);
		validated = false;
	}
	msgY += msgYSkip;
	if (figure.keypoints[9].score < minScore) {
		drawBlackOutlineText("No hand detected. Move hand into view", 20, msgY);
		validated = false;
	} else if (figure.keypoints[10].score < minScore) {
		drawBlackOutlineText("No hand detected. Move hand into view", 20, msgY);
		validated = false;
	}
	msgY += msgYSkip;
	if (figure.keypoints[15].score < minScore) {
		drawBlackOutlineText("No feet detected. Move feet into view", 20, msgY);
		validated = false;
	} else if (figure.keypoints[16].score < minScore) {
		drawBlackOutlineText("No feet detected. Move feet into view", 20, msgY);
		validated = false;
	}
	
	if (!validated)
	{
		// Draw markers on the identified points
		drawMarker(figure.keypoints[0]);
		drawMarker(figure.keypoints[9]);
		drawMarker(figure.keypoints[10]);
		drawMarker(figure.keypoints[15]);
		drawMarker(figure.keypoints[16]);
		return null;
	}
	
	
	// Fix-up the poses
	return {
		nose: flip(figure.keypoints[0]),
		l: {
			eye: flip(figure.keypoints[1]),
			ear: flip(figure.keypoints[3]),
			shoulder: flip(figure.keypoints[5]),
			elbow: flip(figure.keypoints[7]),
			wrist: flip(figure.keypoints[9]),
			hip: flip(figure.keypoints[11]),
			knee: flip(figure.keypoints[13]),
			ankle: flip(figure.keypoints[15])
		},
		r: {
			eye: flip(figure.keypoints[2]),
			ear: flip(figure.keypoints[4]),
			shoulder: flip(figure.keypoints[6]),
			elbow: flip(figure.keypoints[8]),
			wrist: flip(figure.keypoints[10]),
			hip: flip(figure.keypoints[12]),
			knee: flip(figure.keypoints[14]),
			ankle: flip(figure.keypoints[16])
		}
	};
	
	function flip(keypoint)
	{
		return { x: 640 - keypoint.x, y: keypoint.y };
	}
	function drawMarker(keypoint)
	{
		if (keypoint.score < minScore) return;
		ctx.save();
		ctx.fillStyle = '#f00';
		ctx.beginPath();
		ctx.arc(640-keypoint.x, keypoint.y, 5, 0, Math.PI * 2);
		ctx.fill();
		ctx.restore();
	}
}

function drawBlackOutlineText(text, x, y)
{
	ctx.save();
	ctx.font = '30px sans-serif';
//	ctx.textAlign = 'center';
	ctx.fillStyle = 'white';
	ctx.strokeStyle = 'black';
	ctx.fillText(text, x, y);
	ctx.strokeText(text, x, y);
	ctx.restore();

}

function drawArm(sidePose)
{
	robotParts.upperarm.draw(ctx, 
		sidePose.shoulder.x,
		sidePose.shoulder.y,
		sidePose.elbow.x,
		sidePose.elbow.y);
	robotParts.forearm.draw(ctx, 
		sidePose.elbow.x,
		sidePose.elbow.y,
		sidePose.wrist.x,
		sidePose.wrist.y);
}

function drawLeg(sidePose)
{
	robotParts.thigh.draw(ctx, 
		sidePose.hip.x,
		sidePose.hip.y,
		sidePose.knee.x,
		sidePose.knee.y);
	robotParts.calf.draw(ctx, 
		sidePose.knee.x,
		sidePose.knee.y,
		sidePose.ankle.x,
		sidePose.ankle.y);
}

function drawRobot(pose)
{
	const hipMidX = (pose.l.hip.x + pose.r.hip.x) / 2;
	const hipMidY = (pose.l.hip.y + pose.r.hip.y) / 2;
	const shoulderMidX = (pose.l.shoulder.x + pose.r.shoulder.x) / 2;
	const shoulderMidY = (pose.l.shoulder.y + pose.r.shoulder.y) / 2;
	// Calculate our own anchor for the head instead of using the nose
	let headAnchorDist = length(robotParts.head.pivot.x - robotParts.head.anchor.x, robotParts.head.pivot.y - robotParts.head.anchor.y);
	let torsoAnchorDist = length(robotParts.torso.pivot.x - robotParts.torso.anchor.x, robotParts.torso.pivot.y - robotParts.torso.anchor.y);
	let headTorsoRatio = headAnchorDist / torsoAnchorDist;
	let headAnchorX = (shoulderMidX - hipMidX) * headTorsoRatio + shoulderMidX;
	let headAnchorY = (shoulderMidY - hipMidY) * headTorsoRatio + shoulderMidY;
	// Figure out the head facing based on the nose
	let headAnchorRelative = [headAnchorX - shoulderMidX, headAnchorY - shoulderMidY];
	let headAnchorRelativeLength = length(headAnchorRelative[0], headAnchorRelative[1]);
	let headAnchorRelativeUnit = [headAnchorRelative[0] / headAnchorRelativeLength, headAnchorRelative[1] / headAnchorRelativeLength];
	let noseRelative = [pose.nose.x - shoulderMidX, pose.nose.y - shoulderMidY];
	let noseDotProduct = noseRelative[0] * headAnchorRelativeUnit[1] + noseRelative[1] * -headAnchorRelativeUnit[0];
	let headFacing = noseDotProduct / ((robotParts.head.width + 1) * 0.15);
	if (headFacing < -1) 
		headFacing = -1;
	else if (headFacing > 1)
		headFacing = 1;
	else
		headFacing = 0;
	// Calculate a general facing, and draw the appropriate arms
	// and legs behind the body
	// TODO: Use leg bending to determine facing
	const facing = headFacing;

	const leftBehind = (facing > 0);
	const rightBehind = (facing < 0);
	if (leftBehind)
	{
		drawArm(pose.l);
		drawLeg(pose.l);
	}
	else if (rightBehind)
	{
		drawArm(pose.r);
		drawLeg(pose.r);
	}
	robotParts.torso.drawTwoPivot(ctx, 
		pose.l.shoulder.x, pose.l.shoulder.y,
		pose.r.shoulder.x, pose.r.shoulder.y, 
		hipMidX, 
		hipMidY);
	robotParts.hip.drawTwoPivot(ctx, 
		pose.l.hip.x, pose.l.hip.y,
		pose.r.hip.x, pose.r.hip.y, 
		shoulderMidX, 
		shoulderMidY);
	if (headFacing < 0)
		robotParts.headside.draw(ctx, 
			(pose.l.shoulder.x + pose.r.shoulder.x) / 2, 
			(pose.l.shoulder.y + pose.r.shoulder.y) / 2, 
			headAnchorX, 
			headAnchorY);
	else if (headFacing > 0)
		robotParts.headside.drawFlipped(ctx, 
			(pose.l.shoulder.x + pose.r.shoulder.x) / 2, 
			(pose.l.shoulder.y + pose.r.shoulder.y) / 2, 
			headAnchorX, 
			headAnchorY);
	else
		robotParts.head.draw(ctx, 
			(pose.l.shoulder.x + pose.r.shoulder.x) / 2, 
			(pose.l.shoulder.y + pose.r.shoulder.y) / 2, 
			headAnchorX, 
			headAnchorY);
	if (!leftBehind)
	{
		drawArm(pose.l);
		drawLeg(pose.l);
	}
	if (!rightBehind)
	{
		drawArm(pose.r);
		drawLeg(pose.r);
	}
}

class RobotPart{
	constructor(file, pivotX, pivotY, anchorX, anchorY) {
		this.file = file;
		this.pivot = { x: pivotX, y: pivotY };
		this.anchor = { x: anchorX, y: anchorY};
		this.ready = false;
		this.width = 0;
		this.height = 0;
		this.img = new Image();
		this.img.onload = () => {
			this.width = this.img.width;
			this.height = this.img.height;
			this.ready = true;
		};
		this.img.src = file;
	}
	draw(ctx, pivotX, pivotY, anchorX, anchorY) {
		if (!this.ready) return;
		ctx.save();
		ctx.translate(pivotX, pivotY);
		ctx.rotate(Math.atan2(anchorY - pivotY, anchorX - pivotX) - Math.atan2(this.anchor.y - this.pivot.y, this.anchor.x - this.pivot.x));
		const scale = length(pivotX - anchorX, pivotY - anchorY) / length(this.pivot.x - this.anchor.x, this.pivot.y - this.anchor.y);
		ctx.scale(scale, scale);
		ctx.translate(-this.pivot.x, -this.pivot.y);
		ctx.drawImage(this.img, 0, 0);
		ctx.restore();
	}
	drawFlipped(ctx, pivotX, pivotY, anchorX, anchorY) {
		if (!this.ready) return;
		ctx.save();
		ctx.translate(pivotX, pivotY);
		ctx.rotate(Math.atan2(anchorY - pivotY, anchorX - pivotX) - Math.atan2(this.anchor.y - this.pivot.y, this.anchor.x - this.pivot.x));
		const scale = length(pivotX - anchorX, pivotY - anchorY) / length(this.pivot.x - this.anchor.x, this.pivot.y - this.anchor.y);
		ctx.scale(-scale, scale);
		ctx.translate(-this.pivot.x, -this.pivot.y);
		ctx.drawImage(this.img, 0, 0);
		ctx.restore();
	}
	drawTwoPivot(ctx, pivotX1, pivotY1, pivotX2, pivotY2, anchorX, anchorY) {
		if (!this.ready) return;
		ctx.save();
		const pivotX = (pivotX1 + pivotX2) / 2;
		const pivotY = (pivotY1 + pivotY2) / 2;
		ctx.translate(pivotX, pivotY);
		ctx.rotate(Math.atan2(anchorY - pivotY, anchorX - pivotX) - Math.atan2(this.anchor.y - this.pivot.y, this.anchor.x - this.pivot.x));
		const scaleH = length(pivotX - anchorX, pivotY - anchorY) / length(this.pivot.x - this.anchor.x, this.pivot.y - this.anchor.y);
		const widthHeightRatio = length(pivotX2 - pivotX1, pivotY2 - pivotY1) / length(pivotX - anchorX, pivotY - anchorY);
		const mappedWidth = 20 + widthHeightRatio * length(pivotX - anchorX, pivotY - anchorY);
		const scaleW = mappedWidth / this.width;
		ctx.scale(scaleW, scaleH);
		ctx.translate(-this.pivot.x, -this.pivot.y);
		ctx.drawImage(this.img, 0, 0);
		ctx.restore();
	}
}

function length(dx, dy) {
	return Math.sqrt(dx * dx + dy * dy);
}


const robotParts = {
	head: new RobotPart('imgs/robot/head.png', 20, 61, 20, 26),
	headside: new RobotPart('imgs/robot/headside.png', 16, 61, 16, 26),
	torso: new RobotPart('imgs/robot/torso.png', 55, 4, 55, 130),
	hip: new RobotPart('imgs/robot/hip.png', 55, 130, 55, 4),
	upperarm: new RobotPart('imgs/robot/upperarm.png', 10, 10, 10, 85),
	forearm: new RobotPart('imgs/robot/forearm.png', 30, 1, 30, 75),
	thigh: new RobotPart('imgs/robot/thigh.png', 12, 12, 12, 98),
	calf: new RobotPart('imgs/robot/calf.png', 17, 1, 17, 95),
};


})();