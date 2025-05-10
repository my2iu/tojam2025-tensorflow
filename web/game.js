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
			let pose = validatePose();
			if (pose == null)
				return;
			// We have a valid pose, so draw the robot
			robotParts.head.draw(ctx, 
				(pose.l.shoulder.x + pose.r.shoulder.x) / 2, 
				(pose.l.shoulder.y + pose.r.shoulder.y) / 2, 
				pose.nose.x, 
				pose.nose.y);
			robotParts.torso.draw(ctx, 
				(pose.l.shoulder.x + pose.r.shoulder.x) / 2, 
				(pose.l.shoulder.y + pose.r.shoulder.y) / 2, 
				(pose.l.hip.x + pose.r.hip.x) / 2, 
				(pose.l.hip.y + pose.r.hip.y) / 2);
			robotParts.hip.draw(ctx, 
				(pose.l.hip.x + pose.r.hip.x) / 2, 
				(pose.l.hip.y + pose.r.hip.y) / 2,
				(pose.l.shoulder.x + pose.r.shoulder.x) / 2, 
				(pose.l.shoulder.y + pose.r.shoulder.y) / 2);
			robotParts.upperarm.draw(ctx, 
				pose.l.shoulder.x,
				pose.l.shoulder.y,
				pose.l.elbow.x,
				pose.l.elbow.y);
			robotParts.upperarm.draw(ctx, 
				pose.r.shoulder.x,
				pose.r.shoulder.y,
				pose.r.elbow.x,
				pose.r.elbow.y);
			robotParts.forearm.draw(ctx, 
				pose.l.elbow.x,
				pose.l.elbow.y,
				pose.l.wrist.x,
				pose.l.wrist.y);
			robotParts.forearm.draw(ctx, 
				pose.r.elbow.x,
				pose.r.elbow.y,
				pose.r.wrist.x,
				pose.r.wrist.y);
			robotParts.thigh.draw(ctx, 
				pose.l.hip.x,
				pose.l.hip.y,
				pose.l.knee.x,
				pose.l.knee.y);
			robotParts.thigh.draw(ctx, 
				pose.r.hip.x,
				pose.r.hip.y,
				pose.r.knee.x,
				pose.r.knee.y);
			robotParts.calf.draw(ctx, 
				pose.l.knee.x,
				pose.l.knee.y,
				pose.l.ankle.x,
				pose.l.ankle.y);
			robotParts.calf.draw(ctx, 
				pose.r.knee.x,
				pose.r.knee.y,
				pose.r.ankle.x,
				pose.r.ankle.y);
			
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

function validatePose()
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
	const minScore = 0.2;
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
		const scale = this.length(pivotX - anchorX, pivotY - anchorY) / this.length(this.pivot.x - this.anchor.x, this.pivot.y - this.anchor.y);
		ctx.scale(scale, scale);
		ctx.translate(-this.pivot.x, -this.pivot.y);
		ctx.drawImage(this.img, 0, 0);
		ctx.restore();
		
	}
	length(dx, dy) {
		return Math.sqrt(dx * dx + dy * dy);
	}
}

const robotParts = {
	head: new RobotPart('imgs/robot/head.png', 20, 61, 20, 26),
	headside: new RobotPart('imgs/robot/headside.png', 16, 61, 32, 34),
	torso: new RobotPart('imgs/robot/torso.png', 55, 4, 55, 130),
	hip: new RobotPart('imgs/robot/hip.png', 55, 130, 55, 4),
	upperarm: new RobotPart('imgs/robot/upperarm.png', 10, 10, 10, 85),
	forearm: new RobotPart('imgs/robot/forearm.png', 30, 1, 30, 75),
	thigh: new RobotPart('imgs/robot/thigh.png', 12, 12, 12, 98),
	calf: new RobotPart('imgs/robot/calf.png', 17, 1, 17, 95),
};


})();