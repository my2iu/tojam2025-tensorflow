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
			if (currentPose && currentPose.length > 0) {
				let nose = currentPose[0].keypoints[0];
				ctx.fillStyle = '#f00';
				ctx.beginPath();
				ctx.arc(640-nose.x, nose.y, 5, 0, Math.PI * 2);
				ctx.fill();
				
				console.log(currentPose);
			}
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

})();